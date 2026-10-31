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
function doGet() {
  const vals = sheet_().getDataRange().getValues();
  const head = vals[0] || [];
  const idx = {};
  head.forEach((h, i) => idx[h] = i);
  const agg = {};
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (r[idx.tipo] !== 'final') continue;
    const key = [r[idx.curso], r[idx.nombre], r[idx.apellido]].join('|');
    const o = agg[key] = agg[key] || {
      curso: r[idx.curso], nombre: r[idx.nombre], apellido: r[idx.apellido],
      completadas: 0, mejor_puntaje: 0, aciertos: 0, minutos: 0
    };
    o.completadas++;
    o.mejor_puntaje = Math.max(o.mejor_puntaje, Number(r[idx.puntaje]) || 0);
    o.aciertos += (Number(r[idx.aciertos_primera]) || 0) + (Number(r[idx.aciertos_repaso]) || 0);
    o.minutos += Number(r[idx.duracion_min]) || 0;
  }
  return ContentService.createTextOutput(JSON.stringify({ ranking: Object.values(agg) }))
    .setMimeType(ContentService.MimeType.JSON);
}
