import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseDataSource } from '../base/base-data-source';
import {
  DataSourceConfig,
  DataSourceResult,
} from '../interfaces/data-source.interface';
import axios from 'axios';

@Injectable()
export class WeatherDataSourceService extends BaseDataSource {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  private readonly placeholderKey = 'your_openweather_api_key_here';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  protected async onInitialize(config: DataSourceConfig): Promise<void> {
    const raw =
      config.apiKey ||
      this.configService.get<string>('WEATHER_API_KEY') ||
      '';
    this.apiKey =
      raw && raw !== this.placeholderKey ? raw : '';
    if (!this.apiKey) {
      console.warn(
        'Weather API key not configured. Set WEATHER_API_KEY in .env with a key from https://openweathermap.org/api. Using mock data.',
      );
    }
  }

  getType(): string {
    return 'weather';
  }

  private getMockResult(city: string): DataSourceResult {
    return this.createResult({
      city,
      country: 'US',
      temperature: Math.floor(Math.random() * 30) + 10,
      condition: ['Clear', 'Clouds', 'Rain', 'Storm'][
        Math.floor(Math.random() * 4)
      ],
      description: 'Mock weather data',
      humidity: Math.floor(Math.random() * 100),
      windSpeed: Math.random() * 20,
      visibility: 10000,
      coordinates: {
        lat: Math.random() * 180 - 90,
        lon: Math.random() * 360 - 180,
      },
    });
  }

  async isAvailable(): Promise<boolean> {
    return true; // Can be enhanced with actual health check
  }

  async fetchData(params?: Record<string, any>): Promise<DataSourceResult[]> {
    const cities = params?.cities || [
      'New York',
      'London',
      'Tokyo',
      'Mumbai',
      'Shanghai',
    ];
    const results: DataSourceResult[] = [];

    for (const city of cities) {
      try {
        if (this.apiKey) {
          const response = await axios.get(`${this.baseUrl}/weather`, {
            params: {
              q: city,
              appid: this.apiKey,
              units: 'metric',
            },
          });

          const weatherData = response.data;
          results.push(
            this.createResult({
              city: weatherData.name,
              country: weatherData.sys.country,
              temperature: weatherData.main.temp,
              condition: weatherData.weather[0].main,
              description: weatherData.weather[0].description,
              humidity: weatherData.main.humidity,
              windSpeed: weatherData.wind?.speed || 0,
              visibility: weatherData.visibility,
              coordinates: {
                lat: weatherData.coord.lat,
                lon: weatherData.coord.lon,
              },
            }),
          );
        } else {
          results.push(this.getMockResult(city));
        }
      } catch (error: any) {
        const is401 = error?.response?.status === 401;
        if (is401) {
          results.push(this.getMockResult(city));
        } else {
          console.error(
            `Error fetching weather for ${city}:`,
            error.message,
          );
        }
      }
    }

    return results;
  }
}
