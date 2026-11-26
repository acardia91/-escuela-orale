/* ===========================================================================
   Avisos por email de Equipo Órale.

   Esto vive en el servidor y no dentro de index.html por un motivo concreto:
   la clave de Brevo no puede ir en una página que cualquiera puede abrir y
   leer con el botón derecho. Aquí no la ve nadie.

   Variables de entorno, en el panel de Vercel:
     BREVO_API_KEY         la clave de la API de Brevo
     BREVO_REMITENTE       dirección verificada en Brevo desde la que sale
     BREVO_REMITENTE_NOM   nombre que ve quien lo recibe (opcional)

   Si falta alguna, el endpoint responde que no está configurado y la app
   sigue funcionando igual: el protocolo se envía, lo único que no sale es
   el correo.
   =========================================================================== */

const SUPA_URL = 'https://pnpmigcbqgcggtkfkqeh.supabase.co';
const SUPA_KEY = 'sb_publishable_O52yBoiZ7mtqR4Y1E6JsjQ_L8pK_mUZ';
const APP_URL  = 'https://escuela.oralepadre.com';

const MAX_DESTINATARIOS = 30;

/* Este endpoint está abierto a internet: cualquiera puede llamarlo. No nos
   fiamos, por tanto, de las direcciones que vengan en la petición. Solo se
   envía a las que dirección ha guardado en escuela_config. Lo peor que puede
   conseguir alguien abusando de esto es mandarle al equipo de Órale un correo
   del equipo de Órale. */
