/* FILE: js/modulos/habitos.js 
   VERSIÓN: 3.1 — Sin localStorage directo, todo pasa por storage.js
*/

let fechaSeleccionada = new Date().toLocaleDateString('es-CO');
let offsetDias = 0;
let habitoAccionActual = null;
let idHabitoParaBorrar = null;

const PALETA_COLORES = ['#FF9800', '#2196F3', '#3F51B5', '#E91E63', '#4CAF50', '#9C27B0', '#00BCD4', '#607D8B'];
const CONFIG_HABITOS_DEFAULT = {
    grupos: [
        { nombre: '🌅 Mañana', color: '#FF9800' },
        { nombre: '☀️ Tarde', color: '#2196F3' },
        { nombre: '🌙 Noche', color: '#3F51B5' }
    ],
    paleta: PALETA_COLORES
};

window.estadosGruposContraidos = window.estadosGruposContraidos || {};

/**
 * Carga segura: si faltan grupos los inicializa y guarda via storage.js
 */
function obtenerDatosHabitosSeguros() {
    let d = cargarDatos() || { habitos: [], registro_habitos: {} };
    
    if (!d.config_habitos || !d.config_habitos.grupos) {
        // ✅ Usa guardarConfigHabitos en lugar de localStorage directo
        guardarConfigHabitos(CONFIG_HABITOS_DEFAULT);
        d.config_habitos = CONFIG_HABITOS_DEFAULT;
    }
    return d;
}

window.inicializarHabitos = function() {
    console.log("🚀 Módulo de Hábitos activado.");
    obtenerDatosHabitosSeguros();
    renderizarCalendario();
    renderizarListaHabitos();
    
    const btnGuardar = document.getElementById('btn-guardar-habito-accion');
    if(btnGuardar) btnGuardar.onclick = window.guardarHabito;

    const btnB = document.getElementById('btn-borrar-final');
    if(btnB) btnB.onclick = () => { if(idHabitoParaBorrar) window.borrarHabito(idHabitoParaBorrar); };

    if(window.intervaloCronometros) clearInterval(window.intervaloCronometros);
    window.intervaloCronometros = setInterval(() => { window.actualizarCronometrosVivos(); }, 1000);
}

// --- GESTIÓN DE GRUPOS ---
window.abrirGestionGrupos = function() {
    renderizarGestionGrupos();
    const modal = document.getElementById('modal-grupos-gestion');
    if(modal) modal.style.display = 'flex';
}

window.cerrarGestionGrupos = function() {
    const modal = document.getElementById('modal-grupos-gestion');
    if(modal) modal.style.display = 'none';
    renderizarListaHabitos();
}

function renderizarGestionGrupos() {
    const d = obtenerDatosHabitosSeguros();
    const contenedor = document.getElementById('lista-gestion-grupos');
    const paletaDiv = document.getElementById('paleta-sugerida');
    
    if(paletaDiv) {
        paletaDiv.innerHTML = (d.config_habitos.paleta || PALETA_COLORES).map(c => `
            <div onclick="document.getElementById('nuevo-grupo-color').value='${c}'" 
                 style="background:${c}; width:28px; height:28px; border-radius:50%; cursor:pointer; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.1);"></div>
        `).join('');
    }

    if(contenedor) {
        contenedor.innerHTML = d.config_habitos.grupos.map((g, i) => `
            <div class="item-grupo-lista" style="border-left: 6px solid ${g.color};">
                <span style="font-weight:bold;">${g.nombre}</span>
                <div style="display:flex; gap:10px;">
                    <input type="color" value="${g.color}" onchange="window.actualizarColorGrupo(${i}, this.value)" class="color-mini-input">
                    <button onclick="window.eliminarGrupo(${i})" class="btn-borrar-txt">✕</button>
                </div>
            </div>
        `).join('');
    }
}

window.agregarGrupo = function() {
    const inputNombre = document.getElementById('nuevo-grupo-nombre');
    const inputColor = document.getElementById('nuevo-grupo-color');
    const n = inputNombre.value.trim();
    const c = inputColor.value;
    
    if(!n) return alert("Escribe un nombre para el grupo.");
    
    let d = obtenerDatosHabitosSeguros();
    d.config_habitos.grupos.push({ nombre: n, color: c });
    // ✅ storage.js — sin localStorage directo
    guardarConfigHabitos(d.config_habitos);
    
    inputNombre.value = '';
    renderizarGestionGrupos();
}

window.actualizarColorGrupo = function(idx, col) {
    let d = obtenerDatosHabitosSeguros();
    d.config_habitos.grupos[idx].color = col;
    // ✅ storage.js — sin localStorage directo
    guardarConfigHabitos(d.config_habitos);
    renderizarListaHabitos();
}

