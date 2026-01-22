import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const TOKEN_PATH = path.join(process.cwd(), '.google-tokens.json');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }
  
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback';
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function handleCallback(code: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

export async function getStoredTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const data = fs.readFileSync(TOKEN_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading tokens:', err);
  }
  return null;
}

export async function getAuthenticatedClient() {
  const tokens = await getStoredTokens();
  
  if (!tokens) {
    throw new Error('Not authenticated with Google');
  }
  
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
      oauth2Client.setCredentials(credentials);
    } catch (err) {
      console.error('Error refreshing token:', err);
      throw new Error('Failed to refresh Google token');
    }
  }
  
  return oauth2Client;
}

export async function isConnected(): Promise<boolean> {
  try {
    const tokens = await getStoredTokens();
    return !!tokens;
  } catch {
    return false;
  }
}

export async function deleteTokens(): Promise<void> {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
  } catch (err) {
    console.error('Error deleting tokens:', err);
  }
}
