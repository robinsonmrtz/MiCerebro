// ====================================================
// CORE COMPONENT: inicio.js (Motor Mensual Acumulativo Profesional v5.0)
// FILTROS: Ejes Visuales Completos + Indicadores de Promedio en Color
// CORRECCIÓN HISTÓRICA: Balance de dinero amarrado al cierre exacto del mes consultado
// INTERACCIÓN DOPAMINA: Integración de rachas continuas por tarjeta
// ====================================================

let fz_fechaFiltroGlobal = new Date(); 
let fz_graficaSparklineInstancia = null;
let fz_graficaProductividadInstancia = null;
let fz_graficaVideosInstancia = null;
let fz_graficaDopaminaInstancia = null; // NUEVO GRÁFICO DOPAMINA

function inicializarDashboard() {
    console.log("🧠 Inicializando Dashboard Mensual Avanzado...");
    fz_renderizarSaludo();
    fz_cargarTipoCambio();
    fz_actualizarInterfazFiltro();
    
    fz_renderizarFinanzasDashboard();
    fz_renderizarProductividadDashboard();
    fz_renderizarVideosDashboard(); 
    fz_renderizarResumenClientesDashboard();
    fz_renderizarDopaminaDashboard(); // LLAMADA AL NUEVO GRÁFICO
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
    fz_renderizarVideosDashboard(); 
    fz_renderizarResumenClientesDashboard();
    fz_renderizarDopaminaDashboard(); // LLAMADA AL NAVEGAR
}

// ─── LÓGICA DEL NUEVO MÓDULO DOPAMINA EN DASHBOARD ───────────────
function fz_renderizarDopaminaDashboard() {
    const datos = cargarDatos();
    const acciones = datos.dopamina?.acciones || [];
    const select = document.getElementById('ini-dopamina-select');

    if (!select) return;

    // Llenar el select la primera vez si está vacío
    if (select.options.length === 0) {
        if (acciones.length === 0) {
            select.innerHTML = '<option value="">Sin acciones</option>';
        } else {
            select.innerHTML = acciones.map(a => `<option value="${a.id}">${a.icono} ${a.nombre}</option>`).join('');
        }
    }

    const idSeleccionado = select.value;
    const accion = acciones.find(a => a.id == idSeleccionado);

    const rachaElement = document.getElementById('ini-dopamina-racha');
    const promElement = document.getElementById('ini-dopamina-promedio');

    if (!accion || !accion.fechaInicio) {
        if (rachaElement) rachaElement.innerText = '0d';
        if (promElement) promElement.innerText = 'Promedio: 0.0d';
        fz_dibujarSparklineDopamina([], 0, 0);
        return;
    }

    const intervalos = fz_obtenerLimitesFechasMensuales();
    if (!intervalos) return;

    // 1. Calcular el Promedio Histórico Real
    let puntosReset = [];
    puntosReset.push(new Date(accion.fechaInicio).getTime());
    accion.historialRecaidas.forEach(r => puntosReset.push(new Date(r).getTime()));
    puntosReset.sort();

    let duraciones = [];
    for (let i = 1; i < puntosReset.length; i++) {
        duraciones.push(puntosReset[i] - puntosReset[i-1]);
    }
    let promMs = duraciones.length > 0 ? (duraciones.reduce((a,b)=>a+b,0) / duraciones.length) : 0;
    let promDias = promMs / 86400000;

    // 2. Extraer puntos para la gráfica diaria del mes
    let puntosGrafica = [];
    let cursor = new Date(intervalos.inicioAct);
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    let rachaActualMes = 0;

    while (cursor <= intervalos.finAct && cursor <= hoyMax) {
        let finDia = new Date(cursor);
        finDia.setHours(23, 59, 59, 999);
        let timeDia = finDia.getTime();

        // Buscar la última recaída que ocurrió ANTES del final de este día
        let lastR = -1;
        for (let i = 0; i < puntosReset.length; i++) {
            if (puntosReset[i] <= timeDia) lastR = puntosReset[i];
            else break;
        }

        let rachaDia = 0;
        if (lastR !== -1) {
            rachaDia = (timeDia - lastR) / 86400000; // Exacto en decimales
        }
        
        puntosGrafica.push(Math.round(rachaDia * 10) / 10);
        rachaActualMes = rachaDia; // Se queda con el último valor válido
        cursor.setDate(cursor.getDate() + 1);
    }

    // 3. Pintar en el DOM
    if (rachaElement) {
        rachaElement.innerText = Math.floor(rachaActualMes) + 'd';
    }
    if (promElement) {
        promElement.innerText = `Promedio: ${promDias.toFixed(1)}d`;
        
        // Logica de colores: Si supera o iguala el promedio histórico -> Verde Victoria
        if (rachaActualMes >= promDias && rachaActualMes > 0) {
            promElement.style.color = '#10b981'; 
        } else if (rachaActualMes < promDias) {
            promElement.style.color = '#ef4444'; 
        } else {
            promElement.style.color = 'var(--text-mutado, #999)';
        }
    }

    fz_dibujarSparklineDopamina(puntosGrafica, rachaActualMes, promDias);
}

