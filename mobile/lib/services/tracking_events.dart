import 'package:mobile/services/ml_service.dart';

abstract class TrackingEvent {}

class ShowTripStartNudge extends TrackingEvent {
  final PredictedActivity predictedActivity;
  final String temporaryTripId;

  ShowTripStartNudge({required this.predictedActivity, required this.temporaryTripId});
}

class HideNudge extends TrackingEvent {}
