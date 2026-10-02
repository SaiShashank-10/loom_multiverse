import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../models/transaction_model.dart';
import '../../models/budget_model.dart';
import '../../services/auth_service.dart';
import '../../services/api_service.dart';
import '../../utils/date_utils.dart';
import '../login_screen.dart';
import '../../providers/dashboard_provider.dart';

class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final dashboardProvider = Provider.of<DashboardProvider>(context);

    if (!authService.isAuthenticated) {
      return LoginScreen();
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('ExpenseMaster Dashboard'),
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () async {
              await authService.logout();
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => LoginScreen()));
            },
          ),
        ],
      ),
      body: FutureBuilder<List<Transaction>>(
        future: dashboardProvider.fetchTransactions(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(child: Text('No transactions found.'));
          }

          List<Transaction> transactions = snapshot.data!;
          double totalIncome = 0;
          double totalExpenses = 0;

          for (var transaction in transactions) {
            if (transaction.amount > 0) {
              totalIncome += transaction.amount;
            } else {
              totalExpenses += transaction.amount.abs();
            }
          }

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Total Income: \$${totalIncome.toStringAsFixed(2)}', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text('Total Expenses: \$${totalExpenses.toStringAsFixed(2)}', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                SizedBox(height: 16),
                Text('Recent Transactions', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    itemCount: transactions.length,
                    itemBuilder: (context, index) {
                      Transaction transaction = transactions[index];
                      String formattedDate = DateFormat('MMM dd, yyyy').format(transaction.date);

                      return ListTile(
                        leading: Icon(transaction.amount > 0 ? Icons.arrow_upward : Icons.arrow_downward),
                        title: Text('${transaction.category}: \$${transaction.amount.abs().toStringAsFixed(2)}'),
                        subtitle: Text(formattedDate),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}