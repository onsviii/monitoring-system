import { authenticatedFetch } from './apiClient';
import { API_ENDPOINTS } from '../config/constants';

// Matches backend MetricResponse
export interface MetricResponse {
  id: string;
  metricName: string;
  value: number;
  modelVersion: string;
  capturedAt: string;
}

// Matches backend LogEntryResponse
export interface SystemLogEntry {
  id: string;
  sessionId: string;
  type: 'COLLECTION' | 'LLM';
  detail: string;
  timestamp: string;
}

export async function getMetrics(): Promise<MetricResponse[]> {
  const response = await authenticatedFetch(API_ENDPOINTS.SYSTEM_METRICS, { method: 'GET' });
  if (!response.ok) throw new Error(`Помилка завантаження системних метрик: ${response.statusText}`);
  return response.json();
}

export async function getLogs(type?: 'collection' | 'llm'): Promise<SystemLogEntry[]> {
  const query = type ? `?type=${encodeURIComponent(type.toUpperCase())}` : '';
  const response = await authenticatedFetch(`${API_ENDPOINTS.SYSTEM_LOGS}${query}`, { method: 'GET' });
  if (!response.ok) throw new Error(`Помилка завантаження логів системи: ${response.statusText}`);
  return response.json();
}