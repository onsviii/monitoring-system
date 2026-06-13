import { authenticatedFetch } from './apiClient';
import { API_ENDPOINTS, AnalysisStage } from '../config/constants';
import { handleBackendResponse } from './errorHelper';
import { ChatMessage } from '../types';

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
  userRatingCount: number | null;
  location: Location;
}

export interface PlaceSearchResponse {
  candidates: PlaceCandidate[];
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

export interface AnalysisStatusResponse {
  id: string;
  stage: AnalysisStage;
  progress: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  competitorsCount: number;
}

// Aspect keys match the backend Aspect enum serialization (uppercase)
export interface ReviewAspects {
  SERVICE: number;
  PRODUCT_QUALITY: number;
  PRICE: number;
  LOCATION: number;
}

export interface CompetitorDto {
  id: string;
  name: string;
  address?: string;
  nicheCode: string;
  rating?: number;
  reviewCount: number;
  isOwn: boolean;
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
  id?: string;
  text: string;
  sourceReviewIds?: string[];
}

export interface CompetitorReportResponse {
  sessionId: string;
  reportName: string;
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
        SERVICE: number | null;
        PRODUCT_QUALITY: number | null;
        PRICE: number | null;
        LOCATION: number | null;
      };
    }>;
    positioningMatrix?: Array<{
      competitorId: string;
      competitorName: string;
      isOwn?: boolean;
      priceSentiment: number;
      qualitySentiment: number;
    }>;
    sentimentTrends?: Array<{
      competitorId: string;
      competitorName: string;
      isOwn?: boolean;
      points: Array<{
        month: string;
        avgPolarity: number;
        reviewCount: number;
      }>;
    }>;
  };
  competitors: CompetitorDto[];
  recommendations: RecommendationDto[];
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

export interface UpdateReportNameResponse {
  sessionId: string;
  reportName: string;
}

export interface NicheDto {
  code: string;
  displayName: string;
}

export async function retryAnalysis(id: string): Promise<AnalysisStatusResponse> {
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

export async function createAnalysis(payload: CreateAnalysisRequest): Promise<AnalysisStatusResponse> {
  const response = await authenticatedFetch(API_ENDPOINTS.ANALYSES, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await handleBackendResponse(response, 'Помилка створення аналізу');
  return response.json();
}

export async function getAnalysisStatus(id: string, signal?: AbortSignal): Promise<AnalysisStatusResponse> {
  const endpoint = API_ENDPOINTS.ANALYSIS_STATUS.replace('{id}', id);
  const response = await authenticatedFetch(endpoint, { method: 'GET', signal });
  await handleBackendResponse(response, `Помилка отримання статусу аналізу [ID: ${id}]`);
  return response.json();
}

export async function getAnalysisReport(id: string, signal?: AbortSignal): Promise<CompetitorReportResponse> {
  const endpoint = API_ENDPOINTS.ANALYSIS_REPORT.replace('{id}', id);
  const response = await authenticatedFetch(endpoint, { method: 'GET', signal });
  await handleBackendResponse(response, `Помилка отримання звіту аналізу [ID: ${id}]`);
  return response.json();
}

export async function updateReportName(id: string, reportName: string): Promise<UpdateReportNameResponse> {
  const endpoint = API_ENDPOINTS.ANALYSIS_REPORT.replace('{id}', id);
  const response = await authenticatedFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify({ reportName }),
  });
  await handleBackendResponse(response, `Помилка оновлення назви звіту [ID: ${id}]`);
  return response.json();
}

export async function getAnalysisSources(id: string, competitorId: string, aspect: string): Promise<SourcesResponse> {
  const endpoint = `${API_ENDPOINTS.ANALYSIS_SOURCES.replace('{id}', id)}?competitor=${encodeURIComponent(competitorId)}&aspect=${encodeURIComponent(aspect)}`;
  const response = await authenticatedFetch(endpoint, { method: 'GET' });
  await handleBackendResponse(response, `Помилка отримання першоджерел [ID: ${id}]`);
  return response.json();
}

// Backend POST /messages returns MessageResponse { id, role, text, timestamp }
export async function sendChatMessage(analysisId: string, message: string): Promise<ChatMessage> {
  const endpoint = API_ENDPOINTS.CHAT_MESSAGES.replace('{id}', analysisId);
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ text: message }),
  });
  await handleBackendResponse(response, `Помилка відправки повідомлення у чат аналізу [ID: ${analysisId}]`);
  return response.json();
}

// Backend GET /messages returns List<MessageResponse> [{ id, role, text, timestamp }]
export async function getChatHistory(analysisId: string): Promise<ChatMessage[]> {
  const endpoint = API_ENDPOINTS.CHAT_MESSAGES.replace('{id}', analysisId);
  const response = await authenticatedFetch(endpoint, { method: 'GET' });
  await handleBackendResponse(response, `Помилка отримання історії повідомлень чату [ID: ${analysisId}]`);
  return response.json();
}
