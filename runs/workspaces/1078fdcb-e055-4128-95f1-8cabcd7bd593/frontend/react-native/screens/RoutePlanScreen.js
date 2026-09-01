import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, TextInput, StyleSheet } from 'react-native';
import axios from 'axios';

const RoutePlanScreen = ({ navigation }) => {
  const [cities, setCities] = useState([]);
  const [newCity, setNewCity] = useState('');
  const [routePlans, setRoutePlans] = useState([]);

  useEffect(() => {
    fetchRoutePlans();
  }, []);

  const fetchRoutePlans = async () => {
    try {
      const response = await axios.get('https://api.roadtripplanner.com/route_plans', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setRoutePlans(response.data);
    } catch (error) {
      console.error('Error fetching route plans:', error);
    }
  };

  const handleAddCity = () => {
    if (newCity.trim() !== '') {
      setCities([...cities, newCity]);
      setNewCity('');
    }
  };

  const handleCreateRoutePlan = async () => {
    try {
      await axios.post('https://api.roadtripplanner.com/route_plans', { cities }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchRoutePlans();
    } catch (error) {
      console.error('Error creating route plan:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Route Plan</Text>
      <TextInput
        value={newCity}
        onChangeText={setNewCity}
        placeholder="Add a city"
        style={styles.input}
      />
      <Button title="Add City" onPress={handleAddCity} />
      <FlatList
        data={cities}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text>{item}</Text>}
      />
      <Button title="Create Route Plan" onPress={handleCreateRoutePlan} />
      <Text style={styles.title}>My Route Plans</Text>
      <FlatList
        data={routePlans}
        keyExtractor={(item, index) => item._id.toString()}
        renderItem={({ item }) => (
          <View style={styles.routePlanItem}>
            <Text>{item.cities.join(', ')}</Text>
            <Button title="View Accommodations" onPress={() => navigation.navigate('AccommodationScreen', { routePlanId: item._id })} />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8
  },
  routePlanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  }
});

export default RoutePlanScreen;