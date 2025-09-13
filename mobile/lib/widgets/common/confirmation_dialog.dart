// lib/widgets/common/confirmation_dialog.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ConfirmationDialog extends StatelessWidget {
  final String title;
  final String message;
  final List<String> options;
  final Function(String) onConfirm;

  const ConfirmationDialog({
    super.key,
    required this.title,
    required this.message,
    required this.options,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(title, style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
      content: Text(message, style: GoogleFonts.poppins()),
      actions: <Widget>[
        ...options.map((option) => TextButton(
          child: Text(option),
          onPressed: () {
            onConfirm(option);
            Navigator.of(context).pop();
          },
        )),
        TextButton(
          child: const Text('Dismiss', style: TextStyle(color: Colors.grey)),
          onPressed: () {
            Navigator.of(context).pop();
          },
        ),
      ],
    );
  }
}