import 'package:flutter/material.dart';
import '../widgets/style_components.dart';

class AIWardrobeScanAndAutoDetectionScreen extends StatefulWidget {
  const AIWardrobeScanAndAutoDetectionScreen({super.key});
  @override
  State<AIWardrobeScanAndAutoDetectionScreen> createState() => _ScanState();
}

class _ScanState extends State<AIWardrobeScanAndAutoDetectionScreen> {
  String mode = 'Single Item';
  bool grid = true;
  @override
  Widget build(BuildContext context) => StyleScaffold(
      title: 'Style OS',
      subtitle: 'AI SCAN ENGINE · reference preview',
      index: 2,
      body: ListView(padding: const EdgeInsets.all(18), children: [
        TonalChoices(const ['Single Item', 'Rapid Multi', 'Gallery'], mode,
            (v) => setState(() => mode = v)),
        const SizedBox(height: 14),
        ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Stack(children: [
              ReferenceImage('scan_0',
                  height: (MediaQuery.sizeOf(context).width - 36) * 1.42),
              Positioned(
                  left: 12,
                  top: 12,
                  child: IconButton.filledTonal(
                      tooltip: 'Flash information',
                      onPressed: () => message(context,
                          'Camera capture is not connected in this reference preview.'),
                      icon: const Icon(Icons.flash_on))),
              Positioned(
                  right: 12,
                  top: 12,
                  child: IconButton.filledTonal(
                      tooltip: 'Toggle scan grid',
                      onPressed: () => setState(() => grid = !grid),
                      icon: Icon(grid ? Icons.grid_on : Icons.grid_off))),
              if (grid)
                Positioned.fill(
                    child: IgnorePointer(
                        child: CustomPaint(painter: _GridPainter()))),
              const Positioned(
                  left: 16,
                  top: 78,
                  child: Pill('REFERENCE CAPTURE',
                      color: ink, icon: Icons.crop_free)),
              Positioned(
                  left: 14,
                  right: 14,
                  bottom: 16,
                  child: Panel(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            heading('Outerwear / Tailored Blazer', 15),
                            const SizedBox(height: 7),
                            const Wrap(spacing: 6, runSpacing: 6, children: [
                              Pill('Charcoal Navy'),
                              Pill('100% Super 120s Wool', color: green),
                              Pill('Slim Fit', color: muted)
                            ])
                          ])))
            ])),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          detail('Batch preview (3)'),
          const Pill('Sample garments', icon: Icons.collections_outlined)
        ]),
        const SizedBox(height: 10),
        Row(
            children: List.generate(
                3,
                (i) => Expanded(
                    child: Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ReferenceImage('scan_${i + 1}', height: 75))))),
        const SizedBox(height: 16),
        Center(
            child: IconButton.filled(
                tooltip: 'Capture clothing',
                style: IconButton.styleFrom(padding: const EdgeInsets.all(20)),
                onPressed: () => message(context,
                    'Connect a camera and garment detection service to scan your clothing. No garment was added.'),
                icon: const Icon(Icons.photo_camera, size: 30))),
        const SizedBox(height: 18),
        Panel(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Pill('REFERENCE ITEM', icon: Icons.checkroom),
          const SizedBox(height: 12),
          heading('Italian Super 120s Wool Blazer', 22),
          const SizedBox(height: 16),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
                child: _property(
                    'Category', 'Outerwear', 'Blazer', Icons.layers_outlined)),
            const SizedBox(width: 10),
            Expanded(
                child: _property(
                    'Composition', '100% Wool', 'Winter / Fall', Icons.texture))
          ]),
          const SizedBox(height: 12),
          Row(children: [
            const CircleAvatar(radius: 15, backgroundColor: Color(0xff2b3448)),
            const SizedBox(width: 10),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  heading('Charcoal Navy', 15),
                  detail('Primary Tone')
                ])),
            TextButton(
                onPressed: () => message(context,
                    'This sample tone comes from the approved reference.'),
                child: const Text('Details'))
          ]),
          const SizedBox(height: 12),
          Panel(
              color: pale,
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                const Icon(Icons.monetization_on_outlined, color: primary),
                const SizedBox(width: 10),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      detail('CPW Goal · reference'),
                      heading(r'$6.25 / 48 wears', 18)
                    ]))
              ])),
          const SizedBox(height: 18),
          ActionButton(
              'Confirm & Add to Closet',
              Icons.check,
              () => message(context,
                  'No real capture is available yet. The reference item has not been added as your clothing.')),
          const SizedBox(height: 8),
          ActionButton('Retake', Icons.replay, () {
            setState(() => mode = 'Single Item');
            message(context, 'Ready for a real camera integration.');
          }, secondary: true),
        ])),
        const SizedBox(height: 20)
      ]));
  Widget _property(String label, String value, String sub, IconData icon) =>
      Panel(
          color: pale,
          padding: const EdgeInsets.all(10),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, color: primary, size: 19),
            const SizedBox(height: 8),
            detail(label),
            heading(value, 16),
            detail(sub)
          ]));
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: .55)
      ..strokeWidth = 1;
    for (var n = 1; n < 3; n++) {
      canvas.drawLine(Offset(size.width * n / 3, 0),
          Offset(size.width * n / 3, size.height), paint);
      canvas.drawLine(Offset(0, size.height * n / 3),
          Offset(size.width, size.height * n / 3), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
