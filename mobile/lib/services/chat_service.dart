import 'dart:io';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/models/chat_session_model.dart';
import 'package:mobile/utils/logger.dart';

/// Provides an interface for all chat-related API endpoints.
/// This service handles HTTP requests, while SocketService handles real-time events.
class ChatService {
  // FIX 1: ApiClient() now takes no arguments.
  final ApiClient _apiClient = ApiClient();

  // --- AI & Session Management ---

  /// Finds an existing AI chat session or creates a new one.
  Future<String> findOrCreateAiSession() async {
    try {
      final response = await _apiClient.post('chat/sessions/ai');
      return response['data']['sessionId'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred with the AI chat session.');
    }
  }

  /// Clears the AI chat history for the current user.
  Future<void> clearAiChatHistory() async {
    try {
      await _apiClient.post('chat/sessions/ai/clear');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while clearing AI chat history.');
    }
  }

  // --- Group Chat Management ---

  /// Fetches all of the user's group chat sessions.
  Future<List<ChatSession>> getGroupSessions() async {
    try {
      // FIX: Use the correct endpoint from your backend routes
      final response = await _apiClient.get('chat/sessions/group');
      logger.d('Chat sessions response: $response');

      if (response != null && response['data'] != null) {
        final responseData = response['data'];
        List<dynamic> sessionsJson;

        // Handle different response structures
        if (responseData['sessions'] != null) {
          sessionsJson = responseData['sessions'] as List<dynamic>;
        } else if (responseData is List) {
          sessionsJson = responseData;
        } else {
          logger.w('Unexpected response structure: $responseData');
          return [];
        }

        final sessions = sessionsJson
            .map((json) => ChatSession.fromJson(json as Map<String, dynamic>))
            .toList();

        logger.i("Fetched ${sessions.length} group sessions");
        return sessions;
      }
      return [];
    } catch (e, s) {
      logger.e("Failed to fetch group sessions", error: e, stackTrace: s);
      throw ApiException(
          "An unexpected error occurred while fetching group chats.", null);
    }
  }

  Future<ChatSession?> getSessionForTrip(String tripId) async {
    try {
      final allSessions = await getGroupSessions();

      logger.d('Looking for session with tripId: $tripId');
      logger.d('Found ${allSessions.length} total sessions');

      for (int i = 0; i < allSessions.length; i++) {
        final session = allSessions[i];
        logger.d('Session $i:');
        logger.d('  - Session ID: ${session.id}');
        logger.d('  - Session tripId: ${session.tripId?.id}');
        logger.d('  - Does tripId match? ${session.tripId?.id == tripId}');
      }

      // Find the session where the nested tripId matches.
      final sessionForTrip = allSessions.where((session) {
        final matches = session.tripId?.id == tripId;
        logger.d('Session ${session.id} matches tripId $tripId: $matches');
        return matches;
      }).firstOrNull;

      if (sessionForTrip != null) {
        logger.i('✅ Found matching session: ${sessionForTrip.id}');
      } else {
        logger.w('❌ No matching session found for tripId: $tripId');
      }

      return sessionForTrip;
    } catch (e, s) {
      logger.e('Error getting session for trip', error: e, stackTrace: s);
      return null;
    }
  }

  // --- Message Sending & History ---

  /// Fetches paginated message history for any chat session (AI or group).
  Future<List<dynamic>> getMessages(String sessionId, {int page = 1}) async {
    try {
      final response =
          await _apiClient.get('messages/session/$sessionId?page=$page');
      return response['data']['messages'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'An unexpected error occurred while fetching messages.');
    }
  }

  /// Sends a text message to the AI.
  Future<void> sendAiMessage(String sessionId, String message,
      {Map<String, double>? origin}) async {
    try {
      // FIX 2: Explicitly type the body as Map<String, Object> to allow different value types.
      final Map<String, Object> body = {'message': message};
      if (origin != null) {
        body['origin'] = origin;
      }
      await _apiClient.post('chat/message/ai/$sessionId', body: body);
    } on ApiException {
      rethrow;
    }
  }

  /// Sends a text message to a group chat session.
  /// NOTE: The backend will broadcast this message to other participants via WebSockets.
  Future<void> sendGroupMessage(String sessionId, String message) async {
    try {
      await _apiClient.post(
        'messages/session/$sessionId/text',
        body: {'message': message},
      );
    } on ApiException {
      rethrow;
    }
  }

  /// Sends a media file (image, video, etc.) to a specific chat session.
  /// NOTE: The backend will broadcast this message to other participants via WebSockets.
  Future<Map<String, dynamic>> sendMediaMessage(
      String sessionId, File mediaFile) async {
    try {
      // FIX 3: Call the public 'postWithFile' method instead of the private '_uploadFile'.
      final response = await _apiClient.postWithFile(
        'messages/session/$sessionId/media',
        file: mediaFile,
        fileField: 'media',
      );
      return response['data']['message'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('An unexpected error occurred while sending media.');
    }
  }

  // Add this method back if you implement the backend route:

  Future<ChatSession?> createChatSessionForTrip(String tripId) async {
    try {
      logger.d('Creating chat session for trip: $tripId');

      final response = await _apiClient.post('chat/sessions/group', body: {
        'tripId': tripId,
      });

      logger.d('Create session response: $response');

      if (response != null && response['data'] != null) {
        final responseData = response['data'];

        if (responseData['session'] != null) {
          return ChatSession.fromJson(responseData['session']);
        } else if (responseData is Map<String, dynamic>) {
          return ChatSession.fromJson(responseData);
        }
      }

      return null;
    } catch (e, s) {
      logger.e('Error creating chat session', error: e, stackTrace: s);
      return null;
    }
  }
}
