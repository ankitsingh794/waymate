import 'package:flutter/foundation.dart';
import 'package:mobile/models/user_model.dart';

/// Enum for expense categories, providing type safety and preventing typos.
/// This directly maps to the `enum` in your Mongoose schema.
enum ExpenseCategory {
  food,
  transport,
  accommodation,
  activities,
  shopping,
  other,
}

/// An extension to easily convert the category string from the API
/// into the [ExpenseCategory] enum and to get a display-friendly name.
extension ExpenseCategoryExtension on ExpenseCategory {
  static ExpenseCategory fromString(String categoryString) {
    return ExpenseCategory.values.firstWhere(
      (e) => e.name.toLowerCase() == categoryString.toLowerCase(),
      orElse: () => ExpenseCategory.other, // Defaults to 'other' if not found
    );
  }

  String get displayName {
    // Capitalize the first letter for display purposes
    return name[0].toUpperCase() + name.substring(1);
  }

  /// Returns the server-compatible category string
  String get serverValue {
    // Convert enum to server-expected format (title case)
    return name[0].toUpperCase() + name.substring(1);
  }
}

// Represents the user who paid for an expense. (No changes needed)
class Payer {
  final String id;
  final String name;

  Payer({required this.id, required this.name});

  factory Payer.fromJson(Map<String, dynamic> json) {
    return Payer(
      id: json['_id'],
      name: json['name'] ?? 'Unknown User',
    );
  }

  /// Creates a Payer from either a populated user object or just an ID string
  factory Payer.fromJsonOrString(dynamic data) {
    if (data is String) {
      // If paidBy is just an ID string (not populated)
      return Payer(id: data, name: 'Unknown User');
    } else if (data is Map<String, dynamic>) {
      // If paidBy is a populated user object
      return Payer.fromJson(data);
    } else {
      throw Exception('Invalid paidBy data format: ${data.runtimeType}');
    }
  }
}

// Represents a single participant's share in an expense. (No changes needed)
class ExpenseParticipant {
  final String userId;
  final double share;

  ExpenseParticipant({required this.userId, required this.share});

  factory ExpenseParticipant.fromJson(Map<String, dynamic> json) {
    return ExpenseParticipant(
      userId: json['userId'],
      share: (json['share'] as num).toDouble(),
    );
  }
}

// Represents a single expense record.
class Expense {
  final String id;
  final String tripId;
  final String description;
  final double amount;
  final ExpenseCategory category; // **CHANGED**: Now uses the enum
  final Payer paidBy;
  final List<ExpenseParticipant> participants;
  final DateTime createdAt;
  final DateTime updatedAt; // **ADDED**: Aligns with Mongoose timestamps

  Expense({
    required this.id,
    required this.tripId,
    required this.description,
    required this.amount,
    required this.category,
    required this.paidBy,
    required this.participants,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    try {
      return Expense(
        id: json['_id'],
        tripId: json['tripId'],
        description: json['description'],
        amount: (json['amount'] as num).toDouble(),
        // **CHANGED**: Parses the string into an ExpenseCategory enum
        category:
            ExpenseCategoryExtension.fromString(json['category'] ?? 'Other'),
        paidBy: Payer.fromJsonOrString(json['paidBy']),
        participants: (json['participants'] as List)
            .map((p) => ExpenseParticipant.fromJson(p))
            .toList(),
        createdAt: DateTime.parse(json['createdAt']),
        // **ADDED**: Parses the updatedAt timestamp
        updatedAt: DateTime.parse(json['updatedAt']),
      );
    } catch (e) {
      debugPrint('Error parsing Expense from JSON: $e');
      debugPrint('JSON data: $json');
      rethrow;
    }
  }
}

// Fix Settlement class to match backend response
class Settlement {
  final User from; // Changed from String to User
  final User to; // Changed from String to User
  final double amount;

  Settlement({required this.from, required this.to, required this.amount});

  factory Settlement.fromJson(Map<String, dynamic> json) {
    return Settlement(
      from: User.fromJson(json['from']), // Parse as User object
      to: User.fromJson(json['to']), // Parse as User object
      amount: (json['amount'] as num).toDouble(),
    );
  }
}

// Represents the summary of all expenses for a trip. (No changes needed)
class ExpenseSummary {
  final double totalSpent;
  final String currency;
  final List<Settlement> settlements;

  ExpenseSummary({
    required this.totalSpent,
    required this.currency,
    required this.settlements,
  });

  factory ExpenseSummary.fromJson(Map<String, dynamic> json) {
    return ExpenseSummary(
      totalSpent: (json['totalSpent'] as num).toDouble(),
      currency: json['currency'] ?? 'INR',
      settlements: (json['settlements'] as List)
          .map((s) => Settlement.fromJson(s))
          .toList(),
    );
  }
}

// A bundle containing all expense-related data for a trip. (No changes needed)
class TripExpenseBundle {
  final List<Expense> expenses;
  final ExpenseSummary summary;

  TripExpenseBundle({required this.expenses, required this.summary});

  factory TripExpenseBundle.fromJson(Map<String, dynamic> json) {
    return TripExpenseBundle(
      expenses:
          (json['expenses'] as List).map((e) => Expense.fromJson(e)).toList(),
      summary: ExpenseSummary.fromJson(json['summary']),
    );
  }
}
