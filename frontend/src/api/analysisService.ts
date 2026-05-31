import { authenticatedFetch } from './apiClient';
import { API_ENDPOINTS, AnalysisStage } from '../config/constants';
import { handleBackendResponse } from './errorHelper';

/**
 * Запит на запуск аналізу (DTO) за новим контрактом
 */
export interface Location {
  latitude: number;
  longitude: number;
}

export interface PreviewAnalysisRequest {
  nicheCode: string;
  location: Location;
  radiusKm: number;
  maxCompetitors: number;
}

export interface PlaceCandidate {
  googlePlaceId: string;
  name: string;
  address: string;
  rating: number;
  location: Location;
}

export interface PlaceSearchResponse {
  candidates: PlaceCandidate[];
}

/**
 * Проста відповідь при створенні аналізу (DTO)
 */
export interface AnalysisResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  stage: AnalysisStage;
  createdAt: string;
}

export interface SelectedPlace {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
}

export interface CreateAnalysisRequest {
  nicheCode: string;
  reportName: string;
  location: Location;
  radiusKm: number;
  selectedPlaces: SelectedPlace[];
}

export interface AnalysisResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  stage: AnalysisStage;
  createdAt: string;
}

/**
 * Детальний статус аналізу з результатами (DTO)
 */
export interface AnalysisStatusResponse {
  id: string;
  stage: AnalysisStage;
  progress: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  competitorsCount?: number;
}

/**
 * Повний аналітичний звіт конкурентного аналізу (DTO для FR-07)
 */
export interface ReviewAspects {
  service: number;          // -1.0 ... +1.0
  product_quality: number;  // -1.0 ... +1.0
  price: number;            // -1.0 ... +1.0
  location: number;         // -1.0 ... +1.0
}

export interface CompetitorDto {
  id: string; // or UUID
  name: string;
  address?: string;
  nicheCode: string;
  rating?: number;
  reviewCount?: number;
  isOwn?: boolean;
  aspects?: Array<{
    aspect: string;
    averagePolarity: number;
    averageConfidence: number;
    count: number;
  }>;
  freeCharacteristics?: Array<{
    id: string;
    text: string;
    sourceReviewIds: string[];
  }>;
}

export interface RecommendationDto {
  title?: string;
  description: string;
  priority?: string;
}

export interface CompetitorReportResponse {
  sessionId: string;
  generatedAt: string;
  aiMarked: boolean;
  disclaimer: string;
  aggregatedStatistics?: {
    radarChart?: Array<{
      competitorId: string;
      competitorName: string;
      isOwn?: boolean;
      aspects: ReviewAspects;
    }>;
    heatmap?: Array<{
      competitorId: string;
      competitorName: string;
      aspects: {
        service: number | null;
        product_quality: number | null;
        price: number | null;
        location: number | null;
      };
    }>;
    positioningMatrix?: Array<{
      competitorId: string;
      competitorName: string;
      isOwn?: boolean;
      priceSentiment: number;     // X-axis (-1.0 ... +1.0)
      qualitySentiment: number;    // Y-axis (-1.0 ... +1.0)
    }>;
    sentimentTrends?: Array<{
      competitorId: string;
      competitorName: string;
      isOwn?: boolean;
      points: Array<{
        month: string;        // format "2026-01"
        avgPolarity: number;  // -1.0 ... +1.0
        reviewCount: number;
      }>;
    }>;
  };
  competitors: CompetitorDto[];
  recommendations: RecommendationDto[];
}

/**
 * Елемент першоджерела - оригінальний відгук (DTO для FR-08)
 */
export interface PrimarySource {
  id: string;
  text: string;
  rating: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  date: string;
}

/**
 * Відповідь про першоджерела заспектного аналізу
 */
export interface PrimarySourcesResponse {
  analysisId: string;
  competitorId: string;
  aspectName: string;
  sources: PrimarySource[];
}

