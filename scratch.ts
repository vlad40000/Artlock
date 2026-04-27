import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { env } from './lib/utils/env';

console.log('API Key:', env.geminiApiKey);

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

async function run() {
  try {
    console.log('Sending request with model:', env.geminiTextModel);
    const response = await ai.models.generateContent({
      model: env.geminiTextModel,
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });
    console.log(response.text);
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
