import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/widgets/expense_list_item.dart';
import 'package:mobile/widgets/expense_summary_card.dart';
import 'package:mobile/widgets/itinerary_item_card.dart';
import 'package:mobile/screens/chat/group_chat_screen.dart';
import 'package:mobile/screens/trip_details/manage_members_screen.dart';
import 'package:mobile/widgets/place_card.dart';
import 'package:mobile/screens/trip_details/smart_schedule_screen.dart';

class TripDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> tripData;

  const TripDetailsScreen({
    super.key,
    required this.tripData,
  });

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final detailedTripData = {
    "coverImage":
        "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1996&auto=format&fit=crop",
    "aiSummary": {
      "overview":
          "Your 7-day trip to Rome is a deep dive into ancient history and vibrant culture. Expect to be amazed by architectural marvels, indulge in world-class cuisine, and soak up the lively atmosphere of the Eternal City.",
      "highlights": [
        "Ancient History",
        "Art & Culture",
        "Italian Cuisine",
        "City Exploration"
      ],
    },
    "weather": {
      "forecast": [
        {"day": 1, "date": "Sep 3", "temp": "28°C", "condition": "Sunny"},
        {"day": 2, "date": "Sep 4", "temp": "27°C", "condition": "Cloudy"},
        {"day": 3, "date": "Sep 5", "temp": "26°C", "condition": "Rainy"},
      ]
    },
    "group": {
      "members": [
        {"name": "Ankit", "avatarUrl": "https://i.pravatar.cc/150?u=ankit"},
        {"name": "Sarah", "avatarUrl": "https://i.pravatar.cc/150?u=sarah"},
        {"name": "John", "avatarUrl": "https://i.pravatar.cc/150?u=john"},
      ]
    },
    "itinerary": [
      {
        "sequence": 1,
        "day": 1,
        "type": "travel",
        "startTime": "2025-09-03T09:00:00.000Z",
        "description": "Flight to Rome"
      },
      {
        "sequence": 2,
        "day": 1,
        "type": "accommodation",
        "startTime": "2025-09-03T14:00:00.000Z",
        "description": "Check-in at Hotel Romanico Palace"
      },
      {
        "sequence": 1,
        "day": 2,
        "type": "activity",
        "startTime": "2025-09-04T10:00:00.000Z",
        "description": "Tour the Colosseum"
      },
    ],
    "expenses": [
      {
        "description": "Team Dinner",
        "category": "Food",
        "amount": 85.50,
        "paidBy": "Sarah"
      },
      {
        "description": "Museum Tickets",
        "category": "Activities",
        "amount": 48.00,
        "paidBy": "Ankit"
      },
    ],
    "summary": {
      "totalSpent": 133.50,
      "currency": "\$",
      "settlements": [
        {"from": "Ankit", "to": "Sarah", "amount": 19.50}
      ]
    }
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    // This listener is important to show/hide the FAB when switching tabs
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<T> _safelyCastList<T>(dynamic list) {
    if (list is List) {
      return List<T>.from(list.cast<T>());
    }
    return [];
  }

  @override
  Widget build(BuildContext context) {
    final String destination =
        detailedTripData['destinationName'] as String? ?? 'Unknown Location';
    final String coverImage = detailedTripData['coverImage'] as String? ?? '';

    return Scaffold(
      // ADDED: The FloatingActionButton is now correctly placed here
      floatingActionButton: _tabController.index == 2
          ? FloatingActionButton(
              onPressed: _showAddExpenseSheet,
              child: const Icon(Icons.add),
            )
          : null,
      body: NestedScrollView(
        headerSliverBuilder: (BuildContext context, bool innerBoxIsScrolled) {
          return <Widget>[
            SliverAppBar(
              expandedHeight: 250.0,
              pinned: true,
              backgroundColor: const Color.fromARGB(255, 14, 59, 76),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => Navigator.of(context).pop(),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.chat_bubble_outline,
                      color: Colors.white),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            GroupChatScreen(tripName: destination),
                      ),
                    );
                  },
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, color: Colors.white),
                  onSelected: (value) {
                    // UPDATE THIS LOGIC
                    if (value == 'Manage Members') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) =>
                              ManageMembersScreen(tripData: detailedTripData),
                        ),
                      );
                    }
                  },
                  itemBuilder: (BuildContext context) {
                    return {'Manage Members', 'Invite Friends', 'Edit Trip'}
                        .map((String choice) {
                      return PopupMenuItem<String>(
                        value: choice,
                        child: Text(choice),
                      );
                    }).toList();
                  },
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                centerTitle: true,
                titlePadding: const EdgeInsets.only(bottom: 56.0),
                title: Text(
                  destination,
                  style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 20),
                ),
                background: Image.network(
                  coverImage,
                  fit: BoxFit.cover,
                  color: Colors.black.withOpacity(0.5),
                  colorBlendMode: BlendMode.darken,
                ),
              ),
              // The TabBar is now the bottom element
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: Colors.white,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white70,
                labelStyle: GoogleFonts.poppins(fontWeight: FontWeight.bold),
                unselectedLabelStyle: GoogleFonts.poppins(),
                tabs: const [
                  Tab(text: 'Overview'),
                  Tab(text: 'Itinerary'),
                  Tab(text: 'Expenses'),
                ],
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(),
            _buildItineraryTab(),
            _buildExpensesTab(),
          ],
        ),
      ),
    );
  }
  // ---- WIDGETS FOR THE OVERVIEW TAB ----

  Widget _buildOverviewTab() {
    final summary =
        detailedTripData['aiSummary'] as Map<String, dynamic>? ?? {};
    final alerts = _safelyCastList<String>(detailedTripData['alerts']);
    final attractions =
        _safelyCastList<Map<String, dynamic>>(detailedTripData['attractions']);
    final food = _safelyCastList<Map<String, dynamic>>(
        detailedTripData['foodRecommendations']);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // NEW: Trip Alerts Section
          if (alerts.isNotEmpty) ...[
            _buildAlertCard(alerts.first),
            const SizedBox(height: 24),
          ],

          _buildSectionHeader("AI Trip Summary"),
          _buildAiSummary(summary),
          const SizedBox(height: 24),

          // NEW: AI Tips, Must-Eats, and Packing List
          _buildInfoCard("✨ AI Tips", List<String>.from(summary['tips'] ?? []),
              Icons.lightbulb_outline),
          const SizedBox(height: 16),
          _buildInfoCard(
              "🍴 Must-Eats",
              List<String>.from(summary['mustEats'] ?? []),
              Icons.restaurant_menu_outlined),
          const SizedBox(height: 16),
          _buildInfoCard(
              "🧳 Packing Checklist",
              List<String>.from(summary['packingChecklist'] ?? []),
              Icons.check_box_outline_blank),
          const SizedBox(height: 24),

          // NEW: Attractions Section
          _buildSectionHeader("Top Attractions"),
          _buildHorizontalPlaceList(attractions),
          const SizedBox(height: 24),

          // NEW: Food Recommendations Section
          _buildSectionHeader("Food Recommendations"),
          _buildHorizontalPlaceList(food),
          const SizedBox(height: 24),

          _buildSectionHeader("Weather Forecast"),
          _buildWeatherForecast((detailedTripData['weather']
                  as Map<String, dynamic>?)?['forecast'] as List? ??
              []),
          const SizedBox(height: 24),

          _buildSectionHeader("Trip Members"),
          _buildMembersSection((detailedTripData['group']
                  as Map<String, dynamic>?)?['members'] as List? ??
              []),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildAlertCard(String alertText) {
    return Card(
      color: Colors.amber.shade100,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.amber.shade800),
            const SizedBox(width: 12),
            Expanded(
                child: Text(alertText,
                    style: GoogleFonts.poppins(
                        color: Colors.amber.shade900,
                        fontWeight: FontWeight.w500))),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(String title, List<String> items, IconData icon) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: GoogleFonts.poppins(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...items
                .map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(icon,
                              size: 18, color: Theme.of(context).primaryColor),
                          const SizedBox(width: 8),
                          Expanded(
                              child: Text(item,
                                  style: GoogleFonts.poppins(fontSize: 15))),
                        ],
                      ),
                    ))
                .toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildHorizontalPlaceList(List<Map<String, dynamic>> places) {
    if (places.isEmpty) return const Text('No recommendations available.');
    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: places.length,
        itemBuilder: (context, index) {
          return PlaceCard(placeData: places[index]);
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(title,
          style:
              GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildAiSummary(Map<String, dynamic> summary) {
    List<String> highlights = List<String>.from(summary['highlights'] ?? []);
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(summary['overview'] ?? '',
                style:
                    GoogleFonts.poppins(fontSize: 15, color: Colors.black87)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8.0,
              runSpacing: 4.0,
              children: highlights
                  .map((highlight) => Chip(label: Text(highlight)))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeatherForecast(List forecast) {
    IconData _getWeatherIcon(String condition) {
      switch (condition.toLowerCase()) {
        case 'sunny':
          return Icons.wb_sunny;
        case 'cloudy':
          return Icons.cloud;
        case 'rainy':
          return Icons.water_drop;
        default:
          return Icons.thermostat;
      }
    }

    return SizedBox(
      height: 120,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: forecast.length,
        itemBuilder: (context, index) {
          final day = forecast[index];
          return Card(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Container(
              width: 80,
              padding: const EdgeInsets.all(8.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(day['date'],
                      style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Icon(_getWeatherIcon(day['condition']),
                      size: 28, color: Colors.blueAccent),
                  const SizedBox(height: 8),
                  Text(day['temp'], style: GoogleFonts.poppins()),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMembersSection(List members) {
    return SizedBox(
      height: 60,
      child: Row(
        children: [
          ...members
              .map((member) => Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: CircleAvatar(
                      radius: 25,
                      backgroundImage: NetworkImage(member['avatarUrl']),
                    ),
                  ))
              .toList(),
          const CircleAvatar(
            radius: 25,
            backgroundColor: Colors.grey,
            child: Icon(Icons.add, color: Colors.white),
          ),
        ],
      ),
    );
  }

  // In lib/screens/trip_details/trip_details_screen.dart

Widget _buildItineraryTab() {
  final Map<String, dynamic>? smartSchedule = detailedTripData['smartSchedule'] as Map<String, dynamic>?;
  final List itineraryItems = detailedTripData['itinerary'] as List;

  // Group items by day
  final Map<int, List<dynamic>> groupedByDay = {};
  for (var item in itineraryItems) {
    groupedByDay.putIfAbsent(item['day'], () => []).add(item);
  }

  if (itineraryItems.isEmpty && smartSchedule == null) {
    return Center(child: Text("No itinerary planned yet.", style: GoogleFonts.poppins()));
  }

  // Use a regular ListView for a mixed list of widgets
  return ListView(
    padding: const EdgeInsets.all(16.0),
    children: [
      if (smartSchedule != null) ...[
        ElevatedButton.icon(
          icon: const Icon(Icons.train_outlined),
          label: const Text('View Smart Train Schedule'),
          onPressed: () {
            Navigator.push(context, MaterialPageRoute(builder: (context) => const SmartScheduleScreen()));
          },
        ),
        const Divider(height: 32),
      ],
      
      ...groupedByDay.entries.map((entry) {
        final day = entry.key;
        final itemsForDay = entry.value;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 16.0, top: 8.0),
              child: Text(
                'Day $day',
                style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ),
            ...itemsForDay.map((item) {
              final isLast = item == itemsForDay.last;
              return ItineraryItemCard(itemData: item, isLastItem: isLast);
            }).toList(),
            const SizedBox(height: 24),
          ],
        );
      }).toList(),
    ],
  );
}

  Widget _buildExpensesTab() {
    final List expenses = detailedTripData['expenses'] as List;
    final Map<String, dynamic> summary =
        detailedTripData['summary'] as Map<String, dynamic>;

    return Column(
      children: [
        ExpenseSummaryCard(summary: summary),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.only(top: 0, bottom: 80),
            itemCount: expenses.length,
            itemBuilder: (context, index) {
              return ExpenseListItem(expenseData: expenses[index]);
            },
          ),
        ),
      ],
    );
  }

  // MOVED INSIDE THE CLASS
  void _showAddExpenseSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        // Use a different context name to avoid confusion
        return Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              top: 20,
              left: 20,
              right: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Add New Expense',
                  style: GoogleFonts.poppins(
                      fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),
              TextFormField(
                  decoration: const InputDecoration(labelText: 'Description')),
              const SizedBox(height: 12),
              TextFormField(
                  decoration: const InputDecoration(
                      labelText: 'Amount', prefixText: '\$')),
              const SizedBox(height: 20),
              CheckboxListTile(
                title: const Text('Split equally with all members'),
                value: true,
                onChanged: (val) {},
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Add Expense'),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }
}
