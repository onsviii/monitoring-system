/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  Cell,
  ReferenceLine,
} from 'recharts';

interface PositioningMatrixProps {
  id?: string;
  businessName?: string;
  heightClass?: string;
  isCompact?: boolean;
  matrixData?: Array<{
    competitorId: string;
    competitorName: string;
    isOwn?: boolean;
    priceSentiment: number;     // X-axis (-1.0 ... +1.0)
    qualitySentiment: number;    // Y-axis (-1.0 ... +1.0)
  }>;
}

const colors = ['#10b981', '#f59e0b', '#d97706', '#ef4444', '#06b6d4'];

export const PositioningMatrix: React.FC<PositioningMatrixProps> = ({ id, businessName, matrixData, heightClass, isCompact = false }) => {
  const ownName = `${businessName || 'Копальня кави'} (Ви)`;

  // Deeply aligned mock/fallback data matching backend's real polarity scale (-1.0 ... +1.0)
  const defaultMatrixData = [
    {
      competitorId: 'own_business',
      competitorName: ownName,
      isOwn: true,
      priceSentiment: 0.35,      // X-axis (more on the affordable/value side)
      qualitySentiment: 0.82     // Y-axis (very high quality)
    },
    {
      competitorId: 'comp_1',
      competitorName: 'Світ Кави',
      isOwn: false,
      priceSentiment: -0.65,     // X-axis (considered expensive)
      qualitySentiment: 0.75     // Y-axis (high quality)
    },
    {
      competitorId: 'comp_2',
      competitorName: 'Кафе Кентавр',
      isOwn: false,
      priceSentiment: -0.20,     // X-axis (somewhat expensive)
      qualitySentiment: 0.25     // Y-axis (moderate quality)
    },
    {
      competitorId: 'comp_3',
      competitorName: 'Альтернативна Кава',
      isOwn: false,
      priceSentiment: 0.50,      // X-axis (good value/affordable)
      qualitySentiment: 0.30     // Y-axis (moderate quality)
    },
    {
      competitorId: 'comp_4',
      competitorName: 'Цісар',
      isOwn: false,
      priceSentiment: 0.60,      // X-axis (very cheap/affordable)
      qualitySentiment: -0.45    // Y-axis (lower product quality sentiment)
    }
  ];

  // Map and sync the competitor names with the actual dynamic businessName
  const resolvedData = (matrixData && matrixData.length > 0 ? matrixData : defaultMatrixData).map(item => {
    if (item.isOwn || item.competitorId === 'own_business' || item.competitorName.includes('(Ви)')) {
      return {
        ...item,
        competitorName: ownName,
        isOwn: true
      };
    }
    return item;
  });

  // Stateful client-side filtering for competitors comparison
  const [visibleIds, setVisibleIds] = React.useState<string[]>(() => {
    const ownComp = resolvedData.find(item => item.isOwn);
    const otherComps = resolvedData.filter(item => !item.isOwn);
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

  const filteredScatterData = resolvedData.filter(item => visibleIds.includes(item.competitorId));
  const displayScatterData = filteredScatterData.length > 0
    ? filteredScatterData
    : [{ competitorId: 'dummy_scale', competitorName: '', priceSentiment: 0, qualitySentiment: 0, isDummy: true }];

  // Custom tooltips showing precise polarity indices
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-100 p-3 rounded-lg shadow-md text-xs space-y-1.5 max-w-xs transition-all">
          <p className="font-bold text-gray-800 border-b border-gray-100 pb-1 mb-1">
            {data.competitorName}
          </p>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Сприйняття ціни (X):</span>
            <span className={`font-mono font-bold ${data.priceSentiment >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {data.priceSentiment > 0 ? `+${data.priceSentiment.toFixed(2)}` : data.priceSentiment.toFixed(2)}
              <span className="text-[9px] font-normal text-gray-400 block text-right">
                {data.priceSentiment >= 0 ? 'Вигідно / Доступно' : 'Дорого'}
              </span>
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Якість продукту (Y):</span>
            <span className={`font-mono font-bold ${data.qualitySentiment >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {data.qualitySentiment > 0 ? `+${data.qualitySentiment.toFixed(2)}` : data.qualitySentiment.toFixed(2)}
              <span className="text-[9px] font-normal text-gray-400 block text-right">
                {data.qualitySentiment >= 0 ? 'Висока якість' : 'Нижча якість'}
              </span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const watermarkBase = isCompact
    ? "absolute pointer-events-none select-none opacity-45 text-[8.5px] font-semibold uppercase text-center px-1.5 py-0.5 rounded border leading-tight shadow-4xs"
    : "absolute pointer-events-none select-none opacity-50 text-[10.5px] font-bold uppercase text-center px-2 py-1 rounded border leading-normal shadow-3xs whitespace-nowrap";

  return (
    <div id={id} className="w-full space-y-4">
      {/* 4 Quadrants Legend / Info Header */}
      <div className={`grid grid-cols-2 ${isCompact ? 'gap-1 text-[10px]' : 'md:grid-cols-4 gap-2 text-xs'}`}>
        <div className="bg-emerald-50 text-emerald-800 p-1.5 rounded border border-emerald-100/50 text-center">
          <p className="font-bold">Преміум Вигода (+,+)</p>
          <p className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} opacity-90`}>Висока якість, вигідна ціна</p>
        </div>
        <div className="bg-blue-50 text-blue-800 p-1.5 rounded border border-blue-100/50 text-center">
          <p className="font-bold">Ексклюзив (-,+)</p>
          <p className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} opacity-90`}>Висока якість, але дорого</p>
        </div>
        <div className="bg-amber-50 text-amber-800 p-1.5 rounded border border-amber-100/55 text-center">
          <p className="font-bold">Бюджетний компроміс (+,-)</p>
          <p className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} opacity-90`}>Доступно, але низька якість</p>
        </div>
        <div className="bg-rose-50/70 text-rose-800 p-1.5 rounded border border-rose-100/60 text-center">
          <p className="font-bold">Ринковий аутсайдер (-,-)</p>
          <p className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} opacity-90`}>Дорого та низька якість</p>
        </div>
      </div>

      <div className={`w-full ${heightClass || 'h-64'} relative border border-gray-150 rounded-xl bg-gray-50/50 p-2 overflow-hidden`}>
        {/* Quadrant Visual Watermarks in the Background */}
        <div className={`${watermarkBase} ${isCompact ? 'top-[28%] left-[28%]' : 'top-[23%] left-[23%]'} -translate-x-1/2 -translate-y-1/2 text-blue-800/80 bg-blue-50/40 border-blue-200/30`}>
          Ексклюзив<br />(Дорого / Якісно)
        </div>
        <div className={`${watermarkBase} ${isCompact ? 'top-[28%] left-[76%]' : 'top-[23%] left-[77%]'} -translate-x-1/2 -translate-y-1/2 text-emerald-800/80 bg-emerald-50/40 border-emerald-200/30`}>
          Преміум Вигода<br />(Дешево / Якісно)
        </div>
        <div className={`${watermarkBase} ${isCompact ? 'top-[68%] left-[28%]' : 'top-[75%] left-[23%]'} -translate-x-1/2 -translate-y-1/2 text-rose-800/80 bg-rose-50/35 border-rose-200/30`}>
          Ринковий Аутсайдер<br />(Дорого / Неякісно)
        </div>
        <div className={`${watermarkBase} ${isCompact ? 'top-[68%] left-[76%]' : 'top-[75%] left-[77%]'} -translate-x-1/2 -translate-y-1/2 text-amber-800/80 bg-amber-50/40 border-amber-200/30`}>
          Бюджетний компроміс<br />(Дешево / Неякісно)
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 15, right: 25, bottom: 20, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            
            {/* Horizontal & Vertical Crosshair Lines splitting quadrants perfectly at zero boundary */}
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" />
            <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" />

            <XAxis 
              type="number" 
              dataKey="priceSentiment" 
              name="priceSentiment" 
              domain={[-1.1, 1.1]} 
              ticks={[-1.0, -0.5, 0, 0.5, 1.0]}
              tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
            >
              <Label 
                value="← Дорожче   •   Сприйняття цінової політики (Користь)   •   Доступніше / Вигідніше →" 
                offset={-8} 
                position="insideBottom" 
                style={{ fill: '#4b5563', fontSize: 9, fontWeight: 600 }} 
              />
            </XAxis>

            <YAxis 
              type="number" 
              dataKey="qualitySentiment" 
              name="qualitySentiment" 
              domain={[-1.1, 1.1]}
              ticks={[-1.0, -0.5, 0, 0.5, 1.0]}
              tick={{ fontSize: 9, fill: '#4b5563', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
            >
              <Label 
                value="Сприйняття якості продукту (Тональність) →" 
                angle={-90} 
                position="insideLeft" 
                style={{ fill: '#4b5563', fontSize: 9, fontWeight: 600, textAnchor: 'middle' }} 
                offset={5} 
              />
            </YAxis>

            <ZAxis type="number" range={[180, 180]} />
            
            <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />
            
            <Scatter name="Competitors" data={displayScatterData}>
              {displayScatterData.map((entry) => {
                if ('isDummy' in entry && entry.isDummy) {
                  return <Cell key="dummy" fill="none" stroke="none" opacity={0} />;
                }
                const originalIndex = resolvedData.findIndex(item => item.competitorId === entry.competitorId);
                const isOwn = entry.isOwn;
                const strokeColor = isOwn ? '#3730a3' : undefined;
                return (
                  <Cell 
                    key={`point-${entry.competitorId}`} 
                    fill={isOwn ? '#4f46e5' : colors[originalIndex % colors.length]} 
                    stroke={strokeColor}
                    strokeWidth={isOwn ? 3 : 1}
                    style={{ filter: isOwn ? 'drop-shadow(0px 2px 4px rgba(79, 70, 229, 0.35))' : 'none' }}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Visual map legend for dots to map back easily - now interactive! */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs mt-2 w-full">
        <span className="font-semibold text-gray-400 uppercase tracking-wider text-[8px] mr-1">Порівняння закладів:</span>
        {resolvedData.map((item, index) => {
          const isVisible = visibleIds.includes(item.competitorId);
          const color = item.isOwn ? '#4f46e5' : colors[index % colors.length];
          return (
            <button
              key={item.competitorId}
              id={`legend-btn-${item.competitorId}`}
              onClick={() => toggleCompetitor(item.competitorId)}
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
                  borderWidth: item.isOwn ? '2px' : '1.5px',
                  transform: isVisible ? 'scale(1)' : 'scale(0.8)'
                }} 
              />
              <span className={item.isOwn ? 'font-bold' : 'font-medium'}>
                {item.competitorName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PositioningMatrix;
