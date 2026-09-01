import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class BillSplittingScreen extends StatefulWidget {
  @override
  _BillSplittingScreenState createState() => _BillSplittingScreenState();
}

class _BillSplittingScreenState extends State<BillSplittingScreen> {
  final TextEditingController _amountController = TextEditingController();
  List<Map<String, dynamic>> _bills = [];

  Future<void> fetchBills(String routePlanId) async {
    try {
      final response = await http.get(
        Uri.parse('https://api.roadtripplanner.com/bills/$routePlanId'),
        headers: {'Authorization': 'Bearer YOUR_ACCESS_TOKEN'},
      );

      if (response.statusCode == 200) {
        setState(() {
          _bills = json.decode(response.body);
        });
      } else {
        throw Exception('Failed to load bills');
      }
    } catch (e) {
      print(e);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error fetching bills')),
      );
    }
  }

  Future<void> createBill(String routePlanId, double amount) async {
    try {
      final response = await http.post(
        Uri.parse('https://api.roadtripplanner.com/bills/$routePlanId'),
        headers: {'Authorization': 'Bearer YOUR_ACCESS_TOKEN', 'Content-Type': 'application/json'},
        body: jsonEncode({'amount': amount}),
      );

      if (response.statusCode == 201) {
        fetchBills(routePlanId);
      } else {
        throw Exception('Failed to create bill');
      }
    } catch (e) {
      print(e);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating bill')),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    fetchBills('YOUR_ROUTE_PLAN_ID');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Bill Splitting')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: 'Amount'),
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                if (_amountController.text.isNotEmpty) {
                  double amount = double.parse(_amountController.text);
                  createBill('YOUR_ROUTE_PLAN_ID', amount);
                  _amountController.clear();
                }
              },
              child: Text('Add Bill'),
            ),
            SizedBox(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: _bills.length,
                itemBuilder: (context, index) {
                  return ListTile(
                    title: Text(_bills[index]['amount'].toString()),
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