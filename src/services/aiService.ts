import { GoogleGenAI } from "@google/genai";

let currentApiKeyIndex = 0;

export const getAIClient = () => {
  const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (keys.length === 0) {
    console.error("No Gemini API key found. Please set GEMINI_API_KEY in your environment.");
    return new GoogleGenAI({ apiKey: '' });
  }
  
  if (currentApiKeyIndex >= keys.length) {
    currentApiKeyIndex = 0;
  }
  
  return new GoogleGenAI({ apiKey: keys[currentApiKeyIndex] });
};

export const switchAIKey = () => {
  currentApiKeyIndex++;
  console.warn('API limit reached. Switched to the next API key.');
};

export const shouldSwitchKey = (error: any) => {
  const errMsg = error?.message?.toLowerCase() || '';
  const status = error?.status;
  if (status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('too many requests') || errMsg.includes('exhausted')) {
    switchAIKey();
    return true;
  }
  return false;
};
