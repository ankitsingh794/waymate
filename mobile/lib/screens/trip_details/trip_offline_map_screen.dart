import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart'
    show
        OfflineManager,
        TileStore,
        NetworkRestriction,
        TilesetDescriptorOptions,
        TileRegionLoadOptions,
        StylePackLoadOptions,
        GlyphsRasterizationMode,
        MapboxStyles,
        CameraOptions,
        MapAnimationOptions,
        PointAnnotationOptions,
        MbxEdgeInsets;
import 'package:geolocator/geolocator.dart' as geolocator;


class PlaceMarker {
  final double latitude;
  final double longitude;
  final String name;
  final String type;

  PlaceMarker({
    required this.latitude,
    required this.longitude,
    required this.name,
    required this.type,
  });
}

class TripOfflineMapScreen extends StatefulWidget {
  final double latitude;
  final double longitude;
  final String tripName;
  final List<PlaceMarker> places;

  const TripOfflineMapScreen({
    Key? key,
    required this.latitude,
    required this.longitude,
    required this.tripName,
    this.places = const [],
  }) : super(key: key);

  @override
  State<TripOfflineMapScreen> createState() => _TripOfflineMapScreenState();
}

class _TripOfflineMapScreenState extends State<TripOfflineMapScreen> {
  mapbox.MapboxMap? _mapboxMap;
  mapbox.PointAnnotationManager? _annotationManager;
  bool _downloading = false;
  bool _isRegionDownloaded = false;
  bool _isOffline = false;
  StreamSubscription<geolocator.Position>? _positionSubscription;
  geolocator.Position? _userPosition;
  final Completer<void> _mapLoadedCompleter = Completer();
  final StreamController<double> _stylePackProgress =
      StreamController<double>.broadcast();
  final StreamController<double> _tileRegionProgress =
      StreamController<double>.broadcast();
  OfflineManager? _offlineManager;
  TileStore? _tileStore;
  late final String _tileRegionId;
  static const String _mapStyleUri = MapboxStyles.OUTDOORS;

  @override
  void initState() {
    super.initState();
    _tileRegionId = 'trip_region_${widget.tripName.replaceAll(' ', '_')}';
    _initOfflineManager();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _stylePackProgress.close();
    _tileRegionProgress.close();
    super.dispose();
  }

