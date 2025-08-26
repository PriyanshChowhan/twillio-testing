// import express from 'express';
// import http from 'http';
// import dotenv from 'dotenv';
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import twilio from 'twilio';

// dotenv.config();

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// const server = http.createServer(app);
// const PORT = process.env.PORT || 3000;
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// // Twilio client
// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// // --- In-memory storage ---
// let callContext = null;
// let callResult = null;
// const conversations = {};
// const emotionalState = {};

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
//     const contextText = context?.vitalsContext?.concernText || "wellness check";
//     return `You are Dr. Sarah, a licensed therapist working with a patient monitoring system. 
// ALERT CONTEXT: 
// - Specific Concerns: ${contextText}

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
// - Be specific about what the monitoring detected: "${contextText}"
// - Ask about current activities, stressors, or events that might explain the vital changes
// - Assess both physical comfort and emotional wellbeing
// - If severe distress is detected, guide toward immediate care resources

// Keep responses concise but thorough (2-3 sentences max per response).`;
// };

// // --- Get LLM response ---
// async function getLLMResponse(convo, callSid) {
//     console.log(`[${callSid}] Sending prompt to LLM with conversation history:`, convo);
    
//     try {
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
//         const result = await model.generateContent([
//             getSystemPrompt(callContext, emotionalState[callSid]),
//             ...convo.map(msg => msg.content).join('\n')
//         ]);
        
//         const reply = result.response.text();
//         console.log(`[${callSid}] LLM replied: ${reply}`);

//         await updateEmotionalState(convo, callSid);
//         console.log(`[${callSid}] Updated emotional state: ${emotionalState[callSid]}`);
//         return reply;
//     } catch (error) {
//         console.error(`[${callSid}] LLM Error:`, error);
//         return "I understand you're speaking with me. Could you please repeat what you just said?";
//     }
// }

// // --- Update emotional state ---
// async function updateEmotionalState(convo, callSid) {
//     const lastUser = convo.filter(m => m.role === "user").pop();
//     if (!lastUser) return;

//     const prompt = `Given the user's response: "${lastUser.content}", 
// Respond with ONLY one of these options:
// SEVERELY_DEPRESSED
// MILDLY_DEPRESSED  
// NEUTRAL
// POSITIVE`;

//     try {
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
//         const result = await model.generateContent(prompt);
//         const state = result.response.text().trim();
        
//         if (["SEVERELY_DEPRESSED", "MILDLY_DEPRESSED", "NEUTRAL", "POSITIVE"].includes(state)) {
//             emotionalState[callSid] = state;
//         } else {
//             emotionalState[callSid] = "NEUTRAL";
//         }
//     } catch (error) {
//         console.error(`[${callSid}] Emotional state update error:`, error);
//         emotionalState[callSid] = "NEUTRAL";
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

// // --- Main Twilio voice webhook ---
// app.post("/voice", (req, res) => {
//     const callSid = req.body.CallSid;
//     console.log(`[Twilio Voice Webhook] Call incoming. SID: ${callSid}`);
    
//     // Initialize conversation for this call
//     if (!conversations[callSid]) {
//         conversations[callSid] = [];
//         emotionalState[callSid] = "NEUTRAL";
//     }
    
//     const twiml = `<?xml version="1.0" encoding="UTF-8"?>
//     <Response>
//         <Say voice="Polly.Joanna">
//             Hi, this is Dr. Sarah calling for a wellness check. How are you feeling right now?
//         </Say>
//         <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
//             <Say voice="Polly.Joanna">Please tell me how you're doing today.</Say>
//         </Gather>
//         <Redirect>/voice-timeout</Redirect>
//     </Response>`;
    
//     res.type("text/xml").send(twiml);
// });

// // --- Process speech input ---
// app.post("/process-speech", express.urlencoded({extended: false}), async (req, res) => {
//     const speechResult = req.body.SpeechResult || "";
//     const callSid = req.body.CallSid;
    
//     console.log(`[Process Speech] Call: ${callSid}, Speech: "${speechResult}"`);
    
//     if (!speechResult.trim()) {
//         console.log(`[Process Speech] No speech detected, prompting again`);
//         const twiml = `<?xml version="1.0" encoding="UTF-8"?>
//         <Response>
//             <Say voice="Polly.Joanna">I didn't catch that. Could you please tell me how you're feeling?</Say>
//             <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
//             </Gather>
//             <Redirect>/voice-timeout</Redirect>
//         </Response>`;
//         return res.type("text/xml").send(twiml);
//     }
    
//     try {
//         // Initialize conversation if it doesn't exist
//         if (!conversations[callSid]) {
//             conversations[callSid] = [];
//             emotionalState[callSid] = "NEUTRAL";
//         }
        
