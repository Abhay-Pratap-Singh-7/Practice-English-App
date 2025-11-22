
import React from 'react';
import { AppView } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { Mic, Edit3, Settings, BarChart2, Infinity } from 'lucide-react';

interface Props {
  setView: (view: AppView) => void;
}

const Home: React.FC<Props> = ({ setView }) => {
  return (
    <GradientBackground className="p-6 flex flex-col">
      {/* Header */}
      <header className="mt-8 mb-8">
        <h1 className="text-3xl font-bold mb-1">Welcome back</h1>
        <p className="text-slate-400">Ready to improve your English today?</p>
      </header>

      {/* Stats Summary (Mock) */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
        <GlassCard className="p-4 min-w-[140px] flex-1">
          <div className="text-cyan-300 mb-2"><BarChart2 size={20} /></div>
          <div className="text-2xl font-bold">12</div>
          <div className="text-xs text-slate-400">Streak Days</div>
        </GlassCard>
        <GlassCard className="p-4 min-w-[140px] flex-1">
          <div className="text-purple-300 mb-2"><Mic size={20} /></div>
          <div className="text-2xl font-bold">45m</div>
          <div className="text-xs text-slate-400">Practice Time</div>
        </GlassCard>
      </div>

      {/* Main Actions */}
      <div className="space-y-4 flex-1 overflow-y-auto pb-20">
        {/* Endless Mode Card (New Highlight) */}
        <GlassCard 
          onClick={() => setView(AppView.ENDLESS)}
          className="p-6 relative overflow-hidden group border-purple-400/30"
        >
          <div className="absolute right-0 top-0 p-32 bg-gradient-to-br from-pink-500/20 to-purple-600/0 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-colors" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold">Endless Mode</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">NEW</span>
              </div>
              <p className="text-slate-400 text-sm">Personalized conversations that never stop</p>
            </div>
            <div className="bg-pink-500/20 p-4 rounded-full text-pink-300 group-hover:scale-110 transition-transform">
              <Infinity size={28} />
            </div>
          </div>
        </GlassCard>

        <GlassCard 
          onClick={() => setView(AppView.PRACTICE)}
          className="p-6 relative overflow-hidden group"
        >
          <div className="absolute right-0 top-0 p-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/0 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-colors" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Live Practice</h3>
              <p className="text-slate-400 text-sm">Real-time voice chat with Gemini</p>
            </div>
            <div className="bg-cyan-500/20 p-4 rounded-full text-cyan-300">
              <Mic size={28} />
            </div>
          </div>
        </GlassCard>

        <GlassCard 
          onClick={() => setView(AppView.CORRECTION)}
          className="p-6 relative overflow-hidden group"
        >
          <div className="absolute right-0 top-0 p-32 bg-gradient-to-br from-purple-500/20 to-pink-500/0 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">Correction Lab</h3>
              <p className="text-slate-400 text-sm">Analyze grammar & get feedback</p>
            </div>
            <div className="bg-purple-500/20 p-4 rounded-full text-purple-300">
              <Edit3 size={28} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 w-full py-6 flex justify-center pointer-events-none">
        <button className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors pointer-events-auto backdrop-blur-sm bg-black/10">
          <Settings size={24} />
        </button>
      </div>
    </GradientBackground>
  );
};

export default Home;
