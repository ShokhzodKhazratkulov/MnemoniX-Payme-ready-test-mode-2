
import React, { useEffect, useState, useRef } from 'react';
import { MnemonicResponse, Language, NuanceData } from '../types';
import { GeminiService } from '../services/geminiService';
import { Sparkles, Volume2, Eye, Loader2, ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from '../supabaseClient';

interface Props {
  data: MnemonicResponse;
  imageUrl: string;
  language: Language;
  mnemonicId?: string; // Added to allow saving nuance data back
  onSearch?: (word: string) => void;
  onPractice?: (word: string, meaning: string) => void;
  t: any;
}

const gemini = new GeminiService();

export const MnemonicCard: React.FC<Props> = ({ data, imageUrl, language, mnemonicId, onSearch, onPractice, t }) => {
  const [timer, setTimer] = useState(5);
  const [showContent, setShowContent] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isImageRevealed, setIsImageRevealed] = useState(false);
  const [isNuanceOpen, setIsNuanceOpen] = useState(false);
  const [isGeneratingNuance, setIsGeneratingNuance] = useState(false);
  const [nuanceData, setNuanceData] = useState<NuanceData | undefined>(data.nuance_data);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isMounted = useRef(true);

  const handleSynonymClick = (syn: string) => {
    if (!onSearch) return;
    const word = syn.split('(')[0].trim();
    onSearch(word);
  };

  useEffect(() => {
    setNuanceData(data.nuance_data);
    setIsNuanceOpen(false);
  }, [data]);

  const handleDeepDive = async () => {
    if (isNuanceOpen) {
      setIsNuanceOpen(false);
      return;
    }

    if (nuanceData) {
      setIsNuanceOpen(true);
      return;
    }

    setIsGeneratingNuance(true);
    try {
      const generatedNuance = await gemini.generateNuance(data.word, data.synonyms, language);
      setNuanceData(generatedNuance);
      setIsNuanceOpen(true);

      // Save back to database if we have the ID
      if (mnemonicId) {
        const updatedData = { ...data, nuance_data: generatedNuance };
        await supabase
          .from('mnemonics')
          .update({ 
            data: updatedData,
            nuance_data: generatedNuance 
          })
          .eq('id', mnemonicId);
      }
    } catch (err) {
      console.error('Error generating nuance:', err);
      alert('Nuance generation failed. Please try again.');
    } finally {
      setIsGeneratingNuance(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const researchNote = t.researchNote;

  const revealText = t.revealImage;

  const safeData = {
    word: data?.word || 'English Word',
    transcription: data?.transcription || '...',
    meaning: data?.meaning || 'Translation',
    morphology: data?.morphology || '...',
    imagination: data?.imagination || '...',
    phoneticLink: data?.phoneticLink || '...',
    connectorSentence: data?.connectorSentence || '...',
    examples: Array.isArray(data?.examples) ? data.examples : [],
    synonyms: Array.isArray(data?.synonyms) ? data.synonyms : []
  };

  useEffect(() => {
    setShowContent(true);
    setTimer(5);
    setAudioError(null);
    setIsImageRevealed(false);
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  const handlePlayAudio = async (text?: string) => {
    if (isPlaying) {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) {}
      }
      setIsPlaying(false);
      return;
    }

    setAudioError(null);
    setIsAudioLoading(true);
    try {
      let audioBuffer: AudioBuffer | null = null;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // If we have a stored audio URL and we're playing the main story, use it
      if (data.audioUrl && !text) {
        try {
          const response = await fetch(data.audioUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Try standard decoder first (in case it's a real WAV/MP3)
          try {
            audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer.slice(0));
          } catch (e) {
            // Fallback to custom PCM decoder
            audioBuffer = await decodeAudioData(uint8Array, audioContextRef.current, 24000, 1);
          }
        } catch (fetchError) {
          console.warn("Stored audio failed, falling back to live TTS:", fetchError);
          // Fallback to live TTS below
        }
      }

      if (!audioBuffer) {
        // Fallback to Gemini TTS
        const ttsText = text || `${safeData.word}. ${safeData.meaning}. ${safeData.phoneticLink}. ${safeData.imagination}. ${safeData.connectorSentence}`;
        const base64Audio = await gemini.generateTTS(ttsText, language);

        if (!base64Audio) {
          throw new Error("No audio data received from API");
        }

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

      if (!audioBuffer) {
        throw new Error("Failed to decode audio buffer");
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        if (isMounted.current) setIsPlaying(false);
      };
      
      sourceRef.current = source;
      source.start(0);
      if (isMounted.current) setIsPlaying(true);
    } catch (error: any) {
      console.error("Audio Playback Error:", error);
      const message = error?.message || String(error);
      const isQuota = message.includes('429') || message.includes('RESOURCE_EXHAUSTED');
      if (isMounted.current) setAudioError(isQuota ? "Audio limit reached (429). Please wait." : "Audio error. Try again.");
    } finally {
      if (isMounted.current) setIsAudioLoading(false);
    }
  };

  return (
    <div className={`transition-all duration-700 transform ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} max-w-4xl mx-auto space-y-8`}>
      <div className="text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <h1 className="text-4xl sm:text-8xl font-black text-accent dark:text-accent tracking-tighter text-center">{safeData.word}</h1>
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => handlePlayAudio()}
                disabled={isAudioLoading}
                className={`group relative w-12 h-12 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                  isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-accent text-white hover:bg-accent-hover'
                } disabled:bg-gray-100 dark:disabled:bg-slate-900 flex-shrink-0`}
                title="Listen to Mnemonic Story"
              >
                {isAudioLoading ? (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-white/30 border-t-white animate-spin rounded-full" /> 
                ) : isPlaying ? (
                  <svg className="w-6 h-6 sm:w-10 sm:h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8 sm:w-12 sm:h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 4l10 8-10 8z" />
                  </svg>
                )}
                
                {/* Tooltip-like label */}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
                  {t.listenStory}
                </span>
              </button>
            </div>
          </div>
          {audioError && <p className="text-xs font-bold text-red-500 animate-bounce">{audioError}</p>}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <p className="text-2xl sm:text-3xl text-gray-400 dark:text-gray-500 font-mono font-medium tracking-tight">
              [{safeData.transcription}]
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePlayAudio(safeData.word)}
                disabled={isAudioLoading}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isPlaying ? 'text-red-500' : 'text-accent/60 hover:text-accent hover:bg-accent/10 dark:hover:bg-white/5'
                } disabled:opacity-50`}
                title="Pronounce word"
              >
                <Volume2 size={20} />
              </button>
            </div>
          </div>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 font-bold">
            {safeData.meaning}
          </p>
        </div>
        
        <div className="inline-block px-6 py-2 bg-accent/10 dark:bg-accent/20 text-accent dark:text-accent rounded-2xl text-sm font-black uppercase tracking-widest border border-accent/20 dark:border-white/10">
          {safeData.morphology}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 items-start">
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 max-w-2xl mx-auto w-full group">
          <img 
            src={imageUrl || 'https://placehold.co/600x600?text=Imagining...'} 
            alt={safeData.word} 
            className={`w-full h-auto object-cover min-h-[300px] transition-all duration-700 ${!isImageRevealed ? 'blur-3xl scale-110' : 'blur-0 scale-100'}`} 
          />
          
          {!isImageRevealed && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-3 sm:space-y-6">
              <div className="max-w-md space-y-3 sm:space-y-4">
                <p className="text-white text-[10px] sm:text-xl font-medium leading-relaxed drop-shadow-lg px-2">
                  {researchNote}
                </p>
                <button 
                  onClick={() => setIsImageRevealed(true)}
                  className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-8 sm:py-4 bg-white text-accent rounded-xl sm:rounded-2xl font-black text-xs sm:text-lg shadow-2xl hover:bg-neutral transition-all active:scale-95"
                >
                  <Eye size={16} className="sm:w-6 sm:h-6" />
                  <span>{revealText}</span>
                </button>
              </div>
            </div>
          )}

          {timer > 0 && isImageRevealed && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-6 text-center">
              <p className="text-lg font-bold mb-2">
                {t.visualizeThis}
              </p>
              <p className="text-6xl font-black">{timer}</p>
              <p className="mt-4 text-sm opacity-80">
                {t.closeEyes}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6 max-w-2xl mx-auto w-full">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border-l-8 border-orange-400 transition-transform hover:scale-[1.02]">
            <h3 className="text-orange-600 dark:text-orange-400 font-bold uppercase text-[10px] tracking-widest mb-2 opacity-60">
              {t.phoneticLink}
            </h3>
            <p className="text-gray-800 dark:text-gray-200 text-lg font-medium italic">{safeData.phoneticLink}</p>
          </div>
          <div className="bg-white dark:bg-primary/50 p-6 rounded-2xl shadow-lg border-l-8 border-accent transition-transform hover:scale-[1.01]">
            <h3 className="text-accent dark:text-accent font-bold uppercase text-[10px] tracking-widest mb-2 opacity-60">
              {t.imagination}
            </h3>
            <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">{safeData.imagination}</p>
          </div>
          <div className="bg-accent p-4 sm:p-6 rounded-2xl shadow-xl text-white transition-transform hover:scale-[1.02]">
             <h3 className="text-neutral font-bold uppercase text-[10px] tracking-widest mb-2 opacity-80">
               {t.mnemonicKey}
             </h3>
            <p className="text-lg sm:text-xl font-semibold italic">"{safeData.connectorSentence}"</p>
          </div>
          <div className="bg-gray-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-200 dark:border-slate-800">
             <h3 className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-4">
               {t.synonyms}
             </h3>
             <div className="flex flex-wrap gap-2">
               {safeData.synonyms.map((syn, idx) => (
                 <button 
                   key={idx} 
                   onClick={() => handleSynonymClick(syn)}
                   className="px-3 py-1 bg-white dark:bg-primary border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-accent hover:text-accent transition-all"
                 >
                   {syn}
                 </button>
               ))}
             </div>

             {/* Deep Dive Button */}
             <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
               <button
                 onClick={handleDeepDive}
                 disabled={isGeneratingNuance}
                 className="w-full flex items-center justify-between p-4 bg-accent/5 dark:bg-accent/10 hover:bg-accent/10 dark:hover:bg-accent/20 rounded-xl transition-all group"
               >
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
                     {isGeneratingNuance ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                   </div>
                   <div className="text-left">
                     <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                       {isGeneratingNuance ? (t.loadingNuance || 'Generating Deep Dive...') : (t.deepDive || 'Deep Dive: Usage & Nuance')}
                     </p>
                     <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                       Advanced Context & Grammar
                     </p>
                   </div>
                 </div>
                 {isNuanceOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
               </button>

               <AnimatePresence>
                 {isNuanceOpen && nuanceData && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="overflow-hidden"
                   >
                     <div className="pt-6 space-y-6">
                       {/* Core Difference */}
                       <div className="bg-accent/5 dark:bg-accent/5 p-4 rounded-xl border-l-4 border-accent">
                         <div className="flex items-center gap-2 mb-2">
                           <Info size={16} className="text-accent" />
                           <h4 className="text-xs font-black uppercase tracking-widest text-accent">{t.coreDifference || 'Core Difference'}</h4>
                         </div>
                         <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                           {nuanceData.coreDifference}
                         </p>
                       </div>

                       {/* Comparison Table */}
                       <div className="space-y-3">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">{t.usageComparison || 'Usage Comparison'}</h4>
                         <div className="grid gap-3">
                           {nuanceData.comparisonTable.map((item, idx) => (
                             <div key={idx} className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                               <div className="flex items-center justify-between mb-2">
                                 <span className="text-sm font-black text-accent">{item.word}</span>
                               </div>
                               <p className="text-sm font-bold text-gray-900 dark:text-white mb-1 italic">"{item.usage}"</p>
                               <p className="text-xs text-gray-500 dark:text-gray-400">{item.reason}</p>
                             </div>
                           ))}
                         </div>
                       </div>

                       {/* Common Mistake */}
                       <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                         <div className="flex items-center gap-2 mb-3">
                           <AlertTriangle size={16} className="text-red-500" />
                           <h4 className="text-xs font-black uppercase tracking-widest text-red-500">{t.commonMistake || 'Common Mistake'}</h4>
                         </div>
                         <div className="space-y-2">
                           <div>
                             <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">{t.incorrect || 'Incorrect'}</p>
                             <p className="text-sm text-gray-600 dark:text-gray-400 line-through">{nuanceData.commonMistake.incorrect}</p>
                           </div>
                           <div>
                             <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">{t.naturalEnglish || 'Natural English'}</p>
                             <p className="text-sm font-bold text-gray-900 dark:text-white">{nuanceData.commonMistake.natural}</p>
                           </div>
                         </div>
                       </div>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>
          <div className="bg-gray-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-200 dark:border-slate-800">
             <h3 className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-4">
               {t.examples}
             </h3>
             <ul className="space-y-3">
               {safeData.examples.map((ex, idx) => (
                 <li key={idx} className="text-gray-700 dark:text-gray-300 italic flex gap-3">
                   <span className="text-accent/40 font-bold">•</span>
                   {ex}
                 </li>
               ))}
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};