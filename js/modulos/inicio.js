// ====================================================
// CORE COMPONENT: inicio.js (Motor Dual Mes/Año v8.0 - Con Hábitos Diarios)
// FILTROS: Visualización Mensual Detallada o Resumen Anual Consolidado
// ====================================================

let fz_modoVista = 'mes'; 
let fz_fechaFiltroGlobal = new Date(); 
let fz_graficaSparklineInstancia = null;
let fz_graficaProductividadInstancia = null;
let fz_graficaHabitosInstancia = null; // NUEVO GRÁFICO HÁBITOS
let fz_graficaVideosInstancia = null;
let fz_graficaDopaminaInstancia = null; 
let fz_graficaClientesInstancia = null; 

function inicializarDashboard() {
    console.log("🧠 Inicializando Dashboard Avanzado...");
    fz_renderizarSaludo();
    fz_cargarTipoCambio();
    fz_actualizarInterfazFiltro();
    fz_renderizarAll();
}

function fz_renderizarAll() {
    fz_renderizarFinanzasDashboard();
    fz_renderizarProductividadDashboard();
    fz_renderizarHabitosDashboard(); // LLAMADA AL NUEVO DASHBOARD
    fz_renderizarVideosDashboard(); 
    fz_renderizarResumenClientesDashboard();
    fz_renderizarDopaminaDashboard(); 
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

function fz_setModoVista(modo) {
    fz_modoVista = modo;
    const btnMes = document.getElementById('btn-vista-mes');
    const btnAno = document.getElementById('btn-vista-ano');
    
    if (btnMes && btnAno) {
        btnMes.style.color = modo === 'mes' ? 'var(--text-base, #111)' : 'var(--text-mutado, #888)';
        btnMes.style.fontWeight = modo === 'mes' ? 'bold' : 'normal';
        
        btnAno.style.color = modo === 'ano' ? 'var(--text-base, #111)' : 'var(--text-mutado, #888)';
        btnAno.style.fontWeight = modo === 'ano' ? 'bold' : 'normal';
    }
    
    fz_actualizarInterfazFiltro();
    fz_renderizarAll();
}

function fz_actualizarInterfazFiltro() {
    const label = document.getElementById('ini-mes-filtro-label');
    if (label) {
        if (fz_modoVista === 'mes') {
            const opciones = { month: 'long', year: 'numeric' };
            label.innerText = fz_fechaFiltroGlobal.toLocaleDateString('es-ES', opciones);
        } else {
            label.innerText = fz_fechaFiltroGlobal.getFullYear().toString();
        }
    }
}

function fz_navegar(direccion) {
    if (fz_modoVista === 'mes') {
        fz_fechaFiltroGlobal.setMonth(fz_fechaFiltroGlobal.getMonth() + direccion);
    } else {
        fz_fechaFiltroGlobal.setFullYear(fz_fechaFiltroGlobal.getFullYear() + direccion);
    }
    fz_actualizarInterfazFiltro();
    fz_renderizarAll();
}

function fz_obtenerLimitesFechas() {
    const año = fz_fechaFiltroGlobal.getFullYear();
    if (fz_modoVista === 'mes') {
        const mes = fz_fechaFiltroGlobal.getMonth();
        const inicioAct = new Date(año, mes, 1);
        const finAct = new Date(año, mes + 1, 0, 23, 59, 59, 999);
        const inicioAnt = new Date(año, mes - 1, 1);
        const finAnt = new Date(año, mes, 0, 23, 59, 59, 999);
        const mesesNombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const leyenda = `vs ${mesesNombres[inicioAnt.getMonth()]}`;
        return { inicioAct, finAct, inicioAnt, finAnt, leyenda, tipo: 'mes' };
    } else {
        const inicioAct = new Date(año, 0, 1);
        const finAct = new Date(año, 11, 31, 23, 59, 59, 999);
        const inicioAnt = new Date(año - 1, 0, 1);
        const finAnt = new Date(año - 1, 11, 31, 23, 59, 59, 999);
        const leyenda = `vs ${año - 1}`;
        return { inicioAct, finAct, inicioAnt, finAnt, leyenda, tipo: 'ano' };
    }
}

// ─── LÓGICA DE HÁBITOS DIARIOS (NUEVO) ────────────────────────
function fz_pctDiaHabito(reg, fechaStr, habito) {
    if (habito.tipo === 'cronometro') {
        const partes = fechaStr.split('/');
        if(partes.length < 3) return 0;
        const fCheck = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
        let cuentaComoRacha = false;

        const validarRango = (inicioMs, finMs) => {
            const msEnDia = 86400000;
            const tiempoMinimoParaContar = inicioMs + msEnDia; 
            if (finMs < tiempoMinimoParaContar) return false;
            const fechaMinima = new Date(tiempoMinimoParaContar);
            fechaMinima.setHours(0, 0, 0, 0); 
            const fechaFin = new Date(finMs);
            fechaFin.setHours(23, 59, 59, 999);
            return (fCheck.getTime() >= fechaMinima.getTime() && fCheck.getTime() <= fechaFin.getTime());
        };

        if (habito.historial && habito.historial.length > 0) {
            for (let rec of habito.historial) {
                if (validarRango(new Date(rec.inicio).getTime(), new Date(rec.fin).getTime())) {
                    cuentaComoRacha = true; 
                    break;
                }
            }
        }
        if (!cuentaComoRacha && habito.fechaInicio) {
            if (validarRango(new Date(habito.fechaInicio).getTime(), Date.now())) {
                cuentaComoRacha = true;
            }
        }
        return cuentaComoRacha ? 1 : 0;
    }
    
    const r = reg[fechaStr];
    if (!r) return 0;
    return Math.min((r[habito.id] || 0) / habito.meta, 1);
}

function fz_renderizarHabitosDashboard() {
    const datos = cargarDatos();
    const habitosActivos = (datos.habitos || []).filter(h => !h.archivado);
    const reg = datos.registro_habitos || {};
    
    const intervalos = fz_obtenerLimitesFechas();
    if (!intervalos) return;

    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    function contarHabitosDia(f) {
        const fFmt = f.toLocaleDateString('es-CO');
        let completados = 0;
        habitosActivos.forEach(h => {
            if (fz_pctDiaHabito(reg, fFmt, h) >= 1) completados++;
        });
        return completados;
    }

    let totalAct = 0;
    let totalAnt = 0;
    let diasTranscurridosAct = 0;
    let diasTranscurridosAnt = 0;
    let puntosGrafica = [];
    let habitosHoy = 0; 

    // Histórico del periodo anterior
    let cursorAnt = new Date(intervalos.inicioAnt);
    while (cursorAnt <= intervalos.finAnt && cursorAnt <= hoy) {
        totalAnt += contarHabitosDia(cursorAnt);
        diasTranscurridosAnt++;
        cursorAnt.setDate(cursorAnt.getDate() + 1);
    }

    if (intervalos.tipo === 'mes') {
        let cursorAct = new Date(intervalos.inicioAct);
        while (cursorAct <= intervalos.finAct && cursorAct <= hoy) {
            let completadosDia = contarHabitosDia(cursorAct);
            totalAct += completadosDia;
            puntosGrafica.push(completadosDia);
            habitosHoy = completadosDia; 
            
            diasTranscurridosAct++;
            cursorAct.setDate(cursorAct.getDate() + 1);
        }
    } else {
        // En vista "Año", la línea muestra el promedio diario de hábitos de cada mes
        for (let m = 0; m < 12; m++) {
            if (intervalos.inicioAct.getFullYear() === hoy.getFullYear() && m > hoy.getMonth()) break;
            
            let totalMes = 0;
            let diasMes = 0;
            let inicioM = new Date(intervalos.inicioAct.getFullYear(), m, 1);
            let finM = new Date(intervalos.inicioAct.getFullYear(), m + 1, 0, 23, 59, 59, 999);
            
            for (let d = new Date(inicioM); d <= finM && d <= hoy; d.setDate(d.getDate()+1)) {
                let compDia = contarHabitosDia(d);
                totalMes += compDia;
                totalAct += compDia;
                diasTranscurridosAct++;
                diasMes++;
                habitosHoy = compDia; 
            }
            puntosGrafica.push(diasMes > 0 ? (totalMes / diasMes) : 0);
        }
    }

    const countElement = document.getElementById('ini-habitos-count');
    if (countElement) {
        countElement.innerText = habitosHoy;
        
        // Lógica Estricta de Colores
        if (habitosHoy > 5) {
            countElement.style.color = '#10b981'; // Verde (Excelente)
        } else if (habitosHoy <= 3) {
            countElement.style.color = '#ef4444'; // Rojo (Malo / Alerta)
        } else {
            countElement.style.color = '#f59e0b'; // Amarillo (4 o 5, Regular)
        }
    }

    const promedioAct = diasTranscurridosAct > 0 ? (totalAct / diasTranscurridosAct) : 0;
    const promedioAnt = diasTranscurridosAnt > 0 ? (totalAnt / diasTranscurridosAnt) : 0;

    const promedioEl = document.getElementById('ini-habitos-promedio');
    if (promedioEl) {
        promedioEl.innerText = `Promedio Diario: ${promedioAct.toFixed(1)}/día`;
        promedioEl.style.color = promedioAct >= promedioAnt ? 'var(--text-base, #111)' : 'var(--text-mutado, #888)';
    }

    const badge = document.getElementById('ini-habitos-badge');
    if (badge) {
        const delta = totalAct - totalAnt;
        let porcentaje = totalAnt > 0 ? Math.round((delta / totalAnt) * 100) : 0;
        let clase = "neutro";
        if (delta > 0) clase = "sube";
        if (delta < 0) clase = "baja";

        badge.className = "ini-badge " + clase;
        const signo = delta >= 0 ? "+" : "";
        badge.innerText = `${signo}${Math.abs(delta)} (${signo}${porcentaje}%) ${intervalos.leyenda}`;
    }

    fz_dibujarSparklineHabitos(puntosGrafica, habitosHoy, intervalos.tipo);
}

function fz_dibujarSparklineHabitos(puntos, habitosHoy, tipo) {
    const canvasElement = document.getElementById('ini-chart-habitos');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (fz_graficaHabitosInstancia) {
        try { fz_graficaHabitosInstancia.destroy(); } catch(e) {}
    }

    let colorLinea = '#f59e0b'; // Amarillo por defecto
    let colorFondo = 'rgba(245, 158, 11, 0.20)';

    if (habitosHoy > 5) {
        colorLinea = '#10b981'; // Verde
        colorFondo = 'rgba(16, 185, 129, 0.20)';
    } else if (habitosHoy <= 3) {
        colorLinea = '#ef4444'; // Rojo
        colorFondo = 'rgba(239, 68, 68, 0.20)';
    }

    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140);
    gradienteFondo.addColorStop(0, colorFondo);
    gradienteFondo.addColorStop(1, 'rgba(255, 255, 255, 0)');

    let labels = tipo === 'mes' ? 
        Array.from({length: puntos.length}, (_, i) => i + 1) : 
        ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].slice(0, puntos.length);

    try {
        fz_graficaHabitosInstancia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: puntos, borderColor: colorLinea, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#ffffff', pointBorderColor: colorLinea, pointBorderWidth: 1.5, pointHoverRadius: 6, fill: true, backgroundColor: gradienteFondo, tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true, intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8,
                        callbacks: { label: c => ` ${tipo === 'mes' ? 'Día ' : ''}${c.label}: ${typeof c.parsed.y === 'number' && !Number.isInteger(c.parsed.y) ? c.parsed.y.toFixed(1) : c.parsed.y} hábito(s)` }
                    }
                },
                scales: {
                    x: { display: true, grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false } },
                    y: { display: true, position: 'left', min: 0, suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) + 1 : 6, grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5, callback: function(value) { if(value % 1 === 0) return value; } } }
                }
            }
        });
    } catch(e) {}
}

