// lib/screens/expenses/expense_analytics_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/expense_models.dart';

class ExpenseAnalyticsScreen extends StatelessWidget {
  final TripExpenseBundle expenseBundle;
  final String tripId;

  const ExpenseAnalyticsScreen({
    super.key,
    required this.expenseBundle,
    required this.tripId,
  });

  @override
  Widget build(BuildContext context) {
    final expenses = expenseBundle.expenses;
    final summary = expenseBundle.summary;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildOverviewCards(expenses, summary),
          const SizedBox(height: 24),
          _buildCategoryAnalysis(expenses),
          const SizedBox(height: 24),
          _buildSpendingTimeline(expenses),
          const SizedBox(height: 24),
          _buildTopSpenders(expenses),
          const SizedBox(height: 24),
          _buildSpendingPatterns(expenses),
        ],
      ),
    );
  }

  Widget _buildOverviewCards(List<Expense> expenses, ExpenseSummary summary) {
    final totalExpenses = expenses.length;
    final avgExpensePerDay = _calculateAvgExpensePerDay(expenses);
    final highestSingleExpense = expenses.isNotEmpty
        ? expenses.map((e) => e.amount).reduce((a, b) => a > b ? a : b)
        : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Expense Overview',
          style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          childAspectRatio: 1.5,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: [
            _buildMetricCard(
              'Total Spent',
              '${summary.currency} ${summary.totalSpent.toStringAsFixed(2)}',
              Icons.account_balance_wallet,
              Colors.blue,
            ),
            _buildMetricCard(
              'Total Expenses',
              totalExpenses.toString(),
              Icons.receipt_long,
              Colors.green,
            ),
            _buildMetricCard(
              'Average/Day',
              '${summary.currency} ${avgExpensePerDay.toStringAsFixed(2)}',
              Icons.trending_up,
              Colors.orange,
            ),
            _buildMetricCard(
              'Highest Expense',
              '${summary.currency} ${highestSingleExpense.toStringAsFixed(2)}',
              Icons.show_chart,
              Colors.red,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricCard(
      String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryAnalysis(List<Expense> expenses) {
    final categoryData = _calculateCategoryData(expenses);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Spending by Category',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            ...categoryData.entries.map((entry) => _buildCategoryBar(
                  entry.key,
                  entry.value,
                  categoryData.values.reduce((a, b) => a > b ? a : b),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryBar(
      ExpenseCategory category, double amount, double maxAmount) {
    final percentage = maxAmount > 0 ? (amount / maxAmount) : 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                category.displayName,
                style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
              ),
              Text(
                '₹${amount.toStringAsFixed(2)}',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: percentage,
            backgroundColor: Colors.grey.shade300,
            valueColor:
                AlwaysStoppedAnimation<Color>(_getCategoryColor(category)),
          ),
        ],
      ),
    );
  }

  Widget _buildSpendingTimeline(List<Expense> expenses) {
    final timelineData = _calculateDailySpending(expenses);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Daily Spending Trend',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: _buildSimpleChart(timelineData),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSimpleChart(Map<DateTime, double> data) {
    if (data.isEmpty) {
      return const Center(child: Text('No data available'));
    }

    final maxAmount = data.values.reduce((a, b) => a > b ? a : b);
    final entries = data.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return ListView.builder(
      scrollDirection: Axis.horizontal,
      itemCount: entries.length,
      itemBuilder: (context, index) {
        final entry = entries[index];
        final height = maxAmount > 0 ? (entry.value / maxAmount) * 160 : 0.0;

        return Container(
          width: 60,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Container(
                height: height,
                decoration: BoxDecoration(
                  color: Colors.blue.shade400,
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(4)),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                DateFormat.MMMd().format(entry.key),
                style: GoogleFonts.poppins(fontSize: 10),
                textAlign: TextAlign.center,
              ),
              Text(
                '₹${entry.value.toStringAsFixed(0)}',
                style: GoogleFonts.poppins(
                    fontSize: 10, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTopSpenders(List<Expense> expenses) {
    final spenderData = _calculateTopSpenders(expenses);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Top Spenders',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            ...spenderData.entries.take(5).map((entry) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        child: Text(
                          entry.key.substring(0, 1).toUpperCase(),
                          style:
                              GoogleFonts.poppins(fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          entry.key,
                          style:
                              GoogleFonts.poppins(fontWeight: FontWeight.w500),
                        ),
                      ),
                      Text(
                        '₹${entry.value.toStringAsFixed(2)}',
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildSpendingPatterns(List<Expense> expenses) {
    final patterns = _analyzeSpendingPatterns(expenses);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Spending Insights',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            ...patterns.map((pattern) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(Icons.lightbulb_outline,
                          size: 16, color: Colors.amber.shade700),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          pattern,
                          style: GoogleFonts.poppins(fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  // Helper methods for calculations
  double _calculateAvgExpensePerDay(List<Expense> expenses) {
    if (expenses.isEmpty) return 0.0;

    final dates = expenses
        .map((e) =>
            DateTime(e.createdAt.year, e.createdAt.month, e.createdAt.day))
        .toSet();
    final totalAmount = expenses.map((e) => e.amount).reduce((a, b) => a + b);

    return dates.isNotEmpty ? totalAmount / dates.length : 0.0;
  }

  Map<ExpenseCategory, double> _calculateCategoryData(List<Expense> expenses) {
    final categoryTotals = <ExpenseCategory, double>{};

    for (final expense in expenses) {
      categoryTotals[expense.category] =
          (categoryTotals[expense.category] ?? 0) + expense.amount;
    }

    return categoryTotals;
  }

  Map<DateTime, double> _calculateDailySpending(List<Expense> expenses) {
    final dailyTotals = <DateTime, double>{};

    for (final expense in expenses) {
      final date = DateTime(expense.createdAt.year, expense.createdAt.month,
          expense.createdAt.day);
      dailyTotals[date] = (dailyTotals[date] ?? 0) + expense.amount;
    }

    return dailyTotals;
  }

  Map<String, double> _calculateTopSpenders(List<Expense> expenses) {
    final spenderTotals = <String, double>{};

    for (final expense in expenses) {
      spenderTotals[expense.paidBy.name] =
          (spenderTotals[expense.paidBy.name] ?? 0) + expense.amount;
    }

    final sorted = spenderTotals.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Map.fromEntries(sorted);
  }

  List<String> _analyzeSpendingPatterns(List<Expense> expenses) {
    final patterns = <String>[];

    if (expenses.isEmpty) return patterns;

    // Analyze category distribution
    final categoryData = _calculateCategoryData(expenses);
    final topCategory =
        categoryData.entries.reduce((a, b) => a.value > b.value ? a : b);
    final categoryPercentage =
        (topCategory.value / categoryData.values.reduce((a, b) => a + b)) * 100;

    if (categoryPercentage > 50) {
      patterns.add(
          '${topCategory.key.displayName} accounts for ${categoryPercentage.toStringAsFixed(0)}% of your spending');
    }

    // Analyze spending frequency
    final avgAmount =
        expenses.map((e) => e.amount).reduce((a, b) => a + b) / expenses.length;
    final expensiveExpenses =
        expenses.where((e) => e.amount > avgAmount * 2).length;

    if (expensiveExpenses > 0) {
      patterns.add(
          'You have $expensiveExpenses expenses significantly above average');
    }

    // Analyze time patterns
    final dates = expenses
        .map((e) =>
            DateTime(e.createdAt.year, e.createdAt.month, e.createdAt.day))
        .toSet();
    final avgExpensesPerDay = expenses.length / dates.length;

    if (avgExpensesPerDay > 3) {
      patterns.add(
          'High spending frequency: ${avgExpensesPerDay.toStringAsFixed(1)} expenses per day');
    }

    return patterns;
  }

  Color _getCategoryColor(ExpenseCategory category) {
    switch (category) {
      case ExpenseCategory.food:
        return Colors.orange;
      case ExpenseCategory.transport:
        return Colors.blue;
      case ExpenseCategory.accommodation:
        return Colors.purple;
      case ExpenseCategory.activities:
        return Colors.green;
      case ExpenseCategory.shopping:
        return Colors.pink;
      case ExpenseCategory.other:
        return Colors.grey;
    }
  }
}
