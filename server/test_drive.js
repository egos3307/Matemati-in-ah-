const dotenv = require('dotenv');
const crypto = require('crypto');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateGoogleAccessToken(clientEmail, privateKey) {
  let formattedKey = privateKey.replace(/\\n/g, '\n').trim();
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
  }
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Header = base64url(Buffer.from(JSON.stringify(header)));
  const base64Claim = base64url(Buffer.from(JSON.stringify(claim)));
  const signatureInput = `${base64Header}.${base64Claim}`;
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = base64url(sign.sign(formattedKey));
  
  return `${signatureInput}.${signature}`;
}

async function getGoogleDriveAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  
  console.log("Email from .env:", email);
  console.log("Private Key length:", privateKey ? privateKey.length : 0);
  console.log("Private Key starts with:", privateKey ? privateKey.substring(0, 40) : 'N/A');

  if (!email || !privateKey) {
    throw new Error('Google Service Account credentials are not set.');
  }

  const jwt = generateGoogleAccessToken(email, privateKey);
  console.log("Generated JWT Assertion successfully. Sending request to Google OAuth...");
  
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth token retrieval failed: ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function testUpload() {
  try {
    const token = await getGoogleDriveAccessToken();
    console.log("Access Token retrieved successfully:", token.substring(0, 10) + "...");
    
    // Attempt mock upload
    const assembledBuffer = Buffer.from("test video content");
    const metadata = {
      name: "test_temp_file.txt",
      mimeType: "text/plain"
    };
    
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (folderId) {
      metadata.parents = [folderId];
    }
    
    const boundary = '----GoogleDriveMultipartBoundary' + Math.random().toString(36).substring(2);
    
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Type: text/plain\r\n\r\n`));
    parts.push(assembledBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    
    const payload = Buffer.concat(parts);
    
    console.log("Uploading test file to Google Drive...");
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(payload.length)
      },
      body: payload
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive upload API failed: ${errorText}`);
    }
    
    const fileData = await response.json();
    console.log("Google Drive Test Upload Success! File ID:", fileData.id);
  } catch (err) {
    console.error("Test failed with error:", err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

testUpload();
