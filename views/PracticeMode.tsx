import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AppView, ConnectionState } from '../types';
import GradientBackground from '../components/GradientBackground';
import { ArrowLeft, Mic, MicOff, Volume2, Activity } from 'lucide-react';
import { createPcmBlob, decodeAudioData, decodeBase64 } from '../utils/audioUtils';

interface Props {
  setView: (view: AppView) => void;
}

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const API_KEY = process.env.API_KEY;

const PracticeMode: React.FC<Props> = ({ setView }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0); // 0-100 for visualizer
  const [statusMessage, setStatusMessage] = useState("Ready to start");

  // Refs for audio handling
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  
  // Initialize Audio Contexts
  const initAudio = () => {
    const InputCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    const OutputCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    
    inputContextRef.current = new InputCtxClass({ sampleRate: 16000 });
    outputContextRef.current = new OutputCtxClass({ sampleRate: 24000 });
  };

  const startSession = async () => {
    if (!API_KEY) {
      setStatusMessage("API Key Missing");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setStatusMessage("Connecting to Gemini Live...");
      
      initAudio();
      
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: "You are a helpful, friendly English language tutor. Engage in a casual conversation. Correct mistakes gently if they are major, but focus on flow.",
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            setStatusMessage("Conversation Active");
            
            // Setup Input Stream
            if (!inputContextRef.current || !streamRef.current) return;
            
            const ctx = inputContextRef.current;
            sourceRef.current = ctx.createMediaStreamSource(streamRef.current);
            processorRef.current = ctx.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              if (isMuted) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolumeLevel(Math.min(100, rms * 500));

              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(ctx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && outputContextRef.current) {
              const ctx = outputContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decodeBase64(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
            
            if (message.serverContent?.interrupted) {
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
            setStatusMessage("Session Ended");
          },
          onerror: (err) => {
            console.error(err);
            setConnectionState(ConnectionState.ERROR);
            setStatusMessage("Connection Error");
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start session:", error);
      setConnectionState(ConnectionState.ERROR);
      setStatusMessage("Failed to access microphone or API");
    }
  };

  const stopSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current && inputContextRef.current) {
      processorRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
    }
    // No direct close method on session wrapper in this pattern, 
    // but stopping stream and context effectively kills the local side.
    // Ideally we'd call session.close() if exposed by the library wrapper directly.
    
    setConnectionState(ConnectionState.DISCONNECTED);
    setStatusMessage("Ready to start");
    setVolumeLevel(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <GradientBackground className="flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/20 backdrop-blur-md z-20">
        <button 
          onClick={() => { stopSession(); setView(AppView.HOME); }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="text-white" />
        </button>
        <h2 className="text-lg font-semibold tracking-wide">Live Practice</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* Visualizer Circle */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Pulsing Rings */}
          {connectionState === ConnectionState.CONNECTED && (
             <>
              <div 
                className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl transition-all duration-100"
                style={{ transform: `scale(${1 + volumeLevel / 50})` }} 
              />
              <div 
                className="absolute inset-0 rounded-full border-2 border-cyan-500/30 transition-all duration-100"
                style={{ transform: `scale(${1 + volumeLevel / 100})` }} 
              />
             </>
          )}

          {/* Center Status */}
          <div className={`
            w-40 h-40 rounded-full backdrop-blur-xl flex flex-col items-center justify-center
            border border-white/10 shadow-2xl transition-colors duration-500
            ${connectionState === ConnectionState.CONNECTED ? 'bg-cyan-900/40' : 'bg-white/5'}
            ${connectionState === ConnectionState.ERROR ? 'bg-red-900/40 border-red-500/30' : ''}
          `}>
            {connectionState === ConnectionState.CONNECTED ? (
              <Activity className="text-cyan-300 animate-pulse" size={48} />
            ) : (
              <Volume2 className="text-slate-400" size={48} />
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-light text-white">{statusMessage}</h3>
          <p className="text-slate-400 mt-2 text-sm">
            {connectionState === ConnectionState.CONNECTED 
              ? "Speak naturally. The AI is listening." 
              : "Tap the microphone to begin."}
          </p>
        </div>

      </div>

      {/* Controls */}
      <div className="p-8 flex items-center justify-center gap-8 mb-8">
        {connectionState === ConnectionState.CONNECTED && (
           <button 
            onClick={toggleMute}
            className={`p-4 rounded-full backdrop-blur-md border transition-all ${isMuted ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-white/10 border-white/20 text-white'}`}
           >
             {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
           </button>
        )}

        <button
          onClick={connectionState === ConnectionState.CONNECTED ? stopSession : startSession}
          className={`
            h-20 w-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300
            ${connectionState === ConnectionState.CONNECTED 
              ? 'bg-red-500 hover:bg-red-600 scale-100' 
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-110 animate-pulse-ring'}
          `}
        >
          {connectionState === ConnectionState.CONNECTED ? (
             <div className="w-8 h-8 bg-white rounded-sm" /> 
          ) : (
             <Mic size={32} className="text-white" />
          )}
        </button>
      </div>
    </GradientBackground>
  );
};

export default PracticeMode;