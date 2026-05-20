/* =========================================================================
   FILE: escaner.js
   ESTADO: Versión Blindada — Con Contrato de Arquitectura (Auto-Guardado)
   ========================================================================= */
 
const fs = require('fs');
const path = require('path');
 
const moduloSeleccionado = process.argv[2] ? process.argv[2].toLowerCase() : null;
const nombreArchivoSalida = 'escaneo_completo.txt';
let contenidoSalida = ''; // Aquí guardaremos todo el texto

// Función auxiliar para agregar texto a nuestra variable en lugar de la consola
function agregarTexto(texto) {
    contenidoSalida += texto + '\n';
}
 
// ============================================================
// 📐 CONTRATO DE ARQUITECTURA — LEER ANTES DE TOCAR CUALQUIER COSA
// Este bloque es la fuente de verdad del proyecto.
// Cualquier IA o desarrollador debe respetarlo al pie de la letra.
// ============================================================
const CONTRATO = `
================================================================
📐 CONTRATO DE ARQUITECTURA — NO ROMPER BAJO NINGUNA CIRCUNSTANCIA
================================================================
 
1. CLAVE ÚNICA DE STORAGE: 'datos_cerebro'
   - TODA la app lee y escribe SOLO en localStorage['datos_cerebro']
   - Estructura del objeto:
     {
       version,
       habitos[],
       registro_trabajo[],
       registro_habitos{},
       config_habitos{},
       finanzas[]
     }
   - NUNCA crear nuevas claves principales de storage.
   - EXCEPCIÓN PERMITIDA (claves efímeras del temporizador, no se backupean):
       · 'sesionTrabajoTemporal'  → estado del reloj en curso
       · 'memoria_diaria_trabajo' → acumulado del día actual
 
2. SISTEMA DE BACKUP:
   - Exportar: lee localStorage['datos_cerebro'] y lo descarga como JSON directo.
   - Importar: sobreescribe 'datos_cerebro' con el JSON del archivo.
              + limpia 'sesionTrabajoTemporal' y 'memoria_diaria_trabajo'.
   - NUNCA modificar este sistema ni crear uno paralelo.
   - Las funciones exportarDatos() e importarDatos() viven SOLO en app.js.
 
3. PUNTO ÚNICO DE LECTURA/ESCRITURA:
   - js/core/storage.js es el ÚNICO archivo autorizado a hacer
     localStorage.getItem / localStorage.setItem de 'datos_cerebro'.
   - Los módulos (habitos.js, temporizador.js, metricas.js) llaman a las
     funciones de storage.js, NUNCA tocan localStorage directamente.
 
4. ARCHIVOS CORE (no duplicar su lógica en otros lados):
   - js/core/storage.js  → toda la persistencia de datos
   - js/core/app.js      → router de vistas + backup
 
5. MÓDULOS Y SUS RESPONSABILIDADES:
   - js/modulos/temporizador.js → reloj de trabajo, alarmas, recuperación de sesión
   - js/modulos/metricas.js     → gráficas, KPIs, tabla de historial de trabajo
   - js/modulos/habitos.js      → hábitos, grupos, cronómetros, calendario

6. ESTRUCTURA DE DATOS (futura base de datos):
- usuarios: { id, nombre }
- registro_trabajo: { id, usuario_id, fecha, meta, trabajado }
- habitos: { id, usuario_id, nombre, tipo, meta, color, grupo }
- registro_habitos: { id, usuario_id, fecha, habito_id, progreso }
- config_habitos: { id, usuario_id, grupos[], paleta[] }
================================================================
`;
 
// Mapa de módulos del proyecto
const mapaModulos = {
    'trabajo': [
        'vistas/trabajo.html',
        'css/trabajo.css',
        'js/modulos/temporizador.js',
        'js/modulos/metricas.js',
        'js/core/storage.js',
        'js/core/app.js',
        'vistas/backup.html'
    ],
    'habitos': [
        'vistas/habitos.html',
        'css/habitos.css',
        'js/modulos/habitos.js',
        'js/core/storage.js',
        'js/core/app.js',
        'vistas/backup.html'
    ],
    'base': [
        'index.html',
        'css/styles.css',
        'js/core/app.js',
        'js/core/storage.js'
    ],
    'clientes': [
        'vistas/clientes.html',
        'css/clientes.css',
        'js/modulos/clientes.js',
        'js/core/storage.js',
        'js/core/app.js',
        'vistas/backup.html'
    ],
    'todo': [
        'index.html',
        'css/styles.css',
        'css/trabajo.css',
        'css/habitos.css',
        'vistas/trabajo.html',
        'vistas/habitos.html',
        'vistas/backup.html',
        'js/core/storage.js',
        'js/core/app.js',
        'js/modulos/temporizador.js',
        'js/modulos/metricas.js',
        'js/modulos/habitos.js'
    ]
};
 
let archivosAEscanear = [];
 
if (moduloSeleccionado) {
    if (mapaModulos[moduloSeleccionado]) {
        archivosAEscanear = mapaModulos[moduloSeleccionado];
        agregarTexto(`================================================================`);
        agregarTexto(`🔎 RADIOGRAFÍA FOCALIZADA: Módulo [${moduloSeleccionado.toUpperCase()}]`);
        agregarTexto(`================================================================\n`);
    } else {
        console.log(`❌ El módulo "${moduloSeleccionado}" no está registrado en el escáner.`);
        console.log(`💡 Módulos disponibles: trabajo, habitos, base, todo`);
        process.exit(1);
    }
} else {
    agregarTexto(`================================================================`);
    agregarTexto(`🌐 RADIOGRAFÍA GENERAL: Escaneando todo el proyecto completo`);
    agregarTexto(`================================================================\n`);
    archivosAEscanear = mapaModulos['todo'];
}
 
// Siempre imprimimos el contrato al inicio del escaneo
agregarTexto(CONTRATO);
 
function procesarYMostrarArchivo(rutaRelativa) {
    const rutaAbsoluta = path.join(__dirname, rutaRelativa);
    if (fs.existsSync(rutaAbsoluta)) {
        try {
            const contenido = fs.readFileSync(rutaAbsoluta, 'utf8');
            agregarTexto(`// ====================================================`);
            agregarTexto(`// RUTA DEL ARCHIVO: ${rutaRelativa}`);
            agregarTexto(`// ====================================================`);
            agregarTexto(contenido);
            agregarTexto(`\n\n`);
        } catch (error) {
            agregarTexto(`// ⚠️ Error al leer ${rutaRelativa}: ${error.message}\n\n`);
        }
    } else {
        agregarTexto(`// ⚠️ Archivo no encontrado: ${rutaRelativa}\n\n`);
    }
}
 
archivosAEscanear.forEach(ruta => {
    procesarYMostrarArchivo(ruta);
});

// Finalmente, guardamos todo el texto acumulado en el archivo
try {
    fs.writeFileSync(path.join(__dirname, nombreArchivoSalida), contenidoSalida, 'utf8');
    console.log(`✅ ¡ÉXITO! El escáner terminó de leer los archivos.`);
    console.log(`📁 Abre el archivo "${nombreArchivoSalida}" en tu Visual Studio Code para ver el código completo.`);
} catch (error) {
    console.log(`❌ Hubo un error al intentar guardar el archivo: ${error.message}`);
}