
export enum AppView {
  SPLASH = 'SPLASH',
  HOME = 'HOME',
  PRACTICE = 'PRACTICE',
  CORRECTION = 'CORRECTION',
  ENDLESS = 'ENDLESS',
  SETTINGS = 'SETTINGS',
  HISTORY = 'HISTORY',
  SCENARIO = 'SCENARIO',
  VOCAB = 'VOCAB',
  SHADOWING = 'SHADOWING',
  CONVERTER = 'CONVERTER',
  PROFILE = 'PROFILE',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isCorrection?: boolean;
}

export interface AudioConfig {
  sampleRate: number;
  numChannels: number;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

// Correction mode specific types
export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

// Converter Mode Types
export interface ConverterResult {
  correct: string;
  impressive: string;
  native: string;
  analysis: string; 
}

// Endless mode specific types
export interface UserProfile {
  interests: string[];
  seenTopics: string[];
}

// User Identity for Profile
export interface UserIdentity {
  name: string;
  bio: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  avatarUrl?: string; // Optional custom avatar
}

// Scenario Mode Types
export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string; 
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  systemInstruction: string;
}

// History & Scoring Types
export interface SessionRecord {
  id: string;
  date: string; // ISO Timestamp
  durationSeconds: number;
  mode: 'PRACTICE' | 'ENDLESS' | 'SCENARIO';
  topic?: string;
  score: number; // 0-100
  feedback: string;
}

export interface UserStats {
  streakDays: number;
  totalMinutes: number;
  averageScore: number;
  sessionsCompleted: number;
}

// Vocab Types
export interface VocabItem {
  id: string;
  word: string;
  definition: string;
  exampleSentence: string;
  contextFromSession?: string; // Original context if mined
  masteryLevel: number; // 0-5 (Spaced repetition stage)
  nextReviewDate: number; // Timestamp
}
