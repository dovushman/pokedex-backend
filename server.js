const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.post('/description', (req, res) => {
  const data = req.body;
    console.log(data);
  res.json({ message: 'Description received', data });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});