import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchableDropdownProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (val: string) => void;
  displayValue?: (val: string) => string;
  disabled?: boolean;
  icon?: React.ReactNode;
  searchPlaceholder?: string;
}

export function SearchableDropdown({ label, value, options, placeholder, onChange, displayValue, disabled, icon, searchPlaceholder = 'Search' }: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt =>
    (displayValue ? displayValue(opt) : opt).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="block px-1 pb-1 text-xs font-bold uppercase tracking-widest text-[#572e91]/80">{label}</label>
      <div className="relative">
        {icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${disabled ? 'text-gray-300' : 'text-gray-400'}`}>
            {icon}
          </div>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-14 pr-12 text-left border-2 rounded-2xl font-bold flex items-center shadow-sm transition-all focus:outline-none ${
            disabled
              ? 'bg-[#FDFCFB] border-gray-200/60 text-gray-400 cursor-not-allowed opacity-60'
              : 'bg-[#FDFCFB] border-gray-200/60 text-gray-800 hover:border-gray-200 focus:border-[#572e91]'
          } ${icon ? 'pl-12' : 'pl-5'}`}
        >
          {value ? (displayValue ? displayValue(value) : value) : <span className="text-gray-400 font-normal">{placeholder}</span>}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            <ChevronDown size={20} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-50 w-full mt-2 bg-[#FDFCFB] rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden"
            >
              <div className="p-2 border-b border-gray-200/40 flex items-center gap-2">
                <Search size={16} className="text-gray-400 ml-2" />
                <input
                  type="text"
                  className="w-full p-2 text-sm outline-none font-medium bg-transparent"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto p-2" style={{ scrollbarWidth: 'none' }}>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                        opt === value
                          ? 'bg-[#572e91] text-white'
                          : 'text-gray-700 hover:bg-white/70'
                      }`}
                    >
                      {displayValue ? displayValue(opt) : opt}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-gray-500 text-center font-medium">
                    No matches. Try a different search.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