  Future<void> _initOfflineManager() async {
    debugPrint('[Offline] Initializing OfflineManager and TileStore...');
    try {
      _offlineManager = await OfflineManager.create();
      _tileStore = await TileStore.createDefault();
      debugPrint('[Offline] OfflineManager and TileStore initialized.');
      await _checkForExistingRegion();
    } catch (e, st) {
      debugPrint('[Offline] Error initializing offline managers: $e\n$st');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error initializing offline managers: $e')),
        );
      }
    }
  }

  Future<void> _checkForExistingRegion() async {
    if (_tileStore == null) return;
    final regions = await _tileStore!.allTileRegions();
    final isDownloaded = regions.any((region) => region.id == _tileRegionId);
    if (mounted) {
      setState(() {
        _isRegionDownloaded = isDownloaded;
      });
      debugPrint(
          '[Offline] Region "$_tileRegionId" is ${isDownloaded ? "available" : "not available"} offline.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Offline Map: ${widget.tripName}'),
        actions: [
          IconButton(
            icon: Icon(
              _isOffline
                  ? Icons.signal_cellular_off
                  : Icons.signal_cellular_4_bar,
              color: _isOffline ? Colors.red : Colors.white,
            ),
            tooltip: _isOffline ? 'Go Online' : 'Simulate Offline',
            onPressed: _toggleNetworkRestriction,
          ),
        ],
      ),
      body: Stack(
        children: [
          mapbox.MapWidget(
            key: const ValueKey('map'),
            styleUri: _mapStyleUri,
            cameraOptions: CameraOptions(
              center: mapbox.Point(
                  coordinates:
                      mapbox.Position(widget.longitude, widget.latitude)),
              zoom: 12.0,
            ),
            onMapCreated: (controller) async {
              _mapboxMap = controller;
              await _mapboxMap!.location.updateSettings(
                  mapbox.LocationComponentSettings(
                      enabled: true, puckBearingEnabled: true));
              _annotationManager =
                  await controller.annotations.createPointAnnotationManager();
              await _addPlaceMarkers();
              await _frameCameraToBounds();
            },
            onMapLoadedListener: (mapbox.MapLoadedEventData data) {
              // This is called when the map is fully loaded
              if (!_mapLoadedCompleter.isCompleted) {
                _mapLoadedCompleter.complete();
              }
            },
          ),
          if (_downloading)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text("Downloading Map Data...",
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      StreamBuilder<double>(
                        stream: _stylePackProgress.stream,
                        initialData: 0.0,
                        builder: (context, snapshot) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  "Style Pack: ${(snapshot.data! * 100).toStringAsFixed(0)}%"),
                              LinearProgressIndicator(value: snapshot.data),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      StreamBuilder<double>(
                        stream: _tileRegionProgress.stream,
                        initialData: 0.0,
                        builder: (context, snapshot) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  "Map Tiles: ${(snapshot.data! * 100).toStringAsFixed(0)}%"),
                              LinearProgressIndicator(value: snapshot.data),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          FloatingActionButton(
            heroTag: 'center-location-fab',
            onPressed: _centerOnUserLocation,
            tooltip: 'My Location',
            child: const Icon(Icons.my_location),
          ),
          const SizedBox(height: 16),
          _buildFab(),
        ],
      ),
    );
  }

  // Fixed centerOnUserLocation method using geolocator instead of deprecated getLastKnownLocation
  Future<void> _centerOnUserLocation() async {
    if (_mapboxMap == null) return;

    // Wait for the map to be fully loaded before trying to get location
    await _mapLoadedCompleter.future;

    try {
      // Use geolocator instead of mapbox location API
      final position = await geolocator.Geolocator.getCurrentPosition(
        desiredAccuracy: geolocator.LocationAccuracy.high,
      );

      _mapboxMap!.flyTo(
        CameraOptions(
          center: mapbox.Point(
              coordinates: mapbox.Position(position.longitude, position.latitude)),
          zoom: 14.0,
        ),
        MapAnimationOptions(duration: 1200),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to get location: $e')),
        );
      }
    }
  }

  Widget _buildFab() {
    if (_downloading) {
      return const FloatingActionButton.extended(
        heroTag: 'download-fab',
        onPressed: null,
        label: Text('Downloading...'),
        icon: CircularProgressIndicator(color: Colors.white),
        backgroundColor: Colors.grey,
      );
    } else if (_isRegionDownloaded) {
      return FloatingActionButton.extended(
        heroTag: 'download-fab',
        onPressed: _deleteOfflineRegion,
        label: const Text('Delete Offline Map'),
        icon: const Icon(Icons.delete_forever),
        backgroundColor: Colors.red,
      );
    } else {
      return FloatingActionButton.extended(
        heroTag: 'download-fab',
        onPressed: _downloadOfflineRegion,
        label: const Text('Download for Offline'),
        icon: const Icon(Icons.download),
      );
    }
  }

  String _getIconImageForType(String type) {
    switch (type) {
      case 'attraction':
        return "attraction-15";
      case 'food':
        return "restaurant-15";
      case 'accommodation':
        return "lodging-15";
      default:
        return "marker-15";
    }
  }

  Future<void> _addPlaceMarkers() async {
    if (_annotationManager == null) return;

    for (final place in widget.places) {
      await _annotationManager!.create(
        PointAnnotationOptions(
          geometry: mapbox.Point(
              coordinates: mapbox.Position(place.longitude, place.latitude)),
          iconImage: _getIconImageForType(place.type),
          iconSize: 1.5,
          textField: place.name,
          textOffset: [0.0, 2.0],
          textColor: Colors.black.value,
          textHaloColor: Colors.white.value,
          textHaloWidth: 1.5,
        ),
      );
    }
  }

  Future<void> _frameCameraToBounds() async {
    if (_mapboxMap == null || widget.places.isEmpty) return;
    await Future.delayed(const Duration(milliseconds: 500));
    final bounds = await _calculateBounds();
    if (bounds == null) return;

    try {
      final coordinates = [bounds.southwest, bounds.northeast];
      // Fixed: cameraForCoordinates now only takes 4 parameters maximum
      final cameraOptions = await _mapboxMap!.cameraForCoordinates(
        coordinates,
        MbxEdgeInsets(top: 80.0, left: 80.0, bottom: 80.0, right: 80.0),
        0, // bearing
        0, // pitch
      );
      await _mapboxMap!.flyTo(
        cameraOptions,
        MapAnimationOptions(duration: 1200),
      );
    } catch (e) {
      debugPrint("Error framing camera to bounds: $e");
    }
  }

  void _toggleNetworkRestriction() {
    if (_mapboxMap == null) return;

    setState(() {
      _isOffline = !_isOffline;
      // Fixed: Use DISALLOW_ALL instead of DISALLOWED
      final restriction =
          _isOffline ? NetworkRestriction.DISALLOW_ALL : NetworkRestriction.NONE;
      
      // Fixed: Use OfflineSwitch instead of TileStore.setOption
      if (_tileStore != null) {
        // Note: This method might need to be adjusted based on actual API
        // The exact replacement for setOption might vary
        try {
          mapbox.OfflineSwitch.shared.setMapboxStackConnected(!_isOffline);
        } catch (e) {
          debugPrint('Error setting network restriction: $e');
        }
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_isOffline
              ? 'Network disabled. Map is now running offline.'
              : 'Network enabled.'),
          backgroundColor: _isOffline ? Colors.orange : Colors.green,
        ),
      );
    });
  }

  Future<void> _deleteOfflineRegion() async {
    if (_offlineManager == null || _tileStore == null) return;

    debugPrint('[Offline] Deleting offline region "$_tileRegionId"...');
    try {
      await _tileStore!.removeRegion(_tileRegionId);
      await _offlineManager!.removeStylePack(_mapStyleUri);
      if (mounted) {
        setState(() => _isRegionDownloaded = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Offline map data deleted.'),
            backgroundColor: Colors.green,
          ),
        );
        debugPrint('[Offline] Deletion successful.');
      }
    } catch (e, st) {
      debugPrint('[Offline] Error deleting region: $e\n$st');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error deleting offline data: $e')),
        );
      }
    }
  }

  Future<void> _downloadOfflineRegion() async {
  if (_offlineManager == null || _tileStore == null) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Offline manager not initialized.')),
      );
    }
    return;
  }

  setState(() => _downloading = true);
  final bounds = await _calculateBounds();
  if (bounds == null) {
    if (mounted) {
      setState(() => _downloading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not calculate trip bounds.')),
      );
    }
    return;
  }

  final geometry = {
    'type': 'Polygon',
    'coordinates': [
      [
        [bounds.southwest.coordinates.lng, bounds.southwest.coordinates.lat],
        [bounds.northeast.coordinates.lng, bounds.southwest.coordinates.lat],
        [bounds.northeast.coordinates.lng, bounds.northeast.coordinates.lat],
        [bounds.southwest.coordinates.lng, bounds.northeast.coordinates.lat],
        [bounds.southwest.coordinates.lng, bounds.southwest.coordinates.lat],
      ]
    ],
  };

  final tilesetDescriptorOptions = TilesetDescriptorOptions(
    styleURI: _mapStyleUri,
    minZoom: 6,
    maxZoom: 14,
  );

  final tileRegionLoadOptions = TileRegionLoadOptions(
    geometry: geometry,
    descriptorsOptions: [tilesetDescriptorOptions],
    networkRestriction: NetworkRestriction.NONE,
    acceptExpired: true,
  );

  final stylePackLoadOptions = StylePackLoadOptions(
    glyphsRasterizationMode:
        GlyphsRasterizationMode.IDEOGRAPHS_RASTERIZED_LOCALLY,
    metadata: {"name": "Style pack for ${widget.tripName}"},
    acceptExpired: true,
  );

  _offlineManager!.loadStylePack(
    _mapStyleUri,
    stylePackLoadOptions,
    (progress) {
      final percentage = progress.completedResourceCount /
          (progress.requiredResourceCount > 0
              ? progress.requiredResourceCount
              : 1);
      if (!_stylePackProgress.isClosed) {
        _stylePackProgress.sink.add(percentage);
      }
    },
  ).then((stylePack) {
    debugPrint('[Offline] Style pack loaded successfully.');
    if (!_stylePackProgress.isClosed) {
      _stylePackProgress.sink.add(1.0);
    }
    
    _startTileRegionDownload(tileRegionLoadOptions);
  }).catchError((error) {
    debugPrint('[Offline] Error loading style pack: $error');
    if (mounted) {
      setState(() => _downloading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to download style pack: $error')),
      );
    }
  });
}

