import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';

const HomeScreen = ({ navigation }) => {
  const [routePlans, setRoutePlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutePlans();
  }, []);

  const fetchRoutePlans = async () => {
    try {
      const response = await axios.get('https://api.roadtripplanner.com/route_plans', {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`, // Replace with actual token retrieval logic
        },
      });
      setRoutePlans(response.data);
    } catch (error) {
      console.error('Failed to fetch route plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccessToken = () => {
    // Replace with actual token retrieval logic
    return 'your_access_token_here';
  };

  const handleCreateRoutePlan = () => {
    navigation.navigate('RoutePlanScreen');
  };

  const renderRoutePlanItem = ({ item }) => (
    <View style={styles.routePlanItem}>
      <Text style={styles.routePlanTitle}>{item.cities.join(', ')}</Text>
      <Button title="View Details" onPress={() => navigation.navigate('RoutePlanScreen', { routePlanId: item._id })} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to RoadTripPlanner</Text>
      <Button title="Create New Route Plan" onPress={handleCreateRoutePlan} />
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={routePlans}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderRoutePlanItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  routePlanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  routePlanTitle: {
    fontSize: 18,
  },
});

export default HomeScreen;