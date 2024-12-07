const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.post('/description', async (req, res) => {
  const { description } = req.body;

  try {
    // Construct the prompt for the API
    const prompt = `with no description and just the name list 5 pokemon that could be described as ${description}`;

    let identifiedPokemon = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (identifiedPokemon.length < 5 && attempts < maxAttempts) {
      const geminiResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Log the response data to understand its structure
      console.log('Response from Google Gemini:', geminiResponse.data);

      // Clear the identifiedPokemon array before each attempt
      identifiedPokemon = [];

      // Handle the response to extract and populate identifiedPokemon
      handleResponse(geminiResponse.data, identifiedPokemon);

      // Break out of the loop if a valid list of Pokémon is identified
      if (identifiedPokemon.length >= 5) {
        break;
      }

      attempts++;
    }

    // If still fewer than 5 Pokémon, fill with placeholders or handle as needed
    while (identifiedPokemon.length < 5) {
      identifiedPokemon.push({ name: 'Unknown' });
    }

    // Return the extracted content
    res.json({ message: 'Description received', identifiedPokemon });
  } catch (error) {
    console.error('Error calling Google Gemini:', error);
    res.status(500).json({ message: 'Error calling Google Gemini', error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Function to handle the response from Google Gemini
function handleResponse(response, identifiedPokemon) {
  // Parse the response to extract the Pokémon list
  const identifiedPokemonText = response.candidates[0].content.parts.map(part => part.text).join(' ');
  console.log('Identified Pokémon Text:', identifiedPokemonText); // Log the text to debug

  const pokemonList = extractPokemonList(identifiedPokemonText);

  // Populate the identifiedPokemon array
  identifiedPokemon.push(...pokemonList);

  // Log the identifiedPokemon array
  console.log('Identified Pokémon:', identifiedPokemon);
}

// Function to extract Pokémon list from the response text
function extractPokemonList(text) {
  const pokemonList = [];
  const lines = text.split(/[\n,]/); // Split by newline or comma
  lines.forEach(line => {
    const match = line.trim().replace(/\(.*?\)/g, '').replace(/^\d+\.\s*/, '').trim(); // Remove text in parentheses, numbers, and extra spaces
    if (match) {
      pokemonList.push({ name: match });
    }
  });
  return pokemonList;
}