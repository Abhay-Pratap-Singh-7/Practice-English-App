
import React, { useEffect, useState } from 'react';
import { AppView, UserStats } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { Mic, Edit3, BarChart2, Infinity, History, User, Briefcase, BookOpen, Activity, Sparkles } from 'lucide-react';
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
      
      {/* Header */}
      <div className="px-6 pt-8 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Welcome back</h1>
          <p className="text-slate-400">Ready to improve your English today?</p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => setView(AppView.HISTORY)}
             className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-300"
           >
             <History size={20} />
           </button>
           <button 
             onClick={() => setView(AppView.PROFILE)}
             className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-300"
           >
             <User size={20} />
           </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 min-h-0">
        <div className="grid grid-cols-2 gap-4">
          
          {/* Stats Cards */}
          <GlassCard className="p-5 flex flex-col justify-between h-32">
            <div className="text-cyan-300"><BarChart2 size={24} /></div>
            <div>
              <div className="text-2xl font-bold">{stats.streakDays}</div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Day Streak</div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex flex-col justify-between h-32">
            <div className="text-purple-300"><Mic size={24} /></div>
            <div>
              <div className="text-2xl font-bold">{stats.totalMinutes}m</div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Practice</div>
            </div>
          </GlassCard>

          {/* Endless Mode */}
          <GlassCard 
            onClick={() => setView(AppView.ENDLESS)}
            className="col-span-2 p-6 relative overflow-hidden group min-h-[140px] flex flex-col justify-center border-purple-400/30"
          >
            <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-pink-500/20 to-purple-600/0 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-pink-500/20 p-2 rounded-full text-pink-300">
                  <Infinity size={20} />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">POPULAR</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Endless Mode</h3>
              <p className="text-slate-400 text-xs max-w-[90%]">Personalized conversations that evolve with you.</p>
            </div>
          </GlassCard>

          {/* Idea Converter (New) - Full Width */}
          <GlassCard 
            onClick={() => setView(AppView.CONVERTER)}
            className="col-span-2 p-6 relative overflow-hidden group min-h-[140px] flex flex-col justify-center border-fuchsia-400/30"
          >
            <div className="absolute left-0 top-0 w-64 h-64 bg-gradient-to-br from-fuchsia-500/20 to-purple-600/0 rounded-full blur-3xl group-hover:bg-fuchsia-500/30 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-fuchsia-500/20 p-2 rounded-full text-fuchsia-300">
                  <Sparkles size={20} />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">MAGIC</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Idea-to-English</h3>
              <p className="text-slate-400 text-xs max-w-[90%]">Turn broken Hinglish into correct, impressive English instantly.</p>
            </div>
          </GlassCard>

          {/* Vocab Builder */}
          <GlassCard 
            onClick={() => setView(AppView.VOCAB)}
            className="col-span-2 p-6 relative overflow-hidden group min-h-[140px] flex flex-col justify-center border-indigo-400/30"
          >
            <div className="absolute left-1/2 top-0 w-64 h-64 bg-gradient-to-b from-indigo-500/20 to-blue-600/0 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors transform -translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-indigo-500/20 p-2 rounded-full text-indigo-300">
                  <BookOpen size={20} />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">DAILY</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Vocabulary Builder</h3>
              <p className="text-slate-400 text-xs max-w-[90%]">Review mined words and take daily quizzes.</p>
            </div>
          </GlassCard>

          {/* Shadowing Mode */}
          <GlassCard 
            onClick={() => setView(AppView.SHADOWING)}
            className="col-span-2 p-6 relative overflow-hidden group min-h-[140px] flex flex-col justify-center border-orange-400/30"
          >
            <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-tl from-orange-500/20 to-red-600/0 rounded-full blur-3xl group-hover:bg-orange-500/30 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-orange-500/20 p-2 rounded-full text-orange-300">
                  <Activity size={20} />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">PRO</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Conversational Shadowing</h3>
              <p className="text-slate-400 text-xs max-w-[90%]">Master rhythm, stress, and pronunciation.</p>
            </div>
          </GlassCard>

          {/* Scenario Simulation */}
          <GlassCard 
            onClick={() => setView(AppView.SCENARIO)}
            className="col-span-2 p-6 relative overflow-hidden group min-h-[140px] flex flex-col justify-center border-emerald-400/30"
          >
            <div className="absolute left-0 bottom-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/20 to-teal-600/0 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-300">
                  <Briefcase size={20} />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1">Scenario Simulation</h3>
              <p className="text-slate-400 text-xs max-w-[90%]">Role-play job interviews, restaurant orders, and more.</p>
            </div>
          </GlassCard>

          {/* Live Practice */}
          <GlassCard 
            onClick={() => setView(AppView.PRACTICE)}
            className="p-5 relative overflow-hidden group h-40 flex flex-col justify-between"
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/0 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition-colors" />
            <div className="relative z-10 bg-cyan-500/20 p-2 rounded-full w-fit text-cyan-300"><Mic size={20} /></div>
            <div className="relative z-10">
              <h3 className="text-md font-bold leading-tight mb-1">Live Chat</h3>
              <p className="text-slate-400 text-[10px]">Casual talk</p>
            </div>
          </GlassCard>

          {/* Correction Lab */}
          <GlassCard 
            onClick={() => setView(AppView.CORRECTION)}
            className="p-5 relative overflow-hidden group h-40 flex flex-col justify-between"
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/0 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors" />
            <div className="relative z-10 bg-purple-500/20 p-2 rounded-full w-fit text-purple-300"><Edit3 size={20} /></div>
            <div className="relative z-10">
              <h3 className="text-md font-bold leading-tight mb-1">Correction</h3>
              <p className="text-slate-400 text-[10px]">Fix grammar</p>
            </div>
          </GlassCard>

        </div>
      </div>
    </GradientBackground>
  );
};

export default Home;
