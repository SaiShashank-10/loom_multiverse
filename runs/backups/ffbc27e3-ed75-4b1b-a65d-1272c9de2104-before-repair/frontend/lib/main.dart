import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:expense_master/screens/dashboard_screen.dart';
import 'package:expense_master/screens/login_screen.dart';
import 'package:expense_master/models/user_model.dart';
import 'package:expense_master/services/auth_service.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => AuthService(),
      child: MaterialApp(
        title: 'ExpenseMaster',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
        ),
        home: StreamBuilder<UserModel>(
          stream: Provider.of<AuthService>(context).userStream,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.active) {
              final user = snapshot.data;
              return user != null ? DashboardScreen() : LoginScreen();
            } else {
              return Center(child: CircularProgressIndicator());
            }
          },
        ),
      ),
    );
  }
}