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
      final response = await _apiClient.get('v1/analytics/$endpoint');
      
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
      throw ApiException('An unexpected error occurred while fetching analytics.');
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
  Future<Map<String, dynamic>> getModeDistribution() async {
      final data = await _fetchData('mode-distribution');
      // The controller wraps this payload in a 'distribution' object.
      return data['distribution'] as Map<String, dynamic>;
  }
  
  /// Fetches the distribution of trips by purpose.
  Future<Map<String, dynamic>> getPurposeDistribution() async {
      final data = await _fetchData('purpose-distribution');
      // The controller wraps this payload in a 'distribution' object.
      return data['distribution'] as Map<String, dynamic>;
  }

  /// **NEW FEATURE**: Fetches the co-traveler frequency between two members.
  ///
  /// Takes two member IDs and returns data on how many trips they have taken together.
  Future<Map<String, dynamic>> getCoTravelerFrequency({required String memberA, required String memberB}) async {
    // We build the query string manually. Using Uri.encodeComponent is crucial
    // to prevent errors from special characters in the member IDs.
    final endpoint = 'co-traveler-frequency?memberA=${Uri.encodeComponent(memberA)}&memberB=${Uri.encodeComponent(memberB)}';
    
    final data = await _fetchData(endpoint);
    
    // The controller wraps this payload in a 'data' object.
    return data['data'] as Map<String, dynamic>;
  }
}
