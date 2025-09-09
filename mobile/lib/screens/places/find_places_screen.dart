// lib/screens/places/find_places_screen.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/widgets/place_result_card.dart';

class FindPlacesScreen extends StatefulWidget {
  const FindPlacesScreen({super.key});

  @override
  State<FindPlacesScreen> createState() => _FindPlacesScreenState();
}

class _FindPlacesScreenState extends State<FindPlacesScreen> {
  // Using your API response as our mock data
  final List<Map<String, dynamic>> _searchResults = const [
    {
      "name": "Banjara",
      "address": "Bindal Mall, Marine Dr Rd, Ashiana Gardens, Sonari, Jamshedpur...",
      "rating": 4.4,
      "reason": "A family favorite with a 4.4-star rating that turns picky eaters into adventurous foodies.",
      "imageUrl": "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=ATKogpdQV1M44w6IDN5TenJyhA0N-bU_tmg3psoSyHaa25vWD3EPIetOseNur6SjDQADPUeXhZr8Y1FbUYu7zniPbYdOBEJ7zKMmYwaOpMk_Ms7E4pI_ssNiSdX_Q17x3dLo5tAFr9VJL2xlhoHgTHMNa-GrmeKsNiiORTQFnRJLShtwUqlMwnIY_oTxLx8Syqyf8Q_OXNV7veDHtS_bT0C4ulJXN-sifim7PJ3pmkpvu2M8c8xYYO9yWH_kJLwo09HULqxn4SRXilEhByefjIVBXXpfjlGi4_vPLQ1HDzKPGoP1h3kjckj765N2afoxi_ghC0bETYyBOylz_SOoOsGNq_O8gZWHDJKF2FrBEoD9bQ5rOPexDOZ-J8SaF2Bj9HLFAHbSI4udOdvAGJEtymeUUwJkO62RoVfpBwOyCnGVbvUMCTSpXJca8zxh3brGWmXSjrOyiUlfS2R2FkCv2CBR3tebM-TwBD7HsxCGzKUDF5OKhVHsTEHnurfk4TFFMkbz96fj7ds_uh-NKYSqwbSXmjbpSM9Y38Bd89jTVT_XluGdwoHv5-49NpmZxjDBUtr1YOPkGZfq&key=AIzaSyCDAk7Y1j9OOyG3B2PZ5t9MH8-zAgMV9cQ"
    },
    {
      "name": "Aurous Restro Lounge | Best Restaurant in Bistupur-Jamshedpur",
      "address": "1st floor, shangrilla tower, Bistupur Main Rd, beside bharat cycle store...",
      "rating": 4.3,
      "reason": "Where the 'best in Bistupur' title meets generous portions for multigenerational feasting.",
      "imageUrl": "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=ATKogpc9iGO-pu9RwcBj_wuBPpVOYdyAsBNl11RnUQdapyJPjZbUKPmvMFqONS36khDeRs9S5b1Frn-Na6ZVAu1UPpeoPjXaUs-ZfJilcrWCEMqfI5xobhKcjT56JjsfJGYYdh5RM2mTtoGTJCnOystS9Y1XeC_wsO9NYjDmxtls4q_Ko2qOEBJWMFhM5WOkUsqwq_qOgPp5z8Y9hkrVqM4PYB1Kb_1vWrl9gr-1ZAy5XGzBjwx-OEfiD1flehUOx0en805Ga2cLphH3ccoXtHivbzj781kkH8J9h_zSCMy9iA8qr_6rxto&key=AIzaSyCDAk7Y1j9OOyG3B2PZ5t9MH8-zAgMV9cQ"
    },
    {
      "name": "One Step Restaurant",
      "address": "75, O Road, Road Number 5, Gurudwara area, bistupur...",
      "rating": 4.1,
      "reason": "Your family’s perfect dinner step—easy ambiance and dishes everyone can agree on.",
      "imageUrl": "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=ATKogpeZMppl902qnWUolCwJIjGFlv1QhXgTqQv-BVp8XwvhomwIFzy9y_BaRjfxrQEFFIR6_VmlaWWjhhHAJUiSgDifWwfvrlnhe0fgC_wvzWtnWrVJ9cpVXDMIk-f7UH-yg1byzfWBe-HNCpTIgP0M33tU7UImmel-RAzLRd6Dt61Nz_yb7gpJXfT5TSldp3PmSilTCUCRiBUNApG7S8p0g2SujanusDieadVEXaDSlQYAM0W5WG0qHYnwqh4gaFHeh8i6d8uOIDDUu83p9UW6keQq8ANtAySsOuabk80aeRBOJRfRhAY&key=AIzaSyCDAk7Y1j9OOyG3B2PZ5t9MH8-zAgMV9cQ"
    }
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Find Places', style: GoogleFonts.poppins()),
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          Expanded(
            child: ListView.builder(
              itemCount: _searchResults.length,
              itemBuilder: (context, index) {
                return PlaceResultCard(placeData: _searchResults[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: TextField(
        decoration: InputDecoration(
          hintText: 'e.g., "restaurants near me"',
          prefixIcon: const Icon(Icons.search),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(30.0),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(30.0),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
        ),
        onSubmitted: (query) {
          // TODO: Call API to get real search results
        },
      ),
    );
  }
}