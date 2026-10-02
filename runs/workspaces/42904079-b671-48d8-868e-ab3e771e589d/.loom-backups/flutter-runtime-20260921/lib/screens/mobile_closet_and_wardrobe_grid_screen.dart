// lib/screens/mobile_closet_and_wardrobe_grid_screen.dart
import 'package:flutter/material.dart';

class MobileClosetAndWardrobeGridScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Closet & Wardrobe Grid'),
        actions: [
          IconButton(icon: Icon(Icons.tune), onPressed: () {}),
          IconButton(icon: Icon(Icons.checklist), onPressed: () {}),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              decoration: InputDecoration(
                labelText: 'Search brands, fabrics, palettes...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
            SizedBox(height: 16.0),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(onPressed: () {}, child: Text('All (42)')),
                TextButton(onPressed: () {}, child: Text('Outerwear (8)')),
                TextButton(onPressed: () {}, child: Text('Tops (14)')),
                TextButton(onPressed: () {}, child: Text('Bottoms (11)')),
                TextButton(onPressed: () {}, child: Text('Footwear (5)')),
                TextButton(onPressed: () {}, child: Text('Dresses (4)')),
              ],
            ),
            SizedBox(height: 16.0),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(onPressed: () {}, child: Text('Worn Recently')),
                TextButton(onPressed: () {}, child: Text('High Versatility')),
                TextButton(onPressed: () {}, child: Text('>45d Dormant')),
                TextButton(onPressed: () {}, child: Text('Silk & Cashmere')),
              ],
            ),
            SizedBox(height: 16.0),
            Expanded(
              child: GridView.builder( 
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 8.0, mainAxisSpacing: 8.0),
                itemCount: 7,
                itemBuilder: (context, index) {
                  return Card(
                    padding: EdgeInsets.all(16.0),
                    child: Column( 
                      children: [
                        Image.network('https://example.com/image.jpg', fit: BoxFit.cover),
                        Text('100% Linen'),
                        IconButton(icon: Icon(Icons.favorite_border), onPressed: () {}),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Oat Sand'),
                            Text('$18 / wear'),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