// ─── LÓGICA DE DOPAMINA ───────────────
function fz_renderizarDopaminaDashboard() {
    const datos = cargarDatos();
    const acciones = datos.dopamina?.acciones || [];
    const select = document.getElementById('ini-dopamina-select');

    if (!select) return;

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
        fz_dibujarSparklineDopamina([], 0, 0, 'mes');
        return;
    }

    const intervalos = fz_obtenerLimitesFechas();
    if (!intervalos) return;

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

    let puntosGrafica = [];
    let rachaActualVista = 0;
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    if (intervalos.tipo === 'mes') {
        let cursor = new Date(intervalos.inicioAct);
        while (cursor <= intervalos.finAct && cursor <= hoyMax) {
            let timeDia = cursor.getTime();
            let lastR = -1;
            for (let i = 0; i < puntosReset.length; i++) {
                if (puntosReset[i] <= timeDia) lastR = puntosReset[i];
                else break;
            }
            let rachaDia = lastR !== -1 ? (timeDia - lastR) / 86400000 : 0;
            puntosGrafica.push(Math.round(rachaDia * 10) / 10);
            rachaActualVista = rachaDia;
            cursor.setDate(cursor.getDate() + 1);
        }
    } else {
        // Modo Anual
        for (let m = 0; m < 12; m++) {
            if (intervalos.inicioAct.getFullYear() === hoyMax.getFullYear() && m > hoyMax.getMonth()) break;
            
            let inicioM = new Date(intervalos.inicioAct.getFullYear(), m, 1);
            let finM = new Date(intervalos.inicioAct.getFullYear(), m + 1, 0, 23, 59, 59, 999);
            
            let maxRachaMes = 0;
            for (let d = new Date(inicioM); d <= finM && d <= hoyMax; d.setDate(d.getDate()+1)) {
                let timeDia = d.getTime();
                let lastR = -1;
                for (let i = 0; i < puntosReset.length; i++) {
                    if (puntosReset[i] <= timeDia) lastR = puntosReset[i];
                    else break;
                }
                let rachaDia = lastR !== -1 ? (timeDia - lastR) / 86400000 : 0;
                if(rachaDia > maxRachaMes) maxRachaMes = rachaDia;
                rachaActualVista = rachaDia; 
            }
            puntosGrafica.push(Math.round(maxRachaMes * 10) / 10);
        }
    }

    if (rachaElement) {
        rachaElement.innerText = Math.floor(rachaActualVista) + 'd';
    }
    if (promElement) {
        promElement.innerText = `Promedio: ${promDias.toFixed(1)}d`;
        if (rachaActualVista >= promDias && rachaActualVista > 0) {
            promElement.style.color = '#10b981'; 
        } else if (rachaActualVista < promDias) {
            promElement.style.color = '#ef4444'; 
        } else {
            promElement.style.color = 'var(--text-mutado, #999)';
        }
    }

    fz_dibujarSparklineDopamina(puntosGrafica, rachaActualVista, promDias, intervalos.tipo);
}

