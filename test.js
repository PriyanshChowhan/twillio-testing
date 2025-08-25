// // import express from 'express';
// // import http from 'http';
// // import { WebSocketServer } from 'ws';
// // import dotenv from 'dotenv';
// // import { GoogleGenerativeAI } from "@google/generative-ai";
// // import twilio from 'twilio';

// // const app = express();
// // const server = http.createServer(app);
// // const wss = new WebSocketServer({ server });
// // const PORT = process.env.PORT || 3000;
// // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// // // Twilio client
// // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// // // --- In-memory storage ---
// // let callContext = null;
// // let callResult = null;
// // const conversations = {};
// // const transcripts = {};
// // const emotionalState = {};

// // // --- Generate vitals context ---
// // function generateVitalsContext(vitals, alertType) {
// //   const { heart_rate, spo2, stress_level } = vitals;
// //   let concerns = [];
// //   if (alertType === "high_alert") {
// //     if (heart_rate > 110 || heart_rate < 50) concerns.push(`HR=${heart_rate}`);
// //     if (spo2 < 93) concerns.push(`SpO2=${spo2}%`);
// //     if (stress_level > 60) concerns.push(`Stress=${stress_level}`);
// //   }
// //   return { 
// //     concernText: concerns.join(" and ") || "vital sign changes", 
// //     severity: alertType === "high_alert" ? "severe" : "moderate" 
// //   };
// // }

// // // --- Build system prompt ---
// // const getSystemPrompt = (context, currentEmotionalState) => {
// //     const { concernText, severity } = context.vitalsContext;

// //     return `You are Dr. Sarah, a licensed therapist working with a patient monitoring system. You've been automatically contacted because the patient's biometric monitoring system detected concerning vital signs.

// // ALERT CONTEXT: 
// // - Specific Concerns: ${concernText}

// // CURRENT EMOTIONAL ASSESSMENT: ${currentEmotionalState || 'Initial assessment pending'}

// // THERAPEUTIC APPROACH:
// // - This is an emergency wellness check triggered by vital sign alerts
// // - Be professionally concerned but not alarmist
// // - Acknowledge the specific vital signs that triggered this call
// // - Assess if the vital changes correlate with emotional/psychological distress
// // - Use gentle probing to understand what might be causing these physiological changes
// // - Look for connections between physical symptoms and mental state

// // CONVERSATION STYLE:
// // - Start by explaining this is an automated wellness check due to concerning vitals
// // - Be specific about what the monitoring detected: "${concernText}"
// // - Ask about current activities, stressors, or events that might explain the vital changes
// // - Assess both physical comfort and emotional wellbeing
// // - If severe distress is detected, guide toward immediate care resources

// // Keep responses concise but thorough (2-3 sentences max per response).`;
// // };
// // // --- Get LLM response ---
// // async function getLLMResponse(convo, streamSid) {
// //   const prompt = [
// //     { role: "system", content: getSystemPrompt(callContext, emotionalState[streamSid]) },
// //     ...convo
// //   ].map(m => `${m.role}: ${m.content}`).join("\n");

// //   const result = await genAI.generateContent(prompt);
// //   const reply = (await result.response).text();

// //   await updateEmotionalState(convo, streamSid);
// //   return reply;
// // }

// // // --- Update emotional state ---
// // async function updateEmotionalState(convo, streamSid) {
// //   const lastUser = convo.filter(m => m.role === "user").pop();
// //   if (!lastUser) return;

// //   const prompt = `Given the user's response: "${lastUser.content}", 
// // Respond with ONLY:
// // {"emotional_state": "SEVERELY_DEPRESSED|MILDLY_DEPRESSED|NEUTRAL|POSITIVE"}`;

// //   try {
// //     const result = await genAI.generateContent(prompt);
// //     const state = (await result.response).text().trim();
// //     emotionalState[streamSid] = ["SEVERELY_DEPRESSED", "MILDLY_DEPRESSED", "NEUTRAL", "POSITIVE"].includes(state)
// //       ? state
// //       : "NEUTRAL";
// //   } catch {
// //     emotionalState[streamSid] = "NEUTRAL";
// //   }
// // }

// // // --- Start therapeutic call ---
// // app.post("/start-therapeutic-call", express.json(), (req, res) => {
// //   const { vitalData, alertType, phoneNumber } = req.body;
// //   if (!vitalData || !alertType) return res.status(400).json({ error: "Missing fields" });

// //   const vitalsContext = generateVitalsContext(vitalData, alertType);
// //   callContext = { vitalData, alertType, vitalsContext, phoneNumber, status: 'initiated' };
// //   callResult = { status: 'initiated', outcome: null, finalState: null };

