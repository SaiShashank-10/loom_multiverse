import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:styleos/main.dart';

void main() {
  testWidgets(
      'mobile_closet_and_wardrobe_grid_screen renders and supports route navigation',
      (tester) async {
    await tester.pumpWidget(const StyleOsApp());
    final navigator = tester.state<NavigatorState>(find.byType(Navigator));
    navigator.pushNamed('/closet');
    await tester.pumpAndSettle();
    expect(find.text('My Wardrobe'), findsOneWidget);
    expect(tester.takeException(), isNull);
    navigator.pop();
    await tester.pumpAndSettle();
    expect(find.text('Style OS'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
