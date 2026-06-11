// ====================================================
// CORE COMPONENT: inicio.js (Motor Mensual Acumulativo Profesional v3.4)
// FILTROS: Ejes Visuales Completos + Indicadores de Promedio en Color
// ====================================================

let fz_fechaFiltroGlobal = new Date(); 
let fz_graficaSparklineInstancia = null;
let fz_graficaProductividadInstancia = null;

function inicializarDashboard() {
    console.log("🧠 Inicializando Dashboard Mensual Avanzado...");
    fz_renderizarSaludo();
    fz_cargarTipoCambio();
    fz_actualizarInterfazFiltro();
    
    fz_renderizarFinanzasDashboard();
    fz_renderizarProductividadDashboard();
    fz_renderizarPlaceholdersExtras();
}

function fz_renderizarSaludo() {
    const nombre = "Robinson"; 
    const hora = new Date().getHours();

    let saludo;
    if (hora >= 5 && hora < 12)       saludo = "☀️ Buenos días";
    else if (hora >= 12 && hora < 19) saludo = "🌤️ Buenas tardes";
    else                               saludo = "🌙 Buenas noches";

    const fechaStr = new Date().toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const saludoEl = document.getElementById('ini-saludo');
    const fechaEl  = document.getElementById('ini-fecha-hoy');

    if (saludoEl) saludoEl.innerText = `${saludo}, ${nombre}`;
    if (fechaEl)  fechaEl.innerText  = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
}

async function fz_cargarTipoCambio() {
    const el = document.getElementById('ini-dolar-pill');
    if (!el) return;
    try {
        const res  = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
        const data = await res.json();
        const cop  = data.usd.cop;
        el.innerText = `$1 USD = $${Math.round(cop).toLocaleString('es-CO')} COP`;
    } catch (e) {
        el.innerText = 'Sin conexión';
    }
}

function fz_actualizarInterfazFiltro() {
    const label = document.getElementById('ini-mes-filtro-label');
    if (label) {
        const opciones = { month: 'long', year: 'numeric' };
        label.innerText = fz_fechaFiltroGlobal.toLocaleDateString('es-ES', opciones);
    }
}

function fz_navegarMes(direccion) {
    fz_fechaFiltroGlobal.setMonth(fz_fechaFiltroGlobal.getMonth() + direccion);
    fz_actualizarInterfazFiltro();
    
    fz_renderizarFinanzasDashboard();
    fz_renderizarProductividadDashboard();
}

function fz_renderizarFinanzasDashboard() {
    const datosCompletos = cargarDatos();
    const finanzas = datosCompletos.finanzas_personales;

    if (!finanzas || !finanzas.cuentas) return;

    const cuentasActivas = finanzas.cuentas.filter(c => !c.archivada && c.incluir_dashboard !== false);
    const idsCuentasActivas = cuentasActivas.map(c => c.id);

    let saldoActualNeto = cuentasActivas.reduce((sum, c) => sum + parseFloat(c.saldo_inicial || 0), 0);
    const hoyStr = new Date().toISOString().split('T')[0];

    const transaccionesValidas = (finanzas.transacciones || []).filter(t => 
        !t.archivada && 
        t.fecha <= hoyStr && 
        t.pagado !== false &&
        idsCuentasActivas.includes(t.cuenta_id) &&
        (t.tipo === 'ingreso' || t.tipo === 'gasto')
    );

    transaccionesValidas.forEach(t => {
        const monto = parseFloat(t.monto || 0);
        if (t.tipo === 'ingreso') saldoActualNeto += monto;
        if (t.tipo === 'gasto') saldoActualNeto -= monto;
    });

    const montoElement = document.getElementById('ini-finanzas-monto');
    if (montoElement) montoElement.innerText = fz_formatearMonedaDashboard(saldoActualNeto);

    const intervalos = fz_obtenerLimitesFechasMensuales();
    if (!intervalos) return; 

    const analitica = fz_procesarIntervaloFinancieroMensual(saldoActualNeto, transaccionesValidas, intervalos);

    const badge = document.getElementById('ini-finanzas-badge');
    if (badge) {
        badge.className = "ini-badge " + analitica.clase;
        const signo = analitica.delta >= 0 ? "+" : "";
        badge.innerText = `${signo}${fz_formatearMonedaDashboard(Math.abs(analitica.delta))} ${intervalos.leyenda}`;
    }

    // 🚀 ASIGNACIÓN DE COLOR AL PROMEDIO HISTÓRICO (Verde si superas el promedio, Rojo si estás por debajo)
    const promedioEl = document.getElementById('ini-finanzas-promedio');
    if (promedioEl) {
        promedioEl.innerText = `Promedio Histórico: ${fz_formatearMonedaDashboard(analitica.promedioGeneralHistorico)}`;
        promedioEl.style.color = analitica.lineaVerde ? '#10b981' : '#ef4444';
    }

    fz_dibujarSparklineDashboard(analitica.puntosGrafica, analitica.lineaVerde);
}

