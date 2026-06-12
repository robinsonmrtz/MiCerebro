/* ============================================================
   MICEREBRO — calendario.js
   Agenda compacta + Tareas Horizontales + Drag/Resize
   ============================================================ */

let fechaCalendario = new Date();
const PIXELES_POR_HORA = 40; 
const SNAP_MINUTOS = 15;

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

const COLORES_EVENTO = ['#1A73E8', '#E67C73', '#F6BF26', '#33B679', '#8E24AA', '#F4511E', '#039BE5'];

// --- INICIALIZACIÓN ---
window.inicializarCalendario = function() {
    asegurarEstructura();
    fechaCalendario = new Date(); 
    renderizarFechaCabecera();
    renderizarGridHoras();
    iniciarLogicaClickGrid();
    
    renderizarListasTareas();
    renderizarEventos();
    posicionarLineaHoraActual();

    if(window.intervaloLineaAhora) clearInterval(window.intervaloLineaAhora);
    window.intervaloLineaAhora = setInterval(posicionarLineaHoraActual, 60000);
};

function asegurarEstructura() {
    let d = cargarDatos();
    if (!d.calendario_tareas) {
        d.calendario_tareas = {
            listas: [
                { id: 'lst-'+Date.now(), nombre: 'Tareas', editable: true },
                { id: 'lst-'+(Date.now()+1), nombre: 'Trabajo', editable: true },
                { id: 'lst-'+(Date.now()+2), nombre: 'Casa', editable: true }
            ],
            tareas: [],
            eventos: []
        };
        guardarDatos(d);
    }
}

function getFechaISO() {
    const offset = fechaCalendario.getTimezoneOffset();
    const f = new Date(fechaCalendario.getTime() - (offset*60*1000));
    return f.toISOString().split('T')[0];
}

function renderizarFechaCabecera() {
    const dias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    document.getElementById('cal-dia-numero').innerText = fechaCalendario.getDate();
    document.getElementById('cal-dia-nombre').innerText = dias[fechaCalendario.getDay()];
    document.getElementById('cal-mes-anio').innerText = fechaCalendario.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
    document.getElementById('cal-input-fecha-oculto').value = getFechaISO();
}

window.cambiarDiaCalendario = function(delta) {
    fechaCalendario.setDate(fechaCalendario.getDate() + delta);
    alCambiarFecha();
};

window.irAHoyCalendario = function() {
    fechaCalendario = new Date();
    alCambiarFecha();
};

window.irAFechaCalendario = function(fechaStr) {
    if(!fechaStr) return;
    const partes = fechaStr.split('-');
    fechaCalendario = new Date(partes[0], partes[1]-1, partes[2]);
    alCambiarFecha();
};

function alCambiarFecha() {
    renderizarFechaCabecera();
    renderizarListasTareas();
    renderizarEventos();
    posicionarLineaHoraActual();
}

// --- TAREAS HORIZONTALES (Max 3) ---
function renderizarListasTareas() {
    const d = cargarDatos();
    const contenedor = document.getElementById('contenedor-listas-tareas');
    const btnCrear = document.getElementById('btn-crear-lista');
    if (!contenedor) return;
    
    if(btnCrear) {
        btnCrear.style.display = d.calendario_tareas.listas.length >= 3 ? 'none' : 'block';
    }

    const fechaActualISO = getFechaISO();
    let html = '';
    
    d.calendario_tareas.listas.forEach(lista => {
        const tareasLista = d.calendario_tareas.tareas.filter(t => t.lista_id === lista.id).filter(t => {
            if (t.estado === 'completada') return t.fecha_completada === fechaActualISO;
            if (t.estado === 'pendiente') return t.fecha_creacion <= fechaActualISO;
            return false;
        });

        html += `
        <div class="task-list-card">
            <div class="task-list-header">
                <input type="text" class="task-list-title" value="${lista.nombre}" 
                       onchange="window.actualizarNombreLista('${lista.id}', this.value)">
                <button class="btn-borrar" style="padding:0; min-width:auto;" onclick="window.borrarLista('${lista.id}')">✕</button>
            </div>
            <div class="task-items-container">
                ${tareasLista.map(t => {
                    const esAtrasada = (t.estado === 'pendiente' && t.fecha_creacion < fechaActualISO);
                    return `
                    <div class="task-item ${t.estado === 'completada' ? 'completada' : ''} ${esAtrasada ? 'atrasada' : ''}">
                        <div class="task-checkbox" onclick="window.toggleTarea('${t.id}')">✓</div>
                        <input type="text" class="task-text" value="${t.texto}" 
                               onchange="window.actualizarTextoTarea('${t.id}', this.value)">
                        <button class="btn-borrar" style="padding:0 4px; font-size:12px; opacity:0.5;" onclick="window.borrarTarea('${t.id}')">✕</button>
                    </div>`;
                }).join('')}
            </div>
            <button class="task-add-btn" onclick="window.crearTareaNueva('${lista.id}')">+ Añadir tarea</button>
        </div>`;
    });
    
    contenedor.innerHTML = html;
}

