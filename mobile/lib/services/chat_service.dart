import 'dart:io';
import 'package:mobile/services/api_client.dart';

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
      throw ApiException('An unexpected error occurred with the AI chat session.');
    }
  }

  /// Clears the AI chat history for the current user.
  Future<void> clearAiChatHistory() async {
    try {
      await _apiClient.post('chat/sessions/ai/clear');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('An unexpected error occurred while clearing AI chat history.');
    }
  }

  // --- Group Chat Management ---

  /// Fetches all of the user's group chat sessions.
  Future<List<dynamic>> getGroupSessions() async {
    try {
      final response = await _apiClient.get('chat/sessions/group');
      return response['data']['sessions'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('An unexpected error occurred while fetching group chats.');
    }
  }

  // --- Message Sending & History ---

  /// Fetches paginated message history for any chat session (AI or group).
  Future<List<dynamic>> getMessages(String sessionId, {int page = 1}) async {
    try {
      final response = await _apiClient.get('messages/session/$sessionId?page=$page');
      return response['data']['messages'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('An unexpected error occurred while fetching messages.');
    }
  }

  /// Sends a text message to the AI.
  Future<void> sendAiMessage(String sessionId, String message, {Map<String, double>? origin}) async {
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
  Future<Map<String, dynamic>> sendMediaMessage(String sessionId, File mediaFile) async {
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
}