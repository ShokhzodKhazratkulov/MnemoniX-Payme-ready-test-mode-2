
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Language } from '../types';

interface Props {
  onClose: () => void;
  uiLanguage: Language;
  contentLanguage: Language;
}

const VOICE_T: Record<Language, any> = {
  [Language.ENGLISH]: { 
    connecting: "Connecting...", 
    ready: "Ready! Speak now...", 
    error: "An error occurred.", 
    quotaError: "Quota limit reached. Please wait.",
    micError: "Could not enable microphone.",
    title: "Live Mnemonic",
    finish: "Finish",
    aiLabel: "Master",
    userLabel: "You"
  },
  [Language.UZBEK]: { 
    connecting: "Ulanmoqda...", 
    ready: "Tayyor! Gapiring...", 
    error: "Xatolik yuz berdi.", 
    quotaError: "Limit tugadi. Biroz kuting.",
    micError: "Mikrofonni yoqib bo'lmadi.",
    title: "Live Mnemonika",
    finish: "Yakunlash",
    aiLabel: "Usta",
    userLabel: "Siz"
  },
  [Language.KAZAKH]: { 
    connecting: "Қосылуда...", 
    ready: "Дайын! Сөйлеңіз...", 
    error: "Қате орын алды.", 
    quotaError: "Лимит таусылды. Күте тұрыңыз.",
    micError: "Микрофонды қосу мүмкін болмады.",
    title: "Live Мнемоника",
    finish: "Аяқтау",
    aiLabel: "Шебер",
    userLabel: "Сіз"
  },
  [Language.TAJIK]: { 
    connecting: "Пайваст шуда истодааст...", 
    ready: "Тайёр! Гӯед...", 
    error: "Хатогӣ рӯй дод.", 
    quotaError: "Маҳдудияти квота. Лутфан интизор шавед.",
    micError: "Микрофонро фаъол карда нашуд.",
    title: "Мнемоникаи Зинда",
    finish: "Анҷом",
    aiLabel: "Устод",
    userLabel: "Шумо"
  },
  [Language.KYRGYZ]: { 
    connecting: "Туташууда...", 
    ready: "Даяр! Сүйлөңүз...", 
    error: "Ката кетти.", 
    quotaError: "Лимит бүттү. Күтө туруңуз.",
    micError: "Микрофонду күйгүзүү мүмкүн болгон жок.",
    title: "Live Мнемоника",
    finish: "Бүтүрүү",
    aiLabel: "Устат",
    userLabel: "Сиз"
  },
  [Language.RUSSIAN]: { 
    connecting: "Подключение...", 
    ready: "Готово! Говорите...", 
    error: "Произошла ошибка.", 
    quotaError: "Лимит исчерпан. Подождите.",
    micError: "Не удалось включить микрофон.",
    title: "Живая Мнемоника",
    finish: "Завершить",
    aiLabel: "Мастер",
    userLabel: "Вы"
  },
  [Language.TURKMEN]: { 
    connecting: "Baglanýar...", 
    ready: "Taýýar! Gürläň...", 
    error: "Ýalňyşlyk ýüze çykdy.", 
    quotaError: "Limit gutardy. Biraz garaşyň.",
    micError: "Mikrofony açyp bolmady.",
    title: "Live Mnemonika",
    finish: "Tamamlamak",
    aiLabel: "Ussa",
    userLabel: "Siz"
  },
};

