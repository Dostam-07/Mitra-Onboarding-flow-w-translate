import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Hash, List, ChevronLeft, Loader2, CheckCircle2, AlertCircle, Search, ArrowRight } from 'lucide-react';

import { cn } from '../lib/utils';
import { SearchableDropdown } from './SearchableDropdown';
import { TranslatingInput } from './TranslatingInput';
import { type LocationData, type TelemetryData, type LocationMethod } from '../types';

import { translations, type Language } from '../translations';
import { LOCATION_DATA } from '../data/locationData';
import { useTranslatedOptions } from '../lib/useTranslatedOptions';

interface LocationStepProps {
  value: LocationData;
  telemetry: TelemetryData;
  language: Language;
  updateTelemetry: (updates: Partial<TelemetryData>) => void;
  onNext: (location: LocationData) => void;
  onBack: () => void;
}

type Mode = 'select' | 'gps' | 'pincode' | 'dropdown' | 'confirm';

export type ApiLocationData = {
  states: string[];
  districts: Record<string, string[]>;
  taluks: Record<string, string[]>;
  villages: Record<string, string[]>;
};

type PostOffice = any;

function normalizeStr(s: unknown) {
  return String(s ?? '').trim().toLowerCase();
}

function postOfficeScore(po: PostOffice) {
  const delivery = normalizeStr(po.DeliveryStatus);
  const branch = normalizeStr(po.BranchType);
  let score = 0;
  if (delivery === 'delivery') score += 10;
  if (branch === 'ho') score += 6;
  else if (branch === 'so') score += 4;
  else if (branch === 'bo') score += 1;
  const block = normalizeStr(po.Block);
  if (block && block !== 'na') score += 2;
  return score;
}

function sortPostOffices(offices: PostOffice[]) {
  return [...offices].sort((a, b) => postOfficeScore(b) - postOfficeScore(a));
}