function fz_dibujarSparklineDopamina(puntos, rachaActual, promDias, tipo) {
    const canvasElement = document.getElementById('ini-chart-dopamina');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (fz_graficaDopaminaInstancia) {
        try { fz_graficaDopaminaInstancia.destroy(); } catch(e) {}
    }

    let colorLinea = '#ef4444'; 
    let colorFondo = 'rgba(239, 68, 68, 0.20)';

    if ((rachaActual >= promDias && rachaActual > 0) || (promDias === 0 && rachaActual > 0)) {
        colorLinea = '#10b981'; 
        colorFondo = 'rgba(16, 185, 129, 0.20)';
    }

    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140);
    gradienteFondo.addColorStop(0, colorFondo);
    gradienteFondo.addColorStop(1, 'rgba(255, 255, 255, 0)');

    let labels = tipo === 'mes' ? 
        Array.from({length: puntos.length}, (_, i) => i + 1) : 
        ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].slice(0, puntos.length);

    try {
        fz_graficaDopaminaInstancia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
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
                    tension: 0.15 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true, intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8,
                        callbacks: { label: c => ` ${tipo === 'mes' ? 'Día ' : ''}${c.label}: ${c.parsed.y} días max` }
                    }
                },
                scales: {
                    x: { 
                        display: true, grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false },
                        ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false }
                    },
                    y: {
                        display: true, position: 'left', min: 0, suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) + 2 : 5,
                        grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false },
                        ticks: {
                            color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5,
                            callback: function(value) { return value.toFixed(0) + 'd'; }
                        }
                    }
                }
            }
        });
    } catch(e) { console.error("Error gráfica dopamina:", e); }
}

