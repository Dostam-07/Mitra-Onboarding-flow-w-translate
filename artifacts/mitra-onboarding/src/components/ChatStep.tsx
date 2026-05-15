import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  FileDown,
  Loader2,
  User,
  Bot,
  ArrowLeft
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { cn } from '../lib/utils';
import { type Language, translations } from '../translations';
import { type OnboardingState } from '../types';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: number;
}

interface ChatStepProps {
  state: OnboardingState;
  language: Language;
  onBack: () => void;
  onFinish: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ChatStep({ state, language, onBack, onFinish }: ChatStepProps) {
  const t = translations[language];
  const questions = state.flowType === 'discussion' ? (t.chat_questions_discussion as string[]) : (t.chat_questions_improvement as string[]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: questions[0], sender: 'bot', timestamp: Date.now() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (messages.length === 1 && !isMuted) speak(messages[0].text);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'English' ? 'en-US' : language === 'Hindi' ? 'hi-IN' : 'kn-IN';
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  const speak = (text: string) => {
    if (isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'English' ? 'en-US' : language === 'Hindi' ? 'hi-IN' : 'kn-IN';
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), text: inputText, sender: 'user', timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setTimeout(() => {
        const botMessage: Message = { id: (Date.now() + 1).toString(), text: questions[nextIndex], sender: 'bot', timestamp: Date.now() };
        setMessages((prev) => [...prev, botMessage]);
        setCurrentQuestionIndex(nextIndex);
        speak(questions[nextIndex]);
      }, 450);
    } else {
      setIsFinished(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: 'finished', text: t.chat_finished as string, sender: 'bot', timestamp: Date.now() }]);
        speak(t.chat_finished as string);
      }, 450);
    }
  };

  const generatePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF() as any;
      doc.setFontSize(20);
      doc.setTextColor(87, 46, 145);
      doc.text('Mitra Field Report', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('User Profile Details', 20, 35);
      const userInfo = [
        ['Name', state.name],
        ['Phone', state.phone],
        ['Organization', state.organization],
        ['Role', state.role],
        ['Location', `${state.location.village}, ${state.location.district}, ${state.location.state}`]
      ];
      doc.autoTable({ startY: 40, head: [['Field', 'Details']], body: userInfo, theme: 'striped', headStyles: { fillColor: [87, 46, 145] } });
      doc.setFontSize(14);
      doc.text(state.flowType === 'discussion' ? 'Discussion Capture' : 'Improvement Story', 20, doc.lastAutoTable.finalY + 15);
      const chatHistory = messages.filter(m => m.id !== 'finished').reduce((acc: any[], m, i, arr) => {
        if (m.sender === 'user') {
          const question = arr[i - 1]?.text || 'N/A';
          acc.push([question, m.text]);
        }
        return acc;
      }, []);
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 20, head: [['Question', 'Response']], body: chatHistory, theme: 'grid', headStyles: { fillColor: [87, 46, 145] }, columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 90 } } });
      doc.save(`Mitra_Report_${state.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#fdfcfb] to-[#f9f7f4]">
      {/* Header */}
      <div className="border-b border-[#572e91]/8 bg-white/80 backdrop-blur-sm px-4 py-5 md:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#572e91]/15 bg-gradient-to-br from-white to-gray-50 text-[#572e91] transition hover:border-[#572e91]/30 hover:shadow-md">
              <ArrowLeft size={20} />
            </button>
            <div className="space-y-1">
              <h2 className="text-base font-bold tracking-tight text-[#1f1630]">{state.flowType === 'discussion' ? t.capture_discussion : t.share_improvement}</h2>
              <p className="text-xs font-medium text-gray-500">{t.what_to_do_today}</p>
            </div>
          </div>
          <button onClick={() => { setIsMuted(!isMuted); window.speechSynthesis.cancel(); }} className={cn('inline-flex h-12 items-center gap-2 rounded-full px-5 text-xs font-bold uppercase tracking-wider shadow-md transition', isMuted ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-600 hover:shadow-lg' : 'bg-gradient-to-r from-[#f4ebff] to-[#ede4ff] text-[#572e91] hover:shadow-lg')}>
            {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            <span className="hidden sm:inline">{isMuted ? t.unmute : t.mute}</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 md:px-6" style={{ scrollbarWidth: 'none' }}>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 12, scale: 0.96 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                transition={{ type: 'spring', damping: 18, stiffness: 100 }}
                className={cn('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div className={cn('flex max-w-[80%] gap-3 md:max-w-[70%]', msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-md', msg.sender === 'user' ? 'bg-gradient-to-br from-[#572e91] to-[#452475] text-white' : 'bg-gradient-to-br from-[#f1e9ff] to-[#ede4ff] text-[#572e91]')}>
                    {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className={cn('rounded-2xl px-5 py-4 text-[15px] leading-7 shadow-md', msg.sender === 'user' 
                    ? 'rounded-br-md bg-gradient-to-br from-[#572e91] to-[#452475] text-white' 
                    : 'rounded-bl-md border border-[#572e91]/12 bg-white text-[#1f1630] shadow-sm'
                  )}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isFinished && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              transition={{ type: 'spring', damping: 18, stiffness: 90 }}
              className="mt-6 flex flex-col items-center gap-5 rounded-3xl border border-gradient-to-r from-emerald-100 to-emerald-50 bg-gradient-to-br from-emerald-50 to-white px-6 py-10 shadow-lg"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 shadow-lg">
                <FileDown size={32} className="animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-lg font-bold text-[#1f1630]">{t.ready_to_download}</p>
                <p className="text-sm text-gray-500">{t.download_msg || 'Your report is ready. Download it now.'}</p>
              </div>
              <button 
                onClick={generatePdf} 
                disabled={isGeneratingPdf} 
                className="inline-flex h-13 items-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
              >
                {isGeneratingPdf ? <Loader2 size={19} className="animate-spin" /> : <FileDown size={19} />}
                {isGeneratingPdf ? t.generating_pdf : t.download_pdf}
              </button>
              <button 
                onClick={onFinish} 
                className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 transition hover:text-gray-600"
              >
                {t.register_another}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      {!isFinished && (
        <div className="border-t border-[#572e91]/8 bg-gradient-to-t from-[#faf7ff] to-white px-4 py-5 md:px-6">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3 rounded-2xl border border-[#572e91]/15 bg-white p-2 pl-3 shadow-lg transition focus-within:ring-4 focus-within:ring-[#572e91]/15 focus-within:shadow-xl">
            <button 
              onClick={toggleListening} 
              className={cn('inline-flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full transition shadow-md', 
                isListening 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse hover:from-red-600 hover:to-red-700' 
                  : 'bg-gradient-to-r from-[#f1e9ff] to-[#ede4ff] text-[#572e91] hover:from-[#e8dcff] hover:to-[#ddd0ff]'
              )}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input 
              type="text" 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
              placeholder={isListening ? 'Listening…' : (t.type_message as string)} 
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-base font-medium text-[#1f1630] outline-none placeholder:text-gray-400 placeholder:font-medium" 
              autoComplete="off"
            />
            <button 
              onClick={handleSendMessage} 
              disabled={!inputText.trim()} 
              className={cn('inline-flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full transition shadow-md', 
                inputText.trim() 
                  ? 'bg-gradient-to-r from-[#572e91] to-[#452475] text-white hover:from-[#452475] hover:to-[#342060]' 
                  : 'bg-gray-200 text-gray-400'
              )}
              title="Send message"
            >
              <Send size={20} />
            </button>
          </div>
          {isListening && <p className="mt-2 text-center text-xs font-medium text-red-500 animate-pulse">{t.listening || 'Listening...'}</p>}
        </div>
      )}
    </div>
  );
}
