import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import { fetchUserExpenses } from '../api/expenseApi';

const ReportChart = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (user) {
      fetchUserExpenses(user.userId)
        .then(data => {
          setExpenses(data);
        })
        .catch(error => {
          console.error('Error fetching expenses:', error);
        });
    }
  }, [user]);

  const chartData = {
    labels: expenses.map(expense => expense.date),
    datasets: [
      {
        data: expenses.map(expense => expense.amount),
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, // red
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={styles.container}>
      {expenses.length > 0 ? (
        <LineChart
          data={chartData}
          width={screenWidth}
          height={220}
          yAxisLabel="$"
          chartConfig={{
            backgroundColor: '#e26a00',
            backgroundGradientFrom: '#2c2c2c',
            backgroundGradientTo: '#e26a00',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#ffa726',
            },
          }}
        />
      ) : (
        <Text style={styles.emptyText}>No expenses to display</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});

export default ReportChart;