// ─── LÓGICA DE FINANZAS ─────────
function fz_renderizarFinanzasDashboard() {
    const datosCompletos = cargarDatos();
    const finanzas = datosCompletos.finanzas_personales;

    if (!finanzas || !finanzas.cuentas) return;

    const intervalos = fz_obtenerLimitesFechas();
    if (!intervalos) return; 

    const hoy = new Date();
    let esFuturo = false;
    if (intervalos.tipo === 'mes') {
        esFuturo = (fz_fechaFiltroGlobal.getFullYear() > hoy.getFullYear()) || 
                   (fz_fechaFiltroGlobal.getFullYear() === hoy.getFullYear() && fz_fechaFiltroGlobal.getMonth() >= hoy.getMonth());
    } else {
        esFuturo = (fz_fechaFiltroGlobal.getFullYear() >= hoy.getFullYear());
    }

    const cuentasActivas = finanzas.cuentas.filter(c => !c.archivada && c.incluir_dashboard !== false);
    const idsCuentasActivas = cuentasActivas.map(c => c.id);

    let saldoBaseCalculo = cuentasActivas.reduce((sum, c) => sum + parseFloat(c.saldo_inicial || 0), 0);

    const añoFiltro = intervalos.finAct.getFullYear();
    const mesFiltro = String(intervalos.finAct.getMonth() + 1).padStart(2, '0');
    const diaFiltro = String(intervalos.finAct.getDate()).padStart(2, '0');
    const fechaCierreFiltroStr = `${añoFiltro}-${mesFiltro}-${diaFiltro}`;

    const hoyStr = hoy.toISOString().split('T')[0];
    const fechaLimiteStr = esFuturo ? hoyStr : fechaCierreFiltroStr;

    const transaccionesValidas = (finanzas.transacciones || []).filter(t => 
        !t.archivada && t.fecha <= fechaLimiteStr && t.pagado !== false &&
        idsCuentasActivas.includes(t.cuenta_id) && (t.tipo === 'ingreso' || t.tipo === 'gasto')
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

    const analitica = fz_procesarIntervaloFinanciero(saldoBaseCalculo, transaccionesValidas, intervalos, fechaLimiteStr);

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

    fz_dibujarSparklineFinanzas(analitica.puntosGrafica, analitica.lineaVerde, intervalos.tipo);
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
    const intervalos = fz_obtenerLimitesFechas();
    if (!intervalos) return;

    function enRango(fechaStr, inicio, fin) {
        const f = fz_parsearFechaRegistro(fechaStr);
        if (!f) return false;
        f.setHours(12, 0, 0, 0);
        return f >= inicio && f <= fin;
    }

    const registrosActuales   = registroTrabajo.filter(r => enRango(r.fecha, intervalos.inicioAct, intervalos.finAct));
    const registrosAnteriores = registroTrabajo.filter(r => enRango(r.fecha, intervalos.inicioAnt, intervalos.finAnt));
    const totalSegsActual     = registrosActuales.reduce((sum, r) => sum + (r.trabajado || 0), 0);
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
    let diasTranscurridos = 0;
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    if (intervalos.tipo === 'mes') {
        let cursor = new Date(intervalos.inicioAct);
        while (cursor <= intervalos.finAct && cursor <= hoyMax) {
            const key = cursor.toISOString().split('T')[0];
            puntosGrafica.push(Math.round(((mapaFechas[key] || 0) / 3600) * 100) / 100);
            cursor.setDate(cursor.getDate() + 1);
            diasTranscurridos++;
        }
    } else {
        for (let m = 0; m < 12; m++) {
            if (intervalos.inicioAct.getFullYear() === hoyMax.getFullYear() && m > hoyMax.getMonth()) break;
            
            let totalSegsMes = 0;
            let inicioM = new Date(intervalos.inicioAct.getFullYear(), m, 1);
            let finM = new Date(intervalos.inicioAct.getFullYear(), m + 1, 0, 23, 59, 59, 999);
            
            for (let d = new Date(inicioM); d <= finM && d <= hoyMax; d.setDate(d.getDate()+1)) {
                const key = d.toISOString().split('T')[0];
                totalSegsMes += (mapaFechas[key] || 0);
                diasTranscurridos++;
            }
            puntosGrafica.push(Math.round((totalSegsMes / 3600) * 100) / 100);
        }
    }

    const totalHorasPer = totalSegsActual / 3600;
    const promedioDiarioHoras = diasTranscurridos > 0 ? (totalHorasPer / diasTranscurridos) : 0;

    const promedioEl = document.getElementById('ini-trabajo-promedio');
    if (promedioEl) {
        promedioEl.innerText = `Promedio Diario: ${promedioDiarioHoras.toFixed(1)}h/día`;
        promedioEl.style.color = promedioDiarioHoras > 0 ? 'var(--text-base, #111111)' : 'var(--text-mutado, #888)';
    }

    fz_dibujarSparklineProductividad(puntosGrafica, promedioDiarioHoras, intervalos.tipo);
}

function fz_dibujarSparklineProductividad(puntos, promedioHoras, tipo) {
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

    let labels = tipo === 'mes' ? 
        Array.from({length: puntos.length}, (_, i) => i + 1) : 
        ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].slice(0, puntos.length);

    try {
        fz_graficaProductividadInstancia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels, 
                datasets: [{
                    data: puntos, borderColor: colorLinea, borderWidth: 2.5, pointRadius: 3, 
                    pointBackgroundColor: '#ffffff', pointBorderColor: colorLinea, pointBorderWidth: 1.5,
                    pointHoverRadius: 6, fill: true, backgroundColor: gradienteFondo, tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true, intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8,
                        callbacks: { label: c => ` ${tipo === 'mes' ? 'Día ' : ''}${c.label}: ${fz_formatearTiempoProductividad(c.parsed.y * 3600)}` }
                    }
                },
                scales: {
                    x: { display: true, grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false } },
                    y: { display: true, position: 'left', min: 0, suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) * 1.12 : 8, grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5, callback: function(value) { return value.toFixed(1) + 'h'; } } }
                }
            }
        });
    } catch(e) {}
}

