import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const TransactionCard = ({ transaction }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    // Navigate to transaction details screen with transaction data
    navigation.navigate('TransactionDetails', { transaction });
  };

  return (
    <View style={styles.container} onPress={handlePress}>
      <Text style={styles.title}>{transaction.category}</Text>
      <Text style={styles.amount}>${transaction.amount.toFixed(2)}</Text>
      <Text style={styles.date}>{new Date(transaction.date).toLocaleDateString()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5cb85c',
  },
  date: {
    fontSize: 14,
    color: '#777',
  },
});

export default TransactionCard;