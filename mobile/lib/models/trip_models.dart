import 'dart:core';
import 'user_model.dart';
import 'package:isar/isar.dart';
// Each class corresponds to a JSON object in the API response.
// Using factory constructors for parsing makes the code clean and type-safe.

part 'trip_models.g.dart';

int fastHash(String string) {
  var hash = 0xcbf29ce484222325;
  for (var i = 0; i < string.length; i++) {
    hash ^= string.codeUnitAt(i);
    hash *= 0x100000001b3;
  }
  return hash;
}

@embedded
class SmartScheduleOption {
  String? trainName;
  String? trainNumber;
  String? departureTime;
  String? arrivalTime;
  String? duration;
  List<String> availableClasses;
  String? recommendationReason;

  SmartScheduleOption({
    this.trainName = '',
    this.trainNumber = '',
    this.departureTime = '',
    this.arrivalTime = '',
    this.duration = '',
    this.availableClasses = const [],
    this.recommendationReason = '',
  });

  factory SmartScheduleOption.fromJson(Map<String, dynamic> json) {
    return SmartScheduleOption(
      trainName: json['trainName'] ?? '', // FIX: Added null safety
      trainNumber: json['trainNumber'] ?? '', // FIX: Added null safety
      departureTime: json['departureTime'] ?? '', // FIX: Added null safety
      arrivalTime: json['arrivalTime'] ?? '', // FIX: Added null safety
      duration: json['duration'] ?? '', // FIX: Added null safety
      availableClasses: json['availableClasses'] != null
          ? List<String>.from(json['availableClasses'].map((x) => x ?? ''))
          : [], // FIX: Added null safety
      recommendationReason:
          json['recommendationReason'] ?? '', // FIX: Added null safety
    );
  }
}

@embedded
class SmartSchedule {
  String? sourceStation;
  String? destinationStation;
  String? travelDate;
  List<SmartScheduleOption> options;
  DateTime? lastUpdated;

  SmartSchedule({
    this.sourceStation,
    this.destinationStation,
    this.travelDate,
    this.options = const [],
    this.lastUpdated,
  });

  factory SmartSchedule.fromJson(Map<String, dynamic> json) {
    return SmartSchedule(
      sourceStation: json['sourceStation'] ?? '', // FIX: Added null safety
      destinationStation:
          json['destinationStation'] ?? '', // FIX: Added null safety
      travelDate: json['travelDate'] ?? '', // FIX: Added null safety
      options: (json['options'] as List? ?? [])
          .map((o) => SmartScheduleOption.fromJson(o ?? {}))
          .toList(), // FIX: Added null safety
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.parse(json['lastUpdated'])
          : null,
    );
  }
}

@embedded
class ItineraryItem {
  String id;
  int sequence;
  String type;
  DateTime? startTime;
  DateTime? endTime;
  String? description;
  String? placeId;
  String? activityPurpose;
  String? mode;
  double? distanceKm;
  int? durationMinutes;

  ItineraryItem({
    this.id = '',
    this.sequence = 0,
    this.type = '',
    this.startTime,
    this.endTime,
    this.description,
    this.placeId,
    this.activityPurpose,
    this.mode,
    this.distanceKm,
    this.durationMinutes,
  });

  factory ItineraryItem.fromJson(Map<String, dynamic> json) {
    return ItineraryItem(
      id: json['_id'] ?? '', // FIX: Added null safety
      sequence: json['sequence'] ?? 0, // FIX: Added null safety
      type: json['type'] ?? '', // FIX: Added null safety
      startTime:
          json['startTime'] != null ? DateTime.parse(json['startTime']) : null,
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      description: json['description'],
      placeId: json['placeId'],
      activityPurpose: json['activityPurpose'],
      mode: json['mode'],
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      durationMinutes: json['durationMinutes'],
    );
  }
}

@embedded
class Coordinates {
  final double lat;
  final double lon;

