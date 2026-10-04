# Cómo conectar el juego con Google Sheets

1. Creá una planilla nueva en Google Sheets (por ejemplo "El Impostor — Registro").
   En la fila 1 poné los encabezados: `fecha | curso | nombre | nivel | sesion | resultado`

2. En la planilla: **Extensiones → Apps Script**. Borrá lo que haya y pegá esto:

```javascript
function doPost(e) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const d = JSON.parse(e.postData.contents);
  hoja.appendRow([d.fecha, d.curso, d.nombre, d.nivel, d.sesion, d.resultado]);
  return ContentService.createTextOutput("ok");
}
```

3. **Implementar → Nueva implementación** → tipo "Aplicación web":
   - Ejecutar como: **Yo** (tu cuenta)
   - Quién puede acceder: **Cualquier persona**
   - Implementar → copiá la URL que empieza con `https://script.google.com/...`

4. En `index.html`, buscá la línea `const SHEETS_URL = "";` y pegá la URL entre comillas.

Listo: cada sesión jugada agrega una fila con fecha, curso, nombre, nivel, N° de sesión y bien/mal.
Sin la URL el juego funciona igual (el código de progreso no depende de internet).