// //   res.json({ success: true, vitalsContext: vitalsContext.concernText });
// // });

// // // --- Twilio webhook ---
// // app.post("/voice", (req, res) => {
// //   const host = process.env.PUBLIC_URL; // Railway URL
// //   const twiml = `
// //   <Response>
// //     <Start>
// //       <Stream url="wss://${host}/media" />
// //     </Start>
// //     <Say voice="Polly.Joanna">
// //       Hi, this is your AI assistant. How can I help you today?
// //     </Say>
// //     <Pause length="300"/> 
// //   </Response>`;
// //   res.type("text/xml").send(twiml);
// // });

// // // --- Trigger outbound call ---
// // app.get("/trigger-call", async (req, res) => {
// //   try {
// //     const call = await client.calls.create({
// //       url: `${process.env.PUBLIC_URL}/voice`,
// //       from: process.env.TWILIO_NUMBER,
// //       to: process.env.USER_NUMBER
// //     });
// //     res.send(`Call started! SID: ${call.sid}`);
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).send("Failed to initiate call");
// //   }
// // });

// // // --- WebSocket handler ---
// // wss.on("connection", (ws) => {
// //   ws.on("message", async (msg) => {
// //     const data = JSON.parse(msg.toString());
// //     const streamSid = data.streamSid || "default";

// //     if (data.event === "start") {
// //       transcripts[streamSid] = "";
// //       callContext.status = 'connected';
// //       conversations[streamSid] = [];
// //       emotionalState[streamSid] = "NEUTRAL";
// //       callContext.timer = setTimeout(() => endCall(streamSid), 300 * 1000);
// //     }

// //     if (data.event === "transcription") {
// //       transcripts[streamSid] += " " + (data.transcription?.text || "");
// //     }

// //     if (data.event === "transcription_completed") {
// //       const text = transcripts[streamSid].trim();
// //       if (!text) return;

// //       conversations[streamSid].push({ role: "user", content: text });

// //       if (/i am ok/i.test(text)) {
// //         return endCall(streamSid);
// //       }

// //       const reply = await getLLMResponse(conversations[streamSid], streamSid);
// //       conversations[streamSid].push({ role: "assistant", content: reply });
// //       ws.send(JSON.stringify({ event: "say", streamSid, text: reply }));
// //       transcripts[streamSid] = "";
// //     }

// //     if (data.event === "stop") {
// //       endCall(streamSid);
// //     }
// //   });
// // });

// // // --- End call ---
// // function endCall(streamSid) {
// //   if (!callContext) return;
// //   if (callContext.timer) clearTimeout(callContext.timer);

// //   const finalState = emotionalState[streamSid] || "NEUTRAL";
// //   callResult = { status: 'completed', outcome: finalState, finalState };

// //   delete transcripts[streamSid];
// //   delete conversations[streamSid];
// //   delete emotionalState[streamSid];
// //   callContext = null;

// //   console.log(`[${streamSid}] Call ended with outcome: ${finalState}`);
// // }

// // // --- Health check ---
// // app.get("/health", (req, res) => res.json({ status: "healthy", callResult }));

// // server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// // import express from 'express';
// // import http from 'http';
// // import { WebSocketServer } from 'ws';
// // import dotenv from 'dotenv';
// // import { GoogleGenerativeAI } from "@google/generative-ai";
// // import twilio from 'twilio';

// // dotenv.config();

// // const app = express();
// // const server = http.createServer(app);
// // const wss = new WebSocketServer({ server });
// // const PORT = process.env.PORT || 3000;
// // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// // // Twilio client
// // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// // // --- In-memory storage ---
// // let callContext = null;
// // let callResult = null;
// // const conversations = {};
// // const transcripts = {};
// // const emotionalState = {};
// // const lastTranscriptTime = {}; // Track last transcription timestamp

// // // --- Generate vitals context ---
// // function generateVitalsContext(vitals, alertType) {
// //     const { heart_rate, spo2, stress_level } = vitals;
// //     let concerns = [];
// //     if (alertType === "high_alert") {
// //         if (heart_rate > 110 || heart_rate < 50) concerns.push(`HR=${heart_rate}`);
// //         if (spo2 < 93) concerns.push(`SpO2=${spo2}%`);
// //         if (stress_level > 60) concerns.push(`Stress=${stress_level}`);
// //     }
// //     return { 
// //         concernText: concerns.join(" and ") || "vital sign changes", 
// //         severity: alertType === "high_alert" ? "severe" : "moderate" 
// //     };
// // }