  Coordinates({this.lat = 0.0, this.lon = 0.0});

  factory Coordinates.fromJson(Map<String, dynamic> json) {
    return Coordinates(
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lon: (json['lon'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

@embedded
class Member {
  final User user;
  final String role;
  final String? ageGroup;
  final String? gender;
  final String? relation;

  Member({
    User? user,
    this.role = '',
    this.ageGroup,
    this.gender,
    this.relation,
  }) : user = user ?? User(); // Use the default constructor

  factory Member.fromJson(Map<String, dynamic> json) {
    User user;

    if (json['userId'] is Map<String, dynamic>) {
      user = User.fromJson(json['userId']);
    } else if (json['userId'] is String) {
      user = User(id: json['userId']); // Use the constructor with id parameter
    } else {
      user = User(); // Use default constructor
    }

    return Member(
      user: user,
      role: json['role'] ?? '',
      ageGroup: json['ageGroup'],
      gender: json['gender'],
      relation: json['relation'],
    );
  }
}

@embedded
class Group {
  final bool isGroup;
  final List<Member> members;

  Group({this.isGroup = false, this.members = const []});

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      isGroup: json['isGroup'] ?? false, // FIX: Added null safety
      members: json['members'] != null
          ? List<Member>.from(json['members'].map((x) => Member.fromJson(x)))
          : [], // FIX: Added null safety
    );
  }
}

@embedded
class Preferences {
  final String currency;
  final String language;
  final String transportMode;

  Preferences(
      {this.currency = 'INR',
      this.language = 'en',
      this.transportMode = 'car'});

  factory Preferences.fromJson(Map<String, dynamic> json) {
    return Preferences(
      currency: json['currency'] ?? 'INR', // FIX: Added null safety
      language: json['language'] ?? 'en', // FIX: Added null safety
      transportMode: json['transportMode'] ?? 'car', // FIX: Added null safety
    );
  }
}

@embedded
class WeatherForecast {
  final int day;
  final DateTime? date;
  final String temp;
  final String condition;

  WeatherForecast(
      {this.day = 0, this.date, this.temp = '', this.condition = ''});

  factory WeatherForecast.fromJson(Map<String, dynamic> json) {
    return WeatherForecast(
      day: json['day'] ?? 0, // FIX: Added null safety
      date: json['date'] != null ? DateTime.parse(json['date']) : null,
      temp: json['temp'] ?? '', // FIX: Added null safety
      condition: json['condition'] ?? '', // FIX: Added null safety
    );
  }
}

@embedded
class RouteOption {
  final String mode;
  final int durationValue;
  final String durationText;
  final int cost;
  final String details;

  RouteOption(
      {this.mode = '',
      this.durationValue = 0,
      this.durationText = '',
      this.cost = 0,
      this.details = ''});

  factory RouteOption.fromJson(Map<String, dynamic> json) {
    return RouteOption(
      mode: json['mode'] ?? '', // FIX: Added null safety
      durationValue: json['durationValue'] ?? 0, // FIX: Added null safety
      durationText: json['durationText'] ?? '', // FIX: Added null safety
      cost: json['cost'] ?? 0, // FIX: Added null safety
      details: json['details'] ?? '', // FIX: Added null safety
    );
  }
}

@embedded
class RouteDetailEntry {
  late String key;
  late RouteOption? value;

  // Empty constructor for Isar
  RouteDetailEntry();
}

@embedded
class RouteInfo {
  late RouteOption? fastest;
  late RouteOption? cheapest;
  late List<RouteDetailEntry> details;

  // Empty constructor for Isar
  RouteInfo();

  factory RouteInfo.fromJson(Map<String, dynamic> json) {
    final routeInfo = RouteInfo();
    routeInfo.fastest = RouteOption.fromJson(json['fastest']);
    routeInfo.cheapest = RouteOption.fromJson(json['cheapest']);
    routeInfo.details =
        (json['details'] as Map<String, dynamic>).entries.map((entry) {
      final detailEntry = RouteDetailEntry();
      detailEntry.key = entry.key;
      detailEntry.value = RouteOption.fromJson(entry.value);
      return detailEntry;
    }).toList();
    return routeInfo;
  }
}

@embedded
class Recommendation {
  final String name;
  final double rating;
  final String? image;
  final String vicinity;
  final Coordinates? coords;

  Recommendation({
    this.name = '',
    this.rating = 0.0,
    this.image,
    this.vicinity = '',
    this.coords,
  });

  factory Recommendation.fromJson(Map<String, dynamic> json) {
    return Recommendation(
      name: json['name'] ?? '',
      rating: json['rating'] != null ? (json['rating'] as num).toDouble() : 0.0,
      image: json['image'],
      vicinity: json['vicinity'] ?? '',
      coords:
          json['coords'] != null ? Coordinates.fromJson(json['coords']) : null,
    );
  }
}

@embedded
class Budget {
  final int total;
  final int travel;
  final int accommodation;
  final int activities;
  final int food;

  Budget(
      {this.total = 0,
      this.travel = 0,
      this.accommodation = 0,
      this.activities = 0,
      this.food = 0});

  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      total: json['total'] ?? 0, // FIX: Added null safety
      travel: json['travel'] ?? 0, // FIX: Added null safety
      accommodation: json['accommodation'] ?? 0, // FIX: Added null safety
      activities: json['activities'] ?? 0, // FIX: Added null safety
      food: json['food'] ?? 0, // FIX: Added null safety
    );
  }
}

@embedded
class ItineraryDay {
  final int day;
  final String title;
  final List<String> activities;
  // NEW: Add fields from the API response
  final int sequence;
  final String type;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? description;
  final String? id;

