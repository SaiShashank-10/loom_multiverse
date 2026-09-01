import { RoutePlan } from '../models/RoutePlan';
import { City } from '../models/City';
import { GeolocationService } from '../services/geolocationService';

export class RouteService {
  private geolocationService: GeolocationService;

  constructor(geolocationService: GeolocationService) {
    this.geolocationService = geolocationService;
  }

  public async createRoutePlan(cities: string[]): Promise<RoutePlan> {
    try {
      const cityObjects = await this.getCitiesFromNames(cities);
      const routePlan = new RoutePlan(cityObjects);
      return routePlan.save();
    } catch (error) {
      throw new Error(`Failed to create route plan: ${error.message}`);
    }
  }

  public async getRoutePlans(userId: string): Promise<RoutePlan[]> {
    try {
      return RoutePlan.find({ user_id: userId });
    } catch (error) {
      throw new Error(`Failed to retrieve route plans for user ${userId}: ${error.message}`);
    }
  }

  private async getCitiesFromNames(cities: string[]): Promise<City[]> {
    const cityObjects = await Promise.all(
      cities.map(async (cityName) => {
        try {
          const cityData = await this.geolocationService.getCityByName(cityName);
          return new City(cityData);
        } catch (error) {
          throw new Error(`Failed to fetch geolocation data for city ${cityName}: ${error.message}`);
        }
      })
    );
    return cityObjects;
  }
}