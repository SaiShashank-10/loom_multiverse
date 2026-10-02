import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:styleos/main.dart';

void main() {
  testWidgets(
      'virtual_try_on_and_outfit_diary_screen renders and supports route navigation',
      (tester) async {
    await tester.pumpWidget(const StyleOsApp());
    final navigator = tester.state<NavigatorState>(find.byType(Navigator));
    navigator.pushNamed('/virtual_try_on');
    await tester.pumpAndSettle();
    expect(find.text('Virtual Try-On Studio'), findsOneWidget);
    expect(tester.takeException(), isNull);
    navigator.pop();
    await tester.pumpAndSettle();
    expect(find.text('Style OS'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