//         // Add user message and get AI response
//         conversations[callSid].push({ role: "user", content: speechResult });
//         const aiResponse = await getLLMResponse(conversations[callSid], callSid);
//         conversations[callSid].push({ role: "assistant", content: aiResponse });
        
//         console.log(`[Process Speech] AI Response: "${aiResponse}"`);
        
//         // Check conversation length - end after 6-8 exchanges to keep calls reasonable
//         const conversationLength = conversations[callSid].length;
        
//         // Check if user indicates they're okay or conversation is getting long
//         if (/\b(i am|i'm|im)\s+(ok|okay|fine|good|alright|well|better)\b/i.test(speechResult) || conversationLength >= 12) {
//             const twiml = `<?xml version="1.0" encoding="UTF-8"?>
//             <Response>
//                 <Say voice="Polly.Joanna">${aiResponse}</Say>
//                 <Say voice="Polly.Joanna">I'm glad we could talk today. Please take care of yourself, and don't hesitate to reach out if you need support. Goodbye!</Say>
//                 <Hangup/>
//             </Response>`;
            
//             // End the call and cleanup
//             endCall(callSid);
//             return res.type("text/xml").send(twiml);
//         }
        
//         // Check for emergency situations
//         if (emotionalState[callSid] === "SEVERELY_DEPRESSED" || 
//             /\b(hurt|harm|suicide|kill|die|end it all)\b/i.test(speechResult)) {
            
//             const twiml = `<?xml version="1.0" encoding="UTF-8"?>
//             <Response>
//                 <Say voice="Polly.Joanna">${aiResponse}</Say>
//                 <Say voice="Polly.Joanna">I'm concerned about what you've shared. Please consider calling 988, the Suicide and Crisis Lifeline, or go to your nearest emergency room. You don't have to go through this alone.</Say>
//                 <Hangup/>
//             </Response>`;
            
//             endCall(callSid);
//             return res.type("text/xml").send(twiml);
//         }
        
//         // Continue conversation
//         const twiml = `<?xml version="1.0" encoding="UTF-8"?>
//         <Response>
//             <Say voice="Polly.Joanna">${aiResponse}</Say>
//             <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
//             </Gather>
//             <Redirect>/voice-timeout</Redirect>
//         </Response>`;
        
//         res.type("text/xml").send(twiml);
        
//     } catch (error) {
//         console.error(`[Process Speech] Error:`, error);
//         const twiml = `<?xml version="1.0" encoding="UTF-8"?>
//         <Response>
//             <Say voice="Polly.Joanna">I'm having trouble processing that. Let me try again - how are you feeling today?</Say>
//             <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
//             </Gather>
//             <Redirect>/voice-timeout</Redirect>
//         </Response>`;
//         res.type("text/xml").send(twiml);
//     }
// });

// // --- Handle timeout ---
// app.post("/voice-timeout", (req, res) => {
//     const callSid = req.body.CallSid;
//     console.log(`[Voice Timeout] User didn't respond. Call: ${callSid}`);
    
//     const twiml = `<?xml version="1.0" encoding="UTF-8"?>
//     <Response>
//         <Say voice="Polly.Joanna">I haven't heard from you in a while. Are you still there?</Say>
//         <Gather input="speech" timeout="10" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
//             <Say voice="Polly.Joanna">Please let me know if you're okay.</Say>
//         </Gather>
//         <Say voice="Polly.Joanna">I'll check back with you later. Please take care of yourself, and remember that support is available if you need it.</Say>
//         <Hangup/>
//     </Response>`;
    
//     // End the call after timeout
//     if (callSid) {
//         endCall(callSid);
//     }
    
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

// // --- End call and cleanup ---
// function endCall(callSid) {
//     console.log(`[${callSid}] Ending call...`);
    
//     if (callContext && callContext.timer) {
//         clearTimeout(callContext.timer);
//     }

//     const finalState = emotionalState[callSid] || "NEUTRAL";
//     callResult = { 
//         status: 'completed', 
//         outcome: finalState, 
//         finalState,
//         timestamp: new Date().toISOString(),
//         conversationLength: conversations[callSid] ? conversations[callSid].length : 0
//     };

//     // Cleanup
//     delete conversations[callSid];
//     delete emotionalState[callSid];
    
//     if (callContext) {
//         callContext.status = 'completed';
//     }

//     console.log(`[${callSid}] Call ended with outcome: ${finalState}`);
// }

// // --- Health check ---
// app.get("/health", (req, res) => {
//     res.json({ 
//         status: "healthy", 
//         callResult,
//         activeConversations: Object.keys(conversations).length,
//         callContext: callContext ? { status: callContext.status } : null,
//         timestamp: new Date().toISOString()
//     });
// });

