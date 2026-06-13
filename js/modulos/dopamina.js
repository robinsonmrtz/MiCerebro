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

// --- CRUD DE ACCIONES (RESTABLECIDO) ---
window.abrirModalDopamina = function(id = null) {
    document.getElementById('modal-dopamina').style.display = 'flex';
    
    const d = cargarDatos();
    const paleta = (d.config_habitos && d.config_habitos.paleta) ? d.config_habitos.paleta : ['#e74c3c', '#3b82f6', '#10b981', '#f59e0b', '#8e44ad'];
    
    if (id) {
        // MODO EDICIÓN
        const acc = d.dopamina.acciones.find(a => a.id === id);
        document.getElementById('modal-titulo-dopamina').innerText = 'Editar Acción';
        document.getElementById('dopamina-id').value = acc.id;
        document.getElementById('dopamina-nombre').value = acc.nombre;
        document.getElementById('dopamina-icono').value = acc.icono;
        document.getElementById('dopamina-color').value = acc.color;
    } else {
        // MODO CREACIÓN
        document.getElementById('modal-titulo-dopamina').innerText = 'Nueva Acción';
        document.getElementById('dopamina-id').value = '';
        document.getElementById('dopamina-nombre').value = '';
        document.getElementById('dopamina-icono').value = '📱';
        document.getElementById('dopamina-color').value = paleta[0]; // Selecciona el primer color por defecto
    }
    
    const colorActual = document.getElementById('dopamina-color').value;
    
    // Renderiza la paleta marcando el color actual
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
        // ACTUALIZAR ACCIÓN EXISTENTE
        let index = d.dopamina.acciones.findIndex(a => a.id == idInput);
        if (index > -1) {
            d.dopamina.acciones[index].nombre = nombre;
            d.dopamina.acciones[index].icono = icono;
            d.dopamina.acciones[index].color = color;
        }
    } else {
        // CREAR NUEVA ACCIÓN
        d.dopamina.acciones.push({
            id: Date.now(),
            nombre,
            icono,
            color,
            fechaInicio: null, 
            recaidasTotales: 0,
            historialRecaidas: [] 
        });
    }

    guardarDatos(d);
    cerrarModalDopamina();
    inicializarDopamina();
};

