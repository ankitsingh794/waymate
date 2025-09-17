import 'package:logger/logger.dart';

/// Global logger instance.
///
/// Use this for structured and leveled logging across the application.
///
/// Levels:
/// - `logger.t()`: Trace (Verbose)
/// - `logger.d()`: Debug
/// - `logger.i()`: Info
/// - `logger.w()`: Warning
/// - `logger.e()`: Error
/// - `logger.f()`: Fatal (What a Terrible Failure)
///
final logger = Logger(
  printer: PrettyPrinter(
    methodCount: 1, // Number of method calls to be displayed
    errorMethodCount: 8, // Number of method calls if stacktrace is provided
    lineLength: 120, // Width of the log print
    colors: true, // Colorful log messages
    printEmojis: true, // Print an emoji for each log message
    printTime: false, // Should each log print contain a timestamp
  ),
);
