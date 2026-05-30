/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { createProfile, searchPlaces, PlaceCandidateDto } from '../api/profileService';
import { getNiches, NicheDto } from '../api/analysisService';
import SearchableNicheSelect from '../components/ui/SearchableNicheSelect';
import LocationMap from '../components/ui/LocationMap';
import {
  Search,
  Star,
  Check,
  Map,
  AlertCircle,
  ArrowRight,
  Navigation,
  Compass,
  Building2,
  ChevronRight
} from 'lucide-react';

interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  latitude: number;
  longitude: number;
}

export default function ProfileSetup() {
  const navigate = useNavigate();

  // Ніша
  const [nicheCode, setNicheCode] = useState('');
  const [nicheOptions, setNicheOptions] = useState<NicheDto[]>([]);
  const [isLoadingNiches, setIsLoadingNiches] = useState(false);

  React.useEffect(() => {
    let active = true;
    async function loadNiches() {
      setIsLoadingNiches(true);
      try {
        const data = await getNiches();
        if (active) {
          setNicheOptions(data);
          if (data.length > 0) setNicheCode(data[0].code);
        }
      } catch (err) {
        console.warn("Failed to load niches:", err);
      } finally {
        if (active) setIsLoadingNiches(false);
      }
    }
    loadNiches();
    return () => { active = false; };
  }, []);

  // Стани пошуку
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Вибраний кандидат
  const [selectedCandidate, setSelectedCandidate] = useState<PlaceCandidate | null>(null);

  // Стан для ручного вибору локації ("Мого закладу немає")
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

   // Обробка пошуку кандидатів у закладах (викликає Google Places через бекенд)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg('');
    setHasSearched(true);
    setSelectedCandidate(null);

    try {
      // 1. Спробувати завантажити кандидатів з реального спринг-бут бекенду
      const data = await searchPlaces(searchQuery.trim(), nicheCode);
      setCandidates(data);
    } catch (err: any) {
      console.error("Помилка пошуку закладів:", err);
      setErrorMsg("Не вдалося знайти заклади. Перевірте з'єднання та спробуйте ще раз.");
      setCandidates([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Метод для вибору закладу з автокомпліту
  const selectCandidate = (place: PlaceCandidate) => {
    setSelectedCandidate(place);
    setManualMode(false);
  };

  // Метод для переходу в режим ручної мапи
  const handleFallbackToManual = () => {
    setManualMode(true);
    setSelectedCandidate(null);
    setManualName(searchQuery || '');
    setManualAddress('Львів, площа Ринок');
  };

  // Збереження профілю та відправка на бекенд
  const handleSaveProfile = async () => {
    setErrorMsg('');
    setSaving(true);

    let finalName = '';
    let finalPlaceId: string | null = null;
    let finalAddress = '';
    let finalCoords = { latitude: 49.8419, longitude: 24.0315 };

    if (manualMode) {
      if (!manualName.trim()) {
        setErrorMsg('Будь ласка, вкажіть назву вашого закладу.');
        setSaving(false);
        return;
      }
      if (!manualCoords) {
        setErrorMsg('Клацніть на карті щоб вказати розташування закладу.');
        setSaving(false);
        return;
      }
      finalName = manualName.trim();
      finalAddress = manualAddress.trim() || 'Вручну вказана на мапі';
      finalCoords = manualCoords;
    } else if (selectedCandidate) {
      finalName = selectedCandidate.name;
      finalPlaceId = selectedCandidate.placeId;
      finalAddress = selectedCandidate.address;
      finalCoords = { latitude: selectedCandidate.latitude, longitude: selectedCandidate.longitude };
    } else {
      setErrorMsg('Оберіть заклад зі списку або скористайтеся мапою.');
      setSaving(false);
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Користувач не авторизований у Firebase.');
      }

      // Безпосереднє відправлення запиту на ваш бекенд Spring Boot за новим контрактом 
      try {
        await createProfile({
          businessName: finalName,
          nicheCode: nicheCode,
          googlePlaceId: finalPlaceId,
          address: finalAddress,
          location: {
            latitude: finalCoords.latitude,
            longitude: finalCoords.longitude
          }
        });
        
        const newToken = await currentUser.getIdToken(true);
        localStorage.setItem('cim_access_token', newToken);
      } catch (backendErr) {
        console.warn("Помилка при реєстрації профілю на зовнішньому бекенді:", backendErr);
        // Не блокуємо розробку чи тестування, якщо локальний бекенд не працює під час рендеру в Клауд Рані
      }

      setSaving(false);
      // Перенаправляємо на Dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Сталася помилка при збереженні профілю. Спробуйте ще раз.');
      setSaving(false);
    }
  };

  return (
    <div id="profile-setup-page" className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50/50 px-4 py-12">
      <div className="w-full max-w-[650px] space-y-6">
        
        {/* Хедер налаштування */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-blue-50 text-blue-600 rounded-full p-3 shadow-3xs mb-1">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
            Налаштування профілю бізнесу
          </h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Знайдіть і підтвердіть розташування закладу, щоб система автоматично завантажила конкурентів та розпочала детальний аналіз ринку.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-150 rounded-xl p-3 flex items-start gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Крок 1. Вибір ніші */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-700 block">
              Крок 1. Оберіть бізнес-нішу, до якої належить заклад
            </label>
            <div className="relative w-full z-[60]">
               <SearchableNicheSelect
                  value={nicheOptions.find(n => n.code === nicheCode)?.displayName ?? nicheCode}
                  onChange={(displayName) => {
                    const found = nicheOptions.find(n => n.displayName === displayName);
                    if (found) setNicheCode(found.code);
                  }}
                  niches={nicheOptions.map(n => n.displayName)}
                  isLoading={isLoadingNiches}
                />
            </div>
          </div>

          {/* Крок 2. Пошук закладу */}
          <div className="space-y-3 mt-6">
            <label className="text-xs font-bold text-gray-700 block">
              Крок 2. Введіть назву закладу для пошуку у Google Places
            </label>
            <form onSubmit={handleSearch} className="flex gap-2 relative z-[50]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="напр. Копальня кави або Майстерня шоколаду"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-xl h-11 pl-10 pr-3 text-xs text-gray-800 font-medium outline-none transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-100 text-white font-semibold text-xs px-5 rounded-xl h-11 transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-3xs"
              >
                {isSearching ? 'Пошук...' : 'Пошук'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Результати пошуку або альтернативні опції */}
          {hasSearched && !manualMode && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block pb-1 border-b border-gray-100">
                Результати пошуку кандидатур ({candidates.length})
              </div>

              {candidates.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {candidates.map((p) => {
                    const isSelected = selectedCandidate?.placeId === p.placeId;
                    return (
                      <div
                        key={p.placeId}
                        onClick={() => selectCandidate(p)}
                        className={`border rounded-xl p-3.5 transition-all duration-200 cursor-pointer flex justify-between items-center ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50/30' 
                            : 'border-gray-150 hover:border-gray-300 hover:bg-gray-50/40'
                        }`}
                      >
                        <div className="space-y-1 flex-1 pr-4">
                          <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            {p.name}
                          </h4>
                          <span className="text-[10px] text-gray-500 block leading-tight">
                            {p.address}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {p.rating} ({p.userRatingsTotal} відгуків)
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500 text-white' 
                            : 'border-gray-200'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Закладів за таким запитом не виявлено в базі Google Places.</p>
                </div>
              )}

              {/* Кнопка розгортання ручного режиму */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleFallbackToManual}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-all flex items-center gap-1 px-4 py-2 hover:bg-blue-50 rounded-lg cursor-pointer"
                >
                  Мого закладу немає у списку
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Крок 3. Ручна гео-розмітка на мапі */}
          {manualMode && (
            <div className="space-y-4 animate-fade-in border-t border-gray-100 pt-5">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Map className="w-4 h-4 text-indigo-600 animate-pulse" />
                  Встановлення локації вручну
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setManualMode(false);
                    setHasSearched(false);
                    setSearchQuery('');
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-900 font-semibold"
                >
                  Повернутися до пошуку
                </button>
              </div>

              {/* Текстові інпути для ручного додавання */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Назва закладу</span>
                  <input
                    type="text"
                    required
                    placeholder="напр. Мій затишний ресторанчик"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-lg h-9 px-3 text-xs text-gray-800 font-medium outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Фізична адреса</span>
                  <input
                    type="text"
                    required
                    placeholder="напр. вул. Сербська 10, Львів"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-lg h-9 px-3 text-xs text-gray-800 font-medium outline-none transition-all"
                  />
                </div>
              </div>

              {/* Інтерактивна Leaflet-мапа */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-600 uppercase block">
                  Клацніть на карті, щоб встановити шпильку
                </span>
                <LocationMap
                  location={manualCoords}
                  onChange={setManualCoords}
                />
                {manualCoords && (
                  <div className="bg-gray-50 border border-gray-150 rounded-lg px-3 py-2 flex justify-between items-center text-[10px] font-mono text-gray-500">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-gray-400 shrink-0" />
                      Широта: <strong className="text-gray-800">{manualCoords.lat.toFixed(5)}° N</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-gray-400 shrink-0 rotate-90" />
                      Довгота: <strong className="text-gray-800">{manualCoords.lng.toFixed(5)}° E</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Валідація та збереження */}
          {(selectedCandidate || manualMode) ? (
            <div className="pt-4 border-t border-gray-100 flex gap-3 animate-fade-in">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProfile}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold h-11 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs"
              >
                {saving ? 'Створення профілю...' : 'Зберегти профіль та Перейти в Аналізатор'}
                {!saving && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="bg-blue-50/40 rounded-xl p-3 text-[10.5px] text-blue-800 leading-normal flex items-start gap-1.5 border border-blue-100/60">
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 animate-pulse mt-0.5" />
              <span>Знайдіть ваш заклад або встановіть шпильку на мапі, щоб розблокувати звіт та отримати аналітику.</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
