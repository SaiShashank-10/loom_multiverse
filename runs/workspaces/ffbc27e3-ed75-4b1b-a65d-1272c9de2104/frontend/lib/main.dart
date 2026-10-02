import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'screens/dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform);
    runApp(const MyApp());
  } catch (error) {
    runApp(FirebaseSetupApp(message: error.toString()));
  }
}

class FirebaseSetupApp extends StatelessWidget {
  final String message;
  const FirebaseSetupApp({super.key, required this.message});
  @override
  Widget build(BuildContext context) => MaterialApp(
          home: Scaffold(
              body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: SizedBox(
              width: 560,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.settings, size: 56),
                const Text('Firebase setup required',
                    style: TextStyle(fontSize: 26)),
                const SizedBox(height: 16),
                const SelectableText(
                    'Follow frontend/FIREBASE_SETUP.md. Run flutterfire configure --platforms=android,web in the frontend folder, then stop and restart the app.'),
                const SizedBox(height: 16),
                SelectableText(message),
              ])),
        ),
      )));
}

class MyApp extends StatelessWidget {
  final AuthService? authService;
  const MyApp({super.key, this.authService});
  @override
  Widget build(BuildContext context) => ChangeNotifierProvider(
        create: (_) => authService ?? AuthService(),
        child: MaterialApp(
            title: 'ExpenseMaster',
            theme: ThemeData(colorSchemeSeed: Colors.teal, useMaterial3: true),
            home: Consumer<AuthService>(builder: (context, auth, child) {
              if (auth.initializing)
                return const Scaffold(
                    body: Center(child: CircularProgressIndicator()));
              return auth.isAuthenticated
                  ? DashboardScreen(key: ValueKey(auth.user!.id))
                  : const LoginScreen();
            })),
      );
}
