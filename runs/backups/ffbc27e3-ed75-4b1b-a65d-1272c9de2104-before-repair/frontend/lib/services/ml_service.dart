import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:expense_master/models/transaction_model.dart';

class MLService {
  final String _apiUrl = 'https://your-ml-service-endpoint.com/predict';

  Future<List<Transaction>> getPredictedExpenses(List<Transaction> transactions) async {
    try {
      final response = await http.post(
        Uri.parse(_apiUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(transactions.map((tx) => tx.toJson()).toList()),
      );

      if (response.statusCode == 200) {
        final List<dynamic> predictions = jsonDecode(response.body);
        return predictions.map((prediction) => Transaction.fromJson(prediction)).toList();
      } else {
        throw Exception('Failed to load predictions');
      }
    } catch (e) {
      print('Error fetching predictions: $e');
      rethrow;
    }
  }
}