import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

/// Local preferences and diary. Reference wardrobe records are explicitly samples.
class StyleData extends ChangeNotifier {
  static final instance = StyleData();
  String fit = 'Tailored', commute = 'Transit', temperature = 'Balanced';
  String height = '172 cm', measurements = '34-27-38';
  int dormancy = 45;
  bool rain = true,
      fabric = false,
      cpw = true,
      privacy = true,
      telemetry = false;
  final Set<int> favorites = {};
  int savedLooks = 0;
  File? _file;
  Future<void> _pending = Future.value();

  Future<void> load({File? storage}) async {
    _file = storage ??
        File(
            '${(await getApplicationDocumentsDirectory()).path}/style-preferences.json');
    if (!await _file!.exists()) return;
    final value =
        jsonDecode(await _file!.readAsString()) as Map<String, dynamic>;
    fit = value['fit'] ?? fit;
    commute = value['commute'] ?? commute;
    temperature = value['temperature'] ?? temperature;
    height = value['height'] ?? height;
    measurements = value['measurements'] ?? measurements;
    dormancy = value['dormancy'] ?? dormancy;
    savedLooks = value['savedLooks'] ?? 0;
    rain = value['rain'] ?? rain;
    cpw = value['cpw'] ?? cpw;
    privacy = value['privacy'] ?? privacy;
    telemetry = value['telemetry'] ?? telemetry;
    favorites.addAll((value['favorites'] as List? ?? []).cast<int>());
  }

  Future<void> save() {
    notifyListeners();
    if (_file == null) return Future.value();
    final content = jsonEncode({
      'fit': fit,
      'commute': commute,
      'temperature': temperature,
      'height': height,
      'measurements': measurements,
      'dormancy': dormancy,
      'rain': rain,
      'cpw': cpw,
      'privacy': privacy,
      'telemetry': telemetry,
      'favorites': favorites.toList(),
      'savedLooks': savedLooks
    });
    return _pending = _pending.catchError((Object _) {}).then((_) async {
      final temporary = File('${_file!.path}.tmp');
      await temporary.writeAsString(content, flush: true);
      await temporary.rename(_file!.path);
    });
  }
}

const catalogNames = [
  'Linen Blazer',
  'Silk Shirt',
  'Pleated Pants',
  'Ribbed Crew',
  'Buckle Loafers',
  'Heritage Trench'
];
const catalogBrands = [
  'Brunello Cucinelli',
  'The Row',
  'Lemaire',
  'Khaite',
  'Gucci',
  'Burberry'
];
const catalogMaterials = [
  '100% Linen',
  'Mulberry Silk',
  'Virgin Wool',
  'Cashmere',
  'Calfskin',
  'Gabardine'
];
const catalogTones = [
  'Oat Sand',
  'Ivory Crepe',
  'Charcoal',
  'Deep Navy',
  'Nero',
  'Honey'
];
const catalogCategories = [
  'Outerwear',
  'Tops',
  'Bottoms',
  'Tops',
  'Footwear',
  'Outerwear'
];
const catalogWears = [14, 9, 22, 16, 31, 6];
const catalogCosts = [18, 32, 11, 21, 9, 48];
