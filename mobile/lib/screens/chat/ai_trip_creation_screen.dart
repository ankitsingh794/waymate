// lib/screens/chat/ai_trip_creation_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:uuid/uuid.dart';
import 'package:mobile/screens/chat/message_bubble.dart';

class AiTripCreationScreen extends StatefulWidget {
  const AiTripCreationScreen({super.key});

  @override
  State<AiTripCreationScreen> createState() => _AiTripCreationScreenState();
}

class _AiTripCreationScreenState extends State<AiTripCreationScreen> {
  final TextEditingController _textController = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isWaitingForResponse = false;
  final Uuid _uuid = const Uuid();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _receiveInitialMessage();
    });
  }

  void _receiveInitialMessage() {
    setState(() {
      _messages.insert(0, {
        'id': _uuid.v4(),
        'sender': 'ai',
        'text': 'Hello! I am your AI travel assistant. How can I help you plan a trip?',
        'createdAt': DateTime.now().toIso8601String(),
      });
    });
  }

  void _sendAndReceiveMessage(String text) async {
    setState(() {
      _messages.insert(0, {
        'id': _uuid.v4(),
        'sender': 'user',
        'text': text,
        'createdAt': DateTime.now().toIso8601String(),
      });
      _isWaitingForResponse = true;
    });

    await Future.delayed(const Duration(seconds: 2));
    setState(() {
      _messages.insert(0, {
        'id': _uuid.v4(),
        'sender': 'ai',
        'text': 'That sounds like a great trip! To give you the best recommendations, could you tell me the destination and the dates you have in mind?',
        'createdAt': DateTime.now().toIso8601String(),
      });
      _isWaitingForResponse = false;
    });
  }

  void _handleSubmitted(String text) {
    if (text.trim().isEmpty || _isWaitingForResponse) return;
    _textController.clear();
    _sendAndReceiveMessage(text);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('AI Assistant', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color.fromARGB(255, 87, 184, 203),
                Color.fromARGB(255, 14, 59, 76),
              ],
            ),
          ),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color.fromARGB(255, 87, 184, 203),
              Color.fromARGB(255, 14, 59, 76),
            ],
          ),
        ),
        child: Column(
          children: [
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(30),
                    topRight: Radius.circular(30),
                  ),
                ),
                child: ListView.builder(
                  reverse: true,
                  itemCount: _messages.length,
                  padding: const EdgeInsets.fromLTRB(8.0, 20.0, 8.0, 8.0),
                  itemBuilder: (context, index) {
                    final message = _messages[index];
                    final bool isCurrentUser = message['sender'] == 'user';
                    
                    // FIXED: Pass the required parameters to the updated MessageBubble
                    return MessageBubble(
                      message: message,
                      isCurrentUser: isCurrentUser,
                      showSenderName: false, // We don't need to show names in a 1-on-1 AI chat
                    );
                  },
                ),
              ),
            ),
            if (_isWaitingForResponse)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white))),
                    const SizedBox(width: 12),
                    Text('AI is typing...', style: GoogleFonts.poppins(color: Colors.white70)),
                  ],
                ),
              ),
            _buildMessageComposer(),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageComposer() {
    // ... same as before
    return Container(
      margin: const EdgeInsets.all(8.0),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.25),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(left: 20.0),
              child: TextField(
                controller: _textController,
                onSubmitted: _handleSubmitted,
                style: GoogleFonts.poppins(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Ask the AI to plan a trip...',
                  hintStyle: GoogleFonts.poppins(color: Colors.white54),
                  border: InputBorder.none,
                ),
                cursorColor: Colors.white,
                enabled: !_isWaitingForResponse,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send, color: Colors.white),
            onPressed: _isWaitingForResponse ? null : () => _handleSubmitted(_textController.text),
          ),
        ],
      ),
    );
  }
}