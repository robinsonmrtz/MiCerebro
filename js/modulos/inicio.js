// ====================================================
// CORE COMPONENT: inicio.js (Motor de Análisis de Datos v2.0)
// FILTROS: Semana (Lun-Dom), Mes (1-31), Año (1 Ene-31 Dic) y Rango
// ====================================================

let fz_periodoActualDashboard = "semana"; 
let fz_graficaSparklineInstancia = null;
let fz_graficaProductividadInstancia = null;

function inicializarDashboard() {
    console.log("🧠 Inicializando Dashboard Principal...");
    fz_renderizarSaludo();
    
    // Si volvemos y estaba en rango, inicializar los inputs por defecto con el mes actual
    if (fz_periodoActualDashboard === "rango") {
        const hoy = new Date();
        const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        const ultimo = hoy.toISOString().split('T')[0];
        
        setTimeout(() => {
            if(document.getElementById('ini-fecha-inicio')) document.getElementById('ini-fecha-inicio').value = primero;
            if(document.getElementById('ini-fecha-fin')) document.getElementById('ini-fecha-fin').value = ultimo;
            fz_renderizarFinanzasDashboard();
            fz_renderizarProductividadDashboard();
        }, 50);
    } else {
        fz_renderizarFinanzasDashboard();
        fz_renderizarProductividadDashboard();
    }
    
    fz_renderizarPlaceholdersExtras();
}


