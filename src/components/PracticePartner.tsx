
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, Loader2, User, Bot, Mic, MicOff, ChevronRight } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { Language } from '../types';

type PracticeLevel = 'Easy' | 'Medium' | 'Hard' | 'EasyToHard';

interface Props {
  word: string;
  meaning: string;
  language: Language;
  onClose: () => void;
  onComplete?: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const gemini = new GeminiService();

export const PracticePartner: React.FC<Props> = ({ word, meaning, language, onClose, onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sentencesCount, setSentencesCount] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<PracticeLevel | null>(null);
  const [showLevelSelector, setShowLevelSelector] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const startSession = async (level: PracticeLevel) => {
    setIsLoading(true);
    try {
      const responseText = await gemini.getPracticeResponse(word, meaning, language, [], level, 0);
      if (responseText) {
        try {
          const data = JSON.parse(responseText);
          setMessages([{ role: 'model', text: data.feedback }]);
        } catch (e) {
          setMessages([{ role: 'model', text: responseText }]);
        }
      }
    } catch (error) {
      console.error("Practice session error:", error);
      setMessages([{ role: 'model', text: "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelSelect = (level: PracticeLevel) => {
    setSelectedLevel(level);
    setShowLevelSelector(false);
    startSession(level);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // Auto-focus input when not loading and level is selected, but not on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isLoading && selectedLevel && !showLevelSelector && sentencesCount < 5 && !isMobile) {
      inputRef.current?.focus();
    }
  }, [messages, isLoading, showLevelSelector]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || sentencesCount >= 5) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const history = newMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await gemini.getPracticeResponse(word, meaning, language, history, selectedLevel || 'Easy', sentencesCount);
      if (responseText) {
        try {
          const data = JSON.parse(responseText);
          setMessages(prev => [...prev, { role: 'model', text: data.feedback }]);
          
          if (data.isCorrect) {
            setSentencesCount(prev => Math.min(5, prev + 1));
          }
        } catch (e) {
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
          setSentencesCount(prev => Math.min(5, prev + 1));
        }
      }
    } catch (error) {
      console.error("Practice message error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gray-50 dark:bg-slate-950 flex flex-col"
    >
      <AnimatePresence>
        {showLevelSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 custom-scrollbar"
            >
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent/10 dark:bg-accent/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Sparkles className="text-accent" size={32} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 sm:mb-4">
                  Choose Practice Level
                </h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
                  Select the complexity of sentences you want to practice with <span className="text-accent font-bold">{word}</span>.
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4">
                {[
                  { 
                    id: 'Easy' as PracticeLevel, 
                    title: 'Easy', 
                    desc: 'Simple sentences (Subject + Verb + Object).',
                    example: 'The cat sits on the mat.'
                  },
                  { 
                    id: 'Medium' as PracticeLevel, 
                    title: 'Medium', 
                    desc: 'Compound sentences using "and," "but," or "or."',
                    example: 'The cat sits on the mat, but the dog is outside.'
                  },
                  { 
                    id: 'Hard' as PracticeLevel, 
                    title: 'Hard', 
                    desc: 'Complex sentences with relative clauses or passive voice.',
                    example: 'Although it was raining, the cat remained on the mat that was placed near the fire.'
                  },
                  { 
                    id: 'EasyToHard' as PracticeLevel, 
                    title: 'Easy to Hard', 
                    desc: 'Starts easy and gets harder with each sentence.',
                    example: 'Progression from simple to complex structures.'
                  }
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => handleLevelSelect(level.id)}
                    className="group relative p-4 sm:p-6 bg-gray-50 dark:bg-white/5 hover:bg-accent/10 dark:hover:bg-accent/20 rounded-2xl sm:rounded-3xl border-2 border-transparent hover:border-accent transition-all text-left overflow-hidden"
                  >
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white group-hover:text-accent transition-colors">
                          {level.title}
                        </span>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-primary flex items-center justify-center shadow-sm group-hover:bg-accent group-hover:text-white transition-all">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">
                        {level.desc}
                      </p>
                      <p className="text-[10px] sm:text-xs font-medium text-accent/60 dark:text-accent/60 italic">
                        e.g. "{level.example}"
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="mt-6 sm:mt-8 w-full py-3 sm:py-4 text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-accent" size={20} />
                Practice Partner
                {selectedLevel && (
                  <span className="ml-2 px-3 py-1 bg-accent/10 dark:bg-accent/20 text-accent text-[10px] font-black uppercase tracking-widest rounded-full">
                    {selectedLevel === 'EasyToHard' ? 'Easy to Hard' : selectedLevel}
                  </span>
                )}
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Word: <span className="text-accent">{word}</span> • {sentencesCount}/5 sentences
              </p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div 
                key={step}
                className={`w-8 h-2 rounded-full transition-all duration-500 ${
                  step <= sentencesCount ? 'bg-accent' : 'bg-gray-200 dark:bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 overflow-y-auto space-y-6 custom-scrollbar"
      >
        {messages.map((m, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              m.role === 'user' ? 'bg-primary text-white' : 'bg-accent text-white'
            }`}>
              {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className={`max-w-[85%] sm:max-w-[70%] p-5 rounded-3xl text-base font-medium leading-relaxed shadow-sm ${
              m.role === 'user' 
                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-tr-none border border-gray-100 dark:border-slate-800' 
                : 'bg-accent/5 dark:bg-accent/10 text-primary dark:text-neutral rounded-tl-none border border-accent/10 dark:border-white/10'
            }`}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-widest px-14">
            <Loader2 size={16} className="animate-spin" />
            AI is thinking...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-4 sm:p-8 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto">
          <div className="relative flex items-center gap-4">
            <div className="relative flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <input 
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || sentencesCount >= 5}
                  placeholder={sentencesCount >= 5 ? "Mashg'ulot yakunlandi!" : "Write your sentence in English..."}
                  className="w-full pl-6 pr-14 py-4 bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-accent rounded-[2rem] outline-none transition-all font-bold text-gray-900 dark:text-white disabled:opacity-50 shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading || sentencesCount >= 5}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center hover:bg-accent-hover transition-all disabled:opacity-50 disabled:scale-90 shadow-lg shadow-accent/20 dark:shadow-none"
                >
                  <Send size={20} />
                </button>
              </div>

              {recognitionRef.current && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading || sentencesCount >= 5}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-accent/10 dark:bg-white/5 text-accent dark:text-accent hover:bg-accent/20'
                  }`}
                >
                  {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
              )}
            </div>
            
            {sentencesCount >= 5 && (
              <button 
                type="button"
                onClick={() => {
                  if (onComplete) onComplete();
                  onClose();
                }}
                className="px-8 py-4 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none active:scale-95"
              >
                Finish
              </button>
            )}
          </div>
          <p className="mt-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            {sentencesCount < 5 ? `Step ${sentencesCount + 1} of 5` : "Challenge Complete!"}
          </p>
        </form>
      </div>
    </motion.div>
  );
};
