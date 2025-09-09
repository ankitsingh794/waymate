import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:mobile/services/api_client.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_share/flutter_share.dart';

class ExportService {
  final ApiClient _apiClient = ApiClient();

  /// Downloads an export file from the API using a memory-efficient stream and
  /// opens the native platform share sheet to share the file.
  ///
  /// The [format] parameter must match one of the API's export formats,
  /// e.g., 'json', 'csv', or 'natpac-csv'.
  Future<void> downloadAndShareExport(String format) async {
    try {
      // Use the new streaming download method from the ApiClient.
      final response = await _apiClient.download('v1/export/trips/$format');

      // Determine file extension, treating 'natpac-csv' as '.csv'.
      final String fileExtension = format.endsWith('csv') ? 'csv' : format;
      final String fileName = 'waymate_export_${DateTime.now().millisecondsSinceEpoch}.$fileExtension';
      
      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/$fileName';
      final file = File(filePath);

      // Open a file sink to write the downloaded bytes as they arrive.
      final IOSink fileSink = file.openWrite();

      // Pipe the stream from the HTTP response directly to the file sink.
      await response.stream.pipe(fileSink);

      // The sink must be closed to finalize the file write.
      await fileSink.close();
      
      debugPrint('File downloaded successfully to: $filePath');

      // UPDATED: Use 'flutter_share' to open the native share dialog for the file.
      await FlutterShare.shareFile(
        title: fileName,
        text: 'Waymate Trip Data Export',
        filePath: filePath,
      );
      debugPrint('Share sheet opened for file: $filePath');

    } on ApiException {
      // Re-throw API-specific exceptions to be handled by the UI.
      rethrow;
    } catch (e) {
      debugPrint('An unexpected error occurred during export: $e');
      throw ApiException('An unexpected error occurred during the export process.');
    }
  }
}

