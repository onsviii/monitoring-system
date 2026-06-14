/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Competitor } from '../types';

export const mockCompetitors: Competitor[] = [
  {
    id: 'comp_1',
    name: 'Світ Кави',
    type: 'Кав’ярня третьої хвилі',
    distance: '0.2 км',
    reviewsCount: 342,
    rating: 4.7,
    coordinates: { x: 45, y: 35 },
    aspects: {
      service: 1,  // Positive
      product_quality: 1,  // Positive
      price: -1,   // Negative (expensive)
      location: 1, // Positive
    },
    uniqueTags: [
      { text: 'Преміальні зерна', type: 'positive', sources: 42 },
      { text: 'Професійні бариста', type: 'positive', sources: 28 },
      { text: 'Висока ціна на еспресо', type: 'negative', sources: 18 },
    ],
  },
  {
    id: 'comp_2',
    name: 'Кафе Кентавр',
    type: 'Класичний ресторан-кафе',
    distance: '0.1 км',
    reviewsCount: 412,
    rating: 4.4,
    coordinates: { x: 55, y: 50 },
    aspects: {
      service: 1,
      product_quality: 0,  // Neutral
      price: -1,
      location: null, // Not mentioned
    },
    uniqueTags: [
      { text: 'Літній майданчик', type: 'positive', sources: 56 },
      { text: 'Повільний розрахунок', type: 'negative', sources: 22 },
      { text: 'Автентичний декор', type: 'positive', sources: 15 },
    ],
  },
  {
    id: 'comp_3',
    name: 'Альтернативна Кава',
    type: 'Міні-кав’ярня, take away',
    distance: '0.8 км',
    reviewsCount: 189,
    rating: 4.8,
    coordinates: { x: 30, y: 65 },
    aspects: {
      service: 1,
      product_quality: 1,
      price: null,   // Not mentioned
      location: -1, // Negative (hard to find/small)
    },
    uniqueTags: [
      { text: 'Доступний прайс', type: 'positive', sources: 31 },
      { text: 'Обмежене меню', type: 'neutral', sources: 12 },
      { text: 'Маленьке приміщення', type: 'negative', sources: 25 },
    ],
  },
  {
    id: 'comp_4',
    name: 'Цісар',
    type: 'Цілодобове бюджетне кафе',
    distance: '1.2 км',
    reviewsCount: 297,
    rating: 3.9,
    coordinates: { x: 70, y: 25 },
    aspects: {
      service: -1,
      product_quality: -1,
      price: 1,
      location: 0,
    },
    uniqueTags: [
      { text: 'Низькі ціни', type: 'positive', sources: 48 },
      { text: 'Проблеми з чистотою', type: 'negative', sources: 34 },
      { text: 'Шумно ввечері', type: 'negative', sources: 19 },
    ],
  }
];