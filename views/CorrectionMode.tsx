import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, LiveServerMessage, Modality } from '@google/genai';
import { AppView, GrammarCorrection } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Send, Mic, Loader2, Sparkles, Square } from 'lucide-react';
import { createPcmBlob } from '../utils/audioUtils';

interface Props {
  setView: (view: AppView) => void;
}

const CorrectionMode: React.FC<Props> = ({ setView }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GrammarCorrection | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Refs for audio handling (integrated from PracticeMode logic)
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const initialTextRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        recognitionRef.current?.stop();
      }
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
        console.error("Failed to start dictation:", e);
        setIsListening(false);
      }
    }
  };

  const startDictation = async () => {
    if (!process.env.API_KEY) return;

    // Initialize Audio
    const AudioCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    audioContextRef.current = new AudioCtxClass({ sampleRate: 16000 });
    mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    initialTextRef.current = inputText; // Snapshot current text
    let currentSessionTranscript = '';

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {}, // Enable transcription
        systemInstruction: "You are a transcriber. Listen to the user and do nothing else.", // Minimal instruction
      },
      callbacks: {
        onopen: () => {
          // Setup Audio Processing
          if (!audioContextRef.current || !mediaStreamRef.current) return;
          
          const ctx = audioContextRef.current;
          sourceRef.current = ctx.createMediaStreamSource(mediaStreamRef.current);
          processorRef.current = ctx.createScriptProcessor(4096, 1, 1);

          processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          sourceRef.current.connect(processorRef.current);
          processorRef.current.connect(ctx.destination);
        },
        onmessage: (message: LiveServerMessage) => {
          // Handle Transcription
          if (message.serverContent?.inputTranscription) {
            const chunk = message.serverContent.inputTranscription.text;
            if (chunk) {
              currentSessionTranscript += chunk;
              setInputText(initialTextRef.current + (initialTextRef.current ? ' ' : '') + currentSessionTranscript);
            }
          }
          // Ignore audio output from model
        },
        onclose: () => {
          console.log("Dictation session closed");
        },
        onerror: (e) => {
          console.error("Dictation error:", e);
          setIsListening(false);
        }
      }
    });

    sessionRef.current = sessionPromise;

    // Define stop function for recognitionRef to handle cleanup
    recognitionRef.current = {
      stop: () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (processorRef.current && audioContextRef.current) {
          processorRef.current.disconnect();
          sourceRef.current?.disconnect();
        }
      }
    };
  };

  const analyzeText = async () => {
    if (!inputText.trim() || !process.env.API_KEY) return;

    setIsLoading(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the following English sentence for grammar, naturalness, and vocabulary. Return the result in JSON format. Sentence: "${inputText}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              corrected: { type: Type.STRING },
              explanation: { type: Type.STRING }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground className="flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center bg-black/20 backdrop-blur-md z-20 border-b border-white/5">
        <button 
          onClick={() => {
            if (isListening) recognitionRef.current?.stop();
            setView(AppView.HOME);
          }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="text-white" />
        </button>
        <h2 className="ml-4 text-lg font-semibold">Correction Lab</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Input Area */}
        <GlassCard className="p-6">
           <label className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-2 block">Your Sentence</label>
           <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or speak a sentence here..."
            className="w-full bg-transparent text-xl text-white placeholder-slate-500 border-none outline-none resize-none h-24"
           />
           <div className="flex justify-end gap-3 mt-4">
             <button 
               onClick={toggleListening}
               className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
               title={isListening ? "Stop Dictation" : "Start Dictation"}
             >
               {isListening ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
             </button>
             <button 
               onClick={analyzeText}
               disabled={isLoading || !inputText}
               className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-full font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
             >
               {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={20} /> Analyze</>}
             </button>
           </div>
        </GlassCard>

        {/* Result Area */}
        {result && (
          <div className="space-y-4 animate-[slideIn_0.5s_ease-out]">
             <GlassCard className="p-6 border-l-4 border-green-400">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={18} className="text-green-400" />
                  <span className="text-xs uppercase tracking-widest text-green-400 font-bold">Better Phrasing</span>
                </div>
                <p className="text-2xl font-medium text-white">{result.corrected}</p>
             </GlassCard>

             <GlassCard className="p-6">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2 block">Explanation</span>
                <p className="text-slate-200 leading-relaxed">{result.explanation}</p>
             </GlassCard>
          </div>
        )}
      </div>
    </GradientBackground>
  );
};

export default CorrectionMode;