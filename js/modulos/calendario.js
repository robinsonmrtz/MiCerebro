/* ============================================================
   MICEREBRO — calendario.js
   Vista tipo Google Calendar (Día / Semana / Mes)
   + Mini calendario de navegación + eventos recurrentes
   ============================================================ */

let fechaCalendario = new Date();
let vistaActual = 'dia';
let miniCalFecha = new Date();

const PIXELES_POR_HORA = 40;
const SNAP_MINUTOS = 15;
const NOMBRES_DIAS_CORTOS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

// Variables de arrastre (Mover Evento)
let isDraggingEvent = false;
let draggedEventId = null;
let dragStartY = 0;
let dragStartMinutos = 0;
let hasMoved = false;

// Variables de estiramiento (Resize Evento)
let isResizingEvent = false;
let resizeEdge = null;
let originalEvIni = 0;
let originalEvFin = 0;

// Arrastre de eventos en la vista Mes (drag&drop nativo, solo cambia de día)
let mesArrastreEventId = null;

const COLORES_EVENTO = ['#1A73E8', '#E67C73', '#F6BF26', '#33B679', '#8E24AA', '#F4511E', '#039BE5'];

// --- INICIALIZACIÓN ---
window.inicializarCalendario = function() {
    asegurarEstructura();
    fechaCalendario = new Date();
    miniCalFecha = new Date();
    vistaActual = 'dia';

    actualizarBotonesVista();
    renderizarTodo();

    if (window.intervaloLineaAhora) clearInterval(window.intervaloLineaAhora);
    window.intervaloLineaAhora = setInterval(posicionarLineasAhora, 60000);
};

function asegurarEstructura() {
    let d = cargarDatos();
    if (!d.calendario_tareas) {
        d.calendario_tareas = {
            listas: [
                { id: 'lst-' + Date.now(), nombre: 'Tareas', editable: true },
                { id: 'lst-' + (Date.now() + 1), nombre: 'Trabajo', editable: true },
                { id: 'lst-' + (Date.now() + 2), nombre: 'Casa', editable: true }
            ],
            tareas: [],
            eventos: []
        };
        guardarDatos(d);
    }
}

// --- HELPERS DE FECHA ---
function formatearFechaISO(fecha) {
    const offset = fecha.getTimezoneOffset();
    const f = new Date(fecha.getTime() - (offset * 60000));
    return f.toISOString().split('T')[0];
}

