class BudgetModel {
  final String id;
  final double amount;
  final String category;
  final DateTime date;

  BudgetModel({
    required this.id,
    required this.amount,
    required this.category,
    required this.date,
  });

  factory BudgetModel.fromJson(Map<String, dynamic> json) {
    return BudgetModel(
      id: json['id'] as String,
      amount: (json['amount'] as num).toDouble(),
      category: json['category'] as String,
      date: DateTime.parse(json['date'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'amount': amount,
      'category': category,
      'date': date.toIso8601String(),
    };
  }
}
