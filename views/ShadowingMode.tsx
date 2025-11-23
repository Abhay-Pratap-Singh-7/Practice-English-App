
import React, { useState, useRef, useEffect } from 'react';
import { AppView } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Play, Mic, Square, RefreshCw, Volume2, Activity } from 'lucide-react';
import { shadowingService, ShadowingResult } from '../utils/shadowingService';
import { decodeBase64, decodeAudioData, blobToBase64 } from '../utils/audioUtils';

interface Props {
  setView: (view: AppView) => void;
}

const ShadowingMode: React.FC<Props> = ({ setView }) => {
  // State
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [targetPhrase, setTargetPhrase] = useState<string>("");
  const [isLoadingPhrase, setIsLoadingPhrase] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ShadowingResult | null>(null);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const ttsAudioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    // Initial load
    loadNewPhrase();
    
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const loadNewPhrase = async () => {
    setIsLoadingPhrase(true);
    setResult(null);
    const phrase = await shadowingService.generatePhrase(difficulty);
    setTargetPhrase(phrase);
    
    // Pre-fetch TTS
    const base64 = await shadowingService.getTTSAudio(phrase);
    if (base64) {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        const buffer = await decodeAudioData(decodeBase64(base64), audioContextRef.current, 24000, 1);
        ttsAudioBufferRef.current = buffer;
    }
    
    setIsLoadingPhrase(false);
  };

  const playPhrase = () => {
    if (!ttsAudioBufferRef.current || !audioContextRef.current) return;
    
    setIsPlaying(true);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = ttsAudioBufferRef.current;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // or webm, gemini handles generic
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            
            await processRecording(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setResult(null);
    } catch (e) {
        console.error("Mic access denied", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  const processRecording = async (blob: Blob) => {
      setIsAnalyzing(true);
      const base64 = await blobToBase64(blob);
      const scores = await shadowingService.analyzeShadowing(base64, targetPhrase);
      setResult(scores);
      setIsAnalyzing(false);
  };

  // Helper for rendering score bars
  const ScoreBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
      <div className="mb-3">
          <div className="flex justify-between text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
              <span>{label}</span>
              <span className={value >= 80 ? 'text-green-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'}>{value}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${color}`} 
                style={{ width: `${value}%` }}
              />
          </div>
      </div>
  );

  return (
    <GradientBackground className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-black/20 backdrop-blur-md z-20 border-b border-white/5">
        <div className="flex items-center">
            <button 
            onClick={() => setView(AppView.HOME)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
            <ArrowLeft className="text-white" />
            </button>
            <h2 className="ml-4 text-lg font-semibold">Shadowing Mode</h2>
        </div>
        
        <div className="flex gap-2">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                <button
                    key={level}
                    onClick={() => { setDifficulty(level); setTimeout(loadNewPhrase, 100); }}
                    className={`text-[10px] px-2 py-1 rounded border ${difficulty === level ? 'bg-white text-black border-white' : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-400'}`}
                >
                    {level}
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center max-w-2xl mx-auto w-full">
         
         {/* Target Phrase Card */}
         <GlassCard className="w-full p-8 mb-6 flex flex-col items-center text-center min-h-[200px] justify-center relative">
            {isLoadingPhrase ? (
                <RefreshCw className="animate-spin text-cyan-400" size={32} />
            ) : (
                <>
                    <p className="text-2xl md:text-3xl font-medium leading-relaxed mb-6">
                        "{targetPhrase}"
                    </p>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={playPhrase}
                            disabled={isPlaying || !ttsAudioBufferRef.current}
                            className={`p-4 rounded-full transition-all ${isPlaying ? 'bg-cyan-500/50 scale-95' : 'bg-cyan-600 hover:bg-cyan-500 hover:scale-105 shadow-lg shadow-cyan-500/20'}`}
                        >
                            {isPlaying ? <Activity size={24} className="animate-pulse" /> : <Volume2 size={24} />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">Listen carefully to the rhythm and stress.</p>
                </>
            )}
         </GlassCard>

         {/* Recording Control */}
         <div className="mb-8 relative">
             {isRecording && (
                 <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
             )}
             <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isLoadingPhrase || isAnalyzing}
                className={`
                    relative z-10 h-24 w-24 rounded-full flex flex-col items-center justify-center border-4 transition-all
                    ${isRecording 
                        ? 'bg-red-500 border-red-400 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                        : 'bg-white/10 border-white/20 hover:bg-white/20'}
                    ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
             >
                 {isAnalyzing ? (
                     <RefreshCw className="animate-spin text-slate-300" size={32} />
                 ) : (
                     <>
                        <Mic size={32} className={isRecording ? 'text-white' : 'text-slate-300'} />
                        <span className="text-[10px] mt-1 font-bold uppercase tracking-wide text-slate-300">
                            {isRecording ? 'Release' : 'Hold'}
                        </span>
                     </>
                 )}
             </button>
         </div>

         {/* Results Area */}
         {result && (
             <GlassCard className="w-full p-6 animate-[slideIn_0.5s_ease-out]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                         <ScoreBar label="Similarity" value={result.similarity} color="bg-blue-500" />
                         <ScoreBar label="Pronunciation" value={result.pronunciation} color="bg-green-500" />
                     </div>
                     <div>
                         <ScoreBar label="Rhythm" value={result.rhythm} color="bg-purple-500" />
                         <ScoreBar label="Stress Patterns" value={result.stress} color="bg-orange-500" />
                     </div>
                 </div>
                 
                 <div className="mt-6 pt-4 border-t border-white/10">
                     <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-1 block">AI Feedback</span>
                     <p className="text-slate-200 italic">"{result.feedback}"</p>
                 </div>

                 <div className="mt-6 flex justify-center">
                     <button 
                        onClick={loadNewPhrase}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors"
                     >
                         <RefreshCw size={16} /> Next Phrase
                     </button>
                 </div>
             </GlassCard>
         )}

      </div>
    </GradientBackground>
  );
};

export default ShadowingMode;
