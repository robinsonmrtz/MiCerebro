/* ============================================================
   MICEREBRO — dopamina.js
   Módulo de Control de Dopamina (Enfoque Profesional)
   ============================================================ */

let intervaloDopamina = null;
let graficoDopaminaActual = null;
window.fechaVistaGraficaDopamina = new Date();

// --- INICIALIZACIÓN ---
window.inicializarDopamina = function() {
    asegurarDatosDopamina();
    renderizarAccionesDopamina();
    cargarOpcionesFiltro();
    actualizarKPIsDopamina();
    actualizarGraficaDopamina();

    if (intervaloDopamina) clearInterval(intervaloDopamina);
    intervaloDopamina = setInterval(tickRelojesDopamina, 1000);
};

function asegurarDatosDopamina() {
    let d = cargarDatos();
    if (!d.dopamina) {
        d.dopamina = { acciones: [], predeterminado: 'all' };
        guardarDatos(d);
    }
}

// --- CRUD ---
window.abrirModalDopamina = function(id = null) {
    document.getElementById('modal-dopamina').style.display = 'flex';
    document.getElementById('modal-titulo-dopamina').innerText = 'Nueva Acción';
    document.getElementById('dopamina-id').value = '';
    document.getElementById('dopamina-nombre').value = '';
    document.getElementById('dopamina-icono').value = '📱';
    
    const d = cargarDatos();
    const paleta = (d.config_habitos && d.config_habitos.paleta) ? d.config_habitos.paleta : ['#e74c3c', '#3b82f6', '#10b981', '#f59e0b', '#8e44ad'];
    
    const wrap = document.getElementById('paleta-dopamina');
    if (wrap) {
        wrap.innerHTML = paleta.map(c => `
            <div class="paleta-color-btn" style="background:${c};" 
                 onclick="document.getElementById('dopamina-color').value = '${c}'; 
                          document.querySelectorAll('#paleta-dopamina .paleta-color-btn').forEach(el=>el.classList.remove('seleccionado')); 
                          this.classList.add('seleccionado');">
            </div>
        `).join('');
    }
};

window.cerrarModalDopamina = function() {
    document.getElementById('modal-dopamina').style.display = 'none';
};

window.guardarAccionDopamina = function() {
    const nombre = document.getElementById('dopamina-nombre').value.trim();
    const icono = document.getElementById('dopamina-icono').value.trim() || '📱';
    const color = document.getElementById('dopamina-color').value || '#e74c3c';

    if (!nombre) return alert('Escribe el nombre de la acción.');

    let d = cargarDatos();
    d.dopamina.acciones.push({
        id: Date.now(),
        nombre,
        icono,
        color,
        fechaInicio: null, 
        recaidasTotales: 0,
        historialRecaidas: [] 
    });

    guardarDatos(d);
    cerrarModalDopamina();
    inicializarDopamina();
};

// --- LOGICA DE TIEMPOS Y RÉCORDS PERSONALES ---
function calcularEstado(acc) {
    if (!acc.fechaInicio) return { d: 0, h: 0, m: 0, s: 0, pct: 0, record: 7 };
    
    const inicio = new Date(acc.fechaInicio).getTime();
    const dif = Math.max(0, Date.now() - inicio);
    
    const d = Math.floor(dif / 86400000);
    const h = Math.floor((dif % 86400000) / 3600000);
    const m = Math.floor((dif % 3600000) / 60000);
    const s = Math.floor((dif % 60000) / 1000);
    
    // Calcular el récord personal histórico para ESTA acción
    let record = 0;
    let tiempos = [new Date(acc.id).getTime()]; // Fecha de creación de la acción
    acc.historialRecaidas.forEach(iso => tiempos.push(new Date(iso).getTime()));
    
    for (let i = 1; i < tiempos.length; i++) {
        let diffDias = Math.floor((tiempos[i] - tiempos[i-1]) / 86400000);
        if (diffDias > record) record = diffDias;
    }
    
    // Si la racha actual es mayor al récord anterior, el récord se actualiza en vivo
    if (d > record) record = d;
    
    // Meta por defecto si aún no tiene un récord establecido
    if (record === 0) record = 7; 

    // Calcula el porcentaje hacia su récord
    let pct = Math.min(100, Math.max(0, (d / record) * 100));

    return { d, h, m, s, pct, record };
}