window.eliminarGrupo = function(idx) {
    let d = obtenerDatosHabitosSeguros();
    const nombreB = d.config_habitos.grupos[idx].nombre;
    if(confirm(`¿Borrar el grupo "${nombreB}"?`)) {
        d.config_habitos.grupos.splice(idx, 1);
        const primerG = d.config_habitos.grupos[0]?.nombre || "General";
        d.habitos = (d.habitos || []).map(h => { if(h.grupo === nombreB) h.grupo = primerG; return h; });
        // ✅ storage.js — sin localStorage directo (dos operaciones en una pasada)
        guardarConfigHabitos(d.config_habitos);
        guardarHabitosDefinicion(d.habitos);
        renderizarGestionGrupos();
    }
}

// --- CALENDARIO Y RENDERIZADO ---
function obtenerFechaComparar(s) { const p = s.split('/'); return new Date(p[2], p[1]-1, p[0]); }
window.moverCalendario = function(dir) { offsetDias += (dir*3); renderizarCalendario(); }

function renderizarCalendario() {
    const slider = document.getElementById('calendario-habitos');
    if(!slider) return;
    slider.innerHTML = '';
    const hoy = new Date();
    const dias = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'];

    for(let i = -3 + offsetDias; i <= 3 + offsetDias; i++) {
        const f = new Date(hoy); f.setDate(hoy.getDate() + i);
        const txt = f.toLocaleDateString('es-CO');
        const activo = txt === fechaSeleccionada;
        const circ = document.createElement('div');
        circ.className = `dia-circulo ${activo ? 'activo' : ''}`;
        
        const d = obtenerDatosHabitosSeguros();
        const reg = (d.registro_habitos && d.registro_habitos[txt]) || {};
        let t = 0, c = 0;
        const fCirc = new Date(f.getFullYear(), f.getMonth(), f.getDate());

        d.habitos.forEach(h => {
            const fCrea = h.fechaCreacion ? new Date(h.fechaCreacion + "T00:00:00") : new Date(2000,0,1);
            if(h.tipo === 'contador' && fCirc >= fCrea) {
                c++; t += Math.min(((reg[h.id] || 0) / h.meta) * 100, 100);
            }
        });
        circ.style.background = `conic-gradient(#1A73E8 ${c>0 ? t/c : 0}%, #e0e0e0 0)`;
        circ.innerHTML = `<div class="inner-circulo"><span class="dia-nombre">${dias[f.getDay()]}</span><span style="font-size:14px; color:#202124; font-weight:bold;">${f.getDate()}</span></div>`;
        circ.onclick = () => { fechaSeleccionada = txt; renderizarCalendario(); renderizarListaHabitos(); };
        slider.appendChild(circ);
    }
}

function renderizarListaHabitos() {
    const cont = document.getElementById('lista-habitos');
    if(!cont) return;
    const d = obtenerDatosHabitosSeguros();
    const reg = (d.registro_habitos && d.registro_habitos[fechaSeleccionada]) || {};
    const fVista = obtenerFechaComparar(fechaSeleccionada);
    const filtrados = d.habitos.filter(h => {
        const fc = h.fechaCreacion ? new Date(h.fechaCreacion + "T00:00:00") : new Date(2000,0,1);
        return fc <= fVista;
    });

    if(filtrados.length === 0) {
        cont.innerHTML = `<div class="estado-vacio"><h3>🍃 Nada hoy</h3><p>Pulsa + para crear un hábito.</p></div>`;
        return;
    }

    cont.innerHTML = '';
    const gruposMap = {};
    filtrados.forEach(h => {
        const conf = d.config_habitos.grupos.find(g => g.nombre === h.grupo) || { color: '#202124' };
        if(!gruposMap[h.grupo]) gruposMap[h.grupo] = { color: conf.color, habitos: [] };
        gruposMap[h.grupo].habitos.push(h);
    });

    for (const [nombre, data] of Object.entries(gruposMap)) {
        let t = 0, c = 0;
        data.habitos.forEach(h => { if(h.tipo === 'contador'){ c++; t += Math.min(((reg[h.id] || 0) / h.meta) * 100, 100); }});
        const cerrado = window.estadosGruposContraidos[nombre];
        let html = `<div class="habito-grupo-container" style="border-top-color:${data.color}"><div class="habito-grupo-header" onclick="window.toggleGrupo('${nombre}')"><h3 style="color:${data.color}">${nombre}</h3><div style="display:flex; align-items:center; gap:10px;"><div class="grupo-progreso-mini" style="background:conic-gradient(${data.color} ${c>0?Math.round(t/c):100}%, #eee 0)"></div><span class="flecha-grupo ${cerrado?'contraido' : ''}">▲</span></div></div><div class="habitos-grupo-contenido ${cerrado?'oculto':''}">`;
        data.habitos.forEach(h => {
            const val = reg[h.id] || 0;
            const comp = h.tipo === 'contador' && val >= h.meta;
            html += `<div class="habito-card ${comp?'completado':''}" style="border-left-color:${h.color}" onclick="window.abrirAccion(${h.id})"><div class="habito-info"><div class="habito-icono-bg" style="color:${h.color}; background:${h.color}15;">${h.icono}</div><div><h4>${h.nombre}</h4><p>${h.tipo==='cronometro'?(h.fechaInicio?'Activo':'Pausado'):val+' / '+h.meta}</p></div></div><div>${h.tipo==='cronometro'?(h.fechaInicio?`<span class="habito-cronometro" id="cron-${h.id}" data-inicio="${h.fechaInicio}"></span>`:`<button class="btn-iniciar-redondo" onclick="window.iniciarCronometro(${h.id})">▶</button>`):`<button class="btn-sumar-habito" style="color:${h.color}">${comp?'✓':'+'}</button>`}</div></div>`;
        });
        cont.innerHTML += html + `</div></div>`;
    }
}

