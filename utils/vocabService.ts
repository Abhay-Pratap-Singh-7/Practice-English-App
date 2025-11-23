
import { GoogleGenAI, Type } from '@google/genai';
import { VocabItem } from '../types';

const VOCAB_KEY = 'lingua_flow_vocab';

export class VocabService {
  
  getVocabList(): VocabItem[] {
    const stored = localStorage.getItem(VOCAB_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }

  saveVocabList(list: VocabItem[]) {
    localStorage.setItem(VOCAB_KEY, JSON.stringify(list));
  }

  // Get items due for review or new items
  getDailyReviewList(): VocabItem[] {
    const list = this.getVocabList();
    const now = Date.now();
    // Return items where nextReviewDate is passed, sorted by mastery level (lowest first)
    return list
      .filter(item => item.nextReviewDate <= now)
      .sort((a, b) => a.masteryLevel - b.masteryLevel);
  }

  // Update mastery based on quiz result
  updateMastery(id: string, correct: boolean) {
    const list = this.getVocabList();
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return;

    const item = list[index];
    
    if (correct) {
      item.masteryLevel = Math.min(5, item.masteryLevel + 1);
      // Simple Spaced Repetition Intervals: 1d, 3d, 7d, 14d, 30d
      const intervals = [1, 3, 7, 14, 30];
      const daysToAdd = intervals[Math.min(item.masteryLevel - 1, 4)];
      item.nextReviewDate = Date.now() + (daysToAdd * 24 * 60 * 60 * 1000);
    } else {
      item.masteryLevel = Math.max(0, item.masteryLevel - 1);
      item.nextReviewDate = Date.now(); // Review immediately/tomorrow
    }
    
    this.saveVocabList(list);
  }

  // Mine vocabulary from a session transcript
  async mineFromTranscript(transcript: string) {
    if (!process.env.API_KEY || !transcript.trim()) return;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentVocab = this.getVocabList().map(v => v.word.toLowerCase());

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this English conversation transcript. 
        Identify 3 advanced or useful vocabulary words that would improve the speaker's English.
        These could be words they used incorrectly, words they *should* have used instead of simple words, or advanced terms relevant to the topic.
        
        Transcript: "${transcript.substring(0, 5000)}"
        
        Exclude these words if found: ${currentVocab.join(', ')}.
        
        Return exactly 3 items in JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    definition: { type: Type.STRING },
                    exampleSentence: { type: Type.STRING },
                    contextFromSession: { type: Type.STRING, description: "Brief quote or context from transcript where this applies" }
                  }
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{"items": []}');
      
      if (result.items && Array.isArray(result.items)) {
        const newList = this.getVocabList();
        
        result.items.forEach((minedItem: any) => {
           // Avoid duplicates
           if (!newList.some(v => v.word.toLowerCase() === minedItem.word.toLowerCase())) {
             newList.push({
               id: Date.now() + Math.random().toString(),
               word: minedItem.word,
               definition: minedItem.definition,
               exampleSentence: minedItem.exampleSentence,
               contextFromSession: minedItem.contextFromSession,
               masteryLevel: 0,
               nextReviewDate: Date.now()
             });
           }
        });
        
        this.saveVocabList(newList);
      }

    } catch (e) {
      console.error("Vocab mining failed", e);
    }
  }
}

export const vocabService = new VocabService();
