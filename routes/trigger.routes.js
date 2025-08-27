import express from "express"
const router = express.Router();
import client from "../config.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import updateEmotionalState from "../services/updateEmotionalState.js"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
import getSystemPrompt from "../utils/prompts.js"

const conversations = {};
const emotionalState = {};
const callResults = {};
const callContext = {};

router.get("/trigger-call", async (req, res) => {
  try {
    const call = await client.calls.create({
      url: `${process.env.PUBLIC_URL}/voice`,
      from: process.env.TWILIO_NUMBER,
      to: process.env.USER_NUMBER,
      statusCallback: `${process.env.PUBLIC_URL}/call-status`,
      statusCallbackEvent: ['completed'],
    });
    res.json({ sid: call.sid });
  } catch (err) {
    console.error(`Trigger Call Error`, err);
    res.status(500).send("Failed to initiate call");
  }
});

router.get("/get-emotion/:callSid", (req, res) => {
  const callSid = req.params.callSid;
  const result = callResults[callSid];

  if (!result) {
    return res.status(404).json({ error: "Call not found" });
  }

  if (!result.completed) {
    return res.json({ status: "in-progress" });
  }

  res.json({ status: "completed", emotion: result.emotion });
});

router.post("/call-status", async (req, res) => {
  const callSid = req.body.CallSid;
  console.log(`[Call Status] Call completed. SID: ${callSid}`);

  const finalEmotion = emotionalState[callSid] || "NEUTRAL";
  console.log(`[Call Status] Emotional state sent: ${finalEmotion}`);

  callResults[callSid] = {
    completed: true,
    emotion: finalEmotion,
  };

  res.status(200).send("OK");
});

router.post("/voice-timeout", (req, res) => {
  const callSid = req.body.CallSid;
  console.log(`[Voice Timeout] User didn't respond. Call: ${callSid}`);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say voice="Polly.Joanna">I haven't heard from you in a while. Are you still there?</Say>
        <Gather input="speech" timeout="10" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
            <Say voice="Polly.Joanna">Please let me know if you're okay.</Say>
        </Gather>
        <Say voice="Polly.Joanna">I'll check back with you later. Please take care of yourself, and remember that support is available if you need it.</Say>
        <Hangup/>
    </Response>`;

  if (callSid) {
    endCall(callSid);
  }

  res.type("text/xml").send(twiml);
});

router.post("/process-speech", express.urlencoded({ extended: false }), async (req, res) => {
  const speechResult = req.body.SpeechResult || "";
  const callSid = req.body.CallSid;
  console.log(`[Process Speech] Call: ${callSid}, Speech: "${speechResult}"`);

  if (!speechResult.trim()) {
    return res.type("text/xml").send(`
      <Response>
        <Say voice="Polly.Joanna">I didn't catch that. Could you please tell me how you're feeling?</Say>
        <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST"/>
      </Response>`);
  }

  try {
    if (!conversations[callSid]) {
      conversations[callSid] = [];
      emotionalState[callSid] = "NEUTRAL";
    }

    conversations[callSid].push({ role: "user", content: speechResult });
    const aiResponse = await getLLMResponse(conversations[callSid], callSid);
    conversations[callSid].push({ role: "assistant", content: aiResponse });

    console.log(`[Process Speech] AI Response: "${aiResponse}"`);

    if (/\b(i am|i'm|im)\s+(ok|fine|good|alright)\b/i.test(speechResult) || conversations[callSid].length >= 12) {
      endCall(callSid);
      return res.type("text/xml").send(`
        <Response>
          <Say voice="Polly.Joanna">${aiResponse}</Say>
          <Say voice="Polly.Joanna">Take care. Goodbye!</Say>
          <Hangup/>
        </Response>`);
    }

    res.type("text/xml").send(`
      <Response>
        <Say voice="Polly.Joanna">${aiResponse}</Say>
        <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST"/>
      </Response>`);

  } catch (error) {
    console.error(`[Process Speech] Error:`, error);
    res.type("text/xml").send(`
      <Response>
        <Say voice="Polly.Joanna">I'm having trouble processing that. Please try again.</Say>
      </Response>`);
  }
});

router.post("/voice", (req, res) => {
  const callSid = req.body.CallSid;
  console.log(`[Twilio Voice Webhook] Call incoming. SID: ${callSid}`);
  if (!conversations[callSid]) {
    conversations[callSid] = [];
    emotionalState[callSid] = "NEUTRAL";
  }
  res.type("text/xml").send(`
    <Response>
      <Say voice="Polly.Joanna">Hi, this is Dr. Sarah. How are you feeling?</Say>
      <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST"/>
    </Response>`);
});


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


export function endCall(callSid) {
  console.log(`[${callSid}] Ending call...`);

  const finalState = emotionalState[callSid] || "NEUTRAL";
  callResults[callSid] = {
    status: 'completed',
    outcome: finalState,
    finalState,
    timestamp: new Date().toISOString(),
    conversationLength: conversations[callSid]?.length || 0
  };


  delete conversations[callSid];
  delete emotionalState[callSid];

  if (callContext) {
    callContext.status = 'completed';
  }

  console.log(`[${callSid}] Call ended with outcome: ${finalState}`);
}

export async function getLLMResponse(convo, callSid) {
  console.log(`[${callSid}] Sending prompt to LLM with conversation history:`, convo);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([
      getSystemPrompt(callContext, emotionalState[callSid]),
      ...convo.map(msg => msg.content).join('\n')
    ]);

    const reply = result.response.text();
    console.log(`[${callSid}] LLM replied: ${reply}`);

    await updateEmotionalState(convo, callSid);
    console.log(`[${callSid}] Updated emotional state: ${emotionalState[callSid]}`);
    return reply;
  } catch (error) {
    console.error(`[${callSid}] LLM Error:`, error);
    return "I understand you're speaking with me. Could you please repeat what you just said?";
  }
}

export default router