// --- LOGICA DE TIEMPOS Y RÉCORDS PERSONALES ---
function calcularEstado(acc) {
    // Si no ha iniciado, está en ceros 
    if (!acc.fechaInicio) return { d: 0, h: 0, m: 0, s: 0, pct: 0, recordStr: '0d 0h 0m' };
    
    const inicio = new Date(acc.fechaInicio).getTime();
    const dif = Math.max(0, Date.now() - inicio);
    
    const d = Math.floor(dif / 86400000);
    const h = Math.floor((dif % 86400000) / 3600000);
    const m = Math.floor((dif % 3600000) / 60000);
    const s = Math.floor((dif % 60000) / 1000);
    
    // 1. Obtener el récord histórico preciso (si no existe, arranca en 0)
    let recordMs = acc.mejorRachaMs || 0;
    
    let isCurrentRecord = false;
    
    // Si la racha actual superó la histórica, o es la primera vez
    if (dif >= recordMs || recordMs === 0) {
        recordMs = dif;
        isCurrentRecord = true;
    }
    
    // Calcula el porcentaje hacia su récord
    let pct = 0;
    if (recordMs > 0) {
        pct = Math.min(100, Math.max(0, (dif / recordMs) * 100));
    }

    // FORMATEO CORRECTO: Mostrar días, horas y minutos SIEMPRE
    let recordStr = '';
    if (isCurrentRecord) {
        // Si está rompiendo récord en vivo
        recordStr = `${d}d ${h}h ${m}m`;
    } else {
        // Si es un récord anterior a superar, convierte los milisegundos exactos a d, h, m
        let recD = Math.floor(recordMs / 86400000);
        let recH = Math.floor((recordMs % 86400000) / 3600000);
        let recM = Math.floor((recordMs % 3600000) / 60000);
        recordStr = `${recD}d ${recH}h ${recM}m`; 
    }

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

        let botonHTML = '';
        if (!acc.fechaInicio) {
            botonHTML = `<button class="btn-iniciar-ayuno" style="background:${acc.color}" onclick="window.iniciarAyuno(${acc.id})">▶ Iniciar Acción</button>`;
        } else {
            botonHTML = `<button class="btn-recaida" onclick="window.registrarRecaida(${acc.id}, '${acc.nombre}')">⚠️ Recaída (Reiniciar)</button>`;
        }

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
        </div>
        `;
    }).join('');

    tickRelojesDopamina();
}

// =========================================
// LÓGICA PARA ABRIR/CERRAR EL MENÚ DE 3 PUNTOS
// (Pega esto justo debajo de la función de arriba)
// =========================================
window.toggleMenuDopamina = function(event, id) {
    event.stopPropagation(); // Evita que se cierre instantáneamente
    
    // Primero cerramos cualquier otro menú que esté abierto
    document.querySelectorAll('.dopamina-dropdown').forEach(menu => {
        if(menu.id !== `menu-dopamina-${id}`) menu.classList.remove('mostrar');
    });
    
    // Abrimos/Cerramos el que clickeamos
    const menu = document.getElementById(`menu-dopamina-${id}`);
    if (menu) menu.classList.toggle('mostrar');
};

// Listener global: Si haces clic en cualquier otro lado de la pantalla, cierra los menús
document.addEventListener('click', function() {
    document.querySelectorAll('.dopamina-dropdown.mostrar').forEach(menu => {
        menu.classList.remove('mostrar');
    });
});

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
        // BUG FIX: Calculamos la duración exacta de la racha ANTES de sobreescribirla
        const fin = Date.now();
        const inicioAnterior = acc.fechaInicio ? new Date(acc.fechaInicio).getTime() : fin;
        const duracionRachaPerdida = Math.max(0, fin - inicioAnterior);

        // Guardamos la racha como la 'mejorRachaMs' si superó el récord anterior
        if (!acc.mejorRachaMs || duracionRachaPerdida > acc.mejorRachaMs) {
            acc.mejorRachaMs = duracionRachaPerdida;
        }

        // Reiniciamos el contador a cero
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
    
    let rachaMaxGlobal = 0;
    let rachaActualMax = 0; 
    let rachaMaxMes = 0;    

    const anioVista = window.fechaVistaGraficaDopamina.getFullYear();
    const mesVista = window.fechaVistaGraficaDopamina.getMonth();
    const inicioMesMs = new Date(anioVista, mesVista, 1).getTime();
    const finMesMs = new Date(anioVista, mesVista + 1, 0, 23, 59, 59).getTime();

    acciones.forEach(acc => {
        let puntosGlobales = [new Date(acc.id).getTime()];
        acc.historialRecaidas.forEach(iso => puntosGlobales.push(new Date(iso).getTime()));
        if (acc.fechaInicio) puntosGlobales.push(Date.now());
        
        for (let i = 1; i < puntosGlobales.length; i++) {
            let diasDif = Math.floor((puntosGlobales[i] - puntosGlobales[i-1]) / 86400000);
            if (diasDif > rachaMaxGlobal) rachaMaxGlobal = diasDif;
        }

        if (filtro !== 'all' && filtro != acc.id) return;

        if (acc.fechaInicio) {
            const diasVivos = Math.floor((Date.now() - new Date(acc.fechaInicio).getTime()) / 86400000);
            if (diasVivos > rachaActualMax) rachaActualMax = diasVivos;
        }

        for (let i = 1; i < puntosGlobales.length; i++) {
            let t1 = puntosGlobales[i-1];
            let t2 = puntosGlobales[i];

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
    window.actualizarKPIsDopamina();
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
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
        labels.push(dia.toString());
    }

    const accionesAMostrar = filtro === 'all' ? acciones : acciones.filter(a => a.id == filtro);

    const datasetsGenerados = accionesAMostrar.map(acc => {
        const datosRecaidasAccion = [];
        
        for (let dia = 1; dia <= diasEnMes; dia++) {
            const fechaObjetivo = new Date(anio, mes, dia);
            const diaStr = fechaObjetivo.toLocaleDateString('es-CO');

            const recaidasEsteDia = acc.historialRecaidas.filter(iso => {
                return new Date(iso).toLocaleDateString('es-CO') === diaStr;
            }).length;
            
            datosRecaidasAccion.push(recaidasEsteDia);
        }

        return {
            label: `${acc.icono} ${acc.nombre}`,
            data: datosRecaidasAccion,
            borderColor: acc.color,
            backgroundColor: acc.color + '33', 
            fill: accionesAMostrar.length === 1, 
            tension: 0.3, 
            pointBackgroundColor: acc.color,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
        };
    });

    graficoDopaminaActual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasetsGenerados
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index', 
                intersect: false,
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 } 
                }
            },
            plugins: {
                legend: {
                    display: accionesAMostrar.length > 1, 
                    position: 'top',
                    labels: { color: 'var(--text-base)', font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: 'var(--bg-card)',
                    titleColor: 'var(--text-hi)',
                    bodyColor: 'var(--text-base)',
                    borderColor: 'var(--border-card)',
                    borderWidth: 1
                }
            }
        }
    });
}