import 'package:flutter/foundation.dart';

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
  final DateTime updatedAt;     // **ADDED**: Aligns with Mongoose timestamps

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
        category: ExpenseCategoryExtension.fromString(json['category'] ?? 'Other'),
        paidBy: Payer.fromJson(json['paidBy']),
        participants: (json['participants'] as List)
            .map((p) => ExpenseParticipant.fromJson(p))
            .toList(),
        createdAt: DateTime.parse(json['createdAt']),
        // **ADDED**: Parses the updatedAt timestamp
        updatedAt: DateTime.parse(json['updatedAt']),
      );
    } catch (e) {
      debugPrint('Error parsing Expense from JSON: $e');
      rethrow;
    }
  }
}

// Represents a single settlement action. (No changes needed)
class Settlement {
  final String from;
  final String to;
  final double amount;

  Settlement({required this.from, required this.to, required this.amount});

  factory Settlement.fromJson(Map<String, dynamic> json) {
    return Settlement(
      from: json['from'],
      to: json['to'],
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
      expenses: (json['expenses'] as List)
          .map((e) => Expense.fromJson(e))
          .toList(),
      summary: ExpenseSummary.fromJson(json['summary']),
    );
  }
}