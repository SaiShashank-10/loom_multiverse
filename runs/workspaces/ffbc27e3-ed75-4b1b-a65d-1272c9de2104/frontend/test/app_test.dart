import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:expense_master/main.dart';
import 'package:expense_master/services/auth_service.dart';
import 'package:expense_master/models/transaction_model.dart';
import 'package:expense_master/services/ml_service.dart';
import 'package:expense_master/utils/date_utils.dart' as dates;

void main() {
  testWidgets('unconfigured Firebase has clear setup instructions',
      (tester) async {
    await tester.pumpWidget(const FirebaseSetupApp(message: 'Not configured'));
    expect(find.text('Firebase setup required'), findsOneWidget);
    expect(find.textContaining('flutterfire configure'), findsOneWidget);
  });
  test('auth errors explain configuration and registration', () {
    expect(AuthService.authErrorMessage('operation-not-allowed'),
        contains('Enable Email/Password'));
    expect(AuthService.authErrorMessage('invalid-credential'),
        contains('create an account'));
  });
  testWidgets('login and registration are reachable', (tester) async {
    await tester
        .pumpWidget(MyApp(authService: AuthService(listenToSession: false)));
    expect(find.text('ExpenseMaster'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
    await tester.tap(find.text('New here? Create account'));
    await tester.pump();
    expect(find.text('Create account'), findsOneWidget);
  });
  test('estimate excludes income and other months', () {
    final now = DateTime(2026, 9, 10);
    final tx = [
      Transaction(id: '1', amount: -100, category: 'Food', date: now),
      Transaction(id: '2', amount: 500, category: 'Pay', date: now),
      Transaction(
          id: '3', amount: -500, category: 'Food', date: DateTime(2026, 8, 1))
    ];
    expect(MLService().estimateMonth(tx, now), 300);
  });
  test('month arithmetic clamps end of month', () {
    expect(dates.DateUtils.addMonths(DateTime(2026, 1, 31), 1),
        DateTime(2026, 2, 28));
  });
}
