import {
  IDataSource,
  DataSourceConfig,
  DataSourceResult,
} from '../interfaces/data-source.interface';

export abstract class BaseDataSource implements IDataSource {
  protected config: DataSourceConfig = {};
  protected initialized = false;

  async initialize(config: DataSourceConfig): Promise<void> {
    this.config = config;
    await this.onInitialize(config);
    this.initialized = true;
  }

  abstract fetchData(params?: Record<string, any>): Promise<DataSourceResult[]>;
  abstract getType(): string;
  abstract isAvailable(): Promise<boolean>;

  protected abstract onInitialize(config: DataSourceConfig): Promise<void>;

  protected createResult(
    data: Record<string, any>,
    metadata?: Record<string, any>,
  ): DataSourceResult {
    return {
      sourceType: this.getType(),
      timestamp: new Date(),
      data,
      metadata,
    };
  }
}
