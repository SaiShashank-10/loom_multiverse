import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AccommodationScreen extends StatefulWidget {
  final String routePlanId;

  AccommodationScreen({required this.routePlanId});

  @override
  _AccommodationScreenState createState() => _AccommodationScreenState();
}

class _AccommodationScreenState extends State<AccommodationScreen> {
  List<dynamic> accommodations = [];
  bool isLoading = true;
  String errorMessage = '';

  @override
  void initState() {
    super.initState();
    fetchAccommodations();
  }

  Future<void> fetchAccommodations() async {
    try {
      final response = await http.get(
        Uri.parse('http://localhost:3001/accommodations/${widget.routePlanId}'),
        headers: {'Authorization': 'Bearer your_token_here'},
      );

      if (response.statusCode == 200) {
        setState(() {
          accommodations = json.decode(response.body);
          isLoading = false;
        });
      } else {
        throw Exception('Failed to load accommodations');
      }
    } catch (e) {
      setState(() {
        errorMessage = 'Error: $e';
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Accommodation Recommendations'),
      ),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : errorMessage.isNotEmpty
              ? Center(child: Text(errorMessage))
              : ListView.builder(
                  itemCount: accommodations.length,
                  itemBuilder: (context, index) {
                    return ListTile(
                      title: Text(accommodations[index]['name']),
                    );
                  },
                ),
    );
  }
}