// // // --- Build system prompt ---
// // const getSystemPrompt = (context, currentEmotionalState) => {
// //     const { concernText } = context.vitalsContext;
// //     return `You are Dr. Sarah, a licensed therapist working with a patient monitoring system. 
// // ALERT CONTEXT: 
// // - Specific Concerns: ${concernText}

// // CURRENT EMOTIONAL ASSESSMENT: ${currentEmotionalState || 'Initial assessment pending'}

// // THERAPEUTIC APPROACH:
// // - This is an emergency wellness check triggered by vital sign alerts
// // - Be professionally concerned but not alarmist
// // - Acknowledge the specific vital signs that triggered this call
// // - Assess if the vital changes correlate with emotional/psychological distress
// // - Use gentle probing to understand what might be causing these physiological changes
// // - Look for connections between physical symptoms and mental state

// // CONVERSATION STYLE:
// // - Start by explaining this is an automated wellness check due to concerning vitals
// // - Be specific about what the monitoring detected: "${concernText}"
// // - Ask about current activities, stressors, or events that might explain the vital changes
// // - Assess both physical comfort and emotional wellbeing
// // - If severe distress is detected, guide toward immediate care resources

// // Keep responses concise but thorough (2-3 sentences max per response).`;
// // };

// // // --- Get LLM response ---
// // async function getLLMResponse(convo, streamSid) {
// //     const result = await genAI.generateContent({
// //         model: "gemini-2.5-flash",
// //         messages: [
// //             { role: "system", content: getSystemPrompt(callContext, emotionalState[streamSid]) },
// //             ...convo
// //         ]
// //     });
// //     const reply = (await result.response).text();

// //     await updateEmotionalState(convo, streamSid);
// //     return reply;
// // }

// // // --- Update emotional state ---
// // async function updateEmotionalState(convo, streamSid) {
// //     const lastUser = convo.filter(m => m.role === "user").pop();
// //     if (!lastUser) return;

// //     const prompt = `Given the user's response: "${lastUser.content}", 
// // Respond with ONLY:
// // {"emotional_state": "SEVERELY_DEPRESSED|MILDLY_DEPRESSED|NEUTRAL|POSITIVE"}`;

// //     try {
// //         const result = await genAI.generateContent({ model: "gemini-2", messages: [{ role: "user", content: prompt }] });
// //         const state = (await result.response).text().trim();
// //         emotionalState[streamSid] = ["SEVERELY_DEPRESSED", "MILDLY_DEPRESSED", "NEUTRAL", "POSITIVE"].includes(state)
// //             ? state
// //             : "NEUTRAL";
// //     } catch {
// //         emotionalState[streamSid] = "NEUTRAL";
// //     }
// // }

// // // --- Start therapeutic call ---
// // app.post("/start-therapeutic-call", express.json(), (req, res) => {
// //     const { vitalData, alertType, phoneNumber } = req.body;
// //     if (!vitalData || !alertType) return res.status(400).json({ error: "Missing fields" });

// //     const vitalsContext = generateVitalsContext(vitalData, alertType);
// //     callContext = { vitalData, alertType, vitalsContext, phoneNumber, status: 'initiated' };
// //     callResult = { status: 'initiated', outcome: null, finalState: null };

// //     res.json({ success: true, vitalsContext: vitalsContext.concernText });
// // });

// // // --- Twilio webhook ---
// // app.post("/voice", (req, res) => {
// //     const host = process.env.PUBLIC_URL; 
// //     const twiml = `
// //     <Response>
// //       <Start>
// //         <Stream url="wss://${host}/media" />
// //       </Start>
// //       <Say voice="Polly.Joanna">
// //         Hi, this is your AI assistant. How can I help you today?
// //       </Say>
// //       <Pause length="300"/>
// //     </Response>`;
// //     res.type("text/xml").send(twiml);
// // });

// // // --- Trigger outbound call ---
// // app.get("/trigger-call", async (req, res) => {
// //     try {
// //         const call = await client.calls.create({
// //             url: `${process.env.PUBLIC_URL}/voice`,
// //             from: process.env.TWILIO_NUMBER,
// //             to: process.env.USER_NUMBER
// //         });
// //         res.send(`Call started! SID: ${call.sid}`);
// //     } catch (err) {
// //         console.error(err);
// //         res.status(500).send("Failed to initiate call");
// //     }
// // });

// // // --- WebSocket handler ---
// // wss.on("connection", (ws) => {
// //     ws.on("message", async (msg) => {
// //         const data = JSON.parse(msg.toString());
// //         const streamSid = data.streamSid || "default";

