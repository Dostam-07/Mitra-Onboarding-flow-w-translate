import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OnboardingStep, type OnboardingState, type TelemetryData, type LocationData } from './types';
import { ProfileStep } from './components/ProfileStep';
import { ProfessionStep } from './components/ProfessionStep';
import { LocationStep } from './components/LocationStep';
import { ConfirmationStep } from './components/ConfirmationStep';
import TermsStep from './components/TermsStep';
import ChatStep from './components/ChatStep';
import { Layout } from './components/Layout';
import { db, syncSession } from './lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { type Language } from './translations';

const INITIAL_TELEMETRY: TelemetryData = {
  sessionId: '',
  startTime: 0,
  endTime: null,
  gpsDuration: 0,
  pincodeDuration: 0,
  manualDuration: 0,
  gpsSuccess: false,
  pincodeSuccess: false,
  methodSelected: null,
  finalMethod: null,
  numberOfEdits: 0,
  completionStatus: 'incomplete',
  stepDropOff: OnboardingStep.PROFILE,
};

const INITIAL_LOCATION: LocationData = {
  state: '',
  district: '',
  taluk: '',
  village: '',
};

export default function App() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [appLanguage, setAppLanguage] = useState<Language>('English');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firebase connected successfully");
        setSyncError(null);
      } catch (error: any) {
        console.warn("Firebase check:", error?.message || error);
      }
    };
    testConnection();

    const savedLanguage = localStorage.getItem('mitra_app_language') as Language;
    if (savedLanguage) setAppLanguage(savedLanguage);

    const saved = localStorage.getItem('mitra_onboarding_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.telemetry?.completionStatus === 'incomplete') {
          setState(parsed);
          if (parsed.language) setAppLanguage(parsed.language as Language);
          if (parsed.telemetry?.sessionId) {
            setSyncing(true);
            syncSession(parsed.telemetry.sessionId, parsed)
              .catch(console.error)
              .finally(() => setSyncing(false));
          }
        }
      } catch { }
    }

  }, []);

  const handleLanguageChange = (l: Language) => {
    setAppLanguage(l);
    localStorage.setItem('mitra_app_language', l);
    if (state) updateState({ language: l });
  };

  const startSession = async (data: { phone: string; name: string; language: string }) => {
    const startTime = Date.now();
    const initials = data.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    const sessionId = `${initials}_${startTime}_${Math.random().toString(36).substr(2, 4)}`;

    const newState: OnboardingState = {
      phone: data.phone,
      name: data.name,
      language: data.language,
      organization: '',
      role: '',
      location: { ...INITIAL_LOCATION },
      currentStep: OnboardingStep.PROFESSION,
      telemetry: {
        ...INITIAL_TELEMETRY,
        sessionId,
        startTime,
        stepDropOff: OnboardingStep.PROFESSION,
      },
    };

    setState(newState);
    saveToStorage(newState);

    setSyncing(true);
    try {
      await syncSession(sessionId, newState, true);
      setSyncError(null);
    } catch (err: any) {
      console.error("Failed to start session:", err);
      setSyncError(err?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => {
      if (!prev) return null;
      let newTelemetry = prev.telemetry;
      if (updates.currentStep && prev.telemetry.completionStatus === 'incomplete') {
        newTelemetry = { ...newTelemetry, stepDropOff: updates.currentStep };
      }
      const newState = { ...prev, ...updates, telemetry: newTelemetry };
      saveToStorage(newState);
      return newState;
    });
  };

  const updateTelemetry = (updates: Partial<TelemetryData>) => {
    setState(prev => {
      if (!prev) return null;
      const newTelemetry = { ...prev.telemetry, ...updates };
      const newState = { ...prev, telemetry: newTelemetry };
      saveToStorage(newState);
      return newState;
    });
  };

  useEffect(() => {
    if (!state?.telemetry?.sessionId) return;
    const timeout = setTimeout(async () => {
      setSyncing(true);
      try {
        await syncSession(state.telemetry.sessionId, state);
        setSyncError(null);
      } catch (err: any) {
        setSyncError(err?.message || "Sync failed");
      } finally {
        setSyncing(false);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [state]);

  const saveToStorage = (s: OnboardingState) => {
    localStorage.setItem('mitra_onboarding_state', JSON.stringify(s));
  };

  const handleFinish = (flowType?: 'discussion' | 'improvement') => {
    if (!state) return;

    // Only treat a provided flowType as a chat-selection when we're on the SUCCESS screen.
    // This avoids jumping directly to chat if a flowType is passed accidentally earlier in the flow.
    if (state.currentStep === OnboardingStep.SUCCESS && flowType) {
      updateState({ currentStep: OnboardingStep.CHAT, flowType });
      return;
    }

    // If the user has already completed telemetry, send them to TERMS (review/consent)
    if (state.telemetry.completionStatus === 'completed') {
      updateState({ currentStep: OnboardingStep.TERMS });
      return;
    }

    // First submission from review screen - mark as completed and show SUCCESS screen
    const endTime = Date.now();
    const totalTimeSec = Math.round((endTime - state.telemetry.startTime) / 1000);
    updateTelemetry({ completionStatus: 'completed', stepDropOff: null as any, endTime, totalTimeSec });
    // ensure we remain on SUCCESS so the user sees the registration success + bot selection
    setTimeout(() => updateState({ currentStep: OnboardingStep.SUCCESS }), 50);
  };

  const handleTermsAccept = () => {
    if (!state) return;
    updateState({ currentStep: OnboardingStep.SUCCESS });
  };

  const reset = () => {
    localStorage.removeItem('mitra_onboarding_state');
    setState(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F0E9] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#572e91] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Layout
      currentStep={state?.currentStep || OnboardingStep.PROFILE}
      language={appLanguage}
      onLanguageChange={handleLanguageChange}
    >
      <AnimatePresence mode="wait">
        {!state || state.currentStep === OnboardingStep.PROFILE ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <ProfileStep
              initialName={state?.name}
              initialPhone={state?.phone}
              initialLanguage={appLanguage}
              onLanguageChange={handleLanguageChange}
              onNext={(data) => {
                if (state) {
                  updateState({ ...data, currentStep: OnboardingStep.PROFESSION });
                } else {
                  startSession(data);
                }
              }}
            />
          </motion.div>
        ) : state.currentStep === OnboardingStep.PROFESSION ? (
          <motion.div
            key="profession"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <ProfessionStep
              initialOrg={state.organization}
              initialRole={state.role}
              selectedState={state.location?.state}
              language={appLanguage}
              onNext={(data) => updateState({ ...data, currentStep: OnboardingStep.LOCATION })}
              onBack={() => updateState({ currentStep: OnboardingStep.PROFILE })}
            />
          </motion.div>
        ) : state.currentStep === OnboardingStep.LOCATION ? (
          <motion.div
            key="location"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <LocationStep
              value={state.location}
              telemetry={state.telemetry}
              language={appLanguage}
              updateTelemetry={updateTelemetry}
              onNext={(location) => updateState({ location, currentStep: OnboardingStep.SUCCESS })}
              onBack={() => updateState({ currentStep: OnboardingStep.PROFESSION })}
            />
          </motion.div>
        ) : state.currentStep === OnboardingStep.TERMS ? (
          <motion.div
            key="terms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col pt-8"
          >
            <TermsStep
              language={appLanguage}
              onAccept={() => reset()}
              onDecline={() => updateState({ currentStep: OnboardingStep.SUCCESS })}
            />
          </motion.div>
        ) : state.currentStep === OnboardingStep.CHAT ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col pt-0 -mx-6 md:-mx-8 -mt-4"
          >
            <ChatStep
              state={state}
              language={appLanguage}
              onBack={() => updateState({ currentStep: OnboardingStep.SUCCESS })}
              onFinish={() => updateState({ currentStep: OnboardingStep.TERMS })}
            />
          </motion.div>
        ) : state.currentStep === OnboardingStep.SUCCESS ? (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <ConfirmationStep
              state={state}
              onEdit={(step) => {
                setState(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    currentStep: step,
                    telemetry: {
                      ...prev.telemetry,
                      numberOfEdits: prev.telemetry.numberOfEdits + 1
                    }
                  };
                });
              }}
              onUpdate={updateState}
              onConfirm={handleFinish}
              onReset={reset}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Layout>
  );
}
