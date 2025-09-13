import 'package:mobile/config/app_config.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/models/trip_models.dart'; // Import the new models file

// A paginated response model for lists of trips.
// NOTE: The list view API might send a less detailed Trip object.
// For now, this uses the full Trip model for consistency. Adjust if needed.
class PaginatedTrips {
  final List<Trip> trips;
  final int page;
  final int totalPages;
  final int total;

  PaginatedTrips({
    required this.trips,
    required this.page,
    required this.totalPages,
    required this.total,
  });

  factory PaginatedTrips.fromJson(Map<String, dynamic> json) {
    final tripData = json['data']['data'];

    if (tripData == null) {
      return PaginatedTrips(
        trips: [],
        page: json['data']['page'] ?? 1,
        totalPages: json['data']['totalPages'] ?? 1,
        total: json['data']['total'] ?? 0,
      );
    }

    var tripList = tripData as List;
    List<Trip> trips = tripList.map((i) => Trip.fromJson(i)).toList();
    return PaginatedTrips(
      trips: trips,
      page: json['data']['page'],
      totalPages: json['data']['totalPages'],
      total: json['data']['total'],
    );
  }
}

// --- Service Class ---
// This class now returns the fully-featured, strongly-typed Trip objects.
class TripService {
  final ApiClient _apiClient = ApiClient();

  /// Fetches a paginated list of trips with optional filters.
  Future<PaginatedTrips> getAllTrips(
      {int page = 1,
      int limit = 10,
      String? status,
      String? destination}) async {
    try {
      final queryParams = {
        'page': page.toString(),
        'limit': limit.toString(),
        if (status != null) 'status': status,
        if (destination != null) 'destination': destination,
      };
      final endpoint = 'trips?${Uri(queryParameters: queryParams).query}';

      final response = await _apiClient.get(endpoint);

      // --- TEMPORARY DEBUGGING ---
      // This will print the raw response from the server to your console.
      // --- END DEBUGGING ---

      return PaginatedTrips.fromJson(response);
    } catch (e) {
      throw ApiException('Failed to fetch trips: ${e.toString()}');
    }
  }

  /// Fetches the complete details for a single trip by its ID.
  Future<Trip> getTripById(String tripId) async {
    try {
      final response = await _apiClient.get('trips/$tripId');
      // The actual trip object is nested under 'data' and 'trip' keys.
      return Trip.fromJson(response['data']['trip']);
    } catch (e) {
      throw ApiException('Failed to fetch trip details: ${e.toString()}');
    }
  }

  /// Deletes a trip.
  Future<void> deleteTrip(String tripId) async {
    try {
      await _apiClient.delete('trips/$tripId');
    } catch (e) {
      throw ApiException('Failed to delete trip: ${e.toString()}');
    }
  }

  /// Updates the core details of a trip.
  Future<Trip> updateTripDetails(
      String tripId, Map<String, dynamic> details) async {
    try {
      final response =
          await _apiClient.patch('trips/$tripId/details', body: details);
      return Trip.fromJson(response['data']['trip']);
    } catch (e) {
      throw ApiException('Failed to update trip details: ${e.toString()}');
    }
  }

  /// Toggles the favorite status of a trip.
  Future<bool> toggleFavoriteStatus(String tripId) async {
    try {
      final response = await _apiClient.patch('trips/$tripId/favorite');
      return response['data']['favorite'];
    } catch (e) {
      throw ApiException('Failed to update favorite status: ${e.toString()}');
    }
  }

  /// Updates the overall status of a trip (e.g., 'completed', 'canceled').
  Future<Trip> updateTripStatus(String tripId, String status) async {
    try {
      final response = await _apiClient
          .patch('trips/$tripId/status', body: {'status': status});
      return Trip.fromJson(response['data']['trip']);
    } catch (e) {
      throw ApiException('Failed to update trip status: ${e.toString()}');
    }
  }

  /// Generates an invitation link for a trip.
  Future<String> generateInviteLink(String tripId) async {
    try {
      final response = await _apiClient.post('trips/$tripId/generate-invite');
      return response['data']['inviteLink'];
    } catch (e) {
      throw ApiException('Failed to generate invite link: ${e.toString()}');
    }
  }