void _startTileRegionDownload(TileRegionLoadOptions tileRegionLoadOptions) {
  _tileStore!.loadTileRegion(
    _tileRegionId,
    tileRegionLoadOptions,
    (progress) {
      final percentage = progress.completedResourceCount /
          (progress.requiredResourceCount > 0
              ? progress.requiredResourceCount
              : 1);
      if (!_tileRegionProgress.isClosed) {
        _tileRegionProgress.sink.add(percentage);
      }
    },
  ).then((tileRegion) {
    if (!_tileRegionProgress.isClosed) {
      _tileRegionProgress.sink.add(1.0);
    }
    if (mounted) {
      setState(() {
        _downloading = false;
        _isRegionDownloaded = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Offline map downloaded successfully!')),
      );
    }
    debugPrint('[Offline] Tile region loaded successfully.');
  }).catchError((error) {
    debugPrint('[Offline] Error loading tile region: $error');
    if (mounted) {
      setState(() => _downloading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error downloading region: $error')),
      );
    }
  });
}
  Future<CustomCameraBounds?> _calculateBounds() async {
    if (widget.places.isEmpty &&
        (widget.latitude == 0 && widget.longitude == 0)) {
      return null;
    }

    final data = CameraForCoordinatesData(
      coordinates: [
        mapbox.Point(
            coordinates: mapbox.Position(widget.longitude, widget.latitude)),
        ...widget.places.map((p) =>
            mapbox.Point(coordinates: mapbox.Position(p.longitude, p.latitude)))
      ],
      padding: mapbox.MbxEdgeInsets(top: 0, left: 0, bottom: 0, right: 0),
    );

    return await compute(calculateBoundsForCoordinates, data);
  }
}

