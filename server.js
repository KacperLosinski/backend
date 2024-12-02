import express from 'express';
import axios from 'axios';
import cors from 'cors';
import NodeCache from 'node-cache';
import axiosRetry from 'axios-retry';
import mongoose from 'mongoose';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import pLimit from 'p-limit';
import { addCocktail, removeCocktail, getCommunityCocktails } from './controllers/communityCocktailController.js';
import { addRating } from './controllers/communityCocktailController.js';
import verifyAdmin from './verifyAdmin.js';
import admin from './firebaseAdmin.js';
import Cocktail from './models/Cocktail.js';

dotenv.config();

// Sprawdzanie brakujących zmiennych środowiskowych
if (!process.env.MONGO_URI || !process.env.API_URL || !process.env.PORT || !process.env.FRONTEND_URL) {
  console.error('Error: Missing required environment variables.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const API_URL = process.env.API_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const cache = new NodeCache({ stdTTL: 3600 });
const mongoURI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
    process.exit(1);
  }
};

connectDB();

axiosRetry(axios, {
  retries: parseInt(process.env.AXIOS_RETRY_COUNT, 10) || 3,
  retryDelay: (retryCount) => retryCount * (parseInt(process.env.AXIOS_RETRY_DELAY, 10) || 2000),
  retryCondition: (error) => error.response && error.response.status === 429,
});

// Zaktualizowana konfiguracja CORS obsługująca dynamiczny adres z env
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ALTERNATIVE_FRONTEND_URL, 
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

const storage = multer.diskStorage({
  destination: process.env.UPLOADS_PATH || './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(`/${process.env.UPLOADS_PATH || 'uploads'}`, express.static(process.env.UPLOADS_PATH || 'uploads'));

app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
});

app.post('/api/community-cocktails', upload.single('image'), addCocktail);

app.get('/api/community-cocktails', getCommunityCocktails);

app.delete('/api/community-cocktails/:id', verifyAdmin, removeCocktail);

app.post('/api/community-cocktails/:id/rate', async (req, res) => {
  await addRating(req, res);
});

app.get('/api/ingredients', async (req, res) => {
  try {
    const cachedIngredients = cache.get('ingredients');
    if (cachedIngredients) {
      return res.json({ ingredients: cachedIngredients });
    }

    const { data } = await axios.get(`${API_URL}/list.php?i=list`);
    if (data && data.drinks) {
      cache.set('ingredients', data.drinks);
      res.json({ ingredients: data.drinks });
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Error fetching ingredients list:', error.message);
    res.status(500).json({ error: 'Failed to fetch ingredients list' });
  }
});

app.post('/api/cocktails', async (req, res) => {
  const { ingredients, page = 1, limit = 50, sortOption } = req.body;

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ success: false, message: 'No ingredients provided' });
  }

  try {
    const cocktailPromises = ingredients.map((ingredient) =>
      pLimit(5)(async () => {
        const cachedData = cache.get(`filter_${ingredient}`);
        if (cachedData) {
          return cachedData;
        }

        const { data } = await axios.get(`${API_URL}/filter.php?i=${ingredient}`);
        cache.set(`filter_${ingredient}`, data);
        return data;
      })
    );

    const responses = await Promise.allSettled(cocktailPromises);
    const successfulResponses = responses
      .filter(response => response.status === 'fulfilled')
      .map(response => response.value);

    let cocktails = successfulResponses.flatMap(response => response.drinks || []);
    const uniqueCocktails = Array.from(new Set(cocktails.map(cocktail => cocktail.idDrink)))
      .map(idDrink => cocktails.find(cocktail => cocktail.idDrink === idDrink));

    const startIndex = (page - 1) * limit;
    const paginatedCocktails = uniqueCocktails.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: paginatedCocktails,
      currentPage: page,
      totalPages: Math.ceil(uniqueCocktails.length / limit),
    });
  } catch (error) {
    console.error('Error fetching cocktails:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch cocktails' });
  }
});

app.get('/api/lookup/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const cachedCocktail = cache.get(`cocktail_${id}`);
    if (cachedCocktail) {
      return res.json({ drinks: [cachedCocktail] });
    }

    const { data } = await axios.get(`${API_URL}/lookup.php?i=${id}`);

    if (data && Array.isArray(data.drinks) && data.drinks.length > 0) {
      cache.set(`cocktail_${id}`, data.drinks[0]);
      return res.json({ drinks: data.drinks });
    } else {
      console.warn(`No drinks found for ID ${id}`);
      return res.status(404).json({ drinks: [] });
    }
  } catch (error) {
    console.error('Error fetching cocktail details:', error.message);
    res.status(500).json({ error: 'Failed to fetch cocktail details' });
  }
});

const getUserNameFromEmail = (email) => {
  return email.split('@')[0];
};

app.get('/api/community-cocktails/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid cocktail ID' });
  }

  try {
    const cocktail = await Cocktail.findById(id);
    if (!cocktail) {
      return res.status(404).json({ error: 'Cocktail not found' });
    }
    res.json(cocktail);
  } catch (error) {
    console.error('Error fetching community cocktail details:', error);
    res.status(500).json({ error: 'Server error fetching cocktail details' });
  }
});

app.post('/api/community-cocktails/:id/comment', async (req, res) => {
  const { id } = req.params;
  const { text, userId } = req.body;

  try {
    const cocktail = await Cocktail.findById(id);
    if (!cocktail) {
      return res.status(404).json({ message: 'Cocktail not found' });
    }

    const userName = getUserNameFromEmail(userId);

    const newComment = {
      userId,
      userName,
      text,
      createdAt: new Date(),
    };

    cocktail.comments.push(newComment);
    await cocktail.save();

    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

app.post('/api/verify-token', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return res.status(200).json({ success: true, decodedToken });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).send('Something went wrong!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
