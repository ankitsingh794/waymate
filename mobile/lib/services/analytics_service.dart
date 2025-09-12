import 'package:mobile/services/api_client.dart';

/// A service class for handling all analytics-related API calls.
/// This file has been updated to include the `getCoTravelerFrequency` feature
/// and to correct how it processes responses from the ApiClient.
class AnalyticsService {
  final ApiClient _apiClient = ApiClient();

  /// **FIXED & REFACTORED**: A generic private helper to make API calls.
  /// This function now correctly handles the decoded Map returned by `ApiClient`
  /// instead of incorrectly trying to parse an `http.Response` object.
  Future<Map<String, dynamic>> _fetchData(String endpoint) async {
    try {
      // ApiClient's get method returns a decoded JSON Map on success
      // or throws a pre-formatted ApiException on failure.
      final response = await _apiClient.get('analytics/$endpoint');

      // The backend's `sendSuccess` helper wraps the actual payload in a 'data' key.
      // We ensure this key exists before returning its content.
      if (response != null && response['data'] is Map<String, dynamic>) {
        return response['data'] as Map<String, dynamic>;
      }

      // If the response format is unexpected, we throw a clear exception.
      throw ApiException('Invalid response format received from the server.');
    } on ApiException {
      rethrow; // Re-throw exceptions from ApiClient to be handled by the UI.
    } catch (e) {
      // Catch any other unexpected programming errors.
      throw ApiException(
          'An unexpected error occurred while fetching analytics: ${e.toString()}');
    }
  }

  /// Fetches high-level aggregate statistics about all trips.
  /// The specific stats object is nested under a 'stats' key in the response.
  Future<Map<String, dynamic>> getTripStats() async {
    final data = await _fetchData('trip-stats');
    // The controller specifically wraps this payload in a 'stats' object.
    return data['stats'] as Map<String, dynamic>;
  }

  /// Fetches the distribution of trips by transport mode.
  Future<List<dynamic>> getModeDistribution() async {
    // 👈 CHANGED return type
    final data = await _fetchData('mode-distribution');
    // The controller wraps this payload in a 'distribution' object which contains a List.
    return data['distribution'] as List<dynamic>; // 👈 CHANGED cast to List
  }

  /// Fetches the distribution of trips by purpose.
  Future<List<dynamic>> getPurposeDistribution() async {
    // 👈 CHANGED return type
    final data = await _fetchData('purpose-distribution');
    // The controller wraps this payload in a 'distribution' object which contains a List.
    return data['distribution'] as List<dynamic>; // 👈 CHANGED cast to List
  }

  /// **NEW FEATURE**: Fetches the co-traveler frequency between two members.
  ///
  /// Takes two member IDs and returns data on how many trips they have taken together.
  Future<Map<String, dynamic>> getCoTravelerFrequency({
    required String memberAHash,
    required String memberBHash,
  }) async {
    if (memberAHash == memberBHash) {
      throw ApiException(
          'Cannot analyze co-traveler frequency for the same member.');
    }

    final endpoint =
        'co-traveler-frequency?memberA=${Uri.encodeComponent(memberAHash)}&memberB=${Uri.encodeComponent(memberBHash)}';

    final data = await _fetchData(endpoint);

    // The controller wraps this payload in a 'data' object.
    return data['data'] as Map<String, dynamic>;
  }
}