  ItineraryDay({
    this.day = 0,
    this.title = '',
    this.activities = const [],
    this.sequence = 0,
    this.type = 'activity',
    this.startTime,
    this.endTime,
    this.description,
    this.id,
  });

  factory ItineraryDay.fromJson(Map<String, dynamic> json) {
    return ItineraryDay(
      day: json['day'] ?? 0, // FIX: Added null safety
      title: json['title'] ?? '', // FIX: Added null safety
      activities: json['activities'] != null
          ? List<String>.from(json['activities']
              .map((x) => x ?? '')) // FIX: Added null safety for list items too
          : [], // FIX: Added null safety for the whole list
      // NEW: Parse additional fields from API
      sequence: json['sequence'] ?? 0,
      type: json['type'] ?? 'activity',
      startTime:
          json['startTime'] != null ? DateTime.parse(json['startTime']) : null,
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      description: json['description'],
      id: json['_id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'day': day,
      'title': title,
      'activities': activities,
      'sequence': sequence,
      'type': type,
      'startTime': startTime?.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'description': description,
      '_id': id,
    };
  }
}

@embedded
class AiSummary {
  final String overview;
  final List<String> highlights;
  final List<String> tips;
  final List<String> mustEats;
  final List<String> packingChecklist;

  AiSummary(
      {this.overview = '',
      this.highlights = const [],
      this.tips = const [],
      this.mustEats = const [],
      this.packingChecklist = const []});

  factory AiSummary.fromJson(Map<String, dynamic> json) {
    return AiSummary(
      overview: json['overview'] ?? '', // FIX: Added null safety
      highlights: json['highlights'] != null
          ? List<String>.from(json['highlights'].map((x) => x))
          : [], // FIX: Added null safety
      tips: json['tips'] != null
          ? List<String>.from(json['tips'].map((x) => x))
          : [], // FIX: Added null safety
      mustEats: json['mustEats'] != null
          ? List<String>.from(json['mustEats'].map((x) => x))
          : [], // FIX: Added null safety
      packingChecklist: json['packingChecklist'] != null
          ? List<String>.from(json['packingChecklist'].map((x) => x))
          : [], // FIX: Added null safety
    );
  }
}

@Collection()
class Trip {
  Id get isarId => fastHash(id);

  @Index(unique: true, replace: true)
  final String id;

  @Index()
  bool needsSync;

  final String destination;
  final DateTime startDate;
  final DateTime endDate;
  final int travelers;
  final String? coverImage;
  final Coordinates? origin; // Made nullable for flexibility
  final Coordinates? destinationCoordinates; // Made nullable
  final Group? group; // Made nullable
  final Preferences? preferences; // Made nullable
  final List<WeatherForecast> weather;
  final RouteInfo? routeInfo;
  final List<Recommendation> attractions;
  final List<Recommendation> foodRecommendations;
  final List<Recommendation> accommodationSuggestions;
  final Budget? budget; // Made nullable
  final List<String> alerts;
  final List<ItineraryDay> itinerary;
  final AiSummary? aiSummary; // Made nullable
  final SmartSchedule? smartSchedule;
  final String? purpose; // Made nullable
  final String? status; // Made nullable
  final bool favorite;
  final DateTime createdAt;
  final DateTime updatedAt;

  Trip.empty()
      : id = '',
        needsSync = false,
        destination = '',
        startDate = DateTime.now(),
        endDate = DateTime.now(),
        travelers = 1,
        coverImage = null,
        origin = null,
        destinationCoordinates = null,
        group = null,
        preferences = null,
        weather = [],
        routeInfo = null,
        attractions = [],
        foodRecommendations = [],
        accommodationSuggestions = [],
        budget = null,
        alerts = [],
        itinerary = [],
        aiSummary = null,
        smartSchedule = null,
        purpose = null,
        status = null,
        favorite = false,
        createdAt = DateTime.now(),
        updatedAt = DateTime.now();

  Trip({
    required this.id,
    this.needsSync = false, // --- UPDATED: Added to constructor ---
    required this.destination,
    required this.startDate,
    required this.endDate,
    required this.travelers,
    this.coverImage,
    this.origin,
    this.destinationCoordinates,
    this.group,
    this.preferences,
    required this.weather,
    this.routeInfo,
    required this.attractions,
    required this.foodRecommendations,
    required this.accommodationSuggestions,
    this.budget,
    required this.alerts,
    required this.itinerary,
    this.aiSummary,
    this.smartSchedule,
    this.purpose,
    this.status,
    required this.favorite,
    required this.createdAt,
    required this.updatedAt,
  });

