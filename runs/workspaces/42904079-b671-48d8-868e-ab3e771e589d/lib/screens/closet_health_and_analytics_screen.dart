import 'package:flutter/material.dart';
import '../widgets/style_components.dart';

class ClosetHealthAndAnalyticsScreen extends StatelessWidget {
  const ClosetHealthAndAnalyticsScreen({super.key});
  @override
  Widget build(BuildContext context) => StyleScaffold(
      title: 'Closet Health & Audit',
      subtitle: 'Style OS Sartorial Intelligence · sample data',
      index: 4,
      body: ListView(padding: const EdgeInsets.all(18), children: [
        Panel(
            child: Column(children: [
          Row(children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  heading('Closet Health', 25),
                  const SizedBox(height: 6),
                  detail('Real-time dynamic wardrobe efficiency')
                ])),
            const SizedBox(width: 10),
            const SizedBox(
                height: 82,
                width: 82,
                child: Stack(alignment: Alignment.center, children: [
                  SizedBox(
                      height: 82,
                      width: 82,
                      child: CircularProgressIndicator(
                          value: .88,
                          strokeWidth: 7,
                          color: primary,
                          backgroundColor: pale)),
                  Column(mainAxisSize: MainAxisSize.min, children: [
                    Text('88%',
                        style: TextStyle(
                            fontFamily: 'Space Grotesk',
                            fontSize: 25,
                            fontWeight: FontWeight.w700)),
                    Text('SCORE', style: TextStyle(fontSize: 9, color: muted))
                  ])
                ]))
          ]),
          const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Divider(color: line, height: 1)),
          Row(children: [
            _metric('Active Wear', '37/42', '88% in 45d'),
            _metric('Cost/Wear', r'$14.20', '−18% mo'),
            _metric('Valuation', r'$4,850', 'Appraised')
          ])
        ])),
        const SizedBox(height: 22),
        const SectionTitle('Wardrobe Gaps',
            icon: Icons.auto_fix_high, trailing: Pill('2 Identified')),
        Panel(
            child: Column(children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(
                width: 76, child: ReferenceImage('health_0', height: 100)),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  heading('Breathable Spring Trench', 18),
                  const SizedBox(height: 6),
                  detail(
                      'Unlocks six business casual combinations for the reference wardrobe’s spring forecast.')
                ]))
          ]),
          const SizedBox(height: 14),
          ActionButton('View Recommended Matches', Icons.arrow_forward,
              () => openScreen(context, '/closet'))
        ])),
        const SizedBox(height: 12),
        Panel(
            child: Row(children: [
          const SizedBox(
              width: 72, child: ReferenceImage('health_1', height: 82)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                heading('Neutral Wool Trousers', 17),
                detail('Expands top-layer versatility with current knitwear'),
                const SizedBox(height: 5),
                const Pill('+14% Reference Index')
              ]))
        ])),
        const SizedBox(height: 22),
        const SectionTitle('Dormant Items',
            icon: Icons.notifications_active_outlined,
            trailing: Pill('5 Pieces', color: Colors.orange)),
        Panel(
            child: Column(children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(
                width: 76, child: ReferenceImage('health_2', height: 100)),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  heading('Double-Breasted Blazer', 18),
                  const SizedBox(height: 6),
                  detail('Tailoring • Acquired Sep 2023')
                ]))
          ]),
          const SizedBox(height: 14),
          ActionButton('Revive', Icons.auto_fix_high,
              () => openScreen(context, '/virtual_try_on'))
        ])),
        const SizedBox(height: 22),
        const SectionTitle('Category Utilization',
            icon: Icons.category, trailing: Pill('Last 45 Days')),
        Panel(
            child: Column(children: [
          _utilization('Outerwear', .92, 'Optimal'),
          _utilization('Tops & Shirts', .86, '86%'),
          _utilization('Footwear', .78, 'Needs Rotation'),
          detail('Sample category activity from the approved design'),
        ])),
        const SizedBox(height: 22),
        const SectionTitle('Microclimate Readiness',
            icon: Icons.wb_twilight,
            trailing: Pill('95%', color: Colors.green)),
        Panel(
            child: Column(children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  heading('Microclimate Readiness', 16),
                  const SizedBox(height: 6),
                  detail('Reference conditions: Mild / Spring; live forecast not connected')
                ])),
          ]),
        ])),
        const SizedBox(height: 22),
        const SectionTitle('Economic & Eco Impact',
            icon: Icons.savings, trailing: Pill(r'$230 · reference')),
        Panel(
            child: Column(children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  heading('Economic & Eco Impact', 16),
                  const SizedBox(height: 6),
                  detail(
                      'Reference estimate for wardrobe rotation. No real spending or environmental savings are measured in this preview.')
                ])),
          ]),
        ])),
      ]));

  Widget _utilization(String title, double value, String status) => Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          heading(title, 15), detail(status)
        ]),
        const SizedBox(height: 8),
        ClipRRect(borderRadius: BorderRadius.circular(8), child:
          LinearProgressIndicator(value: value, minHeight: 8, color: primary, backgroundColor: pale))
      ]));

  Widget _metric(String title, String value, String subtitle) => Expanded(
          child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 3),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
              color: pale, borderRadius: BorderRadius.circular(18)),
          child: Column(children: [
            Text(title, style: const TextStyle(fontSize: 10, color: muted)),
            const SizedBox(height: 6),
            FittedBox(child: heading(value, 20)),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(fontSize: 9, color: muted))
          ]),
        ),
      ));
}
