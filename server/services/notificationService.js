const dotenv = require('dotenv');
dotenv.config();

/**
 * Netgsm SMS API Integration
 */
async function sendNetgsmSMS(to, message) {
  const usercode = process.env.NETGSM_USERCODE;
  const password = process.env.NETGSM_PASSWORD;
  const header = process.env.NETGSM_HEADER || "FULLEMAT";

  if (!usercode || !password) {
    console.warn("Netgsm credentials not found in env. SMS not sent.");
    return { success: false, error: "Credentials missing in .env" };
  }

  // Clean phone number (Netgsm expects 10 digits for TR numbers: 5xxxxxxxxx)
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('90') && phone.length === 12) {
    phone = phone.substring(2);
  } else if (phone.startsWith('0') && phone.length === 11) {
    phone = phone.substring(1);
  }

  try {
    const params = new URLSearchParams({
      usercode,
      password,
      gsmno: phone,
      message,
      msgheader: header,
      filter: '0'
    });

    const response = await fetch(`https://api.netgsm.com.tr/sms/send/get/?${params.toString()}`);
    const text = await response.text();
    console.log("Netgsm SMS response:", text);

    if (text.startsWith("00") || text.includes("success") || text.length > 5) { // Netgsm returns code on success (e.g. 12345678)
      // Any text starting with "00" or simple digits is usually success
      if (text.startsWith("70") || text.startsWith("80") || text.startsWith("40")) {
        return { success: false, error: `Netgsm error code: ${text}` };
      }
      return { success: true, id: text };
    }
    return { success: false, error: text };
  } catch (error) {
    console.error("Netgsm SMS request failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * UltraMsg WhatsApp API Integration
 */
async function sendUltraMsgWhatsApp(to, message) {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.warn("UltraMsg credentials not found in env. WhatsApp not sent.");
    return { success: false, error: "Credentials missing in .env" };
  }

  // Clean phone number (WhatsApp expects full format with country code: 905xxxxxxxxx)
  let phone = to.replace(/\D/g, '');
  if (phone.length === 10) {
    phone = `90${phone}`;
  } else if (phone.length === 11 && phone.startsWith('0')) {
    phone = `90${phone.substring(1)}`;
  }

  try {
    const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token,
        to: phone,
        body: message
      })
    });
    const data = await response.json();
    console.log("UltraMsg response:", data);
    if (data.sent === "true" || data.success) {
      return { success: true, data };
    }
    return { success: false, error: data.error || data };
  } catch (error) {
    console.error("UltraMsg WhatsApp request failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * General Notify function
 */
async function notifyLessonStart(student, lesson) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://fullematematigi.com';
  const message = `Merhaba ${student.name}, "${lesson.title}" dersimiz başlamak üzere! Derse katılmak için öğrenci panelinize giriş yapabilirsiniz: ${frontendUrl}/ogrenci`;

  console.log(`Sending notification to student ${student.name}...`);

  const results = {};

  // Try SMS if student has studentTel
  if (student.studentTel) {
    results.sms = await sendNetgsmSMS(student.studentTel, message);
  } else {
    results.sms = { success: false, error: "Öğrenci telefon numarası yok" };
  }

  // Try WhatsApp if student has studentTel
  if (student.studentTel) {
    results.whatsapp = await sendUltraMsgWhatsApp(student.studentTel, message);
  } else {
    results.whatsapp = { success: false, error: "Öğrenci telefon numarası yok" };
  }

  // Send to parent as well if parentTel exists
  if (student.parentTel) {
    const parentMsg = `Merhaba ${student.parentName || 'Velimiz'}, öğrencimiz ${student.name}'in "${lesson.title}" dersi başlamak üzere. Canlı ders takibi için panelinize giriş yapabilirsiniz: ${frontendUrl}/`;
    results.parentSms = await sendNetgsmSMS(student.parentTel, parentMsg);
    results.parentWhatsapp = await sendUltraMsgWhatsApp(student.parentTel, parentMsg);
  }

  return results;
}

module.exports = {
  sendNetgsmSMS,
  sendUltraMsgWhatsApp,
  notifyLessonStart
};
