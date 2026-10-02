import '../models/transaction_model.dart';

/// Transparent baseline estimate; no trained AI model has been configured.
class MLService {
  double estimateMonth(List<Transaction> transactions, DateTime now) {
    final spent = transactions
        .where((t) =>
            t.amount < 0 &&
            t.date.year == now.year &&
            t.date.month == now.month &&
            !t.date.isAfter(now))
        .fold(0.0, (sum, t) => sum - t.amount);
    return spent / now.day * DateTime(now.year, now.month + 1, 0).day;
  }
}
