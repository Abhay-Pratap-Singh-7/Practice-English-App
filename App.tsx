
import React, { useState } from 'react';
import { AppView } from './types';
import SplashScreen from './views/SplashScreen';
import Home from './views/Home';
import PracticeMode from './views/PracticeMode';
import CorrectionMode from './views/CorrectionMode';
import EndlessMode from './views/EndlessMode';

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
