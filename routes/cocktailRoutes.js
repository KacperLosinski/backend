import express from 'express';
const router = express.Router();
import { getCocktailById, searchCocktailsByIngredients } from '../controllers/cocktailController';
import { addCocktail, removeCocktail, addComment, addRating } from '../controllers/communityCocktailController';

// Trasa do pobierania szczegółów koktajlu na podstawie ID
router.get('/lookup/:id', getCocktailById);

// Trasa do wyszukiwania koktajli na podstawie składników
router.post('/cocktails', searchCocktailsByIngredients);

// Trasa do dodawania koktajli społecznościowych przez użytkowników
router.post('/community-cocktails', addCocktail);

// Trasa do usuwania koktajli przez admina
router.delete('/community-cocktails/:id', removeCocktail);

// Trasa do dodawania komentarzy do koktajli
router.post('/community-cocktails/:id/comment', addComment);

// Trasa do dodawania ocen do koktajli
router.post('/community-cocktails/:id/rate', addRating);

export default router;
