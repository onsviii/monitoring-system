/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';

import { ANALYSIS_STAGES, TIMING_CONFIG } from '../config/constants';

export const RUNNING_STAGES = ANALYSIS_STAGES;

export type RunningStage = typeof RUNNING_STAGES[keyof typeof RUNNING_STAGES];

export interface AnalysisInput {
  name?: string;
  niche: string;
  location: { latitude: number; longitude: number } | null;
  radiusKm: number;
  maxCompetitors: number;
}

export function useMockAnalysisSession(onCompleted: () => void) {
  const [stage, setStage] = useState<RunningStage>(RUNNING_STAGES.IDLE);
  const [competitorsCount, setCompetitorsCount] = useState<number>(0);
  const [maxCompetitors, setMaxCompetitors] = useState<number>(10);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAnalysis = (input: AnalysisInput) => {
    if (!input.name || !input.name.trim()) {
      setError('Будь ласка, введіть назву аналізу');
      return;
    }
    if (!input.location) {
      setError('Будь ласка, виберіть локацію на карті');
      return;
    }
    setError(null);
    setMaxCompetitors(input.maxCompetitors || 10);
    setCompetitorsCount(0);
    setStage(RUNNING_STAGES.COLLECTING_DATA);
  };

  useEffect(() => {
    if (stage === RUNNING_STAGES.IDLE || stage === RUNNING_STAGES.COMPLETED || stage === RUNNING_STAGES.FAILED) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const setRandomCountBetween = (min: number, max: number) => {
      const target = Math.min(maxCompetitors, Math.max(min, Math.floor(Math.random() * (max - min + 1)) + min));
      setCompetitorsCount(target);
    };

    if (stage === RUNNING_STAGES.COLLECTING_DATA) {
      setRandomCountBetween(1, Math.ceil(maxCompetitors / 3));
      timerRef.current = setTimeout(() => {
        setStage(RUNNING_STAGES.ANONYMIZING);
      }, 2000);
    } else if (stage === RUNNING_STAGES.ANONYMIZING) {
      setRandomCountBetween(Math.ceil(maxCompetitors / 3), Math.ceil(maxCompetitors * 2 / 3));
      timerRef.current = setTimeout(() => {
        setStage(RUNNING_STAGES.CLASSIFYING);
      }, 2000);
    } else if (stage === RUNNING_STAGES.CLASSIFYING) {
      setRandomCountBetween(Math.ceil(maxCompetitors * 2 / 3), Math.max(maxCompetitors - 1, 1));
      timerRef.current = setTimeout(() => {
        setStage(RUNNING_STAGES.EXTRACTING_CHARACTERISTICS);
      }, 2000);
    } else if (stage === RUNNING_STAGES.EXTRACTING_CHARACTERISTICS) {
      setCompetitorsCount(maxCompetitors);
      timerRef.current = setTimeout(() => {
        setStage(RUNNING_STAGES.GENERATING_REPORT);
      }, 2000);
    } else if (stage === RUNNING_STAGES.GENERATING_REPORT) {
      setCompetitorsCount(maxCompetitors);
      timerRef.current = setTimeout(() => {
        setStage(RUNNING_STAGES.COMPLETED);
        onCompleted();
      }, 2000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stage, maxCompetitors]);

  const resetAnalysis = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStage(RUNNING_STAGES.IDLE);
    setCompetitorsCount(0);
    setError(null);
  };

  return {
    stage,
    error,
    competitorsCount,
    maxCompetitors,
    startAnalysis,
    resetAnalysis,
    isRunning: stage !== RUNNING_STAGES.IDLE && stage !== RUNNING_STAGES.COMPLETED && stage !== RUNNING_STAGES.FAILED,
  };
}
export default useMockAnalysisSession;
