const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

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
    // Replace with the actual Google Gemini API endpoint and your API key
    const geminiResponse = await axios.post('https://gemini.googleapis.com/v1/identify', {
      description,
    }, {
      headers: {
        'Authorization': `Bearer YOUR_API_KEY`,
        'Content-Type': 'application/json',
      },
    });

    // Assuming the response contains an array of identified Pokémon
    const identifiedPokemon = geminiResponse.data.slice(0, 5); // Get the top 5 Pokémon
    res.json({ message: 'Description received', identifiedPokemon });
  } catch (error) {
    console.error('Error calling Google Gemini:', error);
    res.status(500).json({ message: 'Error calling Google Gemini', error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});