function fz_parsearFechaRegistro(fechaStr) {
    if (!fechaStr) return null;
    if (fechaStr.includes('-')) return new Date(fechaStr + 'T00:00:00');
    const p = fechaStr.split('/');
    if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    return null;
}

// Reemplaza por completo estas dos funciones dentro de tu archivo inicio.js

function fz_renderizarProductividadDashboard() {
    const datos = cargarDatos();
    const registroTrabajo = datos.registro_trabajo || [];
    const intervalos = fz_obtenerLimitesFechasMensuales();
    if (!intervalos) return;

    function enRango(fechaStr, inicio, fin) {
        const f = fz_parsearFechaRegistro(fechaStr);
        if (!f) return false;
        f.setHours(12, 0, 0, 0);
        return f >= inicio && f <= fin;
    }

    const registrosActuales   = registroTrabajo.filter(r => enRango(r.fecha, intervalos.inicioAct, intervalos.finAct));
    const registrosAnteriores = registroTrabajo.filter(r => enRango(r.fecha, intervalos.inicioAnt, intervalos.finAnt));
    const totalSegsActual      = registrosActuales.reduce((sum, r) => sum + (r.trabajado || 0), 0);
    const totalSegsAnterior   = registrosAnteriores.reduce((sum, r) => sum + (r.trabajado || 0), 0);

    const horasElement = document.getElementById('ini-trabajo-horas');
    if (horasElement) horasElement.innerText = fz_formatearTiempoProductividad(totalSegsActual);

    const deltaSegs  = totalSegsActual - totalSegsAnterior;
    const deltaHoras = deltaSegs / 3600;
    let porcentaje   = totalSegsAnterior > 0 ? Math.round((deltaSegs / totalSegsAnterior) * 100) : 0;
    let clase = "neutro";
    if (deltaSegs >  60) clase = "sube";
    if (deltaSegs < -60) clase = "baja";

    const badge = document.getElementById('ini-trabajo-badge');
    if (badge) {
        badge.className = "ini-badge " + clase;
        const signo = deltaHoras >= 0 ? "+" : "";
        badge.innerText = `${signo}${fz_formatearTiempoProductividad(deltaSegs)} (${signo}${porcentaje}%) ${intervalos.leyenda}`;
    }

    const mapaFechas = {};
    registroTrabajo.forEach(r => {
        const f = fz_parsearFechaRegistro(r.fecha);
        if (!f) return;
        const key = f.toISOString().split('T')[0];
        mapaFechas[key] = (mapaFechas[key] || 0) + (r.trabajado || 0);
    });

    let puntosGrafica = [];
    let cursor = new Date(intervalos.inicioAct);
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    while (cursor <= intervalos.finAct && cursor <= hoyMax) {
        const key = cursor.toISOString().split('T')[0];
        puntosGrafica.push(Math.round(((mapaFechas[key] || 0) / 3600) * 100) / 100);
        cursor.setDate(cursor.getDate() + 1);
    }

    // 🚀 NUEVA LÓGICA: Cálculo del Promedio Diario Incluyendo los Días Cero
    const diasTranscurridos = puntosGrafica.length;
    const totalHorasMes = totalSegsActual / 3600;
    const promedioDiarioHoras = diasTranscurridos > 0 ? (totalHorasMes / diasTranscurridos) : 0;

    const promedioEl = document.getElementById('ini-trabajo-promedio');
    if (promedioEl) {
        promedioEl.innerText = `Promedio Diario: ${promedioDiarioHoras.toFixed(1)}h/día`;
        // Pintar en verde si el promedio actual supera o es igual al del periodo anterior completo (ej: 2.0 horas base)
        promedioEl.style.color = promedioDiarioHoras > 0 ? 'var(--text-base, #111111)' : 'var(--text-mutated, #888)';
    }

    fz_dibujarSparklineProductividad(puntosGrafica, clase !== "baja");
}

