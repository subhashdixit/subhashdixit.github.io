# Activate the contact form

1. Open the Portfolio Contact Submissions spreadsheet. In **Extensions → Apps Script**, replace the default code with `server/contact-sheet.gs`.
2. In Apps Script **Project Settings → Script properties**, add `CONTACT_SCRIPT_SECRET` with a random value (generate one with `openssl rand -hex 32`).
3. Choose **Deploy → New deployment → Web app**. Select **Execute as me** and allow **Anyone** to call the web app. Authorize it and copy its `/exec` URL.
4. Create `.env.local` in the portfolio folder. Set `CONTACT_SCRIPT_URL` to the deployment URL and `CONTACT_SCRIPT_SECRET` to the same secret. Restart Vite. Keep the spreadsheet’s sharing restricted.
5. Send a test message and check the **Submissions** tab. The form confirms delivery only after the script confirms the write.

Vite dev and preview serve the contact endpoint locally. A deployed site needs the same-origin `POST /api/contact` handler using `server/contact.mjs` in its server environment. A static-only deployment cannot receive form submissions by itself. Keep both environment values server-side.
