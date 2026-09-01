import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class PassDocumentScreen extends StatefulWidget {
  @override
  _PassDocumentScreenState createState() => _PassDocumentScreenState();
}

class _PassDocumentScreenState extends State<PassDocumentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _documentTypeController = TextEditingController();

  Future<void> _uploadDocument() async {
    if (_formKey.currentState!.validate()) {
      try {
        final response = await http.post(
          Uri.parse('https://api.roadtripplanner.com/pass_documents'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'document_type': _documentTypeController.text,
          }),
        );

        if (response.statusCode == 201) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Document uploaded successfully')),
          );
        } else {
          throw Exception('Failed to upload document');
        }
      } catch (e) {
        print(e);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error uploading document')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Upload e-Pass Document'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            children: <Widget>[
              TextFormField(
                controller: _documentTypeController,
                decoration: InputDecoration(labelText: 'Document Type'),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter document type';
                  }
                  return null;
                },
              ),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: _uploadDocument,
                child: Text('Upload Document'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}