function fz_dibujarSparklineProductividad(puntos, esPositivo) {
    const canvasElement = document.getElementById('ini-chart-productividad');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (fz_graficaProductividadInstancia) {
        try { fz_graficaProductividadInstancia.destroy(); } catch(e) {}
    }

    const colorLinea = esPositivo ? '#f59e0b' : '#ef4444';
    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140); // Sincronizado a 140px de altura
    gradienteFondo.addColorStop(0, esPositivo ? 'rgba(245,158,11,0.20)' : 'rgba(239,68,68,0.20)');
    gradienteFondo.addColorStop(1, 'rgba(255, 255, 255, 0)');

    try {
        fz_graficaProductividadInstancia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: puntos.length}, (_, i) => i + 1), 
                datasets: [{
                    data: puntos,
                    borderColor: colorLinea,
                    borderWidth: 2.5,
                    pointRadius: 3, 
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: colorLinea,
                    pointBorderWidth: 1.5,
                    pointHoverRadius: 6,
                    fill: true,
                    backgroundColor: gradienteFondo,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: { label: c => ` Día ${c.label}: ${fz_formatearTiempoProductividad(c.parsed.y * 3600)}` }
                    }
                },
                scales: {
                    x: { 
                        display: true,
                        grid: { 
                            display: true, 
                            color: 'rgba(128, 128, 128, 0.12)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'var(--text-mutado, #999)',
                            font: { size: 9, weight: '600' },
                            maxTicksLimit: 31,
                            autoSkip: false 
                        }
                    },
                    y: {
                        display: true,
                        position: 'left',
                        min: 0, // No existen horas negativas
                        suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) * 1.12 : 8, // Escala proporcional o jornada base de 8h
                        grid: {
                            display: true,
                            color: 'rgba(128, 128, 128, 0.08)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'var(--text-mutado, #999)',
                            font: { size: 8, weight: '600' },
                            maxTicksLimit: 5,
                            callback: function(value) {
                                return value.toFixed(1) + 'h';
                            }
                        }
                    }
                }
            }
        });
    } catch(e) {
        console.error("❌ Error al crear gráfica productividad:", e);
    }
}

function fz_obtenerLimitesFechasMensuales() {
    const año = fz_fechaFiltroGlobal.getFullYear();
    const mes = fz_fechaFiltroGlobal.getMonth();
    
    const inicioAct = new Date(año, mes, 1);
    const finAct = new Date(año, mes + 1, 0, 23, 59, 59, 999);
    
    const inicioAnt = new Date(año, mes - 1, 1);
    const finAnt = new Date(año, mes, 0, 23, 59, 59, 999);
    
    const mesesNombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const leyenda = `vs ${mesesNombres[inicioAnt.getMonth()]}`;

    return { inicioAct, finAct, inicioAnt, finAnt, leyenda };
}

