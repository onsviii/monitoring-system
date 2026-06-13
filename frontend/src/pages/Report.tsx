/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Sparkles,
  FileText,
  ThumbsDown,
  ThumbsUp,
  Pencil,
  Check,
  X,
} from 'lucide-react';

import Badge from '../components/ui/Badge';
import RadarChartWidget from '../components/analytics/RadarChartWidget';
import GapHeatmapTable from '../components/analytics/GapHeatmapTable';
import PositioningMatrix from '../components/analytics/PositioningMatrix';
import SentimentTrendChart from '../components/analytics/SentimentTrendChart';
import ReportMap from '../components/ui/ReportMap';
import StrategyAIChat from '../components/analytics/StrategyAIChat';
import { getAnalysisReport, getAnalysisStatus, CompetitorReportResponse, updateReportName, getAnalysisSources } from '../api/analysisService';

const ChartSkeletonLoader = ({ text }: { text: string }) => (
  <div className="w-full h-64 flex flex-col items-center justify-center space-y-3.5 bg-gray-50/50 rounded-xl animate-pulse border border-dashed border-gray-200 p-4">
    <div className="relative w-9 h-9">
      <div className="absolute inset-0 w-9 h-9 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin" />
    </div>
    <div className="text-center">
      <span className="text-xs text-indigo-950 font-bold block">{text}</span>
      <span className="text-xs text-gray-400 font-medium block mt-1">Опрацювання аспектних моделей, розрахунок тональності...</span>
    </div>
  </div>
);