async function direccionesPermitidas() {
  const r = await fetch(
    `${SUPA_URL}/rest/v1/escuela_config?select=clave,valor&clave=in.(emails,avisocopia)`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  if (!r.ok) throw new Error(`Supabase respondió ${r.status}`);
  const filas = await r.json();
  const lista = new Set();
  for (const f of filas) {
    if (f.clave === 'emails' && f.valor && typeof f.valor === 'object')
      for (const v of Object.values(f.valor)) if (v) lista.add(String(v).trim().toLowerCase());
    if (f.clave === 'avisocopia' && Array.isArray(f.valor))
      for (const v of f.valor) if (v) lista.add(String(v).trim().toLowerCase());
  }
  return lista;
}

const esc = (t) => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* El cuerpo lo construimos aquí, no lo acepta de fuera: así nadie puede usar
   esto para mandar el texto que le dé la gana con nuestro remitente. */
function montarCorreo({ nombre, protocolos, quien, repetir }) {
  const uno = protocolos.length === 1;
  const asunto = repetir
    ? (uno ? 'Tienes que repetir un protocolo' : `Tienes que repetir ${protocolos.length} protocolos`)
    : (uno ? 'Tienes un protocolo nuevo' : `Tienes ${protocolos.length} protocolos nuevos`);

  const intro = repetir
    ? `${esc(quien)} te ha pedido que vuelvas a hacer ${uno ? 'este protocolo' : 'estos protocolos'}. Se queda la nota más alta de las dos, así que repetirlo solo puede sumarte.`
    : `${esc(quien)} te ha abierto ${uno ? 'un protocolo nuevo' : 'protocolos nuevos'} en Equipo Órale. Te aparecen arriba del todo al entrar.`;

  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f4efe9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe9;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fbf7f2;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <tr><td style="background:#1a1613;padding:22px 24px">
    <div style="color:#c9b89a;font-size:11px;letter-spacing:2px;text-transform:uppercase">Equipo Órale</div>
    <div style="color:#fbf7f2;font-size:21px;font-weight:700;margin-top:5px">${esc(asunto)}</div>
  </td></tr>
  <tr><td style="padding:24px">
    <p style="margin:0 0 16px;font-size:16px;color:#1a1613">Hola ${esc(nombre)},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#4a423b">${intro}</p>
    ${protocolos.map((p) => `<div style="border-left:3px solid #8c2f24;background:#f4efe9;border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:9px">
      <strong style="font-size:15px;color:#1a1613">${esc(p)}</strong></div>`).join('')}
    <p style="margin:22px 0 0">
      <a href="${APP_URL}" style="display:inline-block;background:#8c2f24;color:#fbf7f2;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:9px">Entrar y hacerlo</a>
    </p>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#8a7f74">
      Entras con tu nombre y tu PIN de cuatro dígitos en ${esc(APP_URL)}. Son unos minutos.</p>
  </td></tr>
  <tr><td style="background:#f4efe9;padding:14px 24px;font-size:12px;color:#8a7f74">
    Órale Padre · San Luis · Los Remedios · Sevilla Este · Tomares</td></tr>
</table></td></tr></table></body></html>`;

  const texto = `${asunto}

Hola ${nombre},

${intro.replace(/<[^>]+>/g, '')}

${protocolos.map((p) => `· ${p}`).join('\n')}

Entra en ${APP_URL} con tu nombre y tu PIN de cuatro dígitos.

Órale Padre`;

  return { asunto, html, texto };
}

/* La copia que recibe dirección no es el mismo correo: a ellos no les toca
   hacer nada, lo que quieren saber es quién ha mandado qué y a cuántos. */
function montarResumen({ protocolos, quien, repetir, cuantos }) {
  const asunto = `${quien} ${repetir ? 'ha mandado repetir' : 'ha enviado'} ${protocolos.length === 1 ? 'un protocolo' : protocolos.length + ' protocolos'}`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f4efe9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe9;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fbf7f2;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <tr><td style="background:#1a1613;padding:22px 24px">
    <div style="color:#c9b89a;font-size:11px;letter-spacing:2px;text-transform:uppercase">Equipo Órale · copia para dirección</div>
    <div style="color:#fbf7f2;font-size:20px;font-weight:700;margin-top:5px">${esc(asunto)}</div></td></tr>
  <tr><td style="padding:24px">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#4a423b">
      <strong style="color:#1a1613">${esc(quien)}</strong> ${repetir ? 'ha pedido que repitan' : 'ha abierto'}
      ${protocolos.length === 1 ? 'este protocolo' : 'estos protocolos'} a
      <strong style="color:#1a1613">${cuantos} ${cuantos === 1 ? 'persona' : 'personas'}</strong>.</p>
    ${protocolos.map((p) => `<div style="border-left:3px solid #8c2f24;background:#f4efe9;border-radius:0 8px 8px 0;padding:12px 14px;margin-bottom:9px">
      <strong style="font-size:15px;color:#1a1613">${esc(p)}</strong></div>`).join('')}
    <p style="margin:22px 0 0">
      <a href="${APP_URL}" style="display:inline-block;background:#1a1613;color:#fbf7f2;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:9px">Ver quién lo ha hecho</a></p>
  </td></tr></table></td></tr></table></body></html>`;
  const texto = `${asunto}\n\n${quien} ${repetir ? 'ha pedido que repitan' : 'ha abierto'} a ${cuantos} persona(s):\n${protocolos.map((p) => `· ${p}`).join('\n')}\n\n${APP_URL}`;
  return { asunto, html, texto };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' });

  const CLAVE = process.env.BREVO_API_KEY;
  const DE    = process.env.BREVO_REMITENTE;
  const DE_N  = process.env.BREVO_REMITENTE_NOM || 'Equipo Órale';
  if (!CLAVE || !DE) {
    return res.status(503).json({
      error: 'sin_configurar',
      detalle: 'Faltan BREVO_API_KEY o BREVO_REMITENTE en las variables de entorno de Vercel.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Cuerpo no válido' });

  const quien      = String(body.quien || 'Dirección').slice(0, 60);
  const repetir    = !!body.repetir;
  const protocolos = (Array.isArray(body.protocolos) ? body.protocolos : [])
    .map((p) => String(p).slice(0, 120)).filter(Boolean).slice(0, 12);
  const gente = (Array.isArray(body.destinatarios) ? body.destinatarios : [])
    .slice(0, MAX_DESTINATARIOS)
    .map((d) => ({
      nombre: String((d && d.nombre) || '').slice(0, 60),
      email: String((d && d.email) || '').trim().toLowerCase().slice(0, 160)
    }))
    .filter((d) => d.email && d.nombre);

  const copia = (Array.isArray(body.copia) ? body.copia : [])
    .slice(0, 6).map((c) => String(c || '').trim().toLowerCase().slice(0, 160)).filter(Boolean);

  if (!protocolos.length) return res.status(400).json({ error: 'Sin protocolos' });
  if (!gente.length && !copia.length) return res.status(400).json({ error: 'Sin destinatarios' });

  let permitidas;
  try { permitidas = await direccionesPermitidas() }
  catch (e) { return res.status(502).json({ error: 'No se ha podido comprobar los destinatarios', detalle: String(e.message) }) }

  const validos = [];
  const vistos  = new Set();
  const fuera   = [];
  for (const d of gente) {
    if (vistos.has(d.email)) continue;
    vistos.add(d.email);
    if (permitidas.has(d.email)) validos.push(d); else fuera.push(d.email);
  }
  /* Solo cortamos si no queda nadie a quien escribir, ni empleados ni copia:
     puede no haber ningún empleado con correo y aun así querer avisar a
     dirección de lo que se ha mandado. */
  if (!validos.length && !copia.some((c) => permitidas.has(c))) {
    return res.status(403).json({
      error: 'destinatarios_desconocidos',
      detalle: 'Ninguna de esas direcciones está guardada en la plataforma.'
    });
  }

  let enviados = 0;
  const fallos = [];
  for (const d of validos) {
    const { asunto, html, texto } = montarCorreo({ nombre: d.nombre, protocolos, quien, repetir });
    try {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': CLAVE, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: DE, name: DE_N },
          to: [{ email: d.email, name: d.nombre }],
          subject: asunto,
          htmlContent: html,
          textContent: texto,
          tags: ['escuela-orale', repetir ? 'repetir' : 'nuevo']
        })
      });
      if (r.ok) enviados++;
      else fallos.push({ email: d.email, estado: r.status, detalle: (await r.text()).slice(0, 300) });
    } catch (e) {
      fallos.push({ email: d.email, detalle: String(e.message).slice(0, 200) });
    }
  }

  /* y la copia para dirección, con el resumen en vez del correo del empleado */
  let copias = 0;
  for (const c of copia) {
    if (!permitidas.has(c) || vistos.has(c)) continue;
    vistos.add(c);
    const { asunto, html, texto } = montarResumen({ protocolos, quien, repetir, cuantos: validos.length });
    try {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': CLAVE, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: DE, name: DE_N },
          to: [{ email: c }],
          subject: asunto, htmlContent: html, textContent: texto,
          tags: ['escuela-orale', 'copia-direccion']
        })
      });
      if (r.ok) copias++; else fallos.push({ email: c, estado: r.status });
    } catch (e) { fallos.push({ email: c, detalle: String(e.message).slice(0, 200) }) }
  }

  return res.status(enviados || copias ? 200 : 502)
    .json({ enviados, copias, fallos, sin_direccion_conocida: fuera.length });
};
