
export enum AppView {
  SPLASH = 'SPLASH',
  HOME = 'HOME',
  PRACTICE = 'PRACTICE',
  CORRECTION = 'CORRECTION',
  ENDLESS = 'ENDLESS',
  SETTINGS = 'SETTINGS',
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

// Endless mode specific types
export interface UserProfile {
  interests: string[];
  seenTopics: string[];
}
