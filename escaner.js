// ==========================================
// SCRIPT ESCÁNER DEL PROYECTO
// Este archivo lee todo tu código y lo junta 
// en un solo archivo de texto para la IA.
// ==========================================

const fs = require('fs');
const path = require('path');

const directorioBase = __dirname;
const archivoSalida = 'codigo_completo_para_ia.txt';

// Aquí ponemos las carpetas o archivos que NO queremos escanear
const ignorar = ['.git', 'escaner.js', archivoSalida, 'node_modules'];

let contenidoTotal = '=== CONTEXTO DEL PROYECTO ===\n\n';

function leerDirectorio(directorio) {
    const archivos = fs.readdirSync(directorio);

    archivos.forEach(archivo => {
        const rutaCompleta = path.join(directorio, archivo);
        
        // Si es un archivo/carpeta que debemos ignorar, lo saltamos
        if (ignorar.includes(archivo)) return;

        const stats = fs.statSync(rutaCompleta);

        if (stats.isDirectory()) {
            leerDirectorio(rutaCompleta); // Si es carpeta, entra a leerla
        } else {
            // Si es archivo, lee su contenido y lo agrega al texto final
            const contenido = fs.readFileSync(rutaCompleta, 'utf8');
            contenidoTotal += `\n\n--- ARCHIVO: ${rutaCompleta.replace(directorioBase, '')} ---\n`;
            contenidoTotal += contenido;
        }
    });
}

leerDirectorio(directorioBase);
fs.writeFileSync(archivoSalida, contenidoTotal);
console.log(`¡Listo! Se ha creado el archivo "${archivoSalida}". Cópialo y pégalo a la IA.`);