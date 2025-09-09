import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:mobile/models/message_model.dart'; // Assuming you have a message model
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

  // StreamControllers to broadcast received data to the UI.
  final _messageController = StreamController<Message>.broadcast();
  final _statusUpdateController = StreamController<Map<String, dynamic>>.broadcast();
  final _tripCreatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _errorController = StreamController<String>.broadcast();
  
  // Expose streams for the UI to listen to.
  Stream<Message> get onNewMessage => _messageController.stream;
  Stream<Map<String, dynamic>> get onStatusUpdate => _statusUpdateController.stream;
  Stream<Map<String, dynamic>> get onTripCreated => _tripCreatedController.stream;
  Stream<String> get onError => _errorController.stream;

  SocketService._internal();

  /// Initializes and connects the socket to the server.
  /// Must be called after the user is authenticated.
  Future<void> connect() async {
    // Prevent multiple connections
    if (_socket?.connected ?? false) {
      debugPrint("Socket is already connected.");
      return;
    }

    final token = await _authService.getAccessToken();
    if (token == null) {
      debugPrint("Socket connection failed: No auth token found.");
      return;
    }

    _socket = IO.io(
      AppConfig.baseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('✅ Socket connected: ${_socket!.id}');
      _setupListeners();
    });

    _socket!.onConnectError((data) => debugPrint('Socket connection error: $data'));
    _socket!.onError((data) => debugPrint('Socket error: $data'));
    _socket!.onDisconnect((_) => debugPrint('Socket disconnected'));
  }

  /// Sets up listeners for server-sent events.
  void _setupListeners() {
    _socket!.on('newMessage', (data) {
      try {
        final message = Message.fromJson(data); // Deserialize into your Message model
        _messageController.add(message);
      } catch (e) {
        debugPrint("Error parsing 'newMessage' data: $e");
      }
    });

    _socket!.on('statusUpdate', (data) {
       _statusUpdateController.add(data as Map<String, dynamic>);
    });

    _socket!.on('tripCreated', (data) {
       _tripCreatedController.add(data as Map<String, dynamic>);
    });

    _socket!.on('tripCreationError', (data) {
       final message = (data as Map<String, dynamic>)['reply'] as String? ?? 'An unknown error occurred.';
       _errorController.add(message);
    });
  }

  /// Emits an event to join a specific chat session room on the server.
  void joinChatSession(String sessionId) {
    _socket?.emit('joinSession', {'sessionId': sessionId});
    debugPrint("Attempting to join session room: $sessionId");
  }

  /// Emits an event to leave a chat session room.
  void leaveChatSession(String sessionId) {
    _socket?.emit('leaveSession', {'sessionId': sessionId});
     debugPrint("Leaving session room: $sessionId");
  }

  /// Disconnects the socket and disposes of stream controllers.
  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _messageController.close();
    _statusUpdateController.close();
    _tripCreatedController.close();
    _errorController.close();
  }
}
