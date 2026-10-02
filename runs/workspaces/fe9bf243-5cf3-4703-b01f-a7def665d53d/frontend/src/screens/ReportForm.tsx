import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { generateReport } from '../store/actions/reportActions';

const ReportForm = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerateReport = async () => {
    try {
      await dispatch(generateReport(startDate, endDate));
      navigation.navigate('Reports');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Generate Financial Report</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Start Date:</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={(text) => setStartDate(text)}
          placeholder="YYYY-MM-DD"
          keyboardType="numeric"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>End Date:</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={(text) => setEndDate(text)}
          placeholder="YYYY-MM-DD"
          keyboardType="numeric"
        />
      </View>
      <Button title="Generate Report" onPress={handleGenerateReport} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F4F4F9',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
});

export default ReportForm;