function obtenerInicioSemana(fecha) {
    const d = new Date(fecha);
    const dia = d.getDay(); // 0 = domingo
    const diff = (dia === 0 ? -6 : 1 - dia); // la semana empieza en lunes
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function capitalizar(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function tiempoAMinutos(horaStr) { const [h, m] = horaStr.split(':').map(Number); return (h * 60) + m; }
function formatearHoraStr(minutos) { const h = Math.floor(minutos / 60); const m = minutos % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
function minutosAAmPm(minutos) { const h = Math.floor(minutos / 60); const m = minutos % 60; const ampm = h >= 12 ? 'pm' : 'am'; const hr = h % 12 || 12; return `${hr}:${String(m).padStart(2, '0')}${ampm}`; }

// --- NAVEGACIÓN ---
window.cambiarPeriodo = function(delta) {
    if (vistaActual === 'dia') fechaCalendario.setDate(fechaCalendario.getDate() + delta);
    else if (vistaActual === 'semana') fechaCalendario.setDate(fechaCalendario.getDate() + (delta * 7));
    else fechaCalendario.setMonth(fechaCalendario.getMonth() + delta);

    miniCalFecha = new Date(fechaCalendario);
    renderizarTodo();
};

window.irAHoyCalendario = function() {
    fechaCalendario = new Date();
    miniCalFecha = new Date();
    renderizarTodo();
};

window.irAFechaCalendario = function(fechaStr) {
    if (!fechaStr) return;
    const partes = fechaStr.split('-');
    fechaCalendario = new Date(partes[0], partes[1] - 1, partes[2]);
    miniCalFecha = new Date(fechaCalendario);
    renderizarTodo();
};

window.cambiarVista = function(v) {
    vistaActual = v;
    actualizarBotonesVista();
    renderizarTodo();
};

function actualizarBotonesVista() {
    document.querySelectorAll('.vista-btn').forEach(btn => {
        btn.classList.toggle('activo', btn.dataset.vista === vistaActual);
    });
}

// --- RENDER MAESTRO ---
function renderizarTodo() {
    renderizarCabeceraPeriodo();
    renderizarMiniCalendario();
    mostrarVistaActiva();

    if (vistaActual === 'dia') renderizarVistaDia();
    else if (vistaActual === 'semana') renderizarVistaSemana();
    else renderizarVistaMes();
}

function rerenderizarVistaActual() {
    if (vistaActual === 'dia') renderizarVistaDia();
    else if (vistaActual === 'semana') renderizarVistaSemana();
    else renderizarVistaMes();
    renderizarMiniCalendario();
}

function mostrarVistaActiva() {
    const timeline = document.getElementById('vista-timeline-container');
    const mes = document.getElementById('vista-mes-container');
    if (!timeline || !mes) return;
    if (vistaActual === 'mes') {
        timeline.style.display = 'none';
        mes.style.display = 'flex';
    } else {
        timeline.style.display = 'block';
        mes.style.display = 'none';
    }
}

function renderizarCabeceraPeriodo() {
    const el = document.getElementById('cal-titulo-periodo');
    const inputFecha = document.getElementById('cal-input-fecha-oculto');
    if (!el) return;

    if (vistaActual === 'mes') {
        el.innerText = capitalizar(fechaCalendario.toLocaleString('es-CO', { month: 'long', year: 'numeric' }));
    } else if (vistaActual === 'semana') {
        const inicio = obtenerInicioSemana(fechaCalendario);
        const fin = new Date(inicio); fin.setDate(fin.getDate() + 6);
        const mismoMes = inicio.getMonth() === fin.getMonth();
        const mesInicio = capitalizar(inicio.toLocaleString('es-CO', { month: 'short' }));
        const mesFin = capitalizar(fin.toLocaleString('es-CO', { month: 'short' }));
        el.innerText = mismoMes
            ? `${inicio.getDate()} – ${fin.getDate()} ${mesFin} ${fin.getFullYear()}`
            : `${inicio.getDate()} ${mesInicio} – ${fin.getDate()} ${mesFin} ${fin.getFullYear()}`;
    } else {
        el.innerText = `${fechaCalendario.getDate()} de ${capitalizar(fechaCalendario.toLocaleString('es-CO', { month: 'long' }))} de ${fechaCalendario.getFullYear()}`;
    }

    if (inputFecha) inputFecha.value = formatearFechaISO(fechaCalendario);
}

// --- MINI CALENDARIO ---
function renderizarMiniCalendario() {
    const grid = document.getElementById('mini-cal-grid');
    const titulo = document.getElementById('mini-cal-mes-anio');
    if (!grid || !titulo) return;

    titulo.innerText = capitalizar(miniCalFecha.toLocaleString('es-CO', { month: 'long', year: 'numeric' }));

    const anio = miniCalFecha.getFullYear();
    const mes = miniCalFecha.getMonth();
    const inicioGrid = obtenerInicioSemana(new Date(anio, mes, 1));

    const hoyISO = formatearFechaISO(new Date());
    const seleccionadoISO = formatearFechaISO(fechaCalendario);

    let html = '';
    for (let i = 0; i < 42; i++) {
        const d = new Date(inicioGrid);
        d.setDate(d.getDate() + i);
        const iso = formatearFechaISO(d);
        const clases = [
            d.getMonth() !== mes ? 'otro-mes' : '',
            iso === hoyISO ? 'hoy' : '',
            iso === seleccionadoISO ? 'seleccionado' : ''
        ].filter(Boolean).join(' ');
        html += `<button type="button" class="mini-cal-dia ${clases}" onclick="window.miniCalSeleccionarDia('${iso}')">${d.getDate()}</button>`;
    }
    grid.innerHTML = html;
}

window.miniCalCambiarMes = function(delta) {
    miniCalFecha.setMonth(miniCalFecha.getMonth() + delta);
    renderizarMiniCalendario();
};

window.miniCalSeleccionarDia = function(iso) {
    const partes = iso.split('-');
    fechaCalendario = new Date(partes[0], partes[1] - 1, partes[2]);
    miniCalFecha = new Date(fechaCalendario);
    renderizarTodo();
};

// --- OCURRENCIAS DE EVENTOS (incluye recurrencias) ---
// Un evento se guarda UNA sola vez (con su fecha base). Esta función calcula,
// para una fecha cualquiera, qué eventos "caen" ese día (el original o una repetición).
function obtenerEventosParaFecha(fechaISO) {
    const d = cargarDatos();
    const eventos = d.calendario_tareas.eventos || [];
    const fechaObjetivo = new Date(fechaISO + 'T00:00:00');
    const resultado = [];

    eventos.forEach(ev => {
        if (ev.fecha === fechaISO) {
            resultado.push({ ...ev, esBase: true });
            return;
        }
        if (fechaISO < ev.fecha) return; // las repeticiones solo avanzan hacia adelante
        const repetir = ev.repetir || 'no';
        if (repetir === 'no') return;

        if (repetir === 'diaria') {
            resultado.push({ ...ev, esBase: false });
        } else if (repetir === 'semanal') {
            const fechaBase = new Date(ev.fecha + 'T00:00:00');
            const diasSemana = (ev.dias_semana && ev.dias_semana.length) ? ev.dias_semana : [fechaBase.getDay()];
            if (diasSemana.includes(fechaObjetivo.getDay())) {
                resultado.push({ ...ev, esBase: false });
            }
        } else if (repetir === 'mensual') {
            const fechaBase = new Date(ev.fecha + 'T00:00:00');
            if (fechaObjetivo.getDate() === fechaBase.getDate()) {
                resultado.push({ ...ev, esBase: false });
            }
        }
    });

    return resultado;
}

// --- VISTA DÍA / SEMANA (línea de tiempo compartida) ---
function renderizarColumnaHoras() {
    const colHoras = document.getElementById('cal-columna-horas');
    if (!colHoras) return;
    let html = '';
    for (let i = 0; i < 24; i++) {
        let horaFormat = i === 0 ? '12 AM' : (i < 12 ? `${i} AM` : (i === 12 ? '12 PM' : `${i - 12} PM`));
        html += `<div class="cal-hora-label" style="top: ${i * PIXELES_POR_HORA}px;">${horaFormat}</div>`;
    }
    colHoras.innerHTML = html;
}

function construirColumnaDia(fechaISO, esHoy) {
    let lineasHTML = '';
    for (let i = 0; i < 24; i++) {
        lineasHTML += `<div class="cal-linea-grid" style="top: ${i * PIXELES_POR_HORA}px;"></div>`;
    }

    const eventosDelDia = obtenerEventosParaFecha(fechaISO);
    const eventosHTML = eventosDelDia.map(ev => construirHtmlEvento(ev)).join('');
    const lineaAhoraHTML = esHoy ? `<div class="cal-linea-ahora"><div class="cal-punto-ahora"></div></div>` : '';

    return `
    <div class="cal-columna-dia" data-fecha="${fechaISO}" onclick="window.clickEnColumna(event, '${fechaISO}')">
        <div class="cal-lineas-grid">${lineasHTML}</div>
        <div class="cal-eventos-render">${eventosHTML}</div>
        ${lineaAhoraHTML}
    </div>`;
}

function construirHtmlEvento(ev) {
    const minIni = tiempoAMinutos(ev.hora_inicio);
    const minFin = tiempoAMinutos(ev.hora_fin);
    const top = minIni * (PIXELES_POR_HORA / 60);
    const height = Math.max((minFin - minIni) * (PIXELES_POR_HORA / 60), 15);
    const arrastrable = ev.esBase;
    const icono = (ev.repetir && ev.repetir !== 'no') ? '🔁 ' : '';

    const handlersArrastre = arrastrable ? `
        onmousedown="window.empezarArrastreEvento(event, '${ev.id}')"
        ontouchstart="window.empezarArrastreEvento(event, '${ev.id}')"` : '';

    const resizersHTML = arrastrable ? `
        <div class="cal-evento-resizer top" onmousedown="window.empezarResizeEvento(event, '${ev.id}', 'top')" ontouchstart="window.empezarResizeEvento(event, '${ev.id}', 'top')"></div>
        <div class="cal-evento-resizer bottom" onmousedown="window.empezarResizeEvento(event, '${ev.id}', 'bottom')" ontouchstart="window.empezarResizeEvento(event, '${ev.id}', 'bottom')"></div>` : '';

    return `
    <div class="cal-evento ${arrastrable ? '' : 'cal-evento-repetido'}" data-id="${ev.id}"
         style="top: ${top}px; height: ${height}px; background-color: ${ev.color};" ${handlersArrastre}
         onclick="window.clickEnEvento(event, '${ev.id}')">
        ${resizersHTML}
        <div class="cal-evento-titulo">${icono}${ev.titulo}</div>
        <div class="cal-evento-tiempo">${minutosAAmPm(minIni)} - ${minutosAAmPm(minFin)}</div>
    </div>`;
}

function renderizarVistaDia() {
    renderizarColumnaHoras();
    const fechaISO = formatearFechaISO(fechaCalendario);
    const hoyISO = formatearFechaISO(new Date());
    const esHoy = fechaISO === hoyISO;

    document.getElementById('cal-cabecera-columnas').innerHTML = `
        <div class="cal-cabecera-hueco"></div>
        <div class="cal-cabecera-dia ${esHoy ? 'es-hoy' : ''}">
            <span class="cab-dia-nombre">${NOMBRES_DIAS_CORTOS[fechaCalendario.getDay()]}</span>
            <span class="cab-dia-numero">${fechaCalendario.getDate()}</span>
        </div>`;

    const zona = document.getElementById('cal-columnas-zona');
    zona.classList.remove('multi-columna');
    zona.innerHTML = construirColumnaDia(fechaISO, esHoy);

    posicionarLineasAhora();
}

function renderizarVistaSemana() {
    renderizarColumnaHoras();
    const inicioSemana = obtenerInicioSemana(fechaCalendario);
    const hoyISO = formatearFechaISO(new Date());

    let cabeceraHTML = `<div class="cal-cabecera-hueco"></div>`;
    let columnasHTML = '';

    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(d.getDate() + i);
        const fechaISO = formatearFechaISO(d);
        const esHoy = fechaISO === hoyISO;

        cabeceraHTML += `
            <div class="cal-cabecera-dia ${esHoy ? 'es-hoy' : ''}">
                <span class="cab-dia-nombre">${NOMBRES_DIAS_CORTOS[d.getDay()]}</span>
                <span class="cab-dia-numero">${d.getDate()}</span>
            </div>`;
        columnasHTML += construirColumnaDia(fechaISO, esHoy);
    }

    document.getElementById('cal-cabecera-columnas').innerHTML = cabeceraHTML;
    const zona = document.getElementById('cal-columnas-zona');
    zona.classList.add('multi-columna');
    zona.innerHTML = columnasHTML;

    posicionarLineasAhora();
}

function posicionarLineasAhora() {
    const ahora = new Date();
    const minutosDelDia = (ahora.getHours() * 60) + ahora.getMinutes();
    document.querySelectorAll('.cal-linea-ahora').forEach(linea => {
        linea.style.top = `${minutosDelDia * (PIXELES_POR_HORA / 60)}px`;
    });
}

// --- CREACIÓN CON 1 CLIC (día / semana) ---
window.clickEnColumna = function(e, fechaISO) {
    if (e.target.closest('.cal-evento')) return;
    if (isDraggingEvent && hasMoved) return;
    if (isResizingEvent && hasMoved) return;

    const columna = e.currentTarget;
    const wrapper = columna.closest('.cal-grid-wrapper');
    const rect = columna.getBoundingClientRect();
    let yEnGrid = e.clientY - rect.top + (wrapper ? wrapper.scrollTop : 0);
    let minutos = Math.max(0, Math.min(1440, yEnGrid / (PIXELES_POR_HORA / 60)));
    minutos = Math.round(minutos / SNAP_MINUTOS) * SNAP_MINUTOS;
    let fin = Math.min(minutos + 60, 1440);

    let d = cargarDatos();
    d.calendario_tareas.eventos.push({
        id: 'evt-' + Date.now(), titulo: '(Nuevo evento)', fecha: fechaISO,
        hora_inicio: formatearHoraStr(minutos), hora_fin: formatearHoraStr(fin),
        color: COLORES_EVENTO[0], repetir: 'no', dias_semana: []
    });
    guardarDatos(d);
    rerenderizarVistaActual();
};

// --- MAGIA: ESTIRAR EVENTO (RESIZE) ---
window.empezarResizeEvento = function(e, id, edge) {
    e.stopPropagation(); // Evita que se dispare el arrastre general
    if (e.type === 'touchstart') dragStartY = e.touches[0].clientY;
    else dragStartY = e.clientY;

    isResizingEvent = true;
    resizeEdge = edge;
    draggedEventId = id;
    hasMoved = false;

    const d = cargarDatos();
    const ev = d.calendario_tareas.eventos.find(x => x.id === id);
    originalEvIni = tiempoAMinutos(ev.hora_inicio);
    originalEvFin = tiempoAMinutos(ev.hora_fin);

    document.addEventListener('mousemove', moverResize);
    document.addEventListener('mouseup', soltarResize);
    document.addEventListener('touchmove', moverResize, { passive: false });
    document.addEventListener('touchend', soltarResize);
};

function moverResize(e) {
    if (!isResizingEvent) return;
    hasMoved = true;
    if (e.type === 'touchmove') e.preventDefault();

    let clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    let deltaY = clientY - dragStartY;
    let deltaMinutos = deltaY / (PIXELES_POR_HORA / 60);

    if (resizeEdge === 'top') {
        let nuevosMinutos = originalEvIni + deltaMinutos;
        nuevosMinutos = Math.round(nuevosMinutos / SNAP_MINUTOS) * SNAP_MINUTOS;
        if (nuevosMinutos < 0) nuevosMinutos = 0;
        if (nuevosMinutos >= originalEvFin - SNAP_MINUTOS) nuevosMinutos = originalEvFin - SNAP_MINUTOS;

        window.tempNuevosMinutos = nuevosMinutos;

        const el = document.querySelector(`.cal-evento[data-id="${draggedEventId}"]`);
        if (el) {
            el.style.top = (nuevosMinutos * (PIXELES_POR_HORA / 60)) + 'px';
            el.style.height = ((originalEvFin - nuevosMinutos) * (PIXELES_POR_HORA / 60)) + 'px';
            el.querySelector('.cal-evento-tiempo').innerText = `${minutosAAmPm(nuevosMinutos)} - ${minutosAAmPm(originalEvFin)}`;
        }
    } else {
        let nuevosMinutos = originalEvFin + deltaMinutos;
        nuevosMinutos = Math.round(nuevosMinutos / SNAP_MINUTOS) * SNAP_MINUTOS;
        if (nuevosMinutos > 1440) nuevosMinutos = 1440;
        if (nuevosMinutos <= originalEvIni + SNAP_MINUTOS) nuevosMinutos = originalEvIni + SNAP_MINUTOS;

        window.tempNuevosMinutos = nuevosMinutos;

        const el = document.querySelector(`.cal-evento[data-id="${draggedEventId}"]`);
        if (el) {
            el.style.height = ((nuevosMinutos - originalEvIni) * (PIXELES_POR_HORA / 60)) + 'px';
            el.querySelector('.cal-evento-tiempo').innerText = `${minutosAAmPm(originalEvIni)} - ${minutosAAmPm(nuevosMinutos)}`;
        }
    }
}

function soltarResize(e) {
    if (!isResizingEvent) return;
    isResizingEvent = false;

    document.removeEventListener('mousemove', moverResize);
    document.removeEventListener('mouseup', soltarResize);
    document.removeEventListener('touchmove', moverResize);
    document.removeEventListener('touchend', soltarResize);

    if (hasMoved && window.tempNuevosMinutos !== undefined) {
        let d = cargarDatos();
        let ev = d.calendario_tareas.eventos.find(x => x.id === draggedEventId);

        if (resizeEdge === 'top') ev.hora_inicio = formatearHoraStr(window.tempNuevosMinutos);
        else ev.hora_fin = formatearHoraStr(window.tempNuevosMinutos);

        guardarDatos(d);
        rerenderizarVistaActual();
    }

    window.tempNuevosMinutos = undefined;
    setTimeout(() => { hasMoved = false; draggedEventId = null; resizeEdge = null; }, 50);
}

// --- MAGIA: MOVER EVENTO (DRAG) EN DÍA / SEMANA ---
window.empezarArrastreEvento = function(e, id) {
    if (e.type === 'touchstart') dragStartY = e.touches[0].clientY;
    else dragStartY = e.clientY;

    isDraggingEvent = true;
    draggedEventId = id;
    hasMoved = false;

    const d = cargarDatos();
    const ev = d.calendario_tareas.eventos.find(x => x.id === id);
    dragStartMinutos = tiempoAMinutos(ev.hora_inicio);

    document.addEventListener('mousemove', moverEvento);
    document.addEventListener('mouseup', soltarEvento);
    document.addEventListener('touchmove', moverEvento, { passive: false });
    document.addEventListener('touchend', soltarEvento);
};

function moverEvento(e) {
    if (!isDraggingEvent) return;
    hasMoved = true;
    if (e.type === 'touchmove') e.preventDefault();

    let clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    let deltaY = clientY - dragStartY;
    let deltaMinutos = deltaY / (PIXELES_POR_HORA / 60);

    let nuevosMinutos = dragStartMinutos + deltaMinutos;
    nuevosMinutos = Math.round(nuevosMinutos / SNAP_MINUTOS) * SNAP_MINUTOS;
    if (nuevosMinutos < 0) nuevosMinutos = 0;

    const el = document.querySelector(`.cal-evento[data-id="${draggedEventId}"]`);
    if (el) el.style.top = (nuevosMinutos * (PIXELES_POR_HORA / 60)) + 'px';
    window.tempNuevosMinutos = nuevosMinutos;
}

function soltarEvento(e) {
    if (!isDraggingEvent) return;
    isDraggingEvent = false;

    document.removeEventListener('mousemove', moverEvento);
    document.removeEventListener('mouseup', soltarEvento);
    document.removeEventListener('touchmove', moverEvento);
    document.removeEventListener('touchend', soltarEvento);

    if (hasMoved && window.tempNuevosMinutos !== undefined) {
        let d = cargarDatos();
        let ev = d.calendario_tareas.eventos.find(x => x.id === draggedEventId);
        let duracion = tiempoAMinutos(ev.hora_fin) - tiempoAMinutos(ev.hora_inicio);
        let finMinutos = window.tempNuevosMinutos + duracion;

        if (finMinutos > 1440) {
            finMinutos = 1440;
            window.tempNuevosMinutos = 1440 - duracion;
        }
        ev.hora_inicio = formatearHoraStr(window.tempNuevosMinutos);
        ev.hora_fin = formatearHoraStr(finMinutos);
        guardarDatos(d);
        rerenderizarVistaActual();
    }

    window.tempNuevosMinutos = undefined;
    setTimeout(() => { hasMoved = false; draggedEventId = null; }, 50);
}

window.clickEnEvento = function(e, id) {
    e.stopPropagation();
    if (hasMoved) return; // Si arrastramos o estiramos, no abre el modal
    window.abrirModalEvento(id);
};

// --- VISTA MES ---
function renderizarVistaMes() {
    const grid = document.getElementById('cal-mes-grid');
    if (!grid) return;

    const anio = fechaCalendario.getFullYear();
    const mes = fechaCalendario.getMonth();
    const inicioGrid = obtenerInicioSemana(new Date(anio, mes, 1));
    const hoyISO = formatearFechaISO(new Date());

    let html = '';
    for (let i = 0; i < 42; i++) {
        const d = new Date(inicioGrid);
        d.setDate(d.getDate() + i);
        const fechaISO = formatearFechaISO(d);
        const esOtroMes = d.getMonth() !== mes;
        const esHoy = fechaISO === hoyISO;

        const eventosDelDia = obtenerEventosParaFecha(fechaISO)
            .sort((a, b) => tiempoAMinutos(a.hora_inicio) - tiempoAMinutos(b.hora_inicio));

        const visibles = eventosDelDia.slice(0, 3);
        const chipsHTML = visibles.map(ev => {
            const arrastrable = ev.esBase;
            const icono = (ev.repetir && ev.repetir !== 'no') ? '🔁 ' : '';
            return `<div class="cal-mes-chip" draggable="${arrastrable}" data-id="${ev.id}"
                        style="background-color:${ev.color};"
                        ${arrastrable ? `ondragstart="window.mesArrastreIniciar(event,'${ev.id}')"` : ''}
                        onclick="window.clickEnEvento(event, '${ev.id}')">${icono}${minutosAAmPm(tiempoAMinutos(ev.hora_inicio))} ${ev.titulo}</div>`;
        }).join('');

        const masHTML = eventosDelDia.length > 3
            ? `<div class="cal-mes-mas" onclick="event.stopPropagation();">+${eventosDelDia.length - 3} más</div>`
            : '';

        html += `
        <div class="cal-mes-celda ${esOtroMes ? 'otro-mes' : ''} ${esHoy ? 'es-hoy' : ''}"
             ondragover="event.preventDefault()" ondrop="window.mesArrastreSoltar(event,'${fechaISO}')"
             onclick="window.clickEnCeldaMes(event,'${fechaISO}')">
            <span class="cal-mes-numero ${esHoy ? 'es-hoy-numero' : ''}">${d.getDate()}</span>
            <div class="cal-mes-eventos">${chipsHTML}${masHTML}</div>
        </div>`;
    }

    grid.innerHTML = html;
}

window.clickEnCeldaMes = function(e, fechaISO) {
    if (e.target.closest('.cal-mes-chip') || e.target.closest('.cal-mes-mas')) return;
    let d = cargarDatos();
    d.calendario_tareas.eventos.push({
        id: 'evt-' + Date.now(), titulo: '(Nuevo evento)', fecha: fechaISO,
        hora_inicio: '09:00', hora_fin: '10:00', color: COLORES_EVENTO[0], repetir: 'no', dias_semana: []
    });
    guardarDatos(d);
    renderizarVistaMes();
};

window.mesArrastreIniciar = function(e, id) {
    mesArrastreEventId = id;
    e.dataTransfer.effectAllowed = 'move';
};

window.mesArrastreSoltar = function(e, fechaDestinoISO) {
    e.preventDefault();
    if (!mesArrastreEventId) return;
    let d = cargarDatos();
    const ev = d.calendario_tareas.eventos.find(x => x.id === mesArrastreEventId);
    if (ev) {
        ev.fecha = fechaDestinoISO;
        guardarDatos(d);
        renderizarVistaMes();
    }
    mesArrastreEventId = null;
};

// --- MODAL Y OTROS ---
window.abrirModalEvento = function(id = null) {
    const d = cargarDatos();
    const modal = document.getElementById('modal-evento-cal');
    const btnBorrar = document.getElementById('btn-borrar-ev');

    modal.classList.add('activo');
    renderizarPaletaEventos();

    if (id) {
        const ev = d.calendario_tareas.eventos.find(e => e.id === id);
        document.getElementById('modal-ev-titulo-cabecera').innerText = 'Editar evento';
        document.getElementById('modal-ev-id').value = ev.id;
        document.getElementById('modal-ev-fecha').value = ev.fecha;
        document.getElementById('modal-ev-titulo').value = ev.titulo;
        document.getElementById('modal-ev-inicio').value = ev.hora_inicio;
        document.getElementById('modal-ev-fin').value = ev.hora_fin;
        document.getElementById('modal-ev-color').value = ev.color;
        document.getElementById('modal-ev-repetir').value = ev.repetir || 'no';
        marcarDiasSemanaSeleccionados(
            (ev.dias_semana && ev.dias_semana.length) ? ev.dias_semana : [new Date(ev.fecha + 'T00:00:00').getDay()]
        );
        btnBorrar.classList.add('visible');
    } else {
        const fechaISO = formatearFechaISO(fechaCalendario);
        document.getElementById('modal-ev-titulo-cabecera').innerText = 'Nuevo evento';
        document.getElementById('modal-ev-id').value = '';
        document.getElementById('modal-ev-fecha').value = fechaISO;
        document.getElementById('modal-ev-titulo').value = '';
        document.getElementById('modal-ev-inicio').value = '09:00';
        document.getElementById('modal-ev-fin').value = '10:00';
        document.getElementById('modal-ev-color').value = COLORES_EVENTO[0];
        document.getElementById('modal-ev-repetir').value = 'no';
        marcarDiasSemanaSeleccionados([fechaCalendario.getDay()]);
        btnBorrar.classList.remove('visible');
    }

    actualizarSeleccionPaleta();
    window.actualizarPanelRepeticion();

    // Auto-foco en el título para escribir de inmediato
    setTimeout(() => document.getElementById('modal-ev-titulo').focus(), 100);
};

window.actualizarPanelRepeticion = function() {
    const val = document.getElementById('modal-ev-repetir').value;
    const panel = document.getElementById('panel-dias-semana');
    if (panel) panel.style.display = (val === 'semanal') ? 'block' : 'none';
};

function marcarDiasSemanaSeleccionados(dias) {
    document.querySelectorAll('.dia-toggle-btn').forEach(btn => {
        btn.classList.toggle('activo', dias.includes(Number(btn.dataset.dia)));
    });
}

window.marcarTodosLosDias = function() {
    document.querySelectorAll('.dia-toggle-btn').forEach(btn => btn.classList.add('activo'));
};

// Delegación única para los botones de día de la semana dentro del modal
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.dia-toggle-btn');
    if (btn) btn.classList.toggle('activo');
});

