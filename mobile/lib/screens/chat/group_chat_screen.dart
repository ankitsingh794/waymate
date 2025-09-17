// lib/screens/chat/group_chat_screen.dart

import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/models/chat_session_model.dart';
import 'package:mobile/models/message_model.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/chat_service.dart';
import 'package:mobile/services/message_service.dart';
import 'package:mobile/services/socket_service.dart';
import 'package:mobile/services/user_service.dart';
import 'message_bubble.dart';

class GroupChatScreen extends StatefulWidget {
  // --- UPDATED: Accepts a ChatSession object ---
  final ChatSession session;
  const GroupChatScreen({super.key, required this.session});

  @override
  State<GroupChatScreen> createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen> {
  final TextEditingController _textController = TextEditingController();
  final List<Message> _messages = [];
  final MessageService _messageService = MessageService();
  final ChatService _chatService = ChatService();
  final SocketService _socketService = SocketService();

  User? _currentUser;
  bool _isLoading = true;
  StreamSubscription<Message>? _messageSubscription;
  StreamSubscription<bool>? _connectionSubscription;
  Timer? _connectionStatusTimer;

  @override
  void initState() {
    super.initState();

    // FIX: Periodically check connection status
    _connectionStatusTimer =
        Timer.periodic(const Duration(seconds: 2), (timer) {
      if (mounted) {
        setState(() {
          // This will rebuild the AppBar with current connection status
        });
      }
    });

    // FIX: Add a small delay to ensure widget is fully mounted
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _initChat();
      }
    });
  }

  Future<void> _initChat() async {
    if (!mounted) return;

    try {
      debugPrint('🚀 Initializing chat for session: ${widget.session.id}');

      // Get current user
      _currentUser = await UserService().getUserProfile();
      debugPrint('👤 Current user: ${_currentUser?.id}');

      // Get message history
      final history = await _messageService.getMessages(widget.session.id);
      debugPrint('📚 Loaded ${history.length} historical messages');

      if (mounted) {
        setState(() {
          _messages.clear();
          _messages.addAll(history.reversed);
          _isLoading = false;
        });
      }

      // FIX: Connect to socket and set up real-time messaging
      await _socketService.connect();

      // FIX: Join the specific chat session
      _socketService.joinSession(widget.session.id);

      // FIX: Listen for real-time messages
      _messageSubscription?.cancel(); // Cancel any existing subscription
      _messageSubscription = _socketService.onNewMessage.listen((message) {
        debugPrint('📨 Received real-time message in GroupChatScreen:');
        debugPrint('   - Message ID: ${message.id}');
        debugPrint('   - Text: ${message.text}');
        debugPrint('   - Sender ID: ${message.sender?.id}');
        debugPrint('   - Current User ID: ${_currentUser?.id}');
        debugPrint('   - Chat Session: ${message.chatSession}');
        debugPrint('   - Expected Session: ${widget.session.id}');

        // Add message if it's for this session
        if (mounted && message.chatSession == widget.session.id) {
          setState(() {
            // Check if message already exists to avoid duplicates
            final existingIndex =
                _messages.indexWhere((m) => m.id == message.id);
            if (existingIndex == -1) {
              _messages.insert(0, message);
              debugPrint('✅ Added new real-time message to chat');
            } else {
              debugPrint('⚠️ Message already exists, skipping duplicate');
            }
          });
        } else {
          debugPrint(
              '❌ Message not added - session mismatch or widget unmounted');
        }
      });

      // FIX: Listen for connection status
      _connectionSubscription?.cancel();
      _connectionSubscription =
          _socketService.onConnectionChange.listen((isConnected) {
        debugPrint('🔗 Socket connection status changed: $isConnected');
        if (mounted) {
          setState(() {
            // You can update UI based on connection status
          });
        }
      });

      debugPrint('✅ Chat initialized successfully');
    } catch (e) {
      debugPrint('❌ Error initializing chat: $e');
      if (mounted) {
        setState(() => _isLoading = false);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load chat: $e'),
            action: SnackBarAction(
              label: 'Retry',
              onPressed: () {
                setState(() => _isLoading = true);
                _initChat();
              },
            ),
          ),
        );
      }
    }
  }

  Future<void> _handleSubmitted(String text) async {
    if (text.trim().isEmpty || _currentUser == null) return;

    final messageText = text.trim();
    _textController.clear();

    try {
      debugPrint('📤 Sending message: $messageText');

      // FIX: Don't add optimistic message - let the socket event handle it
      await _messageService.sendTextMessage(
          sessionId: widget.session.id, text: messageText);

      debugPrint('✅ Message sent successfully, waiting for socket event...');
    } catch (e) {
      debugPrint('❌ Error sending message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $e')),
        );
        // Restore message text if sending failed
        _textController.text = messageText;
      }
    }
  }

  // --- NEW: Method to handle sending media files ---
  Future<void> _sendMediaMessage() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);

    if (image != null && _currentUser != null) {
      final File imageFile = File(image.path);
      // You can create an optimistic message with a local file path here if desired
      try {
        await _chatService.sendMediaMessage(widget.session.id, imageFile);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Failed to send image: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.session.displayName, style: GoogleFonts.poppins()),
        actions: [
          // FIX: Add connection status indicator
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Icon(
              _socketService.isConnected ? Icons.wifi : Icons.wifi_off,
              color: _socketService.isConnected ? Colors.green : Colors.red,
            ),
          ),
          // FIX: Add test button for debugging
          IconButton(
            icon: const Icon(Icons.bug_report),
            onPressed: () {
              debugPrint('🔍 SOCKET DEBUG INFO:');
              debugPrint('  - Connected: ${_socketService.isConnected}');
              debugPrint('  - Session ID: ${widget.session.id}');
              debugPrint('  - Current User: ${_currentUser?.id}');

              // Test rejoining the session
              _socketService.leaveSession(widget.session.id);
              Future.delayed(const Duration(seconds: 1), () {
                _socketService.joinSession(widget.session.id);
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.all(8.0),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final isCurrentUser =
                          message.sender?.id == _currentUser?.id;
                      // Show sender's name if it's not the current user and the previous message was from someone else
                      final showSenderName = !isCurrentUser &&
                          (index == _messages.length - 1 ||
                              _messages[index + 1].sender?.id !=
                                  message.sender?.id);
                      return MessageBubble(
                        message: message,
                        isCurrentUser: isCurrentUser,
                        showSenderName: showSenderName,
                      );
                    },
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
          // --- NEW: Attachment button for sending media ---
          IconButton(
            icon:
                Icon(Icons.attach_file, color: Theme.of(context).primaryColor),
            onPressed: _sendMediaMessage,
          ),
          Expanded(
            child: TextField(
              controller: _textController,
              onSubmitted: _handleSubmitted,
              decoration: const InputDecoration(
                hintText: 'Send a message...',
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 12.0),
              ),
            ),
          ),
          IconButton(
            icon: Icon(Icons.send, color: Theme.of(context).primaryColor),
            onPressed: () => _handleSubmitted(_textController.text),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    debugPrint(
        '🧹 Disposing GroupChatScreen for session: ${widget.session.id}');

    _connectionStatusTimer?.cancel(); // FIX: Cancel the timer

    // Clean up socket connections
    _messageSubscription?.cancel();
    _connectionSubscription?.cancel();
    _socketService.leaveSession(widget.session.id);

    _textController.dispose();
    super.dispose();
  }
}
