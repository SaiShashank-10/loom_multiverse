import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/transaction_model.dart';
import '../models/budget_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/ml_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<Transaction> transactions = [];
  List<BudgetModel> budgets = [];
  bool busy = true;
  String? error;
  ApiService get api => ApiService(context.read<AuthService>().user!.id);
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final tx = await api.fetchTransactions();
      final values = await api.fetchBudgets();
      if (mounted)
        setState(() {
          transactions = tx;
          budgets = values;
          error = null;
        });
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> edit({bool budget = false}) async {
    final amount = TextEditingController(), category = TextEditingController();
    bool income = false;
    final value = await showDialog<Map<String, dynamic>>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
            builder: (context, update) => AlertDialog(
                  title: Text(budget
                      ? 'Set monthly category budget'
                      : 'Record transaction'),
                  content: Column(mainAxisSize: MainAxisSize.min, children: [
                    TextField(
                        controller: category,
                        decoration: const InputDecoration(
                            labelText: 'Category, e.g. Food')),
                    TextField(
                        controller: amount,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        decoration: const InputDecoration(
                            labelText: 'Amount (positive)')),
                    if (!budget)
                      SwitchListTile(
                          title: const Text('Income'),
                          value: income,
                          onChanged: (v) => update(() => income = v)),
                  ]),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(dialogContext),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () {
                          final number = double.tryParse(amount.text);
                          if (number == null ||
                              !number.isFinite ||
                              number <= 0 ||
                              category.text.trim().isEmpty) return;
                          Navigator.pop(dialogContext, {
                            'amount': number * (budget || income ? 1 : -1),
                            'category': category.text.trim()
                          });
                        },
                        child: const Text('Save'))
                  ],
                )));
    // Dialog animations may still hold the controllers until the next frame.
    await Future<void>.delayed(const Duration(milliseconds: 300));
    amount.dispose();
    category.dispose();
    if (value == null || !mounted) return;
    try {
      if (budget) {
        await api.setBudget(BudgetModel(
            id: '',
            amount: value['amount'],
            category: value['category'],
            date: DateTime.now()));
      } else {
        await api.recordTransaction(Transaction(
            id: '',
            amount: value['amount'],
            category: value['category'],
            date: DateTime.now()));
      }
      await load();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final month = transactions
        .where((t) => t.date.year == now.year && t.date.month == now.month)
        .toList();
    final income =
        month.where((t) => t.amount > 0).fold(0.0, (sum, t) => sum + t.amount);
    final spending =
        month.where((t) => t.amount < 0).fold(0.0, (sum, t) => sum - t.amount);
    final categories = <String, double>{};
    for (final t in month.where((t) => t.amount < 0)) {
      categories.update(t.category, (n) => n - t.amount,
          ifAbsent: () => -t.amount);
    }
    final sorted = categories.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return Scaffold(
        appBar: AppBar(title: const Text('ExpenseMaster'), actions: [
          IconButton(
              tooltip: 'Refresh',
              onPressed: load,
              icon: const Icon(Icons.refresh)),
          IconButton(
              tooltip: 'Sign out',
              onPressed: () async {
                try {
                  await context.read<AuthService>().logout();
                } catch (e) {
                  if (mounted) setState(() => error = e.toString());
                }
              },
              icon: const Icon(Icons.logout)),
        ]),
        body: busy
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: load,
                child: ListView(padding: const EdgeInsets.all(24), children: [
                  Text('This month • ${now.month}/${now.year}',
                      style: Theme.of(context).textTheme.headlineSmall),
                  if (error != null)
                    Text(error!, style: const TextStyle(color: Colors.red)),
                  Wrap(spacing: 16, runSpacing: 8, children: [
                    summary('Income', income),
                    summary('Spent', spending),
                    summary('Balance', income - spending)
                  ]),
                  const SizedBox(height: 20),
                  Wrap(spacing: 12, children: [
                    FilledButton.icon(
                        onPressed: () => edit(),
                        icon: const Icon(Icons.add),
                        label: const Text('Add transaction')),
                    OutlinedButton(
                        onPressed: () => edit(budget: true),
                        child: const Text('Set budget'))
                  ]),
                  const SizedBox(height: 24),
                  Text('Spending by category',
                      style: Theme.of(context).textTheme.titleLarge),
                  if (categories.isEmpty)
                    const Text('Add an expense to see your spending chart.'),
                  for (final entry in sorted)
                    Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  '${entry.key}: ${entry.value.toStringAsFixed(2)}'),
                              LinearProgressIndicator(
                                  value: spending == 0
                                      ? 0
                                      : entry.value / spending,
                                  minHeight: 12)
                            ])),
                  const SizedBox(height: 20),
                  Text('Monthly budgets',
                      style: Theme.of(context).textTheme.titleLarge),
                  for (final budget in budgets.where((b) =>
                      b.date.year == now.year && b.date.month == now.month))
                    ListTile(
                        title: Text(budget.category),
                        subtitle: Text(
                            '${(categories[budget.category] ?? 0).toStringAsFixed(2)} of ${budget.amount.toStringAsFixed(2)}'),
                        trailing: Text(
                            (categories[budget.category] ?? 0) > budget.amount
                                ? 'Over budget'
                                : 'On track')),
                  const SizedBox(height: 20),
                  Text('Insights',
                      style: Theme.of(context).textTheme.titleLarge),
                  Text(
                      'Spending-rate estimate for this month: ${MLService().estimateMonth(month, now).toStringAsFixed(2)}. This extrapolates spending so far; it is not an AI prediction.'),
                  if (sorted.isNotEmpty)
                    Text(
                        'Review ${sorted.first.key}, your largest spending category, for optional expenses you could reduce.'),
                  const SizedBox(height: 20),
                  Text('Transactions',
                      style: Theme.of(context).textTheme.titleLarge),
                  if (transactions.isEmpty)
                    const Text(
                        'No transactions yet. Add income or an expense above.'),
                  for (final t in transactions)
                    ListTile(
                        leading: Icon(t.amount > 0
                            ? Icons.arrow_downward
                            : Icons.arrow_upward),
                        title: Text(t.category),
                        subtitle:
                            Text(t.date.toLocal().toString().substring(0, 10)),
                        trailing:
                            Row(mainAxisSize: MainAxisSize.min, children: [
                          Text(t.amount.toStringAsFixed(2)),
                          IconButton(
                              tooltip: 'Delete transaction',
                              onPressed: () async {
                                try {
                                  await api.deleteTransaction(t.id);
                                  await load();
                                } catch (e) {
                                  if (mounted)
                                    setState(() => error = e.toString());
                                }
                              },
                              icon: const Icon(Icons.delete_outline))
                        ])),
                ])));
  }

  Widget summary(String title, double value) => SizedBox(
      width: 180,
      child: Card(
          child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title),
                    Text(value.toStringAsFixed(2),
                        style: const TextStyle(
                            fontSize: 26, fontWeight: FontWeight.bold))
                  ]))));
}
