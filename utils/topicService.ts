
import { GoogleGenAI, Type, Schema } from '@google/genai';

const STORAGE_KEY = 'lingua_flow_profile';

export interface TopicGenerationResult {
  topics: string[];
}

export const INTERESTS_LIST = [
  "Technology", "Travel", "Fitness", "Movies", "Cooking",
  "Business", "Science", "History", "Music", "Art",
  "Gaming", "Psychology", "Space", "Fashion", "Politics",
  "Literature", "Nature", "Photography", "Philosophy", "Sports"
];

export class TopicService {
  private ai: GoogleGenAI;

  constructor() {
    // Ensure API Key is available
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  // Local Storage Management
  getProfile(): { interests: string[]; seenTopics: string[] } {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { interests: [], seenTopics: [] };
  }

  saveProfile(interests: string[], seenTopics: string[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ interests, seenTopics }));
  }

  addSeenTopic(topic: string) {
    const profile = this.getProfile();
    if (!profile.seenTopics.includes(topic)) {
      profile.seenTopics.push(topic);
      this.saveProfile(profile.interests, profile.seenTopics);
    }
  }

  resetProfile() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // AI Topic Generation
  async generateNextTopics(
    currentTopic: string | null, 
    interests: string[], 
    historySummary?: string
  ): Promise<string[]> {
    
    const model = 'gemini-2.5-flash';
    
    let prompt = '';
    if (!currentTopic) {
      prompt = `The user is interested in: ${interests.join(', ')}. 
      Generate 5 engaging, distinct conversation starters (topics) suitable for an English learner. 
      Keep them concise (under 10 words).`;
    } else {
      prompt = `The user is interested in: ${interests.join(', ')}. 
      We just finished discussing: "${currentTopic}".
      Generate 5 new conversation sub-topics to evolve the discussion naturally.
      They should be related to the previous topic but explore specific niches or branch out to other user interests.
      Keep them concise (under 10 words).`;
    }

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topics: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      });

      const json = JSON.parse(response.text || '{"topics": []}');
      return json.topics || [];
    } catch (error) {
      console.error("Error generating topics:", error);
      // Fallback topics if API fails
      return [
        "Future of Technology", 
        "Healthy Living Habits", 
        "Travel Experiences", 
        "Favorite Movies", 
        "Career Goals"
      ];
    }
  }
}

export const topicService = new TopicService();
