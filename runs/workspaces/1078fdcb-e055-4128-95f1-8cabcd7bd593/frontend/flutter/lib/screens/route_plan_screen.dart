import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class RoutePlanScreen extends StatefulWidget {
  @override
  _RoutePlanScreenState createState() => _RoutePlanScreenState();
}

class _RoutePlanScreenState extends State<RoutePlanScreen> {
  final List<String> cities = [];
  final TextEditingController cityController = TextEditingController();

  Future<void> addCity(String city) async {
    if (city.isNotEmpty) {
      setState(() {
        cities.add(city);
        cityController.clear();
      });
      await saveRoutePlan();
    }
  }

  Future<void> saveRoutePlan() async {
    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/route_plans'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'cities': cities}),
      );

      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Route plan saved successfully')),
        );
      } else {
        throw Exception('Failed to save route plan');
      }
    } catch (e) {
      print(e);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving route plan')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Route Plan'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: cityController,
              decoration: InputDecoration(labelText: 'City'),
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => addCity(cityController.text),
              child: Text('Add City'),
            ),
            SizedBox(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: cities.length,
                itemBuilder: (context, index) {
                  return ListTile(
                    title: Text(cities[index]),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}