function fz_renderizarSaludo() {
    const nombre = "Robinson"; // 👈 cambia tu nombre aquí
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


/**
 * Renderiza el dinero disponible y calcula tendencias según el período
 */
/**
 * Renderiza el saldo general y calcula tendencias según el período
 */
function fz_renderizarFinanzasDashboard() {
    const datosCompletos = cargarDatos();
    const finanzas = datosCompletos.finanzas_personales;

    if (!finanzas || !finanzas.cuentas) return;

    // 1. Filtrar cuentas permitidas en el dashboard y obtener sus IDs
    const cuentasActivas = finanzas.cuentas.filter(c => !c.archivada && c.incluir_dashboard !== false);
    const idsCuentasActivas = cuentasActivas.map(c => c.id);

    // 2. Base matemática: Sumar los saldos iniciales
    let saldoActualNeto = cuentasActivas.reduce((sum, c) => sum + parseFloat(c.saldo_inicial || 0), 0);

    const hoyStr = new Date().toISOString().split('T')[0];

    // 3. Extraer SOLO movimientos reales: Ingresos/Gastos de cuentas activas, pagados y hasta HOY
    // (Las transferencias no alteran el patrimonio total)
    const transaccionesValidas = (finanzas.transacciones || []).filter(t => 
        !t.archivada && 
        t.fecha <= hoyStr && 
        t.pagado !== false &&
        idsCuentasActivas.includes(t.cuenta_id) &&
        (t.tipo === 'ingreso' || t.tipo === 'gasto')
    );

    // 4. Calcular Saldo Verdadero actual
    transaccionesValidas.forEach(t => {
        const monto = parseFloat(t.monto || 0);
        if (t.tipo === 'ingreso') saldoActualNeto += monto;
        if (t.tipo === 'gasto') saldoActualNeto -= monto;
    });

    // 5. Inyectar el número gigante en la tarjeta
    const montoElement = document.getElementById('ini-finanzas-monto');
    if (montoElement) montoElement.innerText = fz_formatearMonedaDashboard(saldoActualNeto);

    // 6. Obtener las fechas del filtro superior (Semana, Mes, Rango, etc.)
    const intervalos = fz_obtenerLimitesFechas(fz_periodoActualDashboard);
    if (!intervalos) return; 

    // 7. Motor de viaje en el tiempo para la gráfica y la píldora (Badge) de vs Anterior
    const analitica = fz_procesarIntervaloFinanciero(saldoActualNeto, transaccionesValidas, intervalos);

    // 8. Pintar la píldora de porcentaje
    const badge = document.getElementById('ini-finanzas-badge');
    if (badge) {
        badge.className = "ini-badge " + analitica.clase;
        const signo = analitica.delta >= 0 ? "+" : "";
        badge.innerText = `${signo}${fz_formatearMonedaDashboard(Math.abs(analitica.delta))} (${signo}${analitica.porcentaje}%) ${intervalos.leyenda}`;
    }

    // 9. Dibujar la Gráfica Sparkline con fluidez
    fz_dibujarSparklineDashboard(analitica.puntosGrafica, analitica.clase === "sube");
}

function fz_parsearFechaRegistro(fechaStr) {
    if (!fechaStr) return null;
    if (fechaStr.includes('-')) return new Date(fechaStr + 'T00:00:00');
    const p = fechaStr.split('/');
    if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    return null;
}

function fz_renderizarProductividadDashboard() {
    const datos = cargarDatos();
    const registroTrabajo = datos.registro_trabajo || [];
    const intervalos = fz_obtenerLimitesFechas(fz_periodoActualDashboard);
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

    if (fz_periodoActualDashboard === "ano") {
        const año = intervalos.inicioAct.getFullYear();
        for (let m = 0; m < 12; m++) {
            const inicioMes = new Date(año, m, 1);
            const finMes    = new Date(año, m + 1, 0);
            let segsMes = 0;
            let cursor  = new Date(inicioMes);
            while (cursor <= finMes) {
                segsMes += mapaFechas[cursor.toISOString().split('T')[0]] || 0;
                cursor.setDate(cursor.getDate() + 1);
            }
            puntosGrafica.push(Math.round(segsMes / 3600 * 10) / 10);
        }
    } else {
        let cursor = new Date(intervalos.inicioAct);
        const hoy  = new Date(); hoy.setHours(23, 59, 59, 999);
        while (cursor <= intervalos.finAct && cursor <= hoy) {
            const key = cursor.toISOString().split('T')[0];
            puntosGrafica.push(Math.round(((mapaFechas[key] || 0) / 3600) * 100) / 100);
            cursor.setDate(cursor.getDate() + 1);
        }
        if (puntosGrafica.length === 0) puntosGrafica.push(0);
        while (puntosGrafica.length < (fz_periodoActualDashboard === "semana" ? 7 : 2)) puntosGrafica.push(0);
    }

    fz_dibujarSparklineProductividad(puntosGrafica, clase !== "baja");
}

function fz_dibujarSparklineProductividad(puntos, esPositivo) {
    const canvasElement = document.getElementById('ini-chart-productividad');
    if (!canvasElement) {
        console.warn("❌ Canvas ini-chart-productividad no encontrado");
        return;
    }

    console.log("📊 Productividad - puntos gráfica:", puntos);

    const ctx = canvasElement.getContext('2d');
    if (fz_graficaProductividadInstancia) {
        try { fz_graficaProductividadInstancia.destroy(); } catch(e) {}
    }

    const colorLinea = esPositivo ? '#f59e0b' : '#ef4444';
    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 55);
    gradienteFondo.addColorStop(0, esPositivo ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)');
    gradienteFondo.addColorStop(1, 'rgba(0,0,0,0)');

    try {
        fz_graficaProductividadInstancia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(puntos.length).fill(''),
                datasets: [{
                    data: puntos,
                    borderColor: colorLinea,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    backgroundColor: gradienteFondo,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        intersect: false,
                        callbacks: { label: c => ` ${fz_formatearTiempoProductividad(c.parsed.y * 3600)}` }
                    }
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        min: 0,
                        suggestedMax: Math.max(...puntos) > 0 ? undefined : 1
                    }
                }
            }
        });
        console.log("✅ Gráfica productividad creada OK");
    } catch(e) {
        console.error("❌ Error al crear gráfica productividad:", e);
    }
}

/**
 * Calcula límites de fechas exactos para períodos naturales y comparativos
 */
