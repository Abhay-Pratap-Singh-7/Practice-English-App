
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { AppView, ConnectionState, SessionRecord } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Mic, MicOff, Volume2, Activity, Award, Clock, Home, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { createPcmBlob, decodeAudioData, decodeBase64 } from '../utils/audioUtils';
import { historyService } from '../utils/historyService';
import { vocabService } from '../utils/vocabService';

interface Props {
  setView: (view: AppView) => void;
}

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

const PracticeMode: React.FC<Props> = ({ setView }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState("Ready to start");
  
  // Session State
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionScore, setSessionScore] = useState<SessionRecord | null>(null);

  // Real-time Scoring State
  const [liveScore, setLiveScore] = useState(50); // Start at neutral
  const [scoreDelta, setScoreDelta] = useState<{ val: number, id: number } | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string>("");

  // Refs for audio handling
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  
  // Transcript capture for scoring
  const fullTranscriptRef = useRef<string>("");
  const currentTurnUserRef = useRef<string>("");
  const currentTurnModelRef = useRef<string>("");
  const lastModelTurnRef = useRef<string>("");

  // Initialize Audio Contexts
  const initAudio = () => {
    const InputCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    const OutputCtxClass = (window.AudioContext || (window as any).webkitAudioContext);
    
    inputContextRef.current = new InputCtxClass({ sampleRate: 16000 });
    outputContextRef.current = new OutputCtxClass({ sampleRate: 24000 });
  };

  const startSession = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setStatusMessage("API Key Missing");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setStatusMessage("Connecting to Gemini Live...");
      
      initAudio();
      
      const ai = new GoogleGenAI({ apiKey });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      fullTranscriptRef.current = ""; 
      currentTurnUserRef.current = "";
      currentTurnModelRef.current = "";
      lastModelTurnRef.current = "";
      setLiveScore(50);
      setSessionStartTime(Date.now());

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          // Enable transcription for both sides to perform real-time analysis
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: "You are a helpful, friendly English language tutor. Engage in a casual conversation. Keep responses concise and natural.",
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            setStatusMessage("Conversation Active");
            
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
            // 1. Handle Transcriptions
            const serverContent = message.serverContent;
            
            if (serverContent?.modelTurn) {
                // If model is speaking, capturing its text
                // Note: Live API usually sends audio first, transcription chunks later or turnComplete
            }

            if (serverContent?.inputTranscription?.text) {
                currentTurnUserRef.current += serverContent.inputTranscription.text;
                fullTranscriptRef.current += "User: " + serverContent.inputTranscription.text + "\n";
            }
            
            if (serverContent?.outputTranscription?.text) {
                currentTurnModelRef.current += serverContent.outputTranscription.text;
            }

            // 2. Handle Turn Completion (User finished speaking, Model finished speaking)
            // Real-time score trigger: When the USER finishes a turn, we analyze what they said vs what the model previously said.
            if (serverContent?.turnComplete) {
                // Wait, turnComplete usually signifies the MODEL is done generating.
                // But for real-time scoring of the USER, we need to know when the user stops.
                // The Live API sends a turnComplete when the model is done responding to the user.
                
                // Strategy: 
                // We have `lastModelTurnRef` (from previous exchange) and `currentTurnUserRef` (what user just said before this model response started).
                // Actually, `turnComplete` is for the model's response.
                // We can score the user's input at the start of the model's response, but `turnComplete` is safer to ensure we have context.
                // However, easier trigger: When user stops speaking, the model starts. We can try to score then, but simpler is to score whenever we have a chunk of user text and the model starts responding.
                
                // Let's use `turnComplete` to latch the Model's text for the NEXT user turn.
                if (currentTurnModelRef.current) {
                    lastModelTurnRef.current = currentTurnModelRef.current;
                    fullTranscriptRef.current += "AI: " + currentTurnModelRef.current + "\n";
                    currentTurnModelRef.current = ""; // Reset for next turn
                }
            }

            // Special Check: If the model starts sending audio, it means the user turn is effectively processed.
            // We should evaluate `currentTurnUserRef` against `lastModelTurnRef`.
            if (serverContent?.modelTurn && currentTurnUserRef.current.trim().length > 5) {
                // Analyze asynchronously
                evaluateRealTime(lastModelTurnRef.current, currentTurnUserRef.current);
                // Reset user turn buffer
                currentTurnUserRef.current = ""; 
            }

            // 3. Handle Audio Playback
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
               currentTurnModelRef.current = ""; // Clear model buffer if interrupted
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

  const evaluateRealTime = async (context: string, userResponse: string) => {
      if (!process.env.API_KEY) return;
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          // Sidecar call to analyze just this exchange
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `
                Context (AI said): "${context}"
                User Response: "${userResponse}"
                
                Task: Score the User Response based on relevance, grammar, and flow.
                Return a JSON object with:
                1. "delta": a number between -10 and +10. (Negative for errors/irrelevance, Positive for good answers).
                2. "reason": 3 word reason.
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
              
              // Hide delta after animation
              setTimeout(() => setScoreDelta(null), 2000);
          }

      } catch (e) {
          console.error("Realtime eval failed", e);
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

    // If session was active and we have a start time, proceed to score
    if (sessionStartTime && connectionState === ConnectionState.CONNECTED) {
        await analyzeSession();
    } else {
        setView(AppView.HOME);
    }
  };

  const analyzeSession = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || !fullTranscriptRef.current.trim()) {
        setView(AppView.HOME);
        return;
    }

    setIsAnalyzing(true);
    setShowResult(true);

    // Trigger Vocab Mining Async
    vocabService.mineFromTranscript(fullTranscriptRef.current);

    try {
        const ai = new GoogleGenAI({ apiKey });
        const duration = Math.round((Date.now() - (sessionStartTime || Date.now())) / 1000);

        // We use the final liveScore as a base, but let the full analysis refine it
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this transcript of an English learner's practice session.
            
            TRANSCRIPT:
            ${fullTranscriptRef.current}
            
            The user ended with a real-time tracking score of ${liveScore}/100.
            Provide a final Score (0-100) that considers this but validates against the whole conversation.
            Provide a concise 1-sentence positive feedback and 1-sentence area for improvement.`,
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

        const result = JSON.parse(response.text || `{"score": ${liveScore}, "feedback": "Session complete."}`);
        
        const record: SessionRecord = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            durationSeconds: duration,
            mode: 'PRACTICE',
            score: result.score,
            feedback: result.feedback
        };

        historyService.saveSession(record);
        setSessionScore(record);

    } catch (e) {
        console.error("Scoring failed", e);
        // Fallback
        setSessionScore({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            durationSeconds: Math.round((Date.now() - (sessionStartTime || Date.now())) / 1000),
            mode: 'PRACTICE',
            score: liveScore,
            feedback: "Session completed."
        });
    } finally {
        setIsAnalyzing(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Result Modal View
  if (showResult) {
      return (
          <GradientBackground className="flex flex-col items-center justify-center p-6">
              <GlassCard className="w-full max-w-md p-8 flex flex-col items-center animate-[slideIn_0.5s_ease-out]">
                  {isAnalyzing ? (
                      <>
                        <Activity className="text-cyan-300 animate-pulse mb-4" size={48} />
                        <h2 className="text-2xl font-bold mb-2">Analyzing Session</h2>
                        <p className="text-slate-400 text-center">Finalizing your fluency score...</p>
                      </>
                  ) : (
                      <>
                        <div className="mb-6 relative">
                             <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                             <Award size={64} className="text-yellow-300 relative z-10" />
                        </div>
                        
                        <h2 className="text-3xl font-bold mb-2">{sessionScore?.score} / 100</h2>
                        <p className="text-slate-400 uppercase tracking-widest text-sm mb-8">Session Score</p>

                        <div className="w-full bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                            <p className="text-white text-center italic">"{sessionScore?.feedback}"</p>
                        </div>

                        <div className="flex gap-6 mb-8">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Clock size={16} />
                                <span>{Math.floor((sessionScore?.durationSeconds || 0) / 60)}m {(sessionScore?.durationSeconds || 0) % 60}s</span>
                            </div>
                        </div>

                        <button 
                           onClick={() => setView(AppView.HOME)}
                           className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-semibold flex justify-center items-center gap-2 transition-colors"
                        >
                            <Home size={18} /> Return Home
                        </button>
                      </>
                  )}
              </GlassCard>
          </GradientBackground>
      );
  }

  return (
    <GradientBackground className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/20 backdrop-blur-md z-20 flex-shrink-0">
        <button 
          onClick={() => stopSession()}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="text-white" />
        </button>
        
        {/* Real-time Score Display */}
        {connectionState === ConnectionState.CONNECTED && (
             <div className="flex items-center gap-3">
                 <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/5">
                        <Zap size={14} className="text-yellow-400" />
                        <span className="font-bold text-sm text-yellow-100">{liveScore}</span>
                    </div>
                    {lastFeedback && (
                        <span className="text-[10px] text-slate-400 animate-pulse">{lastFeedback}</span>
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
        )}

        {connectionState !== ConnectionState.CONNECTED && <div className="w-10" />}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative min-h-0 overflow-hidden">
        <div className="relative w-60 h-60 flex items-center justify-center flex-shrink-0">
          {connectionState === ConnectionState.CONNECTED && (
             <>
              <div 
                className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl transition-transform duration-[50ms] ease-linear will-change-transform"
                style={{ transform: `scale(${1 + volumeLevel / 80})` }} 
              />
              <div 
                className="absolute inset-0 rounded-full border border-cyan-500/30 transition-transform duration-[50ms] ease-linear opacity-50 will-change-transform"
                style={{ transform: `scale(${1 + volumeLevel / 100})` }} 
              />
             </>
          )}

          <div className={`
            relative z-10 w-40 h-40 rounded-full backdrop-blur-xl flex flex-col items-center justify-center
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

        {/* Show status message only when NOT connected, or if there is an error */}
        {connectionState !== ConnectionState.CONNECTED && (
          <div className="mt-8 text-center z-10">
            <h3 className="text-2xl font-light text-white">{statusMessage}</h3>
            <p className="text-slate-400 mt-2 text-sm">
              Tap the microphone to begin.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 flex items-center justify-center gap-8 mb-4 flex-shrink-0">
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
              ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-100' 
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 animate-breathe animate-ripple'}
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
