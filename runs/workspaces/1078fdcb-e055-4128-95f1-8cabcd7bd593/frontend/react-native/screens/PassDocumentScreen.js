import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ImagePickerIOS, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const PassDocumentScreen = () => {
  const [documentType, setDocumentType] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const { user } = useAuth();

  const handleChooseImage = async () => {
    try {
      const result = await ImagePickerIOS.pickImage();
      if (!result.cancelled) {
        setImageUri(result.uri);
      }
    } catch (error) {
      console.error('Error picking image: ', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleUploadDocument = async () => {
    if (!documentType || !imageUri) {
      Alert.alert('Error', 'Please select a document type and upload an image.');
      return;
    }

    try {
      // Simulate uploading the document
      await fetch('https://api.roadtripplanner.com/pass_documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          user_id: user._id,
          document_type,
          imageUri,
        }),
      });

      Alert.alert('Success', 'Document uploaded successfully.');
      setImageUri(null);
    } catch (error) {
      console.error('Error uploading document: ', error);
      Alert.alert('Error', 'Failed to upload document.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload e-Pass Document</Text>
      <Button title="Choose Image" onPress={handleChooseImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      <TextInput
        placeholder="Document Type"
        value={documentType}
        onChangeText={(text) => setDocumentType(text)}
        style={styles.input}
      />
      <Button title="Upload Document" onPress={handleUploadDocument} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginVertical: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
});

export default PassDocumentScreen;