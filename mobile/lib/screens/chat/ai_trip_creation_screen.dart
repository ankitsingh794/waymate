// lib/screens/chat/ai_trip_creation_screen.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile/models/message_model.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/chat_service.dart';
import 'package:mobile/services/message_service.dart';
import 'package:mobile/services/permission_service.dart';
import 'package:mobile/services/socket_service.dart';
import 'package:mobile/services/user_service.dart';
import 'message_bubble.dart';

class AiTripCreationScreen extends StatefulWidget {
  const AiTripCreationScreen({super.key});

  @override
  State<AiTripCreationScreen> createState() => _AiTripCreationScreenState();
}

class _AiTripCreationScreenState extends State<AiTripCreationScreen> {
  final TextEditingController _textController = TextEditingController();
  final List<Message> _messages = [];
  final ChatService _chatService = ChatService();
  final MessageService _messageService = MessageService();
  final SocketService _socketService = SocketService();

  String? _sessionId;
  User? _currentUser;
  bool _isLoading = true;
  bool _isWaitingForResponse = false;

  // NEW: Track if this is the first message in the session
  bool _isFirstMessage = true;
  Map<String, double>? _cachedUserLocation;

  // FIX: Add status tracking
  String _currentStatus = '';
  bool _showStatusIndicator = false;

  StreamSubscription? _messageSubscription;
  StreamSubscription? _statusSubscription;
  StreamSubscription? _tripCreatedSubscription;
  StreamSubscription? _errorSubscription;

  @override
  void initState() {
    super.initState();
    _initChat();
  }

  Future<void> _initChat() async {
    try {
      _currentUser = await UserService().getUserProfile();
      final sessionId = await _chatService.findOrCreateAiSession();
      final history = await _messageService.getMessages(sessionId);

      // NEW: Get user location during initialization
      await _getUserLocation();

      if (!mounted) return;

      // Await the connection BEFORE proceeding
      await _socketService.connect();

      // Now it is safe to join and listen for messages
      _socketService.joinSession(sessionId);
      _messageSubscription =
          _socketService.onNewMessage.listen(_handleNewMessage);
      _statusSubscription =
          _socketService.onStatusUpdate.listen(_handleStatusUpdate);
      _tripCreatedSubscription =
          _socketService.onTripCreated.listen(_handleTripCreated);
      _errorSubscription = _socketService.onError.listen(_handleError);

      setState(() {
        _sessionId = sessionId;
        _messages.addAll(history.reversed);
        // NEW: If there are existing messages, this is not the first message
        _isFirstMessage = history.isEmpty;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Error initializing chat: ${e.toString()}')));
      }
    }
  }

  // NEW: Get user location once and cache it
  Future<void> _getUserLocation() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint("Location services are disabled.");
        return;
      }

      // Check location permissions using PermissionService
      bool hasLocation = await PermissionService.hasLocationPermission();
      if (!hasLocation) {
        debugPrint("Location permissions are denied");
        return;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit:
            const Duration(seconds: 15), // Increased timeout for first message
      );

      _cachedUserLocation = {
        'lat': position.latitude,
        'lon': position.longitude
      };

