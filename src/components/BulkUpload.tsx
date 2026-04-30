
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronLeft,
  Settings,
  Database,
  Languages
} from 'lucide-react';
import { Language, AppView, MnemonicResponse } from '../types';
import { GeminiService } from '../services/geminiService';
import { supabase } from '../supabaseClient';
import imageCompression from 'browser-image-compression';

interface Props {
  onBack: () => void;
  t: any;
  user: any;
  currentLanguage: Language;
}

interface WordProgress {
  word: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const BulkUpload: React.FC<Props> = ({ onBack, t, user, currentLanguage }) => {
  const [inputText, setInputText] = useState('');
  const [words, setWords] = useState<WordProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState<Language>(currentLanguage);
  const [logs, setLogs] = useState<string[]>([]);
  
  const gemini = new GeminiService();
  const stopRef = useRef(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bulk_upload_progress');
    if (saved) {
      const { words: savedWords, index, lang } = JSON.parse(saved);
      setWords(savedWords);
      setCurrentIndex(index);
      setTargetLanguage(lang);
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    if (words.length > 0) {
      localStorage.setItem('bulk_upload_progress', JSON.stringify({
        words,
        index: currentIndex,
        lang: targetLanguage
      }));
    }
  }, [words, currentIndex, targetLanguage]);

  const handleParse = () => {
    const parsedWords = inputText
      .split(/[\n,]/)
      .map(w => w.trim())
      .filter(w => w.length > 0)
      .map(word => ({ word, status: 'pending' as const }));
    
    setWords(parsedWords);
    setCurrentIndex(0);
    setLogs([`Parsed ${parsedWords.length} words.`]);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const processWord = async (index: number) => {
    const wordProgress = words[index];
    if (!wordProgress) return;

    setWords(prev => prev.map((w, i) => i === index ? { ...w, status: 'processing' } : w));
    addLog(`Processing: ${wordProgress.word}...`);

    try {
      // 1. Check if word already exists for this language
      const { data: existing, error: checkError } = await supabase
        .from('mnemonics')
        .select('id, data, nuance_data')
        .eq('word', wordProgress.word.toLowerCase().trim())
        .eq('language', targetLanguage)
        .maybeSingle();

      if (checkError) {
        addLog(`Check error for "${wordProgress.word}": ${checkError.message}`);
      }

      if (existing) {
        // If it exists, check if it needs nuance data
        const currentMnemonicData = existing.data as MnemonicResponse;
        const currentNuanceData = existing.nuance_data || (currentMnemonicData as any).nuance_data;

        if (!currentNuanceData) {
          addLog(`Word "${wordProgress.word}" exists but missing Deep Dive. Generating...`);
          try {
            const nuanceData = await gemini.generateNuance(currentMnemonicData.word, currentMnemonicData.synonyms, targetLanguage);
            currentMnemonicData.nuance_data = nuanceData;
            
            const { error: updateError } = await supabase
              .from('mnemonics')
              .update({ 
                data: currentMnemonicData,
                nuance_data: nuanceData 
              })
              .eq('id', existing.id);

            if (updateError) throw updateError;
            addLog(`Success: Updated Deep Dive for "${wordProgress.word}"`);
          } catch (nuanceErr: any) {
            console.error('Error updating nuance in bulk upload:', nuanceErr);
            addLog(`Error updating Deep Dive for "${wordProgress.word}": ${nuanceErr.message}`);
          }
        } else {
          addLog(`Word "${wordProgress.word}" already exists with Deep Dive. Skipping.`);
        }

        setWords(prev => prev.map((w, i) => i === index ? { ...w, status: 'completed' } : w));
        return;
      }

      // 2. Generate Mnemonic
      const mnemonicData = await gemini.getMnemonic(wordProgress.word, targetLanguage);
      const normalizedWord = mnemonicData.word.toLowerCase().trim();

      // Double check with normalized word from AI
      if (normalizedWord !== wordProgress.word.toLowerCase().trim()) {
        const { data: existingNormalized } = await supabase
          .from('mnemonics')
          .select('id')
          .eq('word', normalizedWord)
          .eq('language', targetLanguage)
          .maybeSingle();
        
        if (existingNormalized) {
          addLog(`AI corrected word "${normalizedWord}" already exists. Skipping.`);
          setWords(prev => prev.map((w, i) => i === index ? { ...w, status: 'completed' } : w));
          return;
        }
      }
      
      // 3. Generate Image
      let storedImageUrl = '';
      const base64Image = await gemini.generateImage(mnemonicData.imagePrompt);
      if (!base64Image) {
        throw new Error("Image generation failed: Empty response from AI");
      }

      const response = await fetch(base64Image);
      const imageBlob = await response.blob();
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      const compressedFile = await imageCompression(imageBlob as File, options);
      const fileName = `${normalizedWord}-${targetLanguage}-${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from('mnemonic_assets')
        .upload(`mnemonics/${fileName}`, compressedFile);
      
      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('mnemonic_assets')
        .getPublicUrl(`mnemonics/${fileName}`);
      storedImageUrl = publicUrl;

      // 4. Generate TTS
      let storedAudioUrl = '';
      const ttsText = `${mnemonicData.word}. ${mnemonicData.meaning}. ${mnemonicData.phoneticLink}. ${mnemonicData.imagination}. ${mnemonicData.connectorSentence}`;
      const audioBase64 = await gemini.generateTTS(ttsText, targetLanguage);
      
      if (!audioBase64) {
        throw new Error("Audio generation failed: Empty response from AI");
      }

      const audioBlob = await (await fetch(`data:audio/mp3;base64,${audioBase64}`)).blob();
      const audioFileName = `${normalizedWord}-${targetLanguage}-${Date.now()}.mp3`;
      
      const { error: audioUploadError } = await supabase.storage
        .from('mnemonic_assets')
        .upload(`audio/${audioFileName}`, audioBlob);
      
      if (audioUploadError) {
        throw new Error(`Audio upload failed: ${audioUploadError.message}`);
      }

      const { data: { publicUrl: audioPublicUrl } } = supabase.storage
        .from('mnemonic_assets')
        .getPublicUrl(`audio/${audioFileName}`);
      storedAudioUrl = audioPublicUrl;

      // 5. Generate Deep Dive (Nuance)
      addLog(`Generating Deep Dive for "${normalizedWord}"...`);
      let nuanceData = null;
      try {
        nuanceData = await gemini.generateNuance(mnemonicData.word, mnemonicData.synonyms, targetLanguage);
        mnemonicData.nuance_data = nuanceData;
      } catch (nuanceErr) {
        console.error('Error generating nuance in bulk upload:', nuanceErr);
        addLog(`Warning: Nuance generation failed for "${normalizedWord}". Continuing...`);
      }

      // Final Check: Ensure everything is present before DB insert
      if (!storedImageUrl || !storedAudioUrl) {
        throw new Error("Missing assets: Image or Audio URL could not be retrieved.");
      }

      // 6. Save to Database
      mnemonicData.audioUrl = storedAudioUrl;
      const { error: dbError } = await supabase
        .from('mnemonics')
        .insert({
          word: normalizedWord,
          language: targetLanguage,
          data: mnemonicData,
          image_url: storedImageUrl,
          audio_url: storedAudioUrl,
          pronunciation_url: storedAudioUrl,
          keyword: mnemonicData.phoneticLink,
          story: mnemonicData.imagination,
          category: mnemonicData.category,
          nuance_data: nuanceData
        });

      if (dbError) {
        // Handle duplicate key error gracefully
        if (dbError.code === '23505') {
          addLog(`Word "${normalizedWord}" was inserted by another process or already exists. Marking as completed.`);
          setWords(prev => prev.map((w, i) => i === index ? { ...w, status: 'completed' } : w));
          return;
        }
        throw dbError;
      }

      setWords(prev => prev.map((w, i) => i === index ? { ...w, status: 'completed' } : w));
      addLog(`Success: ${normalizedWord}`);

    } catch (error: any) {
      console.error(`Error processing ${wordProgress.word}:`, error);
      const errorMsg = error?.message || 'Unknown error';
      setWords(prev => prev.map((w, i) => i === index ? { ...w, status: 'error', error: errorMsg } : w));
      addLog(`Error (${wordProgress.word}): ${errorMsg}`);
      
      // If it's a quota error, stop processing
      if (errorMsg.includes('429') || errorMsg.includes('quota')) {
        setIsProcessing(false);
        stopRef.current = true;
        addLog("Quota exceeded. Pausing. Please update API key in settings and resume.");
      }
    }
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    stopRef.current = false;
    
    for (let i = currentIndex; i < words.length; i++) {
      if (stopRef.current) break;
      if (words[i].status === 'completed') {
        setCurrentIndex(i + 1);
        continue;
      }
      
      setCurrentIndex(i);
      await processWord(i);
      
      // Small delay between words to be safe
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setIsProcessing(false);
  };

  const handlePause = () => {
    stopRef.current = true;
    setIsProcessing(false);
    addLog("Paused by user.");
  };

  const handleReset = () => {
    if (confirm("Clear all progress?")) {
      setWords([]);
      setCurrentIndex(0);
      setInputText('');
      setLogs([]);
      localStorage.removeItem('bulk_upload_progress');
    }
  };

  const completedCount = words.filter(w => w.status === 'completed').length;
  const errorCount = words.filter(w => w.status === 'error').length;
  const progress = words.length > 0 ? (completedCount / words.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 hover:scale-110 transition-transform active:scale-95 flex items-center gap-2 font-black text-gray-600 dark:text-gray-400"
        >
          <ChevronLeft size={24} />
          {t.back}
        </button>
        <div className="text-right">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Bulk Upload</h2>
          <p className="text-gray-500 font-bold">AI Mnemonic Generator</p>
        </div>
      </div>

      {words.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl space-y-6"
        >
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Database size={16} />
              Word List
            </label>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter words separated by new lines or commas (e.g. apple, banana, cherry...)"
              className="w-full h-64 p-6 bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl focus:border-accent focus:ring-0 transition-all font-mono text-sm resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Languages size={16} />
                Target Language
              </label>
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as Language)}
                className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl font-bold"
              >
                {Object.values(Language).map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleParse}
              disabled={!inputText.trim()}
              className="px-8 py-4 bg-accent text-white rounded-2xl font-black shadow-xl shadow-accent/20 dark:shadow-none hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload size={20} />
              Parse Words
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Processing Queue</h3>
                <p className="text-gray-500 font-bold">
                  {completedCount} of {words.length} completed
                  {errorCount > 0 && <span className="text-rose-500 ml-2">({errorCount} errors)</span>}
                </p>
              </div>
              <div className="flex gap-2">
                {!isProcessing ? (
                  <button 
                    onClick={startProcessing}
                    className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2 font-black"
                  >
                    <Play size={20} />
                    {currentIndex > 0 ? 'Resume' : 'Start'}
                  </button>
                ) : (
                  <button 
                    onClick={handlePause}
                    className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200 dark:shadow-none hover:bg-amber-600 transition-all active:scale-95 flex items-center gap-2 font-black"
                  >
                    <Pause size={20} />
                    Pause
                  </button>
                )}
                <button 
                  onClick={handleReset}
                  className="p-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-accent"
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span>0%</span>
                <span>{Math.round(progress)}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Current Word Status */}
            {isProcessing && words[currentIndex] && (
              <div className="p-4 bg-accent/10 dark:bg-accent/20 rounded-2xl border border-accent/20 dark:border-white/10 flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
                <div>
                  <p className="text-xs font-black text-accent uppercase tracking-widest">Now Generating</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{words[currentIndex].word}</p>
                </div>
              </div>
            )}
          </div>

          {/* Word List & Logs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Word List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Queue</span>
                <span className="text-xs font-bold text-gray-500">{words.length} words</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {words.map((w, i) => (
                  <div 
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-xl text-sm font-bold ${
                      i === currentIndex && isProcessing ? 'bg-accent/10 dark:bg-accent/20 text-accent' : 
                      w.status === 'completed' ? 'text-emerald-600' :
                      w.status === 'error' ? 'text-rose-600' :
                      'text-gray-500'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-[10px] opacity-50 w-4">{i + 1}</span>
                      {w.word}
                    </span>
                    {w.status === 'completed' && <CheckCircle2 size={16} />}
                    {w.status === 'error' && <AlertCircle size={16} />}
                    {w.status === 'processing' && <Loader2 size={16} className="animate-spin" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Logs */}
            <div className="bg-slate-900 rounded-[2rem] shadow-lg overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Logs</span>
                <Settings size={14} className="text-slate-500" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className={`${log.startsWith('Error') ? 'text-rose-400' : log.startsWith('Success') ? 'text-emerald-400' : 'text-slate-400'}`}>
                    <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                ))}
                {logs.length === 0 && <div className="text-slate-600 italic">Waiting to start...</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-accent/10 dark:bg-accent/20 p-6 rounded-3xl border border-accent/20 dark:border-white/10 flex gap-4">
        <div className="w-10 h-10 bg-accent/20 dark:bg-accent/30 rounded-xl flex items-center justify-center text-accent dark:text-accent flex-shrink-0">
          <AlertCircle size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-black text-accent dark:text-neutral">Rate Limit Handling</p>
          <p className="text-xs text-accent/70 dark:text-neutral/60 leading-relaxed">
            This tool automatically handles Gemini API rate limits. If you hit a limit, the process will pause. 
            You can update your API key in the AI Studio settings and click "Resume" to continue exactly where you left off.
            Progress is saved automatically in your browser.
          </p>
        </div>
      </div>
    </div>
  );
};
