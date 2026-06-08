const { Resend } = require('resend');

const EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NYX — You are on the list.</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Courier New',monospace;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;min-height:100vh;">
    <tr>
      <td align="center" style="padding:60px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#000000;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,#c8b89a,transparent);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:48px 48px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 24px;font-size:9px;letter-spacing:0.45em;text-transform:uppercase;color:rgba(200,184,154,0.6);font-family:'Courier New',monospace;">Autonomous AI Operating System</p>
              <h1 style="margin:0;font-family:Georgia,serif;font-size:64px;font-weight:300;letter-spacing:0.25em;color:#f0ede8;text-transform:uppercase;line-height:1;">NYX</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:56px 48px 48px;">
              <p style="margin:0 0 8px;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;color:#c8b89a;font-family:'Courier New',monospace;">Access Requested</p>
              <h2 style="margin:0 0 32px;font-family:Georgia,serif;font-size:36px;font-weight:300;color:#f0ede8;line-height:1.15;">You are on the list.</h2>
              <p style="margin:0 0 20px;font-size:12px;line-height:1.9;color:rgba(240,237,232,0.5);letter-spacing:0.03em;font-family:'Courier New',monospace;">Your request has been received and logged. NYX access is reviewed manually — not granted by algorithm, not issued by default.</p>
              <p style="margin:0 0 20px;font-size:12px;line-height:1.9;color:rgba(240,237,232,0.5);letter-spacing:0.03em;font-family:'Courier New',monospace;">When the time is right, you will hear from us. Until then, the system is already watching.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0;">
                <tr><td style="height:1px;background:rgba(255,255,255,0.06);font-size:0;">&nbsp;</td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:0 0 24px;">
                  <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#c8b89a;font-family:'Courier New',monospace;">01 — OBSERVE</p>
                  <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.35);letter-spacing:0.03em;line-height:1.6;font-family:'Courier New',monospace;">Every signal captured. Nothing lost.</p>
                </td></tr>
                <tr><td style="padding:0 0 24px;">
                  <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#c8b89a;font-family:'Courier New',monospace;">02 — ANALYZE</p>
                  <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.35);letter-spacing:0.03em;line-height:1.6;font-family:'Courier New',monospace;">AI processes performance across every domain simultaneously.</p>
                </td></tr>
                <tr><td style="padding:0 0 24px;">
                  <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#c8b89a;font-family:'Courier New',monospace;">03 — OPTIMIZE</p>
                  <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.35);letter-spacing:0.03em;line-height:1.6;font-family:'Courier New',monospace;">Precision recommendations. Automated actions. Compounding results.</p>
                </td></tr>
                <tr><td>
                  <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#c8b89a;font-family:'Courier New',monospace;">04 — COMPOUND</p>
                  <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.35);letter-spacing:0.03em;line-height:1.6;font-family:'Courier New',monospace;">The longer you operate within NYX, the stronger the system becomes.</p>
                </td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0;">
                <tr><td style="height:1px;background:rgba(255,255,255,0.06);font-size:0;">&nbsp;</td></tr>
              </table>
              <p style="margin:0;font-family:Georgia,serif;font-size:18px;font-weight:300;font-style:italic;color:rgba(240,237,232,0.4);letter-spacing:0.05em;line-height:1.6;">
                "What operates in the dark<br>controls what happens in the light."
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 48px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:14px;font-weight:300;letter-spacing:0.3em;text-transform:uppercase;color:rgba(240,237,232,0.2);">NYX</p>
              <p style="margin:0;font-size:9px;letter-spacing:0.15em;color:rgba(240,237,232,0.15);font-family:'Courier New',monospace;">This message was sent because you requested access. You will not be contacted unnecessarily.</p>
            </td>
          </tr>
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,rgba(200,184,154,0.3),transparent);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let email;
  try {
    const body = JSON.parse(event.body);
    email = body.email;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'NYX <labs@nyxsystem.online>',
      to: email,
      subject: 'You are on the list.',
      html: EMAIL_HTML,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('Resend error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' }),
    };
  }
};
