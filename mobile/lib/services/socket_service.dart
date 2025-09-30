import 'dart:async';
import 'dart:convert';
import 'package:mobile/models/message_model.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:mobile/config/app_config.dart';
import 'package:mobile/utils/logger.dart';

/// Manages the real-time WebSocket connection with the server.
/// This service is responsible for connecting, handling events, and providing
/// streams for the UI to listen to.
class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  IO.Socket? _socket;
  final AuthService _authService = AuthService();

  // FIX: Add connection state flag
  bool _isConnecting = false;

  // StreamControllers to broadcast received data to the UI.
  final _messageController = StreamController<Message>.broadcast();
  final _statusUpdateController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _tripCreatedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _errorController = StreamController<String>.broadcast();
  final _alertController = StreamController<Map<String, dynamic>>.broadcast();
  final _notificationController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Additional notification streams for comprehensive coverage
  final _tripConfirmedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _tripConfirmationRequiredController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _tripCompletedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _proactiveTravelAlertController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Expose streams for the UI to listen to.
  Stream<Message> get onNewMessage => _messageController.stream;
  Stream<Map<String, dynamic>> get onStatusUpdate =>
      _statusUpdateController.stream;
  Stream<Map<String, dynamic>> get onTripCreated =>
      _tripCreatedController.stream;
  Stream<String> get onError => _errorController.stream;
  Stream<Map<String, dynamic>> get onNewTravelAlert => _alertController.stream;
  Stream<Map<String, dynamic>> get onNewNotification =>
      _notificationController.stream;

  // Additional notification streams
  Stream<Map<String, dynamic>> get onTripConfirmed =>
      _tripConfirmedController.stream;
  Stream<Map<String, dynamic>> get onTripConfirmationRequired =>
      _tripConfirmationRequiredController.stream;
  Stream<Map<String, dynamic>> get onTripCompleted =>
      _tripCompletedController.stream;
  Stream<Map<String, dynamic>> get onProactiveTravelAlert =>
      _proactiveTravelAlertController.stream;

  // FIX: Add connection status stream
  final _connectionController = StreamController<bool>.broadcast();
  Stream<bool> get onConnectionChange => _connectionController.stream;

  bool get isConnected => _socket?.connected ?? false;

  SocketService._internal();

  /// Maximum number of reconnection attempts
  static const int MAX_RECONNECT_ATTEMPTS = 5;

  /// Delay between reconnection attempts (in seconds)
  static const int RECONNECT_DELAY = 2;

  /// Current reconnection attempt count
  int _reconnectAttempts = 0;

  /// Timer for reconnection attempts
  Timer? _reconnectTimer;

  /// Initializes and connects the socket to the server.
  /// Returns a Future that completes upon successful connection or error.
  Future<void> connect() async {
    // Prevent new connections if already connected or connecting.
    if (_socket?.connected ?? false) {
      logger.i("Socket already connected");
      return;
    }
    if (_isConnecting) {
      logger.w("Connection already in progress. Request ignored.");
      return;
    }

    _isConnecting = true;
    logger.d("Connection process started...");
    _connectionController.add(false); // Notify listeners we are connecting

    final token = await _authService.getAccessToken();
    logger.i(
        "[SOCKET] Using access token for connection: ${token != null ? token.substring(0, 16) : 'null'}...");
    if (token == null) {
      logger.e("FATAL: No auth token found. Cannot connect.");
      _isConnecting = false;
      _connectionController.add(false);
      return;
    }
    logger.d("Auth token found and will be used for socket connection.");

    try {
      // Cancel any existing reconnection timer
      _reconnectTimer?.cancel();

      // Reset reconnection attempts on manual connect
      _reconnectAttempts = 0;

      _socket = IO.io(
        AppConfig.socketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .setAuth({'token': token})
            .enableForceNewConnection() // Ensure we get a fresh connection
            .enableAutoConnect()
            .setReconnectionAttempts(MAX_RECONNECT_ATTEMPTS)
            .setReconnectionDelay(
                RECONNECT_DELAY * 1000) // Convert to milliseconds
            .build(),
      );

      _socket!.onConnect((_) {
        logger.i('✅ Socket connected successfully: ${_socket!.id}');
        _isConnecting = false;
        _reconnectAttempts =
            0; // Reset reconnect counter on successful connection
        _connectionController.add(true);
        _setupListeners();
        logger.i('✅ Socket listeners set up successfully');
      });

      _socket!.onConnectError((data) async {
        logger.e('Socket connection error: $data');
        _isConnecting = false;
        _connectionController.add(false);

        // Check if the error is related to JWT token expiration
        if (data != null && data.toString().contains('Token expired')) {
          logger.w(
              'JWT token expired during socket connection. Attempting token refresh...');
          await _handleTokenExpiration();
        } else if (data != null &&
            data.toString().contains('Authentication failed')) {
          logger.w('Socket authentication failed. Attempting token refresh...');
          await _handleTokenExpiration();
        } else {
          _scheduleReconnect();
        }
      });

      _socket!.onError((data) async {
        logger.e('Socket error: $data');
        _isConnecting = false;
        _connectionController.add(false);

        // Check if the error is related to JWT token expiration
        if (data != null && data.toString().contains('Token expired')) {
          logger.w('JWT token expired. Attempting token refresh...');
          await _handleTokenExpiration();
        } else if (data != null &&
            data.toString().contains('Authentication failed')) {
          logger.w('Socket authentication failed. Attempting token refresh...');
          await _handleTokenExpiration();
        }
      });

      _socket!.onDisconnect((_) {
        logger.i("Socket disconnected");
        _isConnecting = false;
        _connectionController.add(false);
        _scheduleReconnect();
      });
    } catch (e, s) {
      logger.e('Exception during connection setup', error: e, stackTrace: s);
      _isConnecting = false;
      _connectionController.add(false);
      _scheduleReconnect();
    }
  }

  /// Schedule a reconnection attempt with exponential backoff
  void _scheduleReconnect() {
    // Cancel any existing reconnection timer
    _reconnectTimer?.cancel();

    // Only attempt reconnection if we haven't exceeded the maximum attempts
    if (_reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      _reconnectAttempts++;

      // Calculate delay with exponential backoff: RECONNECT_DELAY * 2^(attempts-1)
      final int delay = RECONNECT_DELAY * (1 << (_reconnectAttempts - 1));

      logger.i(
          "Scheduling socket reconnect in ${delay}s (attempt $_reconnectAttempts/$MAX_RECONNECT_ATTEMPTS)");

      _reconnectTimer = Timer(Duration(seconds: delay), () async {
        if (!(_socket?.connected ?? false) && !_isConnecting) {
          logger.i(
              "Attempting reconnection $_reconnectAttempts/$MAX_RECONNECT_ATTEMPTS");
          await connect();
        }
      });
    } else {
      logger.w(
          "Maximum reconnection attempts reached ($MAX_RECONNECT_ATTEMPTS). Giving up automatic reconnection.");
      // Reset counter so a manual reconnection can be attempted later
      _reconnectAttempts = 0;
    }
  }

  /// Sets up listeners for server-sent events.
  void _setupListeners() {
    logger.d("Setting up socket listeners...");
    if (_socket == null) {
      logger.e("Cannot setup listeners, socket is null.");
      return;
    }

    _socket!.on('newMessage', (data) {
      try {
        logger.i("🔥 DEBUG: Received 'newMessage' event with data: $data");
        if (data is Map<String, dynamic>) {
          final message = Message.fromJson(data);
          logger.i("🔥 DEBUG: Successfully parsed message: ${message.text}");
          _messageController.add(message);
          logger.i("🔥 DEBUG: Message added to controller stream");
        } else if (data is String) {
          logger.w(
              "⚠️ Received newMessage as String, skipping Message parsing. Data: $data");
        } else {
          logger.e(
              "❌ Received newMessage of unexpected type: ${data.runtimeType}. Data: $data");
        }
      } catch (e, s) {
        logger.e("❌ Error parsing 'newMessage'", error: e, stackTrace: s);
      }
    });

    _socket!.on('statusUpdate', (data) {
      logger.d("Received 'statusUpdate' event with data: $data");
      _statusUpdateController.add(data);
    });

    _socket!.on('trip-created', (data) {
      logger.d("Received 'trip-created' event with data: $data");
      _tripCreatedController.add(data);
    });

    _socket!.on('sessionJoined', (data) {
      logger.i("Session joined confirmation: $data");
    });

    _socket!.on('newTravelAlert', (data) {
      logger.w("Received 'newTravelAlert' event: $data");
      _alertController.add(data);
    });

    _socket!.on('newNotification', (data) {
      logger.i("Received 'newNotification' event: $data");
      _notificationController.add(data);
    });

    _socket!.on('tripConfirmed', (data) {
      try {
        logger.i("📋 Received 'tripConfirmed' event: $data");
        // If you want to use typed notifications, pass notification to controller instead of raw data
        _tripConfirmedController.add(data);
      } catch (e, s) {
        logger.e("❌ Error parsing 'tripConfirmed'", error: e, stackTrace: s);
        _tripConfirmedController.add(data); // Fallback to raw data
      }
    });

    _socket!.on('tripConfirmationRequired', (data) {
      try {
        logger.i("❓ Received 'tripConfirmationRequired' event: $data");
        // If you want to use typed notifications, pass notification to controller instead of raw data
        _tripConfirmationRequiredController.add(data);
      } catch (e, s) {
        logger.e("❌ Error parsing 'tripConfirmationRequired'",
            error: e, stackTrace: s);
        _tripConfirmationRequiredController.add(data); // Fallback to raw data
      }
    });

    _socket!.on('tripCompleted', (data) {
      try {
        logger.i("✅ Received 'tripCompleted' event: $data");
        // If you want to use typed notifications, pass notification to controller instead of raw data
        _tripCompletedController.add(data);
      } catch (e, s) {
        logger.e("❌ Error parsing 'tripCompleted'", error: e, stackTrace: s);
        _tripCompletedController.add(data); // Fallback to raw data
      }
    });

    _socket!.on('proactiveTravelAlert', (data) {
      try {
        logger.w("⚠️ Received 'proactiveTravelAlert' event: $data");
        // If you want to use typed alerts, pass alert to controller instead of raw data
        _proactiveTravelAlertController.add(data);
      } catch (e, s) {
        logger.e("❌ Error parsing 'proactiveTravelAlert'",
            error: e, stackTrace: s);
        _proactiveTravelAlertController.add(data); // Fallback to raw data
      }
    });

    _socket!.on('error', (data) {
      logger.e("Received 'error' event from server: $data");
      _errorController.add(data is String ? data : jsonEncode(data));
    });
  }

  /// Emits an event to the server.
  void emit(String event, dynamic data) {
    if (_socket?.connected ?? false) {
      logger.d("Emitting event '$event' with data: $data");
      _socket!.emit(event, data);
    } else {
      logger.e("Cannot emit event '$event', socket not connected.");
    }
  }

  /// Joins a specific chat session room.
  void joinSession(String sessionId) {
    if (_socket?.connected ?? false) {
      logger.i("🏠 DEBUG: Joining session: $sessionId");
      emit('joinSession', {'sessionId': sessionId});
      logger.i("🏠 DEBUG: JoinSession event emitted successfully");
    } else {
      logger.e(
          "❌ Cannot join session, socket not connected. Connection status: ${_socket?.connected}");
    }
  }

  /// Handles JWT token expiration by attempting to refresh the token and reconnect
  Future<void> _handleTokenExpiration() async {
    try {
      logger.i('Attempting to refresh JWT token for socket authentication...');

      // Attempt to refresh the token
      final refreshResult = await _authService.refreshToken();

      if (refreshResult['success']) {
        logger.i('Token refreshed successfully. Reconnecting socket...');

        // Disconnect current socket
        if (_socket?.connected ?? false) {
          _socket!.disconnect();
        }

        // Small delay to ensure clean disconnection
        await Future.delayed(const Duration(milliseconds: 500));

        // Reset connection state
        _isConnecting = false;
        _reconnectAttempts = 0;

        // Reconnect with new token
        await connect();
      } else {
        logger.e('Failed to refresh token: ${refreshResult['message']}');
        logger.w('Token refresh failed. User needs to log in again.');

        // Clear invalid tokens
        await _authService.clearTokens();

        // Emit an error to notify the UI that authentication failed
        _errorController.add('Authentication expired. Please log in again.');

        // Don't attempt automatic reconnection after auth failure
        return;
      }
    } catch (e, s) {
      logger.e('Exception during token refresh for socket authentication',
          error: e, stackTrace: s);

      // Clear potentially invalid tokens
      await _authService.clearTokens();

      // Emit an error to notify the UI
      _errorController.add('Authentication error. Please log in again.');
    }
  }

  /// Manually refresh the socket connection with a new token
  Future<void> refreshConnection() async {
    logger.i('Manually refreshing socket connection...');

    if (_socket?.connected ?? false) {
      _socket!.disconnect();
    }

    // Reset connection state
    _isConnecting = false;
    _reconnectAttempts = 0;

    // Attempt to connect with current token
    await connect();
  }

  /// Leaves a specific chat session room.
  void leaveSession(String sessionId) {
    if (_socket?.connected ?? false) {
      logger.i("Leaving session: $sessionId");
      emit('leaveSession', {'sessionId': sessionId});
    } else {
      logger.e("Cannot leave session, socket not connected.");
    }
  }

  /// Disconnects the socket from the server.
  void disconnect() {
    logger.i("Disconnecting socket...");
    _socket?.disconnect();
  }

  /// Disposes all stream controllers.
  void dispose() {
    logger.d("Disposing SocketService streams.");
    _messageController.close();
    _statusUpdateController.close();
    _tripCreatedController.close();
    _errorController.close();
    _alertController.close();
    _notificationController.close();
    _connectionController.close();

    // Dispose additional notification controllers
    _tripConfirmedController.close();
    _tripConfirmationRequiredController.close();
    _tripCompletedController.close();
    _proactiveTravelAlertController.close();
  }
}