// //         if (data.event === "start") {
// //             transcripts[streamSid] = "";
// //             conversations[streamSid] = [];
// //             emotionalState[streamSid] = "NEUTRAL";
// //             lastTranscriptTime[streamSid] = Date.now();
// //             callContext.status = 'connected';

// //             // Auto-end call after 5 min
// //             callContext.timer = setTimeout(() => endCall(streamSid), 300 * 1000);
// //         }

// //         if (data.event === "transcription") {
// //             transcripts[streamSid] += " " + (data.transcription?.text || "");
// //             lastTranscriptTime[streamSid] = Date.now();
// //         }

// //         if (data.event === "stop") {
// //             endCall(streamSid);
// //         }
// //     });
// // });

// // // --- Pause-aware LLM responder ---
// // setInterval(async () => {
// //     const now = Date.now();
// //     for (const streamSid in transcripts) {
// //         if (!transcripts[streamSid]) continue;

// //         // If user paused for 2 seconds
// //         if (now - (lastTranscriptTime[streamSid] || 0) > 2000) {
// //             const text = transcripts[streamSid].trim();
// //             if (!text) continue;

// //             conversations[streamSid].push({ role: "user", content: text });
// //             transcripts[streamSid] = "";

// //             const reply = await getLLMResponse(conversations[streamSid], streamSid);
// //             conversations[streamSid].push({ role: "assistant", content: reply });

// //             wss.clients.forEach(ws => {
// //                 ws.send(JSON.stringify({ event: "say", streamSid, text: reply }));
// //             });

// //             // End call if user says "I am ok"
// //             if (/i am ok/i.test(text)) endCall(streamSid);
// //         }
// //     }
// // }, 500);

// // // --- End call ---
// // function endCall(streamSid) {
// //     if (!callContext) return;
// //     if (callContext.timer) clearTimeout(callContext.timer);

// //     const finalState = emotionalState[streamSid] || "NEUTRAL";
// //     callResult = { status: 'completed', outcome: finalState, finalState };

// //     delete transcripts[streamSid];
// //     delete conversations[streamSid];
// //     delete emotionalState[streamSid];
// //     delete lastTranscriptTime[streamSid];
// //     callContext = null;

// //     console.log(`[${streamSid}] Call ended with outcome: ${finalState}`);
// // }

// // // --- Health check ---
// // app.get("/health", (req, res) => res.json({ status: "healthy", callResult }));

// // server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// import express from 'express';
// import http from 'http';
// import { WebSocketServer } from 'ws';
// import dotenv from 'dotenv';
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import twilio from 'twilio';

// dotenv.config();

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// const PORT = process.env.PORT || 3000;
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// // Twilio client
// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// // --- In-memory storage ---
// let callContext = null;
// let callResult = null;
// const conversations = {};
// const transcripts = {};
// const emotionalState = {};
// const lastTranscriptTime = {}; // Track last transcription timestamp

// // --- Generate vitals context ---
// function generateVitalsContext(vitals, alertType) {
//     const { heart_rate, spo2, stress_level } = vitals;
//     let concerns = [];
//     if (alertType === "high_alert") {
//         if (heart_rate > 110 || heart_rate < 50) concerns.push(`HR=${heart_rate}`);
//         if (spo2 < 93) concerns.push(`SpO2=${spo2}%`);
//         if (stress_level > 60) concerns.push(`Stress=${stress_level}`);
//     }
//     return { 
//         concernText: concerns.join(" and ") || "vital sign changes", 
//         severity: alertType === "high_alert" ? "severe" : "moderate" 
//     };
// }

// // --- Build system prompt ---
// const getSystemPrompt = (context, currentEmotionalState) => {
//     const { concernText } = context.vitalsContext;
//     return `You are Dr. Sarah, a licensed therapist working with a patient monitoring system. 
// ALERT CONTEXT: 
// - Specific Concerns: ${concernText}

// CURRENT EMOTIONAL ASSESSMENT: ${currentEmotionalState || 'Initial assessment pending'}

// THERAPEUTIC APPROACH:
// - This is an emergency wellness check triggered by vital sign alerts
// - Be professionally concerned but not alarmist
// - Acknowledge the specific vital signs that triggered this call
// - Assess if the vital changes correlate with emotional/psychological distress
// - Use gentle probing to understand what might be causing these physiological changes
// - Look for connections between physical symptoms and mental state

// CONVERSATION STYLE:
// - Start by explaining this is an automated wellness check due to concerning vitals
// - Be specific about what the monitoring detected: "${concernText}"
// - Ask about current activities, stressors, or events that might explain the vital changes
// - Assess both physical comfort and emotional wellbeing
// - If severe distress is detected, guide toward immediate care resources

