/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, HardDrive, Target, Layers, Info, Loader2 } from 'lucide-react';
import { getMetrics, MetricResponse } from '../../api/systemService';

export const MetricsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMetrics()
      .then((data) => {
        if (active) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load metrics:', error);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-sm">Завантаження метрик моделі...</p>
      </div>
    );
  }

  const findMetric = (name: string) => metrics.find(m => m.metricName === name)?.value ?? 0;
  
  const overallAccuracy = findMetric('OVERALL_ACCURACY');
  const overallMacroF1 = findMetric('OVERALL_F1');
  const testSampleSize = findMetric('TEST_SUPPORT');
  
  // Use the first metric to get model version and timestamp, or fallback
  const firstMetric = metrics[0];
  const modelVersion = firstMetric?.modelVersion || 'Unknown';
  const capturedAt = firstMetric?.capturedAt ? new Date(firstMetric.capturedAt).toLocaleString('uk-UA') : '-';

  const targetMacroF1Threshold = 0.75;
  const isF1AboveThreshold = overallMacroF1 >= targetMacroF1Threshold;

  const aspects = [
    { key: 'SERVICE', name: 'Service' },
    { key: 'PRODUCT_QUALITY', name: 'Product Quality' },
    { key: 'PRICE', name: 'Price' },
    { key: 'LOCATION', name: 'Location' }
  ];

  const aspectItems = aspects.map(asp => {
    return {
      aspect: asp.name,
      precision: findMetric(`${asp.key}_PRECISION`),
      recall: findMetric(`${asp.key}_RECALL`),
      f1: findMetric(`${asp.key}_F1`),
      support: '-' // support might be TEST_SUPPORT for all or we don't have it explicitly per aspect
    };
  });

  return (
    <div id="metrics-tab-content" className="space-y-6 animate-fade-in">
      
      {/* High-Level Card Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Metric Card 1: Macro F1 */}
        <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wider block">Macro F1 (Загальний)</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isF1AboveThreshold ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
               {isF1AboveThreshold ? '≥ порогу' : '< порогу'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-bold font-mono ${isF1AboveThreshold ? 'text-emerald-600' : 'text-rose-600'}`}>{overallMacroF1.toFixed(3)}</span>
            <span className="text-xs text-gray-400 font-medium">/ ціль {targetMacroF1Threshold}</span>
          </div>
          <p className="text-[10.5px] text-gray-400 mt-2">Метрика загальної якості класифікатора.</p>
        </div>

        {/* Metric Card 2: Classification Accuracy */}
        <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wider block">Загальний Accuracy</span>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
              {modelVersion}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-gray-900">{overallAccuracy.toFixed(3)}</span>
          </div>
          <p className="text-[10.5px] text-gray-400 mt-2">Частка вірно класифікованих прикладів.</p>
        </div>

        {/* Metric Card 3: Test Dataset Gold Standard */}
        <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wider block">Розмір тест-вибірки</span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-gray-900">{testSampleSize}</span>
            <span className="text-xs text-gray-500 font-medium font-sans">відгуків</span>
          </div>
          <p className="text-[10.5px] text-gray-400 mt-2">Gold-standard для тестування (оновлено: {capturedAt}).</p>
        </div>

      </div>

      {/* Model Spec General info & Aspect Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Aspect Progress bars (Left Column, spans 1) */}
        <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-3xs space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider mb-1">F1 за аспектами аналізу</h4>
          </div>

          <div className="space-y-3 pt-2 flex-grow">
            {aspectItems.map((met) => {
              const aboveThreshold = met.f1 >= targetMacroF1Threshold;
              const barFillColor = aboveThreshold ? 'bg-emerald-500' : 'bg-rose-500';
              const badgeBg = aboveThreshold ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';

              return (
                <div key={met.aspect} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span className="text-xs">{met.aspect}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${badgeBg}`}>{met.f1.toFixed(3)}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barFillColor}`}
                      style={{ width: `${Math.min(met.f1 * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Metrics Table of the Model (Right column, spans 2) */}
        <div className="md:col-span-2 bg-white border border-gray-150 rounded-xl p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 pb-3 border-b border-gray-100 mb-4">
              <div>
                <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">Значення метрик класифікатора по аспектах</h4>
              </div>
              <div className="text-[10.5px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 font-mono shrink-0">
                Модель: <span className="font-bold text-gray-700">{modelVersion}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Аспект</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Precision</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Recall</th>
                    <th scope="col" className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Macro F1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                  {aspectItems.map((met) => (
                    <tr key={met.aspect} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 text-xs">{met.aspect}</td>
                      <td className="px-4 py-3 text-center font-mono font-medium">{met.precision.toFixed(3)}</td>
                      <td className="px-4 py-3 text-center font-mono font-medium">{met.recall.toFixed(3)}</td>
                      <td className="px-4 py-3 text-center font-mono text-blue-600 font-bold">{met.f1.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default MetricsTab;