window.crearNuevaListaTareas = function() {
    let d = cargarDatos();
    if(d.calendario_tareas.listas.length >= 3) return alert("Máximo 3 listas permitidas.");
    d.calendario_tareas.listas.push({ id: 'lst-' + Date.now(), nombre: 'Nueva Lista', editable: true });
    guardarDatos(d);
    renderizarListasTareas();
}

window.actualizarNombreLista = function(id, nuevoNombre) {
    let d = cargarDatos();
    let lista = d.calendario_tareas.listas.find(l => l.id === id);
    if(lista) lista.nombre = nuevoNombre;
    guardarDatos(d);
}

window.borrarLista = function(id) {
    if(!confirm('¿Borrar esta lista y todas sus tareas?')) return;
    let d = cargarDatos();
    d.calendario_tareas.listas = d.calendario_tareas.listas.filter(l => l.id !== id);
    d.calendario_tareas.tareas = d.calendario_tareas.tareas.filter(t => t.lista_id !== id);
    guardarDatos(d);
    renderizarListasTareas();
}

window.crearTareaNueva = function(lista_id) {
    let d = cargarDatos();
    d.calendario_tareas.tareas.push({
        id: 'tsk-' + Date.now(), lista_id: lista_id, texto: '', estado: 'pendiente', fecha_creacion: getFechaISO(), fecha_completada: null
    });
    guardarDatos(d);
    renderizarListasTareas();
    setTimeout(() => {
        const inputs = document.querySelectorAll('.task-text');
        if(inputs.length > 0) inputs[inputs.length-1].focus();
    }, 50);
}

window.actualizarTextoTarea = function(id, texto) {
    if(texto.trim() === '') { window.borrarTarea(id); return; }
    let d = cargarDatos();
    let tarea = d.calendario_tareas.tareas.find(t => t.id === id);
    if(tarea) tarea.texto = texto;
    guardarDatos(d);
}

window.toggleTarea = function(id) {
    let d = cargarDatos();
    let tarea = d.calendario_tareas.tareas.find(t => t.id === id);
    if(tarea) {
        if(tarea.estado === 'pendiente') {
            tarea.estado = 'completada';
            tarea.fecha_completada = getFechaISO();
        } else {
            tarea.estado = 'pendiente';
            tarea.fecha_completada = null;
        }
        guardarDatos(d);
        renderizarListasTareas();
    }
}

window.borrarTarea = function(id) {
    let d = cargarDatos();
    d.calendario_tareas.tareas = d.calendario_tareas.tareas.filter(t => t.id !== id);
    guardarDatos(d);
    renderizarListasTareas();
}

// --- CALENDARIO GRID Y 1 CLIC ---
function renderizarGridHoras() {
    const colHoras = document.getElementById('cal-columna-horas');
    const colLineas = document.getElementById('cal-lineas-grid');
    if(!colHoras || !colLineas) return;

    let horasHTML = ''; let lineasHTML = '';
    for(let i=0; i<24; i++) {
        let horaFormat = i === 0 ? '12 AM' : (i < 12 ? `${i} AM` : (i === 12 ? '12 PM' : `${i-12} PM`));
        horasHTML += `<div class="cal-hora-label" style="top: ${i * PIXELES_POR_HORA}px;">${horaFormat}</div>`;
        lineasHTML += `<div class="cal-linea-grid" style="top: ${i * PIXELES_POR_HORA}px;"></div>`;
    }
    colHoras.innerHTML = horasHTML; colLineas.innerHTML = lineasHTML;
}

