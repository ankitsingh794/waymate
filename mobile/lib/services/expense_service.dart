import 'package:mobile/services/api_client.dart';
import 'package:mobile/models/expense_models.dart'; // Import the new models

class ExpenseService {
  final ApiClient _apiClient = ApiClient();

  /// Fetches all expenses and the settlement summary for a trip.
  /// Returns a bundle containing both lists of expenses and the summary.
  Future<TripExpenseBundle> getTripExpenses(String tripId) async {
    try {
      final responseData = await _apiClient.get('trips/$tripId/expenses');
      return TripExpenseBundle.fromJson(responseData['data']);
    } on ApiException {
      rethrow; // Re-throw the API exception to be handled by the UI layer
    } catch (e) {
      // Catch any other unexpected errors during parsing or processing
      throw ApiException('Failed to fetch trip expenses. Please try again.');
    }
  }

  /// Adds a new expense to a specific trip.
  /// The expenseData should be a map conforming to the backend's expected structure.
  /// Returns the newly created Expense object.
  Future<Expense> addExpense(String tripId, Map<String, dynamic> expenseData) async {
    try {
      final responseData = await _apiClient.post(
        'trips/$tripId/expenses',
        body: expenseData,
      );
      return Expense.fromJson(responseData['data']['expense']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to add expense. Please try again.');
    }
  }

  /// Updates an existing expense.
  /// The updateData can contain any of the mutable fields: description, amount, etc.
  /// Returns the updated Expense object.
  Future<Expense> updateExpense(String tripId, String expenseId, Map<String, dynamic> updateData) async {
    try {
      final responseData = await _apiClient.patch(
        'trips/$tripId/expenses/$expenseId',
        body: updateData,
      );
      return Expense.fromJson(responseData['data']['expense']);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to update expense. Please try again.');
    }
  }

  /// Deletes an expense from a trip.
  /// Returns a Future<void> as the API sends no data back on success.
  Future<void> deleteExpense(String tripId, String expenseId) async {
    try {
      await _apiClient.delete('trips/$tripId/expenses/$expenseId');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Failed to delete expense. Please try again.');
    }
  }
}