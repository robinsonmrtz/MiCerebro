// ==========================================
// MÓDULO DE MÉTRICAS COMPLETO: metricas.js
// ESTADO: Versión Formato "5h 30m"
// ==========================================

let graficoActual = null;
let paginaActual = 1;
const registrosPorPagina = 10;
let idSeleccionadoParaBorrar = null;

// ==========================================
// NUEVA FUNCIÓN: Traductor de segundos a "5h 30m"
// ==========================================
function segundosAHorasMinutos(totalSegundos) {
    if (!totalSegundos || totalSegundos === 0) return "0m";
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}
// ==========================================

function parsearFecha(fechaStr) {
    const partes = fechaStr.split('/');
    if(partes.length !== 3) return new Date(); 
    return new Date(partes[2], partes[1] - 1, partes[0]);
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
    if (!tablaCuerpo) return; // Si la tabla no está en pantalla, no hacer nada

    if (registrosFiltrados.length === 0) {
        // Como quitamos una columna en el HTML (descanso), ajustamos el colspan a 5
        tablaCuerpo.innerHTML = '<tr><td colspan="5">No hay registros para este filtro.</td></tr>';
        if(graficoActual) graficoActual.destroy();
        return;
    }
    actualizarKPIs(registrosFiltrados);
    renderizarTabla(registrosFiltrados);
    dibujarGrafica(registrosFiltrados);
}

function dibujarGrafica(registros) {
    const canvas = document.getElementById('graficoTrabajo');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(graficoActual) graficoActual.destroy();
    const ultimos7 = registros.slice(-7);
    
    graficoActual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ultimos7.map(r => r.fecha),
            datasets: [
                { 
                    label: 'Horas Trabajadas', 
                    // Mantenemos decimales solo internamente para que la línea de la gráfica se dibuje bien
                    data: ultimos7.map(r => (r.trabajado / 3600).toFixed(2)), 
                    borderColor: '#1A73E8', 
                    backgroundColor: 'rgba(26, 115, 232, 0.1)', 
                    fill: true, 
                    tension: 0.4 
                },
                { 
                    label: 'Meta', 
                    data: ultimos7.map(r => r.meta), 
                    borderColor: '#2ECC71', 
                    borderDash: [5, 5], 
                    fill: false, 
                    tension: 0 
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { y: { beginAtZero: true } },
            plugins: {
                tooltip: {
                    callbacks: {
                        // Aquí transformamos lo que el usuario VEE al pasar el mouse por la gráfica
                        label: function(context) {
                            if (context.dataset.label === 'Meta') {
                                return `Meta: ${context.raw}h`;
                            }
                            // Convertimos los decimales de la gráfica de nuevo a segundos para usar nuestra función bonita
                            const segundos = parseFloat(context.raw) * 3600;
                            return `Trabajado: ${segundosAHorasMinutos(segundos)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderizarTabla(registros) {
    const tablaCuerpo = document.getElementById('tabla-cuerpo');
    const registrosOrdenados = [...registros].reverse();
    const totalPaginas = Math.ceil(registrosOrdenados.length / registrosPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const visibles = registrosOrdenados.slice(inicio, inicio + registrosPorPagina);

    tablaCuerpo.innerHTML = '';
    visibles.forEach(reg => {
        // Usamos la nueva función para mostrar "5h 30m" en lugar de decimales
        const tiempoTrabajadoBonito = segundosAHorasMinutos(reg.trabajado);
        
        // El cálculo lógico de la meta se mantiene igual
        const hTrabajoDecimal = reg.trabajado / 3600;
        const cumplio = hTrabajoDecimal >= reg.meta;
        
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td style="font-weight: 600;">${reg.fecha}</td>
            <td>${reg.meta}h</td>
            <td style="color: #1A73E8; font-weight: bold;">${tiempoTrabajadoBonito}</td>
            <td>${cumplio ? '<span class="badge-exito">SÍ</span>' : '<span class="badge-fallo">NO</span>'}</td>
            <td><button class="btn-borrar" onclick="preguntarBorrar(${reg.id})">🗑️ Borrar</button></td>
        `;
        tablaCuerpo.appendChild(fila);
    });
    if(document.getElementById('info-paginacion')) document.getElementById('info-paginacion').innerText = `Página ${paginaActual} de ${totalPaginas}`;
}

function actualizarKPIs(registros) {
    // 1. Promedio (Transformado a "xh ym")
    const totalSegundos = registros.reduce((sum, reg) => sum + reg.trabajado, 0);
    const promedioSegundos = registros.length > 0 ? (totalSegundos / registros.length) : 0;
    if(document.getElementById('kpi-promedio')) {
        document.getElementById('kpi-promedio').innerText = segundosAHorasMinutos(promedioSegundos);
    }
    
    // 2. Racha (Se mantiene igual)
    let racha = 0;
    for (let i = registros.length - 1; i >= 0; i--) {
        if ((registros[i].trabajado / 3600) >= registros[i].meta) racha++; else break;
    }
    if(document.getElementById('kpi-racha')) document.getElementById('kpi-racha').innerText = `${racha} días`;

    // 3. Mejor Día (Transformado a "xh ym")
    if(document.getElementById('kpi-mejor-dia')) {
        if (registros.length > 0) {
            let mejorRegistro = registros.reduce((max, obj) => (obj.trabajado > max.trabajado) ? obj : max);
            let tiempoRécordBonito = segundosAHorasMinutos(mejorRegistro.trabajado);
            document.getElementById('kpi-mejor-dia').innerText = `${tiempoRécordBonito} (${mejorRegistro.fecha})`;
        } else {
            document.getElementById('kpi-mejor-dia').innerText = "-";
        }
    }
}

window.preguntarBorrar = function(id) {
    idSeleccionadoParaBorrar = id;
    const modal = document.getElementById('modal-confirmar');
    if(modal) modal.style.display = 'flex';
}

// === FUNCIÓN QUE "CONECTA" TODO AL CARGAR LA PESTAÑA ===
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
                paginaActual = 1; actualizarGraficos(); 
            }
        };
    }

    // Activar botón del filtro personalizado
    if (btnAplicarFiltro) {
        btnAplicarFiltro.onclick = () => {
            paginaActual = 1; 
            actualizarGraficos(); 
        };
    }

    const btnAnt = document.getElementById('btn-anterior');
    const btnSig = document.getElementById('btn-siguiente');
    const btnSi = document.getElementById('confirmar-si');
    const btnNo = document.getElementById('confirmar-no');

    if(btnAnt) btnAnt.onclick = () => { if (paginaActual > 1) { paginaActual--; actualizarGraficos(); } };
    if(btnSig) btnSig.onclick = () => { const totalPaginas = Math.ceil(obtenerRegistrosFiltrados().length / registrosPorPagina); if (paginaActual < totalPaginas) { paginaActual++; actualizarGraficos(); } };
    
    // Al borrar, le avisamos al módulo de temporizador que borre también la memoria del día actual (si aplica)
    if(btnSi) btnSi.onclick = () => { 
        borrarRegistroTrabajo(idSeleccionadoParaBorrar); 
        if (typeof resetearAcumuladoTrabajo === 'function') resetearAcumuladoTrabajo(); // Nuevo comando inter-módulos
        document.getElementById('modal-confirmar').style.display = 'none'; 
        actualizarGraficos(); 
    };
    
    if(btnNo) btnNo.onclick = () => { document.getElementById('modal-confirmar').style.display = 'none'; };

    actualizarGraficos();
}