function renderizarPaletaEventos() {
    const wrap = document.getElementById('paleta-evento'); if (!wrap) return;
    wrap.innerHTML = COLORES_EVENTO.map(c => `<div class="paleta-color-btn color-ev-btn" style="background:${c};" data-color="${c}" onclick="document.getElementById('modal-ev-color').value = '${c}'; window.actualizarSeleccionPaleta();"></div>`).join('');
}
window.actualizarSeleccionPaleta = function() {
    const colorSeleccionado = document.getElementById('modal-ev-color').value;
    document.querySelectorAll('.color-ev-btn').forEach(btn => {
        if (btn.dataset.color === colorSeleccionado) btn.classList.add('seleccionado'); else btn.classList.remove('seleccionado');
    });
};

window.guardarEvento = function() {
    const id = document.getElementById('modal-ev-id').value;
    const fecha = document.getElementById('modal-ev-fecha').value;
    const titulo = document.getElementById('modal-ev-titulo').value.trim() || '(Sin título)';
    const ini = document.getElementById('modal-ev-inicio').value;
    const fin = document.getElementById('modal-ev-fin').value;
    const color = document.getElementById('modal-ev-color').value;
    const repetir = document.getElementById('modal-ev-repetir').value;

    if (tiempoAMinutos(fin) <= tiempoAMinutos(ini)) return alert("La hora de fin debe ser posterior a la de inicio.");

    let diasSemana = [];
    if (repetir === 'semanal') {
        diasSemana = Array.from(document.querySelectorAll('.dia-toggle-btn.activo')).map(b => Number(b.dataset.dia));
        if (diasSemana.length === 0) diasSemana = [new Date(fecha + 'T00:00:00').getDay()];
    }

    let d = cargarDatos();
    if (id) {
        const ev = d.calendario_tareas.eventos.find(e => e.id === id);
        ev.titulo = titulo; ev.hora_inicio = ini; ev.hora_fin = fin; ev.color = color;
        ev.repetir = repetir; ev.dias_semana = diasSemana;
    } else {
        d.calendario_tareas.eventos.push({
            id: 'evt-' + Date.now(), titulo, fecha, hora_inicio: ini, hora_fin: fin, color,
            repetir, dias_semana: diasSemana
        });
    }

    guardarDatos(d);
    document.getElementById('modal-evento-cal').classList.remove('activo');
    rerenderizarVistaActual();
};

window.borrarEvento = function() {
    const id = document.getElementById('modal-ev-id').value;
    let d = cargarDatos();
    d.calendario_tareas.eventos = d.calendario_tareas.eventos.filter(e => e.id !== id);
    guardarDatos(d);

    document.getElementById('modal-evento-cal').classList.remove('activo');
    rerenderizarVistaActual();
};