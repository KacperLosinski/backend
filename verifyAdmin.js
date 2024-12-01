import admin from './firebaseAdmin.js';

const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];  // Pobieramy token z nagłówka

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);  // Weryfikacja tokena

    if (decodedToken.admin !== true) {  // Sprawdzamy, czy użytkownik ma rolę admina
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    req.currentUser = decodedToken;  // Przekazanie danych użytkownika do dalszej obsługi
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Unauthorized: Invalid token' });
  }
};

export default verifyAdmin;
