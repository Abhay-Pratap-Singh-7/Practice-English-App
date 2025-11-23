import React, { useEffect, useState } from 'react';
import { AppView } from '../types';
import GradientBackground from '../components/GradientBackground';
import { Mic } from 'lucide-react';

interface Props {
  setView: (view: AppView) => void;
}

const SplashScreen: React.FC<Props> = ({ setView }) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in
    setTimeout(() => setOpacity(1), 100);

    // Transition to home
    setTimeout(() => {
      setOpacity(0);
      setTimeout(() => setView(AppView.HOME), 800);
    }, 2500);
  }, [setView]);

  return (
    <GradientBackground className="flex items-center justify-center">
      <div 
        className="flex flex-col items-center transition-opacity duration-700"
        style={{ opacity }}
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-cyan-500/30 blur-xl rounded-full animate-pulse" />
          <div className="relative bg-white/10 p-6 rounded-full border border-white/20 backdrop-blur-lg">
            <Mic size={48} className="text-cyan-300" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300">
          Fluentro
        </h1>
        <p className="text-slate-400 mt-2 text-sm tracking-widest uppercase">AI English Coach</p>
      </div>
    </GradientBackground>
  );
};

export default SplashScreen;