function fz_dibujarSparklineDopamina(puntos, rachaActual, promDias) {
    const canvasElement = document.getElementById('ini-chart-dopamina');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (fz_graficaDopaminaInstancia) {
        try { fz_graficaDopaminaInstancia.destroy(); } catch(e) {}
    }

    let colorLinea = '#ef4444'; 
    let colorFondo = 'rgba(239, 68, 68, 0.20)';

    // La gráfica entera asume la victoria (verde) si cruzamos el promedio
    if ((rachaActual >= promDias && rachaActual > 0) || (promDias === 0 && rachaActual > 0)) {
        colorLinea = '#10b981'; 
        colorFondo = 'rgba(16, 185, 129, 0.20)';
    }

    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140);
    gradienteFondo.addColorStop(0, colorFondo);
    gradienteFondo.addColorStop(1, 'rgba(255, 255, 255, 0)');

    try {
        fz_graficaDopaminaInstancia = new Chart(ctx, {
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
                    tension: 0.15 // Pequeña tensión visual para que se vea el "diente de sierra" fluido
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
                        callbacks: { label: c => ` Día ${c.label}: ${c.parsed.y} días de racha` }
                    }
                },
                scales: {
                    x: { 
                        display: true,
                        grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false },
                        ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false }
                    },
                    y: {
                        display: true,
                        position: 'left',
                        min: 0,
                        suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) + 2 : 5,
                        grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false },
                        ticks: {
                            color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5,
                            callback: function(value) { return value.toFixed(0) + 'd'; }
                        }
                    }
                }
            }
        });
    } catch(e) {
        console.error("❌ Error al crear gráfica dopamina:", e);
    }
}

