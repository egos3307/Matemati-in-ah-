const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function getAccessToken() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID veya GOOGLE_CLIENT_SECRET eksik!');
  }

  console.log('OAuth2 Refresh Token ile access token alınıyor...');
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
  if (!res.ok || !data.access_token) {
    throw new Error(`Token alınamadı: ${JSON.stringify(data)}`);
  }

  console.log('✅ Access token alındı:', data.access_token.substring(0, 15) + '...');
  return data.access_token;
}

async function testUpload() {
  try {
    const token = await getAccessToken();

    const assembledBuffer = Buffer.from('Fullematematiği Drive test dosyası!');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const metadata = {
      name: 'fullemat_test.txt',
      mimeType: 'text/plain',
      ...(folderId ? { parents: [folderId] } : {}),
    };

    const boundary = '----TestBoundary' + Math.random().toString(36).substring(2);
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Type: text/plain\r\n\r\n`));
    parts.push(assembledBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const payload = Buffer.concat(parts);

    console.log('Drive\'a test dosyası yükleniyor...');
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
