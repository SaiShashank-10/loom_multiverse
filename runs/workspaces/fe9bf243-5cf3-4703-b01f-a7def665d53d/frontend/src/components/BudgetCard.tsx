import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const BudgetCard = ({ budget }) => {
  const navigation = useNavigation();
  const [scale] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('BudgetForm', { budget })}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, { transform: [{ scale }] }]}
    >
      <View style={styles.header}>
        <Text style={styles.category}>{budget.category}</Text>
        <Text style={styles.amount}>${budget.amount.toFixed(2)}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.date}>{new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e2734',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#ffffff',
  },
});

export default BudgetCard;