// --- MODALES ---
window.abrirModalHabitoNueva = function() { window.abrirModalHabitoUI(null); }

window.abrirModalHabitoUI = function(id = null) {
    const modal = document.getElementById('modal-habito-principal');
    if(!modal) return;
    
    modal.style.display = 'flex';
    const d = obtenerDatosHabitosSeguros();
    const sel = document.getElementById('habito-grupo-select');
    sel.innerHTML = d.config_habitos.grupos.map(g => `<option value="${g.nombre}">${g.nombre}</option>`).join('');

    if(id) {
        const h = d.habitos.find(x => x.id == id);
        document.getElementById('modal-titulo').innerText = "Editar Hábito";
        document.getElementById('habito-id-edit').value = h.id;
        document.getElementById('habito-nombre').value = h.nombre;
        document.getElementById('habito-icono').value = h.icono;
        document.getElementById('habito-color').value = h.color;
        document.getElementById('habito-grupo-select').value = h.grupo;
        document.getElementById('habito-tipo').value = h.tipo;
        document.getElementById('habito-meta').value = h.meta;
    } else {
        document.getElementById('modal-titulo').innerText = "Nuevo Hábito";
        document.getElementById('habito-id-edit').value = '';
        document.getElementById('habito-nombre').value = '';
    }
    window.alternarCamposTipo();
}

window.guardarHabito = function() {
    const id = document.getElementById('habito-id-edit').value;
    const obj = {
        id: id ? parseInt(id) : Date.now(),
        nombre: document.getElementById('habito-nombre').value,
        icono: document.getElementById('habito-icono').value,
        color: document.getElementById('habito-color').value,
        grupo: document.getElementById('habito-grupo-select').value,
        tipo: document.getElementById('habito-tipo').value,
        meta: parseFloat(document.getElementById('habito-meta').value) || 1,
        paso: parseFloat(document.getElementById('habito-paso').value) || 1,
        fechaCreacion: id ? null : new Date().toISOString().split('T')[0]
    };
    if(!obj.nombre) return alert("Escribe un nombre.");
    let d = obtenerDatosHabitosSeguros();
    if(id) {
        const old = d.habitos.find(x => x.id == id);
        obj.fechaCreacion = old.fechaCreacion;
        obj.fechaInicio = old.fechaInicio;
        d.habitos = d.habitos.map(x => x.id == id ? obj : x);
    } else {
        if(obj.tipo === 'cronometro') obj.fechaInicio = null;
        d.habitos.push(obj);
    }
    guardarHabitosDefinicion(d.habitos);
    window.cerrarModalHabito();
    renderizarListaHabitos();
    renderizarCalendario();
}

// --- CRONÓMETROS ---
window.reiniciarCronometroConfirmado = function() {
    if(!habitoAccionActual) return;
    const seguro = confirm(`⚠️ ¿Estás seguro de reiniciar la racha de "${habitoAccionActual.nombre}"? Esto pondrá el tiempo a cero.`);
    if (seguro) {
        window.iniciarCronometro(habitoAccionActual.id);
        window.cerrarModalAccion();
    }
}