// ─── LÓGICA DE TRABAJOS ENTREGADOS ──────────────────────────────
function fz_renderizarVideosDashboard() {
    const datos = cargarDatos();
    const clientes = datos.clientes || [];
    const intervalos = fz_obtenerLimitesFechas();
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
    let diasTranscurridos = 0;
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    if (intervalos.tipo === 'mes') {
        let cursor = new Date(intervalos.inicioAct);
        while (cursor <= intervalos.finAct && cursor <= hoyMax) {
            const key = cursor.toISOString().split('T')[0];
            puntosGrafica.push(mapaFechas[key] || 0);
            cursor.setDate(cursor.getDate() + 1);
            diasTranscurridos++;
        }
    } else {
        for (let m = 0; m < 12; m++) {
            if (intervalos.inicioAct.getFullYear() === hoyMax.getFullYear() && m > hoyMax.getMonth()) break;
            
            let totalMes = 0;
            let inicioM = new Date(intervalos.inicioAct.getFullYear(), m, 1);
            let finM = new Date(intervalos.inicioAct.getFullYear(), m + 1, 0, 23, 59, 59, 999);
            
            for (let d = new Date(inicioM); d <= finM && d <= hoyMax; d.setDate(d.getDate()+1)) {
                const key = d.toISOString().split('T')[0];
                totalMes += (mapaFechas[key] || 0);
                diasTranscurridos++;
            }
            puntosGrafica.push(totalMes);
        }
    }

    const promedioDiario = diasTranscurridos > 0 ? (totalAct / diasTranscurridos) : 0;

    const promedioEl = document.getElementById('ini-videos-promedio');
    if (promedioEl) {
        promedioEl.innerText = `Promedio Diario: ${promedioDiario.toFixed(2)}/día`;
        promedioEl.style.color = promedioDiario >= (totalAnt / 30 || 0) ? 'var(--text-base, #111111)' : 'var(--text-mutado, #888)';
    }

    fz_dibujarSparklineVideos(puntosGrafica, totalAct, intervalos.tipo);
}

