
import { GoogleGenAI, Type } from '@google/genai';
import { ConverterResult } from '../types';

export class ConverterService {
  
  async convertText(input: string): Promise<ConverterResult | null> {
    if (!process.env.API_KEY || !input.trim()) return null;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
          You are an expert linguist and communication coach.
          
          INPUT: "${input}"
          (The input might be broken English, mixed Hindi-English/Hinglish, or just a raw idea).
          
          TASK: Transform this input into three distinct English versions:
          1. Correct: Grammatically perfect, neutral tone. Clear and simple.
          2. Impressive: Formal, professional, or sophisticated vocabulary. Good for business.
          3. Native: Casual, idiomatic, natural flow. How a native speaker would say it to a friend.
          
          Also provide a 1-sentence analysis of what was fixed.
          
          Return JSON only.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correct: { type: Type.STRING },
              impressive: { type: Type.STRING },
              native: { type: Type.STRING },
              analysis: { type: Type.STRING }
            }
          }
        }
      });

      return JSON.parse(response.text || '{}') as ConverterResult;

    } catch (e) {
      console.error("Conversion failed", e);
      return null;
    }
  }
}

export const converterService = new ConverterService();