export function LocationStep({ value, telemetry, language, updateTelemetry, onNext, onBack }: LocationStepProps) {
  const [mode, setMode] = useState<Mode>('select');
  const [location, setLocation] = useState<LocationData>(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiData, setApiData] = useState<ApiLocationData | null>(null);
  const [pincodeOptions, setPincodeOptions] = useState<any[]>([]);
  const [currentModeStartTime, setCurrentModeStartTime] = useState(Date.now());
  const t = translations[language];

  const handleModeSelect = (selectedMode: Mode) => {
    const now = Date.now();
    const duration = now - currentModeStartTime;
    const updates: Partial<TelemetryData> = {};
    if (mode === 'gps') updates.gpsDuration = (telemetry.gpsDuration || 0) + duration;
    if (mode === 'pincode') updates.pincodeDuration = (telemetry.pincodeDuration || 0) + duration;
    if (mode === 'dropdown') updates.manualDuration = (telemetry.manualDuration || 0) + duration;

    setMode(selectedMode);
    setCurrentModeStartTime(now);
    setError('');
    setPincodeOptions([]);

    const method = selectedMode as LocationMethod;
    if (['gps', 'pincode', 'dropdown'].includes(method)) {
      updates.methodSelected = telemetry.methodSelected || method;
    }

    updateTelemetry(updates);
  };

  const handleGps = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError(t.gps_not_supported);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();

          if (data.address) {
            const addr = data.address;
            const newState: LocationData = {
              state: addr.state || '',
              district: addr.county || addr.district || addr.city_district || '',
              taluk: addr.suburb || addr.neighbourhood || '',
              village: addr.village || addr.town || addr.city || '',
            };
            setLocation(newState);
            updateTelemetry({ gpsSuccess: true });
            setMode('confirm');
          } else {
            throw new Error('Could not determine location');
          }
        } catch (err) {
          setError(t.gps_determ_error);
          updateTelemetry({ gpsSuccess: false });
          setTimeout(() => handleModeSelect('dropdown'), 2000);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError(t.gps_denied);
        setLoading(false);
        setTimeout(() => handleModeSelect('dropdown'), 2000);
      }
    );
  };

  const handlePincode = async (code: string) => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    setPincodeOptions([]);

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${code}`);
      const data = await res.json();

      if (data[0].Status === 'Success') {
        const offices: PostOffice[] = Array.isArray(data?.[0]?.PostOffice) ? data[0].PostOffice : [];
        const sortedOffices = sortPostOffices(offices);
        setPincodeOptions(sortedOffices);

        const newApiData: ApiLocationData = {
          states: [],
          districts: {},
          taluks: {},
          villages: {}
        };

        offices.forEach((po: any) => {
          const st = po.State || '';
          const dist = po.District || '';
          const blk = po.Block || 'Others';
          const nm = po.Name || '';

          if (st && !newApiData.states.includes(st)) newApiData.states.push(st);
          if (st && dist) {
            if (!newApiData.districts[st]) newApiData.districts[st] = [];
            if (!newApiData.districts[st].includes(dist)) newApiData.districts[st].push(dist);
          }
          if (dist && blk) {
            if (!newApiData.taluks[dist]) newApiData.taluks[dist] = [];
            if (!newApiData.taluks[dist].includes(blk)) newApiData.taluks[dist].push(blk);
          }
          if (blk && nm) {
            if (!newApiData.villages[blk]) newApiData.villages[blk] = [];
            if (!newApiData.villages[blk].includes(nm)) newApiData.villages[blk].push(nm);
          }
        });

        setApiData(newApiData);
        updateTelemetry({ pincodeSuccess: true });

        if (sortedOffices.length === 1) {
          handleOptionSelect(sortedOffices[0]);
        } else if (sortedOffices.length > 1) {
          setMode('pincode');
        } else {
          setError(t.search_error);
          updateTelemetry({ pincodeSuccess: false });
          setTimeout(() => handleModeSelect('dropdown'), 2000);
        }
      } else {
        setError(t.search_error);
        updateTelemetry({ pincodeSuccess: false });
        setTimeout(() => handleModeSelect('dropdown'), 2000);
      }
    } catch (err) {
      setError(t.search_error);
      updateTelemetry({ pincodeSuccess: false });
      setTimeout(() => handleModeSelect('dropdown'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (postOffice: any) => {
    const block = postOffice.Block && postOffice.Block !== 'NA' ? postOffice.Block : '';
    const division = postOffice.Division && postOffice.Division !== 'NA' ? postOffice.Division : '';
    const newState: LocationData = {
      state: postOffice.State || '',
      district: postOffice.District || '',
      taluk: block || division || '',
      village: postOffice.Name || '',
    };
    setLocation(newState);
    updateTelemetry({ pincodeSuccess: true });
    setMode('confirm');
  };

  const finalize = () => {
    const now = Date.now();
    const duration = now - currentModeStartTime;
    const finalUpdates: Partial<TelemetryData> = {
      finalMethod: mode === 'confirm' ? (telemetry.methodSelected || 'dropdown') : 'dropdown' as LocationMethod,
    };

    if (mode === 'gps') finalUpdates.gpsDuration = (telemetry.gpsDuration || 0) + duration;
    if (mode === 'pincode') finalUpdates.pincodeDuration = (telemetry.pincodeDuration || 0) + duration;
    if (mode === 'dropdown') finalUpdates.manualDuration = (telemetry.manualDuration || 0) + duration;

    updateTelemetry(finalUpdates);
    onNext(location);
  };

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        {mode === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full min-h-0 flex-col px-5 pt-5 pb-4 md:px-8 md:pt-6"
          >
            <button onClick={onBack} className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#572e91]/10 bg-white text-[#572e91] shadow-sm">
              <ChevronLeft size={22} />
            </button>

            <div className="mb-5 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl leading-tight">{t.where_located}</h1>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-4" style={{ scrollbarWidth: 'none' }}>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
                className="space-y-3"
              >
                <MethodCard
                  icon={<MapPin size={24} />}
                  title={t.use_gps}
                  description={t.gps_desc}
                  onClick={() => {
                    handleModeSelect('gps');
                    handleGps();
                  }}
                />
                <MethodCard
                  icon={<Hash size={24} />}
                  title={t.pincode}
                  description={t.pincode_desc}
                  onClick={() => handleModeSelect('pincode')}
                />
                <MethodCard
                  icon={<List size={24} />}
                  title={t.manual}
                  description={t.select_manual_desc}
                  onClick={() => handleModeSelect('dropdown')}
                />
              </motion.div>
            </div>
          </motion.div>
        )}

        {mode === 'gps' && (
          <motion.div
            key="gps"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-1 flex-col items-center justify-center px-4 text-center"
          >
            <div className="relative mb-8">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-[#572e91] blur-2xl"
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#572e91]/10 bg-[#FDFCFB] shadow-xl">
                {loading ? (
                  <Loader2 size={40} className="animate-spin text-[#572e91]" />
                ) : (
                  <AlertCircle size={40} className="text-red-500" />
                )}
              </div>
            </div>
            {loading ? (
              <>
                <h2 className="mb-2 text-2xl font-semibold text-[#1f1630]">{t.gps_fetching}</h2>
                <p className="max-w-[240px] text-sm leading-relaxed text-gray-500">{t.gps_checking}</p>
              </>
            ) : error ? (
              <>
                <h2 className="mb-2 text-xl font-semibold text-red-600">{error}</h2>
                <p className="mt-2 text-gray-500">{t.redirecting}</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-[#572e91]" />
                <p className="text-sm text-gray-500">{t.gps_fetching}</p>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'pincode' && (
          <PincodeView
            key="pincode"
            onBack={() => setMode('select')}
            onPincode={handlePincode}
            onClearResults={() => {
              setPincodeOptions([]);
              setError('');
              setApiData(null);
            }}
            loading={loading}
            error={error}
            language={language}
            options={pincodeOptions}
            onOptionSelect={handleOptionSelect}
          />
        )}

        {mode === 'dropdown' && (
          <DropdownView
            key="dropdown"
            location={location}
            onChange={setLocation}
            onBack={() => setMode('select')}
            onNext={() => setMode('confirm')}
            language={language}
            apiData={apiData}
          />
        )}

        {mode === 'confirm' && (
          <ConfirmLocationView
            key="confirm"
            location={location}
            language={language}
            onEdit={() => {
              updateTelemetry({ numberOfEdits: (telemetry.numberOfEdits || 0) + 1 });
              setMode('dropdown');
            }}
            onConfirm={finalize}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MethodCard({ icon, title, description, onClick, isActive }: { icon: React.ReactNode, title: string, description: string, onClick: () => void, isActive?: boolean }) {
  return (
    <motion.button
      variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
      whileHover={{ y: -1, scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 rounded-[24px] border p-4 text-left transition-all group shadow-sm',
        isActive
          ? 'border-[#572e91]/40 bg-[#faf7ff] shadow-[0_10px_24px_-18px_rgba(87,46,145,0.45)]'
          : 'border-gray-200/60 bg-[#FDFCFB] hover:border-[#572e91]/25 hover:bg-white'
      )}
    >
      <div className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors',
        isActive
          ? 'bg-white text-[#572e91] shadow-sm'
          : 'bg-gray-50 text-gray-400 group-hover:bg-[#f1e9ff] group-hover:text-[#572e91]'
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 font-semibold tracking-tight text-[#1f1630] leading-none">{title}</h3>
        <p className="text-[12px] leading-tight text-gray-500">{description}</p>
      </div>
    </motion.button>
  );
}

function PincodeView({ onBack, onPincode, onClearResults, loading, error, language, options, onOptionSelect }: { key?: string, onBack: () => void, onPincode: (c: string) => void, onClearResults: () => void, loading: boolean, error: string, language: Language, options: any[], onOptionSelect: (opt: any) => void }) {
  const [val, setVal] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const t = translations[language];
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const allNamesToTranslate = Array.from(new Set(options?.flatMap(opt => [opt.Name, opt.District, opt.State]).filter(Boolean) || []));
  const translatedLoc = useTranslatedOptions(allNamesToTranslate, language);

  useEffect(() => {
    setSelectedIndex(0);
  }, [options]);

  const filteredOptions = options ? options.filter(opt =>
    (opt.Name || '').toLowerCase().includes(search.toLowerCase()) ||
    (opt.District || '').toLowerCase().includes(search.toLowerCase())
  ) : [];

  const handleManualSelect = (opt: any, idx: number) => {
    setSelectedIndex(idx);
    onOptionSelect(opt);
  };

  const handleConfirm = () => {
    if (filteredOptions.length > 0) {
      onOptionSelect(filteredOptions[selectedIndex]);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-0 flex-col overflow-hidden px-5 pt-5 pb-0 md:px-8 md:pt-6">
      <div className="shrink-0">
        <button onClick={onBack} className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#572e91]/10 bg-white text-[#572e91] shadow-sm">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl leading-tight">{t.enter_pincode}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{t.pincode_desc}</p>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative mt-5">
          <input
            type="tel"
            maxLength={6}
            placeholder="000000"
            className="w-full rounded-[28px] border border-gray-200/60 bg-[#FDFCFB] p-6 text-center text-4xl font-semibold tracking-[0.18em] text-[#1f1630] outline-none transition-all placeholder:text-gray-200 focus:border-[#572e91]/30 focus:shadow-[0_0_0_4px_rgba(87,46,145,0.06)]"
            value={val}
            ref={inputRef}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setVal(v);
              if (v.length === 6) {
                onPincode(v);
              } else {
                if (options?.length) onClearResults();
              }
            }}
            autoFocus
          />
        </motion.div>

        <AnimatePresence>
          {options && options.length > 0 && !loading && (
            <motion.div
              key="search-bar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-3"
            >
              <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search place"
                  className="w-full rounded-xl border border-gray-200/60 bg-[#FDFCFB] py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-[#572e91]/30"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedIndex(0);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setVal('');
                  setSearch('');
                  setSelectedIndex(0);
                  onClearResults();
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="shrink-0 rounded-xl border border-gray-200/60 bg-[#FDFCFB] px-3 py-3 text-xs font-semibold text-[#572e91] shadow-sm"
              >
                Change
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-3" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-8 text-[#572e91]"
            >
              <Loader2 className="animate-spin" size={28} />
              <span className="text-xs font-semibold uppercase tracking-widest opacity-60">{t.searching}</span>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-500"
            >
              <AlertCircle size={20} />
              <span className="text-sm font-semibold">{error}</span>
            </motion.div>
          ) : options && options.length > 0 ? (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pb-3"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => (
                  <motion.button
                    key={`${opt.Name}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => handleManualSelect(opt, idx)}
                    className={cn(
                      'relative w-full overflow-hidden rounded-[22px] border p-4 text-left transition-all shadow-sm',
                      selectedIndex === idx
                        ? 'border-[#572e91]/40 bg-[#faf7ff] ring-4 ring-[#572e91]/5'
                        : 'border-gray-200/60 bg-[#FDFCFB] hover:border-[#572e91]/20'
                    )}
                  >
                    {idx === 0 && !search && (
                      <div className="absolute right-0 top-0 rounded-bl-xl bg-[#572e91] px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-white">
                        Best Match
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span className={cn('mb-1 block truncate text-lg font-semibold tracking-tight', selectedIndex === idx ? 'text-[#572e91]' : 'text-[#1f1630]')}>
                          {translatedLoc[opt.Name] || opt.Name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(t as any).location_data?.districts?.[opt.District] || translatedLoc[opt.District] || opt.District}, {(t as any).location_data?.states?.[opt.State] || translatedLoc[opt.State] || opt.State}
                        </span>
                      </div>
                      {selectedIndex === idx && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#572e91] text-white">
                          <CheckCircle2 size={14} />
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="py-8 text-center text-sm italic text-gray-400">
                  No results matching your search.
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-gray-100 py-4">
        <button
          onClick={filteredOptions.length > 0 && !loading ? handleConfirm : () => {
            setVal('');
            setSearch('');
            setSelectedIndex(0);
            onClearResults();
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          disabled={!filteredOptions.length && loading}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#572e91] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(87,46,145,0.7)] transition hover:bg-[#452475] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {filteredOptions.length > 0 && !loading ? t.confirm_location : t.enter_pincode}
          {filteredOptions.length > 0 && !loading && <ArrowRight size={18} />}
        </button>
      </div>
    </motion.div>
  );
}

function DropdownView({ location, onChange, onBack, onNext, language, apiData }: { key?: string, location: LocationData, onChange: (l: LocationData) => void, onBack: () => void, onNext: () => void, language: Language, apiData?: ApiLocationData | null }) {
  const t = translations[language];
  const isPincodeEdit = Object.keys(apiData?.villages || {}).length > 0;
  const manualStates = ['Karnataka', 'Bihar'];
  const states = apiData?.states?.length ? apiData.states : manualStates;

  const manualDistrictsForState = location.state && LOCATION_DATA[location.state] ? Object.keys(LOCATION_DATA[location.state]) : [];
  const manualTaluksForDistrict =
    location.state && location.district && LOCATION_DATA[location.state]?.[location.district]
      ? LOCATION_DATA[location.state][location.district]
      : [];

  const districtsForSelectedState = isPincodeEdit
    ? (location.state ? (apiData?.districts?.[location.state] || []) : [])
    : manualDistrictsForState;

  const taluksForSelectedDistrict = isPincodeEdit
    ? (location.district ? (apiData?.taluks?.[location.district] || []) : [])
    : manualTaluksForDistrict;

  const villagesForSelectedTaluk = isPincodeEdit
    ? (location.taluk ? (apiData?.villages?.[location.taluk] || []) : [])
    : [];

  const districtUsesDropdown = districtsForSelectedState.length > 0;
  const talukUsesDropdown = taluksForSelectedDistrict.length > 0;
  const villageUsesDropdown = isPincodeEdit && villagesForSelectedTaluk.length > 0;

  const isFormValid = !!location.state && !!location.district && !!location.taluk && !!location.village;

  const allStringsToTranslate = Array.from(new Set([
    ...states,
    ...districtsForSelectedState,
    ...taluksForSelectedDistrict,
    ...villagesForSelectedTaluk
  ]));
  const translatedLoc = useTranslatedOptions(allStringsToTranslate, language);

  const formItemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-0 flex-col px-5 pt-5 pb-4 md:px-8 md:pt-6">
      <button onClick={onBack} className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#572e91]/10 bg-white text-[#572e91] shadow-sm">
        <ChevronLeft size={22} />
      </button>
      <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl leading-tight">{isPincodeEdit ? t.confirm_location : t.select_manually}</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">{isPincodeEdit ? t.select_village_from_list : t.select_manual_desc}</p>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-1 pt-5" style={{ scrollbarWidth: 'none' }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
          className="space-y-4"
        >
          <motion.div variants={formItemVariants}>
            <SearchableDropdown
              label={t.state}
              icon={<MapPin size={18} />}
              value={location.state}
              onChange={(val) => onChange({ ...location, state: val, district: '', taluk: '', village: '' })}
              options={states}
              placeholder={t.state}
              searchPlaceholder={(t as any).search_placeholder || 'Search'}
              displayValue={(s) => (t as any).location_data?.states?.[s] || translatedLoc[s] || s}
            />
          </motion.div>

          <motion.div variants={formItemVariants}>
            {districtUsesDropdown ? (
              <SearchableDropdown
                label={t.district}
                icon={<MapPin size={18} />}
                value={location.district}
                disabled={!location.state}
                onChange={(val) => onChange({ ...location, district: val, taluk: '', village: '' })}
                options={districtsForSelectedState}
                placeholder={t.district}
                searchPlaceholder={(t as any).search_placeholder || 'Search'}
                displayValue={(d) => (t as any).location_data?.districts?.[d] || translatedLoc[d] || d}
              />
            ) : (
              <div className="space-y-2">
                <label className="block px-1 pb-1 text-xs font-bold uppercase tracking-widest text-[#572e91]/80">{t.district}</label>
                <TranslatingInput
                  className="w-full rounded-2xl border-2 border-gray-200/60 bg-[#FDFCFB] p-4 text-base font-bold text-gray-800 outline-none transition-all focus:border-[#572e91]"
                  placeholder={t.district}
                  value={location.district}
                  language={language}
                  onChange={(val) => onChange({ ...location, district: val, taluk: '', village: '' })}
                  disabled={!location.state}
                />
              </div>
            )}
          </motion.div>

          <motion.div variants={formItemVariants}>
            {talukUsesDropdown ? (
              <SearchableDropdown
                label={t.taluk}
                icon={<MapPin size={18} />}
                value={location.taluk}
                disabled={!location.district}
                onChange={(val) => onChange({ ...location, taluk: val, village: '' })}
                options={taluksForSelectedDistrict}
                placeholder={t.taluk_placeholder}
                searchPlaceholder={(t as any).search_placeholder || 'Search'}
                displayValue={(k) => translatedLoc[k] || k}
              />
            ) : (
              <div className="space-y-2">
                <label className="block px-1 pb-1 text-xs font-bold uppercase tracking-widest text-[#572e91]/80">{t.taluk}</label>
                <TranslatingInput
                  className="w-full rounded-2xl border-2 border-gray-200/60 bg-[#FDFCFB] p-4 text-base font-bold text-gray-800 outline-none transition-all focus:border-[#572e91]"
                  placeholder={t.taluk_placeholder}
                  value={location.taluk}
                  language={language}
                  onChange={(val) => onChange({ ...location, taluk: val, village: '' })}
                  disabled={!location.district}
                />
              </div>
            )}
          </motion.div>

          <motion.div variants={formItemVariants}>
            {villageUsesDropdown ? (
              <SearchableDropdown
                label={t.village}
                icon={<MapPin size={18} />}
                value={location.village}
                disabled={!location.taluk}
                onChange={(val) => onChange({ ...location, village: val })}
                options={villagesForSelectedTaluk}
                placeholder={t.village_placeholder}
                searchPlaceholder={(t as any).search_placeholder || 'Search'}
                displayValue={(v) => translatedLoc[v] || v}
              />
            ) : (
              <div className="space-y-2">
                <label className="block px-1 pb-1 text-xs font-bold uppercase tracking-widest text-[#572e91]/80">{t.village}</label>
                <TranslatingInput
                  className="w-full rounded-2xl border-2 border-gray-200/60 bg-[#FDFCFB] p-4 text-base font-bold text-gray-800 outline-none transition-all focus:border-[#572e91]"
                  placeholder={t.village_placeholder}
                  value={location.village}
                  language={language}
                  onChange={(val) => onChange({ ...location, village: val })}
                  disabled={!location.taluk}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-auto shrink-0 pt-4">
        <button
          onClick={onNext}
          disabled={!isFormValid}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#572e91] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(87,46,145,0.7)] transition hover:bg-[#452475] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {t.confirm_location}
          <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function ConfirmLocationView({ location, onEdit, onConfirm, language }: { key?: string, location: LocationData, onEdit: () => void, onConfirm: () => void, language: Language }) {
  const t = translations[language];
  const allStrings = [location.state, location.district, location.taluk, location.village].filter(Boolean);
  const translatedLoc = useTranslatedOptions(allStrings, language);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col px-5 pt-5 pb-4 md:px-8 md:pt-6">
      <button onClick={onEdit} className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#572e91]/10 bg-white text-[#572e91] shadow-sm">
        <ChevronLeft size={22} />
      </button>
      <h1 className="text-2xl font-semibold tracking-tight text-[#1f1630] md:text-3xl lg:text-4xl leading-tight">{t.is_correct}</h1>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pt-5 pr-1" style={{ scrollbarWidth: 'none' }}>
        <div className="space-y-4">
          {[
            { label: t.state, val: (t as any).location_data?.states?.[location.state] || translatedLoc[location.state] || location.state },
            { label: t.district, val: (t as any).location_data?.districts?.[location.district] || translatedLoc[location.district] || location.district },
            { label: t.taluk, val: translatedLoc[location.taluk] || location.taluk },
            { label: t.village, val: translatedLoc[location.village] || location.village },
          ].map((row) => (
            <div key={row.label} className="rounded-[22px] border border-gray-200/60 bg-[#FDFCFB] p-4 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">{row.label}</p>
              <p className="text-lg font-semibold tracking-tight text-[#572e91]">{row.val || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto shrink-0 pt-4">
        <button
          onClick={onConfirm}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#572e91] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(87,46,145,0.7)]"
        >
          <CheckCircle2 size={20} />
          {t.yes_correct}
        </button>
        <button
          onClick={onEdit}
          className="mt-3 w-full rounded-full border border-[#572e91]/15 bg-white px-5 py-3 text-sm font-semibold text-[#572e91]"
        >
          {t.no_edit}
        </button>
      </div>
    </motion.div>
  );
}
