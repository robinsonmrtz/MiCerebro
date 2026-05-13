// ==========================================
// ARCHIVO DE ALMACENAMIENTO: storage.js
// ==========================================
const VERSION_ACTUAL = "1.2"; // Subimos versión por el campo 'descansado'

function obtenerDatosBase() {
    return {
        version: VERSION_ACTUAL,
        finanzas: [],
        habitos: [],
        tareas: [],
        registro_trabajo: [] 
    };
}

function cargarDatos() {
    const guardado = localStorage.getItem('miCerebroData');
    if (guardado) {
        const datos = JSON.parse(guardado);
        if (!datos.registro_trabajo) datos.registro_trabajo = [];
        return datos;
    }
    return obtenerDatosBase();
}

// ACTUALIZADO: Ahora recibe 'segundosDescansados'
function guardarSesionTrabajo(fechaStr, metaHoras, segundosTrabajados, segundosDescansados) {
    const datos = cargarDatos();
    
    datos.registro_trabajo.push({
        id: Date.now(), 
        fecha: fechaStr,
        meta: metaHoras,
        trabajado: segundosTrabajados,
        descansado: segundosDescansados // <-- NUEVO DATO
    });
    
    localStorage.setItem('miCerebroData', JSON.stringify(datos));
}

// ACTUALIZADO: Esta función ahora solo borra, el modal se encarga de preguntar
function borrarRegistroTrabajo(idABorrar) {
    const datos = cargarDatos();
    datos.registro_trabajo = datos.registro_trabajo.filter(reg => reg.id !== idABorrar);
    localStorage.setItem('miCerebroData', JSON.stringify(datos));
    
    // Refrescamos los gráficos y la tabla
    if (typeof actualizarGraficos === 'function') {
        actualizarGraficos();
    }
}

// Función para importar JSON
function importarJSON(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const datosImportados = JSON.parse(e.target.result);
            if (datosImportados.registro_trabajo) {
                localStorage.setItem('miCerebroData', JSON.stringify(datosImportados));
                alert("¡Datos restaurados!");
                location.reload();
            }
        } catch (error) { alert("Archivo no válido"); }
    };
    lector.readAsText(archivo);
}

// Función para descargar JSON
function descargarJSON() {
    const datosGuardados = localStorage.getItem('miCerebroData');
    if (!datosGuardados) return;
    const blob = new Blob([datosGuardados], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "respaldo_cerebro.json"; a.click();
}