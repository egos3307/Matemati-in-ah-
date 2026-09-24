const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

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
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const headerEnc = base64url(Buffer.from(JSON.stringify(header)));
  const claimEnc = base64url(Buffer.from(JSON.stringify(claim)));
  const jwtVal = `${headerEnc}.${claimEnc}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(jwtVal);
  const signature = base64url(sign.sign(formattedKey));
  return `${jwtVal}.${signature}`;
}

async function getAccessToken() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (refreshToken && clientId && clientSecret) {
    console.log('1️⃣ OAuth2 Refresh Token ile access token alınıyor...');
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await res.json();
      if (res.ok && data.access_token) {
        console.log('✅ OAuth2 Access token alındı!');
        return { token: data.access_token, type: 'OAuth2' };
      }
      console.warn('⚠️ OAuth2 Refresh Token hatası:', JSON.stringify(data));
    } catch (err) {
      console.warn('⚠️ OAuth2 İsteği hatası:', err.message);
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (email && privateKey) {
    console.log('2️⃣ Service Account ile access token alınıyor...');
    try {
      const jwt = generateGoogleAccessToken(email, privateKey);
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        console.log('✅ Service Account Access token alındı!');
        return { token: data.access_token, type: 'ServiceAccount' };
      }
      console.warn('⚠️ Service Account Token hatası:', JSON.stringify(data));
    } catch (err) {
      console.warn('⚠️ Service Account hatası:', err.message);
    }
  }

  throw new Error('Geçerli bir Google Drive kimlik doğrulama yöntemi bulunamadı!');
}

async function verifyDriveFolder(accessToken, folderId) {
  if (!folderId) return false;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType&supportsAllDrives=true`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Drive] Klasör doğrulama başarısız (${folderId}): ${err}`);
      return false;
    }
    const data = await res.json();
    console.log(`[Drive] Klasör doğrulandı: "${data.name}" (${data.id})`);
    return true;
  } catch (e) {
    console.warn(`[Drive] Klasör doğrulama hatası: ${e.message}`);
    return false;
  }
}

async function testUpload() {
  try {
    const { token, type } = await getAccessToken();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    let resolvedFolderId = folderId;
    if (folderId) {
      const folderOk = await verifyDriveFolder(token, folderId);
      if (!folderOk) {
        resolvedFolderId = null;
      }
    }

    if (type === 'ServiceAccount' && !resolvedFolderId) {
      console.error('\n❌ Service Account için geçerli/paylaşılan bir Google Drive Klasör ID şarttır!');
      console.error(`Lütfen Google Drive'da bir klasör oluşturun, "${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}" e-postasına "Düzenleyen" (Editor) izni verin ve klasör ID'sini .env dosyasına (GOOGLE_DRIVE_FOLDER_ID) ekleyin.`);
      return;
    }

    const assembledBuffer = Buffer.from('Platform Drive test dosyasi!');
    const metadata = {
      name: 'drive_test.txt',
      mimeType: 'text/plain',
      ...(resolvedFolderId ? { parents: [resolvedFolderId] } : {}),
    };

    const boundary = '----TestBoundary' + Math.random().toString(36).substring(2);
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Type: text/plain\r\n\r\n`));
    parts.push(assembledBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const payload = Buffer.concat(parts);

    console.log(`Drive'a test dosyası yükleniyor (${type})...`);
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(payload.length),
      },
      body: payload,
    });

    const fileData = await response.json();
    if (!response.ok) {
      throw new Error(`Drive API hatası: ${JSON.stringify(fileData)}`);
    }

    console.log('\n🎉 BAŞARILI! Drive\'a yüklendi!');
    console.log('File ID:', fileData.id);
    console.log('URL:', `https://drive.google.com/file/d/${fileData.id}/view`);
    console.log('\n✅ Sistem hazır — ders kayıtları artık Drive\'a yüklenecek!');

  } catch (err) {
    console.error('\n❌ TEST BAŞARISIZ:', err.message);
  }
}

testUpload();
