import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:mobile/services/api_client.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:open_file/open_file.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:http/http.dart' as http;

class ExportService {
  final ApiClient _apiClient = ApiClient();

  // Enhanced export endpoints
  static const Map<String, String> exportEndpoints = {
    // Original exports
    'csv': 'export/trips/csv',
    'json': 'export/trips/json',
    'natpac-csv': 'export/trips/natpac-csv',

    // NEW: Enhanced NATPAC exports
    'comprehensive-csv': 'export/natpac/comprehensive-csv',
    'trip-chains-csv': 'export/natpac/trip-chains-csv',
    'mode-share-csv': 'export/natpac/mode-share-csv',
  };

  static const Map<String, String> exportDescriptions = {
    'csv': 'Basic trip data export in CSV format',
    'json': 'Complete trip data in JSON format',
    'natpac-csv': 'Standard NATPAC research format',
    'comprehensive-csv':
        'Complete NATPAC data with passive tracking and mode detection',
    'trip-chains-csv': 'Trip chain analysis for transportation planning',
    'mode-share-csv': 'Mode share statistics and aggregated insights',
  };

  /// Downloads and shares the export file
  Future<void> downloadAndShareExport(String format,
      {Map<String, String>? filters}) async {
    try {
      debugPrint('🔄 Starting export for format: $format');

      final endpoint = exportEndpoints[format];
      if (endpoint == null) {
        throw Exception('Unknown export format: $format');
      }

      // Request storage permission
      await _requestStoragePermission();

      // Build endpoint with query parameters
      final queryString = _buildQueryString(filters, format);
      final fullEndpoint =
          queryString.isNotEmpty ? '$endpoint?$queryString' : endpoint;

      debugPrint('📡 Making API request to: $fullEndpoint');

      // Use the download method from ApiClient
      final streamedResponse = await _apiClient.download(fullEndpoint);

      if (streamedResponse.statusCode == 200) {
        final bytes = await _streamToBytes(streamedResponse);
        final fileName = _generateFileName(format);

        debugPrint('✅ Export successful, saving file: $fileName');

        // Save file
        final file = await _saveFile(bytes, fileName);

        // Share or open file
        await _handleFileAfterDownload(file, fileName);

        debugPrint('🎉 Export completed successfully');
      } else {
        final errorBody = await streamedResponse.stream.bytesToString();
        throw Exception(
            'Export failed with status: ${streamedResponse.statusCode}. Error: $errorBody');
      }
    } catch (e) {
      debugPrint('❌ Export error: $e');
      rethrow;
    }
  }

  /// Download export with progress callback
  Future<void> downloadExportWithProgress(
    String format,
    Function(double progress) onProgress, {
    Map<String, String>? filters,
  }) async {
    try {
      final endpoint = exportEndpoints[format];
      if (endpoint == null) {
        throw Exception('Unknown export format: $format');
      }

      await _requestStoragePermission();

      // Build endpoint with query parameters
      final queryString = _buildQueryString(filters, format);
      final fullEndpoint =
          queryString.isNotEmpty ? '$endpoint?$queryString' : endpoint;

      debugPrint('📡 Making API request with progress to: $fullEndpoint');

      // Use the download method and track progress
      final streamedResponse = await _apiClient.download(fullEndpoint);

      if (streamedResponse.statusCode == 200) {
        final contentLength = streamedResponse.contentLength;
        final bytes = <int>[];
        int receivedBytes = 0;

        await for (final chunk in streamedResponse.stream) {
          bytes.addAll(chunk);
          receivedBytes += chunk.length;

          if (contentLength != null && contentLength > 0) {
            onProgress(receivedBytes / contentLength);
          }
        }

        final fileName = _generateFileName(format);
        final file = await _saveFile(bytes, fileName);
        await _handleFileAfterDownload(file, fileName);
      } else {
        final errorBody = await streamedResponse.stream.bytesToString();
        throw Exception(
            'Export failed with status: ${streamedResponse.statusCode}. Error: $errorBody');
      }
    } catch (e) {
      debugPrint('❌ Export with progress error: $e');
      rethrow;
    }
  }

