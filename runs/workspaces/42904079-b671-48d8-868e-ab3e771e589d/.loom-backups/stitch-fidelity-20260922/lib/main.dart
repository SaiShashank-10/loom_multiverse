import 'package:flutter/material.dart';
import 'screens/mobile_home_screen.dart';
import 'screens/mobile_closet_and_wardrobe_grid_screen.dart';
import 'screens/ai_wardrobe_scan_and_auto_detection_screen.dart';
import 'screens/closet_health_and_analytics_screen.dart';
import 'screens/mobile_settings_and_wardrobe_management_screen.dart';
import 'screens/virtual_try_on_and_outfit_diary_screen.dart';

void main() => runApp(const StyleOsApp());

class StyleOsApp extends StatelessWidget {
  const StyleOsApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Style OS',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff0070ea)),
      scaffoldBackgroundColor: const Color(0xfff8f9fa),
    ),
    routes: {
      '/': (_) => MobileHomeScreen(),
      '/closet': (_) => MobileClosetAndWardrobeGridScreen(),
      '/scan': (_) => AIWardrobeScanAndAutoDetectionScreen(),
      '/health': (_) => ClosetHealthAndAnalyticsScreen(),
      '/settings': (_) => MobileSettingsAndWardrobeManagementScreen(),
      '/virtual_try_on': (_) => VirtualTryOnAndOutfitDiaryScreen(),
    },
  );
}
