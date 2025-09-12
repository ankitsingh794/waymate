import 'package:flutter/foundation.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/models/trip_models.dart'; // Import Trip model

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

class ChatSession {
  late String id;
  late String type;
  late List<User> participants;
  Trip? tripId;
  String? name; // Add name field from backend
  LastMessage? lastMessage;
  late DateTime createdAt;
  late DateTime updatedAt;

  ChatSession({
    this.id = '',
    this.type = '',
    this.participants = const [],
    this.tripId,
    this.name,
    this.lastMessage,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  // Add this getter for display name
  String get displayName {
    if (name != null && name!.isNotEmpty) {
      return name!;
    }
    if (tripId?.destination != null && tripId!.destination.isNotEmpty) {
      return '${tripId!.destination} Chat';
    }
    return 'Group Chat';
  }

  /// Factory constructor to create a ChatSession from a JSON map.
  factory ChatSession.fromJson(Map<String, dynamic> json) {
    try {
      debugPrint(
          'Parsing ChatSession JSON: ${json.toString().substring(0, 200)}...');

      return ChatSession(
        id: json['_id'] ?? '',
        // FIX: Handle both 'type' and 'sessionType' from backend
        type: json['type'] ?? json['sessionType'] ?? '',
        participants: (json['participants'] as List<dynamic>? ?? []).map((p) {
          if (p is String) {
            return User(id: p);
          } else if (p is Map<String, dynamic>) {
            return User.fromJson(p);
          } else {
            debugPrint('Unexpected participant type: ${p.runtimeType}');
            return User(id: p.toString());
          }
        }).toList(),
        tripId: json['tripId'] != null
            ? (json['tripId'] is String
                ? Trip(
                    id: json['tripId'],
                    destination: '',
                    startDate: DateTime.now(),
                    endDate: DateTime.now(),
                    travelers: 1,
                    weather: [],
                    attractions: [],
                    foodRecommendations: [],
                    accommodationSuggestions: [],
                    alerts: [],
                    itinerary: [],
                    favorite: false,
                    createdAt: DateTime.now(),
                    updatedAt: DateTime.now(),
                  )
                : Trip.fromJson(json['tripId'] as Map<String, dynamic>))
            : null,
        // FIX: Add name field from backend
        name: json['name'],
        lastMessage: json['lastMessage'] != null
            ? LastMessage.fromJson(json['lastMessage'])
            : null,
        createdAt: json['createdAt'] != null
            ? DateTime.parse(json['createdAt'])
            : DateTime.now(),
        updatedAt: json['updatedAt'] != null
            ? DateTime.parse(json['updatedAt'])
            : DateTime.now(),
      );
    } catch (e) {
      debugPrint('Error parsing ChatSession: $e');
      debugPrint('JSON: $json');
      rethrow;
    }
  }
}
