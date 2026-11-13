const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function emailContent(notification) {
  const text = notification.mensaje ||
    'Dental Match: tienes una nueva asignación. Revisa tu caso en la plataforma.';
  const message = escapeHtml(text).replace(/\r?\n/g, '<br>');
  return {
    text,
    html: `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f4f5f8;color:#17304b;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fff;border:1px solid #dde5ed;border-radius:14px;overflow:hidden">
<tr><td style="padding:20px 26px;background:#153451;color:#fff;font-size:19px;font-weight:bold">Dental Match</td></tr>
<tr><td style="padding:26px">
<h1 style="margin:0 0 14px;font-size:23px;line-height:1.25;color:#153451">${escapeHtml(notification.asunto || 'Aviso de Dental Match')}</h1>
<p style="margin:0;font-size:16px;line-height:1.6;overflow-wrap:anywhere">${message}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  };
}

module.exports = emailContent;
