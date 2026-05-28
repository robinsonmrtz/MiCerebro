/* ====================================================
   RUTA DEL ARCHIVO: js/modulos/estadisticas-habitos.js
   VERSIÓN: 2.0 — Historial de Cronómetros + Días y Horas + Regla 24h
   ==================================================== */

/* ─── Estado del módulo ────────────────────────────── */
const _stats = {
    offsetBarras: 0,
    offsetLineas: 0,
    offsetRecords: 0,
    offsetSemana: 0,
    offsetAnio: 0,
    offsetMes: 0,

    habitosFiltrados: null,
    modoTabla: 'normal',

    chartBarras: null,
    chartLineas: null,
};

/* ─── Inicialización ───────────────────────────────── */
window.inicializarEstadisticasHabitos = function () {
    _stats.habitosFiltrados = null;
    _stats.offsetBarras  = 0;
    _stats.offsetLineas  = 0;
    _stats.offsetRecords = 0;
    _stats.offsetSemana  = 0;
    _stats.offsetAnio    = 0;
    _stats.offsetMes     = 0;

    if (_stats.chartBarras)  { _stats.chartBarras.destroy();  _stats.chartBarras  = null; }
    if (_stats.chartLineas) { _stats.chartLineas.destroy(); _stats.chartLineas = null; }

    _renderTodo();
};

function _renderTodo() {
    _renderFiltroLabel();
    _renderBarras();
    _renderLineas();
    _renderCalendarioMensual();
    _renderRecords();
    _renderTablaSemanal();
    _renderHeatmapAnual();
}

/* ─── Helpers de datos ─────────────────────────────── */
function _datos() {
    return cargarDatos() || { habitos: [], registro_habitos: {}, config_habitos: null };
}

function _habitosActivos() {
    const d = _datos();
    let lista = (d.habitos || []);
    if (_stats.habitosFiltrados && _stats.habitosFiltrados.length > 0) {
        lista = lista.filter(h => _stats.habitosFiltrados.includes(h.id));
    }
    return lista;
}

function _fmt(date) {
    return date.toLocaleDateString('es-CO');
}

// ── CAMBIO VITAL: Lee el historial, y requiere 24 horas para darte 1 día completado ──
function _pctDia(reg, fecha, habito) {
    if (habito.tipo === 'cronometro') {
        const partes = fecha.split('/');
        const fCheck = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
        
        let cuentaComoRacha = false;

        // Función estricta: Revisa si en este día exacto llevabas al menos 24h
        const validarRango = (inicioMs, finMs) => {
            const msEnDia = 86400000; // 24 horas en milisegundos
            const tiempoMinimoParaContar = inicioMs + msEnDia; 
            
            if (finMs < tiempoMinimoParaContar) return false;

            const fechaMinima = new Date(tiempoMinimoParaContar);
            fechaMinima.setHours(0, 0, 0, 0); // Normalizar a medianoche
            
            const fechaFin = new Date(finMs);
            fechaFin.setHours(23, 59, 59, 999);
            
            return (fCheck.getTime() >= fechaMinima.getTime() && fCheck.getTime() <= fechaFin.getTime());
        };

        // 1. Revisar si la fecha cae dentro de un historial (rachas reiniciadas pasadas)
        if (habito.historial && habito.historial.length > 0) {
            for (let rec of habito.historial) {
                if (validarRango(new Date(rec.inicio).getTime(), new Date(rec.fin).getTime())) {
                    cuentaComoRacha = true; 
                    break;
                }
            }
        }

        // 2. Revisar en la racha actual en curso
        if (!cuentaComoRacha && habito.fechaInicio) {
            if (validarRango(new Date(habito.fechaInicio).getTime(), Date.now())) {
                cuentaComoRacha = true;
            }
        }

        return cuentaComoRacha ? 1 : 0;
    }
    
    // Hábitos normales se quedan intactos
    const r = reg[fecha];
    if (!r) return 0;
    return Math.min((r[habito.id] || 0) / habito.meta, 1);
}