// // --- Debug endpoint ---
// app.get("/debug", (req, res) => {
//     res.json({
//         conversations: conversations,
//         emotionalState: emotionalState,
//         callContext: callContext,
//         callResult: callResult,
//         environment: {
//             PUBLIC_URL: process.env.PUBLIC_URL,
//             TWILIO_NUMBER: process.env.TWILIO_NUMBER,
//             USER_NUMBER: process.env.USER_NUMBER,
//             GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Set' : 'Not Set',
//             TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not Set',
//             TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not Set'
//         }
//     });
// });

// // --- Test endpoint to simulate vital alerts ---
// app.get("/test-vital-alert", (req, res) => {
//     const testVitalData = {
//         heart_rate: 120,
//         spo2: 88,
//         stress_level: 75
//     };
    
//     const vitalsContext = generateVitalsContext(testVitalData, "high_alert");
//     callContext = { 
//         vitalData: testVitalData, 
//         alertType: "high_alert", 
//         vitalsContext, 
//         phoneNumber: process.env.USER_NUMBER, 
//         status: 'initiated' 
//     };
//     callResult = { status: 'initiated', outcome: null, finalState: null };

//     res.json({ 
//         message: "Test vital alert set", 
//         vitalsContext: vitalsContext.concernText,
//         callContext: callContext
//     });
// });

// // --- Trigger call with vital data ---
// app.post("/trigger-therapeutic-call", express.json(), async (req, res) => {
//     const { phoneNumber } = req.body;
//     const targetNumber = phoneNumber || process.env.USER_NUMBER;
    
//     if (!targetNumber) {
//         return res.status(400).json({ error: "No phone number provided" });
//     }
    
//     try {
//         const call = await client.calls.create({
//             url: `${process.env.PUBLIC_URL}/voice`,
//             from: process.env.TWILIO_NUMBER,
//             to: targetNumber
//         });
        
//         console.log(`[Trigger Therapeutic Call] Call initiated to ${targetNumber}. SID: ${call.sid}`);
//         res.json({ 
//             success: true, 
//             callSid: call.sid, 
//             phoneNumber: targetNumber,
//             message: "Therapeutic call initiated"
//         });
//     } catch (err) {
//         console.error(`[Trigger Therapeutic Call Error]`, err);
//         res.status(500).json({ error: "Failed to initiate call", details: err.message });
//     }
// });

// server.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//     console.log(`Twilio voice webhook ready at /voice`);
//     console.log(`Environment check:`);
//     console.log(`- PUBLIC_URL: ${process.env.PUBLIC_URL}`);
//     console.log(`- TWILIO_NUMBER: ${process.env.TWILIO_NUMBER}`);
//     console.log(`- USER_NUMBER: ${process.env.USER_NUMBER}`);
//     console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set' : 'Not Set'}`);
//     console.log(`- TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not Set'}`);
//     console.log(`- TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not Set'}`);
// });

import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import twilio from 'twilio';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// --- In-memory storage ---
let callContext = null;
let callResult = null;
const conversations = {};
const emotionalState = {};
const familyConversations = {}; // New: Store family conversations separately

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

// --- NEW: Build family notification system prompt ---
const getFamilySystemPrompt = (patientName, emotionalState, vitalsContext) => {
    return `You are Dr. Sarah, a licensed therapist calling to inform a family member about their loved one's current mental health status following a wellness check.

PATIENT INFORMATION:
- Patient Name: ${patientName || "your family member"}
- Current Mental State: ${emotionalState}
- Vital Signs Concern: ${vitalsContext || "concerning vital signs"}

PROFESSIONAL APPROACH:
- You are calling as a healthcare professional following up on a patient monitoring alert
- Explain that you just completed a wellness check with their family member
- Share your professional assessment of their mental state in appropriate terms
- Provide specific recommendations for family support and next steps
- Be compassionate but direct about the level of concern

CONVERSATION GUIDELINES:
- Start by identifying yourself and explaining the reason for the call
- Ask about the family member's relationship to the patient
- Share assessment results appropriately (respect patient privacy but emphasize safety concerns)
- Provide clear, actionable recommendations for family involvement
- Offer resources and next steps for professional care if needed

Keep responses professional, clear, and supportive (2-3 sentences max per response).`;
};

// --- NEW: Build ambulance notification system prompt ---
const getAmbulanceSystemPrompt = (patientName, patientAddress, vitalsContext, emergencyDetails) => {
    return `You are Dr. Sarah, a licensed medical professional making an emergency dispatch call to ambulance services for a patient in critical condition.

PATIENT EMERGENCY INFORMATION:
- Patient Name: ${patientName || "Unknown patient"}
- Patient Address: ${patientAddress || "Address not provided"}
- Critical Vital Signs: ${vitalsContext || "severe vital sign abnormalities"}
- Emergency Details: ${emergencyDetails || "patient monitoring system detected critical health emergency"}

EMERGENCY DISPATCH PROTOCOL:
- You are calling 911/ambulance services to request immediate medical assistance
- Provide clear, concise medical information about the patient's critical condition
- State the exact address where ambulance services are needed
- Emphasize the urgency based on vital sign readings
- Provide your medical credentials and explain this is from a patient monitoring system
- Give specific vital sign values that triggered the emergency alert

COMMUNICATION STYLE:
- Be professional, urgent, and direct
- Speak clearly and provide all critical information quickly
- Use medical terminology appropriately
- Ensure ambulance dispatch has all necessary information for immediate response

This is a one-way emergency notification call. Provide all critical information in a single comprehensive message.`;
};

