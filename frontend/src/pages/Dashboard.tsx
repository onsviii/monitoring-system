/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../api/profileService';
import {
  createAnalysis,
  previewAnalysis,
  getAnalysisStatus,
  retryAnalysis,
  PlaceCandidate,
  getNiches,
  NicheDto
} from '../api/analysisService';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  MapPin,
  ChevronRight,
  Sparkles,
  Play,
  AlertCircle,
  Compass,
  Search,
  CheckCircle2,
  ListChecks,
  RefreshCw
} from 'lucide-react';
import LocationMap from '../components/ui/LocationMap';
import ProgressStepper from '../components/ui/ProgressStepper';

type DashboardStep = 'setup' | 'preview' | 'polling';

export default function Dashboard() {
  const navigate = useNavigate();

  // Basic States
  const [businessName, setBusinessName] = useState('');
  const [analysisName, setAnalysisName] = useState('');
  const [nicheCode, setNicheCode] = useState<string>('');
  const [niches, setNiches] = useState<NicheDto[]>([]);

  // ОНОВЛЕНО: Використовуємо latitude та longitude
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [maxCompetitors, setMaxCompetitors] = useState(10);

  // App States
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [step, setStep] = useState<DashboardStep>('setup');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Candidates States
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);

  // Polling States
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('IDLE');
  const [isFailed, setIsFailed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Завантаження довідників
  useEffect(() => {
    let active = true;

    async function fetchNiches() {
      const cached = sessionStorage.getItem('app_niches');
      if (cached) {
        setNiches(JSON.parse(cached));
      } else {
        try {
          const data = await getNiches();
          if (active && data.length > 0) {
            setNiches(data);
            sessionStorage.setItem('app_niches', JSON.stringify(data));
          }
        } catch (err) {
          console.error("Не вдалося завантажити довідник ніш");
        }
      }
    }

    async function fetchProfile() {
      setIsLoadingProfile(true);
      try {
        const profile = await getProfile();
        if (profile && profile.businessName && active) {
          setBusinessName(profile.businessName);
          if (profile.nicheCode) setNicheCode(profile.nicheCode);
          setHasProfile(true);
          setIsLoadingProfile(false);
          return;
        }
      } catch (err) {
        console.warn("Не вдалося завантажити профіль з бекенду:", err);
      }

      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDocSnap.exists() && active) {
            const data = userDocSnap.data();
            const fbName = data.businessName;
            if (fbName) {
              setBusinessName(fbName);
              if (data.nicheCode) setNicheCode(data.nicheCode);
              setHasProfile(true);
              setIsLoadingProfile(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Не вдалося завантажити профіль з Firestore:", err);
      }

      if (active) {
        setHasProfile(false);
        setIsLoadingProfile(false);
      }
    }

    fetchNiches();
    fetchProfile();
    return () => { active = false; };
  }, []);

  // Очистка таймера при розмонтуванні
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // РЕАЛЬНИЙ ПОЛЛІНГ БЕКЕНДУ
  const startPolling = (sessionId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusData = await getAnalysisStatus(sessionId);
        setCurrentStage(statusData.stage);

        if (statusData.status === 'COMPLETED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          navigate('/report'); // Тільки тепер йдемо на сторінку звіту
        } else if (statusData.status === 'FAILED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsFailed(true); // Показуємо помилку
        }
      } catch (err) {
        console.error("Помилка опитування статусу:", err);
      }
    }, 3000); // Опитуємо кожні 3 секунди
  };

  // Крок 1: Запит на прев'ю конкурентів
  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasProfile || !location) {
      setErrorMsg('Будь ласка, вкажіть локацію на карті.');
      return;
    }
    if (!analysisName.trim()) {
      setErrorMsg('Будь ласка, введіть назву аналізу.');
      return;
    }
    if (!nicheCode) {
      setErrorMsg('Помилка профілю: не вказана категорія (ніша) закладу.');
      return;
    }

    setErrorMsg(null);
    setIsLoadingPreview(true);

    try {
      const response = await previewAnalysis({
        nicheCode: nicheCode,
        location,
        radiusKm,
        maxCompetitors
      });

      setCandidates(response.candidates || []);
      const initialSelected = (response.candidates || [])
          .slice(0, maxCompetitors)
          .map(c => c.googlePlaceId);

      setSelectedPlaceIds(initialSelected);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err.message || 'Не вдалося знайти конкурентів. Спробуйте змінити радіус.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const toggleCandidate = (placeId: string) => {
    setSelectedPlaceIds(prev => {
      if (prev.includes(placeId)) {
        return prev.filter(id => id !== placeId);
      } else {
        if (prev.length >= maxCompetitors) {
          setErrorMsg(`Ви не можете вибрати більше ${maxCompetitors} конкурентів.`);
          setTimeout(() => setErrorMsg(null), 3000);
          return prev;
        }
        return [...prev, placeId];
      }
    });
  };

  // Крок 2: Фінальний запуск аналізу (Реальний)
  const handleStartAnalysis = async () => {
    if (selectedPlaceIds.length === 0) {
      setErrorMsg('Виберіть хоча б одного конкурента для аналізу.');
      return;
    }

    setErrorMsg(null);
    setIsCreating(true);

    try {
      const response = await createAnalysis({
        reportName: analysisName.trim(),
        nicheCode: nicheCode,
        // ОНОВЛЕНО: Приведення типів до повної назви
        location: location as {latitude: number; longitude: number},
        radiusKm,
        maxCompetitors,
        selectedPlaceIds
      });

      // Зберігаємо ID нового аналізу
      localStorage.setItem('last_analysis_id', response.id);
      setCurrentSessionId(response.id);
      setCurrentStage(response.stage || 'PENDING');

      // Переходимо до екрану завантаження і запускаємо поллінг
      setStep('polling');
      startPolling(response.id);

    } catch (backendErr: any) {
      console.error("Помилка при створенні аналізу на бекенді:", backendErr);
      setErrorMsg(backendErr.message || 'Сталася помилка при запуску аналізу. Спробуйте ще раз.');
    } finally {
      setIsCreating(false);
    }
  };

  // Відновлення аналізу після FAILED
  const handleRetry = async () => {
    if (!currentSessionId) return;

    setIsRetrying(true);
    try {
      const response = await retryAnalysis(currentSessionId);
      setIsFailed(false);
      setCurrentStage(response.stage || 'PENDING');

      // Відновлюємо поллінг
      startPolling(currentSessionId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Не вдалося відновити сесію. Будь ласка, створіть новий аналіз.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleFillDemo = () => {
    setAnalysisName('Демо аналіз конкурентів');
    if (niches.length > 0) setNicheCode(niches[0].code);
    else setNicheCode('coffee_shop');
    // ОНОВЛЕНО: Повні назви у демо-даних
    setLocation({ latitude: 49.8415, longitude: 24.0323 });
    setRadiusKm(5);
    setMaxCompetitors(10);
  };

  return (
      <div id="dashboard-page" className="min-h-screen bg-gray-50/50 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Аналіз конкурентного середовища
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Розумний аналіз ринку. Дізнайтеся, за що клієнти хвалять або критикують інші заклади,
            та отримайте готові рекомендації для розвитку вашого бізнесу.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          {isLoadingProfile ? (
              <div className="bg-white border border-gray-150 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[300px]">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500 font-medium">Завантаження вашого профілю...</p>
              </div>
          ) : !hasProfile ? (
              <div className="bg-white border border-gray-150 rounded-xl p-6 sm:p-8 shadow-sm text-center space-y-6">
                <div className="inline-flex items-center justify-center bg-amber-50 text-amber-600 rounded-full p-4 shadow-3xs">
                  <Compass className="w-8 h-8 animate-pulse text-amber-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm">Профіль бізнесу не налаштовано</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Для запуску конкурентного аналізу необхідно спочатку вказати назву та географічну локацію вашого бізнесу.
                  </p>
                </div>
                <button
                    onClick={() => navigate('/setup-profile')}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  Налаштувати профіль компанії
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
          ) : step === 'setup' ? (
              /* КРОК 1: НАЛАШТУВАННЯ */
              <div className="bg-white border border-gray-150 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Аналіз для «{businessName}»</h3>
                    <p className="text-[11px] text-gray-500 mt-1">Крок 1: Введіть параметри для пошуку конкурентів</p>
                  </div>
                  <button
                      type="button"
                      onClick={handleFillDemo}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg transition-colors"
                  >
                    Демо
                  </button>
                </div>

                {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handlePreviewSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600">Назва для цього звіту <span className="text-rose-500">*</span></label>
                    <input
                        type="text"
                        value={analysisName}
                        onChange={(e) => setAnalysisName(e.target.value)}
                        placeholder="Введіть довільну назву..."
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-lg h-10 px-3 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" /> Географічна локація <span className="text-rose-500">*</span>
                    </label>
                    <LocationMap location={location} onChange={setLocation} radiusKm={radiusKm} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">Радіус пошуку</label>
                      <select
                          value={radiusKm}
                          onChange={(e) => setRadiusKm(Number(e.target.value))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-3 text-xs"
                      >
                        <option value={0.5}>0.5 км</option>
                        <option value={1}>1 км</option>
                        <option value={2}>2 км</option>
                        <option value={5}>5 км</option>
                        <option value={10}>10 км</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">Макс. вибір (1-10)</label>
                      <input
                          type="number"
                          min={1} max={10}
                          value={maxCompetitors}
                          onChange={(e) => setMaxCompetitors(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-lg h-10 px-3 text-xs"
                      />
                    </div>
                  </div>

                  <button
                      type="submit"
                      disabled={isLoadingPreview}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all mt-2"
                  >
                    {isLoadingPreview ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Search className="w-4 h-4" />
                    )}
                    {isLoadingPreview ? 'Пошук закладів...' : 'Знайти конкурентів на карті'}
                  </button>
                </form>
              </div>
          ) : step === 'preview' ? (
              /* КРОК 2: ПЕРЕГЛЯД ТА ВИБІР КАНДИДАТІВ */
              <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-indigo-600" />
                      Вибір конкурентів
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Вибрано {selectedPlaceIds.length} з {maxCompetitors} можливих
                    </p>
                  </div>
                  <button
                      onClick={() => setStep('setup')}
                      disabled={isCreating}
                      className="text-xs text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
                  >
                    Змінити пошук
                  </button>
                </div>

                {errorMsg && (
                    <div className="bg-rose-50 text-rose-800 p-3 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /><span>{errorMsg}</span>
                    </div>
                )}

                {candidates.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">За заданими критеріями нічого не знайдено.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {candidates.map(candidate => {
                        const isSelected = selectedPlaceIds.includes(candidate.googlePlaceId);
                        return (
                            <div
                                key={candidate.googlePlaceId}
                                onClick={() => !isCreating && toggleCandidate(candidate.googlePlaceId)}
                                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                    isCreating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                } ${
                                    isSelected ? 'bg-blue-50 border-blue-200 shadow-3xs' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                              <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center border ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <h4 className="text-xs font-bold text-gray-900">{candidate.name}</h4>
                                  {candidate.rating && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded">★ {candidate.rating}</span>}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-0.5">{candidate.address}</p>
                              </div>
                            </div>
                        )
                      })}
                    </div>
                )}

                <button
                    onClick={handleStartAnalysis}
                    disabled={selectedPlaceIds.length === 0 || isCreating}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all mt-4"
                >
                  {isCreating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  {isCreating ? 'Створення аналізу...' : 'Розпочати глибокий аналіз'}
                </button>
              </div>
          ) : (
              /* КРОК 3: ПОЛЛІНГ (Степер або Помилка) */
              <div className="animate-fade-in space-y-4">

                {/* Блок помилки, якщо бекенд повернув FAILED */}
                {isFailed && (
                    <div className="bg-white border border-rose-200 rounded-xl p-6 shadow-lg text-center space-y-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500" />
                      <div className="inline-flex items-center justify-center bg-rose-50 text-rose-600 rounded-full p-4">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 text-base">Аналіз перервано</h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                          Під час виконання пайплайну сталася критична помилка.
                        </p>
                      </div>

                      {errorMsg && (
                          <div className="bg-rose-50/50 p-2 text-[11px] text-rose-700 rounded border border-rose-100 mx-auto max-w-sm">
                            {errorMsg}
                          </div>
                      )}

                      <div className="flex gap-3 justify-center mt-2">
                        <button
                            onClick={() => setStep('setup')}
                            disabled={isRetrying}
                            className="h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg transition-colors"
                        >
                          Почати знову
                        </button>
                        <button
                            onClick={handleRetry}
                            disabled={isRetrying}
                            className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70"
                        >
                          {isRetrying ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                              <RefreshCw className="w-4 h-4" />
                          )}
                          {isRetrying ? 'Відновлення...' : 'Повторити спробу'}
                        </button>
                      </div>
                    </div>
                )}

                {/* Звичайний ProgressStepper працює, поки статус не FAILED */}
                {!isFailed && (
                    <ProgressStepper
                        currentStage={currentStage as any}
                        competitorsCount={0}
                        maxCompetitors={selectedPlaceIds.length}
                    />
                )}
              </div>
          )}
        </div>
      </div>
  );
}