const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();
const rateLimit = require('express-rate-limit');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: "Too many requests from this IP, please try again after a minute.",
});

app.use('/refine', apiLimiter);

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/translate', async (req, res) => {
  const chatGptKey = req.body.apiKey;

  if (!chatGptKey) {
    return res.status(400).send('API Key is required.');
  }

  try {
    const testResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        { role: 'system', content: 'ping' }
      ],
      max_tokens: 5
    }, {
      headers: {
        'Authorization': `Bearer ${chatGptKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.render('combined', { chatGptKey });

  } catch (error) {
    console.error('API key validation failed:', error.message);

    if (error.response && error.response.status === 401) {
      return res.status(401).render('index', { error: 'Invalid API Key. Please provide a valid API key.' });
    }

    if (error.response && error.response.status === 404) {
      return res.status(404).send('OpenAI API endpoint not found. Please verify the API URL.');
    }

    return res.status(500).send('An error occurred while validating the API key.');
  }
});

app.post('/refine', async (req, res) => {
  const { translatedText, customPrompt, chatGptKey } = req.body;

  if (!translatedText || !chatGptKey) {
    return res.status(400).send('Translated text and ChatGPT API key are required.');
  }

  try {
    const prompt = customPrompt || `Refine this text for grammar and logical consistency: "${translatedText}"`;

    const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        { role: 'user', content: prompt }
      ],
      
    }, {
      headers: {
        'Authorization': `Bearer ${chatGptKey}`,
        'Content-Type': 'application/json'
      }
    });

    const refinedText = gptResponse.data.choices[0].message.content.trim();

    res.json({ refinedText });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).send('An error occurred while processing your request.');
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});