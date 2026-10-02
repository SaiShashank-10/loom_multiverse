import 'package:flutter/material.dart';
import '../widgets/style_components.dart';
import '../data/style_data.dart';

class MobileClosetAndWardrobeGridScreen extends StatefulWidget {
  const MobileClosetAndWardrobeGridScreen({super.key});
  @override
  State<MobileClosetAndWardrobeGridScreen> createState() => _ClosetState();
}

class _ClosetState extends State<MobileClosetAndWardrobeGridScreen> {
  String query = '', category = 'All', filter = 'Worn Recently';
  bool ascending = false;
  @override
  Widget build(BuildContext context) {
    final shown = List.generate(6, (i) => i)
        .where((i) =>
            (category == 'All' || catalogCategories[i] == category) &&
            '${catalogNames[i]} ${catalogBrands[i]} ${catalogMaterials[i]} ${catalogTones[i]}'
                .toLowerCase()
                .contains(query.toLowerCase()))
        .toList();
    if (ascending)
      shown.sort((a, b) => catalogWears[a].compareTo(catalogWears[b]));
    if (filter == 'Favorites')
      shown.removeWhere((i) => !StyleData.instance.favorites.contains(i));
    return StyleScaffold(
        title: 'My Wardrobe',
        subtitle: 'Style OS Portfolio Engine · sample catalog',
        index: 3,
        body: ListView(padding: const EdgeInsets.all(18), children: [
          TextField(
              onChanged: (v) => setState(() => query = v),
              decoration: InputDecoration(
                  hintText: 'Search brands, fabrics, palettes...',
                  hintStyle: const TextStyle(fontSize: 12),
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: line)))),
          const SizedBox(height: 14),
          ChoiceStrip(const [
            'All',
            'Outerwear',
            'Tops',
            'Bottoms',
            'Footwear',
            'Dresses'
          ], category, (v) => setState(() => category = v)),
          ChoiceStrip(
              const [
                'Worn Recently',
                'High Versatility',
                'Favorites',
                'Silk & Cashmere'
              ],
              filter,
              (v) => setState(() {
                    filter = v;
                    if (v == 'Silk & Cashmere')
                      query = 'Silk';
                    else
                      query = '';
                  })),
          const SizedBox(height: 14),
          Panel(
              color: pale,
              child: Column(children: [
                const SectionTitle('Closet Intelligence',
                    icon: Icons.query_stats, trailing: Pill('Sample')),
                Row(children: [
                  _metric('Active Rate', '88%', '37/42 items'),
                  _metric('Avg CPW', r'$14.20', '−18% this mo'),
                  _metric('Dormant', '5 items', 'Inspect')
                ])
              ])),
          const SizedBox(height: 18),
          SectionTitle('Active Catalog',
              trailing: TextButton(
                  onPressed: () => setState(() => ascending = !ascending),
                  child: Text(ascending ? 'Least worn ↑' : 'Frequency ↓',
                      style: const TextStyle(fontSize: 11)))),
          if (shown.isEmpty)
            const Panel(
                child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('No garments match your filters.'))),
          GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: shown.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 14,
                  mainAxisExtent: 280),
              itemBuilder: (context, index) {
                final i = shown[index];
                return Panel(
                    padding: const EdgeInsets.all(9),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                              child: Stack(children: [
                            Positioned.fill(child: ReferenceImage('closet_$i')),
                            Positioned(
                                left: 3,
                                top: 5,
                                child: Pill(catalogMaterials[i], color: ink)),
                            Positioned(
                                right: 0,
                                bottom: 0,
                                child: IconButton(
                                    tooltip: 'Favorite ${catalogNames[i]}',
                                    icon: Icon(
                                        StyleData.instance.favorites.contains(i)
                                            ? Icons.favorite
                                            : Icons.favorite_border,
                                        color: Colors.red,
                                        size: 20),
                                    onPressed: () {
                                      setState(() {
                                        if (!StyleData.instance.favorites
                                            .add(i))
                                          StyleData.instance.favorites
                                              .remove(i);
                                      });
                                      persist(
                                          context, 'Favorites saved locally.');
                                    }))
                          ])),
                          const SizedBox(height: 8),
                          detail(catalogTones[i]),
                          Text(catalogNames[i],
                              style: const TextStyle(
                                  fontFamily: 'Space Grotesk',
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15)),
                          detail(catalogBrands[i]),
                          const SizedBox(height: 8),
                          Wrap(spacing: 7, children: [
                            Pill('Worn ${catalogWears[i]}x', color: muted),
                            Pill('\$${catalogCosts[i]} / wear')
                          ])
                        ]));
              }),
          const SizedBox(height: 18),
          Panel(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                const SectionTitle('Batch Auto-Catalog',
                    icon: Icons.collections_bookmark_outlined),
                detail('Add clothing through the scan workflow.'),
                const SizedBox(height: 12),
                ActionButton(
                    'AI Auto-Scan Garment',
                    Icons.document_scanner_outlined,
                    () => openScreen(context, '/scan'))
              ])),
          const SizedBox(height: 20)
        ]));
  }

  Widget _metric(String name, String value, String caption) => Expanded(
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            detail(name),
            const SizedBox(height: 7),
            heading(value, 18),
            detail(caption)
          ]));
}
