import 'package:flutter/foundation.dart';
import 'package:mobile/models/user_model.dart'; // Assuming a simple user model exists

/// Represents the last message sent in a chat session for display in a chat list.
class LastMessage {
  final String? senderId;
  final String? text;
  final DateTime? sentAt;

  LastMessage({
    this.senderId,
    this.text,
    this.sentAt,
  });

  factory LastMessage.fromJson(Map<String, dynamic> json) {
    return LastMessage(
      senderId: json['senderId'],
      text: json['text'],
      sentAt: json['sentAt'] != null ? DateTime.parse(json['sentAt']) : null,
    );
  }
}

/// Represents a chat session, aligning with the backend ChatSession schema.
class ChatSession {
  final String id;
  final List<User> participants;
  final String sessionType; // 'ai', 'private', 'group'
  final String? tripId;
  final String name;
  final LastMessage? lastMessage;
  final DateTime createdAt;
  final DateTime updatedAt;

  ChatSession({
    required this.id,
    required this.participants,
    required this.sessionType,
    this.tripId,
    required this.name,
    this.lastMessage,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Factory constructor to create a ChatSession from a JSON map.
  factory ChatSession.fromJson(Map<String, dynamic> json) {
    try {
      var participantList = <User>[];
      if (json['participants'] != null) {
        participantList = (json['participants'] as List)
            .map((p) => User.fromJson(p))
            .toList();
      }

      return ChatSession(
        id: json['_id'],
        participants: participantList,
        sessionType: json['sessionType'] ?? 'private',
        tripId: json['tripId'],
        name: json['name'] ?? 'Chat',
        lastMessage: json['lastMessage'] != null
            ? LastMessage.fromJson(json['lastMessage'])
            : null,
        createdAt: DateTime.parse(json['createdAt']),
        updatedAt: DateTime.parse(json['updatedAt']),
      );
    } catch (e) {
      debugPrint('Error parsing ChatSession from JSON: $e');
      rethrow;
    }
  }
}
