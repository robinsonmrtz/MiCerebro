// ==========================================
// CORE: storage.js (El Almacén de Datos)
// VERSIÓN: 2.0 — Punto único de escritura, con versión y config de hábitos
// ==========================================

const VERSION_DATOS = "2.0";

function cargarDatos() {
    const datos = localStorage.getItem('datos_cerebro');
    if (datos) return JSON.parse(datos);
    // Estructura base con versión incluida
    return { 
        version: VERSION_DATOS,
        registro_trabajo: [], 
        habitos: [], 
        registro_habitos: {},
        config_habitos: null,
        finanzas: []
    };
}

function guardarDatos(datos) {
    // Siempre estampamos la versión al guardar
    datos.version = VERSION_DATOS;
    localStorage.setItem('datos_cerebro', JSON.stringify(datos));
}

function guardarSesionTrabajo(fecha, meta, trabajado, descansado) {
    let datos = cargarDatos();
    if (!datos.registro_trabajo) datos.registro_trabajo = [];
    
    let registroExistente = datos.registro_trabajo.find(r => r.fecha === fecha);
    if (registroExistente) {
        registroExistente.meta = meta;
        registroExistente.trabajado = trabajado;
        registroExistente.descansado = 0; 
    } else {
        datos.registro_trabajo.push({
            id: Date.now(),
            fecha: fecha,
            meta: meta,
            trabajado: trabajado,
            descansado: 0 
        });
    }
    
    guardarDatos(datos);

    if (typeof window.actualizarGraficos === 'function') {
        window.actualizarGraficos();
    }
}

function borrarRegistroTrabajo(id) {
    let datos = cargarDatos();
    if (datos.registro_trabajo) {
        datos.registro_trabajo = datos.registro_trabajo.filter(reg => reg.id !== id);
        guardarDatos(datos);
    }
}

function guardarHabitosDefinicion(listaHabitos) {
    let datos = cargarDatos();
    datos.habitos = listaHabitos;
    guardarDatos(datos);
}

// ✅ NUEVA: centraliza todo cambio de config (grupos, paleta)
function guardarConfigHabitos(config) {
    let datos = cargarDatos();
    datos.config_habitos = config;
    guardarDatos(datos);
}

function guardarProgresoHabito(fecha, habitoId, nuevoProgreso) {
    let datos = cargarDatos();
    if (!datos.registro_habitos) datos.registro_habitos = {};
    if (!datos.registro_habitos[fecha]) datos.registro_habitos[fecha] = {};
    datos.registro_habitos[fecha][habitoId] = nuevoProgreso;
    guardarDatos(datos);
}