function tickRelojesDopamina() {
    const d = cargarDatos();
    if (!d.dopamina || !d.dopamina.acciones) return;

    d.dopamina.acciones.forEach(acc => {
        if (!acc.fechaInicio) return; 
        
        const estado = calcularEstado(acc);
        const elReloj = document.getElementById(`reloj-dop-${acc.id}`);
        const elBarra = document.getElementById(`barra-dop-${acc.id}`);
        const elRecord = document.getElementById(`record-dop-${acc.id}`);
        
        if (elReloj) {
            elReloj.innerHTML = `${String(estado.d).padStart(2,'0')}<span class="unidad">d</span> 
                                 ${String(estado.h).padStart(2,'0')}<span class="unidad">h</span> 
                                 ${String(estado.m).padStart(2,'0')}<span class="unidad">m</span> 
                                 ${String(estado.s).padStart(2,'0')}<span class="unidad">s</span>`;
        }
        if (elBarra) elBarra.style.width = `${estado.pct}%`;
        if (elRecord) elRecord.innerText = `${estado.record}d`;
    });
}

function renderizarAccionesDopamina() {
    const cont = document.getElementById('lista-acciones-dopamina');
    if (!cont) return;

    const d = cargarDatos();
    const acciones = d.dopamina.acciones || [];

    if (acciones.length === 0) {
        cont.innerHTML = `<div class="estado-vacio" style="grid-column: 1 / -1;"><h3>🍃 Sin Acciones</h3><p>Agrega tu primera acción para controlar.</p></div>`;
        return;
    }

    const hoyStr = new Date().toLocaleDateString('es-CO');

    cont.innerHTML = acciones.map(acc => {
        const estado = calcularEstado(acc);
        const recaidasHoy = acc.historialRecaidas.filter(iso => new Date(iso).toLocaleDateString('es-CO') === hoyStr).length;

        let botonHTML = '';
        if (!acc.fechaInicio) {
            botonHTML = `<button class="btn-iniciar-ayuno" style="background:${acc.color}" onclick="window.iniciarAyuno(${acc.id})">▶ Iniciar Acción</button>`;
        } else {
            botonHTML = `<button class="btn-recaida" onclick="window.registrarRecaida(${acc.id}, '${acc.nombre}')">⚠️ Recaída (Reiniciar)</button>`;
        }

        return `
        <div class="dopamina-card" style="--card-accent: ${acc.color}">
            <div class="dopamina-card-header">
                <div class="dopamina-info-top">
                    <div class="dopamina-icono-bg" style="background:${acc.color}22; color:${acc.color};">
                        ${acc.icono}
                    </div>
                    <span class="dopamina-nombre">${acc.nombre}</span>
                </div>
            </div>

            <div class="dopamina-reloj" id="reloj-dop-${acc.id}">
                ${acc.fechaInicio ? '--d --h --m --s' : 'INACTIVO'}
            </div>

            <div class="dopamina-rango-wrap">
                <div class="dopamina-rango-labels">
                    <span>Progreso al récord personal</span>
                    <span id="record-dop-${acc.id}">${estado.record}d</span>
                </div>
                <div class="dopamina-rango-track">
                    <div class="dopamina-rango-fill" id="barra-dop-${acc.id}" style="background:${acc.color}; width:${estado.pct}%;"></div>
                </div>
            </div>

            <div class="dopamina-stats">
                <div class="dopamina-stat-item">Recaídas hoy: <strong>${recaidasHoy}</strong></div>
                <div class="dopamina-stat-item">Histórico: <strong>${acc.recaidasTotales}</strong></div>
                <button class="btn-borrar" onclick="window.borrarAccionDopamina(${acc.id})" style="padding:0; font-size:14px;" title="Borrar Acción">🗑️</button>
            </div>

            ${botonHTML}
        </div>
        `;
    }).join('');

    tickRelojesDopamina();
}