// ─── LÓGICA DE FINANZAS COMPROMETIDA CON EL CIERRE MENSUAL ─────────
function fz_renderizarFinanzasDashboard() {
    const datosCompletos = cargarDatos();
    const finanzas = datosCompletos.finanzas_personales;

    if (!finanzas || !finanzas.cuentas) return;

    const intervalos = fz_obtenerLimitesFechasMensuales();
    if (!intervalos) return; 

    const hoy = new Date();
    const esMesActualOSiguiente = (fz_fechaFiltroGlobal.getFullYear() > hoy.getFullYear()) || 
        (fz_fechaFiltroGlobal.getFullYear() === hoy.getFullYear() && fz_fechaFiltroGlobal.getMonth() >= hoy.getMonth());

    const cuentasActivas = finanzas.cuentas.filter(c => !c.archivada && c.incluir_dashboard !== false);
    const idsCuentasActivas = cuentasActivas.map(c => c.id);

    let saldoBaseCalculo = cuentasActivas.reduce((sum, c) => sum + parseFloat(c.saldo_inicial || 0), 0);

    const añoFiltro = intervalos.finAct.getFullYear();
    const mesFiltro = String(intervalos.finAct.getMonth() + 1).padStart(2, '0');
    const diaFiltro = String(intervalos.finAct.getDate()).padStart(2, '0');
    const fechaCierreMesStr = `${añoFiltro}-${mesFiltro}-${diaFiltro}`;

    const hoyStr = hoy.toISOString().split('T')[0];
    const fechaLimiteStr = esMesActualOSiguiente ? hoyStr : fechaCierreMesStr;

    const transaccionesValidas = (finanzas.transacciones || []).filter(t => 
        !t.archivada && 
        t.fecha <= fechaLimiteStr && 
        t.pagado !== false &&
        idsCuentasActivas.includes(t.cuenta_id) &&
        (t.tipo === 'ingreso' || t.tipo === 'gasto')
    );

    transaccionesValidas.forEach(t => {
        const monto = parseFloat(t.monto || 0);
        if (t.tipo === 'ingreso') saldoBaseCalculo += monto;
        if (t.tipo === 'gasto') saldoBaseCalculo -= monto;
    });

    const montoElement = document.getElementById('ini-finanzas-monto');
    if (montoElement) {
        montoElement.innerText = fz_formatearMonedaDashboard(saldoBaseCalculo);
    }

    const analitica = fz_procesarIntervaloFinancieroMensual(saldoBaseCalculo, transaccionesValidas, intervalos, fechaLimiteStr);

    const badge = document.getElementById('ini-finanzas-badge');
    if (badge) {
        badge.className = "ini-badge " + analitica.clase;
        const signo = analitica.delta >= 0 ? "+" : "";
        badge.innerText = `${signo}${fz_formatearMonedaDashboard(Math.abs(analitica.delta))} ${intervalos.leyenda}`;
    }

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

// ─── LÓGICA DE PRODUCTIVIDAD (HORAS) ─────────────────────────
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

    const diasTranscurridos = puntosGrafica.length;
    const totalHorasMes = totalSegsActual / 3600;
    const promedioDiarioHoras = diasTranscurridos > 0 ? (totalHorasMes / diasTranscurridos) : 0;

    const promedioEl = document.getElementById('ini-trabajo-promedio');
    if (promedioEl) {
        promedioEl.innerText = `Promedio Diario: ${promedioDiarioHoras.toFixed(1)}h/día`;
        promedioEl.style.color = promedioDiarioHoras > 0 ? 'var(--text-base, #111111)' : 'var(--text-mutado, #888)';
    }

    fz_dibujarSparklineProductividad(puntosGrafica, promedioDiarioHoras);
}

function fz_dibujarSparklineProductividad(puntos, promedioHoras) {
    const canvasElement = document.getElementById('ini-chart-productividad');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (fz_graficaProductividadInstancia) {
        try { fz_graficaProductividadInstancia.destroy(); } catch(e) {}
    }

    let colorLinea = '#ef4444'; 
    let colorFondo = 'rgba(239, 68, 68, 0.20)';

    if (promedioHoras >= 8) {
        colorLinea = '#10b981'; 
        colorFondo = 'rgba(16, 185, 129, 0.20)';
    } else if (promedioHoras >= 4) {
        colorLinea = '#f59e0b'; 
        colorFondo = 'rgba(245, 158, 11, 0.20)';
    }

    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140);
    gradienteFondo.addColorStop(0, colorFondo);
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
                        grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false },
                        ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false }
                    },
                    y: {
                        display: true,
                        position: 'left',
                        min: 0,
                        suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) * 1.12 : 8,
                        grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false },
                        ticks: {
                            color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5,
                            callback: function(value) { return value.toFixed(1) + 'h'; }
                        }
                    }
                }
            }
        });
    } catch(e) {
        console.error("❌ Error al crear gráfica productividad:", e);
    }
}

