import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight,
  Search,
  Brain,
  FileText,
  MessageCircle,
  Info,
  Check,
  Star,
  Activity,
  Layers,
  Map,
  Lock
} from 'lucide-react';

import GapHeatmapTable from '../components/analytics/GapHeatmapTable';
import RadarChartWidget from '../components/analytics/RadarChartWidget';
import SentimentTrendChart from '../components/analytics/SentimentTrendChart';
import PositioningMatrix from '../components/analytics/PositioningMatrix';
import { mockCompetitors } from '../data/mockReportData';

interface LandingProps {
  isAuthenticated: boolean;
}

export default function Landing({ isAuthenticated }: LandingProps) {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col justify-between selection:bg-blue-100 selection:text-blue-800">
      
      {/* 1. HERO SECTION */}
      <section id="hero-section" className="relative overflow-hidden py-16 lg:py-24 bg-white border-b border-gray-100 z-10">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-200 to-indigo-100 opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.187rem]"></div>
        </div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            
            {/* Left text column */}
            <div className="lg:col-span-6 text-left space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                Аналітика для малого бізнесу
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Дізнайтесь, що клієнти <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">кажуть про ваших конкурентів</span>
              </h1>
              
              <p className="text-lg text-gray-600 leading-relaxed font-sans max-w-xl">
                Система автоматично збирає відгуки, аналізує сильні та слабкі сторони конкурентів і формує персональні рекомендації для вашого бізнесу.
              </p>
              
              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Link
                  to={isAuthenticated ? "/dashboard" : "/login"}
                  className="inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-150 transition-all cursor-pointer text-center"
                >
                  {isAuthenticated ? "До аналітики" : "Спробувати безкоштовно"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                
                <a
                  href="#how-it-works"
                  onClick={(e) => handleScrollTo(e, 'how-it-works')}
                  className="inline-flex items-center justify-center px-6 py-3.5 border border-gray-200 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors text-center animate-bounce-subtle"
                >
                  Дізнатись більше
                </a>
              </div>
            </div>
            
            {/* Right mockup column */}
            <div className="lg:col-span-6 mt-12 lg:mt-0">
              <div className="relative mx-auto max-w-[500px] lg:max-w-none">
                {/* Background decorative square glow */}
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-10 blur-xl"></div>
                
                {/* Simulated Web Application UI Mockup */}
                <div className="relative bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 overflow-hidden font-sans">
                  
                  {/* Top Bar of App Mockup */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <span className="w-3 h-3 rounded-full bg-red-400"></span>
                        <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                        <span className="w-3 h-3 rounded-full bg-green-400"></span>
                      </div>
                      <span className="text-xs font-mono text-gray-400 ml-2">SmartBiz • Порівняльний аналіз</span>
                    </div>
                    <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Activity className="w-3 h-3 text-green-600" /> Оновлено щойно
                    </span>
                  </div>

                  {/* App Mockup Grid */}
                  <div className="space-y-4">
                    {/* Visual 1: Real Static Radar Chart */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-500">Порівняльний профіль аспектів (-1.0 до +1.0)</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-150 h-64 flex items-center justify-center pointer-events-none select-none">
                        <RadarChartWidget hideLegend={true} heightClass="h-52" />
                      </div>
                    </div>

                    {/* Visual 2: AI Recommendation block */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-xl p-3.5 relative">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 mb-1.5 uppercase tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                        AI Автоматична Порада
                      </div>
                      <p className="text-xs text-gray-700 font-medium leading-relaxed">
                        Конкурент <strong className="text-gray-900">«Палітра Смаку»</strong> за кутом має чудову залу та випічку, проте відвідувачі часто скаржаться на відсутність веганських альтернатив молока та десертів без цукру. Додавання рослинного молока до вашого меню дозволить швидко залучити цю аудиторію.
                      </p>
                      
                      {/* Quote snippet */}
                      <div className="mt-2 text-[10px] text-gray-500 bg-white/80 p-1.5 rounded border border-gray-100 italic">
                        «Приємний інтер'єр, але дуже шкода, що знову не було вівсяного молока для матча... Довелося шукати інше місце...» — Google Maps
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. PROBLEMS SECTION */}
      <section id="problems-section" className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4.5xl">
              Проблема: Чому бізнесу важко рости без аналітики?
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Кожен клієнт залишає важливі підказки у відгуках, однак більшість бізнесів просто не встигають їх вивчати.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pain Point 1 */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:translate-y-[-4px] transition-transform">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center mb-4">
                <span className="text-rose-600 font-extrabold text-lg">!</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Брак даних для стратегічних рішень</h3>
              <p className="text-sm text-gray-650 leading-relaxed">
                Без постійного аналізу ринку бізнес змушений діяти навмання. Не розуміючи, де саме помиляються конкуренти та в чому їхня справжня перевага, ви ризикуєте будувати стратегію на власних припущеннях, а не на реальних фактах.
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:translate-y-[-4px] transition-transform">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center mb-4">
                <span className="text-rose-600 font-extrabold text-lg">!</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Десятки годин на ручну рутину</h3>
              <p className="text-sm text-gray-650 leading-relaxed">
                Коментарі на різних онлайн-платформах містять безцінну правду про конкурентів. Проте збирати, читати й систематизувати сотні відгуків вручну — це виснажливий процес, який щотижня забирає забагато часу, відволікаючи Вас від розвитку бізнесу.
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:translate-y-[-4px] transition-transform">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center mb-4">
                <span className="text-rose-600 font-extrabold text-lg">!</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Ілюзія загального рейтингу</h3>
              <p className="text-sm text-gray-650 leading-relaxed">
                Середня оцінка закладу не показує повної картини й часто приховує серйозні проблеми. Клієнтам може подобатися якість продукту, але дратувати повільне обслуговування чи незручна локація. Без глибокого розбору ці вразливості конкурентів залишаються непоміченими.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="py-16 bg-white border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Як це працює: Всього 3 простих кроки
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Вам не потрібні знання з програмування чи обробки великих даних. Програма зробить усе за вас.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative items-stretch">
            {/* Step 1 */}
            <div className="text-center flex flex-col justify-between items-center h-full">
              <div className="space-y-4 mb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black border border-blue-100 shadow-inner">
                  1
                </div>
                <h3 className="text-lg font-bold text-gray-900">Кажіть нішу та локацію</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                  Просто вкажіть вашу бізнес-нішу (наприклад, «барбершоп») та межі міста або району. Система автоматично складе мапу конкурентів навколо.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50/50 px-2.5 py-1 rounded-full">
                <MapPin className="w-3.5 h-3.5" /> Автопошук локацій
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center flex flex-col justify-between items-center h-full">
              <div className="space-y-4 mb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black border border-blue-100 shadow-inner">
                  2
                </div>
                <h3 className="text-lg font-bold text-gray-900">AI аналізує відгуки</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                  Система паралельно зчитує відгуки, розподіляє досвід людей за категоріями: сервіс, ціна, якість та локація, витягуючи унікальні деталі.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold bg-indigo-50/50 px-2.5 py-1 rounded-full">
                <Brain className="w-3.5 h-3.5" /> Розумна класифікація
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center flex flex-col justify-between items-center h-full">
              <div className="space-y-4 mb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black border border-blue-100 shadow-inner">
                  3
                </div>
                <h3 className="text-lg font-bold text-gray-900">Отримайте звіт та рекомендації</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                  На екрані з'явиться готовий порівняльний аналізатор. Ви побачите готові кроки для покращення сервісу та зможете задати будь-які запитання у зручному чаті.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold bg-green-50/50 px-2.5 py-1 rounded-full">
                <FileText className="w-3.5 h-3.5" /> Наочні рекомендації
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SYSTEM FEATURES */}
      <section id="features-section" className="py-16 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Можливості, створені для вашого успіху
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Ми спростили складну аналітику даних, щоб ви могли приймати правильні рішення за 5 хвилин на день.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200/60 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">Порівняльний аналіз конкурентів</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Профіль та оцінки за ключовими бізнес-векторами. Ви відразу зрозумієте, у якого опонента поганий сервіс чи завищена ціна при аналогічній вашій якості.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200/60 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">Виявлення прихованих деталей</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Система автоматично виділяє несистемні дрібниці: «затишна тераса», «немає дитячої кімнати», «авторський десерт». Кожна фраза верифікована реальними підтвердженими рецензіями.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200/60 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">Персональні рекомендації</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Алгоритм не просто показує сухі цифри — він генерує дієві управлінські рішення: де є вільні ринкові ніші, що клієнти хочуть отримати і де конкуренти припускаються помилок.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200/60 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">AI-асистент для уточнень</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Бажаєте зануритись глибше? Запитайте у чаті: «Де саме у Конкурента Б скаржаться на сервіс?» і помічник миттєво підготує зведення з конкретними цитатами людей.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. VISUALIZATION EXAMPLES MOCKUPS */}
      <section id="visualizations-mockups" className="py-16 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Повний контроль за бізнесом в одній панелі
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Ось приклади наочних графіків, які ви отримаєте для планування стратегії перемоги на ринку.
            </p>
          </div>

          <div className="space-y-8">
            
            {/* Visual example 1: Heatmap (Upper wide element) */}
            <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1.5 bg-blue-100 text-blue-700 rounded">
                      <Layers className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-semibold text-gray-800">Теплова карта конкурентів</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Heatmap</span>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-gray-150 pointer-events-none select-none overflow-x-auto">
                  <GapHeatmapTable
                    competitors={mockCompetitors}
                    onCellSelect={() => {}}
                  />
                </div>
              </div>
              <p className="mt-4 text-[11px] text-gray-500 leading-normal bg-white p-2 rounded border border-gray-150">
                💡 Одразу помітно, де є вразливі місця в сервісі вашого опонента або слабкі сторони у вашій системі.
              </p>
            </div>

            {/* Two columns layout below for other 2 charts */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Visual example 2: Positioning Matrix */}
              <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded">
                        <Layers className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-semibold text-gray-800">Матриця ринкового позиціонування</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Positioning</span>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-gray-150 flex flex-col justify-center select-none">
                    <PositioningMatrix isCompact={true} />
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-gray-500 leading-normal bg-white p-2 rounded border border-gray-150">
                  💡 Оцініть баланс якості та ціни кожного гравця, щоб легко знайти найкращі вільні ніші на ринку.
                </p>
              </div>

              {/* Visual example 3: Sentiment Trend Chart */}
              <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded">
                        <TrendingUp className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-semibold text-gray-800">Динаміка тональності відгуків</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Trends</span>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-gray-150 select-none">
                    <SentimentTrendChart />
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-gray-500 leading-normal bg-white p-2 rounded border border-gray-150">
                  💡 Відстежуйте еволюцію індексу лояльності клієнтів протягом всього періоду спостережень у порівнянні з ринком.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. TRUST AND TRANSPARENCY */}
      <section id="trust-section" className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 lg:p-12 shadow-sm">
            <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
              
              <div className="lg:col-span-4 space-y-3 mb-8 lg:mb-0">
                <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-xl mb-2">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Прозорість та довіра як стандарт</h3>
                <p className="text-sm text-gray-650 leading-relaxed">
                  Будуємо роботу на етичних алгоритмах та реальних відгуках без перекручувань.
                </p>
              </div>

              <div className="lg:col-span-8 grid sm:grid-cols-2 gap-6">
                
                {/* Trust Point 1 */}
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-gray-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Публічні джерела
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Система зчитує лише відкриту інформацію, яку відвідувачі закладу самостійно викладають на картографічних сервісах. Жодних закритих джерел чи незаконного збору інформації.
                  </p>
                </div>

                {/* Trust Point 2 */}
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-gray-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Підтверджені джерела
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Кожен аналітичний висновок чи оцінка не вигадані штучно — ви завжди можете натиснути на них і побачити вихідний текст конкретного відгуку.
                  </p>
                </div>

                {/* Trust Point 3 */}
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-gray-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Позначка AI
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Всі тексти та зведення, сформовані алгоритмом штучного інтелекту, мають відповідне позначення згідно з європейським регламентом безпеки AI Act.
                  </p>
                </div>

                {/* Trust Point 4 */}
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-gray-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Конфіденційність
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Ми не зберігаємо ні пошту, ні персональні відомості чи профілі авторів відгуків на серверах. Вся аналітика зводиться після анонімізації.
                  </p>
                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section id="final-cta" className="py-20 relative overflow-hidden bg-gradient-to-br from-blue-700 to-indigo-900 text-white">
        {/* Background blobs for premium appearance */}
        <div className="absolute inset-x-0 -bottom-40 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
          <div className="relative left-[calc(50%+3rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-blue-400 to-indigo-400 opacity-30"></div>
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Готові дізнатись, що кажуть клієнти ваших конкурентів?
          </h2>
          <p className="text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Почніть приймати рішення на основі справжніх бізнес-даних та відгуків вже сьогодні. Реєстрація займає всього 1 хвилину.
          </p>
          <div className="pt-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-lg text-blue-700 bg-white hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl cursor-pointer"
            >
              Розпочати аналіз
              <ArrowRight className="ml-2 w-5 h-5 text-blue-700" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