function calcularMinutosDesdeY(clientY) {
    const zona = document.getElementById('cal-zona-arrastre');
    const rect = zona.getBoundingClientRect();
    let yEnGrid = clientY - rect.top + zona.parentElement.scrollTop; 
    let minutos = Math.max(0, Math.min(1440, yEnGrid / (PIXELES_POR_HORA / 60)));
    return Math.round(minutos / SNAP_MINUTOS) * SNAP_MINUTOS;
}

function iniciarLogicaClickGrid() {
    const zona = document.getElementById('cal-zona-arrastre');
    zona.addEventListener('click', (e) => {
        if(e.target.closest('.cal-evento')) return; 
        if(isDraggingEvent && hasMoved) return; 
        if(isResizingEvent && hasMoved) return;
        
        let minutos = calcularMinutosDesdeY(e.clientY);
        let fin = minutos + 60; 
        if(fin > 1440) fin = 1440;
        
        let d = cargarDatos();
        d.calendario_tareas.eventos.push({
            id: 'evt-' + Date.now(), titulo: '(Nueva Tarea)', fecha: getFechaISO(),
            hora_inicio: formatearHoraStr(minutos), hora_fin: formatearHoraStr(fin), color: COLORES_EVENTO[0]
        });
        guardarDatos(d);
        renderizarEventos();
    });
}

// --- MAGIA: ESTIRAR EVENTO (RESIZE) ---
window.empezarResizeEvento = function(e, id, edge) {
    e.stopPropagation(); // Evita que se dispare el arrastre general
    if(e.type === 'touchstart') dragStartY = e.touches[0].clientY;
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
    document.addEventListener('touchmove', moverResize, {passive: false});
    document.addEventListener('touchend', soltarResize);
};

function moverResize(e) {
    if(!isResizingEvent) return;
    hasMoved = true;
    if(e.type === 'touchmove') e.preventDefault();
    
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
        if(el) {
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
        if(el) {
            el.style.height = ((nuevosMinutos - originalEvIni) * (PIXELES_POR_HORA / 60)) + 'px';
            el.querySelector('.cal-evento-tiempo').innerText = `${minutosAAmPm(originalEvIni)} - ${minutosAAmPm(nuevosMinutos)}`;
        }
    }
}

function soltarResize(e) {
    if(!isResizingEvent) return;
    isResizingEvent = false;
    
    document.removeEventListener('mousemove', moverResize);
    document.removeEventListener('mouseup', soltarResize);
    document.removeEventListener('touchmove', moverResize);
    document.removeEventListener('touchend', soltarResize);
    
    if(hasMoved && window.tempNuevosMinutos !== undefined) {
        let d = cargarDatos();
        let ev = d.calendario_tareas.eventos.find(x => x.id === draggedEventId);
        
        if (resizeEdge === 'top') ev.hora_inicio = formatearHoraStr(window.tempNuevosMinutos);
        else ev.hora_fin = formatearHoraStr(window.tempNuevosMinutos);
        
        guardarDatos(d);
        renderizarEventos();
    }
    
    window.tempNuevosMinutos = undefined;
    setTimeout(() => { hasMoved = false; draggedEventId = null; resizeEdge = null; }, 50);
}

// --- MAGIA: MOVER EVENTO (DRAG) ---
window.empezarArrastreEvento = function(e, id) {
    if(e.type === 'touchstart') dragStartY = e.touches[0].clientY;
    else dragStartY = e.clientY;
    
    isDraggingEvent = true;
    draggedEventId = id;
    hasMoved = false;
    
    const d = cargarDatos();
    const ev = d.calendario_tareas.eventos.find(x => x.id === id);
    dragStartMinutos = tiempoAMinutos(ev.hora_inicio);
    
    document.addEventListener('mousemove', moverEvento);
    document.addEventListener('mouseup', soltarEvento);
    document.addEventListener('touchmove', moverEvento, {passive: false});
    document.addEventListener('touchend', soltarEvento);
};

