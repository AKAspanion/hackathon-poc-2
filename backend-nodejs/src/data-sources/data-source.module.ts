import { Module } from '@nestjs/common';
import { WeatherDataSourceService } from './weather/weather-data-source.service';
import { NewsDataSourceService } from './news/news-data-source.service';
import { TrafficDataSourceService } from './traffic/traffic-data-source.service';
import { MarketDataSourceService } from './market/market-data-source.service';
import { ShippingRoutesDataSourceService } from './shipping/shipping-routes-data-source.service';
import { DataSourceManagerService } from './data-source-manager.service';

@Module({
  providers: [
    WeatherDataSourceService,
    NewsDataSourceService,
    TrafficDataSourceService,
    MarketDataSourceService,
    ShippingRoutesDataSourceService,
    DataSourceManagerService,
  ],
  exports: [
    WeatherDataSourceService,
    NewsDataSourceService,
    TrafficDataSourceService,
    MarketDataSourceService,
    ShippingRoutesDataSourceService,
    DataSourceManagerService,
  ],
})
export class DataSourceModule {}