export default function Report() {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('Копальня кави');
  const [analysisReport, setAnalysisReport] = useState<CompetitorReportResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isEditingReportName, setIsEditingReportName] = useState(false);
  const [reportNameDraft, setReportNameDraft] = useState('');
  const [reportNameError, setReportNameError] = useState<string | null>(null);
  const [isSavingReportName, setIsSavingReportName] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadReportData() {
      // 1. Блокування 1: Немає ID сесії
      const lastId = localStorage.getItem('last_analysis_id');
      if (!lastId) {
        navigate('/dashboard', { replace: true });
        return;
      }

      if (active) setIsLoadingReport(true);

      try {
        // 2. Блокування 2: Перевіряємо статус сесії на бекенді
        const statusData = await getAnalysisStatus(lastId);

        // Якщо аналіз ще йде або впав - повертаємо на дашборд (там включиться поллінг або екран помилки)
        if (statusData.status !== 'COMPLETED') {
          navigate('/dashboard', { replace: true });
          return;
        }

        // 3. Якщо все ок — завантажуємо сам звіт
        const report = await getAnalysisReport(lastId);
        if (report && active) {
          setAnalysisReport(report);
        }
      } catch (err) {
        console.warn("Помилка перевірки статусу або завантаження звіту:", err);
        // Якщо бекенд повернув 404 (наприклад, стару сесію видалили), теж кидаємо на головну
        navigate('/dashboard', { replace: true });
      } finally {
        if (active) setIsLoadingReport(false);
      }
    }

    async function loadName() {
      // ... [ТУТ ЗАЛИШАЄТЬСЯ ТВІЙ КОД ЗАВАНТАЖЕННЯ businessName З getProfile ТА Firestore] ...
    }

    loadName();
    loadReportData();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!isEditingReportName) {
      setReportNameDraft(analysisReport?.reportName || '');
    }
  }, [analysisReport?.reportName, isEditingReportName]);

  const competitors = React.useMemo(() => {
    if (analysisReport && analysisReport.competitors && analysisReport.competitors.length > 0) {
      const radarItems = analysisReport.aggregatedStatistics?.radarChart || [];
      return analysisReport.competitors.map(comp => {
        const matchedRadar = radarItems.find(r => r.competitorId === comp.id || r.competitorName === comp.name);
        
        // Мапимо полярність -1.0 ... 1.0 на відповідні заспектні оцінки
        const defaultAspects = {
          service: 0,
          product_quality: 0,
          price: 0,
          location: 0,
        };

        const aspects = matchedRadar ? {
          service: matchedRadar.aspects.SERVICE ?? 0,
          product_quality: matchedRadar.aspects.PRODUCT_QUALITY ?? 0,
          price: matchedRadar.aspects.PRICE ?? 0,
          location: matchedRadar.aspects.LOCATION ?? 0,
        } : defaultAspects;

        const mappedTags = comp.freeCharacteristics ? comp.freeCharacteristics.map(char => ({
          text: char.text,
          type: 'neutral',
          sources: char.sourceReviewIds ? char.sourceReviewIds.length : 1
        })) : [];

        return {
          id: comp.id,
          name: comp.isOwn ? `${businessName} (Ви)` : comp.name,
          type: comp.isOwn ? 'Ваш заклад' : 'Конкурент',
          distance: comp.isOwn ? '0.0 км' : '0.5 км',
          reviewsCount: comp.reviewCount,
          rating: comp.rating,
          coordinates: comp.isOwn ? { x: 50, y: 45 } : { x: 30 + (Math.sin(comp.id.charCodeAt(0)) * 20 + 20), y: 25 + (Math.cos(comp.id.charCodeAt(0)) * 20 + 20) },
          latitude: comp.isOwn ? 49.8397 : 49.8397 + (Math.sin(comp.id.charCodeAt(0)) * 0.02),
          longitude: comp.isOwn ? 24.0297 : 24.0297 + (Math.cos(comp.id.charCodeAt(0)) * 0.02),
          aspects: aspects,
          uniqueTags: mappedTags,
          isOwn: comp.isOwn || false,
        };
      });
    }

    return [];
  }, [analysisReport, businessName]);

  const radarChartData = React.useMemo(() => {
    if (analysisReport && analysisReport.aggregatedStatistics?.radarChart) {
      return analysisReport.aggregatedStatistics.radarChart;
    }
    return undefined;
  }, [analysisReport]);

  const positioningMatrixData = React.useMemo(() => {
    if (analysisReport && analysisReport.aggregatedStatistics?.positioningMatrix) {
      return analysisReport.aggregatedStatistics.positioningMatrix;
    }
    return undefined;
  }, [analysisReport]);

  const sentimentTrendsData = React.useMemo(() => {
    if (analysisReport && analysisReport.aggregatedStatistics?.sentimentTrends) {
      return analysisReport.aggregatedStatistics.sentimentTrends;
    }
    return undefined;
  }, [analysisReport]);

  const recommendations = React.useMemo(() => {
    if (analysisReport && analysisReport.recommendations && analysisReport.recommendations.length > 0) {
      return analysisReport.recommendations.map((rec, idx) => ({
        id: rec.id || `rec_dyn_${idx}`,
        title: rec.title || 'Стратегічна рекомендація',
        description: rec.text,
        impact: rec.priority === 'HIGH' ? 'HIGH' : (rec.priority === 'MEDIUM' ? 'MEDIUM' : 'LOW'),
        aspect: 'service',
        sourcesCount: rec.sourceReviewIds ? rec.sourceReviewIds.length : 0,
        references: [],
      }));
    }
    return [];
  }, [analysisReport, businessName]);

  // Primary states for interactivity
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [drilldownFilter, setDrilldownFilter] = useState<{ competitorName: string | null; aspectName: string | null }>({
    competitorName: null,
    aspectName: null,
  });
  const [activeTab, setActiveTab] = useState<'all' | 'strategic' | 'insights'>('all');
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  
  const [activeChartTab, setActiveChartTab] = useState<'radar' | 'heatmap' | 'matrix' | 'trends'>('radar');

  const [sourceReviews, setSourceReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    async function fetchReviews() {
      if (!drilldownFilter.competitorName || !drilldownFilter.aspectName || !analysisReport?.sessionId) {
        setSourceReviews([]);
        return;
      }

      const comp = competitors.find(c => c.name === drilldownFilter.competitorName);
      if (!comp) return;

      setIsLoadingReviews(true);
      try {
        const response = await getAnalysisSources(
            analysisReport.sessionId,
            comp.id,
            drilldownFilter.aspectName.toUpperCase()
        );

        const mappedReviews = (response.reviews || []).map((rev: any) => ({
          id: rev.id,
          competitorName: comp.name,
          sentiment: rev.polarity > 0 ? 'positive' : (rev.polarity < 0 ? 'negative' : 'neutral'),
          ratingValue: rev.rating,
          text: rev.text,
          date: new Date(rev.createdAt).toLocaleDateString('uk-UA'),
        }));

        setSourceReviews(mappedReviews);
      } catch (err) {
        console.error("Помилка завантаження першоджерел:", err);
        setSourceReviews([]);
      } finally {
        setIsLoadingReviews(false);
      }
    }

    fetchReviews();
  }, [drilldownFilter, analysisReport, competitors]);

  const clearDrilldown = () => {
    setDrilldownFilter({ competitorName: null, aspectName: null });
  };

  const handleExport = () => {
    setExportMessage('Генерація PDF-звіту та завантаження першоджерел...');
    setTimeout(() => {
      // Simulate file download by creating a fake element
      const element = document.createElement('a');
      const file = new Blob([JSON.stringify({ report: 'SmartBiz Competitor Intelligence Report', competitors: competitors, recommendations: recommendations }, null, 2)], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'SmartBiz_Competitor_Intelligence_Report.json';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      setExportMessage('Звіт успішно експортовано у форматі JSON/PDF!');
      setTimeout(() => setExportMessage(null), 3500);
    }, 1500);
  };

  const handleReportNameEdit = () => {
    setReportNameError(null);
    setIsEditingReportName(true);
  };

  const handleReportNameCancel = () => {
    setReportNameDraft(analysisReport?.reportName || '');
    setReportNameError(null);
    setIsEditingReportName(false);
  };

  const handleReportNameSave = async () => {
    if (!analysisReport) return;
    const trimmedName = reportNameDraft.trim();
    if (!trimmedName) {
      setReportNameError('Вкажіть назву звіту');
      return;
    }

    setIsSavingReportName(true);
    setReportNameError(null);
    try {
      const response = await updateReportName(analysisReport.sessionId, trimmedName);
      setAnalysisReport((prev) => (prev ? { ...prev, reportName: response.reportName } : prev));
      setReportNameDraft(response.reportName);
      setIsEditingReportName(false);
    } catch (err) {
      console.warn('Помилка оновлення назви звіту:', err);
      setReportNameError('Не вдалося зберегти назву');
    } finally {
      setIsSavingReportName(false);
    }
  };

  return (
    <div id="report-page" className="min-h-screen bg-gray-50/55 p-3 sm:p-5 md:p-8 space-y-6 max-w-[1450px] mx-auto pb-24">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-3xs">
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 duration-200" />
          Назад до моніторингу
        </button>
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          <Badge variant="success">Аналіз завершено</Badge>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-1.5 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-3xs cursor-pointer transition-all duration-200 focus:outline-none"
          >
            <Download className="w-3.5 h-3.5" />
            Експортувати звіт
          </button>
        </div>
      </div>

      {/* Export notification toast */}
      {exportMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-xs flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Drilldown Modal (Source Reviews) */}
      {(drilldownFilter.competitorName || drilldownFilter.aspectName) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={clearDrilldown}
          />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10 border border-gray-200 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-amber-50/50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-700" />
                <h4 className="font-bold text-sm text-gray-900">
                  Першоджерела відгуків:
                  {drilldownFilter.competitorName && <span className="text-blue-700 font-bold tracking-tight ml-1">«{drilldownFilter.competitorName}»</span>}
                  {drilldownFilter.aspectName && (
                    <span className="text-gray-600 ml-1">
                      ● Аспект: <span className="font-bold text-indigo-700">{drilldownFilter.aspectName}</span>
                    </span>
                  )}
                </h4>
              </div>
              <button
                onClick={clearDrilldown}
                className="text-gray-400 hover:text-gray-700 transition-colors hover:bg-gray-100 p-1.5 rounded-md"
                title="Закрити"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto bg-gray-50/30">
              {isLoadingReviews ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 font-medium">Завантаження першоджерел з бази...</p>
                  </div>
              ) : sourceReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500 italic">Немає точних завантажених цитат для вибраного фільтру.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {sourceReviews.map((rev) => (
                    <div key={rev.id} className="bg-white p-4 rounded-xl border border-gray-150 relative text-[13px] leading-relaxed shadow-3xs">
                      <div className="flex justify-between items-center mb-2 border-b border-gray-50 pb-2">
                        <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">{rev.competitorName}</span>
                        <div className="flex items-center gap-2">
                          {rev.sentiment === 'positive' ? (
                            <span className="bg-emerald-50 text-emerald-700 text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-emerald-100/50">
                              <ThumbsUp className="w-3 h-3" /> Позитив
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-700 text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-rose-100/50">
                              <ThumbsDown className="w-3 h-3" /> Негатив
                            </span>
                          )}
                          <span className="text-amber-500 font-mono text-xs font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/50">{rev.ratingValue}★</span>
                        </div>
                      </div>
                      <p className="text-gray-700 italic pr-2">"{rev.text}"</p>
                      <div className="text-[11px] text-gray-400 mt-3 font-mono text-right">{rev.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Business Header Meta details */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-3xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              {isEditingReportName ? (
                <input
                  type="text"
                  value={reportNameDraft}
                  onChange={(event) => setReportNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleReportNameSave();
                    if (event.key === 'Escape') handleReportNameCancel();
                  }}
                  className="text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Назва звіту"
                  disabled={isSavingReportName}
                />
              ) : (
                <span className="text-sm font-semibold text-gray-800">
                  {analysisReport?.reportName || 'Аналітичний звіт'}
                </span>
              )}
              {!isEditingReportName ? (
                <button
                  onClick={handleReportNameEdit}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Редагувати назву звіту"
                  disabled={!analysisReport || isSavingReportName}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleReportNameSave}
                    className="p-1.5 rounded-md border border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 transition-colors disabled:opacity-50"
                    title="Зберегти"
                    disabled={isSavingReportName}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleReportNameCancel}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors disabled:opacity-50"
                    title="Скасувати"
                    disabled={isSavingReportName}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {reportNameError && (
              <p className="text-xs text-rose-600 mt-1">{reportNameError}</p>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{businessName}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600 block shrink-0" />
              Кав'ярня · Центр міста, площа Ринок, Львів, Україна
            </p>
          </div>
          <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs text-gray-500 font-mono">
            ID Аналізу: <span className="font-semibold text-gray-700">#{analysisReport?.sessionId ? analysisReport.sessionId.substring(0, 8) : 'unknown'}</span>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50/70 border border-gray-100 rounded-lg p-3.5 hover:shadow-3xs transition-shadow">
            <span className="text-xs text-gray-500 font-medium block">Конкурентів у вибірці</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">{competitors.filter(c => !c.isOwn).length}</span>
              <span className="text-xs text-gray-400 font-mono font-medium block">Знайдених конкурентів</span>
            </div>
          </div>
          <div className="bg-gray-50/70 border border-gray-100 rounded-lg p-3.5 hover:shadow-3xs transition-shadow">
            <span className="text-xs text-gray-500 font-medium block">Проаналізовано відгуків</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">{competitors.reduce((sum, comp) => sum + (comp.reviewsCount || 0), 0)}</span>
              <span className="text-xs text-gray-400 font-mono font-medium block">З картографічної платформи</span>
            </div>
          </div>
          <div className="bg-gray-50/70 border border-gray-100 rounded-lg p-3.5 hover:shadow-3xs transition-shadow">
            <span className="text-xs text-gray-500 font-medium block">Останнє оновлення</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-gray-900 font-mono">{analysisReport?.generatedAt ? new Date(analysisReport.generatedAt).toLocaleDateString('uk-UA') : '-'}</span>
              <span className="text-xs text-gray-400 font-mono font-medium block">Сформовано</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT & CENTER ANALYTICAL METRICS GRID: Take up 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Competitors Interactive Map */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-3xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-gray-800">Карта конкурентів</h3>
                <p className="text-xs text-gray-500 font-medium">Клікніть на маркер для фокусування детальної аналітики</p>
              </div>
              <Badge variant="neutral">Радіус 5 км</Badge>
            </div>

            {/* Real Interactive Map Component */}
            <div className="relative h-60 bg-gray-50 rounded-lg border border-gray-150 overflow-hidden flex items-center justify-center">
              <ReportMap businessName={businessName} competitors={competitors as any} />
            </div>
          </div>

          {/* Combined Visual charts slot with Focus View Tabs */}
          <div className="bg-white border border-gray-150/80 rounded-2xl p-4 sm:p-6 shadow-3xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-gray-950">Візуалізація даних</h3>
              </div>
            </div>

            {/* Displays focus tab list */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-gray-50 rounded-xl text-xs border border-gray-100">
              <button
                type="button"
                onClick={() => setActiveChartTab('radar')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  activeChartTab === 'radar'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-150'
                }`}
              >
                Профілі конкурентів
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('heatmap')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  activeChartTab === 'heatmap'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-150'
                }`}
              >
                Теплова карта ринку
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('matrix')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  activeChartTab === 'matrix'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-150'
                }`}
              >
                Матриця позиціювання
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('trends')}
                className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  activeChartTab === 'trends'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-150'
                }`}
              >
                Динаміка оцінок
              </button>
            </div>

            <div className="pt-2">
              {activeChartTab === 'radar' && (
                <div className="animate-fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">Профілі конкурентів</span>
                    <span className="text-xs text-gray-400">Максимальна деталізація</span>
                  </div>
                  {isLoadingReport ? (
                    <ChartSkeletonLoader text="Аналіз профілів конкурентів" />
                  ) : (
                    <>
                      <RadarChartWidget businessName={businessName} radarData={radarChartData} heightClass="h-[380px] sm:h-[450px]" />
                      <p className="text-xs text-gray-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/60 mt-3.5 leading-relaxed">
                        <strong className="text-indigo-950 font-bold block mb-0.5">Профілі конкурентів:</strong>
                        Порівнює ваш заклад із конкурентами за головними критеріями. Дозволяє миттєво побачити ваші сильні сторони та слабкі місця на фоні інших.
                      </p>
                    </>
                  )}
                </div>
              )}

              {activeChartTab === 'heatmap' && (
                <div className="animate-fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">Аспектний аналіз</span>
                    <span className="text-xs text-gray-400">Чіткі клікабельні слоти</span>
                  </div>
                  {isLoadingReport ? (
                    <ChartSkeletonLoader text="Формування теплової карти" />
                  ) : (
                    <>
                      <p className="text-xs text-gray-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60 mb-3.5 leading-relaxed">
                        <strong className="text-emerald-950 font-bold block mb-0.5">Теплова карта ринку:</strong>
                        Відображає переваги та недоліки конкурентів. Зелений колір — сильні сторони закладу, червоний — слабкі. Порожні клітинки означають відсутність інтересу клієнтів до цього критерію.
                        <span className="block mt-1.5 text-xs text-emerald-800/80 font-medium">💡 Клікніть на будь-яку оцінку в таблиці, щоб відфільтрувати першоджерела-відгуки знизу.</span>
                      </p>
                      <GapHeatmapTable
                        competitors={competitors}
                        sizeMode="large"
                        onCellSelect={(compName, aspectName) => {
                          setDrilldownFilter({ competitorName: compName, aspectName });
                        }}
                      />
                    </>
                  )}
                </div>
              )}

              {activeChartTab === 'matrix' && (
                <div className="animate-fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">Ринкова позиція</span>
                    <span className="text-xs text-gray-400">Векторний розподіл</span>
                  </div>
                  {isLoadingReport ? (
                    <ChartSkeletonLoader text="Побудова matrix позиціонування" />
                  ) : (
                    <>
                      <PositioningMatrix businessName={businessName} matrixData={positioningMatrixData} heightClass="h-[380px] sm:h-[450px]" />
                      <p className="text-xs text-gray-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100/60 mt-3.5 leading-relaxed">
                        <strong className="text-amber-950 font-bold block mb-0.5">Матриця позиціювання:</strong>
                        Розподіляє всі заклади за співвідношенням ціни та якості. Допомагає зрозуміть, з ким ви змагаєтесь напряму за клієнта та де на ринку є вільне місце.
                      </p>
                    </>
                  )}
                </div>
              )}

              {activeChartTab === 'trends' && (
                <div className="animate-fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">Хронологічні криві</span>
                    <span className="text-xs text-gray-400">Часові вектори</span>
                  </div>
                  {isLoadingReport ? (
                    <ChartSkeletonLoader text="Розрахунок трендів тональності" />
                  ) : (
                    <>
                      <SentimentTrendChart businessName={businessName} trendData={sentimentTrendsData} heightClass="h-[380px] sm:h-[440px]" />
                      <p className="text-xs text-gray-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100/60 mt-3.5 leading-relaxed">
                        <strong className="text-blue-950 font-bold block mb-0.5">Динаміка оцінок:</strong>
                        Показує, як змінювалася репутація закладів із часом. Допомагає вчасно помітити, чиї позиції зростають, а хто починає втрачати лояльність клієнтів.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Unique Competitor Tags - AI Powered Card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-3xs space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-800">Унікальні характеристики конкурентів</h3>
                <Badge variant="ai">ШШІ-аналіз</Badge>
              </div>
              <span className="text-xs text-gray-400 italic">Аспекти, відзначені клієнтами</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competitors.map((comp) => (
                <div key={comp.id} className="border border-gray-100 rounded-lg p-3.5 hover:border-blue-100 transition-all bg-gray-50/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs text-gray-800">{comp.name}</span>
                    <span className="text-xs text-gray-400 font-mono italic">{comp.distance}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {comp.uniqueTags.map((tag, tIdx) => {
                      const tagColors =
                         tag.type === 'positive'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100/60'
                          : tag.type === 'negative'
                          ? 'bg-rose-50 text-rose-800 border-rose-100 hover:bg-rose-100/60'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200/80';
                      return (
                        <button
                          key={tIdx}
                          onClick={() => setDrilldownFilter({ competitorName: comp.name, aspectName: null })}
                          className={`text-xs px-2.5 py-1 rounded border ${tagColors} duration-150 transition-colors cursor-pointer hover:opacity-90 font-medium`}
                          title={`Базується на ${tag.sources} згадках`}
                        >
                          {tag.text}
                          <span className="ml-1 text-[10px] leading-none opacity-60 font-mono font-bold">({tag.sources})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT ANALYTICAL SIDEBAR COMPONENT: Strategic AI and Recommendations */}
        <div className="space-y-6">
          
          {/* Strategic Recommendations Card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-3xs space-y-4 relative">
            
            {/* compliance requirement badge inside strategic recommendations card */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="bg-amber-100/50 p-1 rounded-md text-amber-700">
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                </span>
                <span className="font-bold text-sm text-gray-900">Стратегічні рекомендації</span>
              </div>
              <Badge variant="ai">ШШІ-Генерація</Badge>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              ML-складова проаналізувала слабкі сторони конкурентів та синтезувала наступні дії:
            </p>

            <div className="space-y-4">
              {recommendations.map((rec, rIdx) => (
                <div key={rec.id} className="border-l-2 border-blue-500 bg-gray-50/50 p-3.5 rounded-r-lg space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="font-semibold text-xs text-gray-900">{rec.title}</h4>
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      rec.impact === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rec.impact}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-gray-500 leading-relaxed">{rec.description}</p>
                  
                  {/* Source counting tags & quick references display */}
                  <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center text-[10px]">
                    <span className="text-blue-600 flex items-center gap-1 font-semibold">
                      <FileText className="w-3 h-3 text-blue-500" />
                      {rec.sourcesCount} першоджерел
                    </span>
                    <button
                      onClick={() => setDrilldownFilter({ competitorName: null, aspectName: rec.aspect })}
                      className="text-[9.5px] text-indigo-700 hover:underline hover:text-indigo-900"
                    >
                      Дивитись першоджерела
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Compliance Disclaimer strictly requested */}
            <div id="ai-act-disclaimer" className="text-[10px] text-gray-400 bg-gray-50 p-3 rounded-lg border-l-2 border-gray-300 leading-relaxed mt-4">
              Рекомендації згенеровані штучним інтелектом на основі агрегованих даних і мають дорадчий характер. Відповідальність за управлінські рішення повністю залишається за користувачем.
            </div>
          </div>

          {/* Strategy AI assistant block */}
          <StrategyAIChat id="chatbot-widget" sessionId={analysisReport?.sessionId} />

        </div>

      </div>

    </div>
  );
}
