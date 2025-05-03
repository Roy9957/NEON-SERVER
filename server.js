require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://localhost:7700',
    'https://roy9957.github.io/NEON'
  ]
}));
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

function containsBengali(text) {
  return /[\u0980-\u09FF]/.test(text);
}

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'NEON AI Server',
    status: 'running',
    version: '1.0.0',
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

    const isCodeRequest = CODE_KEYWORDS.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isCodeRequest) {
      const response = containsBengali(message) ?
        "আমি দুঃখিত, আমি কোড জেনারেট বা আলোচনা করতে পারব না।" :
        "I'm sorry, I can't generate or discuss programming code.";
      return res.json({ response });
    }

    // Gemini API Call (Direct URL)
    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
    const apiKey = process.env.NEON_API;

    const response = await axios.post(`${apiUrl}?key=${apiKey}`, {
      contents: [{ parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.9,
        topP: 1,
        topK: 1,
        maxOutputTokens: 2048
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a proper response.";
    return res.json({ response: text });

  } catch (error) {
    console.error('Error processing chat:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
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
    console.error('Error checking identity:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`NEON AI Server running on port ${PORT}`);
});
