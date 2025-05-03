// Error handling at the very top
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Initialize Gemini AI with explicit configuration
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    model: 'gemini-1.5-flash-latest'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'NEON AI Server',
    status: 'running',
    version: '1.0.0',
    model_endpoint: 'gemini-1.5-flash-latest',
    endpoints: {
      '/chat': 'POST - Process chat messages',
      '/health': 'GET - Server health check'
    }
  });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid message format',
        details: 'Message must be a non-empty string'
      });
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

    const result = await model.generateContent({
      contents: [{ parts: [{ text: message }] }],
      safetySettings
    });

    const response = await result.response;
    const text = response.text();

    return res.json({ 
      response: text,
      metadata: {
        model: 'gemini-1.5-flash-latest',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('API Request Failed:', {
      timestamp: new Date().toISOString(),
      endpoint: 'gemini-1.5-flash-latest',
      error: error.message,
      stack: error.stack
    });

    // Special handling for rate limits
    if (error.message.includes('quota') || error.message.includes('429')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        solution: 'Please try again later or check your API quota'
      });
    }

    return res.status(500).json({
      error: 'Failed to process request',
      details: error.message,
      attempted_endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: {
      GET: ['/', '/health'],
      POST: ['/chat']
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Contact support'
  });
});

// Start server with graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`NEON AI Server running on port ${PORT}`);
  console.log(`Using Gemini endpoint: ${genAI.apiEndpoint}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
