const SPREADSHEET_ID = '1JjNrt1-HlSb06PpCC3NkxQENY6v-ghHZ2d6lnUNb1Qs';

function doPost(event) {
  const payload = JSON.parse(event.postData.contents);
  const secret = PropertiesService.getScriptProperties().getProperty('CONTACT_SCRIPT_SECRET');
  if (!secret || payload.secret !== secret) return reply({ ok: false });

  const fields = ['name', 'email', 'subject', 'message'];
  const limits = [120, 254, 200, 5000];
  const values = fields.map(field => typeof payload[field] === 'string' ? payload[field].trim() : '');
  if (payload.website || !/^[\da-f-]{36}$/i.test(payload.id) ||
      values.some((value, i) => !value || value.length > limits[i]) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[1])) {
    return reply({ ok: false, invalid: true });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Submissions');
    const lastRow = sheet.getLastRow();
    const duplicate = lastRow > 1 && sheet.getRange(2, 6, lastRow - 1, 1)
      .createTextFinder(payload.id).matchEntireCell(true).findNext();
    if (!duplicate) {
      const cells = values.map(value => /^[=+\-@]/.test(value) ? "'" + value : value);
      sheet.appendRow([new Date().toISOString(), ...cells, payload.id]);
      SpreadsheetApp.flush();
    }
    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
