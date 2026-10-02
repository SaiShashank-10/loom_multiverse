import 'package:flutter/material.dart';
import '../widgets/style_components.dart';
import '../data/style_data.dart';

class VirtualTryOnAndOutfitDiaryScreen extends StatefulWidget {
  const VirtualTryOnAndOutfitDiaryScreen({super.key});
  @override
  State<VirtualTryOnAndOutfitDiaryScreen> createState() => _TryOnState();
}

class _TryOnState extends State<VirtualTryOnAndOutfitDiaryScreen> {
  bool favorite = false;
  @override
  Widget build(BuildContext context) => StyleScaffold(
      title: 'Virtual Try-On Studio',
      subtitle: 'Digital Twin #ST-9042 · reference preview',
      index: 1,
      actions: [
        IconButton(
            tooltip: 'Favorite look',
            icon: Icon(favorite ? Icons.favorite : Icons.favorite_border,
                color: Colors.red),
            onPressed: () => setState(() => favorite = !favorite))
      ],
      body: ListView(padding: const EdgeInsets.all(18), children: [
        Panel(
            padding: EdgeInsets.zero,
            child: Stack(children: [
              const ReferenceImage('tryon_0',
                  height: 365, alignment: Alignment.topCenter),
              const Positioned(
                  top: 14,
                  left: 12,
                  child: Pill('Reference fit preview',
                      icon: Icons.verified_outlined, color: green)),
              Positioned(
                  top: 14,
                  right: 12,
                  child:
                      const Pill('72°F Sample', icon: Icons.wb_sunny_outlined)),
              Positioned(
                  bottom: 18,
                  left: 14,
                  right: 14,
                  child: Panel(
                      padding: const EdgeInsets.all(10),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            heading('Sarah Thompson', 16),
                            detail(
                                'Approved design image · not a live body scan')
                          ])))
            ])),
        const SizedBox(height: 12),
        Wrap(spacing: 6, children: [
          const Chip(label: Text('Front View')),
          ActionChip(
              label: const Text('360° Rotate'),
              onPressed: () => message(context,
                  'This reference is a still image. Live 3D rendering is not connected.')),
          ActionChip(
              label: const Text('Microclimate'),
              onPressed: () => message(context,
                  'Weather shown in this design preview is sample data.'))
        ]),
        const SizedBox(height: 18),
        SectionTitle('Outfit Layers',
            trailing: TextButton(
                onPressed: () => openScreen(context, '/closet'),
                child: const Text('Choose layers',
                    style: TextStyle(fontSize: 11)))),
        SizedBox(
            height: 216,
            child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: 4,
                separatorBuilder: (_, index) => const SizedBox(width: 10),
                itemBuilder: (context, i) => SizedBox(
                    width: 126,
                    child: Panel(
                        padding: const EdgeInsets.all(9),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                  child: Stack(children: [
                                Positioned.fill(
                                    child: ReferenceImage('tryon_${i + 1}')),
                                Positioned(
                                    left: 3,
                                    top: 3,
                                    child: Pill([
                                      'Outer',
                                      'Top',
                                      'Bottom',
                                      'Footwear'
                                    ][i]))
                              ])),
                              const SizedBox(height: 10),
                              Text(
                                  [
                                    'Navy Linen Blazer',
                                    'Silk Crepe Top',
                                    'Wide Leg Trousers',
                                    'Buckle Loafers'
                                  ][i],
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12)),
                              detail([
                                'Acne Studios',
                                'TOTÊME',
                                'COS Atelier',
                                'Jil Sander'
                              ][i])
                            ]))))),
        const SizedBox(height: 12),
        ActionButton(
            'Add Layer', Icons.add, () => openScreen(context, '/closet'),
            secondary: true),
        const SizedBox(height: 18),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              child: Panel(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                const Icon(Icons.hourglass_empty, color: primary),
                const SizedBox(height: 8),
                heading('Silhouette', 15),
                detail('Structured A-Line'),
                const SizedBox(height: 8),
                const Pill('Reference proportions')
              ]))),
          const SizedBox(width: 10),
          Expanded(
              child: Panel(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                const Icon(Icons.palette_outlined, color: primary),
                const SizedBox(height: 8),
                heading('Palette Harmonics', 15),
                detail('Deep Cold Neutral'),
                const SizedBox(height: 8),
                const Wrap(spacing: 4, children: [
                  CircleAvatar(radius: 8, backgroundColor: Color(0xff2b3448)),
                  CircleAvatar(radius: 8, backgroundColor: Color(0xffe9e2d4)),
                  CircleAvatar(radius: 8, backgroundColor: Color(0xff847e71))
                ])
              ])))
        ]),
        const SizedBox(height: 20),
        ActionButton('Save to Outfit Diary', Icons.bookmark_add_outlined, () {
          StyleData.instance.savedLooks++;
          persist(context,
              'Reference look saved locally (${StyleData.instance.savedLooks} saved).');
        }),
        const SizedBox(height: 10),
        ActionButton(
            "Log as Today's Worn Look",
            Icons.check_circle_outline,
            () => message(context,
                'Add your own garments before logging an actual worn outfit.'),
            secondary: true),
        const SizedBox(height: 10),
        detail(
            'The illustrated fit and palette describe the approved reference, not measured results.'),
        const SizedBox(height: 20)
      ]));
}