// Keep responses concise but thorough (2-3 sentences max per response).`;
// };

// // --- Get LLM response ---
// async function getLLMResponse(convo, streamSid) {
//     console.log(`[${streamSid}] Sending prompt to LLM with conversation history:`, convo);
//     const result = await genAI.generateContent({
//         model: "gemini-2.5-flash",
//         messages: [
//             { role: "system", content: getSystemPrompt(callContext, emotionalState[streamSid]) },
//             ...convo
//         ]
//     });
//     const reply = (await result.response).text();
//     console.log(`[${streamSid}] LLM replied: ${reply}`);

//     await updateEmotionalState(convo, streamSid);
//     console.log(`[${streamSid}] Updated emotional state: ${emotionalState[streamSid]}`);
//     return reply;
// }

// // --- Update emotional state ---
// async function updateEmotionalState(convo, streamSid) {
//     const lastUser = convo.filter(m => m.role === "user").pop();
//     if (!lastUser) return;

//     const prompt = `Given the user's response: "${lastUser.content}", 
// Respond with ONLY:
// {"emotional_state": "SEVERELY_DEPRESSED|MILDLY_DEPRESSED|NEUTRAL|POSITIVE"}`;

//     try {
//         const result = await genAI.generateContent({ model: "gemini-2", messages: [{ role: "user", content: prompt }] });
//         const state = (await result.response).text().trim();
//         emotionalState[streamSid] = ["SEVERELY_DEPRESSED", "MILDLY_DEPRESSED", "NEUTRAL", "POSITIVE"].includes(state)
//             ? state
//             : "NEUTRAL";
//     } catch {
//         emotionalState[streamSid] = "NEUTRAL";
//     }
// }

// // --- Start therapeutic call ---
// app.post("/start-therapeutic-call", express.json(), (req, res) => {
//     const { vitalData, alertType, phoneNumber } = req.body;
//     if (!vitalData || !alertType) return res.status(400).json({ error: "Missing fields" });

//     const vitalsContext = generateVitalsContext(vitalData, alertType);
//     callContext = { vitalData, alertType, vitalsContext, phoneNumber, status: 'initiated' };
//     callResult = { status: 'initiated', outcome: null, finalState: null };

//     console.log(`[Therapeutic Call Started] Vitals: ${JSON.stringify(vitalsContext)}, Phone: ${phoneNumber}`);
//     res.json({ success: true, vitalsContext: vitalsContext.concernText });
// });

// // --- Twilio webhook ---
// app.post("/voice", (req, res) => {
//     const host = process.env.PUBLIC_URL; 
//     const twiml = `
//     <Response>
//       <Start>
//         <Stream url="wss://${host}/media" />
//       </Start>
//       <Say voice="Polly.Joanna">
//         Hi, this is your AI assistant. How can I help you today?
//       </Say>
//       <Pause length="300"/>
//     </Response>`;
//     console.log(`[Twilio Voice Webhook] Call incoming`);
//     res.type("text/xml").send(twiml);
// });

// // --- Trigger outbound call ---
// app.get("/trigger-call", async (req, res) => {
//     try {
//         const call = await client.calls.create({
//             url: `${process.env.PUBLIC_URL}/voice`,
//             from: process.env.TWILIO_NUMBER,
//             to: process.env.USER_NUMBER
//         });
//         console.log(`[Trigger Call] Call initiated. SID: ${call.sid}`);
//         res.send(`Call started! SID: ${call.sid}`);
//     } catch (err) {
//         console.error(`[Trigger Call Error]`, err);
//         res.status(500).send("Failed to initiate call");
//     }
// });

// // --- WebSocket handler ---
// wss.on("connection", (ws) => {
//     console.log(`[WebSocket] Client connected`);
//     ws.on("message", async (msg) => {
//         const data = JSON.parse(msg.toString());
//         const streamSid = data.streamSid || "default";

//         if (data.event === "start") {
//             transcripts[streamSid] = "";
//             conversations[streamSid] = [];
//             emotionalState[streamSid] = "NEUTRAL";
//             lastTranscriptTime[streamSid] = Date.now();
//             callContext.status = 'connected';

//             console.log(`[${streamSid}] Call started via WebSocket`);

//             // Auto-end call after 5 min
//             callContext.timer = setTimeout(() => endCall(streamSid), 300 * 1000);
//         }

//         if (data.event === "transcription") {
//             transcripts[streamSid] += " " + (data.transcription?.text || "");
//             lastTranscriptTime[streamSid] = Date.now();
//             console.log(`[${streamSid}] Received transcription chunk: "${data.transcription?.text || ''}"`);
//         }

