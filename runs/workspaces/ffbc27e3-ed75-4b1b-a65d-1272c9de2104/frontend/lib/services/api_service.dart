import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart' hide Transaction;
import 'package:firebase_auth/firebase_auth.dart';
import '../models/transaction_model.dart';
import '../models/budget_model.dart';

/// Direct Firestore storage; no HTTP server or localhost endpoint is used.
/// Each user's data is scoped to their Firebase Authentication UID.
class ApiService {
  final String userId;
  final FirebaseFirestore? _instance;
  final FirebaseAuth? _auth;
  ApiService(this.userId, {FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _instance = firestore,
        _auth = auth;
  FirebaseFirestore get _db => _instance ?? FirebaseFirestore.instance;
  CollectionReference<Map<String, dynamic>> _collection(String name) {
    if (userId.isEmpty ||
        (_auth ?? FirebaseAuth.instance).currentUser?.uid != userId) {
      throw StateError('Sign in before accessing your data.');
    }
    return _db.collection('users').doc(userId).collection(name);
  }

  Future<List<Transaction>> fetchTransactions() async {
    final snapshot = await _collection('transactions')
        .orderBy('date', descending: true)
        .get().timeout(const Duration(seconds: 20));
    return snapshot.docs
        .map((doc) => Transaction.fromJson({...doc.data(), 'id': doc.id}))
        .toList();
  }

  Future<List<BudgetModel>> fetchBudgets() async {
    final snapshot =
        await _collection('budgets').orderBy('date', descending: true).get().timeout(const Duration(seconds: 20));
    return snapshot.docs
        .map((doc) => BudgetModel.fromJson({...doc.data(), 'id': doc.id}))
        .toList();
  }

  Future<void> recordTransaction(Transaction value) async {
    if (!value.amount.isFinite ||
        value.amount == 0 ||
        value.category.trim().isEmpty) {
      throw ArgumentError('Provide a nonzero amount and a category.');
    }
    await _collection('transactions').add({
      'amount': value.amount,
      'category': value.category.trim(),
      'date': value.date.toUtc().toIso8601String(),
    }).timeout(const Duration(seconds: 20));
  }

  Future<void> setBudget(BudgetModel value) async {
    if (!value.amount.isFinite ||
        value.amount <= 0 ||
        value.category.trim().isEmpty) {
      throw ArgumentError('Provide a positive budget and a category.');
    }
    final date =
        '${value.date.year}-${value.date.month.toString().padLeft(2, '0')}-01T00:00:00.000Z';
    final id = base64Url.encode(
        utf8.encode('${date.substring(0, 7)}:${value.category.trim()}'));
    await _collection('budgets').doc(id).set({
      'amount': value.amount,
      'category': value.category.trim(),
      'date': date,
    }).timeout(const Duration(seconds: 20));
  }

  Future<void> deleteTransaction(String id) async {
    await _collection('transactions')
        .doc(id)
        .delete()
        .timeout(const Duration(seconds: 20));
  }
}
