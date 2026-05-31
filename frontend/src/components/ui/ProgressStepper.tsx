/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, Loader2, Database, BrainCircuit, Sparkles, Shield, Tag } from 'lucide-react';
import { RUNNING_STAGES, RunningStage } from '../../hooks/useMockAnalysisSession';

interface ProgressStepperProps {
  id?: string;
  currentStage: RunningStage;
  competitorsCount?: number;
  maxCompetitors?: number;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({ 
  id, 
  currentStage,
  competitorsCount,
  maxCompetitors
}) => {
  const steps = [
    {
      key: RUNNING_STAGES.COLLECTING_DATA,
      label: 'Збір даних про конкурентів',
      description: 'Парсинг відгуків та картування об’єктів у вибраному секторі',
      icon: Database,
    },
    {
      key: RUNNING_STAGES.ANONYMIZING,
      label: 'Анонімізація відгуків (GDPR)',
      description: 'Видалення чутливих персональних даних клієнтів',
      icon: Shield,
    },
    {
      key: RUNNING_STAGES.CLASSIFYING,
      label: 'Аспектна класифікація',
      description: 'Групування відгуків за якістю, сервісом, ціною та локацією',
      icon: BrainCircuit,
    },
    {
      key: RUNNING_STAGES.EXTRACTING_CHARACTERISTICS,
      label: 'Виділення характеристик',
      description: 'Визначення сильних та слабких сторін закладів',
      icon: Tag,
    },
    {
      key: RUNNING_STAGES.GENERATING_REPORT,
      label: 'Генерація стратегічного звіту',
      description: 'Розробка рекомендацій для бізнесу за допомогою LLM',
      icon: Sparkles,
    },
  ];

  const getStepStatus = (stepKey: RunningStage) => {
    const stageOrder: string[] = [
      RUNNING_STAGES.IDLE,
      RUNNING_STAGES.COLLECTING_DATA,
      RUNNING_STAGES.ANONYMIZING,
      RUNNING_STAGES.CLASSIFYING,
      RUNNING_STAGES.EXTRACTING_CHARACTERISTICS,
      RUNNING_STAGES.GENERATING_REPORT,
      RUNNING_STAGES.COMPLETED,
      RUNNING_STAGES.FAILED,
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    const stepIndex = stageOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex) {
      return 'active';
    } else {
      return 'upcoming';
    }
  };

  return (
    <div id={id} className="bg-white border border-gray-150 rounded-xl p-6 sm:p-8 shadow-sm space-y-6 max-w-md mx-auto">
      <div className="flex flex-col space-y-3 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          <div>
            <h4 className="font-bold text-sm text-gray-900">Запущено фоновий обчислювальний аналіз</h4>
          </div>
        </div>

        {competitorsCount !== undefined && competitorsCount > 0 && (
          <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-lg p-2 px-3">
            <span className="text-xs font-semibold text-blue-800">Знайдено конкурентів:</span>
            <span className="bg-blue-600 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded-full select-none animate-pulse">
              {competitorsCount} {maxCompetitors ? `з ${maxCompetitors}` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.key);
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="relative flex items-start gap-4">
              {/* Vertical timeline line */}
              {idx < steps.length - 1 && (
                <div
                  className={`absolute left-5 top-10 h-10 w-0.5 -ml-px ${
                    status === 'completed' ? 'bg-gradient-to-b from-emerald-500 to-indigo-100' : 'bg-gray-100'
                  }`}
                />
              )}

              {/* Icon / status badge container */}
              <div className="relative shrink-0">
                {status === 'completed' ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-3xs duration-300">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                ) : status === 'active' ? (
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-450 text-blue-600 flex items-center justify-center shadow-3xs animate-pulse ring-4 ring-blue-50">
                    <StepIcon className="w-5 h-5 text-blue-600 animate-bounce duration-500" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-150 text-gray-400 flex items-center justify-center">
                    <StepIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Text metadata info */}
              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold leading-none ${
                    status === 'completed'
                      ? 'text-emerald-700'
                      : status === 'active'
                      ? 'text-blue-800 font-bold'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
                {step.description && <p className="text-[11px] text-gray-500 leading-normal">{step.description}</p>}
                {status === 'active' && (
                  <span className="inline-block bg-blue-100/50 text-blue-700 text-[9px] px-2 py-0.5 rounded font-mono font-medium tracking-wide mt-1 animate-pulse">
                    ВИКОНУЄТЬСЯ...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-gray-405 bg-gray-50 rounded-lg p-3 text-center border-l-2 border-gray-200 leading-relaxed">
        Розрахунковий час виконання сесії: ~10 секунд. Оновлення сторінки не скине ваш загальний аналіз.
      </div>
    </div>
  );
};
export default ProgressStepper;
