import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:styleos/data/style_data.dart';

void main() {
  test('preferences, favorite garments and diary survive repository recreation',
      () async {
    final directory =
        await Directory.systemTemp.createTemp('styleos-persistence-');
    try {
      final file = File('${directory.path}/preferences.json');
      final first = StyleData();
      await first.load(storage: file);
      first.fit = 'Relaxed';
      first.commute = 'Walking';
      first.favorites.add(2);
      first.savedLooks = 3;
      await first.save();
      final second = StyleData();
      await second.load(storage: file);
      expect(second.fit, 'Relaxed');
      expect(second.commute, 'Walking');
      expect(second.favorites, {2});
      expect(second.savedLooks, 3);
    } finally {
      await directory.delete(recursive: true);
    }
  });
}
