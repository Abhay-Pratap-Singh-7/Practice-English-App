
import React, { useEffect, useState, useRef } from 'react';
import { AppView, ConnectionState, SessionRecord } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Check, Sparkles, Play, Mic, RefreshCw, Activity, Volume2, MicOff, ArrowRight, Award, Clock, Home, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { topicService, INTERESTS_LIST } from '../utils/topicService';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { createPcmBlob, decodeAudioData, decodeBase64 } from '../utils/audioUtils';
import { historyService } from '../utils/historyService';

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

  // State: Live Session
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // State: Scoring
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionScore, setSessionScore] = useState<SessionRecord | null>(null);

  // Real-time Scoring State
  const [liveScore, setLiveScore] = useState(50);
  const [scoreDelta, setScoreDelta] = useState<{ val: number, id: number } | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string>("");

  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null); 
  const animationFrameRef = useRef<number>(0);

  // Transcript Buffers
  const fullTranscriptRef = useRef<string>("");
  const currentTurnUserRef = useRef<string>("");
  const currentTurnModelRef = useRef<string>("");
  const lastModelTurnRef = useRef<string>("");

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
    
    if (connectionState === ConnectionState.CONNECTED) {
        stopSession(false);
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

  // --- Live Audio Logic ---
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
      
      fullTranscriptRef.current = "";
      currentTurnUserRef.current = "";
      currentTurnModelRef.current = "";
      lastModelTurnRef.current = "";
      setLiveScore(50);
      setSessionStartTime(Date.now());

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
          systemInstruction: `You are an engaging conversational partner. We are discussing the topic: "${topic}". 
          Start the conversation by asking me an interesting question about this topic. 
          Keep the conversation flowing naturally. Correct me gently if I make big mistakes.`,
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            if (!inputContextRef.current || !streamRef.current) return;
            const ctx = inputContextRef.current;
            sourceRef.current = ctx.createMediaStreamSource(streamRef.current);
            
            analyserRef.current = ctx.createAnalyser();
            analyserRef.current.fftSize = 64;
            analyserRef.current.smoothingTimeConstant = 0.5;

            processorRef.current = ctx.createScriptProcessor(1024, 1, 1);
            
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(processorRef.current);
            processorRef.current.connect(ctx.destination);

            // Animation Loop
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
             const serverContent = message.serverContent;
             
             // Transcriptions
             if (serverContent?.inputTranscription?.text) {
                currentTurnUserRef.current += serverContent.inputTranscription.text;
                fullTranscriptRef.current += "User: " + serverContent.inputTranscription.text + "\n";
             }
             if (serverContent?.outputTranscription?.text) {
                 currentTurnModelRef.current += serverContent.outputTranscription.text;
             }

             // Turn Management
             if (serverContent?.turnComplete) {
                if (currentTurnModelRef.current) {
                    lastModelTurnRef.current = currentTurnModelRef.current;
                    fullTranscriptRef.current += "AI: " + currentTurnModelRef.current + "\n";
                    currentTurnModelRef.current = "";
                }
             }

             // Trigger Real-time Analysis when AI starts speaking (implying user finished)
             if (serverContent?.modelTurn && currentTurnUserRef.current.trim().length > 5) {
                evaluateRealTime(lastModelTurnRef.current, currentTurnUserRef.current);
                currentTurnUserRef.current = "";
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
             
             if (message.serverContent?.interrupted) {
                 nextStartTimeRef.current = 0;
                 currentTurnModelRef.current = "";
             }
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

  const evaluateRealTime = async (context: string, userResponse: string) => {
      if (!process.env.API_KEY) return;
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // Get profile for context
          const profile = topicService.getProfile();
          const allTopics = profile.seenTopics.join(", ") || "None";

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `
You are an English-speaking practice evaluator.

INPUTS:
- AllTopicsSoFar: ${allTopics}
- CurrentTopic: ${currentTopic || "General"}
- ContextFromAI: "${context}"
- UserResponse: "${userResponse}"

TASK:
Evaluate ONLY the UserResponse for its relevance, clarity, accuracy, and fluency **within the CurrentTopic**, while also considering whether the user is keeping continuity with AllTopicsSoFar.

SCORING RULES (MANDATORY):
1. Score must be an integer "delta" from -10 to +10.
2. Score criteria:
   - +7 to +10 → highly relevant, fluent, and clear English.
   - +3 to +6 → mostly relevant, minor issues.
   - 0 to +2  → weak but acceptable; vague or low detail.
   - -1 to -4 → partially off-topic, grammar errors, unclear meaning.
   - -5 to -10 → fully off-topic, incorrect, or non-English.
3. Relevance is judged by:
   - Whether UserResponse matches **CurrentTopic**.
   - Whether they maintain thread continuity with **AllTopicsSoFar**.
4. Fluency is judged by correctness of grammar, structure, and word choice.
5. No compliments, no extra comments. Strict evaluation only.
6. Output ONLY JSON.

OUTPUT FORMAT:
{
  "delta": number between -10 and +10,
  "reason": "exact 3-word reason"
}
              `,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        delta: { type: Type.NUMBER },
                        reason: { type: Type.STRING }
                    }
                  }
              }
          });
          
          const result = JSON.parse(response.text || '{"delta": 0, "reason": ""}');
          if (result.delta !== 0) {
              setScoreDelta({ val: result.delta, id: Date.now() });
              setLiveScore(prev => Math.max(0, Math.min(100, prev + result.delta)));
              setLastFeedback(result.reason);
              setTimeout(() => setScoreDelta(null), 2000);
          }
      } catch (e) {
          console.error("Realtime eval failed", e);
      }
  };

  const stopSession = async (shouldScore: boolean = true) => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (processorRef.current && inputContextRef.current) {
      processorRef.current.disconnect();
      sourceRef.current?.disconnect();
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolumeLevel(0);

    if (shouldScore && sessionStartTime) {
        await analyzeSession();
    }
  };

  const analyzeSession = async () => {
    if (!fullTranscriptRef.current.trim()) {
        setView(AppView.HOME);
        return;
    }

    setIsAnalyzing(true);
    setShowResult(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const duration = Math.round((Date.now() - (sessionStartTime || Date.now())) / 1000);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this transcript of an English practice session on the topic "${currentTopic}".
            TRANSCRIPT: ${fullTranscriptRef.current}
            
            The final live score was ${liveScore}.
            Provide a final score out of 100 based on engagement, vocabulary, and flow.
            Provide brief feedback.`,
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

        const result = JSON.parse(response.text || `{"score": ${liveScore}, "feedback": "Session Complete"}`);
        
        const record: SessionRecord = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            durationSeconds: duration,
            mode: 'ENDLESS',
            topic: currentTopic || 'General',
            score: result.score,
            feedback: result.feedback
        };

        historyService.saveSession(record);
        setSessionScore(record);
    } catch (e) {
        console.error(e);
        setView(AppView.HOME); // Fail gracefully
    } finally {
        setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => { 
        if (connectionState === ConnectionState.CONNECTED) stopSession(false); 
    };
  }, []);

  // --- Render Views ---

  // 1. Score Result View
  if (showResult) {
    return (
        <GradientBackground className="flex flex-col items-center justify-center p-6">
            <GlassCard className="w-full max-w-md p-8 flex flex-col items-center animate-[slideIn_0.5s_ease-out]">
                {isAnalyzing ? (
                    <>
                      <Activity className="text-purple-300 animate-pulse mb-4" size={48} />
                      <h2 className="text-2xl font-bold mb-2">Analyzing Session</h2>
                      <p className="text-slate-400 text-center">Reviewing your conversation...</p>
                    </>
                ) : (
                    <>
                      <div className="mb-6 relative">
                           <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                           <Award size={64} className="text-purple-300 relative z-10" />
                      </div>
                      
                      <h2 className="text-3xl font-bold mb-2">{sessionScore?.score} / 100</h2>
                      <p className="text-slate-400 uppercase tracking-widest text-sm mb-1">Topic Score</p>
                      <p className="text-cyan-300 font-medium mb-8">{currentTopic}</p>

                      <div className="w-full bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                          <p className="text-white text-center italic">"{sessionScore?.feedback}"</p>
                      </div>

                      <button 
                         onClick={() => setView(AppView.HOME)}
                         className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold flex justify-center items-center gap-2 transition-colors"
                      >
                          <Home size={18} /> Return Home
                      </button>
                    </>
                )}
            </GlassCard>
        </GradientBackground>
    );
  }

  // 2. Setup View (Interest Selection)
  if (!hasSetupProfile) {
    return (
      <GradientBackground className="h-screen flex flex-col">
         <div className="p-6 pb-2 flex-shrink-0 flex items-center z-10">
            <button onClick={() => setView(AppView.HOME)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="text-white" />
            </button>
            <h2 className="ml-4 text-xl font-bold">Personalize Experience</h2>
         </div>
         
         <div className="flex-1 overflow-y-auto min-h-0">
           <div className="px-6 py-4">
              <p className="text-slate-300 mb-6">Select 5 interests to help the AI create endless topics just for you.</p>
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
              <div className="h-8" />
           </div>
         </div>

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

  // 3. Topic Selection
  if (isChoosingTopic) {
     return (
      <GradientBackground className="h-screen flex flex-col relative">
        <div className="absolute top-6 left-6 z-20">
           <button onClick={() => setView(AppView.HOME)} className="p-2 rounded-full hover:bg-white/10">
              <ArrowLeft className="text-white" />
           </button>
        </div>

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
                    <span className="text-lg flex-1 mr-4 text-left leading-snug">{topic}</span>
                    <Play size={20} className="text-slate-500 group-hover:text-cyan-300 transition-colors flex-shrink-0" />
                  </GlassCard>
                ))}
              </div>
            )}
        </div>
      </GradientBackground>
     );
  }

  // 4. Active Conversation View
  return (
    <GradientBackground className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/20 backdrop-blur-md z-20">
        <button onClick={() => stopSession(true)} className="p-2 rounded-full hover:bg-white/10">
           <ArrowLeft className="text-white" />
        </button>
        
        {/* Real-time Score Display */}
        {connectionState === ConnectionState.CONNECTED ? (
             <div className="flex items-center gap-3">
                 <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/5">
                        <Zap size={14} className="text-purple-400" />
                        <span className="font-bold text-sm text-purple-100">{liveScore}</span>
                    </div>
                    {lastFeedback && (
                        <span className="text-[10px] text-slate-400 animate-pulse max-w-[120px] truncate">{lastFeedback}</span>
                    )}
                 </div>
                 
                 {/* Delta Animation */}
                 {scoreDelta && (
                     <div key={scoreDelta.id} className="absolute top-16 right-6 animate-[bounce_1s_ease-out] flex items-center font-bold text-lg">
                        {scoreDelta.val > 0 ? (
                            <span className="text-green-400 flex items-center gap-1">+{scoreDelta.val} <TrendingUp size={16} /></span>
                        ) : (
                            <span className="text-red-400 flex items-center gap-1">{scoreDelta.val} <TrendingDown size={16} /></span>
                        )}
                     </div>
                 )}
             </div>
        ) : (
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 uppercase tracking-widest">Current Topic</span>
              <span className="text-sm font-bold text-cyan-100 max-w-[200px] truncate text-center">{currentTopic}</span>
            </div>
        )}
        
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
