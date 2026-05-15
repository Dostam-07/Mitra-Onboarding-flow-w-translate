import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Copy, Check, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { type TelemetryData } from '../types';

interface TelemetryViewProps {
  telemetry: TelemetryData;
  isSyncing?: boolean;
  syncError?: string | null;
}

export function TelemetryView({ telemetry, isSyncing, syncError }: TelemetryViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsDesktop(window.innerWidth >= 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(telemetry, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Content = (
    <div className="flex-1 bg-[#121417] rounded-3xl p-6 flex flex-col border border-white/5 shadow-xl h-full font-mono">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#572e91] rounded-lg">
            <Terminal size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Behavioral Telemetry</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">
              session_{telemetry.sessionId.split('-')[0]}.json
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {syncError ? (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
              <CloudOff size={10} /> ERROR
            </span>
          ) : isSyncing ? (
            <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
              <Loader2 size={10} className="animate-spin" /> SYNCING
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-teal-400 font-mono">
              <Cloud size={10} /> SYNCED
            </span>
          )}
          <span className="text-[10px] text-green-400 font-mono animate-pulse">LIVE</span>
          <button onClick={handleCopy} className="text-gray-500 hover:text-white transition-colors">
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-auto p-2" style={{ scrollbarWidth: 'thin' }}>
          <pre className="text-[11px] text-green-400/90 leading-relaxed">
            {JSON.stringify(telemetry, null, 2)}
          </pre>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#121417] to-transparent pointer-events-none"></div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-gray-400 text-[9px] uppercase tracking-wider mb-1">Session Duration</p>
          <p className="text-white font-mono text-base">
            {telemetry.endTime
              ? Math.round((telemetry.endTime - telemetry.startTime) / 1000)
              : Math.round((Date.now() - (telemetry.startTime || Date.now())) / 1000)}
            <span className="text-[10px] text-gray-500 font-sans ml-1">sec</span>
          </p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
          <p className="text-gray-400 text-[9px] uppercase tracking-wider mb-1">Final Method</p>
          <p className="text-white font-mono text-sm capitalize">
            {telemetry.finalMethod || 'Pending'}
          </p>
        </div>

        <div className="p-2 bg-white/5 rounded-xl col-span-2 grid grid-cols-3 gap-2 border border-white/5">
          <div className="text-center">
            <p className="text-gray-500 text-[8px] uppercase tracking-wider mb-0.5">GPS</p>
            <p className="text-white font-mono text-xs">
              {Math.round(telemetry.gpsDuration / 1000)}<span className="text-[8px] ml-0.5 opacity-50">s</span>
              {telemetry.gpsSuccess && <span className="ml-1 text-[10px] text-teal-400">✓</span>}
            </p>
          </div>
          <div className="text-center border-x border-white/10">
            <p className="text-gray-500 text-[8px] uppercase tracking-wider mb-0.5">PIN</p>
            <p className="text-white font-mono text-xs">
              {Math.round(telemetry.pincodeDuration / 1000)}<span className="text-[8px] ml-0.5 opacity-50">s</span>
              {telemetry.pincodeSuccess && <span className="ml-1 text-[10px] text-teal-400">✓</span>}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-[8px] uppercase tracking-wider mb-0.5">MAN</p>
            <p className="text-white font-mono text-xs">
              {Math.round(telemetry.manualDuration / 1000)}<span className="text-[8px] ml-0.5 opacity-50">s</span>
            </p>
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-gray-400 text-[9px] uppercase tracking-wider mb-1">Corrections</p>
          <p className="text-white font-mono text-base">
            {telemetry.numberOfEdits}
            <span className="text-[10px] text-gray-500 font-sans ml-1">edits</span>
          </p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl">
          <p className="text-gray-400 text-[9px] uppercase tracking-wider mb-1">Step</p>
          <p className="text-white font-mono text-base">
            {telemetry.stepDropOff || 'Completed'}
          </p>
        </div>
      </div>
    </div>
  );

  const portalContainer = document.getElementById('desktop-telemetry-container');

  if (isDesktop && portalContainer) {
    return createPortal(Content, portalContainer);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-6 z-40 bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 hover:bg-gray-900 transition-all active:scale-95 lg:hidden"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
        <span className="font-bold text-[10px] uppercase tracking-widest">📊 View Log</span>
      </button>

      <AnimatePresence>
        {isOpen && !isDesktop && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full h-[80vh] relative"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute -top-12 right-0 p-2 bg-white/10 rounded-full text-white"
              >
                <X size={24} />
              </button>
              {Content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