//         if (data.event === "stop") {
//             console.log(`[${streamSid}] Stop event received`);
//             endCall(streamSid);
//         }
//     });
// });

// // --- Pause-aware LLM responder ---
// setInterval(async () => {
//     const now = Date.now();
//     for (const streamSid in transcripts) {
//         if (!transcripts[streamSid]) continue;

//         // If user paused for 2 seconds
//         if (now - (lastTranscriptTime[streamSid] || 0) > 2000) {
//             const text = transcripts[streamSid].trim();
//             if (!text) continue;

//             console.log(`[${streamSid}] User paused, sending chunk to LLM: "${text}"`);
//             conversations[streamSid].push({ role: "user", content: text });
//             transcripts[streamSid] = "";

//             const reply = await getLLMResponse(conversations[streamSid], streamSid);
//             conversations[streamSid].push({ role: "assistant", content: reply });

//             wss.clients.forEach(ws => {
//                 ws.send(JSON.stringify({ event: "say", streamSid, text: reply }));
//             });

//             // End call if user says "I am ok"
//             if (/i am ok/i.test(text)) endCall(streamSid);
//         }
//     }
// }, 500);

// // --- End call ---
// function endCall(streamSid) {
//     if (!callContext) return;
//     if (callContext.timer) clearTimeout(callContext.timer);

//     const finalState = emotionalState[streamSid] || "NEUTRAL";
//     callResult = { status: 'completed', outcome: finalState, finalState };

//     delete transcripts[streamSid];
//     delete conversations[streamSid];
//     delete emotionalState[streamSid];
//     delete lastTranscriptTime[streamSid];
//     callContext = null;

//     console.log(`[${streamSid}] Call ended with outcome: ${finalState}`);
// }

// // --- Health check ---
// app.get("/health", (req, res) => res.json({ status: "healthy", callResult }));

// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import twilio from 'twilio';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// --- In-memory storage ---
let callContext = null;
let callResult = null;
const conversations = {};
const transcripts = {};
const emotionalState = {};
const lastTranscriptTime = {}; // Track last transcription timestamp
const activeConnections = {}; // Track WebSocket connections by streamSid

// --- Generate vitals context ---
function generateVitalsContext(vitals, alertType) {
    const { heart_rate, spo2, stress_level } = vitals;
    let concerns = [];
    if (alertType === "high_alert") {
        if (heart_rate > 110 || heart_rate < 50) concerns.push(`HR=${heart_rate}`);
        if (spo2 < 93) concerns.push(`SpO2=${spo2}%`);
        if (stress_level > 60) concerns.push(`Stress=${stress_level}`);
    }
    return { 
        concernText: concerns.join(" and ") || "vital sign changes", 
        severity: alertType === "high_alert" ? "severe" : "moderate" 
    };
}

// --- Build system prompt ---
const getSystemPrompt = (context, currentEmotionalState) => {
    const contextText = context?.vitalsContext?.concernText || "wellness check";
    return `You are Dr. Sarah, a licensed therapist working with a patient monitoring system. 
ALERT CONTEXT: 
- Specific Concerns: ${contextText}

CURRENT EMOTIONAL ASSESSMENT: ${currentEmotionalState || 'Initial assessment pending'}

THERAPEUTIC APPROACH:
- This is an emergency wellness check triggered by vital sign alerts
- Be professionally concerned but not alarmist
- Acknowledge the specific vital signs that triggered this call
- Assess if the vital changes correlate with emotional/psychological distress
- Use gentle probing to understand what might be causing these physiological changes
- Look for connections between physical symptoms and mental state

CONVERSATION STYLE:
- Start by explaining this is an automated wellness check due to concerning vitals
- Be specific about what the monitoring detected: "${contextText}"
- Ask about current activities, stressors, or events that might explain the vital changes
- Assess both physical comfort and emotional wellbeing
- If severe distress is detected, guide toward immediate care resources

Keep responses concise but thorough (2-3 sentences max per response).`;
};

// --- Get LLM response ---
async function getLLMResponse(convo, streamSid) {
    console.log(`[${streamSid}] Sending prompt to LLM with conversation history:`, convo);
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
            getSystemPrompt(callContext, emotionalState[streamSid]),
            ...convo.map(msg => msg.content).join('\n')
        ]);
        
        const reply = result.response.text();
        console.log(`[${streamSid}] LLM replied: ${reply}`);

        await updateEmotionalState(convo, streamSid);
        console.log(`[${streamSid}] Updated emotional state: ${emotionalState[streamSid]}`);
        return reply;
    } catch (error) {
        console.error(`[${streamSid}] LLM Error:`, error);
        return "I understand you're speaking with me. Could you please repeat what you just said?";
    }
}

