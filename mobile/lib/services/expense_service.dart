// lib/services/expense_service.dart

import 'package:flutter/foundation.dart';
import 'package:mobile/models/expense_models.dart';
import 'package:mobile/services/api_client.dart';

class ExpenseService {
  final ApiClient _apiClient = ApiClient();

  /// Fetches all expenses and the summary for a specific trip.
  /// Supports filtering by category, date range, amount range, and sorting.
  Future<TripExpenseBundle> getExpensesForTrip(
    String tripId, {
    String? category,
    String? sortBy,
    String? order,
    double? minAmount,
    double? maxAmount,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
    int? offset,
  }) async {
    try {
      final queryParams = <String, String>{};

      if (category != null) queryParams['category'] = category;
      if (sortBy != null) queryParams['sortBy'] = sortBy;
      if (order != null) queryParams['order'] = order;
      if (minAmount != null) queryParams['minAmount'] = minAmount.toString();
      if (maxAmount != null) queryParams['maxAmount'] = maxAmount.toString();
      if (startDate != null)
        queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();
      if (limit != null) queryParams['limit'] = limit.toString();
      if (offset != null) queryParams['offset'] = offset.toString();

      String endpoint = 'trips/$tripId/expenses';
      if (queryParams.isNotEmpty) {
        final query = queryParams.entries
            .map((e) =>
                '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
            .join('&');
        endpoint = '$endpoint?$query';
      }

      final response = await _apiClient.get(endpoint);
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
    required String category,
    required String paidBy, // ADD: Who paid for the expense
    required List<ExpenseParticipant>
        participants, // CHANGED: Use proper participant structure
  }) async {
    try {
      final body = {
        'description': description,
        'amount': amount,
        'category': category,
        'paidBy': paidBy, // ADD: Include paidBy
        'participants': participants
            .map(
              (p) => {
                'userId': p.userId,
                'share': p.share,
              },
            )
            .toList(), // FIX: Send proper participant structure
      };

      debugPrint('🔄 Adding expense with body: $body');

      final response =
          await _apiClient.post('trips/$tripId/expenses', body: body);

      final expenseData = response['data']['expense'];
      if (expenseData == null) {
        throw ApiException('Server returned null expense data');
      }

      if (expenseData is! Map<String, dynamic>) {
        throw ApiException(
            'Server returned invalid expense data format: ${expenseData.runtimeType}');
      }

      return Expense.fromJson(expenseData);
    } on ApiException {
      rethrow;
    } catch (e) {
      debugPrint('❌ Error adding expense: $e');
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
        if (category != null) 'category': category.serverValue,
      };
      final response = await _apiClient
          .patch('trips/$tripId/expenses/$expenseId', body: body);
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

  /// Bulk delete multiple expenses.
  Future<Map<String, dynamic>> bulkDeleteExpenses({
    required String tripId,
    required List<String> expenseIds,
  }) async {
    try {
      final body = {'expenseIds': expenseIds};
      final response =
          await _apiClient.delete('trips/$tripId/expenses/bulk', body: body);
      return response['data'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to delete expenses. Please try again.');
    }
  }

  /// Get expense analytics for a trip.
  Future<Map<String, dynamic>> getExpenseAnalytics(
    String tripId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      String endpoint = 'trips/$tripId/expenses/analytics';
      final queryParams = <String, String>{};

      if (startDate != null)
        queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

      if (queryParams.isNotEmpty) {
        final query = queryParams.entries
            .map((e) =>
                '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
            .join('&');
        endpoint = '$endpoint?$query';
      }

      final response = await _apiClient.get(endpoint);
      return response['data'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to fetch analytics. Please try again.');
    }
  }

  /// Export expenses in the specified format.
  Future<Map<String, dynamic>> exportExpenses(
    String tripId, {
    String format = 'json',
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      String endpoint = 'trips/$tripId/expenses/export';
      final queryParams = <String, String>{'format': format};

      if (startDate != null)
        queryParams['startDate'] = startDate.toIso8601String();
      if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

      final query = queryParams.entries
          .map((e) =>
              '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
          .join('&');
      endpoint = '$endpoint?$query';

      final response = await _apiClient.get(endpoint);
      return response['data'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to export expenses. Please try again.');
    }
  }

  /// Get budget information for a trip.
  Future<Map<String, dynamic>> getBudget(String tripId) async {
    try {
      final response = await _apiClient.get('trips/$tripId/budget');
      return response['data'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(
          'Failed to fetch budget information. Please try again.');
    }
  }

  /// Update budget for a trip.
  Future<Map<String, dynamic>> updateBudget({
    required String tripId,
    double? total,
    double? travel,
    double? accommodation,
    double? activities,
    double? food,
  }) async {
    try {
      final body = <String, dynamic>{};

      if (total != null) body['total'] = total;
      if (travel != null) body['travel'] = travel;
      if (accommodation != null) body['accommodation'] = accommodation;
      if (activities != null) body['activities'] = activities;
      if (food != null) body['food'] = food;

      final response = await _apiClient.put('trips/$tripId/budget', body: body);
      return response['data'];
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to update budget. Please try again.');
    }
  }
}
