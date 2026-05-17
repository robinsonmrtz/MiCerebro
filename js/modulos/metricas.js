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
    
    // Ordenar los datos cronológicamente (más antiguo a la izquierda, más nuevo a la derecha)
    const registrosOrdenados = [...registros].sort((a, b) => parsearFecha(a.fecha) - parsearFecha(b.fecha));
    
    // Mostrar la cantidad correcta según el filtro seleccionado
    const selectorFiltro = document.getElementById('filtro-tiempo');
    const filtro = selectorFiltro ? selectorFiltro.value : 'all';
    
    let datosParaGrafica = registrosOrdenados;
    if (filtro === 'all' || filtro === '7') {
        datosParaGrafica = registrosOrdenados.slice(-7); // Por defecto muestra los últimos 7 días
    } else if (filtro === '30') {
        datosParaGrafica = registrosOrdenados.slice(-30); // Muestra los últimos 30 días
    }
    
    graficoActual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datosParaGrafica.map(r => r.fecha),
            datasets: [
                { 
                    label: 'Horas Trabajadas', 
                    data: datosParaGrafica.map(r => (r.trabajado / 3600).toFixed(2)), 
                    borderColor: '#1A73E8', 
                    backgroundColor: 'rgba(26, 115, 232, 0.1)', 
                    fill: true, 
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Hora Inicio',
                    data: datosParaGrafica.map(r => {
                        if(!r.horaInicio) return null;
                        const [h, m] = r.horaInicio.split(':');
                        return parseFloat(h) + parseFloat(m)/60;
                    }),
                    borderColor: '#2ECC71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y2',
                    borderDash: [4, 4]
                }
                // ✅ Se eliminó el bloque de "Hora Fin" para mantener el gráfico más limpio
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
    
    // 1. Mantenemos el orden cronológico general para que las páginas se calculen bien
    const registrosOrdenados = [...registros].sort((a, b) => parsearFecha(a.fecha) - parsearFecha(b.fecha));
    
    const totalPaginas = Math.ceil(registrosOrdenados.length / registrosPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    const inicio = (paginaActual - 1) * registrosPorPagina;
    
    // ✅ CORRECCIÓN: Cortamos los 10 registros de la página y les aplicamos .reverse()
    // Esto hace que el más nuevo de la página actual aparezca arriba del todo.
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
            <td style="color: #1A73E8; font-weight: bold;">${tiempoTrabajadoBonito}</td>
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

    // Promedio histórico sin el último día (para comparar)
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

    // --- PROMEDIO SEMANAL (lunes a hoy de esta semana) ---
    const lunes = getLunesActual();
    const registrosSemana = todos.filter(r => {
        const f = parsearFecha(r.fecha);
        return f >= lunes;
    });

    let indicadorSemanal = { texto: '', color: '#888' };
    if (registrosSemana.length > 0) {
        const promedioSemanal = registrosSemana.reduce((s, r) => s + r.trabajado, 0) / registrosSemana.length;

        // Compara contra la semana sin el último día
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
        document.getElementById('kpi-mejor-dia').innerText = `${segundosAHorasMinutos(mejor.trabajado)} (${mejor.fecha})`;
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
                
                // ✅ Ajuste al cambiar filtro: Calcular la última página del nuevo grupo de datos
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

// ✅ Lógica estándar: Siguiente = avanzar página (fechas más recientes), Anterior = retroceder página (fechas más antiguas)
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

        // ✅ CORRECCIÓN: Al iniciar la app, calcular cuántas páginas hay en total y posicionarnos en la última (lo más reciente)
        const registrosFiltrados = obtenerRegistrosFiltrados();
        const totalPaginasAlInicio = Math.ceil(registrosFiltrados.length / registrosPorPagina) || 1;
        paginaActual = totalPaginasAlInicio; 

        actualizarGraficos();
}
