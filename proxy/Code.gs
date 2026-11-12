/**
 * Proxy del "Asistente Tiendita" — Google Apps Script (gratis, sin tarjeta).
 * Alternativa al Cloudflare Worker. La clave de Groq vive en las Propiedades del script:
 *   Configuración del proyecto ⚙️ › Propiedades del script › GROQ_API_KEY = gsk_...
 * Publicar: Implementar › Nueva implementación › Aplicación web ›
 *   Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.  Copiá la URL /exec.
 *
 * Nota: Apps Script no permite fijar CORS por dominio; por eso la app manda el cuerpo como
 * text/plain (sin "preflight") y aquí se aplica un rate-limit global y límites de tamaño.
 */
var GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
var MODELO = 'llama-3.1-8b-instant'; // revisá los vigentes en https://console.groq.com/docs/models
var MAX_BODY = 24 * 1024;
var MAX_MSGS = 12;
var MAX_CHARS = 6000;
var MAX_POR_MINUTO = 30; // para toda la tienda

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return salida({ ok: true, info: 'Proxy del Asistente Tiendita. Usá POST.' });
}

function doPost(e) {
  try {
    var texto = (e && e.postData && e.postData.contents) || '';
    if (texto.length > MAX_BODY) return salida({ error: 'Mensaje demasiado grande' });

    // Rate-limit global por minuto
    var cache = CacheService.getScriptCache();
    var llave = 'rl_' + Math.floor(Date.now() / 60000);
    var n = Number(cache.get(llave) || 0) + 1;
    cache.put(llave, String(n), 120);
    if (n > MAX_POR_MINUTO) return salida({ error: 'Demasiadas preguntas. Esperá un minuto.' });

    var clave = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
    if (!clave) return salida({ error: 'Falta GROQ_API_KEY en Propiedades del script' });

    var body = JSON.parse(texto);
    if (!body || !body.messages || !body.messages.length) return salida({ error: 'Falta messages' });
    var msgs = body.messages.slice(-MAX_MSGS).map(function (m, i) {
      var rol = ['system', 'user', 'assistant'].indexOf(m.role) >= 0 ? m.role : 'user';
      if (rol === 'system' && i !== 0) rol = 'user';
      return { role: rol, content: String(m.content || '').slice(0, MAX_CHARS) };
    });
    var payload = {
      model: MODELO,
      messages: msgs,
      temperature: Math.min(Math.max(Number(body.temperature) || 0.4, 0), 1),
      max_tokens: Math.min(Number(body.max_tokens) || 400, 512)
    };
    var tools = (body.tools || []).filter(function (t) { return t && t.function && t.function.name === 'agregar_al_carrito'; });
    if (tools.length) { payload.tools = tools.slice(0, 1); payload.tool_choice = 'auto'; }

    var r = UrlFetchApp.fetch(GROQ_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + clave },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) return salida({ error: 'El servicio de IA no respondió', status: r.getResponseCode() });
    return ContentService.createTextOutput(r.getContentText()).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return salida({ error: 'Error del proxy: ' + err.message });
  }
}
