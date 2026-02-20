import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  IDataSource,
  DataSourceConfig,
} from './interfaces/data-source.interface';
import { WeatherDataSourceService } from './weather/weather-data-source.service';
import { NewsDataSourceService } from './news/news-data-source.service';
import { TrafficDataSourceService } from './traffic/traffic-data-source.service';
import { MarketDataSourceService } from './market/market-data-source.service';

@Injectable()
export class DataSourceManagerService implements OnModuleInit {
  private readonly logger = new Logger(DataSourceManagerService.name);
  private dataSources: Map<string, IDataSource> = new Map();

  constructor(
    private readonly weatherDataSource: WeatherDataSourceService,
    private readonly newsDataSource: NewsDataSourceService,
    private readonly trafficDataSource: TrafficDataSourceService,
    private readonly marketDataSource: MarketDataSourceService,
  ) {}

  async onModuleInit() {
    // Initialize all data sources
    await this.registerDataSource(this.weatherDataSource, {});
    await this.registerDataSource(this.newsDataSource, {});
    await this.registerDataSource(this.trafficDataSource, {});
    await this.registerDataSource(this.marketDataSource, {});
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
    this.logger.log('[trigger] fetchAllDataSources started');
    const results = new Map<string, any[]>();

    for (const [type, dataSource] of this.dataSources.entries()) {
      try {
        this.logger.log(`[trigger] Data source "${type}": checking availability`);
        const isAvailable = await dataSource.isAvailable();
        if (isAvailable) {
          this.logger.log(`[trigger] Data source "${type}": fetching data`);
          const data = await dataSource.fetchData(params);
          results.set(type, data);
          this.logger.log(`[trigger] Data source "${type}": fetched ${data.length} items`);
        } else {
          this.logger.warn(`[trigger] Data source "${type}": not available, skipping`);
        }
      } catch (error) {
        this.logger.error(`[trigger] Data source "${type}": fetch failed`, error.message);
        results.set(type, []);
      }
    }

    this.logger.log('[trigger] fetchAllDataSources completed');
    return results;
  }
}
