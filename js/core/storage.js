// ==========================================
// CORE: storage.js (El Almacén de Datos)
// VERSIÓN: 2.1 — Agrega horaInicio y horaFin al registro de trabajo
// ==========================================

const VERSION_DATOS = "2.1";

function cargarDatos() {
    const datos = localStorage.getItem('datos_cerebro');
    if (datos) {
        let parseado = JSON.parse(datos);
        // Protegemos tus datos viejos: si no existe la carpeta clientes, la crea vacía
        if (!parseado.clientes) parseado.clientes = []; 
        return parseado;
    }
    return { 
        version: VERSION_DATOS,
        registro_trabajo: [], 
        habitos: [], 
        registro_habitos: {},
        config_habitos: null,
        finanzas: [],
        clientes: [] // <--- NUEVO MÓDULO PREPARADO
    };
}

function guardarDatos(datos) {
    datos.version = VERSION_DATOS;
    localStorage.setItem('datos_cerebro', JSON.stringify(datos));
}

// ✅ Agrega horaInicio y horaFin — compatibe con registros viejos (quedan con null)
function guardarSesionTrabajo(fecha, meta, trabajado, descansado, horaInicio = null, horaFin = null) {
    let datos = cargarDatos();
    if (!datos.registro_trabajo) datos.registro_trabajo = [];
    
    let registroExistente = datos.registro_trabajo.find(r => r.fecha === fecha);
    if (registroExistente) {
        registroExistente.meta = meta;
        registroExistente.trabajado = trabajado;
        registroExistente.descansado = 0;
        // Solo actualiza horaInicio si no tenía una ya
        if (!registroExistente.horaInicio && horaInicio) registroExistente.horaInicio = horaInicio;
        registroExistente.horaFin = horaFin;
    } else {
        datos.registro_trabajo.push({
            id: Date.now(),
            fecha: fecha,
            meta: meta,
            trabajado: trabajado,
            descansado: 0,
            horaInicio: horaInicio,
            horaFin: horaFin
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