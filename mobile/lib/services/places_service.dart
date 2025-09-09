
import 'package:mobile/models/place_models.dart'; // Import the Place model
import 'package:mobile/services/api_client.dart';

// --- Service Class ---

class PlacesService {
  final ApiClient _apiClient = ApiClient();

  /// Finds places based on a query and optional location.
  /// **[FIX] Now returns a strongly-typed list of Place objects.**
  Future<List<Place>> findPlaces({
    required String query,
    double? latitude,
    double? longitude,
  }) async {
    try {
      String endpoint = 'places?query=$query';
      if (latitude != null && longitude != null) {
        endpoint += '&lat=$latitude&lon=$longitude';
      }

      // The response is now dynamic because it's the raw JSON from the server.
      final dynamic response = await _apiClient.get(endpoint);

      final List<dynamic> placesJson = response['data'] as List<dynamic>;

      // Map the list of JSON objects into a list of Place objects.
      return placesJson.map((json) => Place.fromJson(json as Map<String, dynamic>)).toList();

    } on ApiException {
      // Re-throw API-specific exceptions to be handled by the UI layer.
      rethrow;
    } catch (e) {
      // Catch any other unexpected errors (e.g., parsing errors).
      throw ApiException('An unexpected error occurred while finding places.');
    }
  }
}