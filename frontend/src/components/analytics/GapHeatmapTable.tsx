/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Competitor } from '../../types';

interface GapHeatmapTableProps {
  id?: string;
  competitors: Competitor[];
  onCellSelect: (competitorName: string, aspectName: string) => void;
  sizeMode?: 'compact' | 'large';
}

export const GapHeatmapTable: React.FC<GapHeatmapTableProps> = ({
  id,
  competitors,
  onCellSelect,
  sizeMode = 'compact',
}) => {
  const aspectsList: Array<{ key: keyof Competitor['aspects']; label: string }> = [
    { key: 'service', label: 'Сервіс' },
    { key: 'product_quality', label: 'Якість продукту' },
    { key: 'price', label: 'Ціна' },
    { key: 'location', label: 'Локація' },
  ];

  // Colors intensity mapped to -1.0 ... +1.0 polarity scale
  const getCellStyles = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      // Quiet neutral gray-dashed style representing no mentions
      return 'bg-gray-50 text-gray-400 border-dashed border-gray-250 hover:bg-gray-100/50 cursor-pointer duration-200 font-normal';
    }
    if (value > 0) {
      const absVal = Math.min(Math.abs(value), 1);
      if (absVal > 0.7) {
        return 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 cursor-pointer duration-200 font-bold shadow-2xs';
      } else if (absVal > 0.3) {
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200 cursor-pointer duration-200 font-bold';
      } else {
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 cursor-pointer duration-200 font-semibold';
      }
    } else if (value < 0) {
      const absVal = Math.min(Math.abs(value), 1);
      if (absVal > 0.7) {
        return 'bg-rose-200 text-rose-900 border-rose-350 hover:bg-rose-300 cursor-pointer duration-200 font-bold shadow-2xs';
      } else if (absVal > 0.3) {
        return 'bg-rose-100 text-rose-800 border-rose-250 hover:bg-rose-150 cursor-pointer duration-200 font-bold';
      } else {
        return 'bg-rose-50 text-rose-700 border-rose-150 hover:bg-rose-100 cursor-pointer duration-200 font-semibold';
      }
    } else {
      // Exactly 0.0 (Neutral sentiment or balanced mentions)
      return 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 cursor-pointer duration-200 font-medium';
    }
  };

  const getCellLabel = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    if (value === 0) return '0.0';
    const num = Number(value);
    const prefix = num > 0 ? '+' : '';
    // Format to 1 decimal place. For mock 1 / -1 values, formatting handles cleanly
    return `${prefix}${num.toFixed(1)}`;
  };

  return (
    <div id={id} className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className={`min-w-full divide-y divide-gray-200 ${sizeMode === 'large' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className={`text-left font-semibold text-gray-500 tracking-wider uppercase ${sizeMode === 'large' ? 'px-6 py-4 text-xs sm:text-sm' : 'px-4 py-3 text-[10px] sm:text-xs'}`}>
                Конкурент
              </th>
              {aspectsList.map((asp) => (
                <th
                  key={asp.key}
                  scope="col"
                  className={`text-center font-semibold text-gray-500 tracking-wider uppercase ${sizeMode === 'large' ? 'px-4 py-4 text-xs sm:text-sm' : 'px-2 py-3 text-[10px] sm:text-xs'}`}
                >
                  {asp.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {competitors.map((comp) => {
              const isOwn = comp.isOwn || comp.id === 'own_business';
              return (
                <tr 
                  key={comp.id} 
                  className={`transition-colors relative ${
                    isOwn 
                      ? 'bg-indigo-50/40 hover:bg-indigo-50/60 font-semibold text-indigo-950' 
                      : 'hover:bg-gray-50/30'
                  }`}
                >
                  <td className={`whitespace-nowrap font-medium relative ${sizeMode === 'large' ? 'px-6 py-3.5 text-xs sm:text-sm' : 'px-4 py-2.5 text-xs'}`}>
                    {isOwn && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-xs" />
                    )}
                    <div className="pl-1">
                      <span className={`${isOwn ? 'text-indigo-950 font-bold' : 'text-gray-800'} ${sizeMode === 'large' ? 'text-xs sm:text-sm font-bold' : 'text-[11px] sm:text-xs font-semibold'}`}>
                        {comp.name}
                      </span>
                      {isOwn && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wider">
                          Ви
                        </span>
                      )}
                      <p className={`text-gray-400 mt-0.5 ${sizeMode === 'large' ? 'text-[10px] sm:text-xs' : 'text-[9px]'}`}>{comp.type}</p>
                    </div>
                  </td>
                  {aspectsList.map((asp) => {
                    const score = comp.aspects[asp.key];
                    const isNull = score === null || score === undefined;
                    const tooltipText = isNull
                      ? `Клієнти не згадують аспект «${asp.label}» у відгуках про ${comp.name} / Даних недостатньо`
                      : `Клікніть, щоб побачити відгуки про ${asp.label} для ${comp.name} (Оцінка: ${getCellLabel(score)})`;

                    return (
                      <td key={asp.key} className={`text-center whitespace-nowrap ${sizeMode === 'large' ? 'p-2 px-4' : 'p-1 px-2'}`}>
                        <button
                          onClick={() => onCellSelect(comp.name, asp.label)}
                          className={`inline-flex items-center justify-center font-mono border focus:outline-none focus:ring-1 focus:ring-blue-400 select-none ${getCellStyles(score)} ${sizeMode === 'large' ? 'w-16 h-10 rounded-md text-xs sm:text-sm font-bold' : 'w-12 h-7 rounded text-[10px]'}`}
                          style={{ minWidth: sizeMode === 'large' ? '4rem' : '3rem', minHeight: sizeMode === 'large' ? '2.5rem' : '1.75rem' }}
                          title={tooltipText}
                        >
                          {getCellLabel(score)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modern Compact Color Legend & Market Opportunity Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[10px] text-gray-500 px-1 border-t border-gray-50">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-medium text-gray-400 uppercase tracking-tight text-[9px]">Шкала тональності:</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3 bg-rose-200 border border-rose-300 rounded-2xs inline-block" />
            <span>Негативно (&lt; 0)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3 bg-gray-100 border border-gray-300 rounded-2xs inline-block" />
            <span>Нейтрально (0.0)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3 bg-emerald-600 rounded-2xs inline-block" />
            <span>Позитивно (&gt; 0)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-50 text-gray-650 px-2 py-1 rounded border border-gray-200">
          <span className="w-3 h-3 bg-gray-50 border border-dashed border-gray-300 rounded-2xs inline-block text-center text-[7px] font-bold leading-3 text-gray-400">—</span>
          <span className="font-semibold text-[9px]">«—» Даних недостатньо / клієнти не згадують цей аспект</span>
        </div>
      </div>
    </div>
  );
};

export default GapHeatmapTable;
