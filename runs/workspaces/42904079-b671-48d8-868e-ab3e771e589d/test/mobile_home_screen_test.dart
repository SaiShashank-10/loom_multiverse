import 'package:flutter_test/flutter_test.dart';
import 'package:styleos/main.dart';

void main() {
  testWidgets('mobile_home_screen renders and supports route navigation',
      (tester) async {
    await tester.pumpWidget(const StyleOsApp());
    await tester.pumpAndSettle();
    expect(find.text('Style OS'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Scan').last);
    await tester.pumpAndSettle();
    expect(find.text('Style OS'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
