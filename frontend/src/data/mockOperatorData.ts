/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AspectMetric {
  aspect: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface CollectionErrorLog {
  id: string;
  timestamp: string;
  sessionId: string;
  status: 'TIMEOUT' | 'LIMIT' | 'FORMAT_ERROR' | 'RETRY_BACKOFF';
  message: string;
  recoveryMechanism: string;
}

export interface LlmInteractionLog {
  id: string;
  timestamp: string;
  sessionId: string;
  moduleName: 'Feature Extractor' | 'Strategy Recommendation Engine' | 'Compliance Validator';
  promptTokens: number;
  completionTokens: number;
  jsonValidation: 'VALID' | 'WARNING' | 'FAILED_RECOVERY';
  promptPreview: string;
  responsePreview: string;
}

export const generalLmMlMetrics = {
  modelName: 'ukr-roberta-base-aspect-v1.2',
  releaseDate: '12.04.2025',
  overallAccuracy: 0.78,
  overallMacroF1: 0.767,
  targetMacroF1Threshold: 0.75, // FR-04 target
  testSampleSize: 500,
  anonymizedReviewsCount: 14520, // GDPR Compliance marker
};

export const aspectClassifierMetrics: AspectMetric[] = [
  { aspect: 'Сервіс', precision: 0.84, recall: 0.81, f1: 0.823, support: 154 },
  { aspect: 'Якість', precision: 0.79, recall: 0.75, f1: 0.767, support: 182 },
  { aspect: 'Ціна', precision: 0.75, recall: 0.72, f1: 0.736, support: 96 },
  { aspect: 'Локація', precision: 0.69, recall: 0.67, f1: 0.678, support: 68 },
];

export const mockErrorLogs: CollectionErrorLog[] = [
  {
    id: 'err_1',
    timestamp: '2026-05-27T14:32:01Z',
    sessionId: '#task-88d4c9-ml',
    status: 'TIMEOUT',
    message: 'Таймаут з’єднання (timeout > 5000ms) при отриманні Places API деталей',
    recoveryMechanism: 'Triggered Fallback: Switch connection to backup endpoint & decreasing request limit.',
  },
  {
    id: 'err_2',
    timestamp: '2026-05-27T13:15:44Z',
    sessionId: '#task-77b102-ml',
    status: 'LIMIT',
    message: 'Перевищено ліміт запитів (HTTP 429 Too Many Requests) від Google geocoding API',
    recoveryMechanism: 'Triggered Retry-with-backoff: Exponential wait 1s -> 2s -> 4s. Recovery SUCCESS.',
  },
  {
    id: 'err_3',
    timestamp: '2026-05-27T11:02:17Z',
    sessionId: '#task-32c0af-ml',
    status: 'FORMAT_ERROR',
    message: 'Зміна формату відповіді API (Missing "reviews" wrapper у деяких локаціях)',
    recoveryMechanism: 'Fallback: Parse using raw DOM elements or fallback to secondary crawler interface.',
  }
];

export const mockLlmLogs: LlmInteractionLog[] = [
  {
    id: 'llm_1',
    timestamp: '2026-05-27T14:35:12Z',
    sessionId: '#task-88d4c9-ml',
    moduleName: 'Feature Extractor',
    promptTokens: 1840,
    completionTokens: 320,
    jsonValidation: 'VALID',
    promptPreview: 'Task: Extract unique features & customer tags from 42 positive coffee shop reviews.\nContext:\n- Location: Classy place.\nConstraints:\n- Output exclusively valid JSON [ { "text": string, "type": "positive" | "negative", "sources": number } ]',
    responsePreview: '[\n  { "text": "Преміальні зерна", "type": "positive", "sources": 42 },\n  { "text": "Професійні бариста", "type": "positive", "sources": 28 }\n]',
  },
  {
    id: 'llm_2',
    timestamp: '2026-05-27T14:37:58Z',
    sessionId: '#task-88d4c9-ml',
    moduleName: 'Strategy Recommendation Engine',
    promptTokens: 2310,
    completionTokens: 480,
    jsonValidation: 'VALID',
    promptPreview: 'Task: Formulate strategic recommendations based on detected high-negatives.\nAspects detected:\n- service: negative (waiting time > 15m), count: 22\n- price: negative (high cost of croissants), count: 9',
    responsePreview: '[\n  { "title": "Оптимізувати швидкість обслуговування в пікові години", "description": "Почніть впроваджувати швидкі черги або мобільне замовлення..." }\n]',
  },
  {
    id: 'llm_3',
    timestamp: '2026-05-27T10:41:20Z',
    sessionId: '#task-32c0af-ml',
    moduleName: 'Compliance Validator',
    promptTokens: 1250,
    completionTokens: 189,
    jsonValidation: 'WARNING',
    promptPreview: 'Check generated recommendation against EU AI Act high-risk classification criteria.',
    responsePreview: '{\n  "isCompliant": true,\n  "auditRequired": false,\n  "disclaimerInjected": true\n}',
  }
];
