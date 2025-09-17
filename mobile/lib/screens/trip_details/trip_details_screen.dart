import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mobile/models/expense_models.dart'
    as expense_models; // Add prefix
import 'package:mobile/models/trip_models.dart';
import 'package:mobile/models/user_model.dart'; // Keep this without prefix
import 'package:mobile/screens/chat/group_chat_screen.dart';
import 'package:mobile/screens/trip_details/itinerary_tab.dart';
import 'package:mobile/utils/logger.dart';
import 'package:mobile/screens/trip_details/manage_members_screen.dart';
import 'package:mobile/screens/trip_details/edit_trip_screen.dart';
import 'package:mobile/services/chat_service.dart';
import 'package:mobile/services/expense_service.dart';
import 'package:mobile/services/trip_service.dart';
import 'package:mobile/services/user_service.dart';
import 'package:mobile/services/socket_service.dart';
import 'package:mobile/widgets/expense_summary_card.dart';
import 'package:mobile/screens/expenses/expense_management_screen.dart';
import 'package:mobile/widgets/place_card.dart';
import 'package:url_launcher/url_launcher.dart';

class TripDetailsScreen extends StatefulWidget {
  final String tripId;

  const TripDetailsScreen({super.key, required this.tripId});

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TripService _tripService = TripService();
  final ExpenseService _expenseService = ExpenseService();
  final ChatService _chatService = ChatService();
  final UserService _userService =
      UserService(); // --- NEW: Instantiate UserService ---
  bool _isNavigatingToChat = false;

  late Future<Trip> _tripDetailsFuture;
  late Future<expense_models.TripExpenseBundle> _expenseFuture; // Use prefix
  late Future<User> _userFuture; // --- NEW: Future to get the current user ---

  final Map<String, IconData> _weatherIcons = {
    'sunny': Icons.wb_sunny_outlined,
    'clear': Icons.nightlight_round_outlined,
    'partly cloudy': Icons.cloud_outlined,
    'cloudy': Icons.cloud,
    'rain': Icons.grain,
    'showers': Icons.shower,
    'thunderstorm': Icons.thunderstorm_outlined,
    'snow': Icons.ac_unit,
    'mist': Icons.blur_on,
    'default': Icons.thermostat,
  };