function _pctDiaGlobal(reg, fecha, habitos) {
    if (!habitos.length) return 0;
    const sum = habitos.reduce((acc, h) => acc + _pctDia(reg, fecha, h), 0);
    return sum / habitos.length;
}

function _rangoFechas(n, offsetDias) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const resultado = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() - i - offsetDias);
        resultado.push(d);
    }
    return resultado;
}

const _DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const _MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const _MESES_CORTOS = ['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sept.','oct.','nov.','dic.'];

function _getChartDefaults() {
    const style = getComputedStyle(document.documentElement);
    return {
        textLo:   style.getPropertyValue('--text-lo').trim()   || '#888',
        textHi:   style.getPropertyValue('--text-hi').trim()   || '#fff',
        border:   style.getPropertyValue('--border-card').trim() || '#333',
        accent:   style.getPropertyValue('--accent').trim()    || '#7B6EF6',
        bgCard:   style.getPropertyValue('--bg-card').trim()   || '#1a1a1a',
    };
}

/* ══════════════════════════════════════════════════════
   SECCIÓN 1: Barras de Progreso General
   ══════════════════════════════════════════════════════ */

window.navegarPeriodoBarras = function (dir) {
    _stats.offsetBarras = Math.max(0, _stats.offsetBarras - dir);
    _renderBarras();
};

function _renderBarras() {
    const c = _getChartDefaults();
    const habitos = _habitosActivos();
    const d = _datos();
    const reg = d.registro_habitos || {};

    const offsetDias = _stats.offsetBarras * 7;
    const fechas = _rangoFechas(7, offsetDias);

    const labels = fechas.map(f => _DIAS_CORTOS[f.getDay()]);
    const valores = fechas.map(f => Math.round(_pctDiaGlobal(reg, _fmt(f), habitos) * 100));

    const desde = fechas[0];
    const hasta = fechas[6];
    const label = _stats.offsetBarras === 0
        ? 'Últimos 7 días'
        : `${desde.getDate()} ${_MESES_CORTOS[desde.getMonth()]} – ${hasta.getDate()} ${_MESES_CORTOS[hasta.getMonth()]}`;
    const el = document.getElementById('label-periodo-barras');
    if (el) el.textContent = label;

    const canvas = document.getElementById('chart-barras-progreso');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (_stats.chartBarras) _stats.chartBarras.destroy();

    _stats.chartBarras = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    data: Array(7).fill(100),
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.65,
                },
                {
                    data: valores,
                    backgroundColor: c.accent + 'CC',
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.65,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: {
                callbacks: { label: ctx => ` ${ctx.raw}%` }
            }},
            scales: {
                x: {
                    stacked: false,
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: c.textLo, font: { size: 11 } }
                },
                y: {
                    min: 0, max: 100,
                    grid: { color: c.border + '55', drawTicks: false },
                    border: { display: false, dash: [4, 4] },
                    ticks: {
                        color: c.textLo, font: { size: 10 },
                        stepSize: 50,
                        callback: v => v + '%'
                    }
                }
            }
        }
    });
}

/* ══════════════════════════════════════════════════════
   SECCIÓN 2: Líneas por Hábito Individual
   ══════════════════════════════════════════════════════ */

window.navegarPeriodoLineas = function (dir) {
    _stats.offsetLineas = Math.max(0, _stats.offsetLineas - dir);
    _renderLineas();
};

