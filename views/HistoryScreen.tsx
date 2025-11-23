
import React, { useEffect, useState } from 'react';
import { AppView, SessionRecord } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Calendar, Clock, Activity, MessageSquare } from 'lucide-react';
import { historyService } from '../utils/historyService';

interface Props {
  setView: (view: AppView) => void;
}

const HistoryScreen: React.FC<Props> = ({ setView }) => {
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useEffect(() => {
    setHistory(historyService.getHistory());
  }, []);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <GradientBackground className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center bg-black/20 backdrop-blur-md z-20 border-b border-white/5 sticky top-0">
        <button 
          onClick={() => setView(AppView.HOME)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="text-white" />
        </button>
        <h2 className="ml-4 text-lg font-semibold">Session History</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Activity size={48} className="mb-4 opacity-50" />
            <p>No sessions recorded yet.</p>
            <button 
              onClick={() => setView(AppView.PRACTICE)}
              className="mt-4 text-cyan-300 hover:text-cyan-200 text-sm font-medium"
            >
              Start your first practice
            </button>
          </div>
        ) : (
          history.map((record) => (
            <GlassCard key={record.id} className="p-5 animate-[slideIn_0.3s_ease-out]">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${record.mode === 'ENDLESS' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}`}>
                      {record.mode}
                    </span>
                    {record.topic && (
                      <span className="text-xs text-slate-400 truncate max-w-[150px]">
                         • {record.topic}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-slate-400 text-xs gap-3 mt-2">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(record.date)}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {Math.floor(record.durationSeconds / 60)}m {record.durationSeconds % 60}s</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`text-2xl font-bold ${record.score >= 80 ? 'text-green-400' : record.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {record.score}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Score</span>
                </div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="flex gap-2 items-start">
                  <MessageSquare size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-300 italic leading-snug">"{record.feedback}"</p>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </GradientBackground>
  );
};

export default HistoryScreen;