  final SocketService _socketService = SocketService();
  StreamSubscription? _alertSubscription;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this, initialIndex: 0);
    _loadTripData();
    _userFuture = _userService.getUserProfile(); // --- NEW: Fetch the user ---

    _alertSubscription = _socketService.onNewTravelAlert.listen((alertData) {
      if (mounted && alertData['tripId'] == widget.tripId) {
        debugPrint("Alert received for current trip. Reloading data...");
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(alertData['message'] ?? 'New travel alert received!'),
            backgroundColor: Colors.orange.shade800,
          ),
        );
        _reloadData();
      }
    });
  }

  void _loadTripData() {
    _tripDetailsFuture = _tripService.getTripById(widget.tripId);
    _expenseFuture = _expenseService.getExpensesForTrip(widget.tripId);
  }

  void _reloadData() {
    setState(() {
      _loadTripData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _alertSubscription?.cancel();
    super.dispose();
  }

  Future<void> _toggleFavorite(Trip trip) async {
    try {
      final isNowFavorite = await _tripService.toggleFavoriteStatus(trip.id);

      // Check if widget is still mounted before updating state or using context
      if (!mounted) {
        logger.d(
            "_toggleFavorite: Widget is no longer mounted, skipping UI updates");
        return;
      }

      setState(() {
        // Optimistically update the UI
        _tripDetailsFuture =
            Future.value(trip.copyWith(favorite: isNowFavorite));
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(isNowFavorite
                ? 'Added to favorites!'
                : 'Removed from favorites.')),
      );
    } catch (e) {
      // Only show error if widget is still mounted
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  // --- NEW: Method to launch PDF download URL ---
  Future<void> _downloadPdf(Trip trip) async {
    final url = Uri.parse(_tripService.getTripPdfDownloadUrl(trip.id));
    if (!await launchUrl(url)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not launch the download link.')),
      );
    }
  }

  // --- NEW: Method to update trip status ---
  Future<void> _updateStatus(Trip trip, String status) async {
    try {
      final updatedTrip = await _tripService.updateTripStatus(trip.id, status);
      setState(() {
        _tripDetailsFuture = Future.value(updatedTrip);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Trip has been $status.')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  // --- NEW: Confirmation dialog for canceling a trip ---
  void _showCancelConfirmation(Trip trip) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Trip'),
        content: const Text(
            'Are you sure you want to cancel this trip? This action cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Keep Trip')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.of(ctx).pop();
              _updateStatus(trip, 'canceled');
            },
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteTrip(String tripId) async {
    try {
      await _tripService.deleteTrip(tripId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Trip deleted successfully.')));
        // Pop back to the previous screen since this one no longer exists
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed to delete trip: $e')));
      }
    }
  }

  // --- NEW: Confirmation dialog for deleting a trip ---
  void _showDeleteConfirmation(Trip trip) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Trip'),
        content: const Text(
            'Are you sure you want to permanently delete this trip? This action cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.of(ctx).pop();
              _deleteTrip(trip.id);
            },
            child: const Text('Yes, Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: Future.wait([_tripDetailsFuture, _userFuture]),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
              body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.hasError) {
          return Scaffold(
              body: Center(child: Text('Error: ${snapshot.error}')));
        }
        if (!snapshot.hasData) {
          return const Scaffold(body: Center(child: Text('Trip not found.')));
        }

        final Trip trip = snapshot.data![0];
        final User currentUser = snapshot.data![1];

        return _buildContent(trip, currentUser);
      },
    );
  }

  Widget _buildContent(Trip trip, User currentUser) {
    final member = trip.group?.members.firstWhere(
            (m) => m.user.id == currentUser.id,
            orElse: () => Member(user: currentUser, role: 'viewer')) ??
        Member(user: currentUser, role: 'viewer');
    final bool canEdit = member.role == 'owner' || member.role == 'editor';
    final bool isOwner = member.role == 'owner';

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            backgroundColor: const Color(0xFF0E3B4C),
            expandedHeight: 250.0,
            pinned: true,
            centerTitle: true,

            // PART 1: The standard AppBar title.
            // This is only visible when the header is COLLAPSED.
            // The AppBar widget automatically handles spacing with action buttons.
            title: Text(
              trip.destination,
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            // PART 2: The FlexibleSpaceBar for the EXPANDED header.
            // We manually place a large title in the background and leave the
            // main 'title' property of the FlexibleSpaceBar empty.
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // Your background image with its overlay
                  Image.network(
                    trip.coverImage ?? 'https://via.placeholder.com/400',
                    fit: BoxFit.cover,
                    color: Colors.black.withOpacity(0.5),
                    colorBlendMode: BlendMode.darken,
                  ),

                  // Manually position the large title for the expanded view
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: kToolbarHeight +
                        16, // Positioned safely above the TabBar
                    child: Text(
                      trip.destination,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 28, // A larger, more impactful font size
                        shadows: [
                          const Shadow(blurRadius: 4.0, color: Colors.black87),
                        ],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

            bottom: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: Colors.white,
              unselectedLabelColor:
                  const Color.fromARGB(255, 0, 0, 0).withOpacity(0.7),
              indicatorColor: Colors.cyanAccent,
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Itinerary'),
                Tab(text: 'Details'),
                Tab(text: 'Expenses'),
              ],
            ),
            actions: [
              IconButton(
                icon: Icon(
                    trip.favorite ? Icons.favorite : Icons.favorite_border,
                    color: trip.favorite ? Colors.red : Colors.white),
                onPressed: () => _toggleFavorite(trip),
              ),
              _isNavigatingToChat
                  ? const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2)),
                    )
                  : IconButton(
                      icon: const Icon(Icons.chat_bubble_outline),
                      onPressed: _openChat,
                    ),
              PopupMenuButton<String>(
                onSelected: (value) async {
                  if (value == 'Edit Trip') {
                    final updatedTrip = await Navigator.push<Trip>(
                        context,
                        MaterialPageRoute(
                            builder: (context) => EditTripScreen(trip: trip)));
                    if (updatedTrip != null) _reloadData();
                  } else if (value == 'Manage Members') {
                    final result = await Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (context) =>
                                ManageMembersScreen(trip: trip)));
                    if (result == true) _reloadData();
                  } else if (value == 'Expense Management') {
                    _navigateToExpenseManagement(trip);
                  } else if (value == 'Download PDF') {
                    _downloadPdf(trip);
                  } else if (value == 'Cancel Trip') {
                    _showCancelConfirmation(trip);
                  } else if (value == 'Delete Trip') {
                    _showDeleteConfirmation(trip);
                  }
                },
                itemBuilder: (context) => [
                  // --- UPDATED: Conditionally show edit/delete options ---
                  if (canEdit)
                    const PopupMenuItem<String>(
                        value: 'Edit Trip', child: Text('Edit Trip Details')),
                  const PopupMenuItem<String>(
                      value: 'Manage Members', child: Text('Manage Members')),
                  const PopupMenuItem<String>(
                      value: 'Expense Management',
                      child: Text('Expense Management')),
                  const PopupMenuItem<String>(
                      value: 'Download PDF',
                      child: Text('Download Itinerary (PDF)')),
                  if (canEdit)
                    const PopupMenuItem<String>(
                        value: 'Cancel Trip', child: Text('Cancel Trip')),
                  if (isOwner)
                    const PopupMenuItem<String>(
                        value: 'Delete Trip',
                        child: Text('Delete Trip',
                            style: TextStyle(color: Colors.red))),
                ],
              ),
            ],
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(trip),
            ItineraryTab(
                trip: trip,
                currentUser: currentUser,
                onItineraryUpdated: _reloadData),
            _buildDetailsTab(trip),
            _buildExpensesTab(trip),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewTab(Trip trip) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildAlerts(trip),
          _buildQuickActionsCard(trip),
          const SizedBox(height: 16),
          _buildWeatherForecast(trip),
          const SizedBox(height: 16),
          if (trip.aiSummary != null) _buildAiSummaryCard(trip.aiSummary!),
          const SizedBox(height: 16),
          _buildRecommendationsSection("Top Attractions", trip.attractions),
          const SizedBox(height: 16),
          _buildRecommendationsSection(
              "Recommended Eats", trip.foodRecommendations),
          const SizedBox(height: 16),
          _buildRecommendationsSection(
              "Accommodation Suggestions", trip.accommodationSuggestions),
        ],
      ),
    );
  }

  Widget _buildDetailsTab(Trip trip) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text("Trip Status"),
                subtitle: Text(trip.status?.toUpperCase() ?? 'UNKNOWN'),
              ),
              ListTile(
                leading: const Icon(Icons.work_outline),
                title: const Text("Purpose"),
                subtitle: Text(trip.purpose
                        ?.replaceAll('_', ' ')
                        .split(' ')
                        .map((word) =>
                            '${word[0].toUpperCase()}${word.substring(1)}')
                        .join(' ') ??
                    'Not specified'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildSectionHeader("Budget Breakdown"),
        Card(
            child: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.attach_money),
              title: Text("Total Estimated Budget",
                  style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
              subtitle: Text(
                  "${trip.budget?.total ?? 'N/A'} ${trip.preferences?.currency ?? 'INR'}",
                  style: const TextStyle(fontSize: 16)),
            ),
            const Divider(indent: 16, endIndent: 16),
            ListTile(
                leading: const Icon(Icons.flight_takeoff),
                title: const Text("Travel"),
                subtitle: Text(
                    "${trip.budget?.travel ?? 'N/A'} ${trip.preferences?.currency ?? 'INR'}")),
            ListTile(
                leading: const Icon(Icons.hotel_outlined),
                title: const Text("Accommodation"),
                subtitle: Text(
                    "${trip.budget?.accommodation ?? 'N/A'} ${trip.preferences?.currency ?? 'INR'}")),
            ListTile(
                leading: const Icon(Icons.local_activity_outlined),
                title: const Text("Activities"),
                subtitle: Text(
                    "${trip.budget?.activities ?? 'N/A'} ${trip.preferences?.currency ?? 'INR'}")),
            ListTile(
                leading: const Icon(Icons.fastfood_outlined),
                title: const Text("Food"),
                subtitle: Text(
                    "${trip.budget?.food ?? 'N/A'} ${trip.preferences?.currency ?? 'INR'}")),
          ],
        )),
      ],
    );
  }

  Widget _buildExpensesTab(Trip trip) {
    return FutureBuilder<expense_models.TripExpenseBundle>(
      future: _expenseFuture,
      builder: (context, snapshot) {
        debugPrint('🔍 Expense Future State: ${snapshot.connectionState}');

        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          debugPrint('❌ Expense Error: ${snapshot.error}');
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  'Unable to load expense data',
                  style: GoogleFonts.poppins(fontSize: 18, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: () => _navigateToExpenseManagement(trip),
                  icon: const Icon(Icons.manage_accounts),
                  label: const Text('Open Expense Management'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0E3B4C),
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          );
        }

        final expenseBundle = snapshot.data;
        final hasExpenses =
            expenseBundle != null && expenseBundle.expenses.isNotEmpty;

        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Expense Summary Card (if data available)
              if (expenseBundle != null)
                ExpenseSummaryCard(summary: expenseBundle.summary),

              const SizedBox(height: 20),

              // Main Action Card
              Card(
                elevation: 4,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Icon(
                        hasExpenses
                            ? Icons.account_balance_wallet
                            : Icons.receipt_long_outlined,
                        size: 64,
                        color: const Color(0xFF0E3B4C),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        hasExpenses
                            ? 'Manage Your Expenses'
                            : 'Start Tracking Expenses',
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        hasExpenses
                            ? 'View analytics, manage budgets, and organize your trip expenses'
                            : 'Add and track expenses, set budgets, and manage trip finances',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => _navigateToExpenseManagement(trip),
                          icon: const Icon(Icons.launch),
                          label: const Text('Open Expense Management'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0E3B4C),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            textStyle: GoogleFonts.poppins(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Quick Actions
              if (hasExpenses) ...[
                Text(
                  'Quick Actions',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _openExpenseManagement(trip),
                        icon: const Icon(Icons.add),
                        label: const Text('Add Expense'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ExpenseManagementScreen(
                              tripId: trip.id,
                              trip: trip,
                            ),
                          ),
                        ).then((_) => _reloadData()),
                        icon: const Icon(Icons.analytics),
                        label: const Text('Analytics'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ] else ...[
                // For empty state, show quick add button
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _openExpenseManagement(trip),
                    icon: const Icon(Icons.add),
                    label: const Text('Add Your First Expense'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: Color(0xFF0E3B4C)),
                      foregroundColor: const Color(0xFF0E3B4C),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildAlerts(Trip trip) {
    if (trip.alerts.isEmpty) {
      return const SizedBox.shrink();
    }
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: Colors.amber.shade100,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Important Alerts",
                style: GoogleFonts.poppins(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            ...trip.alerts.map((alert) => Text("⚠️ $alert",
                style: TextStyle(color: Colors.red.shade900))),
          ],
        ),
      ),
    );
  }

  Widget _buildWeatherForecast(Trip trip) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader("Weather Forecast"),
        SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: trip.weather.length,
            itemBuilder: (context, index) {
              final forecast = trip.weather[index];
              final conditionKey = forecast.condition.toLowerCase();
              final icon =
                  _weatherIcons[conditionKey] ?? _weatherIcons['default']!;
              return Card(
                child: Container(
                  width: 100,
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                          forecast.date != null
                              ? DateFormat('EEE, d').format(forecast.date!)
                              : 'No date',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      Icon(icon,
                          size: 36, color: Theme.of(context).primaryColor),
                      Text(forecast.temp, style: const TextStyle(fontSize: 16)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAiSummaryCard(AiSummary summary) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader("AI Trip Summary"),
            Text(summary.overview),
            const Divider(height: 24),
            _buildBulletedList("Highlights", summary.highlights),
            _buildBulletedList("Travel Tips", summary.tips),
            _buildBulletedList("Must-Eat Foods", summary.mustEats),
            _buildBulletedList("Packing Checklist", summary.packingChecklist),
          ],
        ),
      ),
    );
  }

  Widget _buildBulletedList(String title, List<String> items) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600, fontSize: 16)),
          ...items.map((item) => Text("• $item")),
        ],
      ),
    );
  }

  Widget _buildRecommendationsSection(
      String title, List<Recommendation> recommendations) {
    if (recommendations.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(title),
        SizedBox(
          height: 200,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: recommendations.length,
            itemBuilder: (context, index) =>
                PlaceCard(placeData: recommendations[index]),
          ),
        ),
      ],
    );
  }

  void _openExpenseManagement(Trip trip) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ExpenseManagementScreen(
          tripId: trip.id,
          trip: trip,
        ),
      ),
    ).then((_) => _reloadData());
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Text(title,
          style:
              GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
    );
  }

  void _openChat() async {
    if (!mounted) return;

    setState(() => _isNavigatingToChat = true);

    try {
      final existingSession =
          await _chatService.getSessionForTrip(widget.tripId);

      if (!mounted) return;

      setState(() => _isNavigatingToChat = false);

      if (existingSession != null) {
        // FIX: Navigate immediately without async/await
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => GroupChatScreen(session: existingSession),
          ),
        );
      } else {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('No Chat Session'),
            content: const Text(
              'No chat session exists for this trip yet. Chat sessions are automatically created when trip members join.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isNavigatingToChat = false);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not access chat: ${e.toString()}'),
            action: SnackBarAction(
              label: 'Retry',
              onPressed: _openChat,
            ),
          ),
        );
      }
    }
  }

  Widget _buildQuickActionsCard(Trip trip) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quick Actions',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _navigateToExpenseManagement(trip),
                    icon: const Icon(Icons.account_balance_wallet),
                    label: const Text('Manage Expenses'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0E3B4C),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _openExpenseManagement(trip),
                    icon: const Icon(Icons.add),
                    label: const Text('Add Expense'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToExpenseManagement(Trip trip) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ExpenseManagementScreen(
          tripId: trip.id,
          trip: trip,
        ),
      ),
    ).then((_) => _reloadData());
  }
}
