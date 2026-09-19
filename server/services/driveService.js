/**
 * Google Drive Video Kayıtları Yardımcı Servisi
 * Fullematematiği - Hızlı ve Güvenli İzleme Sistemi
 */

/**
 * Verilen metin veya URL'den Google Drive fileId'sini güvenli bir şekilde ayıklar.
 * Desteklenen formatlar:
 * - drive:FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view...
 * - https://drive.google.com/file/d/FILE_ID/edit...
 * - https://drive.google.com/file/d/FILE_ID
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://drive.google.com/uc?export=download&id=FILE_ID
 * - Yalın Google Drive File ID (25-50 karakterlik alfanümerik, tire ve alt çizgi içeren ID)
 */
function extractDriveFileId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // 1. drive:FILE_ID formatı
  if (trimmed.startsWith('drive:')) {
    const id = trimmed.replace('drive:', '').trim();
    if (isValidDriveFileId(id)) return id;
  }

  // 2. /file/d/FILE_ID formatı
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // 3. id=FILE_ID parametresi (open?id=, uc?id= vb.)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // 4. Doğrudan yalın fileId girilmişse (Drive klasör linkleri hariç tutulur)
  if (!trimmed.includes('/') && !trimmed.includes('?') && isValidDriveFileId(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Drive File ID format doğrulaması
 */
function isValidDriveFileId(id) {
  if (!id || typeof id !== 'string') return false;
  // Google Drive file ID'leri tipik olarak 25 ila 45 karakter arasında alfanümerik, tire ve altçizgiden oluşur
  return /^[a-zA-Z0-9_-]{15,60}$/.test(id);
}

/**
 * İlgili dosyanın yalnızca kendi bağlantısıyla izlenebilmesi için
 * Google Drive üzerinde dosya bazında "anyone with link" reader iznini kontrol eder ve tanımlar.
 * 
 * ÖNEMLİ:
 * - Ana kayıt klasörüne ASLA izin verilmez.
 * - Sadece bu tekil dosyanın ID'sine izin verilir.
 * - Bu sayede kullanıcı videoyu açtığında klasördeki diğer videolara veya ana klasöre erişemez.
 */
async function ensureDriveFileReadable(fileId, getAccessTokenFn) {
  if (!isValidDriveFileId(fileId) || typeof getAccessTokenFn !== 'function') {
    return false;
  }

  try {
    const authData = await getAccessTokenFn();
    if (!authData || !authData.token) {
      console.warn(`[Drive Perm] Access token alınamadı. File ID: ${fileId}`);
      return false;
    }

    const token = authData.token;

    // 1. Mevcut izinleri kontrol et
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true&fields=permissions(id,type,role)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (listRes.ok) {
      const permData = await listRes.json();
      const hasAnyoneReader = (permData.permissions || []).some(
        p => p.type === 'anyone' && (p.role === 'reader' || p.role === 'viewer')
      );
      if (hasAnyoneReader) {
        // İzin zaten mevcut
        return true;
      }
    }

    // 2. Yalnızca bu dosyaya "anyone: reader" izni ekle
    const createRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      }
    );

    if (createRes.ok) {
      console.log(`[Drive Perm] Dosyaya link ile izleme izni verildi: ${fileId}`);
      return true;
    } else {
      const errText = await createRes.text();
      console.warn(`[Drive Perm] Dosya izni eklenemedi (${fileId}): ${errText}`);
      return false;
    }
  } catch (err) {
    console.warn(`[Drive Perm Hatası] ${fileId}:`, err.message);
    return false;
  }
}

/**
 * Google Drive ana kayıt klasörünün izinlerini denetler.
 * Ana klasörün herkese açık ('anyone') olup olmadığını tespit eder.
 */
async function inspectDriveFolderSecurity(folderId, getAccessTokenFn) {
  if (!folderId || typeof getAccessTokenFn !== 'function') {
    return { secure: true, message: 'Klasör ID veya auth fonksiyonu yok' };
  }

  try {
    const authData = await getAccessTokenFn();
    if (!authData || !authData.token) {
      return { secure: false, message: 'Drive access token temin edilemedi.' };
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?supportsAllDrives=true&fields=permissions(id,type,role)`,
      {
        headers: { Authorization: `Bearer ${authData.token}` }
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { secure: false, message: `Klasör izinleri sorgulanamadı: ${err}` };
    }

    const data = await res.json();
    const permissions = data.permissions || [];
    const publicPerms = permissions.filter(p => p.type === 'anyone');

    if (publicPerms.length > 0) {
      console.warn(`[Drive GÜVENLİK UYARISI] Ana ders kayıt klasöründe '${publicPerms.map(p => p.role).join(', ')}' türünde herkese açık izin bulundu!`);
      return {
        secure: false,
        hasPublicPermission: true,
        publicPermissions: publicPerms,
        message: 'Ana klasörde herkese açık izin bulundu. Dosya bazlı güvenlik için bu kaldırılmalıdır.'
      };
    }

    return {
      secure: true,
      hasPublicPermission: false,
      message: 'Ana klasör güvenli. Yalnızca yetkili hesapların erişimi var.'
    };
  } catch (err) {
    return { secure: false, message: err.message };
  }
}

/**
 * Dosya için standart Google Drive izleme URL'sini oluşturur.
 */
function buildDriveWatchUrl(fileId) {
  if (!isValidDriveFileId(fileId)) return null;
  return `https://drive.google.com/file/d/${fileId}/view`;
}

module.exports = {
  extractDriveFileId,
  isValidDriveFileId,
  ensureDriveFileReadable,
  inspectDriveFolderSecurity,
  buildDriveWatchUrl
};
