import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, UserRound, Phone } from 'lucide-react';
import { translations, type Language } from '../translations';
import { TranslatingInput } from './TranslatingInput';

interface ProfileStepProps {
  onNext: (data: { phone: string; name: string; language: string }) => void;
  initialLanguage?: Language;
  onLanguageChange?: (l: Language) => void;
  initialName?: string;
  initialPhone?: string;
}

export function ProfileStep({ onNext, initialLanguage = 'English', onLanguageChange, initialName = '', initialPhone = '' }: ProfileStepProps) {
  const [phone, setPhone] = useState(initialPhone.replace(/\D/g, '').slice(-10));
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  const t = translations[initialLanguage];

  const handleContinue = () => {
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setError(t.error_phone);
      return;
    }
    if (name.trim().length < 2) {
      setError(t.error_name);
      return;
    }
    onNext({ phone: `+91 ${phone}`, name: name.trim(), language: initialLanguage });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full w-full flex-col lg:grid lg:grid-cols-1">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 md:px-10 md:py-8 lg:px-12 lg:py-10">
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#572e91]/10 bg-[#572e91]/6 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#572e91]">
            Step 1 · Profile
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl">{t.welcome}</h1>
            <p className="max-w-md text-xs leading-5 text-gray-600 md:text-sm md:leading-6">{t.start_journey}</p>
          </div>
        </div>

        <div className="max-w-xl space-y-3 flex-1">
          <div className="space-y-2">
            <label className="flex items-center gap-2 px-1 pb-1 text-xs font-bold uppercase tracking-widest text-[#572e91]/80">
              <UserRound size={12} />
              {t.full_name}
            </label>
            <TranslatingInput
              placeholder={t.name_placeholder}
              value={name}
              language={initialLanguage}
              onChange={(val) => {
                setName(val);
                if (error) setError('');
              }}
              className="!h-11 !rounded-[18px] !border-[#572e91]/10 !font-medium !text-gray-900 focus:!border-[#572e91]/40 focus:!ring-4 focus:!ring-[#572e91]/10 md:!h-14 md:!px-5 md:!text-base md:!rounded-[22px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 px-1 pb-1 text-xs font-bold uppercase tracking-widest text-[#572e91]/80">
              <Phone size={12} />
              {t.phone_number}
            </label>
            <div className="flex h-11 items-center gap-3 rounded-[18px] border border-[#572e91]/10 bg-white px-4 focus-within:border-[#572e91]/40 focus-within:ring-4 focus-within:ring-[#572e91]/10 md:h-14 md:px-5 md:rounded-[22px]">
              <span className="rounded-full bg-[#f3ecfb] px-2 py-0.5 text-xs font-semibold text-[#572e91] md:px-3 md:py-1 md:text-sm">+91</span>
              <input
                type="tel"
                placeholder="00000 00000"
                className="w-full bg-transparent text-sm font-medium tracking-wide text-gray-900 outline-none placeholder:text-gray-400 md:text-base"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 md:rounded-2xl md:px-4 md:py-3 md:text-sm">{error}</p>}
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-[#572e91]/8 pt-3 sm:flex-row sm:items-center sm:justify-between md:gap-3 md:pt-5">
          <button
            onClick={() => onLanguageChange?.(initialLanguage)}
            className="hidden rounded-full border border-[#572e91]/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 shadow-sm"
          >
            {t.languages[initialLanguage]}
          </button>
          <button
            onClick={handleContinue}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#572e91] px-6 text-sm font-semibold text-white shadow-[0_18px_36px_-18px_rgba(87,46,145,0.7)] transition hover:bg-[#452475] active:translate-y-0 sm:w-auto sm:min-w-[200px] md:h-16 md:text-base"
          >
            {t.continue}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
