
import React, { useState } from 'react';
import { AppView } from './types';
import SplashScreen from './views/SplashScreen';
import Home from './views/Home';
import PracticeMode from './views/PracticeMode';
import CorrectionMode from './views/CorrectionMode';
import EndlessMode from './views/EndlessMode';
import HistoryScreen from './views/HistoryScreen';
import ScenarioMode from './views/ScenarioMode';
import VocabMode from './views/VocabMode';
import ShadowingMode from './views/ShadowingMode';
import ConverterMode from './views/ConverterMode';
import ProfileScreen from './views/ProfileScreen';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.SPLASH);

  const renderView = () => {
    switch (currentView) {
      case AppView.SPLASH:
        return <SplashScreen setView={setCurrentView} />;
      case AppView.HOME:
        return <Home setView={setCurrentView} />;
      case AppView.PRACTICE:
        return <PracticeMode setView={setCurrentView} />;
      case AppView.CORRECTION:
        return <CorrectionMode setView={setCurrentView} />;
      case AppView.ENDLESS:
        return <EndlessMode setView={setCurrentView} />;
      case AppView.HISTORY:
        return <HistoryScreen setView={setCurrentView} />;
      case AppView.SCENARIO:
        return <ScenarioMode setView={setCurrentView} />;
      case AppView.VOCAB:
        return <VocabMode setView={setCurrentView} />;
      case AppView.SHADOWING:
        return <ShadowingMode setView={setCurrentView} />;
      case AppView.CONVERTER:
        return <ConverterMode setView={setCurrentView} />;
      case AppView.PROFILE:
        return <ProfileScreen setView={setCurrentView} />;
      default:
        return <Home setView={setCurrentView} />;
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden">
      {renderView()}
    </main>
  );
};

export default App;
