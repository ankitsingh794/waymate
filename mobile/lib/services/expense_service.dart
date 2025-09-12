// lib/services/expense_service.dart

import 'package:mobile/models/expense_models.dart';
import 'package:mobile/services/api_client.dart';

class ExpenseService {
  final ApiClient _apiClient = ApiClient();

  /// Fetches all expenses and the summary for a specific trip.
  Future<TripExpenseBundle> getExpensesForTrip(String tripId) async {
    try {
      final response = await _apiClient.get('trips/$tripId/expenses');
      return TripExpenseBundle.fromJson(response['data']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to parse expense data. Please try again.');
    }
  }

  /// Adds a new expense to a trip.
  Future<Expense> addExpense({
    required String tripId,
    required String description,
    required double amount,
    required String category, // Expecting the string name of the enum
    required List<String> participantIds,
  }) async {
    try {
      final body = {
        'description': description,
        'amount': amount,
        'category': category,
        'participants': participantIds,
      };
      final response =
          await _apiClient.post('trips/$tripId/expenses', body: body);
      return Expense.fromJson(response['data']['expense']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to add expense. Please try again.');
    }
  }

  /// Updates an existing expense.
  Future<Expense> updateExpense({
    required String tripId,
    required String expenseId,
    String? description,
    double? amount,
    ExpenseCategory? category,
  }) async {
    try {
      final body = {
        if (description != null) 'description': description,
        if (amount != null) 'amount': amount,
        if (category != null) 'category': category.name,
      };
      final response = await _apiClient.patch(
          'trips/$tripId/expenses/$expenseId',
          body: body);
      return Expense.fromJson(response['data']['expense']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to update expense. Please try again.');
    }
  }

  /// Deletes an expense from a trip.
  Future<void> deleteExpense(String tripId, String expenseId) async {
    try {
      await _apiClient.delete('trips/$tripId/expenses/$expenseId');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to delete expense. Please try again.');
    }
  }

  // --- FIXED: This method is now correctly placed inside the class ---
  /// Fetches the expense summary for a specific trip.
  Future<ExpenseSummary> getExpenseSummary(String tripId) async {
    try {
      final response = await _apiClient.get('trips/$tripId/expenses/summary');
      return ExpenseSummary.fromJson(response['data']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to fetch expense summary. Please try again.');
    }
  }
}