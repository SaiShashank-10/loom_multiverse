import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import RoutePlanScreen from './screens/RoutePlanScreen';
import AccommodationScreen from './screens/AccommodationScreen';
import PassDocumentScreen from './screens/PassDocumentScreen';
import BillSplittingScreen from './screens/BillSplittingScreen';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="RoutePlan" component={RoutePlanScreen} />
        <Stack.Screen name="Accommodation" component={AccommodationScreen} />
        <Stack.Screen name="PassDocument" component={PassDocumentScreen} />
        <Stack.Screen name="BillSplitting" component={BillSplittingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;