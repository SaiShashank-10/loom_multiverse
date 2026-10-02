import 'package:flutter/material.dart';
import '../widgets/style_components.dart';
import '../data/style_data.dart';

class MobileHomeScreen extends StatefulWidget {
  const MobileHomeScreen({super.key});
  @override
  State<MobileHomeScreen> createState() => _HomeState();
}

class _HomeState extends State<MobileHomeScreen> {
  String agenda = 'Work Meeting';
  bool favorite = false;
  @override
  Widget build(BuildContext context) => StyleScaffold(
      title: 'Style OS',
      subtitle: 'Design preview',
      rail: true,
      actions: [
        const Pill('72°F', color: Colors.orange, icon: Icons.wb_sunny_outlined),
        IconButton(
            tooltip: 'Notifications',
            icon: const Icon(Icons.notifications_none, color: primary),
            onPressed: () => message(context, 'No new local notifications.'))
      ],
      floating: FloatingActionButton.small(
          shape: const CircleBorder(),
          elevation: 0,
          tooltip: 'Scan or add clothing',
          backgroundColor: primary,
          foregroundColor: Colors.white,
          onPressed: () => openScreen(context, '/scan'),
          child: const Icon(Icons.photo_camera_outlined)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        heading('Good morning, Sarah', 22),
        detail('London · Sample styling schedule'),
        const SizedBox(height: 16),
        Panel(
            child: Row(children: [
          const Icon(Icons.wb_sunny_outlined, color: Colors.orange, size: 28),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                heading('72°F Sunny', 16),
                detail('Lightweight breathable layers recommended'),
                const SizedBox(height: 4),
                const Pill('Sample weather', color: muted)
              ]))
        ])),
        const SizedBox(height: 18),
        Row(children: [
          Expanded(child: detail("TODAY’S AGENDA")),
          TextButton(
              onPressed: () => openScreen(context, '/settings'),
              child: const Text('Edit Context', style: TextStyle(fontSize: 10)))
        ]),
        ChoiceStrip(const [
          'Work Meeting',
          'Casual Coffee',
          'Evening Dinner',
          'Weekend Travel'
        ], agenda, (v) => setState(() => agenda = v)),
        const SizedBox(height: 18),
        Panel(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(
                child: Align(
                    alignment: Alignment.centerLeft,
                    child: Pill('Sample AI match', icon: Icons.auto_awesome))),
            IconButton(
                tooltip: 'Favorite outfit',
                icon: Icon(favorite ? Icons.favorite : Icons.favorite_border,
                    color: favorite ? Colors.red : muted, size: 19),
                onPressed: () => setState(() => favorite = !favorite))
          ]),
          const SizedBox(height: 10),
          heading('The Modern Executive', 21),
          const SizedBox(height: 8),
          Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                  color: pale, borderRadius: BorderRadius.circular(24)),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.smart_toy_outlined, size: 18, color: primary),
                const SizedBox(width: 6),
                Expanded(
                    child: detail(
                        'Reference outfit for your $agenda. Preview garments from the approved design.'))
              ])),
          const SizedBox(height: 16),
          GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 10,
              childAspectRatio: (MediaQuery.sizeOf(context).width - 122) / 380,
              children: List.generate(
                  4,
                  (i) => Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                                child: ReferenceImage('home_${i + 1}',
                                    height: 130)),
                            const SizedBox(height: 7),
                            Text(
                                [
                                  'Italian Linen Blazer',
                                  'Silk Crepe Blouse',
                                  'Wide Leg Trousers',
                                  'Gold-Buckle Loafers'
                                ][i],
                                style: const TextStyle(
                                    fontSize: 11, fontWeight: FontWeight.w700)),
                            detail([
                              'Charcoal Navy',
                              'Ivory White',
                              'Olive Sand',
                              'Deep Cognac'
                            ][i]),
                            Text('Sample garment',
                                style: const TextStyle(
                                    fontSize: 9, color: primary))
                          ]))),
          const SizedBox(height: 14),
          ActionButton('Try On Virtually', Icons.view_in_ar,
              () => openScreen(context, '/virtual_try_on')),
        ])),
        const SizedBox(height: 18),
        Panel(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SectionTitle('3D Digital Twin Preview', icon: Icons.view_in_ar),
          const Pill('Reference image · not a live 3D render', color: muted),
          const SizedBox(height: 12),
          const ReferenceImage('home_5', height: 290),
          const SizedBox(height: 12),
          ActionButton('Open Outfit Studio', Icons.sensors,
              () => openScreen(context, '/virtual_try_on')),
          const SizedBox(height: 7),
          ActionButton('Save Reference Look', Icons.bookmark_add_outlined, () {
            StyleData.instance.savedLooks++;
            persist(context, 'Reference look saved to your local diary.');
          }, secondary: true)
        ])),
        const SizedBox(height: 18),
        Panel(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SectionTitle('Closet Health & Insights',
              icon: Icons.analytics_outlined),
          detail('Sample wardrobe utilization'),
          const SizedBox(height: 16),
          Row(children: [
            const SizedBox(
                height: 70,
                width: 70,
                child: Stack(alignment: Alignment.center, children: [
                  SizedBox(
                      height: 70,
                      width: 70,
                      child: CircularProgressIndicator(
                          value: .88,
                          strokeWidth: 7,
                          color: primary,
                          backgroundColor: pale)),
                  Text('88%',
                      style:
                          TextStyle(fontSize: 20, fontWeight: FontWeight.bold))
                ])),
            const SizedBox(width: 14),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  detail('In Rotation'),
                  heading('42 Items', 18),
                  const SizedBox(height: 8),
                  detail('Dormant (>45d)'),
                  heading('3 Items', 18)
                ]))
          ]),
          const SizedBox(height: 18),
          Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: pale, borderRadius: BorderRadius.circular(14)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Pill('Wardrobe Gap Identified',
                        icon: Icons.tips_and_updates),
                    const SizedBox(height: 8),
                    detail(
                        'Breathable Spring Trench Coat completes six seasonal business looks in the reference wardrobe.')
                  ])),
          const SizedBox(height: 12),
          ActionButton('View Full Audit', Icons.arrow_forward,
              () => openScreen(context, '/health'),
              secondary: true)
        ])),
        const SizedBox(height: 65),
      ]));
}
