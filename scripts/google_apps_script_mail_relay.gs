/**
 * UAO Conecta password-reset mail relay for Render Free.
 * Deploy as a Web App that executes as the owner and accepts anonymous requests.
 * Store the shared key in Script Properties as GOOGLE_MAIL_RELAY_SECRET.
 */
function doPost(e) {
  try {
    const input = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const expectedSecret = PropertiesService.getScriptProperties()
      .getProperty("GOOGLE_MAIL_RELAY_SECRET");

    if (!expectedSecret || !safeEquals_(String(input.secret || ""), expectedSecret)) {
      return json_({ ok: false, error: "Unauthorized" });
    }

    const recipient = String(input.to || "").trim().toLowerCase();
    if (!/^[^\s@]+@uao\.edu\.co$/i.test(recipient)) {
      return json_({ ok: false, error: "Recipient not allowed" });
    }

    const subject = String(input.subject || "Restablece tu contraseña · UAO Conecta").slice(0, 160);
    const text = String(input.text || "").slice(0, 12000);
    const html = String(input.html || "").slice(0, 24000);
    if (!text || !html) return json_({ ok: false, error: "Message is incomplete" });

    const cache = CacheService.getScriptCache();
    const throttleKey = "reset-mail:" + recipient;
    if (cache.get(throttleKey)) return json_({ ok: false, error: "Try again later" });
    cache.put(throttleKey, "1", 60);

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: text,
      htmlBody: html,
      name: "UAO Conecta",
    });

    return json_({ ok: true });
  } catch (err) {
    console.error("Mail relay failed: " + String(err && err.name || "Error"));
    return json_({ ok: false, error: "Mail could not be sent" });
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeEquals_(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i++) result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return result === 0;
}