function fz_dibujarSparklineVideos(puntos, totalTrabajosMes, tipo) {
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

    let labels = tipo === 'mes' ? 
        Array.from({length: puntos.length}, (_, i) => i + 1) : 
        ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].slice(0, puntos.length);

    try {
        fz_graficaVideosInstancia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: puntos, borderColor: colorLinea, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#ffffff', pointBorderColor: colorLinea, pointBorderWidth: 1.5, pointHoverRadius: 6, fill: true, backgroundColor: gradienteFondo, tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true, intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8,
                        callbacks: { label: c => ` ${tipo === 'mes' ? 'Día ' : ''}${c.label}: ${c.parsed.y} trabajo(s)` }
                    }
                },
                scales: {
                    x: { display: true, grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false } },
                    y: { display: true, position: 'left', min: 0, suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) + 1 : 3, grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5, callback: function(value) { if(value % 1 === 0) return value; } } }
                }
            }
        });
    } catch(e) {}
}

// ─── LÓGICA DE PORTAFOLIO CLIENTES (GRÁFICA Y TARJETAS) ─────────
function fz_renderizarResumenClientesDashboard() {
    const datos = cargarDatos();
    const clientes = datos.clientes || [];
    const intervalos = fz_obtenerLimitesFechas();
    if (!intervalos) return;

    function enRango(fechaStr, inicio, fin) {
        const f = fz_parsearFechaRegistro(fechaStr);
        if (!f) return false;
        f.setHours(12, 0, 0, 0);
        return f >= inicio && f <= fin;
    }

    let ingresosAct = 0;
    let ingresosAnt = 0;
    let trabajosPendientesActual = 0;
    let totalClientesActivos = 0;
    let videosConFechas = []; 

    clientes.forEach(c => {
        let tieneActividadMes = false;

        (c.videos || []).forEach(v => {
            if (v.estado === 'sin_empezar' || v.estado === 'en_curso') {
                trabajosPendientesActual++;
            }

            let fStr = v.fecha_entrega || v.fecha_pago || v.fecha_recibido || (v.ultima_edicion ? v.ultima_edicion.split('T')[0] : null);
            
            if (v.estado === 'listo' && fStr) {
                const cobrado = (v.finanzas?.inversion || 0) + (v.finanzas?.bono || 0);
                if (enRango(fStr, intervalos.inicioAct, intervalos.finAct)) {
                    ingresosAct += cobrado;
                    tieneActividadMes = true;
                } else if (enRango(fStr, intervalos.inicioAnt, intervalos.finAnt)) {
                    ingresosAnt += cobrado;
                }
            }

            let startMs = 0;
            if (v.fecha_recibido) {
                startMs = new Date(v.fecha_recibido + 'T00:00:00').getTime();
            } else if (v.id && !isNaN(v.id) && v.id > 1000000000000) {
                startMs = parseInt(v.id);
            } else if (v.ultima_edicion) {
                startMs = new Date(v.ultima_edicion).getTime();
            } else {
                startMs = new Date(2020, 0, 1).getTime(); 
            }

            let endMs = Infinity; 
            if (v.estado === 'listo' && fStr) {
                endMs = new Date(fStr + 'T23:59:59').getTime();
            }

            if (startMs > 0) {
                videosConFechas.push({ startMs, endMs });
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

    let puntosGrafica = [];
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    if (intervalos.tipo === 'mes') {
        let cursor = new Date(intervalos.inicioAct);
        while (cursor <= intervalos.finAct && cursor <= hoyMax) {
            let cursorTime = cursor.getTime();
            let pendingOnDay = videosConFechas.filter(v => v.startMs <= cursorTime && v.endMs >= cursorTime).length;
            puntosGrafica.push(pendingOnDay);
            cursor.setDate(cursor.getDate() + 1);
        }
    } else {
        for (let m = 0; m < 12; m++) {
            if (intervalos.inicioAct.getFullYear() === hoyMax.getFullYear() && m > hoyMax.getMonth()) break;
            let finMes = new Date(intervalos.inicioAct.getFullYear(), m + 1, 0, 23, 59, 59, 999);
            let checkDate = finMes > hoyMax ? hoyMax : finMes;
            let checkTime = checkDate.getTime();
            let pendingEndMonth = videosConFechas.filter(v => v.startMs <= checkTime && v.endMs >= checkTime).length;
            puntosGrafica.push(pendingEndMonth);
        }
    }

    const elPend = document.getElementById('ini-resumen-pendientes');
    const iconPend = document.getElementById('ini-icon-pendientes');
    if (elPend) {
        elPend.innerText = trabajosPendientesActual;
        
        if (trabajosPendientesActual === 0) {
            elPend.style.color = '#10b981'; 
            if (iconPend) { iconPend.style.background = 'rgba(16, 185, 129, 0.1)'; iconPend.style.color = '#10b981'; }
        } else if (trabajosPendientesActual <= 3) {
            elPend.style.color = '#f59e0b'; 
            if (iconPend) { iconPend.style.background = 'rgba(245, 158, 11, 0.1)'; iconPend.style.color = '#f59e0b'; }
        } else {
            elPend.style.color = '#ef4444'; 
            if (iconPend) { iconPend.style.background = 'rgba(239, 68, 68, 0.1)'; iconPend.style.color = '#ef4444'; }
        }
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

    fz_dibujarSparklineClientes(puntosGrafica, trabajosPendientesActual, intervalos.tipo);
}

function fz_dibujarSparklineClientes(puntos, pendientesActual, tipo) {
    const canvasElement = document.getElementById('ini-chart-clientes');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (fz_graficaClientesInstancia) {
        try { fz_graficaClientesInstancia.destroy(); } catch(e) {}
    }

    let colorLinea = '#ef4444'; 
    let colorFondo = 'rgba(239, 68, 68, 0.20)';

    if (pendientesActual === 0) {
        colorLinea = '#10b981'; 
        colorFondo = 'rgba(16, 185, 129, 0.20)';
    } else if (pendientesActual <= 3) {
        colorLinea = '#f59e0b'; 
        colorFondo = 'rgba(245, 158, 11, 0.20)';
    }

    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 140);
    gradienteFondo.addColorStop(0, colorFondo);
    gradienteFondo.addColorStop(1, 'rgba(255, 255, 255, 0)');

    let labels = tipo === 'mes' ? 
        Array.from({length: puntos.length}, (_, i) => i + 1) : 
        ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].slice(0, puntos.length);

    try {
        fz_graficaClientesInstancia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: puntos, borderColor: colorLinea, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#ffffff', pointBorderColor: colorLinea, pointBorderWidth: 1.5, pointHoverRadius: 6, fill: true, backgroundColor: gradienteFondo, tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true, intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8,
                        callbacks: { label: c => ` ${tipo === 'mes' ? 'Día ' : ''}${c.label}: ${c.parsed.y} pendiente(s)` }
                    }
                },
                scales: {
                    x: { display: true, grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false } },
                    y: { display: true, position: 'left', min: 0, suggestedMax: Math.max(...puntos) > 0 ? Math.max(...puntos) + 1 : 4, grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5, callback: function(value) { if(value % 1 === 0) return value; } } }
                }
            }
        });
    } catch(e) {}
}