function fz_obtenerLimitesFechas(periodo) {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    let inicioAct, finAct, inicioAnt, finAnt, leyenda;
    
    if (periodo === "semana") {
        let day = hoy.getDay(); 
        let diffALunes = day === 0 ? -6 : 1 - day; // Lunes como día 1
        
        inicioAct = new Date(hoy);
        inicioAct.setDate(hoy.getDate() + diffALunes);
        
        finAct = new Date(inicioAct);
        finAct.setDate(inicioAct.getDate() + 6);
        finAct.setHours(23,59,59,999);
        
        inicioAnt = new Date(inicioAct);
        inicioAnt.setDate(inicioAct.getDate() - 7);
        
        finAnt = new Date(finAct);
        finAnt.setDate(finAct.getDate() - 7);
        
        leyenda = "vs sem. ant.";
        
    } else if (periodo === "mes") {
        inicioAct = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        finAct = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
        
        inicioAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        finAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);
        
        leyenda = "vs mes ant.";
        
    } else if (periodo === "ano") {
        inicioAct = new Date(hoy.getFullYear(), 0, 1);
        finAct = new Date(hoy.getFullYear(), 11, 31, 23, 59, 59, 999);
        
        inicioAnt = new Date(hoy.getFullYear() - 1, 0, 1);
        finAnt = new Date(hoy.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        
        leyenda = "vs año ant.";
        
    } else if (periodo === "rango") {
        const inputInic = document.getElementById('ini-fecha-inicio')?.value;
        const inputFin = document.getElementById('ini-fecha-fin')?.value;
        
        if (!inputInic || !inputFin) return null; // Esperando entrada del usuario
        
        inicioAct = new Date(inputInic + "T00:00:00");
        finAct = new Date(inputFin + "T23:59:59");
        
        let diffMs = finAct.getTime() - inicioAct.getTime();
        
        inicioAnt = new Date(inicioAct.getTime() - diffMs - 1000);
        finAnt = new Date(inicioAct.getTime() - 1000);
        
        leyenda = "vs periodo ant.";
    }

    return { inicioAct, finAct, inicioAnt, finAnt, leyenda };
}

/**
 * Aplica ingeniería inversa cronológica sobre los límites calculados
 */