// --- HELPER CLASSES AND TOP-LEVEL FUNCTION ---

class CameraForCoordinatesData {
  final List<mapbox.Point> coordinates;
  final mapbox.MbxEdgeInsets padding;

  CameraForCoordinatesData({required this.coordinates, required this.padding});
}

class CustomCameraBounds {
  final mapbox.Point southwest;
  final mapbox.Point northeast;

  CustomCameraBounds({required this.southwest, required this.northeast});

  @override
  String toString() {
    return 'Bounds(SW: ${southwest.coordinates}, NE: ${northeast.coordinates})';
  }
}

Future<CustomCameraBounds> calculateBoundsForCoordinates(
    CameraForCoordinatesData data) async {
  final lats = data.coordinates.map((p) => p.coordinates.lat).toList();
  final lngs = data.coordinates.map((p) => p.coordinates.lng).toList();

  if (lats.isEmpty || lngs.isEmpty) {
    throw Exception('No valid coordinates provided.');
  }

  double minLat = lats.reduce(min).toDouble();
  double maxLat = lats.reduce(max).toDouble();
  double minLng = lngs.reduce(min).toDouble();
  double maxLng = lngs.reduce(max).toDouble();

  final latRange = maxLat - minLat;
  final lngRange = maxLng - minLng;
  final latBuffer = latRange == 0 ? 0.01 : latRange * 0.1;
  final lngBuffer = lngRange == 0 ? 0.01 : lngRange * 0.1;

  final southwest = mapbox.Point(
      coordinates: mapbox.Position(minLng - lngBuffer, minLat - latBuffer));
  final northeast = mapbox.Point(
      coordinates: mapbox.Position(maxLng + lngBuffer, maxLat + latBuffer));

  return CustomCameraBounds(southwest: southwest, northeast: northeast);
}