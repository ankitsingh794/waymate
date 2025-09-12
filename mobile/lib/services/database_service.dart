// lib/services/database_service.dart

import 'package:isar/isar.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:async';

class DatabaseService {
  late Future<Isar> db;

  DatabaseService() {
    db = _initDB();
  }

  Future<Isar> _initDB() async {
    if (Isar.instanceNames.isEmpty) {
      final dir = await getApplicationDocumentsDirectory();
      return await Isar.open(
        [
          TripSchema, 
        ],
        directory: dir.path,
        inspector: true, // Allows you to inspect the DB in debug mode
      );
    }
    return Future.value(Isar.getInstance());
  }
}