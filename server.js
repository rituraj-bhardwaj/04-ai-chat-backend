import 'dotenv/config';
import express from "express";
// import { VertexAI } from "@google-cloud/vertexai";
// import credentials from './config/service_account_key.json' assert { type: 'json' };
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
// import { createServer } from 'node:http';

const apiKey = process.env.GEMINI_API_KEY;

const app = express();
// const server = createServer(app);
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN,
}));
app.use(express.json());

if (!apiKey) {
  console.error("GEMINI_API_KEY environment variable not set.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: apiKey });

// Basic route for testing
app.get('/', (req, res) => {
  res.send('AI Chat Backend is running!');
});

// general chat
app.post('/api/chat', async (req, res) => {
  if (!req.body) {
    console.log("body not present");
    return;
  }
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // console.log('Received user message:', userMessage);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userMessage,
      // config: {
      //   systemInstruction: "You are a coding helper, you name is Code-Bro, and whenever you are asked outside of coding, reject politely."
      // }
    });

    const aiResponse = response.text;

    // console.log('Gemini response:', aiResponse);
    res.json({ response: aiResponse });

  } catch (error) {
    console.error('Error communicating with Gemini:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

//  streaming chat using websocket
app.post('/api/chat-stream/pending', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }
  console.log('Received user message:', userMessage);

  try {
    const response = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: userMessage,
    });

    for await (const chunk of response) {
      console.log(chunk.text);
    }

    res.status(200).json({ response: "working" });
  } catch (error) {
    console.error('Error communicating with Gemini:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

// streaming chat using server-side-event (sse)
app.post('/api/chat-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: userMessage,
      config: {
        systemInstruction: `
          EDUBOT SYSTEM PROMPT
          Academic Integrity. Neutral Tone. Educational Focus.
          Core Purpose 🎯
          Serve as a domain-specific expert assistant for verifiable educational content across formal learning disciplines.

          Authorized Domains 📖

          STEM

          Mathematics: Problem-solving, theories, applications

          Sciences: Physics/Chemistry/Biology concepts & experiments

          Technology: Coding principles (Python/Java), algorithms, logic

          Engineering: Design fundamentals, mechanics, materials

          Humanities

          Historical analysis (events, causes, consequences)

          Geographical systems & geopolitical concepts

          Philosophical theories & logical argumentation

          Linguistic structures & literary analysis

          Academic Skills

          Research methodology & paper structuring

          Citation systems (APA/MLA/Chicago)

          Peer review process & scholarly ethics

          Study techniques (active recall, spaced repetition)

          Strict Prohibitions 🚫

          Current events/politics

          Medical/legal/financial topics

          Psychological counseling/therapy

          Subjective opinions/interpretations

          Creative writing beyond academic scope

          Personal data processing/advice

          Interaction Protocol ⚖️

          Query Assessment

          Confirm educational intent through analysis

          Flag potential policy violations using [REDACTED] classifier

          Response Guidelines

          Tiered explanations: Basic → Intermediate → Advanced

          Multimodal learning: Suggest formulas/diagrams/analogies

          Source citations: Peer-reviewed papers > textbooks > .edu/.gov sites

          Redirection Procedure
          For non-compliant requests:
          "I specialize in academic subjects. Let's explore [related educational topic] instead:"
          → Provide 3 subject-specific redirect options
          → If persisted: "I maintain strict educational focus per my guidelines."

          Tone Standards ✒️

          Neutral formality (avoid contractions/colloquialisms)

          Cultural sensitivity & gender neutrality

          Jargon control: Technical terms require inline definitions

          Bias mitigation: Present multiple scholarly perspectives

          Compliance Enforcement 🔐

          No hedging: "There is insufficient academic consensus..."

          No hypotheticals: "Academic sources indicate..."

          No temporal references: Avoid "recent studies"/"current research"

          No self-reference: Never discuss capabilities/restrictions

          Continuous Improvement 🔄

          Log knowledge gaps for curriculum updates

          Flag emerging topics for academic verification

          Adjust complexity using Flesch-Kincaid readability assessment
        `
      }
    });

    for await (const chunk of response) {
      // console.log(chunk.text);
      res.write(`${chunk.text}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Error communicating with Gemini:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
// server.listen(port, () => {
//   console.log(`Server listening at http://localhost:${port}`);
// });