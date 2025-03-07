const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const mime = require('mime-types'); // To check file types
const { HfInference } = require('@huggingface/inference');
const axios = require('axios'); // Add axios import
const sharp = require('sharp'); // Add sharp import
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: '*', // Allow all origins (adjust for production)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Increase the file size limit to 20MB
});

// Check if the file is an image
const validateImageFile = (file) => {
  const mimeType = mime.lookup(file.originalname);
  if (!mimeType || !mimeType.startsWith('image')) {
    return false;
  }
  return true;
};

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.post('/description', async (req, res) => {
  const { description } = req.body;
  
  try {
    const prompt = `with no description and just the name list 5 pokemon that could be described as ${description}`;

    let identifiedPokemon = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (identifiedPokemon.length < 5 && attempts < maxAttempts) {
      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('Response from Google Gemini:', geminiResponse.data);

      identifiedPokemon = [];
      handleResponse(geminiResponse.data, identifiedPokemon);

      if (identifiedPokemon.length >= 5) break;

      attempts++;
    }

    while (identifiedPokemon.length < 5) {
      identifiedPokemon.push({ name: 'Unknown' });
    }

    res.json({ message: 'Description received', identifiedPokemon });
  } catch (error) {
    console.error('Error calling Google Gemini:', error);
    res.status(500).json({ message: 'Error calling Google Gemini', error: error.message });
  }
});

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  if (!validateImageFile(req.file)) {
    return res.status(400).send('Invalid file type. Only image files are allowed.');
  }

  try {
    console.log('Received file:', req.file);
    
    if (req.file.size === 0) {
      return res.status(400).send('Uploaded file is empty.');
    }

    // Convert the image to base64
    const imageBase64 = req.file.buffer.toString('base64');
    console.log('Base64 string length:', imageBase64.length);

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      { contents: [{ parts: [{ image: { base64: imageBase64 } }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Response from Google Gemini:', geminiResponse.data);

    let identifiedPokemon = [];
    handleResponse(geminiResponse.data, identifiedPokemon);

    while (identifiedPokemon.length < 5) {
      identifiedPokemon.push({ name: 'Unknown' });
    }

    res.json({ message: 'Image processed successfully', identifiedPokemon });
  } catch (error) {
    console.error('Error during image processing:', error.message);
    console.error(error.stack);
    res.status(500).json({ message: 'Error during image processing', error: error.message });
  }
});

// New endpoint for Pokémon image recognition
app.post('/recognize', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image provided.');
  }

  if (!validateImageFile(req.file)) {
    return res.status(400).send('Invalid file type. Only image files are allowed.');
  }

  try {
    // Resize the image to reduce payload size
    const resizedImageBuffer = await sharp(req.file.buffer)
      .resize({ width: 800 }) // Adjust the width as needed
      .toBuffer();

    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    const model_name = "skshmjn/Pokemon-classifier-gen9-1025";
    const image = resizedImageBuffer;

    const result = await hf.imageClassification({
      model: model_name,
      data: image,
    });

    const predicted_class = result[0].label;

    res.json({ predicted_class });
  } catch (error) {
    console.error('Error recognizing Pokémon:', error);
    res.status(500).json({ message: 'Error recognizing Pokémon', error: error.message });
  }
});

// Helper function to handle Google Gemini response
function handleResponse(response, identifiedPokemon) {
  const identifiedPokemonText = response.candidates[0].content.parts.map(part => part.text).join(' ');
  console.log('Identified Pokémon Text:', identifiedPokemonText);

  const pokemonList = extractPokemonList(identifiedPokemonText);
  identifiedPokemon.push(...pokemonList);

  console.log('Identified Pokémon:', identifiedPokemon);
}

function extractPokemonList(text) {
  const pokemonList = [];
  const lines = text.split(/[\n,]/);
  lines.forEach(line => {
    const match = line.trim().replace(/\(.*?\)/g, '').replace(/^\d+\.\s*/, '').trim();
    if (match) {
      pokemonList.push({ name: match });
    }
  });
  return pokemonList;
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});




// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const axios = require('axios');
// const multer = require('multer');
// const mime = require('mime-types'); // To check file types
// require('dotenv').config(); // Load environment variables

// const app = express();
// const PORT = process.env.PORT || 5001;

// app.use(cors({
//   origin: '*', // Allow all origins (adjust for production)
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));
// app.use(bodyParser.json());

// // Configure multer for file uploads
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // Set a 10MB limit
// });

// // Check if the file is an image
// const validateImageFile = (file) => {
//   const mimeType = mime.lookup(file.originalname);
//   if (!mimeType || !mimeType.startsWith('image')) {
//     return false;
//   }
//   return true;
// };

// app.get('/', (req, res) => {
//   res.send('Hello from the backend!');
// });

// app.post('/description', async (req, res) => {
//   const { description } = req.body;
  
//   try {
//     const prompt = `with no description and just the name list 5 pokemon that could be described as ${description}`;

//     let identifiedPokemon = [];
//     let attempts = 0;
//     const maxAttempts = 3;

//     while (identifiedPokemon.length < 5 && attempts < maxAttempts) {
//       const geminiResponse = await axios.post(
//         `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
//         { contents: [{ parts: [{ text: prompt }] }] },
//         { headers: { 'Content-Type': 'application/json' } }
//       );

//       console.log('Response from Google Gemini:', geminiResponse.data);

//       identifiedPokemon = [];
//       handleResponse(geminiResponse.data, identifiedPokemon);

//       if (identifiedPokemon.length >= 5) break;

//       attempts++;
//     }

//     while (identifiedPokemon.length < 5) {
//       identifiedPokemon.push({ name: 'Unknown' });
//     }

//     res.json({ message: 'Description received', identifiedPokemon });
//   } catch (error) {
//     console.error('Error calling Google Gemini:', error);
//     res.status(500).json({ message: 'Error calling Google Gemini', error: error.message });
//   }
// });

// app.post('/upload', upload.single('image'), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).send('No file uploaded.');
//   }

//   if (!validateImageFile(req.file)) {
//     return res.status(400).send('Invalid file type. Only image files are allowed.');
//   }

//   try {
//     console.log('Received file:', req.file);
    
//     if (req.file.size === 0) {
//       return res.status(400).send('Uploaded file is empty.');
//     }

//     // Convert the image to base64
//     const imageBase64 = req.file.buffer.toString('base64');
//     console.log('Base64 string length:', imageBase64.length);

//     const geminiResponse = await axios.post(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
//       { contents: [{ parts: [{ image: { base64: imageBase64 } }] }] },
//       { headers: { 'Content-Type': 'application/json' } }
//     );

//     console.log('Response from Google Gemini:', geminiResponse.data);

//     let identifiedPokemon = [];
//     handleResponse(geminiResponse.data, identifiedPokemon);

//     while (identifiedPokemon.length < 5) {
//       identifiedPokemon.push({ name: 'Unknown' });
//     }

//     res.json({ message: 'Image processed successfully', identifiedPokemon });
//   } catch (error) {
//     console.error('Error during image processing:', error.message);
//     console.error(error.stack);
//     res.status(500).json({ message: 'Error during image processing', error: error.message });
//   }
// });

// // Helper function to handle Google Gemini response
// function handleResponse(response, identifiedPokemon) {
//   const identifiedPokemonText = response.candidates[0].content.parts.map(part => part.text).join(' ');
//   console.log('Identified Pokémon Text:', identifiedPokemonText);

//   const pokemonList = extractPokemonList(identifiedPokemonText);
//   identifiedPokemon.push(...pokemonList);

//   console.log('Identified Pokémon:', identifiedPokemon);
// }

// function extractPokemonList(text) {
//   const pokemonList = [];
//   const lines = text.split(/[\n,]/);
//   lines.forEach(line => {
//     const match = line.trim().replace(/\(.*?\)/g, '').replace(/^\d+\.\s*/, '').trim();
//     if (match) {
//       pokemonList.push({ name: match });
//     }
//   });
//   return pokemonList;
// }

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });