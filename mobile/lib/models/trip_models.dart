import 'dart:core';
import 'user_model.dart';
// Each class corresponds to a JSON object in the API response.
// Using factory constructors for parsing makes the code clean and type-safe.


class SmartScheduleOption {
  final String? trainName;
  final String? trainNumber;
  final String? departureTime;
  final String? arrivalTime;
  final String? duration;
  final List<String> availableClasses;
  final String? recommendationReason;

  SmartScheduleOption({
    this.trainName,
    this.trainNumber,
    this.departureTime,
    this.arrivalTime,
    this.duration,
    required this.availableClasses,
    this.recommendationReason,
  });

  factory SmartScheduleOption.fromJson(Map<String, dynamic> json) {
    return SmartScheduleOption(
      trainName: json['trainName'],
      trainNumber: json['trainNumber'],
      departureTime: json['departureTime'],
      arrivalTime: json['arrivalTime'],
      duration: json['duration'],
      availableClasses: List<String>.from(json['availableClasses'] ?? []),
      recommendationReason: json['recommendationReason'],
    );
  }
}

class SmartSchedule {
  final String? sourceStation;
  final String? destinationStation;
  final String? travelDate;
  final List<SmartScheduleOption> options;
  final DateTime? lastUpdated;

  SmartSchedule({
    this.sourceStation,
    this.destinationStation,
    this.travelDate,
    required this.options,
    this.lastUpdated,
  });

  factory SmartSchedule.fromJson(Map<String, dynamic> json) {
    return SmartSchedule(
      sourceStation: json['sourceStation'],
      destinationStation: json['destinationStation'],
      travelDate: json['travelDate'],
      options: (json['options'] as List? ?? [])
          .map((o) => SmartScheduleOption.fromJson(o))
          .toList(),
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.parse(json['lastUpdated'])
          : null,
    );
  }
}

class ItineraryItem {
  final String id;
  final int sequence;
  final String type;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? description;
  final String? placeId;
  final String? activityPurpose;
  final String? mode;
  final double? distanceKm;
  final int? durationMinutes;

  ItineraryItem({
    required this.id,
    required this.sequence,
    required this.type,
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
      id: json['_id'],
      sequence: json['sequence'],
      type: json['type'],
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


class Coordinates {
  final double lat;
  final double lon;

  Coordinates({required this.lat, required this.lon});

  factory Coordinates.fromJson(Map<String, dynamic> json) {
    return Coordinates(
      lat: (json['lat'] as num).toDouble(),
      lon: (json['lon'] as num).toDouble(),
    );
  }
}


class Member {
  final User user;
  final String role;

  Member({required this.user, required this.role});

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      user: User.fromJson(json['userId']),
      role: json['role'],
    );
  }
}

class Group {
  final bool isGroup;
  final List<Member> members;

  Group({required this.isGroup, required this.members});

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      isGroup: json['isGroup'],
      members: List<Member>.from(json['members'].map((x) => Member.fromJson(x))),
    );
  }
}

class Preferences {
  final String currency;
  final String language;
  final String transportMode;

  Preferences({required this.currency, required this.language, required this.transportMode});

  factory Preferences.fromJson(Map<String, dynamic> json) {
    return Preferences(
      currency: json['currency'],
      language: json['language'],
      transportMode: json['transportMode'],
    );
  }
}

class WeatherForecast {
  final int day;
  final DateTime date;
  final String temp;
  final String condition;

  WeatherForecast({required this.day, required this.date, required this.temp, required this.condition});

  factory WeatherForecast.fromJson(Map<String, dynamic> json) {
    return WeatherForecast(
      day: json['day'],
      date: DateTime.parse(json['date']),
      temp: json['temp'],
      condition: json['condition'],
    );
  }
}

class RouteOption {
  final String mode;
  final int durationValue;
  final String durationText;
  final int cost;
  final String details;

  RouteOption({required this.mode, required this.durationValue, required this.durationText, required this.cost, required this.details});

  factory RouteOption.fromJson(Map<String, dynamic> json) {
    return RouteOption(
      mode: json['mode'],
      durationValue: json['durationValue'],
      durationText: json['durationText'],
      cost: json['cost'],
      details: json['details'],
    );
  }
}

class RouteInfo {
  final RouteOption fastest;
  final RouteOption cheapest;
  final Map<String, RouteOption> details;

  RouteInfo({required this.fastest, required this.cheapest, required this.details});

  factory RouteInfo.fromJson(Map<String, dynamic> json) {
    return RouteInfo(
      fastest: RouteOption.fromJson(json['fastest']),
      cheapest: RouteOption.fromJson(json['cheapest']),
      details: (json['details'] as Map<String, dynamic>).map(
        (key, value) => MapEntry(key, RouteOption.fromJson(value)),
      ),
    );
  }
}

class Recommendation {
  final String name;
  final double rating;
  final String? image;
  final String vicinity;

  Recommendation({required this.name, required this.rating, this.image, required this.vicinity});

  factory Recommendation.fromJson(Map<String, dynamic> json) {
    return Recommendation(
      name: json['name'],
      rating: (json['rating'] as num).toDouble(),
      image: json['image'],
      vicinity: json['vicinity'],
    );
  }
}

class Budget {
  final int total;
  final int travel;
  final int accommodation;
  final int activities;
  final int food;

  Budget({required this.total, required this.travel, required this.accommodation, required this.activities, required this.food});

  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      total: json['total'],
      travel: json['travel'],
      accommodation: json['accommodation'],
      activities: json['activities'],
      food: json['food'],
    );
  }
}

class ItineraryDay {
  final int day;
  final String title;
  final List<String> activities;

  ItineraryDay({required this.day, required this.title, required this.activities});

  factory ItineraryDay.fromJson(Map<String, dynamic> json) {
    return ItineraryDay(
      day: json['day'],
      title: json['title'],
      activities: List<String>.from(json['activities'].map((x) => x)),
    );
  }
}

class AiSummary {
  final String overview;
  final List<String> highlights;
  final List<String> tips;
  final List<String> mustEats;
  final List<String> packingChecklist;

  AiSummary({required this.overview, required this.highlights, required this.tips, required this.mustEats, required this.packingChecklist});

  factory AiSummary.fromJson(Map<String, dynamic> json) {
    return AiSummary(
      overview: json['overview'],
      highlights: List<String>.from(json['highlights'].map((x) => x)),
      tips: List<String>.from(json['tips'].map((x) => x)),
      mustEats: List<String>.from(json['mustEats'].map((x) => x)),
      packingChecklist: List<String>.from(json['packingChecklist'].map((x) => x)),
    );
  }
}


// The main, comprehensive Trip class.
class Trip {
  final String id;
  final String destination;
  final DateTime startDate;
  final DateTime endDate;
  final int travelers;
  final String? coverImage;
  final Coordinates origin;
  final Coordinates destinationCoordinates;
  final Group group;
  final Preferences preferences;
  final List<WeatherForecast> weather;
  final RouteInfo? routeInfo;
  final List<Recommendation> attractions;
  final List<Recommendation> foodRecommendations;
  final List<Recommendation> accommodationSuggestions;
  final Budget budget;
  final List<String> alerts;
  final List<ItineraryDay> itinerary;
  final AiSummary aiSummary;
  final String purpose;
  final String status;
  final bool favorite;
  final DateTime createdAt;
  final DateTime updatedAt;

  Trip({
    required this.id,
    required this.destination,
    required this.startDate,
    required this.endDate,
    required this.travelers,
    this.coverImage,
    required this.origin,
    required this.destinationCoordinates,
    required this.group,
    required this.preferences,
    required this.weather,
    this.routeInfo,
    required this.attractions,
    required this.foodRecommendations,
    required this.accommodationSuggestions,
    required this.budget,
    required this.alerts,
    required this.itinerary,
    required this.aiSummary,
    required this.purpose,
    required this.status,
    required this.favorite,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['_id'],
      destination: json['destination'],
      startDate: DateTime.parse(json['startDate']),
      endDate: DateTime.parse(json['endDate']),
      travelers: json['travelers'],
      coverImage: json['coverImage'],
      origin: Coordinates.fromJson(json['origin']),
      destinationCoordinates: Coordinates.fromJson(json['destinationCoordinates']),
      group: Group.fromJson(json['group']),
      preferences: Preferences.fromJson(json['preferences']),
      weather: List<WeatherForecast>.from(json['weather']['forecast'].map((x) => WeatherForecast.fromJson(x))),
      routeInfo: json['routeInfo'] != null ? RouteInfo.fromJson(json['routeInfo']) : null,
      attractions: List<Recommendation>.from(json['attractions'].map((x) => Recommendation.fromJson(x))),
      foodRecommendations: List<Recommendation>.from(json['foodRecommendations'].map((x) => Recommendation.fromJson(x))),
      accommodationSuggestions: List<Recommendation>.from(json['accommodationSuggestions'].map((x) => Recommendation.fromJson(x))),
      budget: Budget.fromJson(json['budget']),
      alerts: List<String>.from(json['alerts'].map((x) => x)),
      itinerary: List<ItineraryDay>.from(json['itinerary'].map((x) => ItineraryDay.fromJson(x))),
      aiSummary: AiSummary.fromJson(json['aiSummary']),
      purpose: json['purpose'],
      status: json['status'],
      favorite: json['favorite'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
}