      debugPrint("User location cached: $_cachedUserLocation");
    } catch (e) {
      debugPrint("Error getting user location: $e");
      _cachedUserLocation = null;
    }
  }

  void _handleNewMessage(Message message) {
    debugPrint(
        "🔥 DEBUG: _handleNewMessage called with message: ${message.text}");
    debugPrint(
        "🔥 DEBUG: Message sender: ${message.sender?.id}, Current user: ${_currentUser?.id}");
    debugPrint(
        "🔥 DEBUG: Should show message: ${message.sender?.id != _currentUser?.id}");

    if (mounted && message.sender?.id != _currentUser?.id) {
      debugPrint("🔥 DEBUG: Adding message to UI");
      setState(() {
        _messages.insert(0, message);
        _isWaitingForResponse = false;
      });
      debugPrint(
          "🔥 DEBUG: Message added successfully. Total messages: ${_messages.length}");
    } else {
      debugPrint(
          "🔥 DEBUG: Message not added - either not mounted or sender is current user");
    }
  }

  void _handleStatusUpdate(Map<String, dynamic> data) {
    if (mounted) {
      setState(() {
        _currentStatus = data['status'] ?? 'Processing...';
        _showStatusIndicator = true;
      });

      // FIX: Hide status indicator after showing for 3 seconds
      Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() {
            _showStatusIndicator = false;
          });
        }
      });
    }
  }

  void _handleTripCreated(Map<String, dynamic> data) {
    if (mounted) {
      setState(() {
        _isWaitingForResponse = false;
        _showStatusIndicator = false;
      });

      // FIX: Show success message with smooth animation
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 8),
              Text("Trip Created!")
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text("Your trip to ${data['trip']['destinationName']} is ready."),
              const SizedBox(height: 16),
              const LinearProgressIndicator(value: 1.0, color: Colors.green),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text("OK"),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                // FIX: Navigate to trip details
                Navigator.pushNamed(
                  context,
                  '/trip-details',
                  arguments: {'tripId': data['trip']['_id']},
                );
              },
              child: const Text("View Trip"),
            ),
          ],
        ),
      );
    }
  }

  void _handleError(String error) {
    if (mounted) {
      setState(() {
        _isWaitingForResponse = false;
        _showStatusIndicator = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _handleSubmitted(String text) async {
    if (text.trim().isEmpty || _sessionId == null || _currentUser == null) {
      return;
    }
    final messageText = text.trim();
    _textController.clear();

    final optimisticMessage = Message(
      id: DateTime.now().toIso8601String(),
      sender: _currentUser!,
      text: messageText,
      chatSession: _sessionId!,
      type: 'user',
      status: 'sent',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    setState(() {
      _messages.insert(0, optimisticMessage);
      _isWaitingForResponse = true;
    });

    try {
      Map<String, double>? locationToSend;

      // NEW: Always try to send location with first message
      if (_isFirstMessage) {
        if (_cachedUserLocation != null) {
          locationToSend = _cachedUserLocation;
          debugPrint(
              "Sending cached location with first message: $locationToSend");
        } else {
          // Try to get location one more time for first message
          try {
            final position = await Geolocator.getCurrentPosition(
              desiredAccuracy: LocationAccuracy.medium,
              timeLimit: const Duration(seconds: 20),
            );
            locationToSend = {
              'lat': position.latitude,
              'lon': position.longitude,
            };
            debugPrint("Got fresh location for first message: $locationToSend");
          } catch (e) {
            debugPrint("Could not get location for first message: $e");
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text(
                    'Could not determine your location. Using default location for trip planning.'),
                backgroundColor: Colors.orange,
              ));
            }
          }
        }

        // Mark that we've sent the first message
        _isFirstMessage = false;
      } else {
        // For subsequent messages, use cached location if available
        locationToSend = _cachedUserLocation;
      }

      await _messageService.sendAiMessage(
        sessionId: _sessionId!,
        text: messageText,
        origin: locationToSend,
      );

      debugPrint("Message sent with origin: $locationToSend");
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.removeAt(0); // Remove optimistic message on error
          _isWaitingForResponse = false;
        });
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('AI Assistant', style: GoogleFonts.poppins()),
        actions: [
          // NEW: Show location status in app bar
          if (_cachedUserLocation != null)
            const Icon(Icons.location_on, color: Colors.green, size: 20)
          else
            const Icon(Icons.location_off, color: Colors.grey, size: 20),
          IconButton(
            icon: const Icon(Icons.delete_sweep_outlined),
            onPressed: () async {
              await _chatService.clearAiChatHistory();
              setState(() {
                _messages.clear();
                _isFirstMessage = true; // Reset first message flag
              });
            },
            tooltip: 'Clear History',
          ),
        ],
      ),
      body: Column(
        children: [
          // FIX: Enhanced status indicator
          if (_showStatusIndicator)
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: double.infinity,
              padding: const EdgeInsets.all(12.0),
              color: Colors.blue.withOpacity(0.1),
              child: Row(
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(Colors.blue),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _currentStatus,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: Colors.blue[800],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Location status banner
          if (_cachedUserLocation == null && _isFirstMessage)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8.0),
              color: Colors.orange.withOpacity(0.1),
              child: Row(
                children: [
                  const Icon(Icons.location_off,
                      color: Colors.orange, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Location not available. Trip planning will use default location.',
                      style: GoogleFonts.poppins(
                          fontSize: 12, color: Colors.orange[800]),
                    ),
                  ),
                ],
              ),
            ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    reverse: true,
                    itemCount: _messages.length,
                    padding: const EdgeInsets.all(8.0),
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final bool isCurrentUser =
                          message.sender?.id == _currentUser?.id;
                      return MessageBubble(
                          message: message,
                          isCurrentUser: isCurrentUser,
                          showSenderName: false);
                    },
                  ),
          ),

          // FIX: Enhanced waiting indicator
          if (_isWaitingForResponse)
            Container(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 12),
                  Text('AI is thinking...', style: GoogleFonts.poppins()),
                  const Spacer(),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _isWaitingForResponse = false;
                      });
                    },
                    child: const Text('Cancel'),
                  ),
                ],
              ),
            ),

          _buildMessageComposer(),
        ],
      ),
    );
  }

  Widget _buildMessageComposer() {
    return Container(
      margin: const EdgeInsets.all(8.0),
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
              color: Colors.grey.withOpacity(0.3),
              spreadRadius: 1,
              blurRadius: 5)
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              onSubmitted: _handleSubmitted,
              decoration: InputDecoration(
                hintText: _isFirstMessage
                    ? 'Tell me where you want to go...'
                    : 'Ask the AI to plan a trip...',
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12.0),
              ),
            ),
          ),
          IconButton(
            icon: Icon(Icons.send, color: Theme.of(context).primaryColor),
            onPressed: _isWaitingForResponse
                ? null
                : () => _handleSubmitted(_textController.text),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    if (_sessionId != null) _socketService.leaveSession(_sessionId!);
    _messageSubscription?.cancel();
    _statusSubscription?.cancel();
    _tripCreatedSubscription?.cancel();
    _errorSubscription?.cancel();
    _textController.dispose();
    super.dispose();
  }
}
