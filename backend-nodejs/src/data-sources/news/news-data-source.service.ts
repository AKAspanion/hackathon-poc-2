import { Injectable } from '@nestjs/common';
import { BaseDataSource } from '../base/base-data-source';
import {
  DataSourceConfig,
  DataSourceResult,
} from '../interfaces/data-source.interface';
import axios from 'axios';

@Injectable()
export class NewsDataSourceService extends BaseDataSource {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  protected async onInitialize(config: DataSourceConfig): Promise<void> {
    this.apiKey = config.apiKey || process.env.NEWS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('News API key not configured. Using mock data.');
    }
  }

  getType(): string {
    return 'news';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetchData(params?: Record<string, any>): Promise<DataSourceResult[]> {
    const keywords = params?.keywords || [
      'supply chain',
      'manufacturing',
      'logistics',
      'shipping',
    ];
    const results: DataSourceResult[] = [];

    try {
      if (this.apiKey) {
        for (const keyword of keywords) {
          const response = await axios.get(`${this.baseUrl}/everything`, {
            params: {
              q: keyword,
              apiKey: this.apiKey,
              sortBy: 'publishedAt',
              pageSize: 5,
            },
          });

          for (const article of response.data.articles || []) {
            results.push(
              this.createResult({
                title: article.title,
                description: article.description,
                url: article.url,
                source: article.source.name,
                publishedAt: article.publishedAt,
                author: article.author,
                content: article.content,
              }),
            );
          }
        }
      } else {
        // Mock data for development
        const mockArticles = [
          {
            title: 'Supply Chain Disruption in Southeast Asia',
            description: 'Major shipping routes affected by weather conditions',
            source: 'Supply Chain News',
            publishedAt: new Date().toISOString(),
          },
          {
            title: 'Manufacturing Plant Closure Announced',
            description: 'Factory shutdown due to supplier issues',
            source: 'Manufacturing Today',
            publishedAt: new Date().toISOString(),
          },
        ];

        for (const article of mockArticles) {
          results.push(this.createResult(article));
        }
      }
    } catch (error) {
      console.error('Error fetching news:', error.message);
      // Return mock data on error
      results.push(
        this.createResult({
          title: 'Supply Chain Alert',
          description: 'Mock news data - API unavailable',
          source: 'System',
          publishedAt: new Date().toISOString(),
        }),
      );
    }

    return results;
  }
}