// ─── LÓGICA DE TRABAJOS ENTREGADOS ──────────────────────────────
function fz_renderizarVideosDashboard() {
    const datos = cargarDatos();
    const clientes = datos.clientes || [];
    const intervalos = fz_obtenerLimitesFechasMensuales();
    if (!intervalos) return;

    function enRango(fechaObj, inicio, fin) {
        if (!fechaObj || isNaN(fechaObj)) return false;
        const f = new Date(fechaObj);
        f.setHours(12, 0, 0, 0); 
        return f >= inicio && f <= fin;
    }

    let totalAct = 0;
    let totalAnt = 0;
    let mapaFechas = {};

    clientes.forEach(c => {
        (c.videos || []).forEach(v => {
            if (v.estado === 'listo') {
                const fStr = v.fecha_entrega || v.fecha_pago || v.fecha_recibido || (v.ultima_edicion ? v.ultima_edicion.split('T')[0] : null);
                if (fStr) {
                    const f = new Date(fStr + 'T00:00:00');
                    if (enRango(f, intervalos.inicioAct, intervalos.finAct)) {
                        totalAct++;
                        const key = f.toISOString().split('T')[0];
                        mapaFechas[key] = (mapaFechas[key] || 0) + 1;
                    } else if (enRango(f, intervalos.inicioAnt, intervalos.finAnt)) {
                        totalAnt++;
                    }
                }
            }
        });
    });

    const countElement = document.getElementById('ini-videos-count');
    if (countElement) countElement.innerText = totalAct;

    const delta = totalAct - totalAnt;
    let porcentaje = totalAnt > 0 ? Math.round((delta / totalAnt) * 100) : 0;
    let clase = "neutro";
    if (delta > 0) clase = "sube";
    if (delta < 0) clase = "baja";

    const badge = document.getElementById('ini-videos-badge');
    if (badge) {
        badge.className = "ini-badge " + clase;
        const signo = delta >= 0 ? "+" : "";
        badge.innerText = `${signo}${Math.abs(delta)} (${signo}${porcentaje}%) ${intervalos.leyenda}`;
    }

    let puntosGrafica = [];
    let cursor = new Date(intervalos.inicioAct);
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    while (cursor <= intervalos.finAct && cursor <= hoyMax) {
        const key = cursor.toISOString().split('T')[0];
        puntosGrafica.push(mapaFechas[key] || 0);
        cursor.setDate(cursor.getDate() + 1);
    }

    const diasTranscurridos = puntosGrafica.length;
    const promedioDiario = diasTranscurridos > 0 ? (totalAct / diasTranscurridos) : 0;

    const promedioEl = document.getElementById('ini-videos-promedio');
    if (promedioEl) {
        promedioEl.innerText = `Promedio Diario: ${promedioDiario.toFixed(2)}/día`;
        promedioEl.style.color = promedioDiario >= (totalAnt / 30 || 0) ? 'var(--text-base, #111111)' : 'var(--text-mutado, #888)';
    }

    fz_dibujarSparklineVideos(puntosGrafica, totalAct);
}

function fz_dibujarSparklineVideos(puntos, totalTrabajosMes) {
    const canvasElement = document.getElementById('ini-chart-videos');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (fz_graficaVideosInstancia) {
        try { fz_graficaVideosInstancia.destroy(); } catch(e) {}
    }

    let colorLinea = '#ef4444'; 
    let colorFondo = 'rgba(239, 68, 68, 0.20)';

    if (totalTrabajosMes >= 1) {
        colorLinea = '#10b981'; 
        colorFondo = 'rgba(16, 185, 129, 0.20)';
    }

    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140);
    gradienteFondo.addColorStop(0, colorFondo);
    gradienteFondo.addColorStop(1, 'rgba(255, 255, 255, 0)');

    try {
        fz_graficaVideosInstancia = new Chart(ctx, {
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
                        callbacks: { label: c => ` Día ${c.label}: ${c.parsed.y} trabajo(s)` }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false },
                        ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false }
                    },
                    y: {
                        display: true,
                        position: 'left',
                        min: 0,
                        suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) + 1 : 3,
                        grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false },
                        ticks: {
                            color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5,
                            callback: function(value) { if(value % 1 === 0) return value; } 
                        }
                    }
                }
            }
        });
    } catch(e) {
        console.error("❌ Error al crear gráfica videos:", e);
    }
}

