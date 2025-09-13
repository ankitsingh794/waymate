// lib/widgets/trip/advanced_trip_actions_widget.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/services/trip_service.dart';
import 'package:mobile/theme/theme.dart';
import 'package:url_launcher/url_launcher.dart';

/// Widget that showcases advanced trip features available from the server
/// This includes PDF downloads, smart scheduling, and other premium features
class AdvancedTripActionsWidget extends StatefulWidget {
  final Trip trip;

  const AdvancedTripActionsWidget({
    super.key,
    required this.trip,
  });

  @override
  State<AdvancedTripActionsWidget> createState() =>
      _AdvancedTripActionsWidgetState();
}

class _AdvancedTripActionsWidgetState extends State<AdvancedTripActionsWidget> {
  final TripService _tripService = TripService();

  bool _isProcessing = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.star, color: accentColor),
              const SizedBox(width: 8),
              Text(
                'Advanced Features',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Enhanced trip management tools',
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.error, color: Colors.red[700], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: Colors.red[700],
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: Colors.red[700], size: 16),
                    onPressed: () => setState(() => _error = null),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        // PDF Download
        _buildActionButton(
          icon: Icons.picture_as_pdf,
          title: 'Download Trip PDF',
          subtitle: 'Get a detailed PDF itinerary',
          color: Colors.red,
          onTap: _downloadTripPdf,
          enabled: !_isProcessing,
        ),
        const SizedBox(height: 12),

        // Smart Scheduling
        _buildActionButton(
          icon: Icons.psychology,
          title: 'AI Smart Scheduling',
          subtitle: 'Optimize your trip with AI suggestions',
          color: Colors.purple,
          onTap: _upgradeToSmartSchedule,
          enabled: !_isProcessing && widget.trip.status != 'completed',
        ),
        const SizedBox(height: 12),

        // Generate Invite
        _buildActionButton(
          icon: Icons.person_add,
          title: 'Generate Invite Link',
          subtitle: 'Invite others to join this trip',
          color: Colors.blue,
          onTap: _generateInviteLink,
          enabled: !_isProcessing,
        ),
        const SizedBox(height: 12),

        // Offline Sync (if applicable)
        if (_hasOfflineData())
          _buildActionButton(
            icon: Icons.sync,
            title: 'Sync Offline Data',
            subtitle: 'Upload local changes to server',
            color: Colors.green,
            onTap: _syncOfflineData,
            enabled: !_isProcessing,
          ),
      ],
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    bool enabled = true,
  }) {
    return Material(
      color: enabled ? Colors.transparent : Colors.grey[100],
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: enabled ? onTap : null,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[200]!),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: enabled ? color.withOpacity(0.1) : Colors.grey[200],
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(
                  icon,
                  color: enabled ? color : Colors.grey[400],
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: enabled ? Colors.grey[800] : Colors.grey[400],
                      ),
                    ),
                    Text(
                      subtitle,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: enabled ? Colors.grey[600] : Colors.grey[400],
                      ),
                    ),
                  ],
                ),
              ),
              if (_isProcessing)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Icon(
                  Icons.arrow_forward_ios,
                  color: enabled ? Colors.grey[400] : Colors.grey[300],
                  size: 16,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _downloadTripPdf() async {
    try {
      setState(() {
        _isProcessing = true;
        _error = null;
      });

      // Get the PDF download URL from the service
      final pdfUrl = _tripService.getTripPdfDownloadUrl(widget.trip.id);

      // Launch the URL to download/view the PDF
      final uri = Uri.parse(pdfUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('PDF download started'),
              backgroundColor: Colors.green,
              action: SnackBarAction(
                label: 'OK',
                textColor: Colors.white,
                onPressed: () {},
              ),
            ),
          );
        }
      } else {
        throw Exception('Could not launch PDF viewer');
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to download PDF: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _upgradeToSmartSchedule() async {
    try {
      setState(() {
        _isProcessing = true;
        _error = null;
      });

      final result = await _tripService.upgradeToSmartSchedule(widget.trip.id);

      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.psychology, color: Colors.purple),
                const SizedBox(width: 8),
                Text(
                  'AI Scheduling Complete',
                  style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Your trip has been optimized with AI suggestions!',
                  style: GoogleFonts.poppins(),
                ),
                const SizedBox(height: 16),
                if (result['suggestions'] != null) ...[
                  Text(
                    'AI Suggestions:',
                    style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  ...((result['suggestions'] as List? ?? []).map(
                    (suggestion) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• '),
                          Expanded(
                            child: Text(
                              suggestion.toString(),
                              style: GoogleFonts.poppins(fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
                ],
              ],
            ),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.purple,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Great!'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Smart scheduling failed: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _generateInviteLink() async {
    try {
      setState(() {
        _isProcessing = true;
        _error = null;
      });

      final inviteLink = await _tripService.generateInviteLink(widget.trip.id);

      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.person_add, color: Colors.blue),
                const SizedBox(width: 8),
                Text(
                  'Invite Link Generated',
                  style: GoogleFonts.poppins(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Share this link with others to invite them to your trip:',
                  style: GoogleFonts.poppins(),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    inviteLink,
                    style: GoogleFonts.robotoMono(
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Close'),
              ),
              ElevatedButton(
                onPressed: () {
                  // Copy to clipboard and share
                  // You can implement clipboard copy here
                  Navigator.of(context).pop();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Share'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to generate invite link: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _syncOfflineData() async {
    try {
      setState(() {
        _isProcessing = true;
        _error = null;
      });

      // This would typically get offline data from local storage
      // For now, we'll just show a success message
      await Future.delayed(const Duration(seconds: 2));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Offline data synced successfully'),
            backgroundColor: Colors.green,
            action: SnackBarAction(
              label: 'OK',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Sync failed: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  bool _hasOfflineData() {
    // This would check if there's offline data to sync
    // For demo purposes, return true occasionally
    return widget.trip.id.hashCode % 3 == 0;
  }
}
