import React from 'react';
import { motion } from 'framer-motion';
import { OnboardingStep, type OnboardingState } from '../types';
import { CheckCircle2, Edit2, MessagesSquare, ScrollText, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations, type Language } from '../translations';
import { useTranslatedOptions } from '../lib/useTranslatedOptions';

interface ConfirmationStepProps {
  state: OnboardingState;
  onEdit: (step: OnboardingStep) => void;
  onConfirm: (flowType?: 'discussion' | 'improvement') => void;
  onReset: () => void;
  onUpdate?: (updates: Partial<OnboardingState>) => void;
}

export function ConfirmationStep({ state, onEdit, onConfirm, onReset, onUpdate }: ConfirmationStepProps) {
  const isCompleted = state.telemetry.completionStatus === 'completed';
  const language = (state.language || 'English') as Language;
  const t = translations[language];

  const [selection, setSelection] = React.useState<'discussion' | 'improvement' | null>(null);
  const [editingField, setEditingField] = React.useState<'name' | 'phone' | null>(null);
  const [editValue, setEditValue] = React.useState('');

  const allLocationStrings = [state.location.village, state.location.district, state.location.state].filter(Boolean);
  const translatedLoc = useTranslatedOptions(allLocationStrings, language);

  const rows = [
    { id: 'name', label: t.label_name, val: state.name, step: OnboardingStep.PROFILE, inlineEditable: true },
    { id: 'phone', label: t.label_phone, val: state.phone, step: OnboardingStep.PROFILE, inlineEditable: true },
    {
      id: 'location',
      label: t.label_location,
      val: `${translatedLoc[state.location.village] || state.location.village}, ${(t as any).location_data?.districts?.[state.location.district] || translatedLoc[state.location.district] || state.location.district}, ${(t as any).location_data?.states?.[state.location.state] || translatedLoc[state.location.state] || state.location.state}`,
      step: OnboardingStep.LOCATION,
      inlineEditable: false
    },
    {
      id: 'profession',
      label: t.label_profession,
      val: (t as any).format_profession(
        (t as any).roles?.[state.role] || state.role,
        (t as any).orgs?.[state.organization] || state.organization
      ),
      step: OnboardingStep.PROFESSION,
      inlineEditable: false
    },
  ];

  const handleInlineSave = () => {
    if (editingField === 'name' && editValue.trim().length >= 2) {
      onUpdate?.({ name: editValue.trim() });
    } else if (editingField === 'phone') {
      const val = editValue.replace(/\D/g, '').slice(-10);
      if (val.length === 10) onUpdate?.({ phone: `+91 ${val}` });
    }
    setEditingField(null);
  };

  if (isCompleted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full w-full flex-col bg-[#fdfcfb] px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-500">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl">{t.reg_success}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">{t.sync_msg}</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button onClick={() => setSelection('discussion')} className={cn('rounded-[24px] border p-5 text-left transition', selection === 'discussion' ? 'border-[#572e91]/30 bg-white' : 'border-white bg-white/80')}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]"><MessagesSquare size={22} /></div>
                <div>
                  <p className="font-semibold text-[#1f1630]">{t.capture_discussion}</p>
                  <p className="text-sm text-gray-500">Capture a meeting discussion and generate a report.</p>
                </div>
              </div>
            </button>
            <button onClick={() => setSelection('improvement')} className={cn('rounded-[24px] border p-5 text-left transition', selection === 'improvement' ? 'border-[#572e91]/30 bg-white' : 'border-white bg-white/80')}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1e9ff] text-[#572e91]"><ScrollText size={22} /></div>
                <div>
                  <p className="font-semibold text-[#1f1630]">{t.share_improvement}</p>
                  <p className="text-sm text-gray-500">Capture a simple improvement story.</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 border-t border-[#572e91]/8 pt-5">
            <button onClick={() => onConfirm(selection || undefined)} disabled={!selection} className={cn('inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition', selection ? 'bg-[#572e91] hover:bg-[#452475]' : 'cursor-not-allowed bg-gray-300')}>
              {t.continue}
              <ArrowRight size={16} />
            </button>
            <button onClick={onReset} className="mt-3 block w-full text-center text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 transition hover:text-gray-700">{t.register_another}</button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full w-full flex-col bg-[#fdfcfb] px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#572e91]/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#572e91]">Step 4 · Review</div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl">{t.review_submit}</h1>
          <p className="max-w-xl text-sm leading-6 text-gray-600">{t.review_desc}</p>
        </div>

        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="rounded-[24px] border border-white bg-white/85 p-5 shadow-sm">
              <p className="mb-1 px-1 text-xs font-bold uppercase tracking-widest text-[#572e91]/80">{row.label}</p>
              {editingField === row.id && row.inlineEditable ? (
                <div className="mt-2 flex items-center gap-3">
                  <input type={row.id === 'phone' ? 'tel' : 'text'} value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 rounded-2xl border border-[#572e91]/15 bg-[#faf7ff] px-4 py-3 text-base font-medium outline-none focus:border-[#572e91]/40" autoFocus />
                  <button onClick={handleInlineSave} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white"><CheckCircle2 size={18} /></button>
                </div>
              ) : (
                <div className="mt-2 flex items-start justify-between gap-4">
                  <p className="text-base font-medium leading-6 text-[#1f1630]">{row.val}</p>
                  <button onClick={() => { if (row.inlineEditable) { setEditingField(row.id as any); setEditValue(row.id === 'phone' ? row.val.replace('+91 ', '') : row.val); } else { onEdit(row.step); } }} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#572e91]/10 bg-[#faf7ff] text-[#572e91]">
                    <Edit2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8 border-t border-[#572e91]/8">
          <button onClick={() => onConfirm()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#572e91] text-sm font-semibold text-white shadow-[0_14px_30px_-16px_rgba(87,46,145,0.6)] transition hover:bg-[#452475]">
            {t.submit}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
