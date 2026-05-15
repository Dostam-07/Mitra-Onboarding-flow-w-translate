import React, { useState, useEffect, useRef } from 'react';
import { translateText } from '../lib/translate';
import { Loader2, Languages, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { type Language } from '../translations';

interface TranslatingInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (val: string) => void;
  language: Language;
}

export function TranslatingInput({ value, onChange, language, className, ...props }: TranslatingInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [translatedValue, setTranslatedValue] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // If external value changes and we aren't translating, sync it
    if (!isFocused && value !== translatedValue && !isListening) {
      setLocalValue(value);
      setTranslatedValue('');
    }
  }, [value, isFocused, isListening]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      
      // Map language to speech recognition lang
      recognition.lang = language === 'Hindi' ? 'hi-IN' : language === 'Kannada' ? 'kn-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const currentTranscript = finalTranscript || interimTranscript;
        setLocalValue(currentTranscript);
        // We do not call onChange here immediately if interim, let the debounce handle it
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setLocalValue(''); // Clear input when starting to listen
      recognitionRef.current?.start();
      setIsListening(true);
      // Focus the input when listening
      document.getElementById(props.id || '')?.focus();
    }
  };

  useEffect(() => {
    if (language === 'English' || !localValue.trim()) {
      setTranslatedValue('');
      onChange(localValue);
      return;
    }

    setIsTranslating(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await translateText(localValue.trim(), language);
        setTranslatedValue(result);
        onChange(result); // Submit the translated value to parent
      } catch (err) {
        console.error('Failed to translate', err);
        setTranslatedValue(localValue);
        onChange(localValue);
      } finally {
        setIsTranslating(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localValue, language]);

  return (
    <div className="w-full relative">
      <div className="relative">
        <input
          {...props}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            "w-full rounded-2xl border-2 border-gray-200/60 bg-[#FDFCFB] p-4 text-base font-bold text-gray-800 outline-none transition-all focus:border-[#572e91]",
            "pr-12", // Make room for icons
            className
          )}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isTranslating ? (
            <Loader2 size={18} className="animate-spin text-[#572e91]" />
          ) : (
            <>
              {language !== 'English' && <Languages size={18} className={localValue ? 'text-[#572e91]' : 'text-gray-300'} />}
              {recognitionRef.current && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isListening ? "bg-red-100 text-red-500 animate-pulse" : "text-gray-400 hover:bg-gray-100 hover:text-[#572e91]"
                  )}
                >
                  {isListening ? <Mic size={18} /> : <Mic size={18} />}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {language !== 'English' && localValue && translatedValue && translatedValue !== localValue && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            className="overflow-hidden mt-2"
          >
            <div className="rounded-xl border border-[#572e91]/20 bg-[#f1e9ff] p-3 flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#572e91]/70">
                Translated ({language})
              </span>
              <span className="text-lg font-semibold text-[#572e91]">
                {translatedValue}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
