import React, { useEffect, useState, useRef } from 'react';
import { AppView, ConnectionState } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Check, Sparkles, Play, Mic, RefreshCw, Activity, Volume2, MicOff, ArrowRight } from 'lucide-react';
import { topicService, INTERESTS_LIST } from '../utils/topicService';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, decodeBase64 } from '../utils/audioUtils';

interface Props {
  setView: (view: AppView) => void;
}

const EndlessMode: React.FC<Props> = ({ setView }) => {
  // State: Profile
  const [interests, setInterests] = useState<string[]>([]);
  const [hasSetupProfile, setHasSetupProfile] = useState(false);

  // State: Flow
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [nextTopics, setNextTopics] = useState<string[]>([]);
  const [isChoosingTopic, setIsChoosingTopic] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // State: Live Session (Reused logic from PracticeMode)
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null); // To hold the active session promise
  const currentSessionObj = useRef<any>(null); // To hold the resolved session object for sending text

  // Initialization Check
  useEffect(() => {
    const profile = topicService.getProfile();
    if (profile.interests && profile.interests.length > 0) {
      setInterests(profile.interests);
      setHasSetupProfile(true);
      generateTopics(null, profile.interests); // Initial Load
    }
  }, []);

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      if (interests.length < 5) {
        setInterests([...interests, interest]);
      }
    }
  };

  const saveProfileAndStart = () => {
    topicService.saveProfile(interests, []);
    setHasSetupProfile(true);
    generateTopics(null, interests);
  };

  const generateTopics = async (prevTopic: string | null, userInterests: string[]) => {
    setIsLoadingTopics(true);
    setIsChoosingTopic(true);
    
    // Disconnect existing session while choosing
    if (connectionState === ConnectionState.CONNECTED) {
        stopSession();
    }

    const topics = await topicService.generateNextTopics(prevTopic, userInterests);
    setNextTopics(topics);
    setIsLoadingTopics(false);
  };

  const selectTopic = (topic: string) => {
    setCurrentTopic(topic);
    topicService.addSeenTopic(topic);
    setIsChoosingTopic(false);
    startSession(topic);
  };

  // --- Live Audio Logic (Similar to PracticeMode) ---
  
  const initAudio = () => {
    const InputCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    const OutputCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    inputContextRef.current = new InputCtxClass({ sampleRate: 16000 });
    outputContextRef.current = new OutputCtxClass({ sampleRate: 24000 });
  };

  const startSession = async (topic: string) => {
     if (!process.env.API_KEY) return;

     try {
      setConnectionState(ConnectionState.CONNECTING);
      initAudio();
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
          // Dynamic system instruction based on the topic
          systemInstruction: `You are an engaging conversational partner. We are discussing the topic: "${topic}". 
          Start the conversation by asking me an interesting question about this topic. 
          Keep the conversation flowing naturally. Correct me gently if I make big mistakes.`,
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Input Stream
            if (!inputContextRef.current || !streamRef.current) return;
            const ctx = inputContextRef.current;
            sourceRef.current = ctx.createMediaStreamSource(streamRef.current);
            processorRef.current = ctx.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Visualizer volume
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolumeLevel(Math.min(100, Math.sqrt(sum / inputData.length) * 500));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(ctx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputContextRef.current) {
               const ctx = outputContextRef.current;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(ctx.destination);
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
             }
             if (message.serverContent?.interrupted) nextStartTimeRef.current = 0;
          },
          onclose: () => setConnectionState(ConnectionState.DISCONNECTED),
          onerror: (err) => {
            console.error(err);
            setConnectionState(ConnectionState.ERROR);
          }
        }
      });

      sessionRef.current = sessionPromise;
      sessionPromise.then(sess => { currentSessionObj.current = sess; });

     } catch (e) {
       console.error(e);
       setConnectionState(ConnectionState.ERROR);
     }
  };

  const stopSession = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (processorRef.current && inputContextRef.current) {
      processorRef.current.disconnect();
      sourceRef.current?.disconnect();
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolumeLevel(0);
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  // --- Render Views ---

  // 1. Setup View (Interest Selection)
  if (!hasSetupProfile) {
    return (
      // enforce h-screen to ensure internal scrolling works
      <GradientBackground className="h-screen flex flex-col">
         {/* Fixed Header */}
         <div className="p-6 pb-2 flex-shrink-0 flex items-center z-10">
            <button onClick={() => setView(AppView.HOME)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="text-white" />
            </button>
            <h2 className="ml-4 text-xl font-bold">Personalize Experience</h2>
         </div>
         
         {/* Scrollable Content */}
         <div className="flex-1 overflow-y-auto min-h-0">
           <div className="px-6 py-4">
              <p className="text-slate-300 mb-6">Select 5 interests to help the AI create endless topics just for you.</p>
              {/* Added p-1 to grid container to prevent hover scale clipping */}
              <div className="grid grid-cols-2 gap-4 p-1">
                {INTERESTS_LIST.map(interest => (
                  <GlassCard 
                    key={interest} 
                    onClick={() => toggleInterest(interest)}
                    className={`
                      p-4 flex items-center justify-between transition-all duration-300
                      ${interests.includes(interest) 
                        ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                        : 'opacity-80 hover:opacity-100 hover:bg-white/10'}
                    `}
                  >
                    <span className="font-medium text-sm">{interest}</span>
                    {interests.includes(interest) && <Check size={16} className="text-cyan-300" />}
                  </GlassCard>
                ))}
              </div>
              <div className="h-8" /> {/* Bottom spacer */}
           </div>
         </div>

         {/* Fixed Footer */}
         <div className="p-6 pt-4 flex-shrink-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-20">
           <button 
             onClick={saveProfileAndStart}
             disabled={interests.length !== 5}
             className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95"
           >
             Start Endless Mode <ArrowRight size={20} />
           </button>
           <p className="text-center text-xs text-slate-500 mt-3 font-medium">{interests.length}/5 selected</p>
         </div>
      </GradientBackground>
    );
  }

  // 2. Topic Selection / Evolving View
  if (isChoosingTopic) {
     return (
      <GradientBackground className="h-screen flex flex-col relative">
        {/* Back Button - Fixed position Z-10 */}
        <div className="absolute top-6 left-6 z-20">
           <button onClick={() => setView(AppView.HOME)} className="p-2 rounded-full hover:bg-white/10">
              <ArrowLeft className="text-white" />
           </button>
        </div>

        {/* Main Content Container - Flex Column with Center Alignment */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 pt-24 w-full max-w-md mx-auto overflow-y-auto">
            <div className="text-center mb-8">
              <div className="inline-block p-4 rounded-full bg-purple-500/20 mb-4">
                <Sparkles className="text-purple-300 animate-pulse" size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {currentTopic ? "Evolving Conversation..." : "Designing your path..."}
              </h2>
              <p className="text-slate-400">Choose the next direction for your journey.</p>
            </div>

            {isLoadingTopics ? (
              <div className="flex flex-col items-center">
                <RefreshCw className="animate-spin text-cyan-400 mb-4" size={48} />
                <p className="animate-pulse text-slate-500">Consulting AI Muse...</p>
              </div>
            ) : (
              <div className="w-full space-y-3 animate-[slideIn_0.5s_ease-out]">
                {nextTopics.map((topic, idx) => (
                  <GlassCard 
                    key={idx} 
                    onClick={() => selectTopic(topic)}
                    className="p-5 flex items-center justify-between group hover:bg-white/10 transition-colors"
                  >
                    {/* Text area with proper spacing and wrapping */}
                    <span className="text-lg flex-1 mr-4 text-left leading-snug">{topic}</span>
                    {/* Icon with no shrink */}
                    <Play size={20} className="text-slate-500 group-hover:text-cyan-300 transition-colors flex-shrink-0" />
                  </GlassCard>
                ))}
              </div>
            )}
        </div>
      </GradientBackground>
     );
  }

  // 3. Active Conversation View
  return (
    <GradientBackground className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/20 backdrop-blur-md z-20">
        <button onClick={() => { stopSession(); setView(AppView.HOME); }} className="p-2 rounded-full hover:bg-white/10">
           <ArrowLeft className="text-white" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-400 uppercase tracking-widest">Current Topic</span>
          <span className="text-sm font-bold text-cyan-100 max-w-[200px] truncate text-center">{currentTopic}</span>
        </div>
        <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-full ${isMuted ? 'text-red-400' : 'text-white'}`}>
           {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>

      {/* Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
         <div className="relative w-72 h-72 flex items-center justify-center">
            {connectionState === ConnectionState.CONNECTED && (
              <>
                <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-2xl transition-all duration-75" 
                     style={{ transform: `scale(${1 + volumeLevel / 60})` }} />
                <div className="absolute inset-0 rounded-full border border-cyan-500/30 transition-all duration-75" 
                     style={{ transform: `scale(${1 + volumeLevel / 120})` }} />
              </>
            )}
            
            <div className={`w-48 h-48 rounded-full backdrop-blur-2xl flex items-center justify-center shadow-2xl border border-white/10 transition-colors duration-500
               ${connectionState === ConnectionState.CONNECTED ? 'bg-purple-900/30' : 'bg-white/5'}
               ${connectionState === ConnectionState.ERROR ? 'border-red-500/50' : ''}
            `}>
               {connectionState === ConnectionState.CONNECTED ? 
                 <Activity size={64} className="text-cyan-300 animate-pulse" /> : 
                 <LoaderSpinner state={connectionState} />
               }
            </div>
         </div>
         <p className="mt-8 text-slate-400 font-light tracking-wide">
           {connectionState === ConnectionState.CONNECTED ? "Listening..." : "Connecting..."}
         </p>
      </div>

      {/* Footer Actions */}
      <div className="p-6 pb-10">
        <GlassCard 
          onClick={() => generateTopics(currentTopic, interests)}
          className="w-full p-4 flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border-cyan-500/30"
        >
          <Sparkles size={20} className="text-yellow-200" />
          <span className="font-semibold text-lg">Evolve Topic</span>
        </GlassCard>
        <p className="text-center text-xs text-slate-500 mt-3">Tap when you're ready to switch subjects</p>
      </div>
    </GradientBackground>
  );
};

const LoaderSpinner = ({ state }: { state: ConnectionState }) => {
  if (state === ConnectionState.CONNECTING) return <RefreshCw className="animate-spin text-cyan-300" size={48} />;
  if (state === ConnectionState.ERROR) return <span className="text-red-400 text-xl">Error</span>;
  return <Volume2 className="text-slate-500" size={48} />;
}

export default EndlessMode;