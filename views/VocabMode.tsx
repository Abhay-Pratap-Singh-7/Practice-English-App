
import React, { useEffect, useState } from 'react';
import { AppView, VocabItem } from '../types';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import { ArrowLeft, BookOpen, Check, X, RotateCw, Brain, Layers } from 'lucide-react';
import { vocabService } from '../utils/vocabService';

interface Props {
  setView: (view: AppView) => void;
}

const VocabMode: React.FC<Props> = ({ setView }) => {
  const [activeTab, setActiveTab] = useState<'REVIEW' | 'LIST'>('REVIEW');
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [reviewQueue, setReviewQueue] = useState<VocabItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setVocabList(vocabService.getVocabList());
    setReviewQueue(vocabService.getDailyReviewList());
  };

  const handleResult = (correct: boolean) => {
    const item = reviewQueue[currentCardIndex];
    vocabService.updateMastery(item.id, correct);
    
    setIsFlipped(false);
    
    if (currentCardIndex < reviewQueue.length - 1) {
      setTimeout(() => setCurrentCardIndex(prev => prev + 1), 200);
    } else {
      // Finished review
      setTimeout(() => {
        setReviewQueue([]);
        setCurrentCardIndex(0);
        setVocabList(vocabService.getVocabList()); // Reload main list
      }, 200);
    }
  };

  // --- Render Views ---

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
        <h2 className="ml-4 text-lg font-semibold">Vocabulary Builder</h2>
      </div>

      {/* Tabs */}
      <div className="flex p-4 gap-4 justify-center">
        <button 
          onClick={() => setActiveTab('REVIEW')}
          className={`flex-1 py-3 rounded-xl font-semibold flex justify-center items-center gap-2 transition-all ${activeTab === 'REVIEW' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <Brain size={18} /> Daily Review ({reviewQueue.length})
        </button>
        <button 
          onClick={() => setActiveTab('LIST')}
          className={`flex-1 py-3 rounded-xl font-semibold flex justify-center items-center gap-2 transition-all ${activeTab === 'LIST' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <Layers size={18} /> My List ({vocabList.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        
        {activeTab === 'REVIEW' && (
           <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto">
             {reviewQueue.length > 0 ? (
                currentCardIndex < reviewQueue.length ? (
                    <div className="w-full perspective-1000 h-[400px]">
                      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                         
                         {/* Front */}
                         <GlassCard 
                           onClick={() => setIsFlipped(true)}
                           className={`absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden border-indigo-500/30 cursor-pointer hover:border-indigo-400/50 ${isFlipped ? 'invisible' : 'visible'}`}
                         >
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4">Word</span>
                            <h3 className="text-4xl font-bold text-white text-center mb-6">{reviewQueue[currentCardIndex].word}</h3>
                            {reviewQueue[currentCardIndex].contextFromSession && (
                                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                    <p className="text-sm text-slate-400 italic text-center">"{reviewQueue[currentCardIndex].contextFromSession}"</p>
                                </div>
                            )}
                            <p className="mt-8 text-xs text-slate-500 animate-pulse">Tap to reveal definition</p>
                         </GlassCard>

                         {/* Back */}
                         <GlassCard 
                           className={`absolute inset-0 flex flex-col items-center justify-between p-8 backface-hidden rotate-y-180 border-indigo-500/30 ${isFlipped ? 'visible' : 'invisible'}`}
                         >
                            <div className="flex flex-col items-center w-full">
                                <h3 className="text-2xl font-bold text-white mb-2">{reviewQueue[currentCardIndex].word}</h3>
                                <div className="w-12 h-1 bg-indigo-500 rounded-full mb-6"></div>
                                
                                <p className="text-lg text-slate-200 text-center mb-6">{reviewQueue[currentCardIndex].definition}</p>
                                
                                <div className="w-full bg-white/5 p-4 rounded-lg border border-white/5">
                                    <span className="text-xs text-indigo-300 font-bold block mb-1">Example</span>
                                    <p className="text-sm text-slate-300 italic">{reviewQueue[currentCardIndex].exampleSentence}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 w-full mt-4">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleResult(false); }}
                                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-300 font-bold flex justify-center items-center gap-2"
                                >
                                  <X size={20} /> Hard
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleResult(true); }}
                                  className="flex-1 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl text-green-300 font-bold flex justify-center items-center gap-2"
                                >
                                  <Check size={20} /> Easy
                                </button>
                            </div>
                         </GlassCard>
                      </div>
                    </div>
                ) : null
             ) : (
                <div className="text-center p-8">
                    <div className="bg-white/5 p-6 rounded-full inline-block mb-4">
                        <Check size={48} className="text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">All Caught Up!</h3>
                    <p className="text-slate-400 mb-6">You've reviewed all your vocabulary for today.</p>
                    <button 
                       onClick={() => setActiveTab('LIST')}
                       className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-medium"
                    >
                       View Full List
                    </button>
                </div>
             )}
           </div>
        )}

        {activeTab === 'LIST' && (
           <div className="space-y-3 pb-20">
             {vocabList.length === 0 ? (
                 <div className="text-center py-12 text-slate-500">
                     <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                     <p>No words collected yet.</p>
                     <p className="text-sm mt-2">Practice speaking to mine new vocabulary!</p>
                 </div>
             ) : (
                 vocabList.map(item => (
                   <GlassCard key={item.id} className="p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                         <h3 className="text-xl font-bold text-white">{item.word}</h3>
                         <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < item.masteryLevel ? 'bg-indigo-400' : 'bg-white/10'}`} />
                            ))}
                         </div>
                      </div>
                      <p className="text-slate-300 text-sm">{item.definition}</p>
                      <p className="text-slate-500 text-xs italic border-l-2 border-white/10 pl-2 mt-1">"{item.exampleSentence}"</p>
                   </GlassCard>
                 ))
             )}
           </div>
        )}

      </div>
    </GradientBackground>
  );
};

export default VocabMode;
