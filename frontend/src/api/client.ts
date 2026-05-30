/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STORAGE_KEYS, API_BASE_URL } from '../config/constants';
import { auth } from '../config/firebase';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  /**
   * Constructs the headers, automatically checking for a JWT token
   * and setting default content type format requests.
   */
  private getHeaders(customHeaders: HeadersInit = {}): Headers {
    const headers = new Headers(customHeaders);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    // Attempt to inject token if available
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Primary network request runner using native fetch.
   */
  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...restOptions } = options;

    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url = `${url}?${searchParams.toString()}`;
    }

    const headers = this.getHeaders(customHeaders);
    const config: RequestInit = {
      ...restOptions,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 202 Accepted specifically (long-polling task starters)
      if (response.status === 202) {
        const data = await response.json();
        return data as T;
      }

      if (!response.ok) {
        let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.message) {
            errorMessage = errorBody.message;
          }
        } catch {
          // If response body isn't JSON, ignore parsing error
        }
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return {} as T;
      }

      if (response.headers.get('X-Refresh-Token') === 'true') {
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken(true);
          localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
        }
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`[API Client] Error targeting ${url}:`, error);
      throw error;
    }
  }

  get<T>(endpoint: string, params?: Record<string, string>, options: Omit<FetchOptions, 'body' | 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET', params });
  }

  post<T>(endpoint: string, body?: unknown, options: Omit<FetchOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options: Omit<FetchOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options: Omit<FetchOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
