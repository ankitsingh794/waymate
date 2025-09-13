// lib/screens/expenses/budget_management_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/expense_models.dart';
import 'package:mobile/models/trip_models.dart';

class BudgetManagementScreen extends StatefulWidget {
  final String tripId;
  final Trip? trip;
  final List<Expense> expenses;

  const BudgetManagementScreen({
    super.key,
    required this.tripId,
    this.trip,
    required this.expenses,
  });

  @override
  State<BudgetManagementScreen> createState() => _BudgetManagementScreenState();
}

class _BudgetManagementScreenState extends State<BudgetManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Budget data (in a real app, this would come from an API)
  double _totalBudget = 0.0;
  Map<ExpenseCategory, double> _categoryBudgets = {};
  Map<String, double> _dailyBudgets = {};

  final TextEditingController _budgetController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initializeBudgets();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  void _initializeBudgets() {
    // Initialize with sample data or load from storage
    _totalBudget = widget.trip?.budget?.total.toDouble() ?? 50000.0;

    // Initialize category budgets (distribute total budget)
    final categories = ExpenseCategory.values;
    final budgetPerCategory = _totalBudget / categories.length;

    for (final category in categories) {
      _categoryBudgets[category] = budgetPerCategory;
    }

    // Initialize daily budgets
    if (widget.trip != null) {
      final tripDuration =
          widget.trip!.endDate.difference(widget.trip!.startDate).inDays + 1;
      final dailyBudget = _totalBudget / tripDuration;

      for (int i = 0; i < tripDuration; i++) {
        final date = widget.trip!.startDate.add(Duration(days: i));
        final dateKey = DateFormat('yyyy-MM-dd').format(date);
        _dailyBudgets[dateKey] = dailyBudget;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Budget Management',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.account_balance_wallet), text: 'Overview'),
            Tab(icon: Icon(Icons.category), text: 'Categories'),
            Tab(icon: Icon(Icons.calendar_today), text: 'Daily'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(),
          _buildCategoriesTab(),
          _buildDailyTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showSetBudgetDialog,
        icon: const Icon(Icons.edit),
        label: const Text('Set Budget'),
      ),
    );
  }

  Widget _buildOverviewTab() {
    final totalSpent =
        widget.expenses.map((e) => e.amount).fold(0.0, (a, b) => a + b);
    final remaining = _totalBudget - totalSpent;
    final spentPercentage =
        _totalBudget > 0 ? (totalSpent / _totalBudget) : 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildBudgetOverviewCard(totalSpent, remaining, spentPercentage),
          const SizedBox(height: 24),
          _buildSpendingTrendsCard(),
          const SizedBox(height: 24),
          _buildBudgetAlertsCard(spentPercentage),
        ],
      ),
    );
  }

  Widget _buildBudgetOverviewCard(
      double totalSpent, double remaining, double spentPercentage) {
    final isOverBudget = remaining < 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Budget Overview',
              style: GoogleFonts.poppins(
                  fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),

            // Circular progress indicator
            Center(
              child: SizedBox(
                width: 200,
                height: 200,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: spentPercentage.clamp(0.0, 1.0),
                      strokeWidth: 12,
                      backgroundColor: Colors.grey.shade300,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        spentPercentage > 1.0
                            ? Colors.red
                            : spentPercentage > 0.8
                                ? Colors.orange
                                : Colors.green,
                      ),
                    ),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${(spentPercentage * 100).toStringAsFixed(1)}%',
                          style: GoogleFonts.poppins(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: isOverBudget ? Colors.red : Colors.black87,
                          ),
                        ),
                        Text(
                          'of budget used',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Budget breakdown
            Row(
              children: [
                Expanded(
                    child: _buildBudgetStat('Total Budget',
                        '₹${_totalBudget.toStringAsFixed(2)}', Colors.blue)),
                Expanded(
                    child: _buildBudgetStat('Spent',
                        '₹${totalSpent.toStringAsFixed(2)}', Colors.orange)),
                Expanded(
                    child: _buildBudgetStat(
                  isOverBudget ? 'Over Budget' : 'Remaining',
                  '₹${remaining.abs().toStringAsFixed(2)}',
                  isOverBudget ? Colors.red : Colors.green,
                )),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBudgetStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildSpendingTrendsCard() {
    final dailySpending = _calculateDailySpending();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Spending Trends',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            if (dailySpending.isNotEmpty) ...[
              SizedBox(
                height: 120,
                child: _buildSpendingChart(dailySpending),
              ),
            ] else ...[
              const Center(
                child: Text('No spending data available'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBudgetAlertsCard(double spentPercentage) {
    final alerts = _generateBudgetAlerts(spentPercentage);

    if (alerts.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: Colors.amber.shade800),
                const SizedBox(width: 8),
                Text(
                  'Budget Alerts',
                  style: GoogleFonts.poppins(
                      fontSize: 18, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...alerts.map((alert) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(Icons.circle, size: 8, color: Colors.amber.shade800),
                      const SizedBox(width: 8),
                      Expanded(child: Text(alert)),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoriesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Category Budgets',
            style:
                GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ...ExpenseCategory.values
              .map((category) => _buildCategoryBudgetCard(category)),
        ],
      ),
    );
  }

  Widget _buildCategoryBudgetCard(ExpenseCategory category) {
    final categoryExpenses =
        widget.expenses.where((e) => e.category == category).toList();
    final spent =
        categoryExpenses.map((e) => e.amount).fold(0.0, (a, b) => a + b);
    final budget = _categoryBudgets[category] ?? 0.0;
    final percentage = budget > 0 ? (spent / budget) : 0.0;
    final remaining = budget - spent;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  category.displayName,
                  style: GoogleFonts.poppins(
                      fontSize: 16, fontWeight: FontWeight.w600),
                ),
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  onPressed: () => _editCategoryBudget(category),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: percentage.clamp(0.0, 1.0),
              backgroundColor: Colors.grey.shade300,
              valueColor: AlwaysStoppedAnimation<Color>(
                percentage > 1.0
                    ? Colors.red
                    : percentage > 0.8
                        ? Colors.orange
                        : Colors.green,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Spent: ₹${spent.toStringAsFixed(2)}',
                  style: GoogleFonts.poppins(fontSize: 12),
                ),
                Text(
                  'Budget: ₹${budget.toStringAsFixed(2)}',
                  style: GoogleFonts.poppins(fontSize: 12),
                ),
              ],
            ),
            Text(
              remaining >= 0
                  ? 'Remaining: ₹${remaining.toStringAsFixed(2)}'
                  : 'Over budget: ₹${remaining.abs().toStringAsFixed(2)}',
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: remaining >= 0 ? Colors.green : Colors.red,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDailyTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Daily Budget Tracking',
            style:
                GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ..._dailyBudgets.entries
              .map((entry) => _buildDailyBudgetCard(entry.key, entry.value)),
        ],
      ),
    );
  }

  Widget _buildDailyBudgetCard(String dateKey, double budget) {
    final date = DateTime.parse(dateKey);
    final dayExpenses = widget.expenses.where((e) {
      final expenseDate =
          DateTime(e.createdAt.year, e.createdAt.month, e.createdAt.day);
      return DateFormat('yyyy-MM-dd').format(expenseDate) == dateKey;
    }).toList();

    final spent = dayExpenses.map((e) => e.amount).fold(0.0, (a, b) => a + b);
    final percentage = budget > 0 ? (spent / budget) : 0.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 60,
              child: Column(
                children: [
                  Text(
                    DateFormat.d().format(date),
                    style: GoogleFonts.poppins(
                        fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    DateFormat.MMM().format(date),
                    style: GoogleFonts.poppins(fontSize: 12),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LinearProgressIndicator(
                    value: percentage.clamp(0.0, 1.0),
                    backgroundColor: Colors.grey.shade300,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      percentage > 1.0
                          ? Colors.red
                          : percentage > 0.8
                              ? Colors.orange
                              : Colors.green,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Spent: ₹${spent.toStringAsFixed(0)}',
                        style: GoogleFonts.poppins(fontSize: 12),
                      ),
                      Text(
                        'Budget: ₹${budget.toStringAsFixed(0)}',
                        style: GoogleFonts.poppins(fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpendingChart(Map<String, double> dailySpending) {
    final entries = dailySpending.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    final maxAmount =
        entries.map((e) => e.value).fold(0.0, (a, b) => a > b ? a : b);

    return ListView.builder(
      scrollDirection: Axis.horizontal,
      itemCount: entries.length,
      itemBuilder: (context, index) {
        final entry = entries[index];
        final height = maxAmount > 0 ? (entry.value / maxAmount) * 80 : 0.0;
        final date = DateTime.parse(entry.key);

        return Container(
          width: 50,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Container(
                height: height,
                decoration: BoxDecoration(
                  color: Colors.blue.shade400,
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(2)),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                DateFormat.d().format(date),
                style: GoogleFonts.poppins(fontSize: 10),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showSetBudgetDialog() {
    _budgetController.text = _totalBudget.toString();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Set Total Budget'),
        content: TextField(
          controller: _budgetController,
          decoration: const InputDecoration(
            labelText: 'Budget Amount',
            prefixText: '₹',
            border: OutlineInputBorder(),
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final newBudget = double.tryParse(_budgetController.text);
              if (newBudget != null && newBudget > 0) {
                setState(() {
                  _totalBudget = newBudget;
                  _redistributeCategoryBudgets();
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Budget updated successfully!')),
                );
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _editCategoryBudget(ExpenseCategory category) {
    final currentBudget = _categoryBudgets[category] ?? 0.0;
    final controller = TextEditingController(text: currentBudget.toString());

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Set ${category.displayName} Budget'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Budget Amount',
            prefixText: '₹',
            border: OutlineInputBorder(),
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final newBudget = double.tryParse(controller.text);
              if (newBudget != null && newBudget >= 0) {
                setState(() {
                  _categoryBudgets[category] = newBudget;
                });
                Navigator.pop(context);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _redistributeCategoryBudgets() {
    final categories = ExpenseCategory.values;
    final budgetPerCategory = _totalBudget / categories.length;

    for (final category in categories) {
      _categoryBudgets[category] = budgetPerCategory;
    }
  }

  Map<String, double> _calculateDailySpending() {
    final dailySpending = <String, double>{};

    for (final expense in widget.expenses) {
      final dateKey = DateFormat('yyyy-MM-dd').format(expense.createdAt);
      dailySpending[dateKey] = (dailySpending[dateKey] ?? 0) + expense.amount;
    }

    return dailySpending;
  }

  List<String> _generateBudgetAlerts(double spentPercentage) {
    final alerts = <String>[];

    if (spentPercentage > 1.0) {
      alerts.add(
          'You have exceeded your total budget by ${((spentPercentage - 1) * 100).toStringAsFixed(1)}%');
    } else if (spentPercentage > 0.9) {
      alerts.add(
          'You have used ${(spentPercentage * 100).toStringAsFixed(1)}% of your budget');
    }

    // Check category budgets
    for (final entry in _categoryBudgets.entries) {
      final categoryExpenses =
          widget.expenses.where((e) => e.category == entry.key).toList();
      final spent =
          categoryExpenses.map((e) => e.amount).fold(0.0, (a, b) => a + b);
      final percentage = entry.value > 0 ? (spent / entry.value) : 0.0;

      if (percentage > 1.0) {
        alerts.add(
            '${entry.key.displayName} budget exceeded by ${((percentage - 1) * 100).toStringAsFixed(1)}%');
      } else if (percentage > 0.8) {
        alerts.add(
            '${entry.key.displayName} budget is ${(percentage * 100).toStringAsFixed(1)}% used');
      }
    }

    return alerts;
  }
}