  Trip copyWith(
      {String? id,
      bool? needsSync,
      bool? favorite,
      String? status,
      String? destination,
      DateTime? startDate,
      DateTime? endDate,
      int? travelers,
      String? coverImage,
      Coordinates? origin,
      Coordinates? destinationCoordinates,
      Group? group,
      Preferences? preferences,
      List<WeatherForecast>? weather,
      RouteInfo? routeInfo,
      List<Recommendation>? attractions,
      List<Recommendation>? foodRecommendations,
      List<Recommendation>? accommodationSuggestions,
      Budget? budget,
      List<String>? alerts,
      List<ItineraryDay>? itinerary,
      AiSummary? aiSummary,
      SmartSchedule? smartSchedule,
      String? purpose,
      DateTime? createdAt,
      DateTime? updatedAt}) {
    return Trip(
      id: id ?? this.id,
      needsSync: needsSync ?? this.needsSync,
      destination: destination ?? this.destination,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      travelers: travelers ?? this.travelers,
      coverImage: coverImage ?? this.coverImage,
      origin: origin ?? this.origin,
      destinationCoordinates:
          destinationCoordinates ?? this.destinationCoordinates,
      group: group ?? this.group,
      preferences: preferences ?? this.preferences,
      weather: weather ?? this.weather,
      routeInfo: routeInfo ?? this.routeInfo,
      attractions: attractions ?? this.attractions,
      foodRecommendations: foodRecommendations ?? this.foodRecommendations,
      accommodationSuggestions:
          accommodationSuggestions ?? this.accommodationSuggestions,
      budget: budget ?? this.budget,
      alerts: alerts ?? this.alerts,
      itinerary: itinerary ?? this.itinerary,
      aiSummary: aiSummary ?? this.aiSummary,
      smartSchedule: smartSchedule ?? this.smartSchedule,
      purpose: purpose ?? this.purpose,
      status: status ?? this.status,
      favorite: favorite ?? this.favorite,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['_id'] ?? '',
      destination: json['destination'] ?? '',
      startDate: json['startDate'] != null
          ? DateTime.parse(json['startDate'])
          : DateTime.now(),
      endDate: json['endDate'] != null
          ? DateTime.parse(json['endDate'])
          : DateTime.now(),
      travelers: json['travelers'] ?? 1,
      coverImage: json['coverImage'],

      // FIX: Null-safe coordinate parsing
      origin:
          json['origin'] != null ? Coordinates.fromJson(json['origin']) : null,
      destinationCoordinates: json['destinationCoordinates'] != null
          ? Coordinates.fromJson(json['destinationCoordinates'])
          : null,

      // FIX: Null-safe group parsing
      group: json['group'] != null ? Group.fromJson(json['group']) : null,

      // FIX: Null-safe preferences parsing
      preferences: json['preferences'] != null
          ? Preferences.fromJson(json['preferences'])
          : null,

      // FIX: Null-safe weather parsing with nested forecast check
      weather: json['weather'] != null && json['weather']['forecast'] != null
          ? List<WeatherForecast>.from(json['weather']['forecast']
              .map((x) => WeatherForecast.fromJson(x)))
          : [],

      routeInfo: json['routeInfo'] != null
          ? RouteInfo.fromJson(json['routeInfo'])
          : null,

      // FIX: Null-safe list parsing
      attractions: json['attractions'] != null
          ? List<Recommendation>.from(
              json['attractions'].map((x) => Recommendation.fromJson(x)))
          : [],

      foodRecommendations: json['foodRecommendations'] != null
          ? List<Recommendation>.from(json['foodRecommendations']
              .map((x) => Recommendation.fromJson(x)))
          : [],

      accommodationSuggestions: json['accommodationSuggestions'] != null
          ? List<Recommendation>.from(json['accommodationSuggestions']
              .map((x) => Recommendation.fromJson(x)))
          : [],

      // FIX: Null-safe budget parsing (this was the main issue)
      budget: json['budget'] != null ? Budget.fromJson(json['budget']) : null,

      alerts: json['alerts'] != null
          ? List<String>.from(json['alerts'].map((x) => x))
          : [],

      itinerary: json['itinerary'] != null
          ? List<ItineraryDay>.from(
              json['itinerary'].map((x) => ItineraryDay.fromJson(x)))
          : [],

      // FIX: Null-safe aiSummary parsing
      aiSummary: json['aiSummary'] != null
          ? AiSummary.fromJson(json['aiSummary'])
          : null,

      smartSchedule: json['smartSchedule'] != null
          ? SmartSchedule.fromJson(json['smartSchedule'])
          : null,

      purpose: json['purpose'],
      status: json['status'],
      favorite: json['favorite'] ?? false,

      // FIX: Null-safe date parsing
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'needsSync': needsSync,
      'destination': destination,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'travelers': travelers,
      'coverImage': coverImage,
      'origin':
          origin != null ? {'lat': origin!.lat, 'lon': origin!.lon} : null,
      'destinationCoordinates': destinationCoordinates != null
          ? {
              'lat': destinationCoordinates!.lat,
              'lon': destinationCoordinates!.lon
            }
          : null,
      'group': group != null
          ? {
              'isGroup': group!.isGroup,
              'members': group!.members
                  .map((m) => {
                        'userId': m.user.toJson(),
                        'role': m.role,
                        'ageGroup': m.ageGroup
                      })
                  .toList(),
            }
          : null,
      'preferences': preferences != null
          ? {
              'currency': preferences!.currency,
              'language': preferences!.language,
              'transportMode': preferences!.transportMode,
            }
          : null,
      'weather': {
        'forecast': weather
            .map((w) => {
                  'day': w.day,
                  'date': w.date?.toIso8601String(),
                  'temp': w.temp,
                  'condition': w.condition,
                })
            .toList(),
      },
      'routeInfo': routeInfo != null
          ? {
              'fastest': routeInfo!.fastest != null
                  ? {
                      'mode': routeInfo!.fastest!.mode,
                      'durationValue': routeInfo!.fastest!.durationValue,
                      'durationText': routeInfo!.fastest!.durationText,
                      'cost': routeInfo!.fastest!.cost,
                      'details': routeInfo!.fastest!.details,
                    }
                  : null,
              'cheapest': routeInfo!.cheapest != null
                  ? {
                      'mode': routeInfo!.cheapest!.mode,
                      'durationValue': routeInfo!.cheapest!.durationValue,
                      'durationText': routeInfo!.cheapest!.durationText,
                      'cost': routeInfo!.cheapest!.cost,
                      'details': routeInfo!.cheapest!.details,
                    }
                  : null,
              'details': {
                for (var detail in routeInfo!.details)
                  detail.key: detail.value != null
                      ? {
                          'mode': detail.value!.mode,
                          'durationValue': detail.value!.durationValue,
                          'durationText': detail.value!.durationText,
                          'cost': detail.value!.cost,
                          'details': detail.value!.details,
                        }
                      : null,
              },
            }
          : null,
      'attractions': attractions
          .map((a) => {
                'name': a.name,
                'rating': a.rating,
                'image': a.image,
                'vicinity': a.vicinity,
              })
          .toList(),
      'foodRecommendations': foodRecommendations
          .map((f) => {
                'name': f.name,
                'rating': f.rating,
                'image': f.image,
                'vicinity': f.vicinity,
              })
          .toList(),
      'accommodationSuggestions': accommodationSuggestions
          .map((ac) => {
                'name': ac.name,
                'rating': ac.rating,
                'image': ac.image,
                'vicinity': ac.vicinity,
              })
          .toList(),
      'budget': budget != null
          ? {
              'total': budget!.total,
              'travel': budget!.travel,
              'accommodation': budget!.accommodation,
              'activities': budget!.activities,
              'food': budget!.food,
            }
          : null,
      'alerts': alerts,
      'itinerary': itinerary
          .map((i) => {
                'day': i.day,
                'title': i.title,
                'activities': i.activities,
              })
          .toList(),
      'aiSummary': aiSummary != null
          ? {
              'overview': aiSummary!.overview,
              'highlights': aiSummary!.highlights,
              'tips': aiSummary!.tips,
              'mustEats': aiSummary!.mustEats,
              'packingChecklist': aiSummary!.packingChecklist,
            }
          : null,
      'smartSchedule': smartSchedule != null
          ? {
              'sourceStation': smartSchedule!.sourceStation,
              'destinationStation': smartSchedule!.destinationStation,
              'travelDate': smartSchedule!.travelDate,
              'options': smartSchedule!.options
                  .map((o) => {
                        'trainName': o.trainName,
                        'trainNumber': o.trainNumber,
                        'departureTime': o.departureTime,
                        'arrivalTime': o.arrivalTime,
                        'duration': o.duration,
                        'availableClasses': o.availableClasses,
                        'recommendationReason': o.recommendationReason,
                      })
                  .toList(),
              'lastUpdated': smartSchedule!.lastUpdated?.toIso8601String(),
            }
          : null,
      'purpose': purpose,
      'status': status,
      'favorite': favorite,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
