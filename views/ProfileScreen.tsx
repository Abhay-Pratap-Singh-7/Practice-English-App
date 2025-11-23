
import React, { useEffect, useState } from 'react';
import { AppView, UserIdentity, UserStats } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, Camera, Edit2, Save, User, Trophy, Clock, Zap, Book, Calendar } from 'lucide-react';
import { userService } from '../utils/userService';
import { historyService } from '../utils/historyService';
import { vocabService } from '../utils/vocabService';

interface Props {
  setView: (view: AppView) => void;
}

const ProfileScreen: React.FC<Props> = ({ setView }) => {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [vocabCount, setVocabCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([]);

  useEffect(() => {
    const user = userService.getIdentity();
    setIdentity(user);
    setEditName(user.name);
    setEditBio(user.bio);
    
    setStats(historyService.getStats());
    setVocabCount(vocabService.getVocabList().length);
    setWeeklyActivity(historyService.getWeeklyActivity());
  }, []);

  const handleSave = () => {
    if (identity) {
      const updated = { ...identity, name: editName, bio: editBio };
      userService.saveIdentity(updated);
      setIdentity(updated);
      setIsEditing(false);
    }
  };

  // Helper for day labels
  const getDayLabel = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - offset));
    return d.toLocaleDateString('en-US', { weekday: 'narrow' });
  };

  if (!identity || !stats) return null;

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
        <h2 className="ml-4 text-lg font-semibold">My Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        
        {/* 1. Identity Section */}
        <div className="flex flex-col items-center mb-8 pt-4">
            <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 p-1 shadow-2xl mb-4">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden relative">
                       {identity.avatarUrl ? (
                           <img src={identity.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                       ) : (
                           <User size={48} className="text-white/80" />
                       )}
                       {/* Hover Edit Overlay (Visual only for now) */}
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                           <Camera size={24} className="text-white" />
                       </div>
                    </div>
                </div>
            </div>

            {isEditing ? (
                <div className="flex flex-col items-center gap-3 w-full max-w-xs animate-[fadeIn_0.2s]">
                    <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-center text-xl font-bold text-white outline-none focus:border-cyan-400 w-full"
                    />
                    <input 
                        type="text" 
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-center text-sm text-slate-300 outline-none focus:border-cyan-400 w-full"
                    />
                    <button 
                        onClick={handleSave}
                        className="mt-2 flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded-full text-sm font-semibold transition-colors"
                    >
                        <Save size={16} /> Save Profile
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-1 group">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-white">{identity.name}</h1>
                        <button onClick={() => setIsEditing(true)} className="p-1 text-slate-500 hover:text-white transition-colors">
                            <Edit2 size={14} />
                        </button>
                    </div>
                    <p className="text-slate-400 text-sm">{identity.bio}</p>
                    <span className="mt-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-cyan-300">
                        {identity.level}
                    </span>
                </div>
            )}
        </div>

        {/* 2. Stats Dashboard */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            <GlassCard className="p-4 flex flex-col items-center justify-center gap-2">
                <div className="p-3 bg-orange-500/20 rounded-full text-orange-400 mb-1">
                    <Zap size={24} />
                </div>
                <span className="text-3xl font-bold">{stats.streakDays}</span>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Day Streak</span>
            </GlassCard>

            <GlassCard className="p-4 flex flex-col items-center justify-center gap-2">
                <div className="p-3 bg-blue-500/20 rounded-full text-blue-400 mb-1">
                    <Clock size={24} />
                </div>
                <span className="text-3xl font-bold">{stats.totalMinutes}m</span>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Practice Time</span>
            </GlassCard>

            <GlassCard className="p-4 flex flex-col items-center justify-center gap-2">
                <div className="p-3 bg-green-500/20 rounded-full text-green-400 mb-1">
                    <Trophy size={24} />
                </div>
                <span className="text-3xl font-bold">{stats.averageScore}</span>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Score</span>
            </GlassCard>

            <GlassCard className="p-4 flex flex-col items-center justify-center gap-2">
                <div className="p-3 bg-purple-500/20 rounded-full text-purple-400 mb-1">
                    <Book size={24} />
                </div>
                <span className="text-3xl font-bold">{vocabCount}</span>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Words Saved</span>
            </GlassCard>
        </div>

        {/* 3. Weekly Activity Chart */}
        <GlassCard className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
                <Calendar size={18} className="text-slate-400" />
                <h3 className="font-semibold text-slate-200">Weekly Activity (Minutes)</h3>
            </div>
            
            <div className="flex items-end justify-between h-32 gap-2">
                {weeklyActivity.map((minutes, idx) => {
                    // Determine height percentage (max 100%, min 10%)
                    const maxVal = Math.max(...weeklyActivity, 20); // Base max 20 mins
                    const heightPercent = Math.max((minutes / maxVal) * 100, 5);
                    const isToday = idx === 6;

                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-full relative group flex items-end justify-center h-full">
                                {/* Tooltip */}
                                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded transition-opacity whitespace-nowrap z-10">
                                    {minutes} min
                                </div>
                                {/* Bar */}
                                <div 
                                    className={`w-full rounded-t-md transition-all duration-500 ${isToday ? 'bg-cyan-500' : 'bg-white/10 group-hover:bg-white/20'}`}
                                    style={{ height: `${heightPercent}%` }}
                                />
                            </div>
                            <span className={`text-[10px] font-medium ${isToday ? 'text-cyan-400' : 'text-slate-500'}`}>
                                {getDayLabel(idx)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </GlassCard>

      </div>
    </GradientBackground>
  );
};

export default ProfileScreen;
