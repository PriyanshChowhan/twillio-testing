import { genAI } from '../config/geminiConfig.js';
import { emotionalState } from '../state/emotionalState.js';

export async function updateEmotionalState(convo, callSid) {
  const lastUser = convo.filter(m => m.role === "user").pop();
  if (!lastUser) return;

  const prompt = `Given the user's response: "${lastUser.content}", 
Respond with ONLY one of these options:
SEVERELY_DEPRESSED
MILDLY_DEPRESSED  
NEUTRAL
POSITIVE`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const state = result.response.text().trim();

    if (["SEVERELY_DEPRESSED", "MILDLY_DEPRESSED", "NEUTRAL", "POSITIVE"].includes(state)) {
      emotionalState[callSid] = state;
    } else {
      emotionalState[callSid] = "NEUTRAL";
    }
  } catch (error) {
    console.error(`[${callSid}] Emotional state update error:`, error);
    emotionalState[callSid] = "NEUTRAL";
  }
}