  /// Generates an invite token for the trip
  Future<Map<String, dynamic>> generateInviteToken(String tripId) async {
    try {
      final response = await _apiClient.post('trips/$tripId/generate-invite');
      if (response != null && response['data'] != null) {
        return {
          'token': response['data']['inviteToken'],
          'expiresAt': response['data']['expiresAt'],
          'tripName': response['data']['tripName'],
        };
      }
      throw Exception('Failed to generate invite token');
    } catch (e) {
      throw Exception('Error generating invite token: $e');
    }
  }

  /// Accepts an invitation to join a trip using a token, now with demographic data.
  Future<String> acceptTripInvite(String token,
      {String? ageGroup, String? gender, String? relation}) async {
    try {
      final body = {
        'token': token,
        if (ageGroup != null) 'ageGroup': ageGroup,
        if (gender != null) 'gender': gender,
        if (relation != null) 'relation': relation,
      };
      final response = await _apiClient.post('trips/accept-invite', body: body);
      return response['data']['tripId'];
    } catch (e) {
      throw ApiException('Failed to accept invitation: ${e.toString()}');
    }
  }

  /// Joins a trip using an invite token
  Future<String> joinTripWithToken(
    String token, {
    String? ageGroup,
    String? gender,
    String? relation,
  }) async {
    try {
      final response = await _apiClient.post('trips/accept-invite', body: {
        'token': token,
        'ageGroup': ageGroup,
        'gender': gender,
        'relation': relation,
      });

      if (response != null && response['data'] != null) {
        return response['data']['tripId'];
      }
      throw Exception('Failed to join trip');
    } catch (e) {
      throw Exception('Error joining trip: $e');
    }
  }

  /// Removes a member from a trip.
  Future<void> removeMemberFromTrip(String tripId, String memberId) async {
    try {
      await _apiClient.delete('trips/$tripId/members/$memberId');
    } catch (e) {
      throw ApiException('Failed to remove member: ${e.toString()}');
    }
  }

  /// Updates the role of a member in a trip.
  Future<void> updateMemberRole(
      String tripId, String memberId, String role) async {
    try {
      await _apiClient
          .patch('trips/$tripId/members/$memberId/role', body: {'role': role});
    } catch (e) {
      throw ApiException('Failed to update member role: ${e.toString()}');
    }
  }

  /// Updates the current user's personal details for a specific trip.
  Future<void> updateMyMemberDetails(
      String tripId, Map<String, String> details) async {
    try {
      await _apiClient.patch('trips/$tripId/members/me', body: details);
    } catch (e) {
      throw ApiException('Failed to update your trip details: ${e.toString()}');
    }
  }

  /// Updates the activities for a specific day in the itinerary.
  Future<void> updateDayItinerary(
      String tripId, int day, List<String> activities) async {
    try {
      await _apiClient.patch('trips/$tripId/itinerary/$day',
          body: {'activities': activities});
    } catch (e) {
      throw ApiException('Failed to update itinerary: ${e.toString()}');
    }
  }

  /// Upgrades a trip to include a smart schedule.
  Future<Map<String, dynamic>> upgradeToSmartSchedule(String tripId) async {
    try {
      final response = await _apiClient.post('trips/$tripId/smart-schedule');
      return response['data']['schedule'];
    } catch (e) {
      throw ApiException('Failed to generate smart schedule: ${e.toString()}');
    }
  }

  /// Syncs offline trip data with the backend.
  Future<Map<String, String>> syncOfflineTrips(
      List<Map<String, dynamic>> trips) async {
    try {
      final response =
          await _apiClient.post('trips/sync', body: {'trips': trips});
      return Map<String, String>.from(response['data']['idMap']);
    } catch (e) {
      throw ApiException('Failed to sync trips: ${e.toString()}');
    }
  }

  /// Returns the URL to download the trip's PDF itinerary.
  String getTripPdfDownloadUrl(String tripId) {
    return '${AppConfig.baseUrl}/trips/$tripId/download';
  }
}
