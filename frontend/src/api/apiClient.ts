/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STORAGE_KEYS, API_BASE_URL } from '../config/constants';
import { auth } from '../config/firebase';

export async function authenticatedFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  let token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();

      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch (error) {
      console.error("[authenticatedFetch] Помилка оновлення токена Firebase:", error);
    }
  }

  const headers = new Headers(options?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    if (response.status === 401) {
      console.warn("Отримано 401. Токен недійсний або юзер заблокований.");
    }

    return response;
  } catch (error) {
    console.error(`[authenticatedFetch] Помилка запиту до ${url}:`, error);
    throw error;
  }
}

export default authenticatedFetch;