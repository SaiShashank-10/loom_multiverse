import 'package:flutter_test/flutter_test.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:firebase_auth_mocks/firebase_auth_mocks.dart';
import 'package:expense_master/services/auth_service.dart';
import 'package:expense_master/services/api_service.dart';
import 'package:expense_master/models/transaction_model.dart';
import 'package:expense_master/models/budget_model.dart';

void main() {
  test('Firebase sign-in and logout update client state', () async {
    final auth = MockFirebaseAuth(
        mockUser: MockUser(uid: 'alice', email: 'alice@example.com'));
    final service = AuthService(firebaseAuth: auth);
    await service.login('alice@example.com', 'password123');
    expect(service.user?.id, 'alice');
    await service.logout();
    expect(service.isAuthenticated, false);
    service.dispose();
  });
  test('Firestore transactions and budgets use the signed-in UID', () async {
    final store = FakeFirebaseFirestore();
    final auth =
        MockFirebaseAuth(signedIn: true, mockUser: MockUser(uid: 'alice'));
    final api = ApiService('alice', firestore: store, auth: auth);
    await api.recordTransaction(Transaction(
        id: '', amount: -42, category: 'Food', date: DateTime(2026, 9, 7)));
    final records = await api.fetchTransactions();
    expect(records.single.amount, -42);
    expect(
        (await store
                .collection('users')
                .doc('bob')
                .collection('transactions')
                .get())
            .docs,
        isEmpty);
    await api.setBudget(BudgetModel(
        id: '', amount: 100, category: 'Food', date: DateTime(2026, 9, 7)));
    await api.setBudget(BudgetModel(
        id: '', amount: 150, category: 'Food', date: DateTime(2026, 9, 8)));
    expect((await api.fetchBudgets()).single.amount, 150);
    await api.deleteTransaction(records.single.id);
    expect(await api.fetchTransactions(), isEmpty);
    final wrongUserApi = ApiService('bob', firestore: store, auth: auth);
    await expectLater(wrongUserApi.fetchTransactions(), throwsStateError);
  });
}
