
import React, { useEffect, useState } from 'react';
import { AppView, UserStats } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { Mic, Edit3, BarChart2, Infinity, History, User } from 'lucide-react';
import { historyService } from '../utils/historyService';

interface Props {
  setView: (view: AppView) => void;
}

const Home: React.FC<Props> = ({ setView }) => {
  const [stats, setStats] = useState<UserStats>({ streakDays: 0, totalMinutes: 0, averageScore: 0, sessionsCompleted: 0 });

  useEffect(() => {
    setStats(historyService.getStats());
  }, []);

  return (
    <GradientBackground className="flex flex-col h-full">
      
      {/* Header with Padding and Icons */}
      <div className="px-6 pt-8 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Welcome back</h1>
          <p className="text-slate-400">Ready to improve your English today?</p>
        </div>
        
        {/* Right Side Actions */}
        <div className="flex gap-2">
           <button 
             onClick={() => setView(AppView.HISTORY)}
             className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-300"
           >
             <History size={20} />
           </button>
           <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-300">
             <User size={20} />
           </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 min-h-0">
        <div className="grid grid-cols-2 gap-4">
          
          {/* Stats: Streak (Top Left) */}
          <GlassCard className="p-5 flex flex-col justify-between h-32">
            <div className="text-cyan-300"><BarChart2 size={24} /></div>
            <div>
              <div className="text-2xl font-bold">{stats.streakDays}</div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Day Streak</div>
            </div>
          </GlassCard>

          {/* Stats: Time (Top Right) */}
          <GlassCard className="p-5 flex flex-col justify-between h-32">
            <div className="text-purple-300"><Mic size={24} /></div>
            <div>
              <div className="text-2xl font-bold">{stats.totalMinutes}m</div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Practice</div>
            </div>
          </GlassCard>

          {/* Feature: Endless Mode (Middle - Full Width) */}
          <GlassCard 
            onClick={() => setView(AppView.ENDLESS)}
            className="col-span-2 p-6 relative overflow-hidden group min-h-[160px] flex flex-col justify-center border-purple-400/30"
          >
             {/* Background Decor */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-pink-500/20 to-purple-600/0 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-colors" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-pink-500/20 p-3 rounded-full text-pink-300">
                  <Infinity size={24} />
                </div>
                <span className="px-2 py-1 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">NEW</span>
              </div>
              
              <h3 className="text-xl font-bold mb-1">Endless Mode</h3>
              <p className="text-slate-400 text-sm max-w-[85%]">Personalized conversations that evolve with your interests.</p>
            </div>
          </GlassCard>

          {/* Feature: Live Practice (Bottom Left) */}
          <GlassCard 
            onClick={() => setView(AppView.PRACTICE)}
            className="p-5 relative overflow-hidden group h-48 flex flex-col justify-between"
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/0 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition-colors" />
            
            <div className="relative z-10 bg-cyan-500/20 p-3 rounded-full w-fit text-cyan-300">
              <Mic size={24} />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-lg font-bold leading-tight mb-1">Live Practice</h3>
              <p className="text-slate-400 text-xs mt-1">Real-time voice chat with Gemini</p>
            </div>
          </GlassCard>

          {/* Feature: Correction Lab (Bottom Right) */}
          <GlassCard 
            onClick={() => setView(AppView.CORRECTION)}
            className="p-5 relative overflow-hidden group h-48 flex flex-col justify-between"
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/0 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors" />
            
            <div className="relative z-10 bg-purple-500/20 p-3 rounded-full w-fit text-purple-300">
              <Edit3 size={24} />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-lg font-bold leading-tight mb-1">Correction Lab</h3>
              <p className="text-slate-400 text-xs mt-1">Grammar analysis & feedback</p>
            </div>
          </GlassCard>

        </div>
      </div>
    </GradientBackground>
  );
};

export default Home;
