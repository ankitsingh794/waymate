// lib/widgets/expense_list_item.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/expense_models.dart';
import 'package:mobile/services/expense_service.dart';

// --- UPDATED: Converted to a StatefulWidget to handle loading state ---
class ExpenseListItem extends StatefulWidget {
  final Expense expenseData;
  final String tripId;
  // --- UPDATED: Callback is renamed for clarity to handle both edit and delete ---
  final VoidCallback onActionCompleted;

  const ExpenseListItem({
    super.key,
    required this.expenseData,
    required this.tripId,
    required this.onActionCompleted,
  });

  @override
  State<ExpenseListItem> createState() => _ExpenseListItemState();
}

class _ExpenseListItemState extends State<ExpenseListItem> {
  final ExpenseService _expenseService = ExpenseService();
  bool _isLoading = false;

  IconData _getIconForCategory(ExpenseCategory category) {
    switch (category) {
      case ExpenseCategory.food: return Icons.fastfood_outlined;
      case ExpenseCategory.transport: return Icons.directions_bus_outlined;
      case ExpenseCategory.accommodation: return Icons.hotel_outlined;
      case ExpenseCategory.activities: return Icons.local_activity_outlined;
      case ExpenseCategory.shopping: return Icons.shopping_bag_outlined;
      default: return Icons.shopping_cart_outlined;
    }
  }

  Future<void> _deleteExpense() async {
    setState(() => _isLoading = true);
    try {
      // --- FIXED: Using positional arguments as defined in the service ---
      await _expenseService.deleteExpense(widget.tripId, widget.expenseData.id);
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Expense deleted successfully.')),
      );
      widget.onActionCompleted();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete expense: $e')),
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
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Deletion'),
        content: const Text('Are you sure you want to delete this expense? This action cannot be undone.'),
        actions: <Widget>[
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
            onPressed: () {
              Navigator.of(ctx).pop();
              _deleteExpense();
            },
          ),
        ],
      ),
    );
  }

  // --- NEW: Implemented the Edit Expense functionality ---
  void _showEditExpenseSheet() {
    final descriptionController = TextEditingController(text: widget.expenseData.description);
    final amountController = TextEditingController(text: widget.expenseData.amount.toString());
    var selectedCategory = widget.expenseData.category;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (BuildContext context, StateSetter setModalState) {
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, top: 20, left: 20, right: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Edit Expense', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextField(controller: descriptionController, decoration: const InputDecoration(labelText: 'Description')),
                TextField(controller: amountController, decoration: const InputDecoration(labelText: 'Amount'), keyboardType: TextInputType.number),
                DropdownButton<ExpenseCategory>(
                  value: selectedCategory,
                  isExpanded: true,
                  onChanged: (value) => setModalState(() => selectedCategory = value!),
                  items: ExpenseCategory.values.map((cat) => DropdownMenuItem(value: cat, child: Text(cat.displayName))).toList(),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _isLoading ? null : () async {
                    final newAmount = double.tryParse(amountController.text);
                    if (newAmount == null) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid amount.')));
                      return;
                    }
                    setState(() => _isLoading = true);
                    try {
                      await _expenseService.updateExpense(
                        tripId: widget.tripId,
                        expenseId: widget.expenseData.id,
                        description: descriptionController.text,
                        amount: newAmount,
                        category: selectedCategory,
                      );
                      if (!mounted) return;
                      Navigator.of(ctx).pop();
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Expense updated!')));
                      widget.onActionCompleted();
                    } catch (e) {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update: $e')));
                    } finally {
                      if (mounted) {
                        setState(() => _isLoading = false);
                      }
                    }
                  },
                  child: _isLoading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Changes'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 6.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(child: Icon(_getIconForCategory(widget.expenseData.category))),
        title: Text(widget.expenseData.description, style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        subtitle: Text(
          'Paid by ${widget.expenseData.paidBy.name} • ${DateFormat.yMMMd().format(widget.expenseData.createdAt)}',
          style: GoogleFonts.poppins(fontSize: 12),
        ),
        trailing: _isLoading
            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 3))
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '₹${widget.expenseData.amount.toStringAsFixed(2)}',
                    style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'edit') {
                        _showEditExpenseSheet();
                      } else if (value == 'delete') {
                        _showDeleteConfirmation();
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'edit', child: Text('Edit')),
                      const PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  ),
                ],
              ),
      ),
    );
  }
}