import Cocktail from '../models/Cocktail.js';
import admin from '../firebaseAdmin.js';
import dotenv from 'dotenv';

dotenv.config();

const getUserNameFromFirebase = async (userId) => {
  try {
    const userRecord = await admin.auth().getUser(userId);
    return userRecord.email.split('@')[0];
  } catch (error) {
    console.error('Error fetching user name from Firebase:', error);
    return 'User';
  }
};

// Funkcja do dodawania nowego koktajlu społecznościowego
export const addCocktail = async (req, res) => {
  const { userId, name, ingredients, instructions } = req.body;
  const uploadsPath = process.env.UPLOADS_PATH || 'uploads'; // Dynamiczna ścieżka
  const image = req.file ? `/${uploadsPath}/${req.file.filename}` : null;

  try {
    // Przekształcamy userId (e-mail) na nazwę przed `@`, zamiast wywoływać Firebase
    const creator = userId.split('@')[0];

    if (!image) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const newCocktail = new Cocktail({
      userId,
      name,
      ingredients,
      instructions,
      image,
      creator,
      comments: [],
      ratings: [],
    });

    await newCocktail.save();
    res.status(201).json({ success: true, message: 'Cocktail added successfully!' });
  } catch (error) {
    console.error('Error adding cocktail:', error);
    res.status(500).json({ success: false, message: 'Failed to add cocktail' });
  }
};

// Funkcja do pobierania wszystkich koktajli społecznościowych
export const getCommunityCocktails = async (req, res) => {
  try {
    const cocktails = await Cocktail.find();
    res.status(200).json(cocktails);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch community cocktails' });
  }
};

// Funkcja do pobierania szczegółów koktajlu
export const getCocktailDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const cocktail = await Cocktail.findById(id);
    if (!cocktail) {
      return res.status(404).json({ success: false, message: 'Cocktail not found' });
    }

    // Oblicz średnią ocenę
    const averageRating =
      cocktail.ratings.length > 0
        ? cocktail.ratings.reduce((sum, rating) => sum + rating.score, 0) / cocktail.ratings.length
        : 0;

    // Przekształć dokument Mongoose na obiekt JavaScript
    const cocktailData = cocktail.toObject();

    // Dodaj średnią ocenę do obiektu koktajlu
    cocktailData.averageRating = averageRating;

    // Zwróć dane w formacie oczekiwanym przez frontend
    res.status(200).json({
      success: true,
      cocktail: cocktailData, // Użycie klucza "cocktail" jako obiektu głównego
    });
  } catch (error) {
    console.error('Error fetching cocktail details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cocktail details' });
  }
};

// Funkcja do usuwania koktajlu
export const removeCocktail = async (req, res) => {
  const { id } = req.params;
  try {
    await Cocktail.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Cocktail removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove cocktail' });
  }
};

// Funkcja do dodawania komentarza do koktajlu
export const addComment = async (req, res) => {
  const { cocktailId, userId, text } = req.body;

  const userName = await getUserNameFromFirebase(userId);

  try {
    const cocktail = await Cocktail.findById(cocktailId);
    if (!cocktail)
      return res.status(404).json({ success: false, message: 'Cocktail not found' });

    const newComment = { userId, userName, text, createdAt: new Date() };
    cocktail.comments.push(newComment);

    await cocktail.save();
    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

// Funkcja do dodawania oceny do koktajlu
export const addRating = async (req, res) => {
  const { cocktailId, userId, score } = req.body;

  try {
    const cocktail = await Cocktail.findById(cocktailId);
    if (!cocktail)
      return res.status(404).json({ success: false, message: 'Cocktail not found' });

    // Usuń wcześniejszą ocenę użytkownika, jeśli istnieje
    cocktail.ratings = cocktail.ratings.filter((rating) => rating.userId !== userId);

    // Dodaj nową ocenę
    cocktail.ratings.push({ userId, score });

    // Oblicz średnią ocenę
    const avgRating =
      cocktail.ratings.reduce((sum, rating) => sum + rating.score, 0) / cocktail.ratings.length;

    await cocktail.save();
    res.status(201).json({ success: true, averageRating: avgRating });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add rating' });
  }
};
