// ============================================================
// EL IMPOSTOR — registro de partidas + ranking de mejores jugadores
// ============================================================
// CÓMO INSTALARLO (5 minutos):
//   1) Crear una planilla NUEVA en Google Sheets (puede llamarse "El Impostor - registro").
//   2) Menú Extensiones → Apps Script: borrar lo que haya y pegar TODO este código. Guardar.
//   3) Botón "Implementar" → "Nueva implementación" → tipo "Aplicación web".
//      - Ejecutar como: yo (tu cuenta)
//      - Quién puede acceder: cualquier usuario (incluso anónimo)
//   4) Copiar la URL que termina en /exec y pegarla en index.html
//      en la línea que dice: const SHEETS_URL = "...".
//      (O mandársela a Devin y la cambio yo.)
//   La pestaña "registro" se crea sola la primera vez que llega un dato.
// ============================================================

const TAB_LOG = 'registro';

// Columnas de la planilla, en orden. El juego manda estos campos.
const COLS = [
  'fecha', 'tipo', 'curso', 'nombre', 'apellido',
  'encuentro', 'nivel', 'sesion', 'consigna', 'resultado', 'intento',
  'repaso', 'segundos', 'puntos',
  'encuentros_completados', 'sesiones_jugadas',
  'aciertos_primera', 'aciertos_repaso', 'errores', 'timeouts',
  'duracion_min', 'puntaje', 'certificado', 'aciertos'
];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TAB_LOG);
  if (!sh) sh = ss.insertSheet(TAB_LOG);
  if (sh.getLastRow() === 0) sh.appendRow(COLS);
  return sh;
}

// El juego envía una fila JSON por evento: tipo "inicio" | "sesion" | "final".
function doPost(e) {
  try {
    const row = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    sheet_().appendRow(COLS.map(k => row[k] !== undefined ? row[k] : ''));
  } catch (err) {}
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET: devuelve { ranking: [ { curso, nombre, apellido, completadas,
//   mejor_puntaje, aciertos, minutos } ] }
// Solo cuentan las filas tipo "final" (partida terminada).
// Las variantes del mismo jugador se agrupan: orden nombre/apellido, acentos,
// dobles espacios, un nombre o dos, y errores de una letra (Gorriti/Gorritis).
function canon_(v) {
  return (v || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function tokens_(n, a) {
  const seen = {}, out = [];
  (canon_(n) + ' ' + canon_(a)).split(' ').forEach(function (w) {
    if (w && !seen[w]) { seen[w] = 1; out.push(w); }
  });
  return out.sort();
}
function lev_(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = [], cur = [];
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev[n];
}
function tokMatch_(s, t) {
  if (s === t) return true;
  if (lev_(s, t) <= 1) return true;                       // una letra de diferencia
  const L = Math.min(s.length, t.length);
  return L >= 4 && (s.slice(0, L) === t.slice(0, L));     // prefijo (Fernan/Fernando)
}
function samePlayer_(toksA, toksB) {
  // el conjunto más chico tiene que entrar "token a token" en el más grande
  const small = toksA.length <= toksB.length ? toksA : toksB;
  const large = toksA.length <= toksB.length ? toksB : toksA;
  const used = {};
  for (const s of small) {
    let hit = -1;
    for (let j = 0; j < large.length; j++) {
      if (!used[j] && tokMatch_(s, large[j])) { hit = j; break; }
    }
    if (hit < 0) return false;
    used[hit] = 1;
  }
  return true;
}
function doGet() {
  const vals = sheet_().getDataRange().getValues();
  const head = vals[0] || [];
  const idx = {};
  head.forEach((h, i) => idx[h] = i);
  const groups = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (r[idx.tipo] !== 'final') continue;
    const toks = tokens_(r[idx.nombre], r[idx.apellido]);
    const puntos = Number(r[idx.puntaje]) || 0;
    const aciertos = (Number(r[idx.aciertos_primera]) || 0) + (Number(r[idx.aciertos_repaso]) || 0);
    const minutos = Number(r[idx.duracion_min]) || 0;
    const g = groups.find(g => String(g.curso) === String(r[idx.curso]) && samePlayer_(g.toks, toks));
    if (g) {
      g.completadas++;
      g.aciertos += aciertos; g.minutos += minutos;
      if (puntos > g.mejor_puntaje) {
        g.mejor_puntaje = puntos;
        g.nombre = r[idx.nombre]; g.apellido = r[idx.apellido];   // nombre de su mejor partida
      }
      toks.forEach(t => { if (g.toks.indexOf(t) < 0) g.toks.push(t); });
    } else {
      groups.push({
        curso: r[idx.curso], nombre: r[idx.nombre], apellido: r[idx.apellido],
        completadas: 1, mejor_puntaje: puntos, aciertos: aciertos, minutos: minutos, toks: toks
      });
    }
  }
  groups.forEach(g => delete g.toks);
  return ContentService.createTextOutput(JSON.stringify({ ranking: groups }))
    .setMimeType(ContentService.MimeType.JSON);
}
