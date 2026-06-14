/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ключі локального сховища для збереження сесійних даних користувач.
 */
export const STORAGE_KEYS = {
  JWT_TOKEN: 'cim_access_token',
  TOKEN: 'cim_access_token', // Для зворотної сумісності з apiClient
  AUTH_TOKEN: 'cim_access_token', // Для зворотної сумісності з новим apiClient
  USER_ROLE: 'cim_user_role',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Базова адреса API
 */
export const API_BASE_URL = '';

/**
 * REST ендпоінти для інтеграції з Spring Boot бекендом (REST-контракт)
 */
export const API_ENDPOINTS = {
  PREVIEW: '/api/v1/analyses/preview',
  ANALYSES: '/api/v1/analyses',
  ANALYSIS_STATUS: '/api/v1/analyses/{id}',
  ANALYSIS_REPORT: '/api/v1/analyses/{id}/report',
  ANALYSIS_SOURCES: '/api/v1/analyses/{id}/sources',
  CHAT_MESSAGES: '/api/v1/analyses/{id}/messages',
  SYSTEM_METRICS: '/api/v1/system/metrics',
  SYSTEM_LOGS: '/api/v1/system/logs',
  PROFILE: '/api/v1/profile',
  PLACES_SEARCH: '/api/v1/places/search',
} as const;

/**
 * Ролі користувачів у системі.
 */
export const USER_ROLES = {
  BUSINESS_OWNER: 'BUSINESS',
  TECHNICAL_OPERATOR: 'OPERATOR',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Статуси асинхронного бекенд-пайплайну аналізу конкурентного середовища.
 */
export const ANALYSIS_STAGES = {
  IDLE: 'IDLE',
  COLLECTING_DATA: 'COLLECTING_DATA',
  ANONYMIZING: 'ANONYMIZING',
  CLASSIFYING: 'CLASSIFYING',
  EXTRACTING_CHARACTERISTICS: 'EXTRACTING_CHARACTERISTICS',
  GENERATING_REPORT: 'GENERATING_REPORT',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type AnalysisStage = typeof ANALYSIS_STAGES[keyof typeof ANALYSIS_STAGES];