  /// Get export statistics
  Future<ExportStats> getExportStats() async {
    try {
      final response = await _apiClient.get('export/stats');

      if (response != null && response['success'] == true) {
        return ExportStats.fromJson(response['data']);
      } else {
        throw Exception('Failed to get export stats: Invalid response');
      }
    } catch (e) {
      debugPrint('❌ Error getting export stats: $e');
      return ExportStats.empty();
    }
  }

  /// Get available export formats with descriptions
  Map<String, ExportFormatInfo> getAvailableFormats() {
    return exportEndpoints.map((key, endpoint) => MapEntry(
          key,
          ExportFormatInfo(
            format: key,
            endpoint: endpoint,
            description: exportDescriptions[key] ?? 'Export data',
            isEnhanced: key.contains('comprehensive') ||
                key.contains('trip-chains') ||
                key.contains('mode-share'),
          ),
        ));
  }

  // Helper methods
  String _buildQueryString(Map<String, String>? filters, String format) {
    final queryParams = <String, String>{};

    if (filters != null) {
      queryParams.addAll(filters);
    }

    // Add default filters for enhanced exports
    if (format.contains('comprehensive') || format.contains('trip-chains')) {
      queryParams['includePassive'] = 'true';
    }

    if (queryParams.isEmpty) return '';

    return queryParams.entries
        .map((e) =>
            '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');
  }

  Future<List<int>> _streamToBytes(http.StreamedResponse response) async {
    final bytes = <int>[];
    await for (final chunk in response.stream) {
      bytes.addAll(chunk);
    }
    return bytes;
  }

  String _generateFileName(String format) {
    final timestamp = DateTime.now().toIso8601String().split('T')[0];
    final extension = format.contains('json') ? 'json' : 'csv';
    return 'waymate_${format.replaceAll('-', '_')}_$timestamp.$extension';
  }

  Future<void> _requestStoragePermission() async {
    if (Platform.isAndroid) {
      final status = await Permission.storage.request();
      if (status != PermissionStatus.granted) {
        throw Exception('Storage permission denied');
      }
    }
  }

  Future<File> _saveFile(List<int> bytes, String fileName) async {
    final directory = Platform.isAndroid
        ? await getExternalStorageDirectory()
        : await getApplicationDocumentsDirectory();

    if (directory == null) {
      throw Exception('Could not access storage directory');
    }

    final file = File('${directory.path}/$fileName');
    await file.writeAsBytes(bytes);
    return file;
  }

  Future<void> _handleFileAfterDownload(File file, String fileName) async {
    try {
      // Try to share the file first
      await Share.shareXFiles([XFile(file.path)],
          text: 'WayMate Export: $fileName');
    } catch (e) {
      debugPrint('❌ Share failed, trying to open file: $e');
      try {
        // If sharing fails, try to open the file
        await OpenFile.open(file.path);
      } catch (e2) {
        debugPrint('❌ Open file failed: $e2');
        // If both fail, just throw the original share error
        throw Exception('Could not share or open file: $e');
      }
    }
  }
}

// Data classes remain the same
class ExportFormatInfo {
  final String format;
  final String endpoint;
  final String description;
  final bool isEnhanced;

  ExportFormatInfo({
    required this.format,
    required this.endpoint,
    required this.description,
    required this.isEnhanced,
  });
}

class ExportStats {
  final int totalTrips;
  final int totalUsers;
  final int totalHouseholds;
  final DateTime? lastExport;
  final Map<String, int> formatCounts;

  ExportStats({
    required this.totalTrips,
    required this.totalUsers,
    required this.totalHouseholds,
    this.lastExport,
    required this.formatCounts,
  });

  factory ExportStats.fromJson(Map<String, dynamic> json) {
    return ExportStats(
      totalTrips: json['totalTrips'] ?? 0,
      totalUsers: json['totalUsers'] ?? 0,
      totalHouseholds: json['totalHouseholds'] ?? 0,
      lastExport: json['lastExport'] != null
          ? DateTime.parse(json['lastExport'])
          : null,
      formatCounts: Map<String, int>.from(json['formatCounts'] ?? {}),
    );
  }

  factory ExportStats.empty() {
    return ExportStats(
      totalTrips: 0,
      totalUsers: 0,
      totalHouseholds: 0,
      formatCounts: {},
    );
  }
}