// Matches backend MessageResponse { id, role, text, timestamp }
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

/**
 * Відповідь на надсилання повідомлення в чат (DTO)
 */
export interface ChatMessageResponse {
  messageId: string;
  reply: string;
  sender: 'ASSISTANT';
  timestamp: string;
}

export interface NicheDto {
  code: string;
  displayName: string;
}

export interface ReviewSourceDto {
  id: string;
  text: string;
  rating: number;
  createdAt: string;
  polarity: number;
  confidenceScore: number;
}

export interface SourcesResponse {
  reviews: ReviewSourceDto[];
}

export async function retryAnalysis(id: string): Promise<AnalysisResponse> {
  const endpoint = `${API_ENDPOINTS.ANALYSES}/${id}/retry`;
  const response = await authenticatedFetch(endpoint, { method: 'POST' });
  await handleBackendResponse(response, `Помилка відновлення аналізу [ID: ${id}]`);
  return response.json();
}

export async function getNiches(): Promise<NicheDto[]> {
  try {
    const response = await authenticatedFetch('/api/v1/niches', { method: 'GET' });
    await handleBackendResponse(response, 'Помилка отримання бізнес-категорій');
    return response.json();
  } catch (err) {
    console.warn('Failed to fetch niches:', err);
    return [];
  }
}

export async function previewAnalysis(payload: PreviewAnalysisRequest): Promise<PlaceSearchResponse> {
  const response = await authenticatedFetch(API_ENDPOINTS.PREVIEW, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await handleBackendResponse(response, 'Помилка при пошуку конкурентів');
  return response.json();
}

export async function createAnalysis(payload: CreateAnalysisRequest): Promise<AnalysisResponse> {
  const response = await authenticatedFetch(API_ENDPOINTS.ANALYSES, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await handleBackendResponse(response, 'Помилка створення аналізу');
  return response.json();
}

export async function getAnalysisStatus(id: string): Promise<AnalysisStatusResponse> {
  const endpoint = API_ENDPOINTS.ANALYSIS_STATUS.replace('{id}', id);
  const response = await authenticatedFetch(endpoint, { method: 'GET' });
  await handleBackendResponse(response, `Помилка отримання статусу аналізу [ID: ${id}]`);
  return response.json();
}

export async function getAnalysisReport(id: string): Promise<CompetitorReportResponse> {
  const endpoint = API_ENDPOINTS.ANALYSIS_REPORT.replace('{id}', id);
  const response = await authenticatedFetch(endpoint, { method: 'GET' });
  await handleBackendResponse(response, `Помилка отримання звіту аналізу [ID: ${id}]`);
  return response.json();
}

export async function getAnalysisSources(id: string, competitorId: string, aspect: string): Promise<SourcesResponse> {
  const endpoint = `${API_ENDPOINTS.ANALYSIS_SOURCES.replace('{id}', id)}?competitor=${encodeURIComponent(competitorId)}&aspect=${encodeURIComponent(aspect)}`;
  const response = await authenticatedFetch(endpoint, { method: 'GET' });
  await handleBackendResponse(response, `Помилка отримання першоджерел [ID: ${id}]`);
  return response.json();
}

export async function sendChatMessage(analysisId: string, message: string): Promise<ChatMessageResponse> {
  const endpoint = API_ENDPOINTS.CHAT_MESSAGES.replace('{id}', analysisId);
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ text: message }),
  });
  await handleBackendResponse(response, `Помилка відправки повідомлення у чат аналізу [ID: ${analysisId}]`);
  return response.json();
}

export async function getChatHistory(analysisId: string): Promise<ChatMessage[]> {
  const endpoint = API_ENDPOINTS.CHAT_MESSAGES.replace('{id}', analysisId);
  const response = await authenticatedFetch(endpoint, { method: 'GET' });
  await handleBackendResponse(response, `Помилка отримання історії повідомлень чату [ID: ${analysisId}]`);
  return response.json();
}