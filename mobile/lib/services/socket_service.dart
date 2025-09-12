import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:mobile/models/message_model.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:mobile/config/app_config.dart';

/// Manages the real-time WebSocket connection with the server.
/// This service is responsible for connecting, handling events, and providing
/// streams for the UI to listen to.
class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  IO.Socket? _socket;
  final AuthService _authService = AuthService();

  Completer<void>? _connectionCompleter;

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

  /// Initializes and connects the socket to the server.
  /// Returns a Future that completes upon successful connection or error.
  Future<void> connect() async {
    if (_socket?.connected ?? false) {
      debugPrint("[SOCKET DEBUG] 🟢 Socket already connected");
      return;
    }

    if (_connectionCompleter != null && !_connectionCompleter!.isCompleted) {
      debugPrint(
          "[SOCKET DEBUG] 🟡 Connection already in progress. Waiting for it to complete.");
      return _connectionCompleter!.future;
    }

    debugPrint("[SOCKET DEBUG] 🔵 Connection process started...");
    _connectionCompleter = Completer<void>();

    final token = await _authService.getAccessToken();
    if (token == null) {
      debugPrint(
          "[SOCKET DEBUG] ❌ FATAL: No auth token found. Cannot connect.");
      _connectionController.add(false); // FIX: Add this
      _connectionCompleter!.completeError('No auth token found.');
      return _connectionCompleter!.future;
    }
    debugPrint("[SOCKET DEBUG] 🟢 Auth token found.");

    _socket = IO.io(
      AppConfig.socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('✅ Socket connected: ${_socket!.id}');
      _connectionController.add(true); // FIX: Add this
      _setupListeners();
      if (!_connectionCompleter!.isCompleted) _connectionCompleter!.complete();
    });

    _socket!.onConnectError((data) {
      debugPrint('❌ Socket connection error: $data');
      _connectionController.add(false); // FIX: Add this
      if (!_connectionCompleter!.isCompleted)
        _connectionCompleter!.completeError('Connection Error: $data');
    });

    _socket!.onError((data) {
      debugPrint('❌ Socket error: $data');
      _connectionController.add(false); // FIX: Add this
      if (!_connectionCompleter!.isCompleted)
        _connectionCompleter!.completeError('Socket Error: $data');
    });

    _socket!.onDisconnect((_) {
      debugPrint("[SOCKET DEBUG] 🔌 Socket disconnected");
      _connectionController.add(false); // FIX: Add this
    });

    return _connectionCompleter!.future;
  }

  /// Sets up listeners for server-sent events.
  void _setupListeners() {
    debugPrint("[SOCKET DEBUG] 🎧 Setting up socket listeners...");

    _socket!.on('newMessage', (data) {
      debugPrint("[SOCKET DEBUG] 📨 Received 'newMessage' event: $data");
      try {
        // FIX: Better data parsing
        Map<String, dynamic> messageJson;
        if (data is String) {
          messageJson = json.decode(data);
        } else if (data is Map<String, dynamic>) {
          messageJson = data;
        } else {
          debugPrint(
              "❌ Unexpected data type for newMessage: ${data.runtimeType}");
          return;
        }

        final message = Message.fromJson(messageJson);
        debugPrint(
            "[SOCKET DEBUG] ✅ Parsed message: ${message.text} from ${message.sender?.name}");
        _messageController.add(message);
      } catch (e) {
        debugPrint("[SOCKET DEBUG] ❌ Error parsing 'newMessage' data: $e");
        debugPrint("[SOCKET DEBUG] ❌ Raw data: $data");
      }
    });

    // FIX: Add session join confirmation listener
    _socket!.on('sessionJoined', (data) {
      debugPrint("[SOCKET DEBUG] 🏠 Session joined confirmation: $data");
    });

    _socket!.on('statusUpdate', (data) {
      final Map<String, dynamic> statusJson =
          (data is String) ? json.decode(data) : data;
      _statusUpdateController.add(statusJson);
    });

    _socket!.on('tripCreated', (data) {
      final Map<String, dynamic> tripJson =
          (data is String) ? json.decode(data) : data;
      _tripCreatedController.add(tripJson);
    });

    _socket!.on('tripCreationError', (data) {
      final Map<String, dynamic> errorJson =
          (data is String) ? json.decode(data) : data;
      final message =
          errorJson['reply'] as String? ?? 'An unknown error occurred.';
      _errorController.add(message);
    });

    _socket!.on('newTravelAlert', (data) {
      debugPrint("📢 New Travel Alert Received: $data");
      final Map<String, dynamic> alertJson =
          (data is String) ? json.decode(data) : data;
      _alertController.add(alertJson);
    });

    _socket!.on('newNotification', (data) {
      debugPrint("🔔 New Notification Received: $data");
      final Map<String, dynamic> notificationJson =
          (data is String) ? json.decode(data) : data;
      _notificationController.add(notificationJson);
    });
  }

  /// Emits an event to join a specific chat session room on the server.
  void joinChatSession(String sessionId) {
    if (_socket?.connected ?? false) {
      // FIX: Send just the sessionId string, not an object
      _socket?.emit('joinSession', sessionId);
      debugPrint(
          "✅ Successfully sent 'joinSession' event for room: $sessionId");
    } else {
      debugPrint("❌ Could not join session room: Socket is not connected.");
    }
  }

  /// Emits an event to leave a chat session room.
  void leaveChatSession(String sessionId) {
    if (_socket?.connected ?? false) {
      // FIX: Send just the sessionId string, not an object
      _socket?.emit('leaveSession', sessionId);
      debugPrint(
          "✅ Successfully sent 'leaveSession' event for room: $sessionId");
    } else {
      debugPrint("❌ Could not leave session room: Socket is not connected.");
    }
  }

  /// Disconnects the socket and disposes of stream controllers.
  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _messageController.close();
    _statusUpdateController.close();
    _tripCreatedController.close();
    _errorController.close();
    _alertController.close();
    _notificationController.close();
    _connectionController.close(); // FIX: Add this
  }
}
