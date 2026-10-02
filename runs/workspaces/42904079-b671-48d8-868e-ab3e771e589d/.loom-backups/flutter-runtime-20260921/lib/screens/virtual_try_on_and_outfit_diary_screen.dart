// lib/screens/virtual_try_on_and_outfit_diary_screen.dart
import 'package:flutter/material.dart';

class VirtualTryOnAndOutfitDiaryScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Virtual Try-On Studio | Outfit Layers'),
        actions: [
          IconButton(
            icon: Icon(Icons.share_outlined),
            onPressed: () {},
          ),
          IconButton(
            icon: Icon(Icons.favorite_border_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Digital Twin #ST-9042', style: TextStyle(fontSize: 12)),
            SizedBox(height: 8),
            Container(
              height: 380,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16.0),
                color: Colors.grey[200],
              ),
              child: Center(child: Image.asset('assets/images/digital_twin.png')),
            ),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                ElevatedButton(onPressed: () {}, child: Text('Front View'), style: ElevatedButton.styleFrom(primary: Colors.blue, onPrimary: Colors.white)),
                IconButton(icon: Icon(Icons.rotate_right_outlined), onPressed: () {}, style: IconButton.styleFrom(color: Colors.blue)),
                IconButton(icon: Icon(Icons.cloud_queue_outlined), onPressed: () {}, style: IconButton.styleFrom(color: Colors.blue)),
              ],
            ),
            SizedBox(height: 16),
            Text('Outfit Layers', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Container(
              height: 40,
              child: ListView.builder( 
                scrollDirection: Axis.horizontal,
                itemCount: 4,
                itemBuilder: (context, index) {
                  return Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Container(
                      width: 136,
                      height: 24,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16.0),
                        color: Colors.grey[300],
                      ),
                      child: Center(child: Text('Layer $index', style: TextStyle(color: Colors.black))),
                    ),
                  );
                },
              ),
            ),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                ElevatedButton(onPressed: () {}, child: Text('Remix All'), style: ElevatedButton.styleFrom(primary: Colors.blue, onPrimary: Colors.white)),
                IconButton(icon: Icon(Icons.add_circle_outline_outlined), onPressed: () {}, style: IconButton.styleFrom(color: Colors.blue)),
              ],
            ),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(width: 48, height: 24, decoration: BoxDecoration(borderRadius: BorderRadius.circular(16.0), color: Colors.grey[300]), child: Center(child: Text('Silhouette', style: TextStyle(color: Colors.black)))),
                Container(width: 48, height: 24, decoration: BoxDecoration(borderRadius: BorderRadius.circular(16.0), color: Colors.grey[300]), child: Center(child: Text('Palette Harmonics', style: TextStyle(color: Colors.black)))),
              ],
            ),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                ElevatedButton(onPressed: () {}, child: Text('Save to Outfit Diary'), style: ElevatedButton.styleFrom(primary: Colors.blue, onPrimary: Colors.white)),
                ElevatedButton(onPressed: () {}, child: Text('Log as Today''s Worn Look'), style: ElevatedButton.styleFrom(primary: Colors.green, onPrimary: Colors.white)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
