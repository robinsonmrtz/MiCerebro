// ==========================================
// MÓDULO DE MÉTRICAS: metricas.js
// ==========================================

let graficoActual = null;
let paginaActual = 1;
const registrosPorPagina = 10;
let idSeleccionadoParaBorrar = null;

function segundosAHorasMinutos(totalSegundos) {
    if (!totalSegundos || totalSegundos === 0) return "0m";
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function parsearFecha(fechaStr) {
    const partes = fechaStr.split('/');
    if(partes.length !== 3) return new Date(); 
    return new Date(partes[2], partes[1] - 1, partes[0]);
}

// Obtiene lunes de la semana actual
function getLunesActual() {
    const hoy = new Date();
    const dia = hoy.getDay(); // 0=dom, 1=lun...
    const diff = (dia === 0) ? -6 : 1 - dia;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diff);
    lunes.setHours(0,0,0,0);
    return lunes;
}

function obtenerRegistrosFiltrados() {
    const datos = cargarDatos();
    const registrosTotales = datos.registro_trabajo || [];
    const selectorFiltro = document.getElementById('filtro-tiempo');
    const filtro = selectorFiltro ? selectorFiltro.value : 'all';
    
    if (filtro === 'all') return registrosTotales;
    const fechaHoy = new Date();
    return registrosTotales.filter(reg => {
        const fechaReg = parsearFecha(reg.fecha);
        const diferenciaDias = (fechaHoy - fechaReg) / (1000 * 60 * 60 * 24);
        if (filtro === '7') return diferenciaDias <= 7;
        if (filtro === '30') return diferenciaDias <= 30;
        if (filtro === 'custom') {
            const inicio = document.getElementById('fecha-inicio') ? document.getElementById('fecha-inicio').value : null;
            const fin = document.getElementById('fecha-fin') ? document.getElementById('fecha-fin').value : null;
            if (inicio && fin) return fechaReg >= new Date(inicio) && fechaReg <= new Date(fin);
        }
        return true;
    });
}

window.actualizarGraficos = function() {
    const registrosFiltrados = obtenerRegistrosFiltrados();
    const tablaCuerpo = document.getElementById('tabla-cuerpo');
    if (!tablaCuerpo) return;

    if (registrosFiltrados.length === 0) {
        tablaCuerpo.innerHTML = '<tr><td colspan="6">No hay registros para este filtro.</td></tr>';
        if(graficoActual) graficoActual.destroy();
        return;
    }
    actualizarKPIs();
    renderizarTabla(registrosFiltrados);
    dibujarGrafica(registrosFiltrados);
}

