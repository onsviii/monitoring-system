/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Competitor {
  id: string;
  name: string;
  type: string;
  distance: string;
  reviewsCount: number;
  rating: number;
  coordinates: { x: number; y: number }; // Relative percentage for map
  aspects: {
    SERVICE: number | null;
    PRODUCT_QUALITY: number | null;
    PRICE: number | null;
    LOCATION: number | null;
  };
  uniqueTags: {
    text: string;
    type: 'positive' | 'negative' | 'neutral';
    sources: number;
  }[];
  isOwn?: boolean;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  aspect: string;
  sourcesCount: number;
  references: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT';
  text: string;
  timestamp: string;
}

export interface ReviewQuote {
  id: string;
  competitorName: string;
  aspect: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'positive' | 'negative' | 'neutral';
  text: string;
  ratingValue: number;
  date: string;
}
