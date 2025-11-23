
import React, { useState, useRef, useEffect } from 'react';
import { AppView, ConverterResult } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Mic, Sparkles, CheckCircle, Star, MessageCircle, Zap, Loader2, Square } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob } from '../utils/audioUtils';
import { converterService } from '../utils/converterService';

interface Props {
  setView: (view: AppView) => void;
}

const ConverterMode: React.FC<Props> = ({ setView }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ConverterResult | null>(null);

  // Audio Refs
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const initialTextRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (isListening) recognitionRef.current?.stop();
    };
  }, [isListening]);

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      try {
        await startDictation();
      } catch (e) {
        console.error("Dictation failed", e);
        setIsListening(false);
      }
    }
  };

  const startDictation = async () => {
    if (!process.env.API_KEY) return;

    const AudioCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    audioContextRef.current = new AudioCtxClass({ sampleRate: 16000 });
    mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    initialTextRef.current = inputText; 
    let currentSessionTranscript = '';

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        systemInstruction: "You are a transcriber. Accurately transcribe mixed Hindi-English or broken English exactly as spoken.",
      },
      callbacks: {
        onopen: () => {
          if (!audioContextRef.current || !mediaStreamRef.current) return;
          const ctx = audioContextRef.current;
          sourceRef.current = ctx.createMediaStreamSource(mediaStreamRef.current);
          processorRef.current = ctx.createScriptProcessor(4096, 1, 1);

          processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };

          sourceRef.current.connect(processorRef.current);
          processorRef.current.connect(ctx.destination);
        },
        onmessage: (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription?.text) {
            const chunk = message.serverContent.inputTranscription.text;
            currentSessionTranscript += chunk;
            setInputText(initialTextRef.current + (initialTextRef.current ? ' ' : '') + currentSessionTranscript);
          }
        },
        onclose: () => console.log("Dictation closed"),
        onerror: (e) => { console.error(e); setIsListening(false); }
      }
    });

    sessionRef.current = sessionPromise;

    recognitionRef.current = {
      stop: () => {
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
      }
    };
  };

  const handleConvert = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    const data = await converterService.convertText(inputText);
    setResult(data);
    setIsProcessing(false);
  };

  return (
    <GradientBackground className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center bg-black/20 backdrop-blur-md z-20 border-b border-white/5 sticky top-0">
        <button onClick={() => setView(AppView.HOME)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="text-white" />
        </button>
        <h2 className="ml-4 text-lg font-semibold">Idea-to-English Converter</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        
        {/* Input Section */}
        <GlassCard className="p-6 mb-8 relative overflow-hidden">
           <div className="flex justify-between items-center mb-4">
              <label className="text-xs uppercase tracking-widest text-purple-300 font-bold">Your Raw Idea</label>
              {isListening && <span className="text-xs text-red-400 animate-pulse font-bold flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"/> Listening...</span>}
           </div>
           
           <textarea
             value={inputText}
             onChange={(e) => setInputText(e.target.value)}
             placeholder="Speak or type your broken English or Hinglish here... (e.g., 'Kal meeting me I was very nervous')"
             className="w-full bg-white/5 text-white placeholder-slate-500 border border-white/10 rounded-xl p-4 min-h-[100px] resize-none focus:border-purple-500/50 outline-none transition-all text-lg"
           />

           <div className="flex justify-between items-center mt-4">
              <button 
                onClick={toggleListening}
                className={`p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30' : 'bg-white/10 hover:bg-white/20 text-slate-300'}`}
              >
                {isListening ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
              </button>

              <button 
                onClick={handleConvert}
                disabled={isProcessing || !inputText.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-500/20"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Upgrade Idea</>}
              </button>
           </div>
        </GlassCard>

        {/* Results Section */}
        {result && (
          <div className="space-y-4 animate-[slideIn_0.5s_ease-out]">
             
             <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs justify-center bg-black/20 py-1 px-3 rounded-full w-fit mx-auto">
                <Zap size={12} className="text-yellow-400" />
                <span>{result.analysis}</span>
             </div>

             {/* 1. Correct Version */}
             <GlassCard className="p-5 border-l-4 border-green-500 bg-gradient-to-r from-green-500/5 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                   <CheckCircle size={18} className="text-green-400" />
                   <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Correct</span>
                </div>
                <p className="text-lg text-white font-medium leading-relaxed">{result.correct}</p>
             </GlassCard>

             {/* 2. Impressive Version */}
             <GlassCard className="p-5 border-l-4 border-purple-500 bg-gradient-to-r from-purple-500/5 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                   <Star size={18} className="text-purple-400" />
                   <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Impressive</span>
                </div>
                <p className="text-lg text-white font-medium leading-relaxed">{result.impressive}</p>
             </GlassCard>

             {/* 3. Native Version */}
             <GlassCard className="p-5 border-l-4 border-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                   <MessageCircle size={18} className="text-blue-400" />
                   <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Native / Casual</span>
                </div>
                <p className="text-lg text-white font-medium leading-relaxed">{result.native}</p>
             </GlassCard>

          </div>
        )}

      </div>
    </GradientBackground>
  );
};

export default ConverterMode;