// --- Update emotional state ---
async function updateEmotionalState(convo, streamSid) {
    const lastUser = convo.filter(m => m.role === "user").pop();
    if (!lastUser) return;

    const prompt = `Given the user's response: "${lastUser.content}", 
Respond with ONLY one of these options:
SEVERELY_DEPRESSED
MILDLY_DEPRESSED  
NEUTRAL
POSITIVE`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const result = await model.generateContent(prompt);
        const state = result.response.text().trim();
        
        if (["SEVERELY_DEPRESSED", "MILDLY_DEPRESSED", "NEUTRAL", "POSITIVE"].includes(state)) {
            emotionalState[streamSid] = state;
        } else {
            emotionalState[streamSid] = "NEUTRAL";
        }
    } catch (error) {
        console.error(`[${streamSid}] Emotional state update error:`, error);
        emotionalState[streamSid] = "NEUTRAL";
    }
}

// --- Start therapeutic call ---
app.post("/start-therapeutic-call", express.json(), (req, res) => {
    const { vitalData, alertType, phoneNumber } = req.body;
    if (!vitalData || !alertType) return res.status(400).json({ error: "Missing fields" });

    const vitalsContext = generateVitalsContext(vitalData, alertType);
    callContext = { vitalData, alertType, vitalsContext, phoneNumber, status: 'initiated' };
    callResult = { status: 'initiated', outcome: null, finalState: null };

    console.log(`[Therapeutic Call Started] Vitals: ${JSON.stringify(vitalsContext)}, Phone: ${phoneNumber}`);
    res.json({ success: true, vitalsContext: vitalsContext.concernText });
});

