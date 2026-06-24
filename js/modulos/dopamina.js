/* ============================================================
   MICEREBRO — dopamina.js
   Módulo de Control de Dopamina (Enfoque Profesional)
   ============================================================ */

let intervaloDopamina = null;
let graficoDopaminaActual = null;
let graficoDopaminaDiasActual = null; // Instancia del segundo gráfico
window.fechaVistaGraficaDopamina = new Date();

// --- INICIALIZACIÓN ---
window.inicializarDopamina = function() {
    asegurarDatosDopamina();
    renderizarAccionesDopamina();
    cargarOpcionesFiltro();
    window.actualizarKPIsDopamina();
    window.actualizarGraficaDopamina();

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

// --- CRUD DE ACCIONES ---
window.abrirModalDopamina = function(id = null) {
    document.getElementById('modal-dopamina').style.display = 'flex';
    
    const d = cargarDatos();
    const paleta = (d.config_habitos && d.config_habitos.paleta) ? d.config_habitos.paleta : ['#e74c3c', '#3b82f6', '#10b981', '#f59e0b', '#8e44ad'];
    
    if (id) {
        const acc = d.dopamina.acciones.find(a => a.id === id);
        document.getElementById('modal-titulo-dopamina').innerText = 'Editar Acción';
        document.getElementById('dopamina-id').value = acc.id;
        document.getElementById('dopamina-nombre').value = acc.nombre;
        document.getElementById('dopamina-icono').value = acc.icono;
        document.getElementById('dopamina-color').value = acc.color;
    } else {
        document.getElementById('modal-titulo-dopamina').innerText = 'Nueva Acción';
        document.getElementById('dopamina-id').value = '';
        document.getElementById('dopamina-nombre').value = '';
        document.getElementById('dopamina-icono').value = '📱';
        document.getElementById('dopamina-color').value = paleta[0];
    }
    
    const colorActual = document.getElementById('dopamina-color').value;
    const wrap = document.getElementById('paleta-dopamina');
    if (wrap) {
        wrap.innerHTML = paleta.map(c => `
            <div class="paleta-color-btn ${c === colorActual ? 'seleccionado' : ''}" style="background:${c};" 
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
    const idInput = document.getElementById('dopamina-id').value;
    const nombre = document.getElementById('dopamina-nombre').value.trim();
    const icono = document.getElementById('dopamina-icono').value.trim() || '📱';
    const color = document.getElementById('dopamina-color').value || '#e74c3c';

    if (!nombre) return alert('Escribe el nombre de la acción.');

    let d = cargarDatos();
    
    if (idInput) {
        let index = d.dopamina.acciones.findIndex(a => a.id == idInput);
        if (index > -1) {
            d.dopamina.acciones[index].nombre = nombre;
            d.dopamina.acciones[index].icono = icono;
            d.dopamina.acciones[index].color = color;
        }
    } else {
        d.dopamina.acciones.push({
            id: Date.now(),
            nombre,
            icono,
            color,
            fechaInicio: null, 
            recaidasTotales: 0,
            historialRecaidas: [],
            mejorRachaMs: 0
        });
    }

    guardarDatos(d);
    cerrarModalDopamina();
    inicializarDopamina();
};

function calcularEstado(acc) {
    if (!acc.fechaInicio) return { d: 0, h: 0, m: 0, s: 0, pct: 0, recordStr: '0d 0h 0m' };
    
    const inicio = new Date(acc.fechaInicio).getTime();
    const dif = Math.max(0, Date.now() - inicio);
    
    const d = Math.floor(dif / 86400000);
    const h = Math.floor((dif % 86400000) / 3600000);
    const m = Math.floor((dif % 3600000) / 60000);
    const s = Math.floor((dif % 60000) / 1000);
    
    let recordMs = acc.mejorRachaMs || 0;
    if (dif > recordMs) {
        recordMs = dif;
    }
    
    let pct = recordMs > 0 ? Math.min(100, Math.max(0, (dif / recordMs) * 100)) : 0;

    let recD = Math.floor(recordMs / 86400000);
    let recH = Math.floor((recordMs % 86400000) / 3600000);
    let recM = Math.floor((recordMs % 3600000) / 60000);
    let recordStr = `${recD}d ${recH}h ${recM}m`; 

    return { d, h, m, s, pct, recordStr };
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
        if (elRecord) elRecord.innerText = estado.recordStr;
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

    cont.innerHTML = acciones.map(acc => {
        const estado = calcularEstado(acc);
        let botonHTML = !acc.fechaInicio 
            ? `<button class="btn-iniciar-ayuno" style="background:${acc.color}" onclick="window.iniciarAyuno(${acc.id})">▶ Iniciar Acción</button>`
            : `<button class="btn-recaida" onclick="window.registrarRecaida(${acc.id}, '${acc.nombre}')">⚠️ Recaída (Reiniciar)</button>`;

        return `
        <div class="dopamina-card" style="--card-accent: ${acc.color}">
            <div class="dopamina-opciones">
                <button class="btn-opciones" onclick="window.toggleMenuDopamina(event, ${acc.id})">⋮</button>
                <div class="dopamina-dropdown" id="menu-dopamina-${acc.id}">
                    <button onclick="window.abrirModalDopamina(${acc.id})">Editar</button>
                    <button class="btn-danger-text" onclick="window.borrarAccionDopamina(${acc.id})">Eliminar</button>
                </div>
            </div>
            <div class="dopamina-card-header">
                <div class="dopamina-info-top">
                    <div class="dopamina-icono-bg" style="background:${acc.color}22; color:${acc.color};">
                        ${acc.icono}
                    </div>
                    <span class="dopamina-nombre" style="padding-right: 20px;">${acc.nombre}</span>
                </div>
            </div>
            <div class="dopamina-reloj" id="reloj-dop-${acc.id}">
                ${acc.fechaInicio ? '--d --h --m --s' : 'INACTIVO'}
            </div>
            <div class="dopamina-rango-wrap">
                <div class="dopamina-rango-labels">
                    <span>Progreso al récord personal</span>
                    <span id="record-dop-${acc.id}">${estado.recordStr || '0d 0h 0m'}</span>
                </div>
                <div class="dopamina-rango-track">
                    <div class="dopamina-rango-fill" id="barra-dop-${acc.id}" style="background:${acc.color}; width:${estado.pct}%;"></div>
                </div>
            </div>
            ${botonHTML}
        </div>`;
    }).join('');

    tickRelojesDopamina();
}

window.toggleMenuDopamina = function(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.dopamina-dropdown').forEach(menu => {
        if(menu.id !== `menu-dopamina-${id}`) menu.classList.remove('mostrar');
    });
    const menu = document.getElementById(`menu-dopamina-${id}`);
    if (menu) menu.classList.toggle('mostrar');
};

document.addEventListener('click', function() {
    document.querySelectorAll('.dopamina-dropdown.mostrar').forEach(menu => {
        menu.classList.remove('mostrar');
    });
});

window.iniciarAyuno = function(id) {
    let d = cargarDatos();
    let acc = d.dopamina.acciones.find(a => a.id === id);
    if (acc) {
        acc.fechaInicio = new Date().toISOString();
        guardarDatos(d);
        inicializarDopamina();
    }
};

window.registrarRecaida = function(id, nombre) {
    if (!confirm(`⚠️ Estás a punto de registrar una recaída en "${nombre}".\nTu contador volverá a CERO.\n\n¿Estás seguro?`)) return;

    let d = cargarDatos();
    let acc = d.dopamina.acciones.find(a => a.id === id);
    if (acc) {
        const fin = Date.now();
        const inicioAnterior = acc.fechaInicio ? new Date(acc.fechaInicio).getTime() : fin;
        const duracionRachaPerdida = Math.max(0, fin - inicioAnterior);

        if (!acc.mejorRachaMs || duracionRachaPerdida > acc.mejorRachaMs) {
            acc.mejorRachaMs = duracionRachaPerdida;
        }

        acc.fechaInicio = new Date().toISOString(); 
        acc.recaidasTotales += 1;
        acc.historialRecaidas.push(new Date().toISOString()); 
        
        guardarDatos(d);
        inicializarDopamina();
    }
};

window.borrarAccionDopamina = function(id) {
    if(!confirm('¿Borrar esta acción y todo su historial de recaídas?')) return;
    let d = cargarDatos();
    d.dopamina.acciones = d.dopamina.acciones.filter(a => a.id !== id);
    guardarDatos(d);
    inicializarDopamina();
};

// --- GRÁFICAS Y KPIS CORREGIDOS ---
window.actualizarKPIsDopamina = function() {
    const d = cargarDatos();
    const acciones = d.dopamina?.acciones || [];
    const filtro = document.getElementById('filtro-dopamina-grafica')?.value || 'all';
    
    let rachaMaxGlobal = 0;
    let rachaActualMax = 0; 
    let rachaMaxMes = 0;    

    const anioVista = window.fechaVistaGraficaDopamina.getFullYear();
    const mesVista = window.fechaVistaGraficaDopamina.getMonth();
    const inicioMesMs = new Date(anioVista, mesVista, 1).getTime();
    const finMesMs = new Date(anioVista, mesVista + 1, 0, 23, 59, 59, 999).getTime();

    acciones.forEach(acc => {
        if (filtro !== 'all' && filtro != acc.id) return;

        // --- 1. Racha Máxima Global (estricta) ---
        let currentStreakDays = 0;
        if (acc.fechaInicio) {
            currentStreakDays = Math.floor((Date.now() - new Date(acc.fechaInicio).getTime()) / 86400000);
        }
        // Se basa estrictamente en el récord real guardado o la racha actual viva
        let maxGlobalAccion = Math.max(Math.floor((acc.mejorRachaMs || 0) / 86400000), currentStreakDays);
        if (maxGlobalAccion > rachaMaxGlobal) rachaMaxGlobal = maxGlobalAccion;

        // --- 2. Días Limpio Actual ---
        if (currentStreakDays > rachaActualMax) rachaActualMax = currentStreakDays;

        // --- 3. Racha Máxima del Mes ---
        let maxMesAccion = 0;

        // A) Evaluar la racha actual (viva) dentro de la vista de este mes
        if (acc.fechaInicio) {
            let tInicio = new Date(acc.fechaInicio).getTime();
            let tFin = Date.now();
            if (tInicio <= finMesMs && tFin >= inicioMesMs) {
                let startInMonth = Math.max(tInicio, inicioMesMs);
                let endInMonth = Math.min(tFin, finMesMs);
                let diasEnMes = Math.floor((endInMonth - startInMonth) / 86400000);
                if (diasEnMes > maxMesAccion) maxMesAccion = diasEnMes;
            }
        }

        // B) Evaluar rachas pasadas (ya cerradas por recaídas)
        for (let i = 0; i < acc.historialRecaidas.length; i++) {
            let tFin = new Date(acc.historialRecaidas[i]).getTime();
            let tInicio;
            
            if (i === 0) {
                // Primer recaída: se asume inicio basado en su duración récord para no sumar tiempo inactivo
                tInicio = Math.max(acc.id, tFin - (acc.mejorRachaMs || 0));
            } else {
                tInicio = new Date(acc.historialRecaidas[i-1]).getTime();
            }

            if (tInicio <= finMesMs && tFin >= inicioMesMs) {
                let startInMonth = Math.max(tInicio, inicioMesMs);
                let endInMonth = Math.min(tFin, finMesMs);
                let diasEnMes = Math.floor((endInMonth - startInMonth) / 86400000);
                if (diasEnMes > maxMesAccion) maxMesAccion = diasEnMes;
            }
        }

        if (maxMesAccion > rachaMaxMes) rachaMaxMes = maxMesAccion;
    });

    document.getElementById('kpi-racha-maxima').innerText = rachaMaxGlobal + 'd';
    document.getElementById('kpi-racha-actual').innerText = rachaActualMax + 'd';
    document.getElementById('kpi-racha-mes').innerText = rachaMaxMes + 'd';
};

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
};

window.cambiarMesGraficaDopamina = function(delta) {
    window.fechaVistaGraficaDopamina.setMonth(window.fechaVistaGraficaDopamina.getMonth() + delta);
    window.actualizarGraficaDopamina();
    window.actualizarKPIsDopamina();
};

// --- RENDERIZADO DE LOS DOS GRÁFICOS PARALELOS ---
window.actualizarGraficaDopamina = function() {
    const canvasRecaidas = document.getElementById('graficoDopamina');
    const canvasDias = document.getElementById('graficoDopaminaDias');
    if(!canvasRecaidas || !canvasDias) return;

    const ctxRecaidas = canvasRecaidas.getContext('2d');
    const ctxDias = canvasDias.getContext('2d');

    if(graficoDopaminaActual) graficoDopaminaActual.destroy();
    if(graficoDopaminaDiasActual) graficoDopaminaDiasActual.destroy();

    const d = cargarDatos();
    const acciones = d.dopamina?.acciones || [];
    const filtro = document.getElementById('filtro-dopamina-grafica').value;

    const anio = window.fechaVistaGraficaDopamina.getFullYear();
    const mes = window.fechaVistaGraficaDopamina.getMonth();

    const labelMes = document.getElementById('label-mes-grafica');
    if (labelMes) {
        labelMes.innerText = window.fechaVistaGraficaDopamina.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
    }

    // Cortar el gráfico en el día actual si estamos viendo el mes en curso
    const esMesActual = (anio === new Date().getFullYear() && mes === new Date().getMonth());
    const diasTotalesMes = new Date(anio, mes + 1, 0).getDate();
    const diaLimite = esMesActual ? new Date().getDate() : diasTotalesMes;

    const labels = [];
    for (let dia = 1; dia <= diaLimite; dia++) {
        labels.push(dia.toString());
    }

    const accionesAMostrar = filtro === 'all' ? acciones : acciones.filter(a => a.id == filtro);
    const datasetsRecaidas = [];
    const datasetsDias = [];

    accionesAMostrar.forEach(acc => {
        const datosRecaidasAccion = [];
        const datosDiasLimpioAccion = [];
        
        for (let dia = 1; dia <= diaLimite; dia++) {
            const endOfDay = new Date(anio, mes, dia, 23, 59, 59, 999).getTime();
            const diaStr = new Date(anio, mes, dia).toLocaleDateString('es-CO');

            // 1. Contabilizar recaídas en el día actual
            const recaidasEsteDia = acc.historialRecaidas.filter(iso => {
                return new Date(iso).toLocaleDateString('es-CO') === diaStr;
            }).length;
            datosRecaidasAccion.push(recaidasEsteDia);

            // 2. Contabilizar Días Limpio
            if (recaidasEsteDia > 0) {
                datosDiasLimpioAccion.push(0); // Caída inmediata a cero si recayó
            } else {
                let evalTime = (dia === new Date().getDate() && esMesActual) ? Date.now() : endOfDay;
                datosDiasLimpioAccion.push(obtenerDiasLimpioEnPunto(acc, evalTime));
            }
        }

        // --- Lógica de Color: Gráfico de Recaídas ---
        const tieneRecaidasEnMes = datosRecaidasAccion.some(v => v > 0);
        const colorLineaRecaidas = tieneRecaidasEnMes ? '#e74c3c' : '#10b981';

        datasetsRecaidas.push({
            label: `${acc.icono} ${acc.nombre}`,
            data: datosRecaidasAccion,
            borderColor: colorLineaRecaidas,
            backgroundColor: colorLineaRecaidas + '22',
            fill: accionesAMostrar.length === 1,
            tension: 0.2,
            pointBackgroundColor: colorLineaRecaidas,
            borderWidth: 2,
            pointRadius: 3
        });

        // --- Lógica de Color: Gráfico Días Limpio (Basado en tu ÚLTIMO estado) ---
        const ultimoValorVisible = datosDiasLimpioAccion[datosDiasLimpioAccion.length - 1] || 0;
        let colorLineaDias = '#e74c3c'; // Si hoy estás en 0 -> ROJO

        if (ultimoValorVisible >= 1 && ultimoValorVisible <= 5) {
            colorLineaDias = '#f59e0b'; // 1 a 5 -> AMARILLO
        } else if (ultimoValorVisible > 5) {
            colorLineaDias = '#10b981'; // Más de 5 -> VERDE
        }

        datasetsDias.push({
            label: `${acc.icono} ${acc.nombre}`,
            data: datosDiasLimpioAccion,
            borderColor: colorLineaDias,
            backgroundColor: colorLineaDias + '22',
            fill: accionesAMostrar.length === 1,
            tension: 0.2,
            pointBackgroundColor: colorLineaDias,
            borderWidth: 2,
            pointRadius: 3
        });
    });

    graficoDopaminaActual = new Chart(ctxRecaidas, {
        type: 'line',
        data: { labels: labels, datasets: datasetsRecaidas },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: accionesAMostrar.length > 1, labels: { color: 'var(--text-base)' } } }
        }
    });

    graficoDopaminaDiasActual = new Chart(ctxDias, {
        type: 'line',
        data: { labels: labels, datasets: datasetsDias },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: accionesAMostrar.length > 1, labels: { color: 'var(--text-base)' } } }
        }
    });
};

function obtenerDiasLimpioEnPunto(acc, evalTime) {
    if (!acc.fechaInicio && acc.historialRecaidas.length === 0) return 0;
    
    let recaidasAnteriores = acc.historialRecaidas
        .map(iso => new Date(iso).getTime())
        .filter(t => t <= evalTime)
        .sort((a, b) => a - b);

    let inicioRacha;

    if (recaidasAnteriores.length > 0) {
        inicioRacha = recaidasAnteriores[recaidasAnteriores.length - 1];
    } else {
        if (acc.historialRecaidas.length === 0) {
            if (!acc.fechaInicio) return 0;
            inicioRacha = new Date(acc.fechaInicio).getTime();
        } else {
            let primerRecaida = new Date(acc.historialRecaidas[0]).getTime();
            inicioRacha = Math.max(acc.id, primerRecaida - (acc.mejorRachaMs || 0));
        }
    }

    if (evalTime < inicioRacha) return 0;
    
    // EL FIX: Math.round redondea de forma natural hacia el día más cercano. 
    // Si tu racha está en 8 días y 22 horas, el gráfico lo pinta en 9
    // mostrando tu pico correctamente antes de la recaída a cero.
    return Math.round((evalTime - inicioRacha) / 86400000);
}