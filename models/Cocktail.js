import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const ratingSchema = new mongoose.Schema({
  userId: String,
  score: Number,
});

const cocktailSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  ingredients: [{ name: String, measure: String, imageUrl: String }],
  instructions: { type: String, required: true },
  image: { type: String, required: true },
  creator: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  comments: [commentSchema],
  ratings: [ratingSchema],
});

// Wirtualne pole do obliczania średniej oceny
cocktailSchema.virtual('averageRating').get(function () {
  if (this.ratings.length === 0) return 0;
  const totalScore = this.ratings.reduce((acc, rating) => acc + rating.score, 0);
  return totalScore / this.ratings.length;
});

// Wirtualne pole do obliczania liczby komentarzy
cocktailSchema.virtual('commentsCount').get(function () {
  return this.comments.length;
});

// Opcje, aby uwzględnić wirtualne pola w JSON-ie
cocktailSchema.set('toJSON', { virtuals: true });
cocktailSchema.set('toObject', { virtuals: true });

const Cocktail = mongoose.model('Cocktail', cocktailSchema);

export default Cocktail;
