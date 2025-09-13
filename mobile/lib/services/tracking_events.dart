import 'package:mobile/services/ml_service.dart';

abstract class TrackingEvent {}

class ShowTripStartNudge extends TrackingEvent {
  final PredictedActivity predictedActivity;
  final String temporaryTripId;

  ShowTripStartNudge(
      {required this.predictedActivity, required this.temporaryTripId});
}

class HideNudge extends TrackingEvent {}

class PermissionError extends TrackingEvent {
  final String message;
  PermissionError(this.message);
}

class TrackingError extends TrackingEvent {
  final String message;
  TrackingError(this.message);
}

// New events for ML accuracy-based flow
class TripCompletedEvent extends TrackingEvent {
  final String tripId;
  final String mode;
  final double accuracy;
  final String message;

  TripCompletedEvent({
    required this.tripId,
    required this.mode,
    required this.accuracy,
    required this.message,
  });
}

class TripConfirmationRequired extends TrackingEvent {
  final String tripId;
  final String detectedMode;
  final double accuracy;
  final String message;

  TripConfirmationRequired({
    required this.tripId,
    required this.detectedMode,
    required this.accuracy,
    required this.message,
  });
}

class TripConfirmed extends TrackingEvent {
  final String tripId;
  final String confirmedMode;
  final String message;

  TripConfirmed({
    required this.tripId,
    required this.confirmedMode,
    required this.message,
  });
}
