export interface DataSourceConfig {
  [key: string]: any;
}

export interface DataSourceResult {
  sourceType: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IDataSource {
  /**
   * Initialize the data source with configuration
   */
  initialize(config: DataSourceConfig): Promise<void>;

  /**
   * Fetch data from the source
   */
  fetchData(params?: Record<string, any>): Promise<DataSourceResult[]>;

  /**
   * Get the type/name of this data source
   */
  getType(): string;

  /**
   * Check if the data source is available/healthy
   */
  isAvailable(): Promise<boolean>;
}
