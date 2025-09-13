// lib/screens/expenses/expense_actions_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/expense_models.dart';
import 'package:mobile/services/expense_service.dart';
import 'package:share_plus/share_plus.dart';

class ExpenseActionsScreen extends StatefulWidget {
  final String tripId;
  final List<Expense> expenses;
  final ExpenseSummary summary;

  const ExpenseActionsScreen({
    super.key,
    required this.tripId,
    required this.expenses,
    required this.summary,
  });

  @override
  State<ExpenseActionsScreen> createState() => _ExpenseActionsScreenState();
}

class _ExpenseActionsScreenState extends State<ExpenseActionsScreen> {
  final ExpenseService _expenseService = ExpenseService();
  Set<String> _selectedExpenseIds = {};
  bool _isLoading = false;
  bool _selectAll = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Expense Actions',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        actions: [
          if (_selectedExpenseIds.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep),
              onPressed: _showBulkDeleteConfirmation,
            ),
        ],
      ),
      body: Column(
        children: [
          _buildActionButtons(),
          _buildSelectionHeader(),
          Expanded(child: _buildExpenseList()),
        ],
      ),
      floatingActionButton: _selectedExpenseIds.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _showBulkActionsBottomSheet,
              icon: const Icon(Icons.more_vert),
              label: Text('${_selectedExpenseIds.length} selected'),
            )
          : null,
    );
  }

  Widget _buildActionButtons() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Actions',
            style:
                GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildActionChip(
                'Export CSV',
                Icons.download,
                _exportToCsv,
                Colors.blue,
              ),
              _buildActionChip(
                'Export PDF',
                Icons.picture_as_pdf,
                _exportToPdf,
                Colors.red,
              ),
              _buildActionChip(
                'Share Summary',
                Icons.share,
                _shareSummary,
                Colors.green,
              ),
              _buildActionChip(
                'Email Report',
                Icons.email,
                _emailReport,
                Colors.orange,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionChip(
      String label, IconData icon, VoidCallback onPressed, Color color) {
    return ActionChip(
      avatar: Icon(icon, size: 18, color: color),
      label: Text(label),
      onPressed: _isLoading ? null : onPressed,
    );
  }

  Widget _buildSelectionHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Row(
        children: [
          Checkbox(
            value: _selectAll,
            onChanged: _toggleSelectAll,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _selectedExpenseIds.isEmpty
                  ? 'Select expenses for bulk actions'
                  : '${_selectedExpenseIds.length} of ${widget.expenses.length} selected',
              style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
            ),
          ),
          if (_selectedExpenseIds.isNotEmpty)
            TextButton(
              onPressed: _clearSelection,
              child: const Text('Clear'),
            ),
        ],
      ),
    );
  }

  Widget _buildExpenseList() {
    return ListView.builder(
      itemCount: widget.expenses.length,
      itemBuilder: (context, index) {
        final expense = widget.expenses[index];
        final isSelected = _selectedExpenseIds.contains(expense.id);

        return ListTile(
          leading: Checkbox(
            value: isSelected,
            onChanged: (selected) =>
                _toggleExpenseSelection(expense.id, selected ?? false),
          ),
          title: Text(
            expense.description,
            style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${expense.category.displayName} • ${DateFormat.yMMMd().format(expense.createdAt)}',
                style: GoogleFonts.poppins(fontSize: 12),
              ),
              Text(
                'Paid by ${expense.paidBy.name}',
                style: GoogleFonts.poppins(
                    fontSize: 12, color: Colors.grey.shade600),
              ),
            ],
          ),
          trailing: Text(
            '₹${expense.amount.toStringAsFixed(2)}',
            style:
                GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          onTap: () => _toggleExpenseSelection(expense.id, !isSelected),
        );
      },
    );
  }

  void _toggleSelectAll(bool? selectAll) {
    setState(() {
      _selectAll = selectAll ?? false;
      if (_selectAll) {
        _selectedExpenseIds = widget.expenses.map((e) => e.id).toSet();
      } else {
        _selectedExpenseIds.clear();
      }
    });
  }

  void _toggleExpenseSelection(String expenseId, bool selected) {
    setState(() {
      if (selected) {
        _selectedExpenseIds.add(expenseId);
      } else {
        _selectedExpenseIds.remove(expenseId);
      }
      _selectAll = _selectedExpenseIds.length == widget.expenses.length;
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedExpenseIds.clear();
      _selectAll = false;
    });
  }

  void _showBulkActionsBottomSheet() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Bulk Actions',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: const Text('Delete Selected'),
              onTap: () {
                Navigator.pop(context);
                _showBulkDeleteConfirmation();
              },
            ),
            ListTile(
              leading: const Icon(Icons.category),
              title: const Text('Change Category'),
              onTap: () {
                Navigator.pop(context);
                _showBulkCategoryChange();
              },
            ),
            ListTile(
              leading: const Icon(Icons.download),
              title: const Text('Export Selected'),
              onTap: () {
                Navigator.pop(context);
                _exportSelectedToCsv();
              },
            ),
            ListTile(
              leading: const Icon(Icons.share),
              title: const Text('Share Selected'),
              onTap: () {
                Navigator.pop(context);
                _shareSelected();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showBulkDeleteConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Expenses'),
        content: Text(
          'Are you sure you want to delete ${_selectedExpenseIds.length} selected expenses? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(context);
              _bulkDeleteExpenses();
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showBulkCategoryChange() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Category'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: ExpenseCategory.values
              .map((category) => ListTile(
                    title: Text(category.displayName),
                    onTap: () {
                      Navigator.pop(context);
                      _bulkChangeCategoryLater(category);
                    },
                  ))
              .toList(),
        ),
      ),
    );
  }

  Future<void> _bulkDeleteExpenses() async {
    setState(() => _isLoading = true);

    try {
      // Note: This would require a bulk delete API endpoint
      // For now, we'll delete them one by one
      for (final expenseId in _selectedExpenseIds) {
        await _expenseService.deleteExpense(widget.tripId, expenseId);
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              '${_selectedExpenseIds.length} expenses deleted successfully'),
        ),
      );

      Navigator.pop(context, true); // Return true to indicate changes were made
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error deleting expenses: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _bulkChangeCategoryLater(ExpenseCategory newCategory) {
    // This would require a bulk update API endpoint
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Bulk category change feature coming soon!'),
      ),
    );
  }

  Future<void> _exportToCsv() async {
    setState(() => _isLoading = true);

    try {
      final csvContent = _generateCsvContent(widget.expenses);

      // For now, we'll share the CSV content as text
      // In a real app, you'd save this to a file and share the file
      await Share.share(
        csvContent,
        subject:
            'Trip Expenses Export - ${DateFormat.yMMMd().format(DateTime.now())}',
      );
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error exporting CSV: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _exportSelectedToCsv() async {
    final selectedExpenses = widget.expenses
        .where((expense) => _selectedExpenseIds.contains(expense.id))
        .toList();

    setState(() => _isLoading = true);

    try {
      final csvContent = _generateCsvContent(selectedExpenses);
      await Share.share(
        csvContent,
        subject:
            'Selected Expenses Export - ${DateFormat.yMMMd().format(DateTime.now())}',
      );
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error exporting selected expenses: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _exportToPdf() async {
    // PDF export would require additional dependencies like pdf package
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('PDF export feature coming soon!'),
      ),
    );
  }

  Future<void> _shareSummary() async {
    final summaryText = _generateSummaryText();
    await Share.share(
      summaryText,
      subject: 'Trip Expense Summary',
    );
  }

  Future<void> _shareSelected() async {
    final selectedExpenses = widget.expenses
        .where((expense) => _selectedExpenseIds.contains(expense.id))
        .toList();

    final summaryText = _generateSummaryTextForExpenses(selectedExpenses);
    await Share.share(
      summaryText,
      subject: 'Selected Expenses Summary',
    );
  }

  Future<void> _emailReport() async {
    // Email functionality would require additional setup
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Email report feature coming soon!'),
      ),
    );
  }

  String _generateCsvContent(List<Expense> expenses) {
    final buffer = StringBuffer();

    // CSV Header
    buffer.writeln('Date,Description,Category,Amount,Paid By,Currency');

    // CSV Data
    for (final expense in expenses) {
      buffer.writeln('${DateFormat('yyyy-MM-dd').format(expense.createdAt)},'
          '"${expense.description}",'
          '${expense.category.displayName},'
          '${expense.amount},'
          '"${expense.paidBy.name}",'
          '${widget.summary.currency}');
    }

    return buffer.toString();
  }

  String _generateSummaryText() {
    final buffer = StringBuffer();

    buffer.writeln('🧾 Trip Expense Summary');
    buffer
        .writeln('Generated on: ${DateFormat.yMMMd().format(DateTime.now())}');
    buffer.writeln();
    buffer.writeln(
        '💰 Total Spent: ${widget.summary.currency} ${widget.summary.totalSpent.toStringAsFixed(2)}');
    buffer.writeln('📋 Total Expenses: ${widget.expenses.length}');
    buffer.writeln();

    // Category breakdown
    final categoryTotals = <ExpenseCategory, double>{};
    for (final expense in widget.expenses) {
      categoryTotals[expense.category] =
          (categoryTotals[expense.category] ?? 0) + expense.amount;
    }

    buffer.writeln('📊 Category Breakdown:');
    for (final entry in categoryTotals.entries) {
      buffer.writeln(
          '  ${entry.key.displayName}: ${widget.summary.currency} ${entry.value.toStringAsFixed(2)}');
    }

    if (widget.summary.settlements.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('💸 Settlements Needed:');
      for (final settlement in widget.summary.settlements) {
        buffer.writeln(
            '  ${settlement.from.name} → ${settlement.to.name}: ${widget.summary.currency} ${settlement.amount.toStringAsFixed(2)}');
      }
    }

    return buffer.toString();
  }

  String _generateSummaryTextForExpenses(List<Expense> expenses) {
    final buffer = StringBuffer();

    buffer.writeln('🧾 Selected Expenses Summary');
    buffer
        .writeln('Generated on: ${DateFormat.yMMMd().format(DateTime.now())}');
    buffer.writeln();

    final totalAmount =
        expenses.map((e) => e.amount).fold(0.0, (a, b) => a + b);
    buffer.writeln(
        '💰 Total Amount: ${widget.summary.currency} ${totalAmount.toStringAsFixed(2)}');
    buffer.writeln('📋 Number of Expenses: ${expenses.length}');
    buffer.writeln();

    buffer.writeln('📝 Expense Details:');
    for (final expense in expenses) {
      buffer.writeln(
          '  ${DateFormat.MMMd().format(expense.createdAt)} - ${expense.description}: ${widget.summary.currency} ${expense.amount.toStringAsFixed(2)}');
    }

    return buffer.toString();
  }
}