function decode(base64: string) {
  if (!base64) return new Uint8Array(0);
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decode error in VoiceMode:", e);
    return new Uint8Array(0);
  }
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer | null> {
  if (data.length === 0) return null;
  const bufferToUse = data.byteLength % 2 === 0 ? data.buffer : data.buffer.slice(0, data.byteLength - 1);
  const dataInt16 = new Int16Array(bufferToUse);
  const frameCount = dataInt16.length / numChannels;
  if (frameCount <= 0) return null;

  try {
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  } catch (e) {
    console.error("VoiceMode: Audio buffer creation failed:", e);
    return null;
  }
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const VoiceMode = React.memo(({ onClose, uiLanguage, contentLanguage }: Props) => {
  const t = VOICE_T[uiLanguage];
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState(t.connecting);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let sessionPromise: Promise<any>;

    const startSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = outputAudioContext;
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

        sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              if (!mountedRef.current) return;
              setStatus(t.ready);
              setIsActive(true);
              
              const source = inputAudioContext.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                if (!mountedRef.current) return;
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then((session) => {
                  if (mountedRef.current) {
                    session.sendRealtimeInput({ media: pcmBlob });
                  }
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!mountedRef.current) return;
              if (message.serverContent?.outputTranscription) {
                  setTranscriptions(prev => [...prev.slice(-4), `${t.aiLabel}: ${message.serverContent?.outputTranscription?.text || ''}`]);
              } else if (message.serverContent?.inputTranscription) {
                  setTranscriptions(prev => [...prev.slice(-4), `${t.userLabel}: ${message.serverContent?.inputTranscription?.text || ''}`]);
              }

              const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64EncodedAudioString && audioContextRef.current && mountedRef.current) {
                const decodedData = decode(base64EncodedAudioString);
                const audioBuffer = await decodeAudioData(decodedData, audioContextRef.current, 24000, 1);
                
                if (audioBuffer && mountedRef.current) {
                  const source = audioContextRef.current.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(audioContextRef.current.destination);
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
                  sourcesRef.current.add(source);
                  source.onended = () => sourcesRef.current.delete(source);
                }
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (err: any) => {
                if (!mountedRef.current) return;
                console.error('Session error:', err);
                const msg = err?.message || '';
                if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                  setStatus(t.quotaError);
                } else {
                  setStatus(t.error);
                }
            },
            onclose: () => {
              if (mountedRef.current) setIsActive(false);
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: `Siz professional 'Mnemonika va Ingliz tili ustozi'siz. Sizning vazifangiz foydalanuvchiga xorijiy (ingliz) so‘zlarni bir marta ko‘rganda eslab qoladigan darajada qiziqarli va assotsiativ usulda tushuntirish.
            
            Har bir so‘z uchun quyidagi strukturani qo‘llang:
            1. So‘zning transkripsiyasi va ${contentLanguage}cha ma’nosini aniq ayting.
            2. Morfologik tahlil: So‘zni mantiqiy qismlarga bo‘ling.
            3. Phonetic Link (Talaffuz bog'liqligi): So‘zning talaffuzi ${contentLanguage} tilidagi qaysi so‘zga o‘xshashligini toping va bog'lang.
            4. Tasavvur (Imagination): Yorqin, g‘alati yoki kulgili sahna yarating.
            5. Connector Sentence: So‘z va tasvirni birlashtiruvchi 1 ta qisqa gap.
            6. Examples: So‘z qatnashgan 2 ta oddiy gap (Inglizcha gap, keyin tarjimasi).
            7. Visualisation Command: Foydalanuvchiga ushbu tasvirni 5 soniya davomida tasavvur qilishni buyuring.
            
            STRICT REQUIREMENT: Communicate EXCLUSIVELY in the ${contentLanguage} language. Use natural, flowing sentences optimized for Gemini Live. Be warm, motivating, and humorous.`,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {}
          }
        });

      } catch (err) {
        if (mountedRef.current) {
          console.error('Initialization error:', err);
          setStatus(t.micError);
        }
      }
    };

    startSession();
    
    return () => { 
      mountedRef.current = false;
      if (sessionPromise) {
        sessionPromise.then(s => s.close());
      }
      // Stop all active audio sources
      sourcesRef.current.forEach(s => {
        try {
          s.stop();
        } catch (e) {
          // Ignore errors if already stopped
        }
      });
      sourcesRef.current.clear();
      
      // Close audio contexts
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [contentLanguage, t]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/95 backdrop-blur-xl p-4">
      <div className="w-full max-w-lg bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl flex flex-col items-center text-center space-y-8">
        <div className="relative">
          <div className={`w-32 h-32 rounded-full bg-accent/30 flex items-center justify-center ${isActive ? 'animate-pulse' : ''}`}>
             <div className={`w-24 h-24 rounded-full bg-accent/40 flex items-center justify-center transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
             </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{t.title}</h2>
          <p className="text-accent/80">{status}</p>
        </div>

        <div className="w-full bg-black/20 rounded-2xl p-4 min-h-[150px] text-left space-y-2 text-sm text-gray-300 overflow-y-auto">
           {transcriptions.map((t, i) => <p key={i} className="animate-fadeIn">{t}</p>)}
        </div>

        <button 
          onClick={onClose}
          className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition-all shadow-xl active:scale-95"
        >
          {t.finish}
        </button>
      </div>
    </div>
  );
});