// --- ACCIONES BINARIAS ---
window.iniciarAyuno = function(id) {
    let d = cargarDatos();
    let acc = d.dopamina.acciones.find(a => a.id === id);
    if (acc) {
        acc.fechaInicio = new Date().toISOString();
        guardarDatos(d);
        inicializarDopamina();
    }
}

window.registrarRecaida = function(id, nombre) {
    if (!confirm(`⚠️ Estás a punto de registrar una recaída en "${nombre}".\nTu contador volverá a CERO.\n\n¿Estás seguro?`)) return;

    let d = cargarDatos();
    let acc = d.dopamina.acciones.find(a => a.id === id);
    if (acc) {
        acc.fechaInicio = new Date().toISOString(); 
        acc.recaidasTotales += 1;
        acc.historialRecaidas.push(new Date().toISOString()); 
        guardarDatos(d);
        inicializarDopamina();
    }
}

window.borrarAccionDopamina = function(id) {
    if(!confirm('¿Borrar esta acción y todo su historial de recaídas?')) return;
    let d = cargarDatos();
    d.dopamina.acciones = d.dopamina.acciones.filter(a => a.id !== id);
    guardarDatos(d);
    inicializarDopamina();
}

// --- GRÁFICAS Y KPIS ---
window.actualizarKPIsDopamina = function() {
    const d = cargarDatos();
    const acciones = d.dopamina?.acciones || [];
    const filtro = document.getElementById('filtro-dopamina-grafica')?.value || 'all';
    
    let rachaMaxGlobal = 0; // Excepción: siempre global
    let rachaActualMax = 0; // Afectado por filtro
    let rachaMaxMes = 0;    // Afectado por filtro y mes en vista

    const anioVista = window.fechaVistaGraficaDopamina.getFullYear();
    const mesVista = window.fechaVistaGraficaDopamina.getMonth();
    const inicioMesMs = new Date(anioVista, mesVista, 1).getTime();
    const finMesMs = new Date(anioVista, mesVista + 1, 0, 23, 59, 59).getTime();

    acciones.forEach(acc => {
        // 1. CÁLCULO GLOBAL (Ignora el filtro)
        let puntosGlobales = [new Date(acc.id).getTime()];
        acc.historialRecaidas.forEach(iso => puntosGlobales.push(new Date(iso).getTime()));
        if (acc.fechaInicio) puntosGlobales.push(Date.now());
        
        for (let i = 1; i < puntosGlobales.length; i++) {
            let diasDif = Math.floor((puntosGlobales[i] - puntosGlobales[i-1]) / 86400000);
            if (diasDif > rachaMaxGlobal) rachaMaxGlobal = diasDif;
        }

        // 2. CÁLCULOS CON FILTRO (Si el filtro no coincide, saltamos la acción)
        if (filtro !== 'all' && filtro != acc.id) return;

        // Racha Limpio Actual
        if (acc.fechaInicio) {
            const diasVivos = Math.floor((Date.now() - new Date(acc.fechaInicio).getTime()) / 86400000);
            if (diasVivos > rachaActualMax) rachaActualMax = diasVivos;
        }

        // Racha Máxima del Mes en vista
        for (let i = 1; i < puntosGlobales.length; i++) {
            let t1 = puntosGlobales[i-1];
            let t2 = puntosGlobales[i];

            // Si la racha chocó o ocurrió dentro del mes que estamos mirando
            if (t1 <= finMesMs && t2 >= inicioMesMs) {
                let inicioRachaEnMes = Math.max(t1, inicioMesMs);
                let finRachaEnMes = Math.min(t2, finMesMs);
                let diasEnMes = Math.floor((finRachaEnMes - inicioRachaEnMes) / 86400000);
                if (diasEnMes > rachaMaxMes) rachaMaxMes = diasEnMes;
            }
        }
    });

    document.getElementById('kpi-racha-maxima').innerText = rachaMaxGlobal + 'd';
    document.getElementById('kpi-racha-actual').innerText = rachaActualMax + 'd';
    document.getElementById('kpi-racha-mes').innerText = rachaMaxMes + 'd';
}

