import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Cocktail from './models/Cocktail.js';
import admin from './firebaseAdmin.js';

// Załaduj zmienne środowiskowe z pliku `.env`
dotenv.config();

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('Error: MONGO_URI is not defined in .env');
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

const getUserNameFromFirebase = async (userId) => {
  try {
    const userRecord = await admin.auth().getUser(userId);
    const userName = userRecord.email.split('@')[0];
    console.log(`Fetched userName: ${userName} for userId: ${userId}`);
    return userName;
  } catch (error) {
    console.error('Error fetching user name from Firebase:', error);
    return 'User';
  }
};

const updateCommentsWithUserNames = async () => {
  const cocktails = await Cocktail.find();
  console.log(`Found ${cocktails.length} cocktails in the database`);

  for (let cocktail of cocktails) {
    let updated = false;

    for (let comment of cocktail.comments) {
      if (!comment.userName && comment.userId) {
        const userName = await getUserNameFromFirebase(comment.userId);
        if (userName) {
          comment.userName = userName; // Ustaw `userName`
          updated = true;
          console.log(`Updated comment ${comment._id} with userName: ${userName}`);
        }
      }
    }

    if (updated) {
      await cocktail.save({ validateBeforeSave: false });
      console.log(`Saved updated cocktail: ${cocktail._id}`);
    } else {
      console.log(`No updates needed for cocktail: ${cocktail._id}`);
    }
  }

  console.log('Finished updating comments with user names.');
  mongoose.connection.close();
};

updateCommentsWithUserNames();
