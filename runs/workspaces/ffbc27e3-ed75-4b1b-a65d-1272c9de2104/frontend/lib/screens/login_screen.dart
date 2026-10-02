import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController(), password = TextEditingController();
  bool register = false, busy = false;
  String? error;
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await context
          .read<AuthService>()
          .login(email.text.trim(), password.text, register: register);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      body: Center(
          child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                  width: 380,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.account_balance_wallet,
                        size: 64, color: Colors.teal),
                    const Text('ExpenseMaster',
                        style: TextStyle(
                            fontSize: 32, fontWeight: FontWeight.bold)),
                    const Text('Track spending. Plan your month.'),
                    const SizedBox(height: 24),
                    TextField(
                        controller: email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(labelText: 'Email')),
                    TextField(
                        controller: password,
                        obscureText: true,
                        decoration: const InputDecoration(
                            labelText: 'Password (at least 8 characters)')),
                    if (error != null)
                      Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(error!,
                              style: const TextStyle(color: Colors.red))),
                    const SizedBox(height: 20),
                    FilledButton(
                        onPressed: busy ? null : submit,
                        child: Text(busy
                            ? 'Please wait…'
                            : register
                                ? 'Create account'
                                : 'Sign in')),
                    TextButton(
                        onPressed: busy
                            ? null
                            : () => setState(() => register = !register),
                        child: Text(register
                            ? 'Already have an account? Sign in'
                            : 'New here? Create account')),
                  ])))));
}
