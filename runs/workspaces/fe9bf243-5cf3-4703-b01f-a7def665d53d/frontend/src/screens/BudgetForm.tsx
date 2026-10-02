import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const BudgetForm: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const navigation = useNavigation();

  const handleSaveBudget = async () => {
    try {
      // Validate input
      if (!amount || !startDate || !endDate) {
        Alert.alert('Error', 'All fields are required');
        return;
      }

      // Convert amount to number
      const budgetAmount = parseFloat(amount);
      if (isNaN(budgetAmount)) {
        Alert.alert('Error', 'Invalid amount');
        return;
      }

      // Simulate API call to save budget
      await fetch('/api/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: budgetAmount,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      Alert.alert('Success', 'Budget saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save budget');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Monthly Budget</Text>
      <TextInput
        style={styles.input}
        placeholder="Amount"
        value={amount}
        onChangeText={(text) => setAmount(text)}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Start Date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={(text) => setStartDate(text)}
        keyboardType="default"
      />
      <TextInput
        style={styles.input}
        placeholder="End Date (YYYY-MM-DD)"
        value={endDate}
        onChangeText={(text) => setEndDate(text)}
        keyboardType="default"
      />
      <Button title="Save Budget" onPress={handleSaveBudget} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default BudgetForm;