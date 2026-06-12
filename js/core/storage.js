// ==========================================
// CORE: storage.js (El Almacén de Datos)
// VERSIÓN: 2.1 — Agrega horaInicio y horaFin al registro de trabajo
// ==========================================

const VERSION_DATOS = "2.1";

function cargarDatos() {
    const datos = localStorage.getItem('datos_cerebro');
    if (datos) {
        let parseado = JSON.parse(datos);
        if (!parseado.clientes) parseado.clientes = []; 
        // 👇 NUEVA ESTRUCTURA PARA FINANZAS PERSONALES
        if (!parseado.finanzas_personales) {
            parseado.finanzas_personales = {
                cuentas: [],
                categorias: [],
                transacciones: [],
                comercios: [],
                recurrentes: []
            };
        } else {
            if (!parseado.finanzas_personales.comercios) parseado.finanzas_personales.comercios = [];
            if (!parseado.finanzas_personales.recurrentes) parseado.finanzas_personales.recurrentes = [];
        }
        return parseado;
    }
    return { 
        version: VERSION_DATOS,
        registro_trabajo: [], 
        habitos: [], 
        registro_habitos: {},
        config_habitos: null,
        clientes: [],
        // Base de datos virgen para el nuevo módulo
        finanzas_personales: {
            cuentas: [],
            categorias: [],
            transacciones: [],
            recurrentes: []
        },
        dopamina: { acciones: [], predeterminado: 'all' },
        calendario_tareas: {
            listas: [
                { id: 'lst-1', nombre: 'Tareas', editable: true },
                { id: 'lst-2', nombre: 'Trabajo', editable: true },
                { id: 'lst-3', nombre: 'Casa', editable: true }
            ],
            tareas: [],   // { id, lista_id, texto, estado: 'pendiente'|'completada', fecha_creacion, fecha_completada }
            eventos: []   // { id, titulo, fecha, hora_inicio, hora_fin, color }
        }
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

    // Nos aseguramos de que descansado nunca sea undefined o negativo
    const descansadoFinal = (typeof descansado === 'number' && descansado >= 0) ? descansado : 0;

    let registroExistente = datos.registro_trabajo.find(r => r.fecha === fecha);
    if (registroExistente) {
        registroExistente.meta       = meta;
        registroExistente.trabajado  = trabajado;
        registroExistente.descansado = descansadoFinal;   // ✅ usa el valor real
        // Solo actualiza horaInicio si no tenía una ya
        if (!registroExistente.horaInicio && horaInicio) registroExistente.horaInicio = horaInicio;
        registroExistente.horaFin = horaFin;
    } else {
        datos.registro_trabajo.push({
            id:         Date.now(),
            fecha:      fecha,
            meta:       meta,
            trabajado:  trabajado,
            descansado: descansadoFinal,   // ✅ también aquí
            horaInicio: horaInicio,
            horaFin:    horaFin
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

// ==========================================
// MÓDULO: FINANZAS PERSONALES - STORAGE
// ==========================================

// Obtener solo el nodo de finanzas
function fz_obtenerDatos() {
    let datos = cargarDatos();
    return datos.finanzas_personales;
}

// --- CRUD CUENTAS ---
function fz_guardarCuenta(cuenta) {
    let datos = cargarDatos();
    let index = datos.finanzas_personales.cuentas.findIndex(c => c.id === cuenta.id);
    if (index > -1) datos.finanzas_personales.cuentas[index] = cuenta; // Editar
    else datos.finanzas_personales.cuentas.push(cuenta); // Crear nueva
    guardarDatos(datos);
}

function fz_archivarCuenta(id) {
    let datos = cargarDatos();
    let cuenta = datos.finanzas_personales.cuentas.find(c => c.id === id);
    if (cuenta) cuenta.archivada = true; // SOFT-DELETE (No se borra, se archiva)
    guardarDatos(datos);
}

// --- CRUD CATEGORÍAS ---
function fz_guardarCategoria(categoria) {
    let datos = cargarDatos();
    let index = datos.finanzas_personales.categorias.findIndex(c => c.id === categoria.id);
    if (index > -1) datos.finanzas_personales.categorias[index] = categoria;
    else datos.finanzas_personales.categorias.push(categoria);
    guardarDatos(datos);
}

function fz_archivarCategoria(id) {
    let datos = cargarDatos();
    let categoria = datos.finanzas_personales.categorias.find(c => c.id === id);
    if (categoria) categoria.archivada = true;
    guardarDatos(datos);
}

// --- CRUD RECURRENCIAS ---
function fz_guardarRecurrente(recurrente) {
    let datos = cargarDatos();
    if (!datos.finanzas_personales.recurrentes) datos.finanzas_personales.recurrentes = [];
    let index = datos.finanzas_personales.recurrentes.findIndex(r => r.id === recurrente.id);
    if (index > -1) datos.finanzas_personales.recurrentes[index] = recurrente;
    else datos.finanzas_personales.recurrentes.push(recurrente);
    guardarDatos(datos);
}

function fz_archivarRecurrente(id) {
    let datos = cargarDatos();
    if (!datos.finanzas_personales.recurrentes) datos.finanzas_personales.recurrentes = [];
    let r = datos.finanzas_personales.recurrentes.find(x => x.id === id);
    if (r) r.activo = false;
    guardarDatos(datos);
}

// --- CRUD TRANSACCIONES ---
function fz_guardarTransaccion(transaccion) {
    let datos = cargarDatos();
    let index = datos.finanzas_personales.transacciones.findIndex(t => t.id === transaccion.id);
    if (index > -1) datos.finanzas_personales.transacciones[index] = transaccion;
    else datos.finanzas_personales.transacciones.push(transaccion);
    guardarDatos(datos);
}

function fz_archivarTransaccion(id) {
    let datos = cargarDatos();
    let trans = datos.finanzas_personales.transacciones.find(t => t.id === id);
    if (trans) trans.archivada = true;
    guardarDatos(datos);
}

function fz_eliminarComercio(nombre) {
    let datos = cargarDatos();
    if (!datos.finanzas_personales.comercios) return;
    datos.finanzas_personales.comercios = datos.finanzas_personales.comercios.filter(c => c !== nombre);
    guardarDatos(datos);
}

// --- FUNCIONES DE ELIMINACIÓN Y RESTAURACIÓN ---
function fz_eliminarTransaccion(id) {
    let datos = cargarDatos();
    // Filtramos eliminando la transacción completamente
    datos.finanzas_personales.transacciones = datos.finanzas_personales.transacciones.filter(t => t.id !== id);
    guardarDatos(datos);
}

function fz_restaurarCategoria(id) {
    let datos = cargarDatos();
    let categoria = datos.finanzas_personales.categorias.find(c => c.id === id);
    if (categoria) categoria.archivada = false;
    guardarDatos(datos);
}

function fz_eliminarCategoriaDefinitiva(id, targetCategoriaId = null) {
    let datos = cargarDatos();

    // 1. Encontrar también si esta categoría tiene hijos (subcategorías)
    const hijosIds = datos.finanzas_personales.categorias.filter(c => c.parent_id === id).map(c => c.id);
    const todosLosIdsABorrar = [id, ...hijosIds];

    if (targetCategoriaId === null) {
        // ELIMINAR TODO: Filtramos transacciones borrando las asociadas al padre y a los hijos
        datos.finanzas_personales.transacciones = datos.finanzas_personales.transacciones.filter(t => !todosLosIdsABorrar.includes(t.categoria_id));
    } else {
        // MOVER: Cambiamos el ID de las transacciones viejas al nuevo Target
        datos.finanzas_personales.transacciones.forEach(t => {
            if (todosLosIdsABorrar.includes(t.categoria_id)) {
                t.categoria_id = targetCategoriaId;
            }
        });
    }

    // 2. Finalmente, borrar la categoría y sus subcategorías
    datos.finanzas_personales.categorias = datos.finanzas_personales.categorias.filter(c => !todosLosIdsABorrar.includes(c.id));
    
    guardarDatos(datos);
}