// --- Get LLM response ---
async function getLLMResponse(convo, callSid) {
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

// --- NEW: Get family LLM response ---
async function getFamilyLLMResponse(convo, callSid, patientEmotionalState) {
    console.log(`[${callSid}] Sending family notification prompt to LLM`);
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
            getFamilySystemPrompt(
                callContext?.patientName || "the patient", 
                patientEmotionalState, 
                callContext?.vitalsContext?.concernText
            ),
            ...convo.map(msg => msg.content).join('\n')
        ]);
        
        const reply = result.response.text();
        console.log(`[${callSid}] Family LLM replied: ${reply}`);
        return reply;
    } catch (error) {
        console.error(`[${callSid}] Family LLM Error:`, error);
        return "I'm calling to discuss your family member's wellness check. Could you please repeat what you just said?";
    }
}

// --- NEW: Get ambulance LLM response ---
async function getAmbulanceLLMResponse(patientName, patientAddress, vitalsContext, emergencyDetails) {
    console.log(`[Ambulance Call] Generating emergency dispatch message`);
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
            getAmbulanceSystemPrompt(patientName, patientAddress, vitalsContext, emergencyDetails)
        ]);
        
        const reply = result.response.text();
        console.log(`[Ambulance Call] Emergency message generated: ${reply}`);
        return reply;
    } catch (error) {
        console.error(`[Ambulance Call] LLM Error:`, error);
        return `This is Dr. Sarah calling for emergency medical services. We have a patient at ${patientAddress || 'unknown address'} with critical vital signs requiring immediate ambulance dispatch. Patient name: ${patientName || 'Unknown'}. Critical condition detected by patient monitoring system.`;
    }
}

