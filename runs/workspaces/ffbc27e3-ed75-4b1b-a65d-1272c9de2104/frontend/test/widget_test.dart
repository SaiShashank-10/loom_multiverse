import 'package:flutter_test/flutter_test.dart';
import 'package:expense_master/models/transaction_model.dart';

void main() {
  test('transaction JSON preserves amounts', () {
    final value = Transaction.fromJson({
      'id': '1',
      'amount': -25,
      'category': 'Food',
      'date': '2026-09-07T00:00:00Z'
    });
    expect(value.toJson()['amount'], -25.0);
  });
}
