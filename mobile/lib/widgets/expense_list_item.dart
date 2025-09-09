import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ExpenseListItem extends StatelessWidget {
  final Map<String, dynamic> expenseData;
  const ExpenseListItem({super.key, required this.expenseData});

  IconData _getIconForCategory(String category) {
    switch (category.toLowerCase()) {
      case 'food': return Icons.restaurant;
      case 'transport': return Icons.directions_bus;
      case 'accommodation': return Icons.hotel;
      case 'activities': return Icons.local_activity;
      default: return Icons.shopping_cart;
    }
  }

  // Helper method to show the delete confirmation dialog
  void _showDeleteConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext ctx) {
        return AlertDialog(
          title: const Text('Confirm Deletion'),
          content: const Text('Are you sure you want to delete this expense? This action cannot be undone.'),
          actions: <Widget>[
            TextButton(
              child: const Text('Cancel'),
              onPressed: () {
                Navigator.of(ctx).pop(); // Close the dialog
              },
            ),
            TextButton(
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Delete'),
              onPressed: () {
                // TODO: Add your API call to delete the expense here
                debugPrint('Deleting expense...');
                Navigator.of(ctx).pop(); // Close the dialog
              },
            ),
          ],
        );
      },
    );
  }

   @override
  Widget build(BuildContext context) {
    final String description = expenseData['description'] ?? 'No description';
    final double amount = (expenseData['amount'] ?? 0).toDouble();
    // CORRECTED: Access the 'name' from the 'paidBy' object
    final String paidBy = expenseData['paidBy']?['name'] ?? 'Unknown';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 6.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(child: Icon(_getIconForCategory(expenseData['category']))),
        title: Text(description, style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        subtitle: Text('Paid by $paidBy', style: GoogleFonts.poppins(fontSize: 12)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              // Assuming currency is INR based on your response
              '₹${amount.toStringAsFixed(2)}',
              style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'edit') {
                  debugPrint('Editing expense...');
                } else if (value == 'delete') {
                  _showDeleteConfirmation(context);
                }
              },
              itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                const PopupMenuItem<String>(value: 'edit', child: Text('Edit')),
                const PopupMenuItem<String>(value: 'delete', child: Text('Delete')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}