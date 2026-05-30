/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Database, Terminal, ChevronDown, ChevronUp, AlertCircle, Sparkles, FileText, Activity, Loader2 } from 'lucide-react';
import { getLogs, SystemLogEntry } from '../../api/systemService';

export const LogsTab: React.FC = () => {
  const [activeLogSubTab, setActiveLogSubTab] = useState<'errors' | 'llm'>('errors');
  const [expandedLlmLogIds, setExpandedLlmLogIds] = useState<Record<string, boolean>>({});
  
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLogs(activeLogSubTab === 'errors' ? 'collection' : 'llm')
      .then(data => {
        if (active) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load logs:', err);
        if (active) {
          setLogs([]);
          setLoading(false);
        }
      });
      
    return () => { active = false; };
  }, [activeLogSubTab]);

  const toggleExpandLlmLog = (id: string) => {
    setExpandedLlmLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getLevelBadgeStyle = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'INFO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  return (
    <div id="logs-tab-content" className="space-y-6 animate-fade-in">
      
      {/* Sub tabs selectors */}
      <div className="flex border-b border-gray-100 gap-6">
        <button
          onClick={() => setActiveLogSubTab('errors')}
          className={`pb-2.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeLogSubTab === 'errors'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Журнал API та помилок збору
        </button>
        <button
          onClick={() => setActiveLogSubTab('llm')}
          className={`pb-2.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeLogSubTab === 'llm'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Журнал взаємодій з моделями
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-3xs">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                {activeLogSubTab === 'errors' ? 'Системні логи (API, Збір даних)' : 'Логи моделі, NLP та сеансів аналізу'}
              </h4>
            </div>
            {loading ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <Activity className="w-4 h-4 text-emerald-500" />}
          </div>

          <div className="divide-y divide-gray-100">
            {logs.length === 0 && !loading && (
              <div className="p-8 text-center text-sm text-gray-500">
                Записів не знайдено
              </div>
            )}
            
            {logs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold border rounded-md px-2 py-0.5 font-mono ${getLevelBadgeStyle(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="text-[10px] text-gray-450 font-mono font-bold bg-gray-100 px-2 py-0.5 rounded">{log.module || 'SYSTEM'}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{formatTimestamp(log.timestamp)}</span>
                </div>

                <p className="text-xs font-semibold text-gray-800 mt-2 mb-2">{log.message}</p>
                
                {activeLogSubTab === 'llm' && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 mt-3 text-[11px] font-mono text-gray-600 break-words whitespace-pre-wrap">
                    [ДЕТАЛІ ЛОГУ]: {log.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
export default LogsTab;
