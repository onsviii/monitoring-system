/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, HardDrive, LayoutGrid, Terminal, Activity, Info, BarChart2 } from 'lucide-react';
import MetricsTab from '../components/operator/MetricsTab';
import LogsTab from '../components/operator/LogsTab';

export default function OperatorPanel() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'logs'>('metrics');

  return (
    <div id="operator-panel-page" className="min-h-screen bg-gray-50/50 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 pb-32">
      
      {/* Visual Header Block */}
      <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Панель оператора
            </h1>
            <span className="bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200 px-2 py-0.5 rounded-full select-none shrink-0">
              Доступ: Оператор
            </span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-500 font-mono space-y-1 shrink-0">
          <div>Остання синхронізація: <strong className="text-gray-700">Тільки що</strong></div>
        </div>
      </div>

      {/* Main Tab Controller navigation bar */}
      <div className="flex border-b border-gray-150 gap-8">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'metrics'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Метрики якості моделей (Ukr-RoBERTa)
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Системні Журнали та LLM Промпти
        </button>
      </div>

      {/* Primary tab views slot render */}
      <div className="transition-all duration-300">
        {activeTab === 'metrics' ? (
          <MetricsTab />
        ) : (
          <LogsTab />
        )}
      </div>

    </div>
  );
}
