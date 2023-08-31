// Establish MongoDB connection when the server starts
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import connectToDbWithReconnection from './mongo_connect.js';
import fetchData from './querydb.js';
import cors from 'cors';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public'))); // Serve HTML

app.use(cors({
  origin: 'http://localhost:8000',
}));

// Establish MongoDB connection when the server starts
let client;
connectToDbWithReconnection()
  .then(dbClient => {
    client = dbClient;
  })
  .catch(error => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1); // Exit the process if connection fails
  });

app.get('/transactions', async function (req, res) {
  const address = req.query.address;
  const mosaicId = req.query.mosaicId;

  if (!client) {
    res.status(500).send('Error connecting to MongoDB');
    return;
  }

  try {
    let data;
    if (mosaicId) {
      data = await fetchData(client, address, mosaicId);
    } else {
      data = await fetchData(client, address, null); // Pass null for mosaicId when not provided
    }
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch data', error);
    res.status(500).send(`Error fetching data: ${error.message}`);
  }
});

app.listen(5000, function () {
  console.log('Server listening on port 5000!');
});