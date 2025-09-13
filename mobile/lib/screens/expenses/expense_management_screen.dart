// lib/screens/expenses/expense_management_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/expense_models.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/services/expense_service.dart';
import 'package:mobile/widgets/expense_list_item.dart';
import 'package:mobile/widgets/expense_summary_card.dart';
import 'package:mobile/screens/expenses/expense_analytics_screen.dart';
import 'package:mobile/screens/expenses/add_expense_screen.dart';
import 'package:mobile/screens/expenses/expense_actions_screen.dart';
import 'package:mobile/screens/expenses/budget_management_screen.dart';

class ExpenseManagementScreen extends StatefulWidget {
  final String tripId;
  final Trip? trip;

  const ExpenseManagementScreen({
    super.key,
    required this.tripId,
    this.trip,
  });

  @override
  State<ExpenseManagementScreen> createState() =>
      _ExpenseManagementScreenState();
}

class _ExpenseManagementScreenState extends State<ExpenseManagementScreen>
    with SingleTickerProviderStateMixin {
  final ExpenseService _expenseService = ExpenseService();
  late TabController _tabController;

  late Future<TripExpenseBundle> _expensesFuture;

  // Filtering and sorting options
  ExpenseCategory? _selectedCategoryFilter;
  String? _selectedUserFilter;
  DateTimeRange? _selectedDateRange;
  SortOption _sortOption = SortOption.dateDescending;

  final TextEditingController _searchController = TextEditingController();
  List<Expense> _filteredExpenses = [];
  bool _showFilters = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadExpenses();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _loadExpenses() {
    setState(() {
      _expensesFuture = _expenseService.getExpensesForTrip(widget.tripId);
    });
  }

  List<Expense> _getFilteredExpenses(List<Expense> expenses) {
    var filtered = expenses.where((expense) {
      // Search filter
      final searchQuery = _searchController.text.toLowerCase();
      if (searchQuery.isNotEmpty &&
          !expense.description.toLowerCase().contains(searchQuery)) {
        return false;
      }

      // Category filter
      if (_selectedCategoryFilter != null &&
          expense.category != _selectedCategoryFilter) {
        return false;
      }

      // User filter
      if (_selectedUserFilter != null &&
          expense.paidBy.id != _selectedUserFilter) {
        return false;
      }

      // Date range filter
      if (_selectedDateRange != null) {
        final expenseDate = expense.createdAt;
        if (expenseDate.isBefore(_selectedDateRange!.start) ||
            expenseDate.isAfter(
                _selectedDateRange!.end.add(const Duration(days: 1)))) {
          return false;
        }
      }

      return true;
    }).toList();

    // Apply sorting
    filtered.sort((a, b) {
      switch (_sortOption) {
        case SortOption.dateAscending:
          return a.createdAt.compareTo(b.createdAt);
        case SortOption.dateDescending:
          return b.createdAt.compareTo(a.createdAt);
        case SortOption.amountAscending:
          return a.amount.compareTo(b.amount);
        case SortOption.amountDescending:
          return b.amount.compareTo(a.amount);
        case SortOption.categoryAscending:
          return a.category.displayName.compareTo(b.category.displayName);
        case SortOption.categoryDescending:
          return b.category.displayName.compareTo(a.category.displayName);
      }
    });

    return filtered;
  }

  void _filterExpenses(List<Expense> expenses) {
    final filtered = _getFilteredExpenses(expenses);
    setState(() {
      _filteredExpenses = filtered;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Expense Management',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.list), text: 'All Expenses'),
            Tab(icon: Icon(Icons.analytics), text: 'Analytics'),
            Tab(icon: Icon(Icons.pie_chart), text: 'Summary'),
          ],
        ),
        actions: [
          IconButton(
            icon:
                Icon(_showFilters ? Icons.filter_list_off : Icons.filter_list),
            onPressed: () => setState(() => _showFilters = !_showFilters),
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'budget':
                  _navigateToBudgetManagement();
                  break;
                case 'actions':
                  _navigateToExpenseActions();
                  break;
                case 'add':
                  _navigateToAddExpense();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'budget',
                child: ListTile(
                  leading: Icon(Icons.account_balance_wallet),
                  title: Text('Budget Management'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'actions',
                child: ListTile(
                  leading: Icon(Icons.more_vert),
                  title: Text('Bulk Actions'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'add',
                child: ListTile(
                  leading: Icon(Icons.add),
                  title: Text('Add Expense'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          if (_showFilters) _buildFilterSection(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildExpenseListTab(),
                _buildAnalyticsTab(),
                _buildSummaryTab(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToAddExpense,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildFilterSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Column(
        children: [
          // Search bar
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search expenses...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _filterExpenses(_filteredExpenses);
                      },
                    )
                  : null,
              border: const OutlineInputBorder(),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onChanged: (_) => _filterExpenses(_filteredExpenses),
          ),
          const SizedBox(height: 12),

          // Filter chips
          Wrap(
            spacing: 8,
            children: [
              // Category filter
              FilterChip(
                label: Text(
                    _selectedCategoryFilter?.displayName ?? 'All Categories'),
                selected: _selectedCategoryFilter != null,
                onSelected: (_) => _showCategoryFilterDialog(),
              ),

              // Date range filter
              FilterChip(
                label: Text(_selectedDateRange != null
                    ? '${DateFormat.MMMd().format(_selectedDateRange!.start)} - ${DateFormat.MMMd().format(_selectedDateRange!.end)}'
                    : 'All Dates'),
                selected: _selectedDateRange != null,
                onSelected: (_) => _showDateRangePickerDialog(),
              ),

              // Sort options
              FilterChip(
                label: Text(_sortOption.displayName),
                selected: true,
                onSelected: (_) => _showSortOptionsDialog(),
              ),

              // Clear filters
              if (_hasActiveFilters)
                ActionChip(
                  label: const Text('Clear All'),
                  onPressed: _clearAllFilters,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildExpenseListTab() {
    return FutureBuilder<TripExpenseBundle>(
      future: _expensesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                Text('Error loading expenses: ${snapshot.error}'),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _loadExpenses,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        if (!snapshot.hasData || snapshot.data!.expenses.isEmpty) {
          return _buildEmptyState();
        }

        final expenses = snapshot.data!.expenses;
        final filteredExpenses = _getFilteredExpenses(expenses);

        return RefreshIndicator(
          onRefresh: () async => _loadExpenses(),
          child: filteredExpenses.isEmpty
              ? _buildNoResultsState()
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: filteredExpenses.length,
                  itemBuilder: (context, index) {
                    final expense = filteredExpenses[index];
                    return ExpenseListItem(
                      expenseData: expense,
                      tripId: widget.tripId,
                      onActionCompleted: _loadExpenses,
                    );
                  },
                ),
        );
      },
    );
  }

  Widget _buildAnalyticsTab() {
    return FutureBuilder<TripExpenseBundle>(
      future: _expensesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return const Center(child: Text('Unable to load analytics'));
        }

        return ExpenseAnalyticsScreen(
          expenseBundle: snapshot.data!,
          tripId: widget.tripId,
        );
      },
    );
  }

  Widget _buildSummaryTab() {
    return FutureBuilder<TripExpenseBundle>(
      future: _expensesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return const Center(child: Text('Unable to load summary'));
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              ExpenseSummaryCard(summary: snapshot.data!.summary),
              const SizedBox(height: 16),
              _buildQuickStats(snapshot.data!),
              const SizedBox(height: 16),
              _buildCategoryBreakdown(snapshot.data!.expenses),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long_outlined,
              size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'No expenses yet',
            style:
                GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Track your trip expenses to stay within budget',
            style: GoogleFonts.poppins(color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _navigateToAddExpense,
            icon: const Icon(Icons.add),
            label: const Text('Add First Expense'),
          ),
        ],
      ),
    );
  }

  Widget _buildNoResultsState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'No matching expenses',
            style:
                GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your filters',
            style: GoogleFonts.poppins(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: _clearAllFilters,
            child: const Text('Clear filters'),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStats(TripExpenseBundle bundle) {
    final expenses = bundle.expenses;
    final avgExpense = expenses.isNotEmpty
        ? expenses.map((e) => e.amount).reduce((a, b) => a + b) /
            expenses.length
        : 0.0;
    final highestExpense = expenses.isNotEmpty
        ? expenses.map((e) => e.amount).reduce((a, b) => a > b ? a : b)
        : 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Quick Stats',
                style: GoogleFonts.poppins(
                    fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                    child:
                        _buildStatItem('Total Expenses', '${expenses.length}')),
                Expanded(
                    child: _buildStatItem(
                        'Average', '₹${avgExpense.toStringAsFixed(2)}')),
                Expanded(
                    child: _buildStatItem(
                        'Highest', '₹${highestExpense.toStringAsFixed(2)}')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(value,
            style:
                GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(label,
            style:
                GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600)),
      ],
    );
  }

  Widget _buildCategoryBreakdown(List<Expense> expenses) {
    final categoryTotals = <ExpenseCategory, double>{};
    for (final expense in expenses) {
      categoryTotals[expense.category] =
          (categoryTotals[expense.category] ?? 0) + expense.amount;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Category Breakdown',
                style: GoogleFonts.poppins(
                    fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            ...categoryTotals.entries.map((entry) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(entry.key.displayName),
                      Text('₹${entry.value.toStringAsFixed(2)}',
                          style:
                              GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  // Helper methods for filtering and sorting
  bool get _hasActiveFilters =>
      _selectedCategoryFilter != null ||
      _selectedUserFilter != null ||
      _selectedDateRange != null ||
      _searchController.text.isNotEmpty;

  void _clearAllFilters() {
    setState(() {
      _selectedCategoryFilter = null;
      _selectedUserFilter = null;
      _selectedDateRange = null;
      _searchController.clear();
      _sortOption = SortOption.dateDescending;
    });
    _loadExpenses();
  }

  void _showCategoryFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter by Category'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('All Categories'),
              leading: Radio<ExpenseCategory?>(
                value: null,
                groupValue: _selectedCategoryFilter,
                onChanged: (value) {
                  setState(() => _selectedCategoryFilter = value);
                  Navigator.pop(context);
                  _loadExpenses();
                },
              ),
            ),
            ...ExpenseCategory.values.map((category) => ListTile(
                  title: Text(category.displayName),
                  leading: Radio<ExpenseCategory?>(
                    value: category,
                    groupValue: _selectedCategoryFilter,
                    onChanged: (value) {
                      setState(() => _selectedCategoryFilter = value);
                      Navigator.pop(context);
                      _loadExpenses();
                    },
                  ),
                )),
          ],
        ),
      ),
    );
  }

  void _showDateRangePickerDialog() async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      initialDateRange: _selectedDateRange,
    );

    if (picked != null) {
      setState(() => _selectedDateRange = picked);
      _loadExpenses();
    }
  }

  void _showSortOptionsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sort Options'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: SortOption.values
              .map((option) => ListTile(
                    title: Text(option.displayName),
                    leading: Radio<SortOption>(
                      value: option,
                      groupValue: _sortOption,
                      onChanged: (value) {
                        setState(() => _sortOption = value!);
                        Navigator.pop(context);
                        _loadExpenses();
                      },
                    ),
                  ))
              .toList(),
        ),
      ),
    );
  }

  void _navigateToAddExpense() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddExpenseScreen(
          tripId: widget.tripId,
          trip: widget.trip,
        ),
      ),
    );

    if (result == true) {
      _loadExpenses();
    }
  }

  void _navigateToBudgetManagement() async {
    final expenseBundle = await _expensesFuture;
    if (!mounted) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BudgetManagementScreen(
          tripId: widget.tripId,
          trip: widget.trip,
          expenses: expenseBundle.expenses,
        ),
      ),
    );
  }

  void _navigateToExpenseActions() async {
    final expenseBundle = await _expensesFuture;
    if (!mounted) return;

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ExpenseActionsScreen(
          tripId: widget.tripId,
          expenses: expenseBundle.expenses,
          summary: expenseBundle.summary,
        ),
      ),
    );

    if (result == true) {
      _loadExpenses();
    }
  }
}

// Enum for sorting options
enum SortOption {
  dateAscending,
  dateDescending,
  amountAscending,
  amountDescending,
  categoryAscending,
  categoryDescending,
}

extension SortOptionExtension on SortOption {
  String get displayName {
    switch (this) {
      case SortOption.dateAscending:
        return 'Date (Oldest First)';
      case SortOption.dateDescending:
        return 'Date (Newest First)';
      case SortOption.amountAscending:
        return 'Amount (Low to High)';
      case SortOption.amountDescending:
        return 'Amount (High to Low)';
      case SortOption.categoryAscending:
        return 'Category (A-Z)';
      case SortOption.categoryDescending:
        return 'Category (Z-A)';
    }
  }
}