// ─── UTILIDADES (FECHAS Y SPARKLINE FINANZAS) ─────────────────────
function fz_procesarIntervaloFinanciero(saldoActual, transacciones, intervalos, fechaLimiteStr) {
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
    const hoyMax = new Date();
    hoyMax.setHours(23, 59, 59, 999);

    if (intervalos.tipo === 'mes') {
        let cursor = new Date(intervalos.inicioAct);
        while (cursor <= intervalos.finAct && cursor <= hoyMax) {
            puntosGrafica.push(Math.round(obtenerSaldoEnFecha(cursor) * 100) / 100);
            cursor.setDate(cursor.getDate() + 1);
        }
    } else {
        for (let m = 0; m < 12; m++) {
            if (intervalos.inicioAct.getFullYear() === hoyMax.getFullYear() && m > hoyMax.getMonth()) break;
            let finMes = new Date(intervalos.inicioAct.getFullYear(), m + 1, 0, 23, 59, 59, 999);
            let checkDate = finMes > hoyMax ? hoyMax : finMes;
            puntosGrafica.push(Math.round(obtenerSaldoEnFecha(checkDate) * 100) / 100);
        }
    }

    return { delta, clase, puntosGrafica, lineaVerde, promedioGeneralHistorico };
}

function fz_dibujarSparklineFinanzas(puntos, esPositivo, tipo) {
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

    let labels = tipo === 'mes' ? 
        Array.from({length: puntos.length}, (_, i) => i + 1) : 
        ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].slice(0, puntos.length);

    fz_graficaSparklineInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels, 
            datasets: [{
                data: puntos, borderColor: colorLinea, borderWidth: 2.5, pointRadius: 3, 
                pointBackgroundColor: '#ffffff', pointBorderColor: colorLinea, pointBorderWidth: 1.5,
                pointHoverRadius: 6, fill: true, backgroundColor: gradienteFondo, tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, layout: { padding: { top: 10, bottom: 5, left: 5, right: 10 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true, intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let prefix = tipo === 'mes' ? ' Día ' : ' ';
                            return prefix + context.label + ': ' + fz_formatearMonedaDashboard(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: { display: true, grid: { display: true, color: 'rgba(128, 128, 128, 0.12)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 9, weight: '600' }, maxTicksLimit: 31, autoSkip: false } },
                y: { display: true, position: 'left', min: Math.min(...puntos) < 0 ? undefined : 0, suggestedMax: Math.max(...puntos) * 1.08, grid: { display: true, color: 'rgba(128, 128, 128, 0.08)', drawBorder: false }, ticks: { color: 'var(--text-mutado, #999)', font: { size: 8, weight: '600' }, maxTicksLimit: 5, callback: function(value) { if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M'; if (value >= 1e3) return '$' + (value / 1e3).toFixed(0) + 'k'; return '$' + value; } } }
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