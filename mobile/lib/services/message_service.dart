// lib/services/message_service.dart
import 'package:mobile/models/message_model.dart';
import 'package:mobile/services/api_client.dart';

class MessageService {
  final ApiClient _apiClient = ApiClient();

  Future<List<Message>> getMessages(String sessionId, {int page = 1}) async {
    final response = await _apiClient.get('messages/session/$sessionId?page=$page&limit=50');
    final messagesJson = response['data']['messages'] as List;
    return messagesJson.map((json) => Message.fromJson(json)).toList();
  }

  Future<Message> sendTextMessage({required String sessionId, required String text}) async {
    final response = await _apiClient.post(
      'messages/session/$sessionId/text',
      body: {'message': text},
    );
    return Message.fromJson(response['data']['message']);
  }

  Future<void> sendAiMessage({required String sessionId, required String text, Map<String, double>? origin}) async {

    final Map<String, dynamic> body = {'message': text};
    if (origin != null) {
      body['origin'] = origin; // <-- ADD the origin to the body if it exists
    }

    await _apiClient.post(
      'chat/message/ai/$sessionId',
      body: body,
    );
  }
}