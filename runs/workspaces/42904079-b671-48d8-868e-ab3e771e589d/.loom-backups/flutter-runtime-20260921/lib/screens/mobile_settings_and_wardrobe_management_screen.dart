import 'package:flutter/material.dart';

class MobileSettingsAndWardrobeManagementScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Settings & Preferences'),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.save),
            onPressed: () {},
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 48,
              backgroundImage: NetworkImage('https://example.com/sarah-thompson.jpg'),
            ),
            SizedBox(height: 16),
            Text('Sarah Thompson', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(height: 4),
            Text('Marketing Manager • London, UK', style: TextStyle(fontSize: 14, color: Colors.grey)),
            SizedBox(height: 8),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('AI Styling Persona', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  GridView.count(
                    crossAxisCount: 3,
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    children: [
                      Text('Body Shape', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('Hourglass', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Color Season', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('Soft Autumn', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Dressing Mood', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('Executive', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue)),
                    ],
                  ),
                ],
              ),
            ),
            SizedBox(height: 20),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Physical Baseline & Silhouette', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: TextField(
                          decoration: InputDecoration(
                            labelText: 'Height',
                            border: OutlineInputBorder(),
                          ),
                          initialValue: '172 cm (5''8")',
                        ),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: TextField(
                          decoration: InputDecoration(
                            labelText: 'B-W-H',
                            border: OutlineInputBorder(),
                          ),
                          initialValue: '34-27-38',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            SizedBox(height: 20),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Default AI Fit Bias', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      ElevatedButton(
                        onPressed: () {},
                        child: Text('Fitted'),
                        style: ElevatedButton.styleFrom(primary: Colors.grey.shade300),
                      ),
                      ElevatedButton(
                        onPressed: () {},
                        child: Text('Relaxed'),
                        style: ElevatedButton.styleFrom(primary: Colors.grey.shade300),
                      ),
                      ElevatedButton(
                        onPressed: () {},
                        child: Text('Tailored', style: TextStyle(color: Colors.white)),
                        style: ElevatedButton.styleFrom(primary: Colors.blue),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
