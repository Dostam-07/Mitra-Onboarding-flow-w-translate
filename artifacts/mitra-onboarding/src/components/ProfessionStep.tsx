import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, BriefcaseBusiness } from 'lucide-react';
import { translations, type Language } from '../translations';
import { SearchableDropdown } from './SearchableDropdown';
import { TranslatingInput } from './TranslatingInput';

interface ProfessionStepProps {
  onNext: (data: { organization: string; role: string }) => void;
  onBack: () => void;
  language: Language;
  initialOrg?: string;
  initialRole?: string;
  selectedState?: string;
}

const GLOBAL_ORGS = ['ShikshaLokam', 'Mantra', 'Others'];
const ROLES = ['Women Leader', 'Youth Leader', 'Teacher'];

export function ProfessionStep({ onNext, onBack, language, initialOrg = '', initialRole = '' }: ProfessionStepProps) {
  const t = translations[language];

  // If initialOrg is not in the canonical list, it's a custom "Others" value
  const isInitialCustom = initialOrg && !GLOBAL_ORGS.includes(initialOrg);
  const [org, setOrg] = useState(isInitialCustom ? 'Others' : initialOrg);
  const [customOrg, setCustomOrg] = useState(isInitialCustom ? initialOrg : '');
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState('');

  // The canonical "Others" key — always English, matched against t.orgs lookup
  const isOthers = org === 'Others';

  const handleContinue = () => {
    const finalOrg = isOthers ? customOrg.trim() : org;
    if (!finalOrg || !role) {
      setError(t.error_prof);
      return;
    }
    if (isOthers && !customOrg.trim()) {
      setError(t.error_prof);
      return;
    }
    onNext({ organization: finalOrg, role });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full w-full flex-col lg:grid lg:grid-cols-[1fr_0.78fr]">
      <div className="flex h-full flex-col px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
        <button onClick={onBack} className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#572e91]/10 bg-white text-[#572e91] shadow-sm">
          <ChevronLeft size={22} />
        </button>

        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#572e91]/10 bg-[#572e91]/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#572e91]">
            Step 2 · Profession
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl">{t.prof_details}</h1>
        </div>

        <div className="mt-8 max-w-xl flex-1 space-y-6 pb-8 min-w-0">
          {/* Organization dropdown — options shown in current language */}
          <SearchableDropdown
            label={t.select_org}
            value={org}
            options={GLOBAL_ORGS}
            placeholder={t.org_placeholder}
            searchPlaceholder={(t as any).search_placeholder || 'Search'}
            onChange={(val) => {
              setOrg(val);
              setCustomOrg('');
              if (error) setError('');
            }}
            displayValue={(val) => (t as any).orgs?.[val] || val}
            icon={<BriefcaseBusiness size={18} />}
          />

          {/* Custom org input — shown when "Others" is selected */}
          {isOthers && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <label className="block px-1 pb-1 text-xs font-bold uppercase tracking-widest text-[#572e91]/80">
                {(t as any).orgs?.['Others'] || 'Others'}
              </label>
              <TranslatingInput
                value={customOrg}
                onChange={(val) => {
                  setCustomOrg(val);
                  if (error) setError('');
                }}
                language={language}
                placeholder={t.org_placeholder}
                autoFocus
              />
            </motion.div>
          )}

          {/* Role dropdown — options shown in current language */}
          <SearchableDropdown
            label={t.your_role}
            value={role}
            options={ROLES}
            placeholder={t.role_placeholder}
            searchPlaceholder={(t as any).search_placeholder || 'Search'}
            onChange={(val) => { setRole(val); if (error) setError(''); }}
            displayValue={(val) => (t as any).roles?.[val] || val}
            icon={<BriefcaseBusiness size={18} />}
          />

          {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="mt-auto border-t border-[#572e91]/8 pt-5">
          <button onClick={handleContinue} className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-full bg-[#572e91] px-8 text-lg font-semibold text-white shadow-[0_18px_36px_-18px_rgba(87,46,145,0.7)] transition hover:bg-[#452475]">
            {t.complete_reg}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <div className="hidden lg:flex lg:flex-1 lg:flex-col justify-between bg-[#faf7ff] px-10 py-12">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-[#572e91]/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#572e91]">Guided setup</div>
          <p className="max-w-sm text-3xl font-semibold tracking-tight text-[#1f1630]">A clearer selection step for quick registration.</p>
        </div>
        <div className="rounded-[28px] border border-[#572e91]/10 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <div className="h-3 w-1/3 rounded-full bg-[#572e91]/10" />
            <div className="h-14 rounded-2xl border border-[#572e91]/10 bg-[#faf8ff]" />
            <div className="h-14 rounded-2xl border border-[#572e91]/10 bg-[#faf8ff]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
