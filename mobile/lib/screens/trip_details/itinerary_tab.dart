import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/services/api_client.dart';
import 'package:mobile/services/trip_service.dart';
import 'package:intl/intl.dart'; // Add this import for date formatting

class ItineraryTab extends StatefulWidget {
  final Trip trip;
  final User currentUser;
  final VoidCallback onItineraryUpdated;

  const ItineraryTab({
    super.key,
    required this.trip,
    required this.currentUser,
    required this.onItineraryUpdated,
  });

  @override
  State<ItineraryTab> createState() => _ItineraryTabState();
}

class _ItineraryTabState extends State<ItineraryTab> {
  final TripService _tripService = TripService();
  bool _isEditing = false;
  bool _isLoading = false;

  late Map<int, List<TextEditingController>> _activityControllers;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    _activityControllers = {};
    for (var day in widget.trip.itinerary) {
      _activityControllers[day.day] = day.activities
          .map((activity) => TextEditingController(text: activity))
          .toList();
    }
  }

  Future<void> _saveDayItinerary(int day) async {
    setState(() => _isLoading = true);
    try {
      final updatedActivities = _activityControllers[day]!
          .map((controller) => controller.text.trim())
          .where((activity) => activity.isNotEmpty)
          .toList();

      await _tripService.updateDayItinerary(
          widget.trip.id, day, updatedActivities);

      setState(() => _isEditing = false);
      widget.onItineraryUpdated();
    } on ApiException catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _generateSmartSchedule() async {
    setState(() => _isLoading = true);
    try {
      await _tripService.upgradeToSmartSchedule(widget.trip.id);
      widget.onItineraryUpdated();
    } on ApiException catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _activityControllers.forEach((_, controllers) {
      for (var controller in controllers) {
        controller.dispose();
      }
    });
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentUserRole = widget.trip.group?.members
            .firstWhere((m) => m.user.id == widget.currentUser.id,
                orElse: () => Member(user: widget.currentUser, role: 'viewer'))
            .role ??
        'viewer';
    final canEdit = currentUserRole == 'owner' || currentUserRole == 'editor';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Itinerary'),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 1,
        actions: [
          if (canEdit)
            TextButton(
              onPressed: () {
                setState(() {
                  _isEditing = !_isEditing;
                  if (!_isEditing) _initializeControllers();
                });
              },
              child: Text(_isEditing ? 'Cancel' : 'Edit'),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // FIX: Show trip duration and summary
                _buildTripOverviewCard(),

                const SizedBox(height: 16),

                // Show smart schedule section
                if (widget.trip.smartSchedule == null)
                  _buildGenerateScheduleCard(canEdit)
                else
                  _buildSmartScheduleView(widget.trip.smartSchedule!),

                const Divider(height: 32),

                // FIX: Enhanced day cards with rich data
                ...widget.trip.itinerary.map((day) {
                  return _isEditing
                      ? _buildEditableDayCard(day)
                      : _buildEnhancedReadOnlyDayCard(day);
                }).toList(),

                // FIX: Show empty state if no itinerary
                if (widget.trip.itinerary.isEmpty) _buildEmptyItineraryCard(),
              ],
            ),
    );
  }

  // NEW: Trip overview card with dates and summary
  Widget _buildTripOverviewCard() {
    final dateFormatter = DateFormat('MMM dd, yyyy');
    final daysDifference =
        widget.trip.endDate.difference(widget.trip.startDate).inDays + 1;

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.calendar_month,
                    color: Theme.of(context).primaryColor),
                const SizedBox(width: 8),
                Text(
                  '${dateFormatter.format(widget.trip.startDate)} - ${dateFormatter.format(widget.trip.endDate)}',
                  style: GoogleFonts.poppins(
                      fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '$daysDifference days in ${widget.trip.destination}',
              style: GoogleFonts.poppins(
                  fontSize: 14, color: Colors.grey.shade600),
            ),
            if (widget.trip.aiSummary?.overview != null) ...[
              const SizedBox(height: 12),
              Text(
                widget.trip.aiSummary!.overview,
                style: GoogleFonts.poppins(fontSize: 14),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildGenerateScheduleCard(bool canEdit) {
    return Card(
      color: Theme.of(context).primaryColor.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Icon(Icons.model_training_outlined,
                size: 40, color: Theme.of(context).primaryColor),
            const SizedBox(height: 8),
            Text(
              'Upgrade to a Smart Schedule',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Get AI-powered train recommendations for your journey.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            if (canEdit)
              ElevatedButton(
                onPressed: _generateSmartSchedule,
                child: const Text('Generate Now'),
              )
            else
              Text('Ask the trip owner to generate a schedule.',
                  style: GoogleFonts.poppins()),
          ],
        ),
      ),
    );
  }

  Widget _buildSmartScheduleView(SmartSchedule schedule) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Smart Train Schedule',
            style:
                GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(
          '${schedule.sourceStation} to ${schedule.destinationStation}',
          style: GoogleFonts.poppins(fontSize: 16, color: Colors.grey.shade700),
        ),
        const SizedBox(height: 8),
        ...schedule.options.map((option) {
          final isRecommended = option == schedule.options.first;
          return _SmartScheduleOptionCard(
              option: option, isRecommended: isRecommended);
        })
      ],
    );
  }

  // FIX: Enhanced read-only day card with time parsing and better formatting
  Widget _buildEnhancedReadOnlyDayCard(ItineraryDay day) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Day header with enhanced styling
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Day ${day.day}',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).primaryColor,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    day.title,
                    style: GoogleFonts.poppins(
                        fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // FIX: Enhanced activities display with time formatting
            ...day.activities.asMap().entries.map((entry) {
              String activity = entry.value;

              // Extract time if present (format: "HH:MM AM/PM - Activity")
              String? timeString;
              String activityText = activity;

              final timeMatch =
                  RegExp(r'^(\d{1,2}:\d{2}\s?(?:AM|PM))\s*-\s*(.+)')
                      .firstMatch(activity);
              if (timeMatch != null) {
                timeString = timeMatch.group(1);
                activityText = timeMatch.group(2) ?? activity;
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Time column
                    SizedBox(
                      width: 80,
                      child: timeString != null
                          ? Text(
                              timeString,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context).primaryColor,
                              ),
                            )
                          : Container(),
                    ),

                    // Activity content
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border(
                            left: BorderSide(
                              width: 3,
                              color:
                                  Theme.of(context).primaryColor.withOpacity(0.3),
                            ),
                          ),
                        ),
                        child: Text(
                          activityText,
                          style: GoogleFonts.poppins(fontSize: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildEditableDayCard(ItineraryDay day) {
    final controllers = _activityControllers[day.day]!;
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Editing Day ${day.day}: ${day.title}',
                style: GoogleFonts.poppins(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ...List.generate(controllers.length, (index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: controllers[index],
                        decoration: InputDecoration(
                          hintText: 'Activity ${index + 1}',
                          isDense: true,
                        ),
                        maxLines: 2,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline,
                          color: Colors.red),
                      onPressed: () =>
                          setState(() => controllers.removeAt(index)),
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  icon: const Icon(Icons.add),
                  label: const Text('Add Activity'),
                  onPressed: () =>
                      setState(() => controllers.add(TextEditingController())),
                ),
                ElevatedButton(
                  onPressed: () => _saveDayItinerary(day.day),
                  child: const Text('Save Day'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // NEW: Empty state when no itinerary exists
  Widget _buildEmptyItineraryCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          children: [
            Icon(Icons.event_note, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              'No Itinerary Available',
              style: GoogleFonts.poppins(
                  fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Your detailed day-by-day itinerary will appear here once generated.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmartScheduleOptionCard extends StatelessWidget {
  final SmartScheduleOption option;
  final bool isRecommended;

  const _SmartScheduleOptionCard(
      {required this.option, required this.isRecommended});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isRecommended ? Colors.green : Colors.transparent,
          width: 1.5,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isRecommended)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Recommended Option',
                  style: GoogleFonts.poppins(
                    color: Colors.green,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(option.trainName ?? 'N/A',
                  style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
              subtitle: Text(option.trainNumber ?? ''),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('${option.departureTime} - ${option.arrivalTime}',
                      style: GoogleFonts.poppins(fontSize: 12)),
                  Text(option.duration ?? '',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            if (option.recommendationReason?.isNotEmpty == true)
              Text(
                option.recommendationReason!,
                style: GoogleFonts.poppins(
                  fontStyle: FontStyle.italic,
                  color: Colors.grey.shade600,
                  fontSize: 13,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
