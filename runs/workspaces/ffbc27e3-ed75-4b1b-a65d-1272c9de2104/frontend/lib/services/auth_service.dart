import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../models/user_model.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth? _instance;
  StreamSubscription<User?>? _subscription;
  UserModel? user;
  bool initializing = true;
  String? sessionError;
  FirebaseAuth get _auth => _instance ?? FirebaseAuth.instance;

  AuthService({FirebaseAuth? firebaseAuth, bool listenToSession = true})
      : _instance = firebaseAuth {
    if (listenToSession) {
      _subscription =
          _auth.authStateChanges().listen(_updateUser, onError: (Object error) {
        initializing = false;
        sessionError =
            'Could not restore your Firebase session. Please sign in again.';
        notifyListeners();
      });
    } else {
      initializing = false;
    }
  }

  bool get isAuthenticated => user != null;
  void _updateUser(User? value) {
    user = value == null
        ? null
        : UserModel(id: value.uid, email: value.email ?? '');
    initializing = false;
    sessionError = null;
    notifyListeners();
  }

  Future<void> login(String email, String password,
      {bool register = false}) async {
    try {
      final credential = register
          ? await _auth.createUserWithEmailAndPassword(
              email: email.trim(), password: password)
          : await _auth.signInWithEmailAndPassword(
              email: email.trim(), password: password);
      _updateUser(credential.user);
    } on FirebaseAuthException catch (error) {
      throw Exception(authErrorMessage(error.code));
    }
  }

  static String authErrorMessage(String code) => switch (code) {
        'email-already-in-use' =>
          'This email already has an account. Choose Sign in.',
        'invalid-email' => 'Enter a valid email address.',
        'weak-password' =>
          'Choose a stronger password (at least 8 characters).',
        'invalid-credential' ||
        'wrong-password' ||
        'user-not-found' =>
          'Email or password is incorrect. If this is your first Firebase sign-in, create an account.',
        'operation-not-allowed' =>
          'Enable Email/Password in Firebase Console > Authentication > Sign-in method.',
        'network-request-failed' =>
          'Cannot reach Firebase. Check the device internet connection.',
        'too-many-requests' =>
          'Too many attempts. Wait a moment and try again.',
        'user-disabled' => 'This account has been disabled.',
        _ =>
          'Firebase sign-in failed ($code). Check your Firebase configuration.',
      };

  Future<void> logout() async {
    await _auth.signOut();
    _updateUser(null);
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