function _renderLineas() {
    const c = _getChartDefaults();
    const habitos = _habitosActivos();
    const d = _datos();
    const reg = d.registro_habitos || {};

    const offsetDias = _stats.offsetLineas * 7;
    const fechas = _rangoFechas(7, offsetDias);
    const labels = fechas.map(f => _DIAS_CORTOS[f.getDay()]);

    const label = _stats.offsetLineas === 0
        ? 'Últimos 7 días'
        : `${fechas[0].getDate()} ${_MESES_CORTOS[fechas[0].getMonth()]} – ${fechas[6].getDate()} ${_MESES_CORTOS[fechas[6].getMonth()]}`;
    const el = document.getElementById('label-periodo-lineas');
    if (el) el.textContent = label;

    const datasets = [
        {
            data: Array(7).fill(100),
            borderColor: '#ff4444',
            borderWidth: 1.5,
            borderDash: [],
            pointRadius: 0,
            tension: 0,
            fill: false,
            order: 999,
        }
    ];

    habitos.forEach(h => {
        datasets.push({
            label: `${h.icono} ${h.nombre}`,
            data: fechas.map(f => Math.round(_pctDia(reg, _fmt(f), h) * 100)),
            borderColor: h.color,
            backgroundColor: h.color + '22',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: h.color,
            tension: 0.4,
            fill: false,
        });
    });

    const canvas = document.getElementById('chart-lineas-habitos');
    if (!canvas) return;

    if (_stats.chartLineas) _stats.chartLineas.destroy();
    const ctx = canvas.getContext('2d');

    _stats.chartLineas = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: {
                filter: item => item.datasetIndex > 0,
                callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}%` }
            }},
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: c.textLo, font: { size: 11 } }
                },
                y: {
                    min: 0, max: 100,
                    grid: { color: c.border + '55' },
                    border: { display: false },
                    ticks: {
                        color: c.textLo, font: { size: 10 },
                        stepSize: 50,
                        callback: v => v + '%'
                    }
                }
            }
        }
    });

    const ley = document.getElementById('stats-leyenda-lineas');
    if (ley) {
        ley.innerHTML = habitos.map(h =>
            `<div class="stats-leyenda-item">
                <span class="stats-leyenda-dot" style="background:${h.color}"></span>
                <span>${h.icono} ${h.nombre}</span>
            </div>`
        ).join('');
    }
}

/* ══════════════════════════════════════════════════════
   SECCIÓN 3: Calendario Mensual con Donuts
   ══════════════════════════════════════════════════════ */

window.navegarMesCalendario = function (dir) {
    _stats.offsetMes = Math.min(0, _stats.offsetMes + dir);
    _renderCalendarioMensual();
};

function _renderCalendarioMensual() {
    const c = _getChartDefaults();
    const d = _datos();
    const reg = d.registro_habitos || {};
    const habitos = _habitosActivos();

    const hoy = new Date();
    const refMes = new Date(hoy.getFullYear(), hoy.getMonth() + _stats.offsetMes, 1);
    const anio = refMes.getFullYear();
    const mes  = refMes.getMonth();

    const tit = document.getElementById('stats-cal-titulo');
    if (tit) tit.textContent = `${_MESES_ES[mes]} de ${anio}`;

    const grid = document.getElementById('stats-cal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let primerDia = new Date(anio, mes, 1).getDay();
    primerDia = (primerDia === 0) ? 6 : primerDia - 1;

    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    for (let i = 0; i < primerDia; i++) {
        const vacio = document.createElement('div');
        vacio.className = 'cal-dia otro-mes';
        const dPrev = new Date(anio, mes, -primerDia + 1 + i);
        vacio.innerHTML = `<span class="cal-dia-numero">${dPrev.getDate()}</span>`;
        grid.appendChild(vacio);
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fecha = new Date(anio, mes, dia);
        const esFuturo = fecha > hoy;
        const esHoy = fecha.toDateString() === hoy.toDateString();
        const fmtFecha = _fmt(fecha);

        let pct = 0;
        if (!esFuturo && habitos.length > 0) {
            pct = _pctDiaGlobal(reg, fmtFecha, habitos);
        }

        const el = document.createElement('div');
        el.className = `cal-dia${esHoy ? ' hoy-cal' : ''}`;

        const size = 36;
        const sw   = 3;
        const r    = (size - sw) / 2;
        const circum = 2 * Math.PI * r;
        const offset = circum * (1 - Math.min(pct, 1));
        const colorFill = c.accent;
        const colorBg   = esFuturo ? 'transparent' : (c.border + '60');

        el.innerHTML = `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg); position:absolute; inset:0;">
                <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${colorBg}" stroke-width="${sw}"/>
                ${!esFuturo && pct > 0 ? `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${colorFill}"
                    stroke-width="${sw}" stroke-linecap="round"
                    stroke-dasharray="${circum.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>` : ''}
            </svg>
            <span class="cal-dia-numero">${dia}</span>`;

        grid.appendChild(el);
    }

    const totalCeldas = primerDia + diasEnMes;
    const filasCompletas = Math.ceil(totalCeldas / 7);
    const celdasFin = filasCompletas * 7 - totalCeldas;
    for (let i = 1; i <= celdasFin; i++) {
        const vacio = document.createElement('div');
        vacio.className = 'cal-dia otro-mes';
        vacio.innerHTML = `<span class="cal-dia-numero">${i}</span>`;
        grid.appendChild(vacio);
    }
}

/* ══════════════════════════════════════════════════════
   SECCIÓN 4: Récords y KPIs (AHORA SOPORTA HORAS)
   ══════════════════════════════════════════════════════ */
const _PERIODOS_RECORDS = [30, 60, 90, 180, 365];

window.navegarPeriodoRecords = function (dir) {
    const idx = _PERIODOS_RECORDS.indexOf(_stats._recordDias || 30);
    const newIdx = Math.max(0, Math.min(_PERIODOS_RECORDS.length - 1, idx + dir));
    _stats._recordDias = _PERIODOS_RECORDS[newIdx];
    _renderRecords();
};

function _renderRecords() {
    if (!_stats._recordDias) _stats._recordDias = 30;
    const dias = _stats._recordDias;

    const el = document.getElementById('label-periodo-records');
    if (el) el.textContent = `Últimos ${dias} días`;

    const d = _datos();
    const reg = d.registro_habitos || {};
    const habitos = _habitosActivos();

    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    const labelEl = (id, texto) => {
        const e = document.getElementById(id);
        if (e && e.previousElementSibling) e.previousElementSibling.textContent = texto;
    };

    // ── LÓGICA ESPECIAL: Si filtras por 1 cronómetro, muestra métricas en "Días y Horas" ──
// ── LÓGICA ESPECIAL: Si filtras por 1 cronómetro, muestra métricas en "Días y Horas" ──
    const esUnicoCronometro = habitos.length === 1 && habitos[0].tipo === 'cronometro';

    if (esUnicoCronometro) {
        const h = habitos[0];
        
        // 🛡️ PRIMER ESCUDO ANTI-NaN: Validamos que la fechaInicio sea real y calculable
        let msActual = 0;
        if (h.fechaInicio) {
            const tiempoInicio = new Date(h.fechaInicio).getTime();
            if (!isNaN(tiempoInicio)) {
                msActual = Math.max(0, Date.now() - tiempoInicio);
            }
        }
        
        let msMejor = msActual;
        let msUltimo = 0;

        if (h.historial && h.historial.length > 0) {
            h.historial.forEach(r => {
                const dur = r.duracionMs || 0;
                if (dur > msMejor) msMejor = dur;
            });
            msUltimo = h.historial[h.historial.length - 1].duracionMs || 0;
        }

        const formatMs = (ms) => {
            // 🛡️ SEGUNDO ESCUDO: Si por alguna razón llega un NaN o negativo, resetea a 0
            if (isNaN(ms) || ms <= 0) return '0d 0h';
            if (ms < 3600000) return '< 1h';
            const dd = Math.floor(ms / 86400000);
            const hh = Math.floor((ms % 86400000) / 3600000);
            return `${dd}d ${hh}h`;
        };

        set('rec-racha-actual', formatMs(msActual));
        set('rec-mejor-racha', formatMs(msMejor));
        set('rec-completados', formatMs(msUltimo));
        set('rec-tasa-exito', '-');

        // Renombrar etiquetas visualmente para darle contexto de reloj
        labelEl('rec-racha-actual', '🔥');
        labelEl('rec-mejor-racha', '🏅');
        labelEl('rec-completados', '✅');
        labelEl('rec-tasa-exito', '🏁');

        return; // Detenemos la función, el cronómetro ya llenó los KPI
    } else {
        // Restaurar textos originales para hábitos estándar
        labelEl('rec-racha-actual', '🔥');
        labelEl('rec-mejor-racha', '🏅');
        labelEl('rec-completados', '✅');
        labelEl('rec-tasa-exito', '🏁');
    }

    // ── LÓGICA NORMAL PARA HÁBITOS ESTÁNDAR ──
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let completadosTotal = 0;
    let diasConDatos = 0;
    let rachaActual = 0;
    let mejorRacha = 0;
    let tempRacha = 0;
    let contandoRacha = true;

    for (let i = 0; i < dias; i++) {
        const f = new Date(hoy);
        f.setDate(hoy.getDate() - i);
        const fFmt = _fmt(f);
        const pct = _pctDiaGlobal(reg, fFmt, habitos);

        if (i === 0 || pct > 0) diasConDatos++;

        if (pct >= 1) {
            completadosTotal++;
            if (contandoRacha) {
                rachaActual++;
            }
            tempRacha++;
            if (tempRacha > mejorRacha) mejorRacha = tempRacha;
        } else {
            if (contandoRacha && i > 0) contandoRacha = false;
            tempRacha = 0;
        }
    }

    const tasaExito = diasConDatos > 0
        ? Math.round((completadosTotal / dias) * 100)
        : 0;

    set('rec-racha-actual', rachaActual);
    set('rec-mejor-racha', mejorRacha);
    set('rec-completados', completadosTotal);
    set('rec-tasa-exito', tasaExito + '%');
}

/* ══════════════════════════════════════════════════════
   SECCIÓN 5: Tabla Semanal (Hábitos × Días)
   ══════════════════════════════════════════════════════ */

window.navegarSemanaTabla = function (dir) {
    _stats.offsetSemana = Math.max(0, _stats.offsetSemana - dir);
    _renderTablaSemanal();
};

window.toggleModoTabla = function () {
    _stats.modoTabla = _stats.modoTabla === 'normal' ? 'compacto' : 'normal';
    _renderTablaSemanal();
};

function _renderTablaSemanal() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diaSemana = hoy.getDay();
    const diasDesdeL = (diaSemana === 0) ? 6 : diaSemana - 1;
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - diasDesdeL - _stats.offsetSemana * 7);

    const dias7 = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(inicioSemana.getDate() + i);
        dias7.push(d);
    }

    const desde = dias7[0];
    const hasta = dias7[6];
    const labelEl = document.getElementById('label-semana-tabla');
    if (labelEl) {
        labelEl.textContent = `${desde.getDate()} a ${hasta.getDate()} de ${_MESES_CORTOS[hasta.getMonth()]}`;
    }

    const d = _datos();
    const reg = d.registro_habitos || {};
    const habitos = _habitosActivos();

    const header = document.getElementById('tabla-semanal-header');
    if (header) {
        const letrasDias = ['L','M','M','J','V','S','D'];
        const hayHoy = dias7.findIndex(f => f.toDateString() === hoy.toDateString());
        header.innerHTML = '<span></span>' + letrasDias.map((l, i) =>
            `<span style="${i === hayHoy ? `color:var(--accent); font-weight:900;` : ''}">${l}</span>`
        ).join('');
    }

    const body = document.getElementById('tabla-semanal-body');
    if (!body) return;
    body.innerHTML = '';

    habitos.forEach(h => {
        const fila = document.createElement('div');
        fila.className = 'tabla-fila-habito';

        const nombre = document.createElement('div');
        nombre.className = 'tabla-fila-nombre';
        nombre.innerHTML = `<span class="t-icono">${h.icono}</span><span class="t-nombre">${h.nombre}</span>`;
        fila.appendChild(nombre);

        dias7.forEach(f => {
            const fFmt = _fmt(f);
            const pct  = _pctDia(reg, fFmt, h);
            const esHoy = f.toDateString() === hoy.toDateString();
            const esFut = f > hoy;

            const circulo = document.createElement('div');
            let clase = 'tabla-dia-circulo';
            let contenido = '';

            if (esFut) {
                clase += ' vacio';
            } else if (pct >= 1) {
                clase += ' completo';
                contenido = '✓';
            } else if (pct > 0) {
                clase += ' parcial';
            } else {
                clase += ' vacio';
            }

            if (esHoy) clase += ' hoy-circulo';

            circulo.className = clase;
            circulo.style.setProperty('--color-habito', h.color);

            if (!esFut) {
                circulo.style.borderColor = pct >= 1 ? h.color : (pct > 0 ? h.color : '');
            }

            if (pct > 0 && pct < 1) {
                const s = 24, sw = 2.5;
                const r2 = (s - sw) / 2;
                const circum = 2 * Math.PI * r2;
                const offset = circum * (1 - pct);
                circulo.innerHTML = `
                    <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="position:absolute;transform:rotate(-90deg)">
                        <circle cx="${s/2}" cy="${s/2}" r="${r2}" fill="none" stroke="${h.color}33" stroke-width="${sw}"/>
                        <circle cx="${s/2}" cy="${s/2}" r="${r2}" fill="none" stroke="${h.color}"
                            stroke-width="${sw}" stroke-linecap="round"
                            stroke-dasharray="${circum.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
                    </svg>`;
            } else {
                circulo.textContent = contenido;
            }

            fila.appendChild(circulo);
        });

        body.appendChild(fila);
    });

    if (!habitos.length) {
        body.innerHTML = '<p style="color:var(--text-lo); font-size:13px; padding:10px 4px;">No hay hábitos para mostrar.</p>';
    }
}

/* ══════════════════════════════════════════════════════
   SECCIÓN 6: Heatmap Anual
   ══════════════════════════════════════════════════════ */

window.navegarAnioHeatmap = function (dir) {
    _stats.offsetAnio = Math.max(0, _stats.offsetAnio - dir);
    _renderHeatmapAnual();
};

function _renderHeatmapAnual() {
    const hoy = new Date();
    const anio = hoy.getFullYear() - _stats.offsetAnio;

    const labelEl = document.getElementById('label-anio-heatmap');
    if (labelEl) labelEl.textContent = anio;

    const d = _datos();
    const reg = d.registro_habitos || {};
    const habitos = _habitosActivos();

    const inicio = new Date(anio, 0, 1);
    const diaSemana = inicio.getDay();
    const ajuste = (diaSemana === 0) ? 6 : diaSemana - 1;
    const primerLunes = new Date(inicio);
    primerLunes.setDate(inicio.getDate() - ajuste);

    const fin = new Date(anio, 11, 31);

    const semanas = [];
    let cursor = new Date(primerLunes);
    while (cursor <= fin || semanas.length < 53) {
        const semana = [];
        for (let i = 0; i < 7; i++) {
            semana.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        semanas.push(semana);
        if (cursor.getFullYear() > anio && semanas.length >= 52) break;
    }

    const mesesLabel = document.getElementById('heatmap-meses-label');
    if (mesesLabel) {
        let html = '';
        let mesActual = -1;
        semanas.forEach(semana => {
            const mes = semana[0].getMonth();
            if (mes !== mesActual && semana[0].getFullYear() === anio) {
                html += `<span class="heatmap-mes-span">${_MESES_CORTOS[mes]}</span>`;
                mesActual = mes;
            }
        });
        mesesLabel.innerHTML = html;
    }

    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    grid.innerHTML = '';

    semanas.forEach(semana => {
        const colDiv = document.createElement('div');
        colDiv.className = 'heatmap-semana';

        semana.forEach(f => {
            const celda = document.createElement('div');
            const esFut = f > hoy;
            const esAnio = f.getFullYear() === anio;

            if (!esAnio || esFut) {
                celda.className = 'heatmap-celda vacio';
            } else {
                const pct = _pctDiaGlobal(reg, _fmt(f), habitos);
                let nivel;
                if (pct === 0)        nivel = 0;
                else if (pct < 0.25)  nivel = 1;
                else if (pct < 0.5)   nivel = 2;
                else if (pct < 1)     nivel = 3;
                else                  nivel = 4;
                celda.className = `heatmap-celda nivel-${nivel}`;
            }

            celda.title = `${f.getDate()} ${_MESES_CORTOS[f.getMonth()]} ${f.getFullYear()}`;
            colDiv.appendChild(celda);
        });

        grid.appendChild(colDiv);
    });
}

/* ══════════════════════════════════════════════════════
   FILTRO DE HÁBITOS
   ══════════════════════════════════════════════════════ */
let _selFiltroTemp = null;

function _renderFiltroLabel() {
    const el = document.getElementById('stats-filtro-valor');
    if (!el) return;
    const habitos = _datos().habitos || [];
    if (!_stats.habitosFiltrados || _stats.habitosFiltrados.length === habitos.length) {
        el.textContent = 'Todos los hábitos';
    } else if (_stats.habitosFiltrados.length === 1) {
        const h = habitos.find(x => x.id === _stats.habitosFiltrados[0]);
        el.textContent = h ? `${h.icono} ${h.nombre}` : '1 hábito';
    } else {
        el.textContent = `${_stats.habitosFiltrados.length} hábitos`;
    }
}

window.toggleFiltroHabitos = function () {
    const modal = document.getElementById('modal-filtro-habitos-stats');
    if (!modal) return;

    const habitos = (_datos().habitos || []);
    _selFiltroTemp = _stats.habitosFiltrados ? [..._stats.habitosFiltrados] : habitos.map(h => h.id);

    const lista = document.getElementById('lista-filtro-habitos-stats');
    if (lista) {
        lista.innerHTML = `
            <button onclick="window.deseleccionarTodosFiltro()" 
                style="width:100%; padding:8px; margin-bottom:10px; border:1px dashed var(--border-card); border-radius:8px; background:none; color:var(--text-lo); font-size:12px; cursor:pointer; transition:color 0.15s;"
                onmouseover="this.style.color='var(--status-danger)'" onmouseout="this.style.color='var(--text-lo)'">
                ✕ Deseleccionar todos
            </button>` +
            habitos.map(h => `
            <div class="filtro-habito-item ${_selFiltroTemp.includes(h.id) ? 'seleccionado' : ''}"
                 onclick="window._toggleHabitoFiltro(${h.id}, this)">
                <div class="filtro-habito-check">${_selFiltroTemp.includes(h.id) ? '✓' : ''}</div>
                <span class="filtro-habito-icono">${h.icono}</span>
                <span class="filtro-habito-nombre">${h.nombre}</span>
            </div>`
        ).join('');
    }
    modal.style.display = 'flex';
};

window.deseleccionarTodosFiltro = function () {
    _selFiltroTemp = [];
    const lista = document.getElementById('lista-filtro-habitos-stats');
    if (lista) {
        lista.querySelectorAll('.filtro-habito-item').forEach(el => {
            el.classList.remove('seleccionado');
            el.querySelector('.filtro-habito-check').textContent = '';
        });
    }
};

window._toggleHabitoFiltro = function (id, el) {
    const idx = _selFiltroTemp.indexOf(id);
    if (idx >= 0) {
        _selFiltroTemp.splice(idx, 1);
        el.classList.remove('seleccionado');
        el.querySelector('.filtro-habito-check').textContent = '';
    } else {
        _selFiltroTemp.push(id);
        el.classList.add('seleccionado');
        el.querySelector('.filtro-habito-check').textContent = '✓';
    }
};

window.cerrarFiltroHabitos = function () {
    const modal = document.getElementById('modal-filtro-habitos-stats');
    if (modal) modal.style.display = 'none';
};

window.aplicarFiltroHabitos = function () {
    const habitos = (_datos().habitos || []);
    _stats.habitosFiltrados = (_selFiltroTemp.length === habitos.length) ? null : [..._selFiltroTemp];
    window.cerrarFiltroHabitos();
    _renderTodo();
};

window.volverAHabitos = function () {
    if (typeof cargarVista === 'function') {
        cargarVista('habitos');
    }
};