import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:expense_master/models/transaction_model.dart';
import 'package:expense_master/models/budget_model.dart';

class ApiService {
  final String _baseUrl = 'https://api.expensemaster.com/v1';

  Future<List<TransactionModel>> fetchTransactions(String userId) async {
    try {
      final response = await http.get(Uri.parse('$_baseUrl/transactions/$userId'));

      if (response.statusCode == 200) {
        List jsonResponse = json.decode(response.body);
        return jsonResponse.map((data) => TransactionModel.fromJson(data)).toList();
      } else {
        throw Exception('Failed to load transactions');
      }
    } catch (e) {
      print('Error fetching transactions: $e');
      rethrow;
    }
  }

  Future<void> recordTransaction(TransactionModel transaction) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/transactions'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(transaction.toJson()),
      );

      if (response.statusCode != 201) {
        throw Exception('Failed to record transaction');
      }
    } catch (e) {
      print('Error recording transaction: $e');
      rethrow;
    }
  }

  Future<List<BudgetModel>> fetchBudgets(String userId) async {
    try {
      final response = await http.get(Uri.parse('$_baseUrl/budgets/$userId'));

      if (response.statusCode == 200) {
        List jsonResponse = json.decode(response.body);
        return jsonResponse.map((data) => BudgetModel.fromJson(data)).toList();
      } else {
        throw Exception('Failed to load budgets');
      }
    } catch (e) {
      print('Error fetching budgets: $e');
      rethrow;
    }
  }

  Future<void> setBudget(BudgetModel budget) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/budgets'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(budget.toJson()),
      );

      if (response.statusCode != 201) {
        throw Exception('Failed to set budget');
      }
    } catch (e) {
      print('Error setting budget: $e');
      rethrow;
    }
  }
}