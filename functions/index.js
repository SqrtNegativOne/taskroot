const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { google } = require("googleapis");

admin.initializeApp();
const db = admin.firestore();

// You must configure these secrets in Firebase or hardcode them here for local testing.
// In production, use Firebase Secret Manager for the CLIENT_SECRET.
const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "YOUR_GOOGLE_CLIENT_SECRET";
const REDIRECT_URI = "postmessage"; // "postmessage" is used for the GIS web flow

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

/**
 * Endpoint 1: Exchange an authorization code for a refresh token.
 * The client sends the auth 'code' obtained from Google Identity Services.
 * We store the refresh_token in Firestore so the user doesn't have to login again.
 */
exports.exchangeAuthCode = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "User must be logged in.");
  
  const code = request.data.code;
  if (!code) throw new HttpsError("invalid-argument", "Missing auth code.");

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store the refresh token in Firestore securely under the user's document
    if (tokens.refresh_token) {
      await db.collection("users").doc(uid).set({
        googleRefreshToken: tokens.refresh_token
      }, { merge: true });
    }
    
    // Return the short-lived access token directly to the frontend so it can start syncing
    return { accessToken: tokens.access_token };
  } catch (error) {
    console.error("Error exchanging auth code:", error);
    throw new HttpsError("internal", "Failed to exchange auth code.");
  }
});

/**
 * Endpoint 2: Get a fresh Access Token using the stored Refresh Token.
 * The client calls this whenever its 1-hour access token expires.
 */
exports.getFreshAccessToken = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "User must be logged in.");

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const refreshToken = userDoc.data()?.googleRefreshToken;

    if (!refreshToken) {
      throw new HttpsError("failed-precondition", "No refresh token found for user. Must re-authenticate.");
    }

    // Set the refresh token and let the googleapis library fetch a new access token
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    return { accessToken: credentials.access_token };
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw new HttpsError("internal", "Failed to refresh access token.");
  }
});
