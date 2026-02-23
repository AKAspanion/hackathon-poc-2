import { Injectable } from '@nestjs/common';
import { BaseDataSource } from '../base/base-data-source';
import {
  DataSourceConfig,
  DataSourceResult,
} from '../interfaces/data-source.interface';

/** Data source for shipping routes and disruption data (ports, lanes, delays, incidents). */
@Injectable()
export class ShippingRoutesDataSourceService extends BaseDataSource {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async onInitialize(config: DataSourceConfig): Promise<void> {
    // Could integrate with maritime/shipping APIs (e.g. MarineTraffic, port authorities)
  }

  getType(): string {
    return 'shipping';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchData(params?: Record<string, any>): Promise<DataSourceResult[]> {
    const routes = params?.routes || [
      { origin: 'Shanghai', destination: 'Los Angeles' },
      { origin: 'Rotterdam', destination: 'Singapore' },
      { origin: 'Singapore', destination: 'Tokyo' },
    ];

    const results: DataSourceResult[] = [];
    const disruptionReasons = [
      'port_congestion',
      'weather',
      'labor_strike',
      'canal_delay',
      'vessel_shortage',
      null,
    ];

    for (const route of routes) {
      const hasDisruption = Math.random() > 0.5;
      const reason = hasDisruption
        ? disruptionReasons[Math.floor(Math.random() * (disruptionReasons.length - 1))]
        : null;
      const delayDays = hasDisruption ? Math.floor(Math.random() * 14) + 1 : 0;

      results.push(
        this.createResult({
          origin: route.origin,
          destination: route.destination,
          route: `${route.origin} → ${route.destination}`,
          status: hasDisruption ? 'disrupted' : 'normal',
          delayDays,
          disruptionReason: reason,
          vesselAvailability: hasDisruption ? 'low' : 'normal',
          portConditions: hasDisruption ? 'congested' : 'normal',
          estimatedRecoveryDays: hasDisruption ? delayDays + Math.floor(Math.random() * 7) : 0,
        }),
      );
    }

    return results;
  }
}