// --- Twilio webhook ---
app.post("/voice", (req, res) => {
    const host = req.get('host') || process.env.PUBLIC_URL?.replace(/https?:\/\//, ''); 
    const protocol = req.secure ? 'wss' : 'ws';
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Start>
            <Stream url="${protocol}://${host}/media" />
        </Start>
        <Say voice="Polly.Joanna">
            Hi, this is Dr. Sarah calling for a wellness check based on your vital signs. I noticed some concerning readings and wanted to make sure you're doing okay. How are you feeling right now?
        </Say>
        <Pause length="60"/>
        <Gather input="speech" timeout="10" speechTimeout="2">
            <Say voice="Polly.Joanna">I'm here to listen. Please tell me how you're doing.</Say>
        </Gather>
    </Response>`;
    
    console.log(`[Twilio Voice Webhook] Call incoming, sending TwiML`);
    res.type("text/xml").send(twiml);
});

// --- Trigger outbound call ---
app.get("/trigger-call", async (req, res) => {
    try {
        const call = await client.calls.create({
            url: `${process.env.PUBLIC_URL}/voice`,
            from: process.env.TWILIO_NUMBER,
            to: process.env.USER_NUMBER
        });
        console.log(`[Trigger Call] Call initiated. SID: ${call.sid}`);
        res.send(`Call started! SID: ${call.sid}`);
    } catch (err) {
        console.error(`[Trigger Call Error]`, err);
        res.status(500).send("Failed to initiate call");
    }
});

// --- WebSocket handler ---
wss.on("connection", (ws) => {
    console.log(`[WebSocket] Client connected`);
    let currentStreamSid = null;
    
    ws.on("message", async (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            const streamSid = data.streamSid || "default";
            currentStreamSid = streamSid;

            console.log(`[${streamSid}] WebSocket message:`, data.event);

            if (data.event === "start") {
                activeConnections[streamSid] = ws;
                transcripts[streamSid] = "";
                conversations[streamSid] = [];
                emotionalState[streamSid] = "NEUTRAL";
                lastTranscriptTime[streamSid] = Date.now();
                
                if (callContext) {
                    callContext.status = 'connected';
                    // Auto-end call after 5 min
                    callContext.timer = setTimeout(() => endCall(streamSid), 300 * 1000);
                }

                console.log(`[${streamSid}] Call started via WebSocket`);
            }

            if (data.event === "media") {
                // Handle incoming audio data if needed
                console.log(`[${streamSid}] Received media data`);
            }

            if (data.event === "transcription") {
                const transcriptionText = data.transcription?.text || "";
                if (transcriptionText.trim()) {
                    transcripts[streamSid] += " " + transcriptionText;
                    lastTranscriptTime[streamSid] = Date.now();
                    console.log(`[${streamSid}] Transcription: "${transcriptionText}"`);
                }
            }

            if (data.event === "stop") {
                console.log(`[${streamSid}] Stop event received`);
                endCall(streamSid);
            }
        } catch (error) {
            console.error(`[WebSocket] Message parsing error:`, error);
        }
    });

    ws.on("close", () => {
        console.log(`[WebSocket] Client disconnected`);
        if (currentStreamSid) {
            delete activeConnections[currentStreamSid];
            endCall(currentStreamSid);
        }
    });

    ws.on("error", (error) => {
        console.error(`[WebSocket] Error:`, error);
    });
});

// --- Pause-aware LLM responder ---
setInterval(async () => {
    const now = Date.now();
    for (const streamSid in transcripts) {
        if (!transcripts[streamSid] || !transcripts[streamSid].trim()) continue;

        // If user paused for 3 seconds
        if (now - (lastTranscriptTime[streamSid] || 0) > 3000) {
            const text = transcripts[streamSid].trim();
            
            console.log(`[${streamSid}] User paused, processing: "${text}"`);
            
            // Initialize conversation if empty
            if (!conversations[streamSid]) {
                conversations[streamSid] = [];
            }
            
            conversations[streamSid].push({ role: "user", content: text });
            transcripts[streamSid] = ""; // Clear processed transcript

            try {
                const reply = await getLLMResponse(conversations[streamSid], streamSid);
                conversations[streamSid].push({ role: "assistant", content: reply });

                // Send response back to Twilio
                const ws = activeConnections[streamSid];
                if (ws && ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ 
                        event: "say", 
                        streamSid, 
                        text: reply 
                    }));
                }

                // End call if user says they're okay
                if (/i am (ok|okay|fine|good|alright)/i.test(text)) {
                    setTimeout(() => endCall(streamSid), 2000); // Give time for response
                }
            } catch (error) {
                console.error(`[${streamSid}] Error processing response:`, error);
            }
        }
    }
}, 1000);

// --- Heartbeat to keep conversation going ---
setInterval(async () => {
    for (const streamSid in activeConnections) {
        const ws = activeConnections[streamSid];
        const lastActivity = lastTranscriptTime[streamSid] || 0;
        const now = Date.now();
        
        // If no activity for 15 seconds, prompt user
        if (now - lastActivity > 15000 && conversations[streamSid] && conversations[streamSid].length > 0) {
            const promptMessage = "Are you still there? I want to make sure you're doing okay.";
            
            if (ws && ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ 
                    event: "say", 
                    streamSid, 
                    text: promptMessage 
                }));
            }
            
            lastTranscriptTime[streamSid] = now; // Reset timer
        }
    }
}, 5000);

// --- End call ---
function endCall(streamSid) {
    console.log(`[${streamSid}] Ending call...`);
    
    if (callContext && callContext.timer) {
        clearTimeout(callContext.timer);
    }

    const finalState = emotionalState[streamSid] || "NEUTRAL";
    callResult = { 
        status: 'completed', 
        outcome: finalState, 
        finalState,
        timestamp: new Date().toISOString()
    };

    // Send goodbye message
    const ws = activeConnections[streamSid];
    if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ 
            event: "say", 
            streamSid, 
            text: "Thank you for talking with me. Take care, and don't hesitate to reach out if you need support." 
        }));
        
        // Close the call after goodbye
        setTimeout(() => {
            if (ws.readyState === ws.OPEN) {
                ws.close();
            }
        }, 3000);
    }

    // Cleanup
    delete transcripts[streamSid];
    delete conversations[streamSid];
    delete emotionalState[streamSid];
    delete lastTranscriptTime[streamSid];
    delete activeConnections[streamSid];
    
    if (callContext) {
        callContext = null;
    }

    console.log(`[${streamSid}] Call ended with outcome: ${finalState}`);
}

// --- Health check ---
app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy", 
        callResult,
        activeConnections: Object.keys(activeConnections).length,
        callContext: callContext ? { status: callContext.status } : null
    });
});

// --- Test endpoint to simulate vital alerts ---
app.get("/test-vital-alert", (req, res) => {
    const testVitalData = {
        heart_rate: 120,
        spo2: 88,
        stress_level: 75
    };
    
    const vitalsContext = generateVitalsContext(testVitalData, "high_alert");
    callContext = { 
        vitalData: testVitalData, 
        alertType: "high_alert", 
        vitalsContext, 
        phoneNumber: process.env.USER_NUMBER, 
        status: 'initiated' 
    };
    callResult = { status: 'initiated', outcome: null, finalState: null };

    res.json({ 
        message: "Test vital alert set", 
        vitalsContext: vitalsContext.concernText,
        callContext: callContext
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server ready for connections`);
});