import 'package:flutter/foundation.dart';
import 'package:mobile/models/user_model.dart'; // Assuming a simple user model exists

/// Represents media content attached to a message.
class Media {
  final String? url;
  final String? type; // 'image', 'file', 'video'

  Media({this.url, this.type});

  factory Media.fromJson(Map<String, dynamic> json) {
    return Media(
      url: json['url'],
      type: json['type'],
    );
  }
}

/// Represents a single chat message, aligning with the backend Message schema.
class Message {
  final String id;
  final String chatSession;
  final User? sender;
  final String? text;
  final String type; // 'user', 'system', 'ai'
  final String? inReplyTo;
  final Media? media;
  final String status; // 'sent', 'delivered', 'read'
  final DateTime createdAt;
  final DateTime updatedAt;

  Message({
    required this.id,
    required this.chatSession,
    this.sender,
    this.text,
    required this.type,
    this.inReplyTo,
    this.media,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Factory constructor to create a Message from a JSON map.
  factory Message.fromJson(Map<String, dynamic> json) {
    try {
      return Message(
        id: json['_id'],
        chatSession: json['chatSession'],
        sender: json['sender'] != null ? User.fromJson(json['sender']) : null,
        text: json['text'],
        type: json['type'] ?? 'user',
        inReplyTo: json['inReplyTo'],
        media: json['media'] != null && json['media']['url'] != null ? Media.fromJson(json['media']) : null,
        status: json['status'] ?? 'sent',
        createdAt: DateTime.parse(json['createdAt']),
        updatedAt: DateTime.parse(json['updatedAt']),
      );
    } catch (e) {
      debugPrint('Error parsing Message from JSON: $e');
      rethrow;
    }
  }
}

