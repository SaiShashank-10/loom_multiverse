import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';

const BillSplittingScreen = ({ route }) => {
  const [routePlanId, setRoutePlanId] = useState(route.params.routePlanId);
  const [amount, setAmount] = useState('');
  const [bills, setBills] = useState([]);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`https://api.roadtripplanner.com/bills/${routePlanId}`);
      setBills(response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const handleSplitBill = async () => {
    try {
      const response = await axios.post(`https://api.roadtripplanner.com/bills/${routePlanId}`, { amount });
      setBills([...bills, response.data]);
      setAmount('');
    } catch (error) {
      console.error('Error splitting bill:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bill Splitting</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        value={amount}
        onChangeText={(text) => setAmount(text)}
        keyboardType="numeric"
      />
      <Button title="Split Bill" onPress={handleSplitBill} />
      <FlatList
        data={bills}
        keyExtractor={(item) => item._id.toString()}
        renderItem={({ item }) => (
          <View style={styles.billItem}>
            <Text>Amount: {item.amount}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  billItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default BillSplittingScreen;