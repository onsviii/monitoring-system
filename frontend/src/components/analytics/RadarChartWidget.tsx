/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface RadarChartWidgetProps {
  id?: string;
  businessName?: string;
  heightClass?: string;
  hideLegend?: boolean;
  radarData?: Array<{
    competitorId: string;
    competitorName: string;
    isOwn?: boolean;
    aspects: {
      SERVICE?: number;
      PRODUCT_QUALITY?: number;
      PRICE?: number;
      LOCATION?: number;
    };
  }>;
}

const colors = ['#10b981', '#f59e0b', '#d97706', '#ef4444', '#06b6d4'];

export const RadarChartWidget: React.FC<RadarChartWidgetProps> = ({ id, businessName, radarData, heightClass, hideLegend = false }) => {
  const ownName = `${businessName || 'Копальня кави'} (Ви)`;

  // Fallback mock data fully compliant with the external Spring Boot backend data model (-1.0 ... +1.0)
  const defaultRadarData = [
    {
      competitorId: 'own_business',
      competitorName: ownName,
      isOwn: true,
      aspects: {
        service: 0.8,
        product_quality: 0.9,
        price: 0.4,
        location: 0.9,
      }
    },
    {
      competitorId: 'comp_1',
      competitorName: 'Світ Кави',
      isOwn: false,
      aspects: {
        service: 0.7,
        product_quality: 0.8,
        price: -0.6,
        location: 0.8,
      }
    },
    {
      competitorId: 'comp_2',
      competitorName: 'Кафе Кентавр',
      isOwn: false,
      aspects: {
        service: 0.6,
        product_quality: 0.3,
        price: -0.4,
        location: 0.8,
      }
    },
    {
      competitorId: 'comp_3',
      competitorName: 'Альтернативна Кава',
      isOwn: false,
      aspects: {
        service: 0.7,
        product_quality: 0.5,
        price: 0.8,
        location: -0.4,
      }
    },
    {
      competitorId: 'comp_4',
      competitorName: 'Цісар',
      isOwn: false,
      aspects: {
        service: -0.5,
        product_quality: -0.8,
        price: 0.7,
        location: 0.1,
      }
    }
  ];

  // Resolve and update competitor names with the dynamically fetched businessName
  const competitorsList = (radarData && radarData.length > 0 ? radarData : defaultRadarData).map(comp => {
    if (comp.isOwn || comp.competitorId === 'own_business' || comp.competitorName.includes('(Ви)')) {
      return {
        ...comp,
        competitorName: ownName,
        isOwn: true,
      };
    }
    return comp;
  });

  // Stateful client-side filtering for competitors comparison
  const [visibleIds, setVisibleIds] = React.useState<string[]>(() => {
    const ownComp = competitorsList.find(c => c.isOwn);
    const otherComps = competitorsList.filter(c => !c.isOwn);
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

  const aspectLabels: Record<string, string> = {
    SERVICE: 'Сервіс',
    PRODUCT_QUALITY: 'Якість продукту',
    PRICE: 'Ціна',
    LOCATION: 'Локація',
  };

  const aspectsKeys = ['SERVICE', 'PRODUCT_QUALITY', 'PRICE', 'LOCATION'];

  // Map aspects objects onto axes rows for Recharts
  const chartData = aspectsKeys.map(key => {
    const row: any = {
      aspect: aspectLabels[key] || key,
      key,
    };
    competitorsList.forEach(comp => {
      row[comp.competitorName] = comp.aspects[key as keyof typeof comp.aspects] ?? 0;
    });
    return row;
  });

  // Custom tooltip to show values properly
  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Filter out guys that are not currently visible
      const visiblePayload = payload.filter((p: any) => {
        const comp = competitorsList.find(c => c.competitorName === p.name);
        return comp ? visibleIds.includes(comp.competitorId) : true;
      });

      if (visiblePayload.length === 0) return null;

      return (
        <div className="bg-white border border-gray-100 p-3 rounded-lg shadow-sm text-xs space-y-1">
          <p className="font-bold text-gray-800 border-b border-gray-100 pb-1 mb-1">
            {payload[0].payload.aspect}
          </p>
          {visiblePayload.map((p: any, i: number) => {
            const isOwn = p.name === ownName;
            return (
              <div key={i} className="flex justify-between gap-6 items-center">
                <span className={`font-medium ${isOwn ? 'text-indigo-600 font-bold' : 'text-gray-600'}`}>
                  {p.name}
                </span>
                <span className={`font-mono font-bold ${isOwn ? 'text-indigo-600' : 'text-gray-700'}`}>
                  {p.value > 0 ? `+${p.value.toFixed(2)}` : p.value.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div id={id} className="w-full flex flex-col items-center space-y-3">
      <div className={`w-full ${heightClass || 'h-72'} flex items-center justify-center`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="aspect" tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }} />
            {/* Centered at -1, outer bound is +1 */}
            <PolarRadiusAxis 
              angle={45} 
              domain={[-1, 1]} 
              tickCount={5}
              tick={{ fill: '#9ca3af', fontSize: 9 }} 
            />
            
            {visibleIds.length === 0 && (
              <Radar
                key="dummy-invisible-radar"
                name="dummy"
                dataKey="dummy_nonexistent"
                stroke="transparent"
                fill="transparent"
              />
            )}

            {competitorsList.map((comp, index) => {
              const isVisible = visibleIds.includes(comp.competitorId);
              if (!isVisible) return null;

              const isOwn = comp.isOwn;
              const color = isOwn ? '#4f46e5' : colors[index % colors.length];
              return (
                <Radar
                  key={comp.competitorId}
                  name={comp.competitorName}
                  dataKey={comp.competitorName}
                  stroke={color}
                  fill={color}
                  fillOpacity={isOwn ? 0.25 : 0.04}
                  strokeWidth={isOwn ? 3.5 : 1.5}
                />
              );
            })}
            
            <Tooltip content={<CustomRadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Beautiful Interactive Clickable Legend */}
      {!hideLegend && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs mt-2 w-full max-w-lg">
          <span className="font-semibold text-gray-400 uppercase tracking-wider text-[8px] mr-1">Порівняння закладів:</span>
          {competitorsList.map((comp, index) => {
            const isVisible = visibleIds.includes(comp.competitorId);
            const isOwn = comp.isOwn;
            const color = isOwn ? '#4f46e5' : colors[index % colors.length];
            return (
              <button
                key={comp.competitorId}
                id={`legend-btn-${comp.competitorId}`}
                onClick={() => toggleCompetitor(comp.competitorId)}
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
                  {comp.competitorName}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RadarChartWidget;
