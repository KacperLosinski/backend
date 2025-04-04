import admin from './firebaseAdmin.js';

export const addAdminRole = async (email) => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`${email} is now an admin.`);
  } catch (error) {
    console.error('Error adding admin role:', error);
  }
};