function moverEvento(e) {
    if(!isDraggingEvent) return;
    hasMoved = true;
    if(e.type === 'touchmove') e.preventDefault(); 
    
    let clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    let deltaY = clientY - dragStartY;
    let deltaMinutos = deltaY / (PIXELES_POR_HORA / 60);
    
    let nuevosMinutos = dragStartMinutos + deltaMinutos;
    nuevosMinutos = Math.round(nuevosMinutos / SNAP_MINUTOS) * SNAP_MINUTOS;
    if (nuevosMinutos < 0) nuevosMinutos = 0;
    
    const el = document.querySelector(`.cal-evento[data-id="${draggedEventId}"]`);
    if(el) el.style.top = (nuevosMinutos * (PIXELES_POR_HORA / 60)) + 'px';
    window.tempNuevosMinutos = nuevosMinutos;
}

function soltarEvento(e) {
    if(!isDraggingEvent) return;
    isDraggingEvent = false;
    
    document.removeEventListener('mousemove', moverEvento);
    document.removeEventListener('mouseup', soltarEvento);
    document.removeEventListener('touchmove', moverEvento);
    document.removeEventListener('touchend', soltarEvento);
    
    if(hasMoved && window.tempNuevosMinutos !== undefined) {
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
        renderizarEventos();
    }
    
    window.tempNuevosMinutos = undefined;
    setTimeout(() => { hasMoved = false; draggedEventId = null; }, 50); 
}

window.clickEnEvento = function(e, id) {
    e.stopPropagation();
    if(hasMoved) return; // Si arrastramos o estiramos, no abre el modal
    window.abrirModalEvento(id);
};

