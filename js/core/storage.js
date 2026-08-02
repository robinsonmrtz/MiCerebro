// ==========================================
// CORE: storage.js (El Almacén de Datos)
// VERSIÓN: 2.3 — Agrega módulo de Proyectos (Fase 1)
// ==========================================

const VERSION_DATOS = "2.3";

function cargarDatos() {
    const datos = localStorage.getItem('datos_cerebro');
    if (datos) {
        let parseado = JSON.parse(datos);
        if (!parseado.clientes) parseado.clientes = [];
        if (!parseado.proyectos) parseado.proyectos = [];
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
            if (!parseado.finanzas_personales.filtros_guardados) parseado.finanzas_personales.filtros_guardados = [];
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
        proyectos: [],
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

// ✅ Agrega horaInicio, horaFin y pausado — compatible con registros viejos (quedan con null/0)
function guardarSesionTrabajo(fecha, meta, trabajado, descansado, horaInicio = null, horaFin = null, pausado = 0) {
    let datos = cargarDatos();
    if (!datos.registro_trabajo) datos.registro_trabajo = [];

    // Nos aseguramos de que descansado nunca sea undefined o negativo
    const descansadoFinal = (typeof descansado === 'number' && descansado >= 0) ? descansado : 0;

    // ✅ Nos aseguramos de que pausado nunca sea undefined o negativo
    const pausadoFinal = (typeof pausado === 'number' && pausado >= 0) ? pausado : 0;

    let registroExistente = datos.registro_trabajo.find(r => r.fecha === fecha);
    if (registroExistente) {
        registroExistente.meta       = meta;
        registroExistente.trabajado  = trabajado;
        registroExistente.descansado = descansadoFinal;   // ✅ usa el valor real
        registroExistente.pausado    = pausadoFinal;      // ✅ usa el valor real
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
            pausado:    pausadoFinal,      // ✅ también aquí
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

// ==========================================
// MÓDULO: PROYECTOS — STORAGE (Fase 1)
// ==========================================

// Plantilla de un proyecto nuevo. La usamos como base para no olvidar campos.
function pr_plantillaProyecto(tipo) {
    return {
        id: Date.now(),
        tipo: tipo,                 // 'video' | 'roblox' | 'app'
        nombre: '',
        imagen: '',
        monetizado: false,
        cpm: 0,
        fecha_creacion: new Date().toISOString(),
        redes: {
            youtube:   { url: '', usuario: '', seguidores: 0, fecha_creacion: '' },
            tiktok:    { url: '', usuario: '', seguidores: 0, fecha_creacion: '' },
            facebook:  { url: '', usuario: '', seguidores: 0, fecha_creacion: '' },
            instagram: { url: '', usuario: '', seguidores: 0, fecha_creacion: '' }
        },
        videos: []   // se activa en Fase 3, para tipo 'video'
    };
}

function pr_obtenerProyectos() {
    let datos = cargarDatos();
    return datos.proyectos || [];
}

function pr_obtenerProyecto(id) {
    let datos = cargarDatos();
    return (datos.proyectos || []).find(p => p.id === id) || null;
}

// Crea o edita (si el objeto trae id existente, actualiza)
function pr_guardarProyecto(proyecto) {
    let datos = cargarDatos();
    if (!datos.proyectos) datos.proyectos = [];
    let index = datos.proyectos.findIndex(p => p.id === proyecto.id);
    if (index > -1) datos.proyectos[index] = proyecto;
    else datos.proyectos.push(proyecto);
    guardarDatos(datos);
    return proyecto;
}

function pr_eliminarProyecto(id) {
    let datos = cargarDatos();
    if (!datos.proyectos) return;
    datos.proyectos = datos.proyectos.filter(p => p.id !== id);
    guardarDatos(datos);
}

// ==========================================
// CORE: storage.js (El Almacén de Datos)
// ==========================================
// ... código previo de finanzas, proyectos y eliminación definitiva ...

// --- SISTEMA DE PURGA POR MÓDULO INDIVIDUAL ---
function reiniciarModulo(modulo) {
    let datos = cargarDatos();
    
    switch (modulo) {
        case 'registro_trabajo':
            datos.registro_trabajo = [];
            break;
        case 'habitos':
            datos.habitos = [];
            datos.registro_habitos = {};
            datos.config_habitos = null;
            break;
        case 'clientes':
            datos.clientes = [];
            break;
        case 'proyectos':
            datos.proyectos = [];
            break;
        case 'finanzas_personales':
            datos.finanzas_personales = {
                cuentas: [],
                categorias: [],
                transacciones: [],
                comercios: [],
                recurrentes: [],
                filtros_guardados: []
            };
            break;
        case 'dopamina':
            datos.dopamina = { acciones: [], predeterminado: 'all' };
            break;
        case 'calendario_tareas':
            datos.calendario_tareas = {
                listas: [
                    { id: 'lst-1', nombre: 'Tareas', editable: true },
                    { id: 'lst-2', nombre: 'Trabajo', editable: true },
                    { id: 'lst-3', nombre: 'Casa', editable: true }
                ],
                tareas: [],
                eventos: []
            };
            break;
        case 'planes':
            datos.planes = []; // O la estructura inicial que use tu archivo planes.js
            break;
        default:
            return false;
    }
    
    guardarDatos(datos);
    return true;
}