function fz_procesarIntervaloFinancieroMensual(saldoActual, transacciones, intervalos) {
    const txOrdenadas = [...transacciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
    
    const hoyStr = new Date().toISOString().split('T')[0];
    let saldoTemporal = saldoActual;
    let mapaSaldosDiarios = {};
    mapaSaldosDiarios[hoyStr] = saldoActual;

    txOrdenadas.forEach(t => {
        const fTx = t.fecha.split('T')[0];
        const monto = parseFloat(t.monto || t.cantidad || 0);
        if (t.tipo === 'ingreso') {
            saldoTemporal -= monto;
        } else if (t.tipo === 'gasto') {
            saldoTemporal += monto;
        }
        mapaSaldosDiarios[fTx] = saldoTemporal;
    });

    function obtenerSaldoEnFecha(fechaObj) {
        let fStr = fechaObj.toISOString().split('T')[0];
        if (fStr >= hoyStr) return saldoActual;
        
        let diasBusqueda = Object.keys(mapaSaldosDiarios).sort();
        let saldoEncontrado = saldoActual;
        
        for (let i = 0; i < diasBusqueda.length; i++) {
            if (diasBusqueda[i] > fStr) {
                saldoEncontrado = mapaSaldosDiarios[diasBusqueda[i]];
                break;
            }
        }
        return saldoEncontrado;
    }

    const saldoFinAct = obtenerSaldoEnFecha(intervalos.finAct);
    const saldoFinAnt = obtenerSaldoEnFecha(intervalos.finAnt);
    const delta = saldoFinAct - saldoFinAnt;

    let clase = "neutro";
    if (delta > 0.01) clase = "sube";
    if (delta < -0.01) clase = "baja";

    let totalMesesRegistrados = 0;
    let sumaSaldosMensuales = 0;
    
    if (txOrdenadas.length > 0) {
        const fechaMasViejaStr = txOrdenadas[txOrdenadas.length - 1].fecha.split('T')[0];
        let cursorMes = new Date(fechaMasViejaStr + 'T12:00:00');
        const finBucle = new Date();
        
        while (cursorMes.getFullYear() < finBucle.getFullYear() || 
               (cursorMes.getFullYear() === finBucle.getFullYear() && cursorMes.getMonth() <= finBucle.getMonth())) {
            
            const ultimoDiaDelMesCursor = new Date(cursorMes.getFullYear(), cursorMes.getMonth() + 1, 0, 23, 59, 59);
            sumaSaldosMensuales += obtenerSaldoEnFecha(ultimoDiaDelMesCursor);
            totalMesesRegistrados++;
            
            cursorMes.setMonth(cursorMes.getMonth() + 1);
        }
    }
    
    const promedioGeneralHistorico = totalMesesRegistrados > 0 ? (sumaSaldosMensuales / totalMesesRegistrados) : saldoActual;
    const lineaVerde = saldoFinAct >= promedioGeneralHistorico;

    let puntosGrafica = [];
    let cursor = new Date(intervalos.inicioAct);
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    while (cursor <= intervalos.finAct && cursor <= hoyMax) {
        puntosGrafica.push(Math.round(obtenerSaldoEnFecha(cursor) * 100) / 100);
        cursor.setDate(cursor.getDate() + 1);
    }

    return { delta, clase, puntosGrafica, lineaVerde, promedioGeneralHistorico };
}

function fz_dibujarSparklineDashboard(puntos, esPositivo) {
    const canvasElement = document.getElementById('ini-chart-finanzas');
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');

    if (fz_graficaSparklineInstancia) {
        fz_graficaSparklineInstancia.destroy();
    }

    const colorLinea = esPositivo ? '#10b981' : '#ef4444';
    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140); // Ajustado a la nueva altura de 140
    gradienteFondo.addColorStop(0, esPositivo ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239,68,68,0.25)');
    gradienteFondo.addColorStop(1, 'rgba(255, 255, 255, 0)');

    fz_graficaSparklineInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: puntos.length}, (_, i) => i + 1), 
            datasets: [{
                data: puntos,
                borderColor: colorLinea,
                borderWidth: 2.5,
                pointRadius: 3, 
                pointBackgroundColor: '#ffffff', 
                pointBorderColor: colorLinea,
                pointBorderWidth: 1.5,
                pointHoverRadius: 6,
                fill: true,
                backgroundColor: gradienteFondo,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    intersect: false,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return ' Día ' + context.label + ': ' + fz_formatearMonedaDashboard(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: { 
                    display: true,
                    grid: { 
                        display: true, 
                        color: 'rgba(128, 128, 128, 0.12)', 
                        drawBorder: false
                    },
                    ticks: {
                        color: 'var(--text-mutado, #999)',
                        font: { size: 9, weight: '600' },
                        maxTicksLimit: 31,
                        autoSkip: false
                    }
                },
                y: { 
                    display: true, 
                    position: 'left',
                    // 🚀 CORRECCIÓN CLAVE: Si no hay saldos negativos reales, el mínimo de la gráfica será $0
                    min: Math.min(...puntos) < 0 ? undefined : 0, 
                    suggestedMax: Math.max(...puntos) * 1.08, // Margen controlado del 8% arriba para que respire
                    grid: {
                        display: true,
                        color: 'rgba(128, 128, 128, 0.08)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'var(--text-mutado, #999)',
                        font: { size: 8, weight: '600' },
                        maxTicksLimit: 5, // Al tener más altura, subimos a 5 guías horizontales estéticas
                        callback: function(value) {
                            if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
                            if (value >= 1e3) return '$' + (value / 1e3).toFixed(0) + 'k';
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

function fz_formatearMonedaDashboard(valor) {
    const signo = valor < 0 ? '-' : '';
    return signo + '$' + Math.abs(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fz_formatearTiempoProductividad(segundos) {
    const h = Math.floor(Math.abs(segundos) / 3600);
    const m = Math.floor((Math.abs(segundos) % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fz_renderizarPlaceholdersExtras() {
    const datos = cargarDatos();
    if (datos.clientes) {
        const clientesEl = document.getElementById('ini-clientes-count');
        if (clientesEl) clientesEl.innerText = datos.clientes.filter(c => !c.archivado).length;
    }
    if (datos.habitos) {
        const habitosEl = document.getElementById('ini-habitos-porcentaje');
        if (habitosEl) habitosEl.innerText = `${datos.habitos.length} Activos`;
    }
}