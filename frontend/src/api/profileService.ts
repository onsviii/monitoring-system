/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authenticatedFetch } from './apiClient';
import { API_ENDPOINTS } from '../config/constants';
import { handleBackendResponse } from './errorHelper';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface ProfileDto {
  businessName: string;
  nicheCode: string;
  googlePlaceId?: string | null;
  address?: string;
  location: Location;
}

export interface PlaceCandidateDto {
  googlePlaceId: string;
  name: string;
  address: string;
  rating: number;
  userRatingCount: number | null;
  location: Location;
}

export async function createProfile(dto: ProfileDto): Promise<ProfileDto> {
  const response = await authenticatedFetch(API_ENDPOINTS.PROFILE, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  await handleBackendResponse(response, 'Не вдалося створити профіль на бекенді');
  return response.json();
}

export async function getProfile(): Promise<ProfileDto> {
  const response = await authenticatedFetch(API_ENDPOINTS.PROFILE, { method: 'GET' });
  await handleBackendResponse(response, 'Не вдалося завантажити профіль з бекенду');
  return response.json();
}

// Backend: GET /api/v1/places/search?query=&nicheCode=&lat=&lng=
// Returns: PlaceSearchResponse { candidates: PlaceCandidate[] }
export async function searchPlaces(
  query: string,
  nicheCode: string,
  lat?: number,
  lng?: number,
): Promise<PlaceCandidateDto[]> {
  let url = `${API_ENDPOINTS.PLACES_SEARCH}?query=${encodeURIComponent(query)}&nicheCode=${encodeURIComponent(nicheCode)}`;
  if (lat !== undefined && lng !== undefined) {
    url += `&lat=${lat}&lng=${lng}`;
  }
  const response = await authenticatedFetch(url, { method: 'GET' });
  await handleBackendResponse(response, 'Не вдалося провести пошук закладу на бекенді');
  const data: { candidates: PlaceCandidateDto[] } = await response.json();
  return data.candidates ?? [];
}