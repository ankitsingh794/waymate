// lib/widgets/expense_summary_card.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/expense_models.dart'; // Import your new models

class ExpenseSummaryCard extends StatelessWidget {
  // --- UPDATED: Using the strongly-typed ExpenseSummary model ---
  final ExpenseSummary summary;
  const ExpenseSummaryCard({super.key, required this.summary});

  @override
  Widget build(BuildContext context) {
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
            // Accessing data from the model properties is cleaner
            Text('${summary.currency} ${summary.totalSpent.toStringAsFixed(2)}', style: GoogleFonts.poppins(fontSize: 28, fontWeight: FontWeight.bold)),
            if (summary.settlements.isNotEmpty) ...[
              const Divider(height: 24),
              Text('Settlement Plan', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              // Mapping over the typed List<Settlement>
              ...summary.settlements.map((s) => _buildSettlementRow(s, summary.currency)),
            ]
          ],
        ),
      ),
    );
  }

  // --- UPDATED: This method now accepts a Settlement object ---
  Widget _buildSettlementRow(Settlement settlement, String currency) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    settlement.from.name, // FIX: Access name property
                    style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8.0),
                  child: Icon(Icons.arrow_forward, size: 16),
                ),
                Flexible(
                  child: Text(
                    settlement.to.name, // FIX: Access name property
                    style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          Text(
            '$currency ${settlement.amount.toStringAsFixed(2)}',
            style: GoogleFonts.poppins(
              color: Colors.green.shade800,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}