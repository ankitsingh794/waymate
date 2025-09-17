// lib/screens/expenses/add_expense_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/expense_models.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/expense_service.dart';

class AddExpenseScreen extends StatefulWidget {
  final String tripId;
  final Trip? trip;
  final Expense? existingExpense; // For editing

  const AddExpenseScreen({
    super.key,
    required this.tripId,
    this.trip,
    this.existingExpense,
  });

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  final ExpenseService _expenseService = ExpenseService();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _descriptionController;
  late TextEditingController _amountController;
  late TextEditingController _notesController;

  ExpenseCategory _selectedCategory = ExpenseCategory.other;
  String? _selectedPaidBy;
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = false;

  List<User> _tripMembers = [];
  Map<String, double> _memberShares = {};
  bool _isEqualSplit = true;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _loadTripMembers();
  }

  void _initializeControllers() {
    final expense = widget.existingExpense;

    _descriptionController =
        TextEditingController(text: expense?.description ?? '');
    _amountController =
        TextEditingController(text: expense?.amount.toString() ?? '');
    _notesController = TextEditingController();

    if (expense != null) {
      _selectedCategory = expense.category;
      _selectedPaidBy = expense.paidBy.id;
      _selectedDate = expense.createdAt;
    }
  }

  void _loadTripMembers() {
    if (widget.trip?.group?.members != null) {
      setState(() {
        _tripMembers = widget.trip!.group!.members.map((m) => m.user).toList();
        _initializeMemberShares();
      });
    }
  }

  void _initializeMemberShares() {
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    final sharePerPerson =
        _tripMembers.isNotEmpty ? amount / _tripMembers.length : 0.0;

    _memberShares = {};
    for (final member in _tripMembers) {
      _memberShares[member.id] = sharePerPerson;
    }
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.existingExpense != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          isEditing ? 'Edit Expense' : 'Add Expense',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        actions: [
          if (isEditing)
            IconButton(
              icon: const Icon(Icons.delete),
              onPressed: _showDeleteConfirmation,
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildBasicInfoSection(),
              const SizedBox(height: 24),
              _buildCategorySection(),
              const SizedBox(height: 24),
              _buildPaymentSection(),
              const SizedBox(height: 24),
              _buildSplitSection(),
              const SizedBox(height: 24),
              _buildDateSection(),
              const SizedBox(height: 24),
              _buildNotesSection(),
              const SizedBox(height: 32),
              _buildActionButtons(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBasicInfoSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Expense Details',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description *',
                hintText: 'What was this expense for?',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a description';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _amountController,
              decoration: const InputDecoration(
                labelText: 'Amount *',
                hintText: '0.00',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.currency_rupee),
              ),
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter an amount';
                }
                final amount = double.tryParse(value);
                if (amount == null || amount <= 0) {
                  return 'Please enter a valid amount';
                }
                return null;
              },
              onChanged: (value) {
                if (_isEqualSplit) {
                  _updateEqualSplit();
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategorySection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Category',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: ExpenseCategory.values.map((category) {
                final isSelected = _selectedCategory == category;
                return FilterChip(
                  label: Text(category.displayName),
                  selected: isSelected,
                  onSelected: (_) =>
                      setState(() => _selectedCategory = category),
                  avatar: Icon(_getCategoryIcon(category), size: 18),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Payment',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _selectedPaidBy,
              decoration: const InputDecoration(
                labelText: 'Paid by *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
              hint: const Text('Select who paid'),
              items: _tripMembers
                  .map((member) => DropdownMenuItem(
                        value: member.id,
                        child: Text(member.name),
                      ))
                  .toList(),
              onChanged: (value) => setState(() => _selectedPaidBy = value),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please select who paid';
                }
                return null;
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSplitSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Split Between',
                  style: GoogleFonts.poppins(
                      fontSize: 18, fontWeight: FontWeight.w600),
                ),
                Switch(
                  value: _isEqualSplit,
                  onChanged: (value) {
                    setState(() {
                      _isEqualSplit = value;
                      if (value) {
                        _updateEqualSplit();
                      }
                    });
                  },
                ),
              ],
            ),
            Text(
              _isEqualSplit ? 'Equal split' : 'Custom split',
              style: GoogleFonts.poppins(
                  fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            ..._tripMembers.map((member) => _buildMemberShareRow(member)),
          ],
        ),
      ),
    );
  }

  Widget _buildMemberShareRow(User member) {
    final share = _memberShares[member.id] ?? 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            child: Text(
              member.name.substring(0, 1).toUpperCase(),
              style: GoogleFonts.poppins(
                  fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              member.name,
              style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
            ),
          ),
          if (_isEqualSplit)
            Text(
              '₹${share.toStringAsFixed(2)}',
              style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
            )
          else
            SizedBox(
              width: 100,
              child: TextFormField(
                initialValue: share.toStringAsFixed(2),
                decoration: const InputDecoration(
                  isDense: true,
                  border: OutlineInputBorder(),
                  prefixText: '₹',
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                onChanged: (value) {
                  final amount = double.tryParse(value) ?? 0.0;
                  setState(() {
                    _memberShares[member.id] = amount;
                  });
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDateSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Date',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: _selectDate,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today),
                    const SizedBox(width: 12),
                    Text(
                      DateFormat.yMMMd().format(_selectedDate),
                      style: GoogleFonts.poppins(fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotesSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Notes (Optional)',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                hintText: 'Add any additional notes...',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.note),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    final isEditing = widget.existingExpense != null;

    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _saveExpense,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    isEditing ? 'Update Expense' : 'Add Expense',
                    style: GoogleFonts.poppins(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancel',
              style: GoogleFonts.poppins(fontSize: 16),
            ),
          ),
        ),
      ],
    );
  }

  void _updateEqualSplit() {
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    final sharePerPerson =
        _tripMembers.isNotEmpty ? amount / _tripMembers.length : 0.0;

    setState(() {
      for (final member in _tripMembers) {
        _memberShares[member.id] = sharePerPerson;
      }
    });
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );

    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _saveExpense() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedPaidBy == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select who paid')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final description = _descriptionController.text.trim();
      final amount = double.parse(_amountController.text);

      // Create participants list
      final participants = _memberShares.entries
          .where((entry) => entry.value > 0)
          .map((entry) => ExpenseParticipant(
                userId: entry.key,
                share: entry.value,
              ))
          .toList();

      if (widget.existingExpense != null) {
        // Update existing expense
        await _expenseService.updateExpense(
          tripId: widget.tripId,
          expenseId: widget.existingExpense!.id,
          description: description,
          amount: amount,
          category: _selectedCategory,
        );
      } else {
        // Add new expense
        await _expenseService.addExpense(
          tripId: widget.tripId,
          description: description,
          amount: amount,
          category: _selectedCategory.serverValue,
          paidBy: _selectedPaidBy!,
          participants: participants,
        );
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.existingExpense != null
              ? 'Expense updated successfully!'
              : 'Expense added successfully!'),
        ),
      );

      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showDeleteConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Expense'),
        content: const Text(
            'Are you sure you want to delete this expense? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(context);
              _deleteExpense();
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteExpense() async {
    if (widget.existingExpense == null) return;

    setState(() => _isLoading = true);

    try {
      await _expenseService.deleteExpense(
          widget.tripId, widget.existingExpense!.id);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Expense deleted successfully!')),
      );

      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error deleting expense: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  IconData _getCategoryIcon(ExpenseCategory category) {
    switch (category) {
      case ExpenseCategory.food:
        return Icons.restaurant;
      case ExpenseCategory.transport:
        return Icons.directions_car;
      case ExpenseCategory.accommodation:
        return Icons.hotel;
      case ExpenseCategory.activities:
        return Icons.local_activity;
      case ExpenseCategory.shopping:
        return Icons.shopping_bag;
      case ExpenseCategory.other:
        return Icons.more_horiz;
    }
  }
}