function dibujarGrafica(registros) {
    const canvas = document.getElementById('graficoTrabajo');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(graficoActual) graficoActual.destroy();
    
    // ✅ LEEMOS LOS COLORES DIRECTAMENTE DESDE TU CSS
    const rootStyles = getComputedStyle(document.documentElement);
    const colorInicio = rootStyles.getPropertyValue('--accent-inicio').trim() || '#ffd000';
    const colorHoras = rootStyles.getPropertyValue('--accent-horas').trim() || '#4fed3a';

    // Generamos automáticamente el fondo difuminado a partir del color de tu línea
    let chartBgColor = 'rgba(124, 58, 237, 0.15)'; 
    if (colorHoras.startsWith('#') && colorHoras.length === 7) {
        chartBgColor = colorHoras + '26'; // Le añade un 15% de transparencia nativa en formato Hex
    }

    const registrosOrdenados = [...registros].sort((a, b) => parsearFecha(a.fecha) - parsearFecha(b.fecha));
    
    const selectorFiltro = document.getElementById('filtro-tiempo');
    const filtro = selectorFiltro ? selectorFiltro.value : 'all';
    
    let datosParaGrafica = registrosOrdenados;
    if (filtro === 'all' || filtro === '7') {
        datosParaGrafica = registrosOrdenados.slice(-7); 
    } else if (filtro === '30') {
        datosParaGrafica = registrosOrdenados.slice(-30); 
    }
    
    graficoActual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datosParaGrafica.map(r => r.fecha),
            datasets: [
                { 
                    label: 'Horas Trabajadas', 
                    data: datosParaGrafica.map(r => (r.trabajado / 3600).toFixed(2)), 
                    borderColor: colorHoras,                                             /* 🌟 Tu nuevo color maestro del CSS */
                    backgroundColor: chartBgColor,                                       /* 🌟 Fondo degradado automático */
                    fill: true, 
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Hora de Inicio',
                    data: datosParaGrafica.map(r => {
                        if (!r.horaInicio || r.horaInicio === '-') return null;
                        const partes = r.horaInicio.split(':');
                        return parseInt(partes[0], 10) + (parseInt(partes[1], 10) / 60);
                    }),
                    borderColor: colorInicio,                                             /* 🌟 Tu línea de hora de inicio */
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y2'
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                y: { 
                    beginAtZero: true,
                    position: 'left',
                    title: { display: true, text: 'Horas trabajadas' }
                },
                y2: {
                    beginAtZero: false,
                    position: 'right',
                    min: 0,
                    max: 24,
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Hora del día' },
                    ticks: {
                        callback: val => `${String(Math.floor(val)).padStart(2,'0')}:${String(Math.round((val%1)*60)).padStart(2,'0')}`
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Horas Trabajadas') {
                                const segundos = parseFloat(context.raw) * 3600;
                                return `Trabajado: ${segundosAHorasMinutos(segundos)}`;
                            }
                            if (context.raw === null) return null;
                            const h = Math.floor(context.raw);
                            const m = Math.round((context.raw % 1) * 60);
                            return `${context.dataset.label}: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                        }
                    }
                }
            }
        }
    });
}


function renderizarTabla(registros) {
    const tablaCuerpo = document.getElementById('tabla-cuerpo');
    const btnAnt = document.getElementById('btn-anterior');
    const btnSig = document.getElementById('btn-siguiente');
    
    const registrosOrdenados = [...registros].sort((a, b) => parsearFecha(a.fecha) - parsearFecha(b.fecha));
    
    const totalPaginas = Math.ceil(registrosOrdenados.length / registrosPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    const inicio = (paginaActual - 1) * registrosPorPagina;
    
    const visibles = registrosOrdenados.slice(inicio, inicio + registrosPorPagina).reverse();

    tablaCuerpo.innerHTML = '';
    visibles.forEach(reg => {
        const tiempoTrabajadoBonito = segundosAHorasMinutos(reg.trabajado);
        const hTrabajoDecimal = reg.trabajado / 3600;
        const cumplio = hTrabajoDecimal >= reg.meta;
        const inicio = reg.horaInicio || '-';
        const fin = reg.horaFin || '-';
        
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td style="font-weight: 600;">${reg.fecha}</td>
            <td>${reg.meta}h</td>
            <td style="color: var(--accent); font-weight: bold;">${tiempoTrabajadoBonito}</td>
            <td style="color: #5f6368;">${inicio} → ${fin}</td>
            <td>${cumplio ? '<span class="badge-exito">SÍ</span>' : '<span class="badge-fallo">NO</span>'}</td>
            <td><button class="btn-borrar" onclick="preguntarBorrar(${reg.id})">🗑️ Borrar</button></td>
        `;
        tablaCuerpo.appendChild(fila);
    });
    
    if(document.getElementById('info-paginacion')) 
        document.getElementById('info-paginacion').innerText = `Página ${paginaActual} de ${totalPaginas}`;

    if (btnAnt) {
        btnAnt.style.visibility = (paginaActual === 1) ? 'hidden' : 'visible';
    }
    if (btnSig) {
        btnSig.style.visibility = (paginaActual === totalPaginas) ? 'hidden' : 'visible';
    }
}

function calcularIndicador(actual, anterior) {
    if (!anterior || anterior === 0) return { texto: '', color: '#888' };
    const diff = ((actual - anterior) / anterior) * 100;
    if (Math.abs(diff) < 0.5) return { texto: '= Sin cambios', color: '#888' };
    if (diff > 0) return { texto: `↑ ${diff.toFixed(1)}%`, color: '#1e8e3e' };
    return { texto: `↓ ${Math.abs(diff).toFixed(1)}%`, color: '#d93025' };
}

function actualizarKPIs() {
    const datos = cargarDatos();
    const todos = datos.registro_trabajo || [];
    if (todos.length === 0) return;

    // --- PROMEDIO HISTÓRICO ---
    const totalSegsHistorico = todos.reduce((s, r) => s + r.trabajado, 0);
    const promedioHistorico = totalSegsHistorico / todos.length;

    let indicadorHistorico = { texto: '', color: '#888' };
    if (todos.length > 1) {
        const sinUltimo = todos.slice(0, -1);
        const promedioAnterior = sinUltimo.reduce((s, r) => s + r.trabajado, 0) / sinUltimo.length;
        indicadorHistorico = calcularIndicador(promedioHistorico, promedioAnterior);
    }

    if(document.getElementById('kpi-promedio-historico')) {
        document.getElementById('kpi-promedio-historico').innerHTML = `
            ${segundosAHorasMinutos(promedioHistorico)}
            ${indicadorHistorico.texto ? `<span style="display:block; font-size:12px; font-weight:500; color:${indicadorHistorico.color}; margin-top:4px;">${indicadorHistorico.texto}</span>` : ''}
        `;
    }

    // --- PROMEDIO SEMANAL ---
    const lunes = getLunesActual();
    const registrosSemana = todos.filter(r => {
        const f = parsearFecha(r.fecha);
        return f >= lunes;
    });

    let indicadorSemanal = { texto: '', color: '#888' };
    if (registrosSemana.length > 0) {
        const promedioSemanal = registrosSemana.reduce((s, r) => s + r.trabajado, 0) / registrosSemana.length;

        if (registrosSemana.length > 1) {
            const sinUltimoSemana = registrosSemana.slice(0, -1);
            const promedioSemanaAnterior = sinUltimoSemana.reduce((s, r) => s + r.trabajado, 0) / sinUltimoSemana.length;
            indicadorSemanal = calcularIndicador(promedioSemanal, promedioSemanaAnterior);
        }

        if(document.getElementById('kpi-promedio-semanal')) {
            document.getElementById('kpi-promedio-semanal').innerHTML = `
                ${segundosAHorasMinutos(promedioSemanal)}
                ${indicadorSemanal.texto ? `<span style="display:block; font-size:12px; font-weight:500; color:${indicadorSemanal.color}; margin-top:4px;">${indicadorSemanal.texto}</span>` : ''}
            `;
        }
    } else {
        if(document.getElementById('kpi-promedio-semanal')) 
            document.getElementById('kpi-promedio-semanal').innerText = '-';
    }

    // --- MEJOR DÍA ---
    if(document.getElementById('kpi-mejor-dia')) {
        const mejor = todos.reduce((max, r) => r.trabajado > max.trabajado ? r : max);
        document.getElementById('kpi-mejor-dia').innerHTML = `${segundosAHorasMinutos(mejor.trabajado)} <span class="fecha-mejor-dia">(${mejor.fecha})</span>`;
    }
}

window.preguntarBorrar = function(id) {
    idSeleccionadoParaBorrar = id;
    const modal = document.getElementById('modal-confirmar');
    if(modal) modal.style.display = 'flex';
}

window.inicializarMetricas = function() {
    const filtroSelect = document.getElementById('filtro-tiempo');
    const rangoFechas = document.getElementById('rango-fechas');
    const btnAplicarFiltro = document.getElementById('btn-aplicar-filtro');

    if (filtroSelect) {
        filtroSelect.onchange = (e) => {
            if (e.target.value === 'custom') {
                if(rangoFechas) rangoFechas.style.display = 'flex';
            } else {
                if(rangoFechas) rangoFechas.style.display = 'none';
                
                const nuevosRegs = obtenerRegistrosFiltrados();
                paginaActual = Math.ceil(nuevosRegs.length / registrosPorPagina) || 1;
                
                actualizarGraficos(); 
            }
        };
    }

    if (btnAplicarFiltro) {
        btnAplicarFiltro.onclick = () => { paginaActual = 1; actualizarGraficos(); };
    }

    const btnAnt = document.getElementById('btn-anterior');
    const btnSig = document.getElementById('btn-siguiente');
    const btnSi = document.getElementById('confirmar-si');
    const btnNo = document.getElementById('confirmar-no');

    if(btnSig) btnSig.onclick = () => { 
        const totalPaginas = Math.ceil(obtenerRegistrosFiltrados().length / registrosPorPagina);
        if (paginaActual < totalPaginas) { paginaActual++; actualizarGraficos(); } 
    };
    
    if(btnAnt) btnAnt.onclick = () => { 
        if (paginaActual > 1) { paginaActual--; actualizarGraficos(); } 
    };
    
    if(btnSi) btnSi.onclick = () => { 
        borrarRegistroTrabajo(idSeleccionadoParaBorrar); 
        if (typeof resetearAcumuladoTrabajo === 'function') resetearAcumuladoTrabajo();
        document.getElementById('modal-confirmar').style.display = 'none'; 
        actualizarGraficos(); 
    };
    
    if(btnNo) btnNo.onclick = () => { document.getElementById('modal-confirmar').style.display = 'none'; };

    const registrosFiltrados = obtenerRegistrosFiltrados();
    const totalPaginasAlInicio = Math.ceil(registrosFiltrados.length / registrosPorPagina) || 1;
    paginaActual = totalPaginasAlInicio; 

    actualizarGraficos();
}