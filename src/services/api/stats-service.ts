import { apiClient } from '../axios-services';

export type InOutGroupBy = 'day' | 'zone' | 'room';

export interface InOutStatRow {
  key: string;
  label: string;
  inCount: number;
  outCount: number;
  people: number;
}

export interface InOutStatsResponse {
  success: boolean;
  data: {
    groupBy: InOutGroupBy;
    totalIn: number;
    totalOut: number;
    rows: InOutStatRow[];
  };
}

export interface InOutStatsParams {
  groupBy: InOutGroupBy;
  startDate?: string;
  endDate?: string;
  tzOffset?: number;
}

export class StatsService {
  private static instance: StatsService;

  private constructor() {}

  public static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  public async getInOutStats(
    params: InOutStatsParams,
  ): Promise<InOutStatsResponse> {
    return apiClient.get<InOutStatsResponse>('/stats/in-out', params);
  }
}

export const statsService = StatsService.getInstance();
