import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  IDataSource,
  DataSourceConfig,
} from './interfaces/data-source.interface';
import { WeatherDataSourceService } from './weather/weather-data-source.service';
import { NewsDataSourceService } from './news/news-data-source.service';
import { TrafficDataSourceService } from './traffic/traffic-data-source.service';
import { MarketDataSourceService } from './market/market-data-source.service';
import { ShippingRoutesDataSourceService } from './shipping/shipping-routes-data-source.service';

@Injectable()
export class DataSourceManagerService implements OnModuleInit {
  private readonly logger = new Logger(DataSourceManagerService.name);
  private dataSources: Map<string, IDataSource> = new Map();

  constructor(
    private readonly weatherDataSource: WeatherDataSourceService,
    private readonly newsDataSource: NewsDataSourceService,
    private readonly trafficDataSource: TrafficDataSourceService,
    private readonly marketDataSource: MarketDataSourceService,
    private readonly shippingRoutesDataSource: ShippingRoutesDataSourceService,
  ) {}

  async onModuleInit() {
    await this.registerDataSource(this.weatherDataSource, {});
    await this.registerDataSource(this.newsDataSource, {});
    await this.registerDataSource(this.trafficDataSource, {});
    await this.registerDataSource(this.marketDataSource, {});
    await this.registerDataSource(this.shippingRoutesDataSource, {});
  }

  async registerDataSource(
    dataSource: IDataSource,
    config: DataSourceConfig,
  ): Promise<void> {
    await dataSource.initialize(config);
    this.dataSources.set(dataSource.getType(), dataSource);
  }

  getDataSource(type: string): IDataSource | undefined {
    return this.dataSources.get(type);
  }

  getAllDataSources(): IDataSource[] {
    return Array.from(this.dataSources.values());
  }

  async fetchAllDataSources(
    params?: Record<string, any>,
  ): Promise<Map<string, any[]>> {
    return this.fetchDataSourcesByTypes(
      Array.from(this.dataSources.keys()),
      params,
    );
  }

  /** Fetch only from the given data source types (e.g. ['weather', 'news'] for supplier scope). */
  async fetchDataSourcesByTypes(
    types: string[],
    params?: Record<string, any>,
  ): Promise<Map<string, any[]>> {
    this.logger.log(
      `[trigger] fetchDataSourcesByTypes started: ${types.join(', ')}`,
    );
    const results = new Map<string, any[]>();

    for (const type of types) {
      const dataSource = this.dataSources.get(type);
      if (!dataSource) {
        this.logger.warn(`[trigger] Data source "${type}": not registered`);
        results.set(type, []);
        continue;
      }
      try {
        const isAvailable = await dataSource.isAvailable();
        if (isAvailable) {
          const data = await dataSource.fetchData(params);
          results.set(type, data);
          this.logger.log(
            `[trigger] Data source "${type}": fetched ${data.length} items`,
          );
        } else {
          this.logger.warn(`[trigger] Data source "${type}": not available`);
          results.set(type, []);
        }
      } catch (error) {
        this.logger.error(
          `[trigger] Data source "${type}": fetch failed`,
          (error as Error).message,
        );
        results.set(type, []);
      }
    }

    this.logger.log('[trigger] fetchDataSourcesByTypes completed');
    return results;
  }
}
