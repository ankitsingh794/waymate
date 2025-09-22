import 'package:mobile/services/api_client.dart';

// --- ENUMS & Data Models ---
enum TransportationMode {
  still,
  walking,
  running,
  cycling,
  driving,
  public_transport,
  unknown
}

class TrackingPoint {
  final double latitude;
  final double longitude;
  final double accuracy;
  final double speed;
  final DateTime timestamp;
  final double? accelerometerX;
  final double? accelerometerY;
  final double? accelerometerZ;
  final double? gyroscopeX;
  final double? gyroscopeY;
  final double? gyroscopeZ;
  final double? soundDb;

  TrackingPoint({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.speed,
    required this.timestamp,
    this.accelerometerX,
    this.accelerometerY,
    this.accelerometerZ,
    this.gyroscopeX,
    this.gyroscopeY,
    this.gyroscopeZ,
    this.soundDb,
  });

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'speed': speed,
      'timestamp': timestamp.toIso8601String(),
    };
    if (accelerometerX != null) data['accelerometerX'] = accelerometerX;
    if (accelerometerY != null) data['accelerometerY'] = accelerometerY;
    if (accelerometerZ != null) data['accelerometerZ'] = accelerometerZ;
    if (gyroscopeX != null) data['gyroscopeX'] = gyroscopeX;
    if (gyroscopeY != null) data['gyroscopeY'] = gyroscopeY;
    if (gyroscopeZ != null) data['gyroscopeZ'] = gyroscopeZ;
    if (soundDb != null) data['soundDb'] = soundDb;
    return data;
  }
}

// --- Service Class ---
class TrackingService {
  /// Confirm that a detected trip is valid and should be kept
  Future<void> confirmTrip(String tripId) async {
    await _apiClient.post('tracking/confirm', body: {'tripId': tripId});
  }

  /// Reject a detected trip (delete it)
  Future<void> rejectTrip(String tripId) async {
    await _apiClient.post('tracking/reject', body: {'tripId': tripId});
  }

  final ApiClient _apiClient = ApiClient();

  Future<Map<String, dynamic>> startTrip(TrackingPoint startPoint) async {
    final response = await _apiClient.post(
      'tracking/start',
      body: {'startPoint': startPoint.toJson()},
    );
    return response as Map<String, dynamic>;
  }

  Future<String> confirmTripStart(String temporaryTripId) async {
    final response = await _apiClient
        .post('tracking/confirm-start', body: {'tripId': temporaryTripId});
    return response['tripId'];
  }

  Future<void> cancelTrip(String temporaryTripId) async {
    await _apiClient
        .post('tracking/cancel-start', body: {'tripId': temporaryTripId});
  }

  Future<void> changeTripMode(String tripId, TransportationMode newMode) async {
    await _apiClient.post('tracking/change-mode', body: {
      'tripId': tripId,
      'newMode': newMode.name,
    });
  }

  Future<void> appendTripData(
      String tripId, List<TrackingPoint> dataBatch) async {
    try {
      final List<Map<String, dynamic>> batchAsJson =
          dataBatch.map((point) => point.toJson()).toList();
      await _apiClient.post(
        'tracking/append',
        body: {'tripId': tripId, 'batch': batchAsJson},
      );
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to send tracking data.');
    }
  }

  Future<void> endTrip(String tripId, [TrackingPoint? endPoint]) async {
    try {
      await _apiClient.post(
        'tracking/end',
        body: {'tripId': tripId, 'endPoint': endPoint?.toJson()},
      );
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to end trip on the server.');
    }
  }

  Future<Map<String, dynamic>> submitTripCorrection(
      String tripId, TransportationMode correctedMode) async {
    try {
      final response = await _apiClient.post(
        'tracking/trips/$tripId/confirm',
        body: {'correctedMode': correctedMode.toString().split('.').last},
      );
      return response;
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to submit trip correction.');
    }
  }

  // New method for confirming trip mode with string input
  Future<Map<String, dynamic>> confirmTripMode(
      String tripId, String mode) async {
    try {
      final response = await _apiClient.post(
        'tracking/trips/$tripId/confirm',
        body: {'correctedMode': mode},
      );
      return response;
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to confirm trip mode.');
    }
  }
}
