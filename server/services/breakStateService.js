/**
 * Break State Service (Mola Durumu Yönetim Servisi)
 * 
 * Vercel Serverless ve çoklu instance ortamında mola durumunun kaybolmaması için
 * persistent (Veritabanı) hazır mimari sunar.
 * 
 * Güvenlik & Dayanıklılık:
 * - Yeni veritabanı bağlanana kadar (%100 in-memory fallback) sıfır DB write hatası üretir.
 * - DATABASE_URL geçerli olduğunda BreakState tablosu üzerinden persist eder.
 */

const inMemoryBreakStates = new Map();

function isDbConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(
    url &&
    !url.includes('username:password') &&
    !url.includes('your-neon-url') &&
    (url.startsWith('postgres://') || url.startsWith('postgresql://'))
  );
}

let tableEnsured = false;
async function ensureBreakTableExists(prisma) {
  if (tableEnsured || !isDbConfigured() || !prisma) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BreakState" (
        "roomName" TEXT PRIMARY KEY,
        "breakActive" BOOLEAN NOT NULL DEFAULT true,
        "breakStartedAt" BIGINT NOT NULL,
        "breakEndsAt" BIGINT NOT NULL,
        "breakDuration" INTEGER NOT NULL,
        "breakStartedBy" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    tableEnsured = true;
  } catch (err) {
    // DB henüz hazır değilse sessizce in-memory devam et
    tableEnsured = false;
  }
}

async function startBreak(roomName, durationMinutes, userId, prisma) {
  const durationSec = Math.round(Number(durationMinutes) * 60);
  const now = Date.now();
  const breakEndsAt = now + durationSec * 1000;

  const breakState = {
    breakActive: true,
    breakStartedAt: now,
    breakEndsAt,
    breakDuration: durationSec,
    breakStartedBy: userId ? String(userId) : 'TEACHER'
  };

  // 1. L1 In-Memory Cache Güncelle
  inMemoryBreakStates.set(roomName, breakState);

  // 2. Eğer geçerli bir DB varsa ve bağlıysa persist et
  if (isDbConfigured() && prisma) {
    try {
      await ensureBreakTableExists(prisma);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "BreakState" ("roomName", "breakActive", "breakStartedAt", "breakEndsAt", "breakDuration", "breakStartedBy", "updatedAt")
        VALUES ($1, true, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT ("roomName") DO UPDATE 
        SET "breakActive" = true,
            "breakStartedAt" = $2,
            "breakEndsAt" = $3,
            "breakDuration" = $4,
            "breakStartedBy" = $5,
            "updatedAt" = CURRENT_TIMESTAMP;
      `, roomName, BigInt(now), BigInt(breakEndsAt), durationSec, breakState.breakStartedBy);
    } catch (err) {
      console.warn('[BreakState] Persistent write atlandı, in-memory aktif:', err.message);
    }
  }

  return breakState;
}

async function endBreak(roomName, prisma) {
  inMemoryBreakStates.delete(roomName);

  if (isDbConfigured() && prisma) {
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "BreakState" WHERE "roomName" = $1;
      `, roomName);
    } catch (err) {
      console.warn('[BreakState] Persistent delete atlandı:', err.message);
    }
  }

  return { success: true, breakActive: false };
}

async function getBreakStatus(roomName, prisma) {
  const now = Date.now();

  // 1. Önce in-memory cache'ten kontrol et
  let state = inMemoryBreakStates.get(roomName);

  // 2. Eğer in-memory'de yoksa ve DB yapılandırılmışsa DB'den sorgula (Serverless lambda uyumu)
  if (!state && isDbConfigured() && prisma) {
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT "roomName", "breakActive", "breakStartedAt", "breakEndsAt", "breakDuration", "breakStartedBy"
        FROM "BreakState"
        WHERE "roomName" = $1 AND "breakActive" = true
        LIMIT 1;
      `, roomName);

      if (rows && rows.length > 0) {
        const row = rows[0];
        state = {
          breakActive: Boolean(row.breakActive),
          breakStartedAt: Number(row.breakStartedAt),
          breakEndsAt: Number(row.breakEndsAt),
          breakDuration: Number(row.breakDuration),
          breakStartedBy: row.breakStartedBy
        };
        inMemoryBreakStates.set(roomName, state);
      }
    } catch (err) {
      // DB sorgusu başarısızsa in-memory durum kullanılır
    }
  }

  if (!state || !state.breakActive) {
    return { breakActive: false };
  }

  if (now >= state.breakEndsAt) {
    await endBreak(roomName, prisma);
    return { breakActive: false };
  }

  const remainingSeconds = Math.max(0, Math.ceil((state.breakEndsAt - now) / 1000));
  return {
    ...state,
    remainingSeconds
  };
}

module.exports = {
  startBreak,
  endBreak,
  getBreakStatus,
  ensureBreakTableExists
};