// ─── LÓGICA DE PORTAFOLIO CLIENTES (BLOQUES DE COLOR NOTION) ─────────
function fz_renderizarResumenClientesDashboard() {
    const datos = cargarDatos();
    const clientes = datos.clientes || [];
    const intervalos = fz_obtenerLimitesFechasMensuales();
    if (!intervalos) return;

    function enRango(fechaStr, inicio, fin) {
        const f = fz_parsearFechaRegistro(fechaStr);
        if (!f) return false;
        f.setHours(12, 0, 0, 0);
        return f >= inicio && f <= fin;
    }

    let ingresosAct = 0;
    let ingresosAnt = 0;
    let trabajosPendientes = 0;
    let totalClientesActivos = 0;

    clientes.forEach(c => {
        let tieneActividadMes = false;

        (c.videos || []).forEach(v => {
            if (v.estado === 'sin_empezar' || v.estado === 'en_curso') {
                trabajosPendientes++;
            }

            if (v.estado === 'listo') {
                const cobrado = (v.finanzas?.inversion || 0) + (v.finanzas?.bono || 0);
                const fStr = v.fecha_entrega || v.fecha_pago || v.fecha_recibido || (v.ultima_edicion ? v.ultima_edicion.split('T')[0] : null);
                
                if (fStr) {
                    if (enRango(fStr, intervalos.inicioAct, intervalos.finAct)) {
                        ingresosAct += cobrado;
                        tieneActividadMes = true;
                    } else if (enRango(fStr, intervalos.inicioAnt, intervalos.finAnt)) {
                        ingresosAnt += cobrado;
                    }
                }
            }
        });

        (c.pagos || []).forEach(p => {
            if (p.fecha && enRango(p.fecha, intervalos.inicioAct, intervalos.finAct)) {
                tieneActividadMes = true;
            }
        });

        if (tieneActividadMes || (c.videos && c.videos.some(v => v.estado !== 'listo'))) {
            totalClientesActivos++;
        }
    });

    const elPend = document.getElementById('ini-resumen-pendientes');
    if (elPend) {
        elPend.innerText = trabajosPendientes;
        elPend.style.color = trabajosPendientes > 0 ? '#ef4444' : 'var(--text-base, #111)';
    }

    const elCli = document.getElementById('ini-resumen-clientes');
    if (elCli) elCli.innerText = totalClientesActivos;

    const elIng = document.getElementById('ini-resumen-ingresos');
    if (elIng) elIng.innerText = `$${ingresosAct.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const badgeCont = document.getElementById('ini-resumen-ingresos-badge');
    if (badgeCont) {
        const delta = ingresosAct - ingresosAnt;
        let porcentaje = ingresosAnt > 0 ? Math.round((delta / ingresosAnt) * 100) : 0;
        let clase = "neutro";
        if (delta > 0.01) clase = "sube";
        if (delta < -0.01) clase = "baja";

        badgeCont.className = "ini-badge " + clase;
        const signo = delta >= 0 ? "+" : "";
        badgeCont.innerText = `${signo}${porcentaje}% ${intervalos.leyenda}`;
    }
}

// ─── UTILIDADES (FECHAS Y SPARKLINE FINANZAS) ─────────────────────
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

function fz_procesarIntervaloFinancieroMensual(saldoActual, transacciones, intervalos, fechaLimiteStr) {
    const txOrdenadas = [...transacciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
    
    let saldoTemporal = saldoActual;
    let mapaSaldosDiarios = {};
    mapaSaldosDiarios[fechaLimiteStr] = saldoActual;

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
        if (fStr >= fechaLimiteStr) return saldoActual;
        
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
    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140);
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
                    grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false },
                    ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false }
                },
                y: { 
                    display: true, 
                    position: 'left',
                    min: Math.min(...puntos) < 0 ? undefined : 0, 
                    suggestedMax: Math.max(...puntos) * 1.08,
                    grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false },
                    ticks: {
                        color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5,
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