// --- Update emotional state ---
async function updateEmotionalState(convo, callSid) {
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

// --- NEW: Initiate family notification call ---
async function initiatesFamilyCall(patientEmotionalState, familyNumber) {
    if (!familyNumber) {
        console.log("[Family Call] No family number provided, skipping family notification");
        return;
    }

    try {
        console.log(`[Family Call] Initiating call to family member: ${familyNumber}`);
        const call = await client.calls.create({
            url: `${process.env.PUBLIC_URL}/family-voice`,
            from: process.env.TWILIO_NUMBER,
            to: familyNumber
        });
        
        console.log(`[Family Call] Family notification call initiated. SID: ${call.sid}, State: ${patientEmotionalState}`);
        
        // Store the patient's emotional state for this family call
        if (!familyConversations[call.sid]) {
            familyConversations[call.sid] = {
                patientEmotionalState: patientEmotionalState,
                conversation: []
            };
        }
        
        return call.sid;
    } catch (error) {
        console.error("[Family Call] Error initiating family call:", error);
    }
}

// --- NEW: Initiate ambulance emergency call ---
async function initiateAmbulanceCall(patientName, patientAddress, vitalsContext, emergencyDetails, ambulanceNumber) {
    if (!ambulanceNumber) {
        console.log("[Ambulance Call] No ambulance number provided, skipping ambulance call");
        return;
    }

    try {
        console.log(`[Ambulance Call] Initiating emergency call to: ${ambulanceNumber}`);
        const call = await client.calls.create({
            url: `${process.env.PUBLIC_URL}/ambulance-voice`,
            from: process.env.TWILIO_NUMBER,
            to: ambulanceNumber
        });
        
        console.log(`[Ambulance Call] Emergency ambulance call initiated. SID: ${call.sid}`);
        return call.sid;
    } catch (error) {
        console.error("[Ambulance Call] Error initiating ambulance call:", error);
    }
}

// --- Start therapeutic call ---
app.post("/start-therapeutic-call", express.json(), (req, res) => {
    const { vitalData, alertType, phoneNumber, familyNumber, patientName } = req.body; // Added familyNumber and patientName
    if (!vitalData || !alertType) return res.status(400).json({ error: "Missing fields" });

    const vitalsContext = generateVitalsContext(vitalData, alertType);
    callContext = { 
        vitalData, 
        alertType, 
        vitalsContext, 
        phoneNumber, 
        familyNumber, // Store family number
        patientName, // Store patient name
        status: 'initiated' 
    };
    callResult = { status: 'initiated', outcome: null, finalState: null };

    console.log(`[Therapeutic Call Started] Vitals: ${JSON.stringify(vitalsContext)}, Phone: ${phoneNumber}, Family: ${familyNumber}`);
    res.json({ success: true, vitalsContext: vitalsContext.concernText });
});

// --- Main Twilio voice webhook ---
app.post("/voice", (req, res) => {
    const callSid = req.body.CallSid;
    console.log(`[Twilio Voice Webhook] Call incoming. SID: ${callSid}`);
    
    // Initialize conversation for this call
    if (!conversations[callSid]) {
        conversations[callSid] = [];
        emotionalState[callSid] = "NEUTRAL";
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say voice="Polly.Joanna">
            Hi, this is Dr. Sarah calling for a wellness check. How are you feeling right now?
        </Say>
        <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
            <Say voice="Polly.Joanna">Please tell me how you're doing today.</Say>
        </Gather>
        <Redirect>/voice-timeout</Redirect>
    </Response>`;
    
    res.type("text/xml").send(twiml);
});

// --- NEW: Family voice webhook ---
app.post("/family-voice", (req, res) => {
    const callSid = req.body.CallSid;
    console.log(`[Family Voice Webhook] Family call incoming. SID: ${callSid}`);
    
    // Initialize family conversation for this call
    if (!familyConversations[callSid]) {
        familyConversations[callSid] = {
            patientEmotionalState: "UNKNOWN",
            conversation: []
        };
    }
    
    const patientState = familyConversations[callSid].patientEmotionalState;
    let urgencyMessage = "";
    
    if (patientState === "SEVERELY_DEPRESSED") {
        urgencyMessage = "This is an urgent call regarding your family member's mental health status.";
    } else if (patientState === "MILDLY_DEPRESSED") {
        urgencyMessage = "I'm calling with some concerns about your family member's current wellbeing.";
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say voice="Polly.Joanna">
            Hello, this is Dr. Sarah, a licensed therapist. ${urgencyMessage} I just completed a wellness check with your family member and need to discuss my findings with you.
        </Say>
        <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-family-speech" method="POST">
            <Say voice="Polly.Joanna">Could you please tell me your relationship to the patient?</Say>
        </Gather>
        <Redirect>/family-voice-timeout</Redirect>
    </Response>`;
    
    res.type("text/xml").send(twiml);
});

// --- NEW: Ambulance voice webhook (one-way call) ---
app.post("/ambulance-voice", async (req, res) => {
    const callSid = req.body.CallSid;
    console.log(`[Ambulance Voice Webhook] Emergency call incoming. SID: ${callSid}`);
    
    try {
        // Get emergency message from LLM
        const emergencyMessage = await getAmbulanceLLMResponse(
            callContext?.patientName || "Unknown Patient",
            callContext?.patientAddress || process.env.PATIENT_ADDRESS || "Address not provided",
            callContext?.vitalsContext?.concernText || "critical vital signs detected",
            callContext?.emergencyDetails || "Patient monitoring system detected critical health emergency requiring immediate response"
        );
        
        // One-way call - AI speaks, no gathering input
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Joanna">
                ${emergencyMessage}
            </Say>
            <Pause length="2"/>
            <Say voice="Polly.Joanna">
                Please confirm ambulance dispatch to this address. This is an automated emergency call from a patient monitoring system. Thank you.
            </Say>
            <Hangup/>
        </Response>`;
        
        console.log(`[Ambulance Voice Webhook] Emergency message delivered for call ${callSid}`);
        res.type("text/xml").send(twiml);
        
    } catch (error) {
        console.error(`[Ambulance Voice Webhook] Error:`, error);
        
        // Fallback emergency message
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Joanna">
                This is Dr. Sarah calling for emergency medical services. We have a patient with critical vital signs requiring immediate ambulance dispatch. Patient monitoring system detected a medical emergency. Please send ambulance to the registered address immediately.
            </Say>
            <Hangup/>
        </Response>`;
        
        res.type("text/xml").send(twiml);
    }
});

// --- Process speech input ---
app.post("/process-speech", express.urlencoded({extended: false}), async (req, res) => {
    const speechResult = req.body.SpeechResult || "";
    const callSid = req.body.CallSid;
    
    console.log(`[Process Speech] Call: ${callSid}, Speech: "${speechResult}"`);
    
    if (!speechResult.trim()) {
        console.log(`[Process Speech] No speech detected, prompting again`);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Joanna">I didn't catch that. Could you please tell me how you're feeling?</Say>
            <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
            </Gather>
            <Redirect>/voice-timeout</Redirect>
        </Response>`;
        return res.type("text/xml").send(twiml);
    }
    
    try {
        // Initialize conversation if it doesn't exist
        if (!conversations[callSid]) {
            conversations[callSid] = [];
            emotionalState[callSid] = "NEUTRAL";
        }
        
        // Add user message and get AI response
        conversations[callSid].push({ role: "user", content: speechResult });
        const aiResponse = await getLLMResponse(conversations[callSid], callSid);
        conversations[callSid].push({ role: "assistant", content: aiResponse });
        
        console.log(`[Process Speech] AI Response: "${aiResponse}"`);
        
        // Check conversation length - end after 6-8 exchanges to keep calls reasonable
        const conversationLength = conversations[callSid].length;
        
        // Check if user indicates they're okay or conversation is getting long
        if (/\b(i am|i'm|im)\s+(ok|okay|fine|good|alright|well|better)\b/i.test(speechResult) || conversationLength >= 12) {
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="Polly.Joanna">${aiResponse}</Say>
                <Say voice="Polly.Joanna">I'm glad we could talk today. Please take care of yourself, and don't hesitate to reach out if you need support. Goodbye!</Say>
                <Hangup/>
            </Response>`;
            
            // NEW: Initiate family call before ending patient call
            const finalEmotionalState = emotionalState[callSid];
            if ((finalEmotionalState === "SEVERELY_DEPRESSED" || finalEmotionalState === "MILDLY_DEPRESSED") && callContext?.familyNumber) {
                console.log(`[${callSid}] Patient call ending with concerning state: ${finalEmotionalState}. Initiating family call.`);
                await initiatesFamilyCall(finalEmotionalState, callContext.familyNumber);
            }
            
            // End the call and cleanup
            endCall(callSid);
            return res.type("text/xml").send(twiml);
        }
        
        // Check for emergency situations
        if (emotionalState[callSid] === "SEVERELY_DEPRESSED" || 
            /\b(hurt|harm|suicide|kill|die|end it all)\b/i.test(speechResult)) {
            
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="Polly.Joanna">${aiResponse}</Say>
                <Say voice="Polly.Joanna">I'm concerned about what you've shared. Please consider calling 988, the Suicide and Crisis Lifeline, or go to your nearest emergency room. You don't have to go through this alone.</Say>
                <Hangup/>
            </Response>`;
            
            // NEW: Immediately initiate urgent family call for severe cases
            if (callContext?.familyNumber) {
                console.log(`[${callSid}] Emergency detected. Initiating urgent family call.`);
                await initiatesFamilyCall("SEVERELY_DEPRESSED", callContext.familyNumber);
            }
            
            endCall(callSid);
            return res.type("text/xml").send(twiml);
        }
        
        // Continue conversation
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Joanna">${aiResponse}</Say>
            <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
            </Gather>
            <Redirect>/voice-timeout</Redirect>
        </Response>`;
        
        res.type("text/xml").send(twiml);
        
    } catch (error) {
        console.error(`[Process Speech] Error:`, error);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Joanna">I'm having trouble processing that. Let me try again - how are you feeling today?</Say>
            <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-speech" method="POST">
            </Gather>
            <Redirect>/voice-timeout</Redirect>
        </Response>`;
        res.type("text/xml").send(twiml);
    }
});

// --- NEW: Process family speech input ---
app.post("/process-family-speech", express.urlencoded({extended: false}), async (req, res) => {
    const speechResult = req.body.SpeechResult || "";
    const callSid = req.body.CallSid;
    
    console.log(`[Process Family Speech] Call: ${callSid}, Speech: "${speechResult}"`);
    
    if (!speechResult.trim()) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Joanna">I didn't catch that. Could you please tell me your relationship to the patient?</Say>
            <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-family-speech" method="POST">
            </Gather>
            <Redirect>/family-voice-timeout</Redirect>
        </Response>`;
        return res.type("text/xml").send(twiml);
    }
    
    try {
        // Initialize family conversation if it doesn't exist
        if (!familyConversations[callSid]) {
            familyConversations[callSid] = {
                patientEmotionalState: "UNKNOWN",
                conversation: []
            };
        }
        
        // Add family member's message and get AI response
        familyConversations[callSid].conversation.push({ role: "user", content: speechResult });
        const aiResponse = await getFamilyLLMResponse(
            familyConversations[callSid].conversation, 
            callSid, 
            familyConversations[callSid].patientEmotionalState
        );
        familyConversations[callSid].conversation.push({ role: "assistant", content: aiResponse });
        
        console.log(`[Process Family Speech] AI Response: "${aiResponse}"`);
        
        // Check conversation length - end family calls after reasonable discussion
        const conversationLength = familyConversations[callSid].conversation.length;
        
        if (conversationLength >= 8) {
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="Polly.Joanna">${aiResponse}</Say>
                <Say voice="Polly.Joanna">Thank you for taking the time to speak with me. Please follow up with the recommendations we discussed, and don't hesitate to contact professional services if you need immediate assistance. Goodbye.</Say>
                <Hangup/>
            </Response>`;
            
            // Cleanup family conversation
            delete familyConversations[callSid];
            return res.type("text/xml").send(twiml);
        }
        
        // Continue family conversation
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Joanna">${aiResponse}</Say>
            <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-family-speech" method="POST">
            </Gather>
            <Redirect>/family-voice-timeout</Redirect>
        </Response>`;
        
        res.type("text/xml").send(twiml);
        
    } catch (error) {
        console.error(`[Process Family Speech] Error:`, error);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Joanna">I'm having trouble processing that. Let me try again - what is your relationship to the patient?</Say>
            <Gather input="speech" timeout="15" speechTimeout="auto" language="en-US" action="/process-family-speech" method="POST">
            </Gather>
            <Redirect>/family-voice-timeout</Redirect>
        </Response>`;
        res.type("text/xml").send(twiml);
    }
});

// --- Handle timeout ---
app.post("/voice-timeout", (req, res) => {
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
    
    // End the call after timeout
    if (callSid) {
        endCall(callSid);
    }
    
    res.type("text/xml").send(twiml);
});

// --- NEW: Handle family timeout ---
app.post("/family-voice-timeout", (req, res) => {
    const callSid = req.body.CallSid;
    console.log(`[Family Voice Timeout] Family member didn't respond. Call: ${callSid}`);
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say voice="Polly.Joanna">I haven't heard from you. This is regarding your family member's mental health status. Please call back when you're available to discuss this important matter.</Say>
        <Hangup/>
    </Response>`;
    
    // Cleanup family conversation
    delete familyConversations[callSid];
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

// --- NEW: Test endpoint for ambulance call ---
app.get("/test-ambulance-call", async (req, res) => {
    const { ambulanceNumber, patientName, patientAddress, emergencyDetails } = req.query;
    
    if (!ambulanceNumber) {
        return res.status(400).json({ 
            error: "Missing ambulanceNumber parameter", 
            example: "/test-ambulance-call?ambulanceNumber=+1234567890&patientName=John Doe&patientAddress=123 Main St&emergencyDetails=Critical heart rate detected"
        });
    }
    
    // Set up test context for ambulance call
    const testPatientName = patientName || "Test Patient";
    const testPatientAddress = patientAddress || "123 Emergency Street, Test City";
    const testEmergencyDetails = emergencyDetails || "Patient monitoring system detected critical vital signs requiring immediate medical attention";
    
    callContext = {
        patientName: testPatientName,
        patientAddress: testPatientAddress,
        emergencyDetails: testEmergencyDetails,
        vitalsContext: { concernText: "critical heart rate of 180 BPM and oxygen saturation below 85%" },
        status: 'ambulance_test'
    };
    
    try {
        const callSid = await initiateAmbulanceCall(
            testPatientName,
            testPatientAddress,
            callContext.vitalsContext.concernText,
            testEmergencyDetails,
            ambulanceNumber
        );
        
        res.json({
            success: true,
            message: "Ambulance emergency call initiated",
            callSid: callSid,
            ambulanceNumber: ambulanceNumber,
            patientName: testPatientName,
            patientAddress: testPatientAddress,
            emergencyDetails: testEmergencyDetails,
            note: "This is a one-way call where Dr. Sarah will deliver emergency information to ambulance services without expecting a response."
        });
    } catch (error) {
        console.error("[Test Ambulance Call] Error:", error);
        res.status(500).json({ 
            error: "Failed to initiate ambulance test call", 
            details: error.message 
        });
    }
});

// --- End call and cleanup ---
function endCall(callSid) {
    console.log(`[${callSid}] Ending call...`);
    
    if (callContext && callContext.timer) {
        clearTimeout(callContext.timer);
    }

    const finalState = emotionalState[callSid] || "NEUTRAL";
    callResult = { 
        status: 'completed', 
        outcome: finalState, 
        finalState,
        timestamp: new Date().toISOString(),
        conversationLength: conversations[callSid] ? conversations[callSid].length : 0
    };

    // Cleanup
    delete conversations[callSid];
    delete emotionalState[callSid];
    
    if (callContext) {
        callContext.status = 'completed';
    }

    console.log(`[${callSid}] Call ended with outcome: ${finalState}`);
}

// --- Health check ---
app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy", 
        callResult,
        activeConversations: Object.keys(conversations).length,
        activeFamilyConversations: Object.keys(familyConversations).length, // NEW
        callContext: callContext ? { status: callContext.status } : null,
        timestamp: new Date().toISOString()
    });
});

// --- Debug endpoint ---
app.get("/debug", (req, res) => {
    res.json({
        conversations: conversations,
        familyConversations: familyConversations, // NEW
        emotionalState: emotionalState,
        callContext: callContext,
        callResult: callResult,
        environment: {
            PUBLIC_URL: process.env.PUBLIC_URL,
            TWILIO_NUMBER: process.env.TWILIO_NUMBER,
            USER_NUMBER: process.env.USER_NUMBER,
            FAMILY_NUMBER: process.env.FAMILY_NUMBER,
            AMBULANCE_NUMBER: process.env.AMBULANCE_NUMBER, // NEW
            PATIENT_ADDRESS: process.env.PATIENT_ADDRESS, // NEW
            GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Set' : 'Not Set',
            TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not Set',
            TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not Set'
        }
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
        familyNumber: process.env.FAMILY_NUMBER, // NEW: Add family number to test
        patientName: "Test Patient", // NEW
        status: 'initiated' 
    };
    callResult = { status: 'initiated', outcome: null, finalState: null };

    res.json({ 
        message: "Test vital alert set", 
        vitalsContext: vitalsContext.concernText,
        callContext: callContext
    });
});

// --- NEW: Test endpoint to simulate family call ---
app.get("/test-family-call", async (req, res) => {
    const { familyNumber, patientEmotionalState, patientName } = req.query;
    
    if (!familyNumber) {
        return res.status(400).json({ 
            error: "Missing familyNumber parameter", 
            example: "/test-family-call?familyNumber=+1234567890&patientEmotionalState=SEVERELY_DEPRESSED&patientName=John Doe"
        });
    }
    
    // Set up test context for family call
    const testEmotionalState = patientEmotionalState || "MILDLY_DEPRESSED";
    const testPatientName = patientName || "Test Patient";
    
    callContext = {
        patientName: testPatientName,
        vitalsContext: { concernText: "elevated heart rate and low oxygen saturation" },
        familyNumber: familyNumber,
        status: 'family_test'
    };
    
    try {
        const callSid = await initiatesFamilyCall(testEmotionalState, familyNumber);
        
        res.json({
            success: true,
            message: "Family test call initiated",
            callSid: callSid,
            familyNumber: familyNumber,
            patientEmotionalState: testEmotionalState,
            patientName: testPatientName,
            instructions: "The family member will receive a call from Dr. Sarah explaining the patient's current mental health status."
        });
    } catch (error) {
        console.error("[Test Family Call] Error:", error);
        res.status(500).json({ 
            error: "Failed to initiate family test call", 
            details: error.message 
        });
    }
});

// --- Trigger call with vital data ---
app.post("/trigger-therapeutic-call", express.json(), async (req, res) => {
    const { phoneNumber, familyNumber, patientName } = req.body; // NEW: Added familyNumber and patientName
    const targetNumber = phoneNumber || process.env.USER_NUMBER;
    
    if (!targetNumber) {
        return res.status(400).json({ error: "No phone number provided" });
    }
    
    // Store family info in call context if provided
    if (familyNumber) {
        callContext = { 
            ...callContext, 
            familyNumber: familyNumber,
            patientName: patientName || "Patient"
        };
    }
    
    try {
        const call = await client.calls.create({
            url: `${process.env.PUBLIC_URL}/voice`,
            from: process.env.TWILIO_NUMBER,
            to: targetNumber
        });
        
        console.log(`[Trigger Therapeutic Call] Call initiated to ${targetNumber}. SID: ${call.sid}, Family: ${familyNumber}`);
        res.json({ 
            success: true, 
            callSid: call.sid, 
            phoneNumber: targetNumber,
            familyNumber: familyNumber,
            message: "Therapeutic call initiated"
        });
    } catch (err) {
        console.error(`[Trigger Therapeutic Call Error]`, err);
        res.status(500).json({ error: "Failed to initiate call", details: err.message });
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Twilio voice webhook ready at /voice`);
    console.log(`Twilio family voice webhook ready at /family-voice`); // NEW
    console.log(`Twilio ambulance voice webhook ready at /ambulance-voice`); // NEW
    console.log(`Environment check:`);
    console.log(`- PUBLIC_URL: ${process.env.PUBLIC_URL}`);
    console.log(`- TWILIO_NUMBER: ${process.env.TWILIO_NUMBER}`);
    console.log(`- USER_NUMBER: ${process.env.USER_NUMBER}`);
    console.log(`- FAMILY_NUMBER: ${process.env.FAMILY_NUMBER || 'Not Set'}`); // NEW
    console.log(`- AMBULANCE_NUMBER: ${process.env.AMBULANCE_NUMBER || 'Not Set'}`); // NEW
    console.log(`- PATIENT_ADDRESS: ${process.env.PATIENT_ADDRESS || 'Not Set'}`); // NEW
    console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set' : 'Not Set'}`);
    console.log(`- TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not Set'}`);
    console.log(`- TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not Set'}`);
});