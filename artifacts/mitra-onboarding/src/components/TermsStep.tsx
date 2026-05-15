import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { type Language, translations } from '../translations';

interface TermsStepProps {
  language: Language;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsStep({ language, onAccept, onDecline }: TermsStepProps) {
  const t = translations[language];
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) setHasScrolledToBottom(true);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight <= clientHeight) setHasScrolledToBottom(true);
    }
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex h-full w-full flex-col bg-[#fdfcfb] px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#572e91]/6 text-[#572e91]">
            <ScrollText size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl">{t.terms_title}</h1>
          <p className="mt-2 text-sm text-gray-600">{t.terms_welcome}</p>
        </div>

        <div className="relative mb-6 flex-1 min-h-0 overflow-hidden rounded-[28px] border border-white bg-white/85">
          <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'none' }}>
            <div className="space-y-6 text-[15px] leading-7 text-gray-600">
              {(t.terms_sections as any[]).map((section, idx) => (
                <div key={idx} className="space-y-2 rounded-3xl border border-[#572e91]/8 bg-[#faf7ff] p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-[#1f1630]"><span className="h-2 w-2 rounded-full bg-[#572e91]/40" />{section.title}</h3>
                  <p className="whitespace-pre-line pl-4 border-l border-[#572e91]/10">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
          {!hasScrolledToBottom && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[#572e91]/10 bg-white/90 px-4 py-2 text-xs font-semibold text-[#572e91] shadow-sm">
              <ChevronDown size={14} className="inline-block -mt-0.5 mr-1" />
              {t.scroll_to_read}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-[#572e91]/8 pt-5">
          <button onClick={onAccept} disabled={!hasScrolledToBottom} className={cn('inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition', hasScrolledToBottom ? 'bg-[#572e91] text-white hover:bg-[#452475]' : 'cursor-not-allowed bg-gray-200 text-gray-400')}>
            <CheckCircle2 size={18} />
            {t.terms_accept}
          </button>
          <button onClick={onDecline} className="w-full py-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 transition hover:text-gray-700">{t.terms_decline}</button>
        </div>
      </div>
    </motion.div>
  );
}
