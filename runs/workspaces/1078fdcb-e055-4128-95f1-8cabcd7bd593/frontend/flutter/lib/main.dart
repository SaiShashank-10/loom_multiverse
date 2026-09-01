import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/home_screen.dart';
import 'screens/route_plan_screen.dart';
import 'screens/accommodation_screen.dart';
import 'screens/pass_document_screen.dart';
import 'screens/bill_splitting_screen.dart';
import 'providers/user_provider.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => UserProvider(),
      child: MaterialApp(
        title: 'RoadTripPlanner',
        theme: ThemeData(
          primarySwatch: Colors.blue,
        ),
        initialRoute: '/',
        routes: {
          '/': (context) => HomeScreen(),
          '/route_plan': (context) => RoutePlanScreen(),
          '/accommodation': (context) => AccommodationScreen(),
          '/pass_document': (context) => PassDocumentScreen(),
          '/bill_splitting': (context) => BillSplittingScreen(),
        },
      ),
    );
  }
}