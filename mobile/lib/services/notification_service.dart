// lib/services/notification_service.dart

import 'package:flutter/material.dart';
import 'package:mobile/widgets/common/confirmation_dialog.dart';

class NotificationService {
  // A GlobalKey is needed to access the NavigatorState without a BuildContext
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  void showTransportConfirmation() {
    final context = navigatorKey.currentContext;
    if (context == null) return;

    showDialog(
      context: context,
      builder: (_) => ConfirmationDialog(
        title: 'Confirm Your Trip',
        message: 'To improve data accuracy, please confirm your primary mode of transport for your last trip.',
        options: const ['Car', 'Bus', 'Train', 'Walk'],
        onConfirm: (selectedOption) {
          // TODO: Send the confirmed mode back to your backend
          debugPrint('User confirmed transport mode: $selectedOption');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Thank you for your feedback!')),
          );
        },
      ),
    );
  }

  void showStopPurposeConfirmation() {
  final context = navigatorKey.currentContext;
  if (context == null) return;

  showDialog(
    context: context,
    builder: (_) => ConfirmationDialog(
      title: 'Confirm Stop Purpose',
      message: 'We noticed you stopped near the Colosseum. To improve your itinerary, please tell us the purpose of this stop.',
      options: const ['Dining', 'Shopping', 'Leisure', 'Work'],
      onConfirm: (selectedOption) {
        // TODO: Send the confirmed purpose back to your backend
        debugPrint('User confirmed stop purpose: $selectedOption');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Thanks! Your itinerary will be updated.')),
        );
      },
    ),
  );
}
  
  // We will add a method for the stop purpose confirmation here later
}