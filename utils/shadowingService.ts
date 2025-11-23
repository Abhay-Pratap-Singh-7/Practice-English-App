
import { GoogleGenAI, Type, Modality } from '@google/genai';

export interface ShadowingResult {
  similarity: number;
  pronunciation: number;
  rhythm: number;
  stress: number;
  feedback: string;
}

export class ShadowingService {
  
  // 1. Generate a phrase for shadowing
  async generatePhrase(difficulty: string): Promise<string> {
    if (!process.env.API_KEY) return "The quick brown fox jumps over the lazy dog.";

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a single, engaging English sentence for a user to practice shadowing.
        Difficulty: ${difficulty}.
        The sentence should have interesting rhythm or intonation.
        Return ONLY the sentence text.`,
      });
      return response.text?.trim() || "English is a language of rhythm and flow.";
    } catch (e) {
      console.error("Phrase gen failed", e);
      return "Practice makes progress.";
    }
  }

  // 2. Generate TTS Audio
  async getTTSAudio(text: string): Promise<string | null> {
    if (!process.env.API_KEY) return null;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: {
            parts: [{ text: text }]
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      
      // Extract base64 audio
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64 || null;
    } catch (e) {
      console.error("TTS failed", e);
      return null;
    }
  }

  // 3. Analyze User Audio against Target
  async analyzeShadowing(audioBase64: string, targetText: string): Promise<ShadowingResult> {
    if (!process.env.API_KEY) return { similarity: 0, pronunciation: 0, rhythm: 0, stress: 0, feedback: "API Error" };

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                {
                    text: `Analyze the attached user audio shadowing the phrase: "${targetText}".
                    Evaluate:
                    1. Similarity (Did they say the right words?)
                    2. Pronunciation (Clarity of sounds)
                    3. Rhythm (Speed and flow)
                    4. Stress (Correct emphasis)
                    
                    Provide scores (0-100) and a brief, helpful feedback tip.
                    `
                },
                {
                    inlineData: {
                        mimeType: 'audio/wav', // Assuming MediaRecorder output is convertible/compatible or generally handled
                        data: audioBase64
                    }
                }
            ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                similarity: { type: Type.NUMBER },
                pronunciation: { type: Type.NUMBER },
                rhythm: { type: Type.NUMBER },
                stress: { type: Type.NUMBER },
                feedback: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return {
          similarity: result.similarity || 0,
          pronunciation: result.pronunciation || 0,
          rhythm: result.rhythm || 0,
          stress: result.stress || 0,
          feedback: result.feedback || "Could not analyze."
      };

    } catch (e) {
      console.error("Analysis failed", e);
      return { similarity: 0, pronunciation: 0, rhythm: 0, stress: 0, feedback: "Analysis failed. Try again." };
    }
  }
}

export const shadowingService = new ShadowingService();
