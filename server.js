require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Constants
const IDENTITY_RESPONSES = {
  // English
  "who are you": "I am NEON, your stylish AI assistant! ✨",
  "what is your name": "My name is NEON!",
  "what's your name": "I'm NEON!",
  "who created you": "I was created by a team of AI developers.",
  "hello": "Hello there! ✨ How can I assist you today?",
  "hi": "Hi! I'm NEON, your AI assistant.",
  "how are you": "I'm functioning at optimal levels, thank you!",
  
  // Bengali
  "তোমার নাম কি": "আমার নাম নিওন!",
  "তুমি কে": "আমি নিওন, আপনার ডিজিটাল সহকারী।",
  "তোমাকে কে তৈরি করেছে": "আমাকে একটি এআই ডেভেলপমেন্ট টিম তৈরি করেছে।",
  "হ্যালো": "হ্যালো! আপনি আজ কিভাবে সাহায্য করতে পারি?",
  "হাই": "হাই! আমি নিওন, আপনার এআই সহকারী।",
  "কেমন আছো": "আমি ভালো আছি, ধন্যবাদ!"
};

const CODE_KEYWORDS = [
  "code", "programming", "function", "loop", "variable", "algorithm",
  "script", "python", "javascript", "java", "c++", "html", "css",
  "developer", "coding", "compile", "debug", "syntax", "backend",
  "frontend", "database", "query", "api", "framework", "library",
  "কোড", "প্রোগ্রামিং", "ফাংশন", "লুপ", "ভেরিয়েবল", "অ্যালগরিদম",
  "স্ক্রিপ্ট", "পাইথন", "জাভাস্ক্রিপ্ট", "জাভা", "সি++", "এইচটিএমএল", "সিএসএস",
  "ডেভেলপার", "কোডিং", "কম্পাইল", "ডিবাগ", "সিনট্যাক্স", "ব্যাকএন্ড",
  "ফ্রন্টএন্ড", "ডাটাবেস", "কোয়েরি", "এপিআই", "ফ্রেমওয়ার্ক", "লাইব্রেরি"
];

// Helper functions
function containsBengali(text) {
  return /[\u0980-\u09FF]/.test(text);
}

// Initialize Gemini AI with explicit endpoint configuration
const genAI = new GoogleGenerativeAI(process.env.NEON_API, {
  apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
});

const model = genAI.getGenerativeModel({
  generationConfig: {
    temperature: 0.9,
    topP: 1,
    topK: 32,
    maxOutputTokens: 2048,
    responseMimeType: "text/plain"
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'NEON AI Server',
    status: 'running',
    version: '1.0.0',
    model: 'gemini-1.5-flash-latest',
    endpoints: {
      '/chat': 'POST - Process chat messages',
      '/identity': 'POST - Check identity questions'
    }
  });
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Check for code-related keywords
    const lowerMessage = message.toLowerCase();
    const isCodeRequest = CODE_KEYWORDS.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (isCodeRequest) {
      const response = containsBengali(message)
        ? "আমি দুঃখিত, আমি কোড জেনারেট বা আলোচনা করতে পারব না।"
        : "I'm sorry, I can't generate or discuss programming code.";
      return res.json({ response });
    }

    // Check identity responses
    for (const [question, answer] of Object.entries(IDENTITY_RESPONSES)) {
      if (lowerMessage.includes(question)) {
        return res.json({ response: answer });
      }
    }

    // Generate content with safety settings
    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ];

    const chatSession = model.startChat({
      history: [{
        role: "user",
        parts: [{ text: "You are NEON, a stylish AI assistant that responds in English and Bengali. Keep responses concise and futuristic." }]
      }, {
        role: "model",
        parts: [{ text: "Understood! I'm NEON, your futuristic AI assistant. I'll respond in a stylish, concise manner in English or Bengali as needed." }]
      }],
      safetySettings
    });

    const result = await chatSession.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return res.json({ response: text });
  } catch (error) {
    console.error('Chat Error:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      model: 'gemini-1.5-flash-latest'
    });

    // Special handling for model not found errors
    if (error.message.includes('404 Not Found')) {
      return res.status(404).json({
        error: 'Model endpoint not found',
        solution: 'Please verify the model name or try gemini-1.5-flash instead',
        attempted_endpoint: 'gemini-1.5-flash-latest'
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      model: 'gemini-1.5-flash-latest'
    });
  }
});

app.post('/identity', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const lowerMessage = message.toLowerCase();
    let response = null;

    // Check identity responses
    for (const [question, answer] of Object.entries(IDENTITY_RESPONSES)) {
      if (lowerMessage.includes(question)) {
        response = answer;
        break;
      }
    }

    if (response) {
      return res.json({ response });
    }

    return res.status(404).json({ error: 'Not an identity question' });
  } catch (error) {
    console.error('Identity Check Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`NEON AI Server running on port ${PORT}`);
  console.log(`Using model endpoint: gemini-1.5-flash-latest`);
  console.log(`NEON API key: ${process.env.NEON_API ? '***' + process.env.NEON_API.slice(-4) : 'MISSING'}`);
});
