import 'package:flutter/material.dart';

class AIWardrobeScanAndAutoDetectionScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Style OS | Italian Super 120s Wool Blazer'),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Image.network('https://example.com/italian-super-120s-wool-blazer.jpg', height: 100, fit: BoxFit.cover, errorBuilder: (_, error, stack) => const Icon(Icons.image_not_supported_outlined, size: 48)),
            SizedBox(height: 20),
            Text('Italian Super 120s Wool Blazer', style: TextStyle(fontSize: 24, color: Colors.black)),
            SizedBox(height: 10),
            Text('99.2% Confidence', style: TextStyle(fontSize: 16, color: Colors.green)),
          ],
        ),
      ),
    );
  }
}
