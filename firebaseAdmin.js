import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe z pliku `.env`
dotenv.config();

// Zainicjuj Firebase Admin z danymi uwierzytelniającymi z `.env`
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Usuń znaki `\n`
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

// Funkcja dodająca rolę administratora
const addAdminRole = async (email) => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`${email} is now an admin.`);
  } catch (error) {
    console.error('Error adding admin role:', error);
  }
};

// Przykładowe użycie
addAdminRole('kacper.losinski@gmail.com'); // Podaj właściwy email

export default admin;