// --- RENDERIZACIÓN DE EVENTOS ---
function tiempoAMinutos(horaStr) { const [h, m] = horaStr.split(':').map(Number); return (h * 60) + m; }
function formatearHoraStr(minutos) { const h = Math.floor(minutos / 60); const m = minutos % 60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
function minutosAAmPm(minutos) { const h = Math.floor(minutos / 60); const m = minutos % 60; const ampm = h >= 12 ? 'pm' : 'am'; const hr = h % 12 || 12; return `${hr}:${String(m).padStart(2,'0')}${ampm}`; }

function renderizarEventos() {
    const renderDiv = document.getElementById('cal-eventos-render');
    if(!renderDiv) return;
    const d = cargarDatos(); const fechaISO = getFechaISO();
    const eventosHoy = d.calendario_tareas.eventos.filter(e => e.fecha === fechaISO);

    // Inyectamos las áreas invisibles (top y bottom) para poder estirar
    renderDiv.innerHTML = eventosHoy.map(ev => {
        const minIni = tiempoAMinutos(ev.hora_inicio);
        const minFin = tiempoAMinutos(ev.hora_fin);
        const top = minIni * (PIXELES_POR_HORA / 60);
        const height = Math.max((minFin - minIni) * (PIXELES_POR_HORA / 60), 15);
        
        return `
        <div class="cal-evento" data-id="${ev.id}" style="top: ${top}px; height: ${height}px; background-color: ${ev.color};"
             onmousedown="window.empezarArrastreEvento(event, '${ev.id}')"
             ontouchstart="window.empezarArrastreEvento(event, '${ev.id}')"
             onclick="window.clickEnEvento(event, '${ev.id}')">
            
            <div class="cal-evento-resizer top" 
                 onmousedown="window.empezarResizeEvento(event, '${ev.id}', 'top')" 
                 ontouchstart="window.empezarResizeEvento(event, '${ev.id}', 'top')"></div>
            
            <div class="cal-evento-titulo">${ev.titulo}</div>
            <div class="cal-evento-tiempo">${minutosAAmPm(minIni)} - ${minutosAAmPm(minFin)}</div>
            
            <div class="cal-evento-resizer bottom" 
                 onmousedown="window.empezarResizeEvento(event, '${ev.id}', 'bottom')" 
                 ontouchstart="window.empezarResizeEvento(event, '${ev.id}', 'bottom')"></div>
        </div>
        `;
    }).join('');
}

// --- MODAL Y OTROS ---
window.abrirModalEvento = function(id = null) {
    const d = cargarDatos(); 
    const modal = document.getElementById('modal-evento-cal');
    const btnBorrar = document.getElementById('btn-borrar-ev');
    
    // Usamos tu nueva clase '.activo' en lugar de style.display
    modal.classList.add('activo'); 
    renderizarPaletaEventos();

    if (id) {
        const ev = d.calendario_tareas.eventos.find(e => e.id === id);
        document.getElementById('modal-ev-titulo-cabecera').innerText = 'Editar Evento';
        document.getElementById('modal-ev-id').value = ev.id; 
        document.getElementById('modal-ev-titulo').value = ev.titulo;
        document.getElementById('modal-ev-inicio').value = ev.hora_inicio; 
        document.getElementById('modal-ev-fin').value = ev.hora_fin;
        document.getElementById('modal-ev-color').value = ev.color; 
        
        // Usamos tu nueva clase '.visible' para el botón
        btnBorrar.classList.add('visible'); 
    } else {
        document.getElementById('modal-ev-titulo-cabecera').innerText = 'Nuevo Evento';
        document.getElementById('modal-ev-id').value = ''; 
        document.getElementById('modal-ev-titulo').value = '';
        document.getElementById('modal-ev-inicio').value = '09:00'; 
        document.getElementById('modal-ev-fin').value = '10:00';
        document.getElementById('modal-ev-color').value = COLORES_EVENTO[0]; 
        
        // Ocultamos el botón quitando la clase
        btnBorrar.classList.remove('visible'); 
    }
    
    actualizarSeleccionPaleta();
    
    // Auto-foco en el título para escribir de inmediato
    setTimeout(() => document.getElementById('modal-ev-titulo').focus(), 100);
};
function renderizarPaletaEventos() {
    const wrap = document.getElementById('paleta-evento'); if (!wrap) return;
    wrap.innerHTML = COLORES_EVENTO.map(c => `<div class="paleta-color-btn color-ev-btn" style="background:${c};" data-color="${c}" onclick="document.getElementById('modal-ev-color').value = '${c}'; window.actualizarSeleccionPaleta();"></div>`).join('');
}
window.actualizarSeleccionPaleta = function() {
    const colorSeleccionado = document.getElementById('modal-ev-color').value;
    document.querySelectorAll('.color-ev-btn').forEach(btn => {
        if(btn.dataset.color === colorSeleccionado) btn.classList.add('seleccionado'); else btn.classList.remove('seleccionado');
    });
};

window.guardarEvento = function() {
    const id = document.getElementById('modal-ev-id').value; 
    const titulo = document.getElementById('modal-ev-titulo').value.trim() || '(Sin título)';
    const ini = document.getElementById('modal-ev-inicio').value; 
    const fin = document.getElementById('modal-ev-fin').value;
    const color = document.getElementById('modal-ev-color').value;
    
    if (tiempoAMinutos(fin) <= tiempoAMinutos(ini)) return alert("La hora de fin debe ser posterior a la de inicio.");
    
    let d = cargarDatos();
    if (id) {
        const ev = d.calendario_tareas.eventos.find(e => e.id === id);
        ev.titulo = titulo; ev.hora_inicio = ini; ev.hora_fin = fin; ev.color = color;
    } else {
        d.calendario_tareas.eventos.push({ id: 'evt-' + Date.now(), titulo, fecha: getFechaISO(), hora_inicio: ini, hora_fin: fin, color });
    }
    
    guardarDatos(d); 
    // Cerramos el modal removiendo la clase 'activo'
    document.getElementById('modal-evento-cal').classList.remove('activo'); 
    renderizarEventos();
};

window.borrarEvento = function() {
    const id = document.getElementById('modal-ev-id').value; 
    let d = cargarDatos();
    d.calendario_tareas.eventos = d.calendario_tareas.eventos.filter(e => e.id !== id);
    guardarDatos(d); 
    
    // Cerramos el modal removiendo la clase 'activo'
    document.getElementById('modal-evento-cal').classList.remove('activo'); 
    renderizarEventos();
};

function posicionarLineaHoraActual() {
    const linea = document.getElementById('cal-linea-ahora'); if(!linea) return;
    if(new Date().toISOString().split('T')[0] !== getFechaISO()) { linea.style.display = 'none'; return; }
    linea.style.display = 'block'; const ahora = new Date(); const minutosDelDia = (ahora.getHours() * 60) + ahora.getMinutes();
    linea.style.top = `${minutosDelDia * (PIXELES_POR_HORA / 60)}px`;
}