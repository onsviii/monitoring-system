/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Competitor, Recommendation, ReviewQuote } from '../types';

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
      quality: 1,  // Positive
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
      quality: 0,  // Neutral
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
      quality: 1,
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
      quality: -1,
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

export const mockRecommendations: Recommendation[] = [
  {
    id: 'rec_1',
    title: 'Оптимізувати швидкість обслуговування в пікові години',
    description: 'Головний конкурент "Світ Кави" та сусідній "Кентавр" стикаються з критикою тривалості очікування (22+ відгуки). Впровадження мобільного замовлення або оптимізація робочого місця бариста створить відчутну конкурентну перевагу.',
    impact: 'HIGH',
    aspect: 'service',
    sourcesCount: 14,
    references: [
      '«Чекали на фільтр-каву більше 20 хвилин...» — Світ Кави',
      '«Обслуговування дуже повільне, офіціанти не встигають» — Кафе Кентавр',
      '«Черга на вулицю, працював лише один касир» — Світ Кави'
    ],
  },
  {
    id: 'rec_2',
    title: 'Розробити збалансовану цінову пропозицію для десертів',
    description: 'У сегменті преміальних кав’ярень спостерігається прогалина: користувачі хочуть високу якість кави, але висловлюють невдоволення цінами супутніх кондитерських виробів. Створення комбо-меню допоможе підвищити середній чек.',
    impact: 'MEDIUM',
    aspect: 'price',
    sourcesCount: 9,
    references: [
      '«Кава супер, а от шматочок сирника за 180 грн — це занадто» — Світ Кави',
      '«Ціни на десерти невиправдано високі» — Кафе Кентавр'
    ],
  },
  {
    id: 'rec_3',
    title: 'Посилити маркетинг унікальних "фішок" локації',
    description: 'Аналіз унікальних переваг показує високий інтерес до автентичного декору та літніх терас. Оскільки ваша локація ("Копальня кави") має унікальний підземний шахтарський антураж, акцент на цій атмосфері залучить туристів.',
    impact: 'HIGH',
    aspect: 'location',
    sourcesCount: 18,
    references: [
      '«Каска на вході та вогняне шоу роблять настрій!» — Копальня кави',
      '«Атмосфера шахти неперевершена, дуже оригінально» — Копальня кави'
    ],
  }
];

export const mockReviews: ReviewQuote[] = [
  // Світ Кави - Service
  {
    id: 'rev_1',
    competitorName: 'Світ Кави',
    aspect: 'Сервіс',
    sentiment: 'negative',
    text: 'Чекали на фільтр-каву більше 20 хвилин в неділю зранку. Персонал забіганий і неуважний.',
    ratingValue: 3,
    date: '15.04.2025',
  },
  {
    id: 'rev_2',
    competitorName: 'Світ Кави',
    aspect: 'Сервіс',
    sentiment: 'positive',
    text: 'Дуже привітні бариста, завжди порадять найкращий сорт зерен під твій смак.',
    ratingValue: 5,
    date: '10.05.2025',
  },
  // Світ Кави - Price
  {
    id: 'rev_3',
    competitorName: 'Світ Кави',
    aspect: 'Ціна',
    sentiment: 'negative',
    text: 'Занадто високі ціни. Останнім часом прайс підняли, а порції десертів зменшились.',
    ratingValue: 3,
    date: '28.04.2025',
  },
  // Кафе Кентавр - Service
  {
    id: 'rev_4',
    competitorName: 'Кафе Кентавр',
    aspect: 'Сервіс',
    sentiment: 'negative',
    text: 'Обслуговування дуже повільне, офіціанти проходять повз і не бачать клієнтів.',
    ratingValue: 2,
    date: '02.05.2025',
  },
  // Альтернативна Кава - Location
  {
    id: 'rev_5',
    competitorName: 'Альтернативна Кава',
    aspect: 'Локація',
    sentiment: 'negative',
    text: 'Кав’ярня крихітна, всередині тісно і немає нормальних місць для сидіння. Тільки з собою.',
    ratingValue: 3,
    date: '12.04.2025',
  },
  // Цісар - Quality
  {
    id: 'rev_6',
    competitorName: 'Цісар',
    aspect: 'Якість',
    sentiment: 'negative',
    text: 'Кава жахлива, кисла і гірка одночасно. Їжа посередня, відчувається дешевизна інгредієнтів.',
    ratingValue: 2,
    date: '19.05.2025',
  }
];

// Sentiment trend history over months
export const mockSentimentTrend = [
  { month: 'Січ 24', 'Наш рейтинг': 4.2, 'Середній ринковий': 4.0 },
  { month: 'Бер 24', 'Наш рейтинг': 4.3, 'Середній ринковий': 4.1 },
  { month: 'Тра 24', 'Наш рейтинг': 4.5, 'Середній ринковий': 4.1 },
  { month: 'Лип 24', 'Наш рейтинг': 4.4, 'Середній ринковий': 4.2 },
  { month: 'Вер 24', 'Наш рейтинг': 4.6, 'Середній ринковий': 4.2 },
  { month: 'Лис 24', 'Наш рейтинг': 4.5, 'Середній ринковий': 4.3 },
  { month: 'Січ 25', 'Наш рейтинг': 4.6, 'Середній ринковий': 4.2 },
  { month: 'Бер 25', 'Наш рейтинг': 4.7, 'Середній ринковий': 4.3 },
  { month: 'Тра 25', 'Наш рейтинг': 4.8, 'Середній ринковий': 4.4 },
];

// Positioning coordinates for Scatter Matrix
export const mockPositioningData = [
  { name: 'Копальня кави (Ви)', quality: 85, price: 60, r: 25 },
  { name: 'Світ Кави', quality: 90, price: 90, r: 18 },
  { name: 'Кафе Кентавр', quality: 70, price: 80, r: 20 },
  { name: 'Альтернативна Кава', quality: 80, price: 40, r: 15 },
  { name: 'Цісар', quality: 40, price: 20, r: 22 },
];
