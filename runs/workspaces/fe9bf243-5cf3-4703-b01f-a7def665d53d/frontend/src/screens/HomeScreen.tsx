import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import TransactionCard from '../components/TransactionCard';
import BudgetCard from '../components/BudgetCard';
import ReportChart from '../components/ReportChart';
import { fetchTransactions, fetchBudgets, generateReport } from '../api/expenseService';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchUserTransactions();
    fetchUserBudgets();
    generateUserReport();
  }, []);

  const fetchUserTransactions = async () => {
    try {
      const response = await fetchTransactions(user.userId);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    }
  };

  const fetchUserBudgets = async () => {
    try {
      const response = await fetchBudgets(user.userId);
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      Alert.alert('Error', 'Failed to load budgets');
    }
  };

  const generateUserReport = async () => {
    try {
      const response = await generateReport(user.userId);
      setReportData(response.data);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user.username}!</Text>
      <TouchableOpacity onPress={() => navigation.navigate('TransactionForm')}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Record Income/Spending</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('BudgetForm')}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Set Monthly Budgets</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ReportForm')}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Generate Reports</Text>
        </View>
      </TouchableOpacity>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.expense_id.toString()}
        renderItem={({ item }) => (
          <TransactionCard transaction={item} />
        )}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Recent Transactions</Text>}
      />

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.budget_id.toString()}
        renderItem={({ item }) => (
          <BudgetCard budget={item} />
        )}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Current Budgets</Text>}
      />

      {reportData && (
        <ReportChart reportData={reportData} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
});

export default HomeScreen;