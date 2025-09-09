import 'package:flutter/material.dart';

// This class provides a global key to the navigator, allowing navigation
// from services or other non-widget classes like the ApiClient.
class GlobalNavigator {
  static final GlobalKey<NavigatorState> key = GlobalKey<NavigatorState>();
}

