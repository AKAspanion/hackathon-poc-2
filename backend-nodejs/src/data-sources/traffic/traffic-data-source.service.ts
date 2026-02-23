import { Injectable } from '@nestjs/common';
import { BaseDataSource } from '../base/base-data-source';
import {
  DataSourceConfig,
  DataSourceResult,
} from '../interfaces/data-source.interface';

@Injectable()
export class TrafficDataSourceService extends BaseDataSource {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async onInitialize(config: DataSourceConfig): Promise<void> {
    // Initialize traffic data source
    // Could integrate with Google Maps API, TomTom, etc.
  }

  getType(): string {
    return 'traffic';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchData(params?: Record<string, any>): Promise<DataSourceResult[]> {
    const routes = params?.routes || [
      { origin: 'New York', destination: 'Los Angeles' },
      { origin: 'London', destination: 'Paris' },
      { origin: 'Tokyo', destination: 'Osaka' },
    ];

    const results: DataSourceResult[] = [];

    // Mock traffic data - in production, integrate with actual traffic APIs
    for (const route of routes) {
      const delay = Math.floor(Math.random() * 120); // 0-120 minutes
      const congestionLevel = ['low', 'medium', 'high', 'severe'][
        Math.floor(Math.random() * 4)
      ];

      results.push(
        this.createResult({
          origin: route.origin,
          destination: route.destination,
          estimatedDelay: delay,
          congestionLevel,
          averageSpeed: Math.floor(Math.random() * 60) + 20,
          incidents: Math.floor(Math.random() * 3),
          routeStatus: delay > 60 ? 'delayed' : 'normal',
        }),
      );
    }

    return results;
  }
}
