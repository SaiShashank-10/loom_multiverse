import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:styleos/main.dart';

void main() {
  setUpAll(() async {
    for (final family in ['Space Grotesk', 'Hanken Grotesk']) {
      final loader = FontLoader(family);
      for (final weight in [400, 500, 600, 700]) {
        loader.addFont(rootBundle
            .load('assets/fonts/${family.replaceAll(' ', '')}-$weight.ttf'));
      }
      await loader.load();
    }
    final icons = FontLoader('MaterialIcons');
    icons.addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
  });
  const screens = {
    'home': '/',
    'closet': '/closet',
    'scan': '/scan',
    'health': '/health',
    'settings': '/settings',
    'tryon': '/virtual_try_on'
  };
  for (final width in [320, 430]) {
    for (final entry in screens.entries) {
      testWidgets('${entry.key} reference composition at $width pixels',
          (tester) async {
        tester.view.physicalSize = Size(width.toDouble(), 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        const key = ValueKey('design-capture');
        await tester
            .pumpWidget(const RepaintBoundary(key: key, child: StyleOsApp()));
        if (entry.value != '/')
          tester
              .state<NavigatorState>(find.byType(Navigator))
              .pushNamed(entry.value);
        await tester.pumpAndSettle();
        for (final widget in tester.widgetList<Image>(find.byType(Image))) {
          final context = tester.element(find.byKey(key));
          await tester.runAsync(() => precacheImage(widget.image, context));
        }
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await expectLater(find.byKey(key),
            matchesGoldenFile('goldens/${entry.key}-$width.png'));
        final list = find.byType(ListView).last;
        await tester.drag(list, const Offset(0, -2400));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
      });
    }
  }
}