window.actualizarCronometrosVivos = () => {
    document.querySelectorAll('.habito-cronometro').forEach(r => {
        const ini = r.getAttribute('data-inicio');
        if(ini && ini !== "null") {
            const t = window.calcularTiempoLimpio(ini);
            r.innerText = t;
            if(habitoAccionActual && `cron-${habitoAccionActual.id}` === r.id) {
                const mod = document.getElementById('cronometro-modal-display');
                if(mod) mod.innerText = t;
            }
        }
    });
}

window.calcularTiempoLimpio = (iso) => {
    const dif = Math.max(0, new Date().getTime() - new Date(iso).getTime());
    const d = Math.floor(dif / 86400000);
    const h = Math.floor((dif % 86400000) / 3600000);
    const m = Math.floor((dif % 3600000) / 60000);
    const s = Math.floor((dif % 60000) / 1000);
    return `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

window.iniciarCronometro = (id) => {
    let d = obtenerDatosHabitosSeguros();
    d.habitos = d.habitos.map(h => { if(h.id == id) h.fechaInicio = new Date().toISOString(); return h; });
    guardarHabitosDefinicion(d.habitos);
    renderizarListaHabitos();
}

// --- UI ACCIÓN ---
window.abrirAccion = (id) => {
    habitoAccionActual = obtenerDatosHabitosSeguros().habitos.find(x => x.id == id);
    window.actualizarVistaModalAccion();
    const modal = document.getElementById('modal-accion-habito-ui');
    if(modal) modal.style.display = 'flex';
}

window.actualizarVistaModalAccion = () => {
    const h = habitoAccionActual;
    if(!h) return;
    document.getElementById('accion-titulo').innerText = h.nombre;
    const cont = document.getElementById('ui-contador-hab');
    const cron = document.getElementById('ui-cronometro-hab');
    if(h.tipo === 'cronometro') {
        cont.style.display = 'none'; cron.style.display = 'block';
    } else {
        cont.style.display = 'block'; cron.style.display = 'none';
        const d = obtenerDatosHabitosSeguros();
        const reg = d.registro_habitos && d.registro_habitos[fechaSeleccionada];
        const val = (reg && reg[h.id]) || 0;
        document.getElementById('accion-subtitulo').innerText = `${val} / ${h.meta}`;
        const iconoDiv = document.getElementById('accion-icono-display');
        iconoDiv.innerText = h.icono;
        iconoDiv.style.fontSize = "40px";
        document.getElementById('accion-circulo').style.background = `conic-gradient(${h.color} ${(val/h.meta)*100}%, #eee 0)`;
    }
}

window.modificarProgreso = (dir, full = false) => {
    const h = habitoAccionActual;
    const d = obtenerDatosHabitosSeguros();
    if(!d.registro_habitos[fechaSeleccionada]) d.registro_habitos[fechaSeleccionada] = {};
    let val = d.registro_habitos[fechaSeleccionada][h.id] || 0;
    val = full ? h.meta : Math.max(0, val + (h.paso * dir));
    guardarProgresoHabito(fechaSeleccionada, h.id, val);
    window.actualizarVistaModalAccion();
    renderizarListaHabitos();
    renderizarCalendario();
}

// --- CIERRES Y UTILIDADES ---
window.alternarCamposTipo = () => {
    const s = document.getElementById('seccion-metas');
    const tipo = document.getElementById('habito-tipo').value;
    if(s) s.style.display = (tipo === 'cronometro') ? 'none' : 'block';
}
window.cerrarModalHabito = () => document.getElementById('modal-habito-principal').style.display = 'none';
window.cerrarModalAccion = () => { document.getElementById('modal-accion-habito-ui').style.display = 'none'; if(document.getElementById('dropdown-accion')) document.getElementById('dropdown-accion').style.display = 'none'; }
window.toggleOpcionesAccion = () => { const dr = document.getElementById('dropdown-accion'); if(dr) dr.style.display = dr.style.display==='block'?'none':'block'; }
window.borrarHabito = (id) => { let d = obtenerDatosHabitosSeguros(); d.habitos = d.habitos.filter(x => x.id != id); guardarHabitosDefinicion(d.habitos); document.getElementById('modal-confirmar-habito-borrar').style.display = 'none'; renderizarListaHabitos(); renderizarCalendario(); }
window.toggleGrupo = (n) => { window.estadosGruposContraidos[n] = !window.estadosGruposContraidos[n]; renderizarListaHabitos(); }
window.editarDesdeAccion = () => { window.abrirModalHabitoUI(habitoAccionActual.id); window.cerrarModalAccion(); }
window.borrarDesdeAccion = () => { idHabitoParaBorrar = habitoAccionActual.id; window.cerrarModalAccion(); document.getElementById('modal-confirmar-habito-borrar').style.display = 'flex'; }