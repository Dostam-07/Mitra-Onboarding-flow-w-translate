import React from 'react';
import { OnboardingStep } from '../types';
import { cn } from '../lib/utils';
import { translations, type Language } from '../translations';

interface LayoutProps {
  children: React.ReactNode;
  currentStep: OnboardingStep;
  language?: Language;
  onLanguageChange?: (l: Language) => void;
}

const LANGUAGE_ORDER: Language[] = ['English', 'Hindi', 'Kannada'];

export function Layout({ children, currentStep, language = 'English', onLanguageChange }: LayoutProps) {
  const steps = [1, 2, 3, 4];
  const t = translations[language];

  return (
    <div className="min-h-[100dvh] bg-[#F2F0E9] text-gray-900 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-20 border-b border-white/60 bg-[#f7f2ea]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4 px-5 py-4 md:px-8">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#572e91]">Mitra Onboarding</div>
            <p className="text-[11px] text-gray-500">Community leader registration flow</p>
          </div>
          {currentStep === OnboardingStep.PROFILE && (
            <select
              value={language}
              onChange={(e) => onLanguageChange?.(e.target.value as Language)}
              className="rounded-full border border-[#572e91]/10 bg-white px-4 py-2 text-[11px] font-semibold text-[#572e91] shadow-sm outline-none"
            >
              {LANGUAGE_ORDER.map((item) => (
                <option key={item} value={item}>
                  {t.languages[item]}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-5 pb-4 md:px-8">
          {steps.map((step) => (
            <div key={step} className={cn('h-1.5 flex-1 overflow-hidden rounded-full bg-white/70', step <= currentStep && 'bg-[#eadff8]')}>
              <div className={cn('h-full rounded-full transition-all duration-300', step <= currentStep ? 'bg-[#572e91]' : 'bg-transparent')} style={{ width: step <= currentStep ? '100%' : '0%' }} />
            </div>
          ))}
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-3 py-2 md:px-8 md:py-6">
        <div className="flex w-full flex-1 overflow-hidden rounded-2xl border border-white/70 bg-[#fdfcfb] shadow-[0_18px_50px_-28px_rgba(87,46,145,0.28)] md:rounded-[28px]">
          {children}
        </div>
      </main>
    </div>
  );
}