function fz_procesarIntervaloFinanciero(saldoActual, transacciones, intervalos) {
    // Ordenar transacciones de más nuevas a más viejas
    const txOrdenadas = [...transacciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
    
    const hoyStr = new Date().toISOString().split('T')[0];
    let saldoTemporal = saldoActual;
    let mapaSaldosDiarios = {};
    mapaSaldosDiarios[hoyStr] = saldoActual;

    // Viaje en el tiempo re-calculando balances
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

    // Función auxiliar para recuperar el saldo de cualquier día exacto del pasado
    function obtenerSaldoEnFecha(fechaObj) {
        let fStr = fechaObj.toISOString().split('T')[0];
        if (mapaSaldosDiarios[fStr] !== undefined) return mapaSaldosDiarios[fStr];
        
        // Si no hay transacciones ese día, buscar la fecha posterior más cercana registrada
        let diasBusqueda = Object.keys(mapaSaldosDiarios).sort();
        let saldoEncontrado = saldoTemporal; // Saldo base inicial antes de toda transacción conocido
        
        for (let i = 0; i < diasBusqueda.length; i++) {
            if (diasBusqueda[i] >= fStr) {
                saldoEncontrado = mapaSaldosDiarios[diasBusqueda[i]];
                break;
            }
        }
        return saldoEncontrado;
    }

    // Calcular saldos de corte clave
    const saldoFinAct = intervalos.finAct >= new Date() ? saldoActual : obtenerSaldoEnFecha(intervalos.finAct);
    const saldoInicioAct = obtenerSaldoEnFecha(intervalos.inicioAct);
    const saldoFinAnt = obtenerSaldoEnFecha(intervalos.finAnt);

    // Delta = Saldo al final del período actual comparado con el saldo al finalizar el período anterior
    const delta = saldoFinAct - saldoFinAnt;
    let porcentaje = 0;
    if (saldoFinAnt !== 0) {
        porcentaje = Math.round((delta / Math.abs(saldoFinAnt)) * 100);
    }

    let clase = "neutro";
    if (delta > 0.01) clase = "sube";
    if (delta < -0.01) clase = "baja";

    // Generar los puntos de la gráfica de forma optimizada
    let puntosGrafica = [];
    
    if (fz_periodoActualDashboard === "ano") {
        // Para el Año completo, graficamos 12 puntos (fines de cada mes) para máxima belleza y fluidez
        const añoCrucial = intervalos.inicioAct.getFullYear();
        for (let m = 0; m < 12; m++) {
            let finDeMes = new Date(añoCrucial, m + 1, 0, 23, 59, 59);
            puntosGrafica.push(Math.round(obtenerSaldoEnFecha(finDeMes) * 100) / 100);
        }
    } else {
        // Diaria para Semana, Mes o Rangos Personalizados
        let cursor = new Date(intervalos.inicioAct);
        while (cursor <= intervalos.finAct && cursor <= new Date()) {
            puntosGrafica.push(Math.round(obtenerSaldoEnFecha(cursor) * 100) / 100);
            cursor.setDate(cursor.getDate() + 1);
        }
        // Si el periodo se extiende al futuro (ej. fin de semana o fin de mes que no ha llegado), rellenar con el saldo actual
        if (puntosGrafica.length === 0) puntosGrafica.push(saldoActual);
        while(puntosGrafica.length < (fz_periodoActualDashboard === "semana" ? 7 : 2)) {
            puntosGrafica.push(saldoActual);
        }
    }

    return { delta, porcentaje, clase, puntosGrafica };
}

/**
 * Pinta la mini-gráfica fluida sin ruidos de ejes
 */
function fz_dibujarSparklineDashboard(puntos, esPositivo) {
    const canvasElement = document.getElementById('ini-chart-finanzas');
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');

    if (fz_graficaSparklineInstancia) {
        let fz_graficaProductividadInstancia = null;
        fz_graficaSparklineInstancia.destroy();
    }

    const colorLinea = esPositivo ? '#10b981' : '#ef4444';
    const gradienteFondo = ctx.createLinearGradient(0, 0, 0, 50);
    gradienteFondo.addColorStop(0, esPositivo ? 'rgba(16, 185, 129, 0.20)' : 'rgba(239, 68, 68, 0.20)');
    gradienteFondo.addColorStop(1, 'rgba(255, 255, 255, 0)');

    fz_graficaSparklineInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(puntos.length).fill(''),
            datasets: [{
                data: puntos,
                borderColor: colorLinea,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                backgroundColor: gradienteFondo,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return ' Saldo: ' + fz_formatearMonedaDashboard(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

/**
 * Cambia de período lógico (Muestra/Oculta los Pickers de fecha)
 */
function fz_cambiarPeriodoDashboard(periodo) {
    fz_periodoActualDashboard = periodo;
    
    document.querySelectorAll('.ini-btn-switch').forEach(btn => {
        if (btn.getAttribute('data-periodo') === periodo) {
            btn.classList.add('activo');
        } else {
            btn.classList.remove('activo');
        }
    });

    const pickerContainer = document.getElementById('ini-rango-picker-container');
    if (periodo === "rango") {
        pickerContainer.style.display = "flex";
        
        // Auto-completar inputs si están vacíos
        const hoy = new Date();
        const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        const ultimo = hoy.toISOString().split('T')[0];
        
        if(!document.getElementById('ini-fecha-inicio').value) document.getElementById('ini-fecha-inicio').value = primero;
        if(!document.getElementById('ini-fecha-fin').value) document.getElementById('ini-fecha-fin').value = ultimo;
    } else {
        pickerContainer.style.display = "none";
    }

    fz_renderizarFinanzasDashboard();
    fz_renderizarProductividadDashboard();
}

/**
 * Evento disparador al cambiar las fechas del rango personalizado
 */
function fz_procesarRangoPersonalizado() {
    if (fz_periodoActualDashboard === "rango") {
        fz_renderizarFinanzasDashboard();
        fz_renderizarProductividadDashboard();
    }
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
        document.getElementById('ini-clientes-count').innerText = datos.clientes.filter(c => !c.archivado).length;
    }
    if (datos.habitos) {
        document.getElementById('ini-habitos-porcentaje').innerText = `${datos.habitos.length} Activos`;
    }
}