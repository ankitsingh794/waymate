// lib/widgets/expense_summary_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ExpenseSummaryCard extends StatelessWidget {
  final Map<String, dynamic> summary;
  const ExpenseSummaryCard({super.key, required this.summary});

  @override
  Widget build(BuildContext context) {
    final List settlements = summary['settlements'] ?? [];
    final double totalSpent = (summary['totalSpent'] ?? 0).toDouble();
    final String currency = summary['currency'] ?? 'INR';

    return Card(
      margin: const EdgeInsets.all(16.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Total Trip Spending', style: GoogleFonts.poppins(fontSize: 14, color: Colors.black54)),
            const SizedBox(height: 4),
            Text('$currency ${totalSpent.toStringAsFixed(2)}', style: GoogleFonts.poppins(fontSize: 28, fontWeight: FontWeight.bold)),
            if (settlements.isNotEmpty) ...[
              const Divider(height: 24),
              Text('Settlement Plan', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...settlements.map((s) => _buildSettlementRow(s, currency)).toList(),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildSettlementRow(Map<String, dynamic> settlement, String currency) {
    // CORRECTED: Access the 'name' from the 'from' and 'to' objects
    final String fromUser = settlement['from']?['name'] ?? 'Unknown';
    final String toUser = settlement['to']?['name'] ?? 'Unknown';
    final double amount = (settlement['amount'] ?? 0).toDouble();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Text(fromUser, style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8.0),
                child: Icon(Icons.arrow_forward, size: 16),
              ),
              Text(toUser, style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
            ],
          ),
          Text(
            '$currency ${amount.toStringAsFixed(2)}',
            style: GoogleFonts.poppins(color: Colors.green.shade800, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}