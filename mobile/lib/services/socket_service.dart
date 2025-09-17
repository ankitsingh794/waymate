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
    if (token == null) {
      logger.e("FATAL: No auth token found. Cannot connect.");
      _isConnecting = false;
      _connectionController.add(false);
      return;
    }
    logger.d("Auth token found.");

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
        logger.i('Socket connected: ${_socket!.id}');
        _isConnecting = false;
        _reconnectAttempts =
            0; // Reset reconnect counter on successful connection
        _connectionController.add(true);
        _setupListeners();
      });

      _socket!.onConnectError((data) {
        logger.e('Socket connection error: $data');
        _isConnecting = false;
        _connectionController.add(false);
        _scheduleReconnect();
      });

      _socket!.onError((data) {
        logger.e('Socket error: $data');
        _isConnecting = false;
        _connectionController.add(false);
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

    _socket!.on('new-message', (data) {
      try {
        logger.d("Received 'new-message' event with data: $data");
        final message = Message.fromJson(data);
        _messageController.add(message);
      } catch (e, s) {
        logger.e("Error parsing 'new-message'", error: e, stackTrace: s);
      }
    });

    _socket!.on('status-update', (data) {
      logger.d("Received 'status-update' event with data: $data");
      _statusUpdateController.add(data);
    });

    _socket!.on('trip-created', (data) {
      logger.d("Received 'trip-created' event with data: $data");
      _tripCreatedController.add(data);
    });

    _socket!.on('session-joined', (data) {
      logger.i("Session joined confirmation: $data");
    });

    _socket!.on('alert', (data) {
      logger.w("Received 'alert' event: $data");
      _alertController.add(data);
    });

    _socket!.on('notification', (data) {
      logger.i("Received 'notification' event: $data");
      _notificationController.add(data);
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
      logger.i("Joining session: $sessionId");
      emit('joinSession', {'sessionId': sessionId});
    } else {
      logger.e("Cannot join session, socket not connected.");
    }
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
  }
}
