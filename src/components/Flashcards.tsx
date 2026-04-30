
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SavedMnemonic, Language } from '../types';
import { Shuffle, Flag, ChevronLeft, ChevronRight, X, CheckCircle, Volume2, Sparkles, Download } from 'lucide-react';
import { MnemonicCard } from './MnemonicCard';
import { motion, AnimatePresence } from 'motion/react';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { GeminiService } from '../services/geminiService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MNEMONIX_LOGO_BASE64 } from '../../logos';

const gemini = new GeminiService();

interface Props {
  savedMnemonics: SavedMnemonic[];
  language: Language;
  onToggleHard: (id: string, isHard: boolean) => void;
  onToggleMastered: (id: string, isMastered: boolean) => void;
  onDetailChange?: (isOpen: boolean) => void;
  onReviewChange?: (isReviewing: boolean) => void;
  onPractice?: (word: string, meaning: string) => void;
  onWordSelect?: (word: SavedMnemonic | null) => void;
  onSearchWord?: (word: string) => void;
  forceCloseDetail?: boolean;
  forceCloseReview?: boolean;
  t: any;
  fullT: any;
}

export const Flashcards = React.memo(({ 
  savedMnemonics, 
  language, 
  onToggleHard, 
  onToggleMastered, 
  onDetailChange, 
  onReviewChange, 
  onPractice,
  onWordSelect,
  onSearchWord,
  forceCloseDetail, 
  forceCloseReview,
  t,
  fullT
}: Props) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const backSideRef = React.useRef<HTMLDivElement>(null);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [selectedWord, setSelectedWord] = useState<SavedMnemonic | null>(null);
  const [localHard, setLocalHard] = useState<Record<string, boolean>>({});
  const [localMastered, setLocalMastered] = useState<Record<string, boolean>>({});
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const sourceRef = React.useRef<AudioBufferSourceNode | null>(null);
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const handlePlayAudio = async (text: string) => {
    if (isPlaying) {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
      }
      setIsPlaying(false);
      return;
    }

    setIsAudioLoading(true);
    try {
      let audioBuffer: AudioBuffer | null = null;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Check if we have a saved audio URL for this word
      // In Flashcards, we usually play either the word or the whole story
      const isStory = text.includes('.');
      const currentMnemonic = filtered[shuffledIndices[currentIndex]];
      
      // Only use saved audio if it's the main story and it matches the current card
      const audioUrl = currentMnemonic?.data?.audioUrl || currentMnemonic?.audio_url;
      if (isStory && currentMnemonic && audioUrl) {
        try {
          const response = await fetch(audioUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Try standard decoder first
            try {
              audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer.slice(0));
            } catch (e) {
              // Fallback to custom PCM decoder
              audioBuffer = await decodeAudioData(uint8Array, audioContextRef.current, 24000, 1);
            }
          }
        } catch (fetchError) {
          console.warn("Stored audio failed in Flashcards, falling back to live TTS:", fetchError);
        }
      }

      if (!audioBuffer) {
        const base64Audio = await gemini.generateTTS(text, language);
        if (!base64Audio) throw new Error("No audio data");

        const decodedData = decode(base64Audio);
        
        // Try standard decoder first
        try {
          const arrayBuffer = decodedData.buffer;
          audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer.slice(0));
        } catch (e) {
          // Fallback to custom PCM decoder
          audioBuffer = await decodeAudioData(decodedData, audioContextRef.current, 24000, 1);
        }
      }

      if (!audioBuffer) throw new Error("Failed to decode audio");

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        if (isMounted.current) setIsPlaying(false);
      };
      
      sourceRef.current = source;
      source.start(0);
      if (isMounted.current) setIsPlaying(true);
    } catch (error) {
      console.error("Audio error:", error);
    } finally {
      if (isMounted.current) setIsAudioLoading(false);
    }
  };

  useEffect(() => {
    if (forceCloseDetail) {
      setSelectedWord(null);
    }
  }, [forceCloseDetail]);

  useEffect(() => {
    if (forceCloseReview) {
      setIsStarted(false);
    }
  }, [forceCloseReview]);

  useEffect(() => {
    onReviewChange?.(isStarted);
  }, [isStarted, onReviewChange]);

  useEffect(() => {
    onDetailChange?.(!!selectedWord);
    onWordSelect?.(selectedWord);
  }, [selectedWord, onDetailChange, onWordSelect]);

  const filtered = useMemo(() => {
    return savedMnemonics.filter(m => {
      const ts = new Date(m.timestamp);
      ts.setHours(0,0,0,0);
      const from = dateFrom ? new Date(dateFrom) : null;
      if (from) from.setHours(0,0,0,0);
      const to = dateTo ? new Date(dateTo) : null;
      if (to) to.setHours(23,59,59,999);

      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });
  }, [savedMnemonics, dateFrom, dateTo]);

  useEffect(() => {
    if (isStarted && filtered.length > 0 && shuffledIndices.length > 0) {
      onWordSelect?.(filtered[shuffledIndices[currentIndex]]);
    } else if (!isStarted) {
      onWordSelect?.(selectedWord);
    }
  }, [isStarted, currentIndex, shuffledIndices, filtered, onWordSelect, selectedWord]);

  // Initialize shuffled indices when starting or shuffling
  useEffect(() => {
    if (filtered.length > 0) {
      setShuffledIndices(filtered.map((_, i) => i));
    }
  }, [filtered]);

  const handleShuffle = () => {
    const indices = [...shuffledIndices];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);
    setCurrentIndex(0);
  };

  const groupWordsByDate = (words: SavedMnemonic[]) => {
    const groups: { [key: string]: SavedMnemonic[] } = {};
    words.forEach(w => {
      const date = new Date(w.timestamp).toLocaleDateString('en-GB'); // dd/mm/yyyy
      if (!groups[date]) groups[date] = [];
      groups[date].push(w);
    });
    // Sort keys descending (newest first)
    const sortedDates = Object.keys(groups).sort((a, b) => {
      const [ad, am, ay] = a.split('/').map(Number);
      const [bd, bm, by] = b.split('/').map(Number);
      return new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime();
    });
    return { groups, sortedDates };
  };

  const normalizeText = useCallback((text: string) => {
    if (!text) return "";
    // Replace non-ASCII characters that cause garbage in jsPDF with standard fonts
    return text
      .replace(/ʻ/g, "'")
      .replace(/ʼ/g, "'")
      .replace(/‘/g, "'")
      .replace(/’/g, "'")
      .replace(/“/g, '"')
      .replace(/”/g, '"')
      .replace(/–/g, "-")
      .replace(/—/g, "-")
      .replace(/[^\x00-\x7F]/g, (char) => {
        // Map common accented characters to ASCII
        const accents: Record<string, string> = {
          'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
          'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
          'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
          'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
          'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
          'ñ': 'n', 'ç': 'c', 'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
          'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
          'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
          'Ñ': 'N', 'Ç': 'C'
        };
        return accents[char] || "?";
      });
  }, []);

  const handleDownloadPDF = useCallback(() => {
    const doc = new jsPDF();
    const { groups, sortedDates } = groupWordsByDate(filtered);

    // Draw Logo (Indigo square with white M) - Manual drawing as requested
    doc.setFillColor(230, 126, 34); // Accent
    doc.roundedRect(20, 12, 15, 15, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("M", 27.5, 22.5, { align: "center" });

    // Add Title
    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("Mnemonix", 40, 23);

    let yPos = 40;

    sortedDates.forEach(date => {
      const words = groups[date];
      
      // Check if we need a new page for the header
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(date, 20, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      const tableData = words.map((w, i) => [
        (i + 1).toString(),
        normalizeText(w.word),
        normalizeText(w.data.meaning)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[ '#', fullT.wordHeader, fullT.meaningHeader]],
        body: tableData,
        theme: 'striped',
        styles: {
          fontSize: 12,
          cellPadding: 5,
          font: 'helvetica',
          textColor: [30, 30, 30],
        },
        headStyles: {
          fillColor: [230, 126, 34],
          textColor: [255, 255, 255],
          fontSize: 13,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 75, fontStyle: 'bold' },
          2: { cellWidth: 80 },
        },
        margin: { left: 20, right: 20 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    });

    const startStr = dateFrom || 'start';
    const endStr = dateTo || 'end';
    doc.save(`words-${startStr}-${endStr}.pdf`);
  }, [filtered, t, dateFrom, dateTo, normalizeText]);

  // Reset flip state when moving to a new card
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  // Pre-load images for next cards to ensure instant display
  useEffect(() => {
    if (isStarted && filtered.length > 0 && shuffledIndices.length > 0) {
      // Pre-load next 3 cards
      for (let i = 1; i <= 3; i++) {
        const nextIdx = (currentIndex + i) % filtered.length;
        const mnemonic = filtered[shuffledIndices[nextIdx]];
        if (mnemonic?.imageUrl) {
          const img = new Image();
          img.src = mnemonic.imageUrl;
        }
      }
    }
  }, [isStarted, currentIndex, shuffledIndices, filtered]);

  // Scroll back side to top when flipped
  useEffect(() => {
    if (isFlipped && backSideRef.current) {
      backSideRef.current.scrollTop = 0;
    }
  }, [isFlipped]);

  const getFontSize = (word: string) => {
    if (word.length > 15) return 'text-2xl sm:text-4xl';
    if (word.length > 10) return 'text-3xl sm:text-5xl';
    return 'text-5xl sm:text-6xl';
  };

  if (savedMnemonics.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-6">
        <div className="text-8xl float-anim">📭</div>
        <div className="space-y-2">
          <p className="text-2xl font-black text-gray-800 dark:text-gray-200">{t.empty}</p>
          <p className="text-gray-400">{t.emptySub}</p>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    if (selectedWord) {
      return (
        <div className="max-w-4xl mx-auto animate-fadeIn mt-4 px-2 sm:px-4 pb-24">
          <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] p-4 sm:p-12 shadow-2xl border border-gray-100 dark:border-slate-900 relative">
            {/* Back Button */}
            <button 
              onClick={() => setSelectedWord(null)}
              className="absolute top-6 left-6 sm:top-8 sm:left-8 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-50 dark:bg-primary border border-gray-100 dark:border-white/10 rounded-2xl text-gray-500 dark:text-gray-400 hover:text-accent dark:hover:text-accent transition-all shadow-sm z-10"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="pt-12 sm:pt-0">
              <MnemonicCard 
                data={selectedWord.data} 
                imageUrl={selectedWord.imageUrl} 
                language={language} 
                mnemonicId={selectedWord.mnemonicId}
                onSearch={onSearchWord}
                onPractice={onPractice}
                t={fullT}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto animate-fadeIn mt-8 sm:mt-12 px-4 space-y-6 sm:space-y-8">
        {/* Main Setup Container */}
        <div className="bg-white dark:bg-[#0f172a] p-8 sm:p-16 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 dark:border-slate-800 text-center space-y-8 sm:space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tight">{t.title}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl font-medium">{t.range}</p>
          </div>

          {/* Date Range inside Main Container */}
          <div className="grid grid-cols-2 gap-3 sm:gap-8">
            <div className="space-y-2 sm:space-y-3">
              <span className="block text-[8px] sm:text-[10px] font-black uppercase text-gray-500 tracking-widest ml-2 sm:ml-4">{t.from}</span>
              <div className="relative group">
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={e => setDateFrom(e.target.value)} 
                  className="date-input w-full pl-2 pr-1 sm:px-8 py-3 sm:py-6 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent rounded-xl sm:rounded-[2rem] outline-none focus:border-accent font-black text-gray-900 dark:text-white transition-all text-[10px] sm:text-lg" 
                />
                <div className="sm:hidden absolute inset-0 flex items-center pl-2 pointer-events-none opacity-40">
                  {!dateFrom && <span className="text-[10px] font-bold">mm/dd/yyyy</span>}
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <span className="block text-[8px] sm:text-[10px] font-black uppercase text-gray-500 tracking-widest ml-2 sm:ml-4">{t.to}</span>
              <div className="relative group">
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={e => setDateTo(e.target.value)} 
                  className="date-input w-full pl-2 pr-1 sm:px-8 py-3 sm:py-6 bg-gray-50 dark:bg-slate-800/50 border-2 border-transparent rounded-xl sm:rounded-[2rem] outline-none focus:border-accent font-black text-gray-900 dark:text-white transition-all text-[10px] sm:text-lg" 
                />
                <div className="sm:hidden absolute inset-0 flex items-center pl-2 pointer-events-none opacity-40">
                  {!dateTo && <span className="text-[10px] font-bold">mm/dd/yyyy</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-8">
            <button 
              disabled={filtered.length === 0}
              onClick={() => setIsStarted(true)}
              className="w-full py-6 sm:py-8 bg-accent hover:bg-accent-hover disabled:bg-slate-800 text-white rounded-2xl sm:rounded-[2rem] font-black text-xl sm:text-3xl shadow-2xl shadow-accent/20 transition-all active:scale-95 transform hover:-translate-y-1"
            >
              {t.start} <span className="opacity-50 ml-2">({filtered.length})</span>
            </button>

            <button 
              disabled={filtered.length === 0}
              onClick={handleDownloadPDF}
              className="w-full py-6 sm:py-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white rounded-2xl sm:rounded-[2rem] font-black text-xl sm:text-3xl shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              <Download size={24} />
              {t.download}
            </button>
          </div>
        </div>

        {/* Hard Words Container */}
        {filtered.filter(m => m.isHard).length > 0 && (
          <div className="bg-white dark:bg-[#0f172a] p-6 sm:p-10 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 space-y-6">
            <div className="flex items-center gap-2 text-gray-400 px-2">
              <Flag size={14} className="text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t.hardWords}</span>
            </div>
            <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {filtered
                .filter(m => m.isHard)
                .map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setSelectedWord(m)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/30 border border-gray-100 dark:border-slate-800 rounded-2xl group hover:border-red-500/30 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 dark:border-slate-700">
                      <img src={m.imageUrl} className="w-full h-full object-cover" alt={m.word} referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-gray-900 dark:text-white font-black text-lg leading-tight">{m.word}</h4>
                      <p className="text-gray-500 font-mono text-xs">[{m.data.transcription}]</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-gray-600 group-hover:text-red-500 transition-colors">
                        <Flag size={16} fill="currentColor" />
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const current = filtered[shuffledIndices[currentIndex]];
  const isHard = localHard[current.id] !== undefined ? localHard[current.id] : current.isHard;
  const isMastered = localMastered[current.id] !== undefined ? localMastered[current.id] : current.isMastered;

  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn mt-4 px-4">
      <div 
        className="relative aspect-[4/5] sm:aspect-[4/4] lg:aspect-[4/3] perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front Side */}
          <div className="absolute inset-0 backface-hidden bg-white dark:bg-[#0f172a] rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-4 border-gray-100 dark:border-slate-800">
            <img 
              key={current.id}
              src={current.imageUrl} 
              className="absolute inset-0 w-full h-full object-cover opacity-60" 
              alt="Word Visual" 
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-8 sm:p-10">
              <h3 className={`${getFontSize(current.word)} font-black text-white tracking-tight drop-shadow-lg`}>{current.word}</h3>
              <p className="text-white/70 font-mono mt-2 text-lg sm:text-xl drop-shadow-md">[{current.data.transcription}]</p>
            </div>
            
            <div className="absolute top-6 right-6 sm:top-8 right-8 bg-white/10 backdrop-blur-xl px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-white/60 text-[10px] sm:text-xs font-black tracking-widest border border-white/5">
              {currentIndex + 1} / {filtered.length}
            </div>
          </div>

          {/* Back Side */}
          <div 
            ref={backSideRef}
            className="absolute inset-0 backface-hidden rotate-y-180 bg-accent rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col justify-start text-center shadow-2xl border-4 border-accent-hover overflow-y-auto custom-scrollbar"
          >
            {/* Decorative Top Bar (White Line) */}
            <div className="w-20 h-2 bg-white/30 rounded-full mx-auto mb-8 flex-shrink-0" />
            
            <div className="space-y-6 sm:space-y-10">
              <div className="space-y-1 sm:space-y-2 relative">
                <span className="text-neutral/60 text-[10px] font-black uppercase tracking-[0.2em]">{t.word}</span>
                <div className="flex items-center justify-center gap-4">
                  <h3 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">{current.word}</h3>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayAudio(current.word);
                    }}
                    disabled={isAudioLoading}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'
                    } disabled:opacity-50`}
                  >
                    {isAudioLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                    ) : (
                      <Volume2 size={20} />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <span className="text-neutral/60 text-[10px] font-black uppercase tracking-[0.2em]">{t.meaning}</span>
                <p className="text-white font-black text-2xl sm:text-3xl px-2">{current.data.meaning}</p>
              </div>

              <div className="space-y-1 sm:space-y-2">
                 <span className="text-neutral/60 text-[10px] font-black uppercase tracking-[0.2em]">{t.mnemonicLink}</span>
                 <p className="text-neutral font-bold text-sm sm:text-base px-2">{current.data.phoneticLink}</p>
              </div>

              <div className="space-y-3 sm:space-y-4 bg-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-md border border-white/10">
                <span className="text-neutral/60 text-[10px] font-black uppercase tracking-[0.2em]">{t.imagination}</span>
                <p className="text-white/90 text-base sm:text-lg italic leading-relaxed">{current.data.imagination}</p>
              </div>

              {current.data.synonyms && current.data.synonyms.length > 0 && (
                <div className="space-y-1 sm:space-y-2">
                  <span className="text-neutral/60 text-[10px] font-black uppercase tracking-[0.2em]">{t.synonyms}</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {current.data.synonyms.map((syn, idx) => (
                      <button 
                        key={idx} 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSearchWord) {
                            const word = syn.split('(')[0].trim();
                            onSearchWord(word);
                          }
                        }}
                        className="px-2 py-0.5 bg-white/10 rounded-lg text-xs font-medium text-white/90 hover:bg-white/20 transition-colors"
                      >
                        {syn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const ttsText = `${current.word}. ${current.data.meaning}. ${current.data.phoneticLink}. ${current.data.imagination}. ${current.data.connectorSentence}`;
                    handlePlayAudio(ttsText);
                  }}
                  disabled={isAudioLoading}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all ${
                    isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'
                  } disabled:opacity-50`}
                >
                  {isAudioLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  ) : (
                    <>
                      <Volume2 size={20} />
                      <span className="font-black uppercase tracking-widest text-xs">
                        {t.listenStory}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={handleShuffle}
          className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-white rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95 flex-shrink-0"
          title={fullT.shuffle}
        >
          <Shuffle size={20} className="sm:size-6" />
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={() => {
              const newVal = !isHard;
              setLocalHard(prev => ({ ...prev, [current.id]: newVal }));
              onToggleHard(current.id, newVal);
            }}
            className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl transition-all ${
              isHard ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-red-500'
            }`}
            title={fullT.markHard}
          >
            <Flag size={20} fill={isHard ? "currentColor" : "none"} />
          </button>

          <button 
            onClick={() => {
              const newVal = !isMastered;
              setLocalMastered(prev => ({ ...prev, [current.id]: newVal }));
              onToggleMastered(current.id, newVal);
            }}
            className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl transition-all ${
              isMastered ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-emerald-500'
            }`}
            title={fullT.markMastered}
          >
            <CheckCircle size={20} fill={isMastered ? "currentColor" : "none"} />
          </button>
        </div>

        <button 
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          className="flex-1 py-3 sm:py-5 bg-gray-100 dark:bg-white/10 text-accent dark:text-accent rounded-2xl font-black transition-all disabled:opacity-30 active:scale-95 text-sm sm:text-lg"
          disabled={currentIndex === 0}
        >
          {t.prev}
        </button>

        <button 
          onClick={() => {
            if (currentIndex < filtered.length - 1) {
              setCurrentIndex(prev => prev + 1);
            } else {
              setIsStarted(false);
              setCurrentIndex(0);
            }
          }}
          className="flex-[1.5] py-3 sm:py-5 bg-accent text-white rounded-2xl font-black shadow-xl shadow-accent/20 transition-all active:scale-95 text-sm sm:text-lg"
        >
          {currentIndex === filtered.length - 1 ? t.finish : t.next}
        </button>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .date-input::-webkit-calendar-picker-indicator {
          filter: invert(var(--date-icon-invert, 0));
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .date-input::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
        .dark .date-input {
          --date-icon-invert: 1;
          color-scheme: dark;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Pre-load next images for instant display */}
      <div className="hidden" aria-hidden="true">
        {isStarted && filtered.length > 0 && shuffledIndices.length > 0 && [1, 2, 3].map(i => {
          const nextIdx = (currentIndex + i) % filtered.length;
          const mnemonic = filtered[shuffledIndices[nextIdx]];
          return mnemonic?.imageUrl ? (
            <img key={mnemonic.id} src={mnemonic.imageUrl} referrerPolicy="no-referrer" />
          ) : null;
        })}
      </div>
    </div>
  );
});