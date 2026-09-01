import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> routePlans = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    fetchRoutePlans();
  }

  Future<void> fetchRoutePlans() async {
    try {
      final response = await http.get(
        Uri.parse('https://api.roadtripplanner.com/route_plans'),
        headers: {'Authorization': 'Bearer your_access_token'},
      );

      if (response.statusCode == 200) {
        setState(() {
          routePlans = json.decode(response.body);
          isLoading = false;
        });
      } else {
        throw Exception('Failed to load route plans');
      }
    } catch (e) {
      print('Error fetching route plans: $e');
      setState(() {
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('RoadTripPlanner'),
      ),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: routePlans.length,
              itemBuilder: (context, index) {
                final routePlan = routePlans[index];
                return ListTile(
                  title: Text(routePlan['name']),
                  subtitle: Text('Cities: ${routePlan['cities'].join(', ')}'),
                  onTap: () {
                    // Navigate to RoutePlanScreen with the selected route plan
                  },
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Navigate to RoutePlanScreen for creating a new route plan
        },
        child: Icon(Icons.add),
      ),
    );
  }
}