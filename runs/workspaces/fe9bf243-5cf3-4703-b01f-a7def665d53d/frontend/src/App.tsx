import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import TransactionForm from './screens/TransactionForm';
import BudgetForm from './screens/BudgetForm';
import ReportForm from './screens/ReportForm';
import { useAuth } from './context/AuthContext';

const Stack = createStackNavigator();

const App: React.FC = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login screen if not authenticated
      navigation.navigate('Login');
    }
  }, [user, loading]);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: true }} />
        <Stack.Screen name="TransactionForm" component={TransactionForm} options={{ headerShown: true }} />
        <Stack.Screen name="BudgetForm" component={BudgetForm} options={{ headerShown: true }} />
        <Stack.Screen name="ReportForm" component={ReportForm} options={{ headerShown: true }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;