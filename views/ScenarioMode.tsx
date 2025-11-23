
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { AppView, ConnectionState, SessionRecord, Scenario } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Mic, MicOff, Volume2, Activity, Award, Clock, Home, Briefcase, Plane, Headphones, Utensils, Users, TrendingUp } from 'lucide-react';
import { createPcmBlob, decodeAudioData, decodeBase64 } from '../utils/audioUtils';
import { historyService } from '../utils/historyService';
import { SCENARIOS } from '../utils/scenarioData';
import { vocabService } from '../utils/vocabService';

interface Props {
  setView: (view: AppView) => void;
}

const ScenarioMode: React.FC<Props> = ({ setView }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  
  // Audio State
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState("");
  
  // Session State
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionScore, setSessionScore] = useState<SessionRecord | null>(null);

  // Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const transcriptRef = useRef<string>("");

  // Helper to get icon component
  const getIcon = (iconName: string, size: number = 24) => {
    switch (iconName) {
      case 'Briefcase': return <Briefcase size={size} />;
      case 'Passport': return <Plane size={size} />;
      case 'Headset': return <Headphones size={size} />;
      case 'Utensils': return <Utensils size={size} />;
      case 'Users': return <Users size={size} />;
      case 'TrendingUp': return <TrendingUp size={size} />;
      default: return <Briefcase size={size} />;
    }
  };

  const initAudio = () => {
    const InputCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    const OutputCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    inputContextRef.current = new InputCtxClass({ sampleRate: 16000 });
    outputContextRef.current = new OutputCtxClass({ sampleRate: 24000 });
  };

  const startSession = async (scenario: Scenario) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return;

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setStatusMessage(`Starting ${scenario.title}...`);
      
      initAudio();
      
      const ai = new GoogleGenAI({ apiKey });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      transcriptRef.current = "";
      setSessionStartTime(Date.now());

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: scenario.systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            setStatusMessage("Simulation Active");
            
            if (!inputContextRef.current || !streamRef.current) return;
            const ctx = inputContextRef.current;
            sourceRef.current = ctx.createMediaStreamSource(streamRef.current);
            analyserRef.current = ctx.createAnalyser();
            analyserRef.current.fftSize = 64;
            processorRef.current = ctx.createScriptProcessor(1024, 1, 1);
            
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(processorRef.current);
            processorRef.current.connect(ctx.destination);

            const animate = () => {
                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for(let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                    const average = sum / dataArray.length;
                    const target = Math.min(100, (average / 255) * 180);
                    setVolumeLevel(prev => prev + (target - prev) * 0.2);
                }
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            animate();
            
            processorRef.current.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription?.text) {
                transcriptRef.current += "User: " + message.serverContent.inputTranscription.text + "\n";
            }
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                transcriptRef.current += "AI: " + message.serverContent.modelTurn.parts[0].text + "\n";
            }

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
    } catch (e) {
      console.error(e);
      setConnectionState(ConnectionState.ERROR);
    }
  };

  const stopSession = async () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (processorRef.current && inputContextRef.current) {
      processorRef.current.disconnect();
      sourceRef.current?.disconnect();
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolumeLevel(0);

    if (sessionStartTime) {
        await analyzeSession();
    }
  };

  const analyzeSession = async () => {
    if (!transcriptRef.current.trim()) {
        setView(AppView.HOME);
        return;
    }
    setIsAnalyzing(true);
    setShowResult(true);

    // Trigger Vocab Mining Async
    vocabService.mineFromTranscript(transcriptRef.current);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const duration = Math.round((Date.now() - (sessionStartTime || Date.now())) / 1000);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this role-play simulation of a "${selectedScenario?.title}".
            TRANSCRIPT: ${transcriptRef.current}
            
            Evaluate the user based on:
            1. Role-play accuracy (Did they stay in character? Did they achieve the goal?)
            2. Language Fluency
            
            Provide a score (0-100) and constructive feedback.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        feedback: { type: Type.STRING }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || '{"score": 0, "feedback": "Failed"}');
        
        const record: SessionRecord = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            durationSeconds: duration,
            mode: 'SCENARIO',
            topic: selectedScenario?.title,
            score: result.score,
            feedback: result.feedback
        };

        historyService.saveSession(record);
        setSessionScore(record);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  // --- Render Views ---

  // 1. Result View
  if (showResult) {
    return (
        <GradientBackground className="flex flex-col items-center justify-center p-6">
            <GlassCard className="w-full max-w-md p-8 flex flex-col items-center animate-[slideIn_0.5s_ease-out]">
                {isAnalyzing ? (
                    <>
                      <Activity className="text-cyan-300 animate-pulse mb-4" size={48} />
                      <h2 className="text-2xl font-bold mb-2">Grading Performance</h2>
                      <p className="text-slate-400 text-center">Analyzing role-play accuracy...</p>
                    </>
                ) : (
                    <>
                      <div className="mb-6 relative">
                           <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                           <Award size={64} className="text-cyan-300 relative z-10" />
                      </div>
                      
                      <h2 className="text-3xl font-bold mb-2">{sessionScore?.score} / 100</h2>
                      <p className="text-slate-400 uppercase tracking-widest text-sm mb-1">Performance Score</p>
                      <p className="text-cyan-300 font-medium mb-8">{selectedScenario?.title}</p>

                      <div className="w-full bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                          <p className="text-white text-center italic">"{sessionScore?.feedback}"</p>
                      </div>

                      <button onClick={() => setView(AppView.HOME)} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-semibold flex justify-center items-center gap-2">
                          <Home size={18} /> Return Home
                      </button>
                    </>
                )}
            </GlassCard>
        </GradientBackground>
    );
  }

  // 2. Active Session View
  if (selectedScenario && (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.CONNECTED)) {
    return (
      <GradientBackground className="h-screen flex flex-col">
        <div className="p-4 flex items-center justify-between bg-black/20 backdrop-blur-md z-20">
          <button onClick={() => stopSession()} className="p-2 rounded-full hover:bg-white/10">
             <ArrowLeft className="text-white" />
          </button>
          <div className="flex flex-col items-center">
             <span className="text-xs text-slate-400 uppercase tracking-widest">Scenario</span>
             <span className="text-sm font-bold text-cyan-100">{selectedScenario.title}</span>
          </div>
          <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-full ${isMuted ? 'text-red-400' : 'text-white'}`}>
             {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative min-h-0 overflow-hidden">
           <div className="relative w-60 h-60 flex items-center justify-center flex-shrink-0">
              <div className={`absolute inset-0 rounded-full blur-2xl transition-transform duration-100 ${volumeLevel > 5 ? 'bg-cyan-500/30' : 'bg-transparent'}`} style={{ transform: `scale(${1 + volumeLevel/80})` }} />
              <div className="relative z-10 w-40 h-40 rounded-full bg-cyan-900/40 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
                 <Activity className="text-cyan-300 animate-pulse" size={48} />
              </div>
           </div>
           {connectionState === ConnectionState.CONNECTING && (
               <p className="mt-8 text-slate-400 animate-pulse">Connecting to simulation...</p>
           )}
        </div>

        <div className="p-8 flex justify-center pb-12">
           <button onClick={() => stopSession()} className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center">
             <div className="w-6 h-6 bg-white rounded-sm" />
           </button>
        </div>
      </GradientBackground>
    );
  }

  // 3. Selection View
  return (
    <GradientBackground className="h-screen flex flex-col">
       <div className="p-6 pt-8 pb-4">
         <button onClick={() => setView(AppView.HOME)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={20} /> Back
         </button>
         <h1 className="text-3xl font-bold mb-1">Scenario Simulation</h1>
         <p className="text-slate-400">Choose a realistic situation to practice.</p>
       </div>

       <div className="flex-1 overflow-y-auto px-6 pb-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCENARIOS.map(scenario => (
                <GlassCard 
                  key={scenario.id} 
                  onClick={() => { setSelectedScenario(scenario); startSession(scenario); }}
                  className="p-5 flex items-start gap-4 group hover:bg-white/10 transition-colors border-l-4 border-l-cyan-500/50"
                >
                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-300 group-hover:scale-110 transition-transform">
                        {getIcon(scenario.icon)}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">{scenario.title}</h3>
                        <p className="text-sm text-slate-400 leading-snug mb-2">{scenario.description}</p>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            scenario.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-300' : 
                            scenario.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-300' : 
                            'bg-red-500/20 text-red-300'
                        }`}>
                            {scenario.difficulty}
                        </span>
                    </div>
                </GlassCard>
            ))}
         </div>
       </div>
    </GradientBackground>
  );
};

export default ScenarioMode;