function cargarOpcionesFiltro() {
    const d = cargarDatos();
    const sel = document.getElementById('filtro-dopamina-grafica');
    if (!sel || !d.dopamina) return;

    let predet = d.dopamina.predeterminado || 'all';
    
    sel.innerHTML = `<option value="all">Todas las acciones</option>` + 
        d.dopamina.acciones.map(a => `<option value="${a.id}">${a.icono} ${a.nombre}</option>`).join('');
    
    if (Array.from(sel.options).some(opt => opt.value == predet)) {
        sel.value = predet;
    } else {
        sel.value = 'all';
    }
}

window.fijarFiltroPredeterminado = function() {
    let d = cargarDatos();
    const sel = document.getElementById('filtro-dopamina-grafica');
    if(sel && d.dopamina) {
        d.dopamina.predeterminado = sel.value;
        guardarDatos(d);
        alert('📌 Filtro predeterminado guardado.');
    }
}

// --- GRÁFICA MES A MES ---
window.cambiarMesGraficaDopamina = function(delta) {
    window.fechaVistaGraficaDopamina.setMonth(window.fechaVistaGraficaDopamina.getMonth() + delta);
    window.actualizarGraficaDopamina();
    window.actualizarKPIsDopamina(); // Actualiza KPI Racha Máxima del Mes al cambiar de mes
};

window.actualizarGraficaDopamina = function() {
    const canvas = document.getElementById('graficoDopamina');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(graficoDopaminaActual) graficoDopaminaActual.destroy();

    const d = cargarDatos();
    const acciones = d.dopamina?.acciones || [];
    const filtro = document.getElementById('filtro-dopamina-grafica').value;

    const anio = window.fechaVistaGraficaDopamina.getFullYear();
    const mes = window.fechaVistaGraficaDopamina.getMonth();

    const labelMes = document.getElementById('label-mes-grafica');
    if (labelMes) {
        labelMes.innerText = window.fechaVistaGraficaDopamina.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
    }

    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    
    const labels = [];
    const datosRecaidas = [];

    for (let dia = 1; dia <= diasEnMes; dia++) {
        labels.push(dia.toString());
        
        let recaidasEsteDia = 0;
        const fechaObjetivo = new Date(anio, mes, dia);
        const diaStr = fechaObjetivo.toLocaleDateString('es-CO');

        acciones.forEach(acc => {
            if (filtro === 'all' || filtro == acc.id) {
                recaidasEsteDia += acc.historialRecaidas.filter(iso => {
                    return new Date(iso).toLocaleDateString('es-CO') === diaStr;
                }).length;
            }
        });
        
        datosRecaidas.push(recaidasEsteDia);
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const colorLinea = rootStyles.getPropertyValue('--clr-danger').trim() || '#e74c3c';

    // Gráfica de Líneas en lugar de Barras
    graficoDopaminaActual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Recaídas',
                data: datosRecaidas,
                borderColor: colorLinea,
                backgroundColor: colorLinea + '33', // Transparencia sutil bajo la línea
                fill: true,
                tension: 0.3, // Curvas suaves
                pointBackgroundColor: colorLinea,
                borderWidth: 2,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 } 
                }
            }
        }
    });
}