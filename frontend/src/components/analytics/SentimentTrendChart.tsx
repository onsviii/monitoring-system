/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SentimentTrendPoint {
  month: string;        // "2026-01"
  avgPolarity: number;  // -1.0 ... +1.0
  reviewCount: number;
}

interface SentimentTrendSeries {
  competitorId: string;
  competitorName: string;
  isOwn?: boolean;
  points: SentimentTrendPoint[];
}

interface SentimentTrendChartProps {
  id?: string;
  businessName?: string;
  heightClass?: string;
  trendData?: SentimentTrendSeries[];
}

const colors = ['#10b981', '#f59e0b', '#d97706', '#ef4444', '#06b6d4'];

export const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({ id, businessName, trendData, heightClass }) => {
  const ownName = `${businessName || 'Копальня кави'} (Ви)`;

  // Full-featured aligned mock data on -1.0 ... +1.0 polarity scale
  const defaultTrendData: SentimentTrendSeries[] = [
    {
      competitorId: 'own_business',
      competitorName: ownName,
      isOwn: true,
      points: [
        { month: '2025-09', avgPolarity: 0.45, reviewCount: 15 },
        { month: '2025-11', avgPolarity: 0.55, reviewCount: 25 },
        { month: '2026-01', avgPolarity: 0.65, reviewCount: 30 },
        { month: '2026-03', avgPolarity: 0.80, reviewCount: 28 },
        { month: '2026-05', avgPolarity: 0.85, reviewCount: 42 },
      ]
    },
    {
      competitorId: 'comp_1',
      competitorName: 'Світ Кави',
      isOwn: false,
      points: [
        { month: '2025-09', avgPolarity: 0.70, reviewCount: 12 },
        { month: '2025-11', avgPolarity: 0.68, reviewCount: 18 },
        { month: '2026-01', avgPolarity: 0.72, reviewCount: 20 },
        { month: '2026-03', avgPolarity: 0.75, reviewCount: 24 },
        { month: '2026-05', avgPolarity: 0.78, reviewCount: 25 },
      ]
    },
    {
      competitorId: 'comp_2',
      competitorName: 'Кафе Кентавр',
      isOwn: false,
      points: [
        { month: '2025-09', avgPolarity: 0.20, reviewCount: 10 },
        { month: '2025-11', avgPolarity: 0.15, reviewCount: 14 },
        { month: '2026-01', avgPolarity: 0.30, reviewCount: 12 },
        { month: '2026-03', avgPolarity: 0.25, reviewCount: 10 },
        { month: '2026-05', avgPolarity: 0.28, reviewCount: 15 },
      ]
    },
    {
      competitorId: 'comp_3',
      competitorName: 'Альтернативна Кава',
      isOwn: false,
      points: [
        { month: '2025-09', avgPolarity: 0.40, reviewCount: 16 },
        { month: '2025-11', avgPolarity: 0.45, reviewCount: 15 },
        { month: '2026-01', avgPolarity: 0.52, reviewCount: 18 },
        { month: '2026-03', avgPolarity: 0.48, reviewCount: 20 },
        { month: '2026-05', avgPolarity: 0.50, reviewCount: 22 },
      ]
    },
    {
      competitorId: 'comp_4',
      competitorName: 'Цісар',
      isOwn: false,
      points: [
        { month: '2025-09', avgPolarity: -0.20, reviewCount: 8 },
        { month: '2025-11', avgPolarity: -0.35, reviewCount: 11 },
        { month: '2026-01', avgPolarity: -0.40, reviewCount: 9 },
        { month: '2026-03', avgPolarity: -0.55, reviewCount: 15 },
        { month: '2026-05', avgPolarity: -0.48, reviewCount: 12 },
      ]
    },
    {
      competitorId: 'comp_5',
      competitorName: 'Кавовий куточок', // Test case: competitor with only one month of data
      isOwn: false,
      points: [
        { month: '2026-05', avgPolarity: 0.10, reviewCount: 5 },
      ]
    }
  ];

  const rawTrends = trendData && trendData.length > 0 ? trendData : defaultTrendData;

  // Resolve own competitor names dynamically based on user context
  const resolvedTrends = rawTrends.map(series => {
    if (series.isOwn || series.competitorId === 'own_business' || series.competitorName.includes('(Ви)')) {
      return {
        ...series,
        competitorName: ownName,
        isOwn: true,
      };
    }
    return series;
  });

  // Stateful client-side filtering for competitors comparison
  const [visibleIds, setVisibleIds] = React.useState<string[]>(() => {
    const ownComp = resolvedTrends.find(s => s.isOwn);
    const otherComps = resolvedTrends.filter(s => !s.isOwn);
    const defaultVisible: string[] = [];
    if (ownComp) {
      defaultVisible.push(ownComp.competitorId);
    }
    // Default visible: own + nearest 3 competitors (total 4)
    otherComps.slice(0, 3).forEach(c => defaultVisible.push(c.competitorId));
    return defaultVisible;
  });

  const toggleCompetitor = (competitorId: string) => {
    setVisibleIds(prev => 
      prev.includes(competitorId)
        ? prev.filter(id => id !== competitorId)
        : [...prev, competitorId]
    );
  };

  // Extract all unique months and sort them chronologically
  const uniqueMonths = Array.from(
    new Set<string>(
      resolvedTrends.flatMap(series => series.points.map(p => p.month))
    )
  ).sort();

  // Helper to format "YYYY-MM" to readable Ukrainian format "Міс YYYY"
  const formatMonthLabel = (monthStr: string): string => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const monthNames: Record<string, string> = {
      '01': 'Січ',
      '02': 'Лют',
      '03': 'Бер',
      '04': 'Кві',
      '05': 'Тра',
      '06': 'Чер',
      '07': 'Лип',
      '08': 'Сер',
      '09': 'Вер',
      '10': 'Жов',
      '11': 'Лис',
      '12': 'Гру'
    };
    return monthNames[month] ? `${monthNames[month]} ${year}` : `${month}/${year}`;
  };

  // Convert schema points representation to the flat Recharts row structure
  const chartData = uniqueMonths.map(month => {
    const row: any = {
      monthKey: month,
      monthFormatted: formatMonthLabel(month),
    };
    
    resolvedTrends.forEach(series => {
      const matchPt = series.points.find(p => p.month === month);
      if (matchPt) {
        row[series.competitorName] = matchPt.avgPolarity;
        row[`${series.competitorName}_count`] = matchPt.reviewCount;
      }
    });

    return row;
  });

  // Format reviews helper to ensure Ukrainian grammatical plural form congruence
  const formatReviewCountUk = (count: number): string => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return `${count} відгук`;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return `${count} відгуки`;
    }
    return `${count} відгуків`;
  };

  // Custom tooltips to present polarity index and base statistics correctly
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filter out guys that are not currently visible
      const visiblePayload = payload.filter((p: any) => {
        const compName = p.name;
        const matchingSeries = resolvedTrends.find(s => s.competitorName === compName);
        return matchingSeries ? visibleIds.includes(matchingSeries.competitorId) : true;
      });

      if (visiblePayload.length === 0) return null;

      return (
        <div className="bg-white border border-gray-150 p-3.5 rounded-lg shadow-md text-xs space-y-2 max-w-xs transition-all">
          <p className="font-bold text-gray-800 border-b border-gray-100 pb-1 mb-1">
            {label}
          </p>
          <div className="space-y-1.5">
            {visiblePayload.map((p: any, i: number) => {
              const compName = p.name;
              const isOwn = compName === ownName;
              const reviewCount = p.payload[`${compName}_count`];
              const score = p.value;

              return (
                <div key={i} className="flex flex-col border-b border-gray-50/50 pb-1 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center gap-4">
                    <span className={`font-semibold ${isOwn ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}>
                      {compName}
                    </span>
                    <span className={`font-mono font-bold ${score >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
                    </span>
                  </div>
                  {reviewCount !== undefined && (
                    <span className="text-[10px] text-gray-400 font-normal">
                      База: {formatReviewCountUk(reviewCount)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id={id} className="w-full space-y-1">
      <div className={`w-full ${heightClass || 'h-56'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 30, left: -22, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="monthFormatted" 
              tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }} 
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis 
              domain={[-1.05, 1.05]} 
              ticks={[-1.0, -0.5, 0, 0.5, 1.0]}
              tick={{ fontSize: 9, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTrendTooltip />} />
            
            {visibleIds.length === 0 && (
              <Line
                key="dummy-invisible-line"
                type="monotone"
                dataKey="dummy_nonexistent"
                stroke="transparent"
                dot={false}
                activeDot={false}
              />
            )}

            {resolvedTrends.map((series, index) => {
              const isVisible = visibleIds.includes(series.competitorId);
              if (!isVisible) return null;

              const isOwn = series.isOwn;
              const color = isOwn ? '#4f46e5' : colors[index % colors.length];
              
              const isSinglePoint = series.points.length === 1;

              return (
                <Line
                  key={series.competitorId}
                  type="monotone"
                  dataKey={series.competitorName}
                  stroke={color}
                  strokeWidth={isOwn ? 3.5 : 1.5}
                  /* Active state highlighted */
                  activeDot={{ r: isOwn ? 7 : 5, strokeWidth: 1, stroke: '#fff' }}
                  /* Ensure dot is ALWAYS visible, especially when single point */
                  dot={{ r: isOwn ? 4 : (isSinglePoint ? 4.5 : 2), strokeWidth: 0.5 }}
                  connectNulls={true}
                  style={{ filter: isOwn ? 'drop-shadow(0px 2px 4px rgba(79, 70, 229, 0.25))' : 'none' }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Beautiful Interactive Clickable Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs mt-2">
        <span className="font-semibold text-gray-400 uppercase tracking-wider text-[8px] mr-1">Порівняння закладів:</span>
        {resolvedTrends.map((series, index) => {
          const isVisible = visibleIds.includes(series.competitorId);
          const isOwn = series.isOwn;
          const color = isOwn ? '#4f46e5' : colors[index % colors.length];
          return (
            <button
              key={series.competitorId}
              id={`legend-btn-${series.competitorId}`}
              onClick={() => toggleCompetitor(series.competitorId)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                isVisible 
                  ? 'bg-gray-50 border-gray-200 text-gray-800 shadow-xs scale-100 hover:bg-gray-100' 
                  : 'bg-white border-transparent text-gray-400 opacity-60 hover:opacity-85 hover:border-gray-100'
              }`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full inline-block border transition-transform duration-200" 
                style={{ 
                  backgroundColor: isVisible ? color : 'transparent', 
                  borderColor: color,
                  borderWidth: isOwn ? '2px' : '1.5px',
                  transform: isVisible ? 'scale(1)' : 'scale(0.8)'
                }} 
              />
              <span className={isOwn ? 'font-bold' : 'font-medium'}>
                {series.competitorName}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-1">
        Позитивний тренд вказує на покращення репутації, негативний — на погіршення.
      </p>
    </div>
  );
};

export default SentimentTrendChart;
