// =========================================================================
// MÓDULO CLIENTES — clientes.js
// Dashboard analítico, filtros temporales, gráficos y control de caja.
// =========================================================================

let clienteActualId = null;
let proyectoActualId = null; // <--- NUEVO: Control de pestañas de proyectos

// Estado de filtros y ordenamiento
let filtroVideoTexto  = '';
let filtroVideoEstado = 'todos';
let ordenVideoColumna = 'numero';
let ordenVideoDireccion = 'asc';

// Variables para los filtros temporales
let filtroGlobalClientes = null;
let mesSeleccionadoCliente = null;

// Variables para destruir los gráficos previos y no saturar memoria
let chartIngresosCli = null;
let chartVideosCli = null;
let chartPastelCli = null;


// ─── LÓGICA DE MIGRACIÓN (Sin dañar BD) ────────────────────────────────
function asegurarMigracionProyectos(cliente) {
    if (!cliente.proyectos || cliente.proyectos.length === 0) {
        const idPorDefecto = 'proj_' + Date.now();
        cliente.proyectos = [{
            id: idPorDefecto,
            nombre: cliente.proyecto || 'Proyecto Principal'
        }];
        // Etiquetamos los videos y pagos antiguos para que pertenezcan a este proyecto
        if (cliente.videos) cliente.videos.forEach(v => { if (!v.id_proyecto) v.id_proyecto = idPorDefecto; });
        if (cliente.pagos) cliente.pagos.forEach(p => { if (!p.id_proyecto) p.id_proyecto = idPorDefecto; });
        
        // Guardar la migración automáticamente
        const datos = cargarDatos();
        const idx = datos.clientes.findIndex(c => c.id === cliente.id);
        if(idx !== -1) {
            datos.clientes[idx] = cliente;
            guardarDatos(datos);
        }
    }
}

// ─── Inicialización ────────────────────────────────────────────────────
window.inicializarClientes = function () {
    document.getElementById('vista-lista-clientes').style.display = 'block';
    document.getElementById('vista-panel-cliente').style.display  = 'none';
    
    if (!filtroGlobalClientes) {
        const hoy = new Date();
        filtroGlobalClientes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    }

    renderizarListaClientes();
};

// ─── Utilidades de Fechas y UI ─────────────────────────────────────────
function obtenerMesesDisponibles(clienteId = null) {
    const datos = cargarDatos();
    const meses = new Set();
    const hoy = new Date();
    meses.add(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`);
    
    const clientes = clienteId ? datos.clientes.filter(c => c.id === clienteId) : (datos.clientes || []);
    
    clientes.forEach(c => {
        (c.pagos || []).forEach(p => {
            if (p.fecha) {
                const d = new Date(p.fecha + 'T00:00:00');
                if (!isNaN(d)) meses.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }
        });
        (c.videos || []).forEach(v => {
            const fStr = v.fecha_entrega || v.fecha_pago || v.fecha_recibido || (v.ultima_edicion ? v.ultima_edicion.split('T')[0] : null);
            if (fStr) {
                const d = new Date(fStr + 'T00:00:00');
                if (!isNaN(d)) meses.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }
        });
    });
    
    return Array.from(meses).sort((a, b) => b.localeCompare(a));
}

function formatearMes(yyyy_mm) {
    if (yyyy_mm === 'all') return 'Todo el histórico';
    if (!yyyy_mm.includes('-')) return `Año ${yyyy_mm}`;
    const [y, m] = yyyy_mm.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${meses[parseInt(m, 10) - 1]} ${y}`;
}

function formatK(num) {
    if (!num || num === 0) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1_000)     return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
}

function formatFecha(str) {
    if (!str) return '—';
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const d = new Date(str + 'T00:00:00');
    if (isNaN(d)) return '—';
    return `${d.getDate()} ${meses[d.getMonth()]}`;
}

function formatFechaHora(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${d.getDate()} ${meses[d.getMonth()]} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function obtenerBandera(pais) {
    if (!pais) return '';
    const p = pais.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const codigos = { espana:'es', colombia:'co', mexico:'mx', argentina:'ar', chile:'cl', peru:'pe', venezuela:'ve', ecuador:'ec', bolivia:'bo', paraguay:'py', uruguay:'uy', 'estados unidos':'us', usa:'us', eeuu:'us', panama:'pa', 'costa rica':'cr', 'republica dominicana':'do', guatemala:'gt', honduras:'hn', 'el salvador':'sv', nicaragua:'ni', 'puerto rico':'pr', cuba:'cu', brasil:'br', canada:'ca', italia:'it', francia:'fr', alemania:'de', 'reino unido':'gb', inglaterra:'gb' };
    const iso = codigos[p];
    return iso ? `<img src="https://flagcdn.com/20x15/${iso}.png" alt="${pais}" style="width:16px;height:auto;border-radius:2px;vertical-align:middle;margin-left:5px">` : '';
}

function inicialesToAvatar(nombre, size = 44, fontSize = 16) {
    const iniciales = nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const colores = [ ['rgba(66,39,214,.22)','#a78bfa'], ['rgba(16,185,129,.18)','#34d399'], ['rgba(245,158,11,.18)','#fbbf24'], ['rgba(231,76,60,.15)', '#f87171'], ['rgba(59,130,246,.18)','#93c5fd'], ['rgba(236,72,153,.15)','#f9a8d4'] ];
    const idx = nombre.charCodeAt(0) % colores.length;
    const [bg, color] = colores[idx];
    return `style="width:${size}px;height:${size}px;font-size:${fontSize}px;background:${bg};color:${color}" data-iniciales="${iniciales}"`;
}


// ─── Lógica del Filtro Temporal ────────────────────────────────────────
window.cambiarFiltroGlobal = function(valor) { 
    filtroGlobalClientes = valor; 
    renderizarListaClientes(); 
};
window.cambiarMesCliente = function(mes) { 
    mesSeleccionadoCliente = mes; 
    renderizarKpisCliente(); 
};

function construirOpcionesFiltroGlobal() {
    const datos = cargarDatos();
    const clientes = datos.clientes || [];
    const meses = new Set();
    const anos = new Set();
    const hoy = new Date();
    
    meses.add(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`);
    anos.add(`${hoy.getFullYear()}`);

    clientes.forEach(c => {
        (c.pagos || []).forEach(p => {
            if (p.fecha) {
                const d = new Date(p.fecha + 'T00:00:00');
                if (!isNaN(d)) {
                    meses.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    anos.add(`${d.getFullYear()}`);
                }
            }
        });
        (c.videos || []).forEach(v => {
            const fStr = v.fecha_entrega || v.fecha_pago || v.fecha_recibido || (v.ultima_edicion ? v.ultima_edicion.split('T')[0] : null);
            if (fStr) {
                const d = new Date(fStr + 'T00:00:00');
                if (!isNaN(d)) {
                    meses.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    anos.add(`${d.getFullYear()}`);
                }
            }
        });
    });

    let html = `<option value="all" ${filtroGlobalClientes === 'all' ? 'selected' : ''}>🌍 Todo el histórico</option>`;
    
    Array.from(anos).sort((a,b) => b - a).forEach(a => {
        html += `<option value="${a}" ${filtroGlobalClientes === a ? 'selected' : ''}>📅 Año ${a}</option>`;
    });

    html += `<option disabled>──────────</option>`;

    Array.from(meses).sort((a,b) => b.localeCompare(a)).forEach(m => {
        html += `<option value="${m}" ${filtroGlobalClientes === m ? 'selected' : ''}>${formatearMes(m)}</option>`;
    });

    return html;
}

// ─── Cálculo de métricas Globales y Gráficos (Dashboard Intacto) ────────────
function calcularMetricasGlobales() {
    const datos    = cargarDatos();
    const clientes = datos.clientes || [];
    
    let matchActual = () => false;
    let matchAnterior = () => false;
    let textoComparativo = '';

    if (filtroGlobalClientes === 'all') {
        matchActual = () => true;
        matchAnterior = () => false;
        textoComparativo = '';
    } else if (filtroGlobalClientes.length === 4) {
        const y = parseInt(filtroGlobalClientes, 10);
        matchActual = (f) => f.getFullYear() === y;
        matchAnterior = (f) => f.getFullYear() === y - 1;
        textoComparativo = 'vs año ant.';
    } else {
        const [yStr, mStr] = filtroGlobalClientes.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10) - 1;
        matchActual = (f) => f.getFullYear() === y && f.getMonth() === m;
        
        let prevM = m === 0 ? 11 : m - 1;
        let prevY = m === 0 ? y - 1 : y;
        matchAnterior = (f) => f.getFullYear() === prevY && f.getMonth() === prevM;
        textoComparativo = 'vs mes ant.';
    }

    let ingresosAct = 0, ingresosAnt = 0;
    let entregadosAct = 0, entregadosAnt = 0;
    let totalPendientes = 0, totalActivos = 0;
    const clientesConPend = new Set();
    const clientesActivosPeriodo = new Set();

    let dataIngresosDiarios = {};
    let dataVideosDiarios = {};
    let dataPastelClientes = {};

    const stats = clientes.map(cliente => {
        let ingMesAct = 0, ingMesAnt = 0;
        let pendientes = 0, sinEmpezar = 0, enCurso = 0;
        let totalPagado = 0, totalConsumido = 0;
        let tuvoActividadEnPeriodo = false;
        
        let ultimaFecha = new Date(cliente.fecha_creacion || 0).getTime();

        (cliente.pagos || []).forEach(p => {
            const monto = parseFloat(p.monto) || 0;
            totalPagado += monto;
            const f = new Date(p.fecha + 'T00:00:00');
            if (!isNaN(f)) {
                if (f.getTime() > ultimaFecha) ultimaFecha = f.getTime();
                if (matchActual(f)) tuvoActividadEnPeriodo = true;
            }
        });

        (cliente.videos || []).forEach(v => {
            const cobrado = (v.finanzas?.inversion || 0) + (v.finanzas?.bono || 0);

            if (v.estado === 'sin_empezar') { sinEmpezar++; pendientes++; totalPendientes++; clientesConPend.add(cliente.id); }
            else if (v.estado === 'en_curso') { enCurso++; pendientes++; totalPendientes++; clientesConPend.add(cliente.id); }
            else if (v.estado === 'listo') { totalConsumido += cobrado; }

            const strFecha = v.fecha_entrega || v.fecha_pago || v.fecha_recibido || (v.ultima_edicion ? v.ultima_edicion.split('T')[0] : null);
            if (strFecha) {
                const f = new Date(strFecha + 'T00:00:00');
                if (!isNaN(f) && f.getTime() > ultimaFecha) ultimaFecha = f.getTime();

                if (v.estado === 'listo') {
                    if (matchActual(f)) {
                        entregadosAct++;
                        ingresosAct += cobrado;
                        ingMesAct += cobrado;
                        tuvoActividadEnPeriodo = true;
                        
                        dataVideosDiarios[strFecha] = (dataVideosDiarios[strFecha] || 0) + 1;
                        dataIngresosDiarios[strFecha] = (dataIngresosDiarios[strFecha] || 0) + cobrado;
                    } else if (matchAnterior(f)) {
                        entregadosAnt++;
                        ingresosAnt += cobrado;
                        ingMesAnt += cobrado;
                    }
                }
            }
        });

        const diffDias = (Date.now() - ultimaFecha) / (1000 * 60 * 60 * 24);
        const inactivo = (pendientes === 0 && diffDias > 30);
        
        if (tuvoActividadEnPeriodo || !inactivo) {
            totalActivos++;
        }

        if (ingMesAct > 0) {
            dataPastelClientes[cliente.nombre] = ingMesAct;
        }

        let tendenciaClase = '', tendenciaTexto = '— Igual';
        if (ingMesAnt === 0 && ingMesAct > 0) { tendenciaClase = 'sube'; tendenciaTexto = '↑ Nuevo'; }
        else if (ingMesAct > ingMesAnt) { tendenciaClase = 'sube'; tendenciaTexto = `↑ +${(((ingMesAct - ingMesAnt) / ingMesAnt) * 100).toFixed(0)}%`; }
        else if (ingMesAct < ingMesAnt) { tendenciaClase = 'baja'; tendenciaTexto = `↓ −${(((ingMesAnt - ingMesAct) / ingMesAnt) * 100).toFixed(0)}%`; }

        return {
            id: cliente.id, nombre: cliente.nombre, proyecto: cliente.proyecto, foto: cliente.foto, pais: cliente.pais,
            totalVideos: (cliente.videos || []).length, pendientes, sinEmpezar, enCurso, 
            ingMesAct, tendenciaClase, tendenciaTexto, textoComparativo,
            balance: totalPagado - totalConsumido, inactivo
        };
    });

    const pctIng = ingresosAnt > 0 ? (((ingresosAct - ingresosAnt) / ingresosAnt) * 100).toFixed(0) : null;
    const pctEnt = entregadosAnt > 0 ? (((entregadosAct - entregadosAnt) / entregadosAnt) * 100).toFixed(0) : null;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setClass = (id, cls) => { const el = document.getElementById(id); if (el) el.className = 'kpi-card-vs ' + cls; };

    set('kpi-global-ingresos', `$${ingresosAct.toFixed(2)}`);
    set('kpi-global-ingresos-vs', pctIng !== null ? `${pctIng >= 0 ? '↑ +' : '↓ '}${Math.abs(pctIng)}% ${textoComparativo}` : (textoComparativo ? 'Sin datos ant.' : 'Acumulado total'));
    setClass('kpi-global-ingresos-vs', pctIng === null ? '' : pctIng >= 0 ? 'sube' : 'baja');

    set('kpi-global-entregados', entregadosAct);
    set('kpi-global-entregados-vs', pctEnt !== null ? `${pctEnt >= 0 ? '↑ +' : '↓ '}${Math.abs(pctEnt)}% ${textoComparativo}` : (textoComparativo ? 'Sin datos ant.' : 'Acumulado total'));
    setClass('kpi-global-entregados-vs', pctEnt === null ? '' : pctEnt >= 0 ? 'sube' : 'baja');

    set('kpi-global-pendientes', totalPendientes);
    set('kpi-global-pendientes-clientes', `en ${clientesConPend.size} cliente${clientesConPend.size !== 1 ? 's' : ''}`);
    set('kpi-global-activos', totalActivos);
    
    renderizarGraficosDashboard(dataIngresosDiarios, dataVideosDiarios, dataPastelClientes);

    return stats.sort((a, b) => b.ingMesAct - a.ingMesAct);
}

// ─── Generación de los Gráficos (Chart.js) ──────────────────────────────
function renderizarGraficosDashboard(ingresosMap, videosMap, pastelMap) {
    if (typeof Chart === 'undefined') return;

    const colAccent = '#a78bfa'; 
    const colOk = '#34d399'; 
    const bgAccent = 'rgba(167, 139, 250, 0.15)'; 
    const colText = '#9ca3af'; 
    const colGrid = 'rgba(255,255,255,0.05)';

    let fechasRaw = Array.from(new Set([...Object.keys(ingresosMap), ...Object.keys(videosMap)])).sort();
    
    if (fechasRaw.length === 0) {
        fechasRaw.push(new Date().toISOString().split('T')[0]);
    } else {
        let minDateStr = fechasRaw[0];
        let maxDateStr = fechasRaw[fechasRaw.length - 1];

        if (filtroGlobalClientes && filtroGlobalClientes.length === 7 && filtroGlobalClientes.includes('-')) {
            const [y, m] = filtroGlobalClientes.split('-');
            minDateStr = `${y}-${m}-01`; 
            
            const lastDay = new Date(y, m, 0).getDate();
            const hoy = new Date();
            const esMesActual = hoy.getFullYear() === parseInt(y) && (hoy.getMonth() + 1) === parseInt(m);
            
            const diaFin = esMesActual ? hoy.getDate() : lastDay;
            maxDateStr = `${y}-${m}-${String(diaFin).padStart(2, '0')}`;
        }

        const minDate = new Date(minDateStr + 'T00:00:00');
        const maxDate = new Date(maxDateStr + 'T00:00:00');
        
        if (!isNaN(minDate) && !isNaN(maxDate)) {
            const diffDias = Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24));
            
            if (diffDias >= 0 && diffDias <= 730) {
                const fechasCompletas = [];
                let currentDate = new Date(minDate);
                
                while (currentDate <= maxDate) {
                    const yyyy = currentDate.getFullYear();
                    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(currentDate.getDate()).padStart(2, '0');
                    fechasCompletas.push(`${yyyy}-${mm}-${dd}`);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                fechasRaw = fechasCompletas;
            }
        }
    }

    const labelsFechas = fechasRaw.map(f => { const p = f.split('-'); return `${p[2]}/${p[1]}`; });
    const dataIngresos = fechasRaw.map(f => ingresosMap[f] || 0);
    const dataVideos   = fechasRaw.map(f => videosMap[f] || 0);

    const pastelLabels = Object.keys(pastelMap);
    const pastelData = Object.values(pastelMap);
    const pastelColors = ['#a78bfa', '#34d399', '#f87171', '#60a5fa', '#fbbf24', '#f472b6', '#2dd4bf', '#a3e635', '#22d3ee'];

    const opcionesBaseAxis = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, color: colText } },
            y: { border: { dash: [4, 4] }, grid: { color: colGrid }, ticks: { font: { size: 10 }, color: colText }, beginAtZero: true }
        }
    };

    if (window.chartIngresosCli) window.chartIngresosCli.destroy();
    const ctxIng = document.getElementById('chart-clientes-ingresos');
    if (ctxIng) {
        window.chartIngresosCli = new Chart(ctxIng, {
            type: 'line',
            data: { labels: labelsFechas, datasets: [{ label: 'Ingresos por Videos ($)', data: dataIngresos, borderColor: colAccent, backgroundColor: bgAccent, borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: colAccent }] },
            options: opcionesBaseAxis
        });
    }

    if (window.chartVideosCli) window.chartVideosCli.destroy();
    const ctxVid = document.getElementById('chart-clientes-videos');
    if (ctxVid) {
        window.chartVideosCli = new Chart(ctxVid, {
            type: 'bar',
            data: { labels: labelsFechas, datasets: [{ label: 'Videos Entregados', data: dataVideos, backgroundColor: colOk, borderRadius: 4, barPercentage: 0.5 }] },
            options: { ...opcionesBaseAxis, scales: { ...opcionesBaseAxis.scales, y: { ...opcionesBaseAxis.scales.y, ticks: { stepSize: 1, font: { size: 10 }, color: colText } } } }
        });
    }

if (window.chartPastelCli) window.chartPastelCli.destroy();
    const ctxPas = document.getElementById('chart-clientes-pastel');
    if (ctxPas) {
        ctxPas.parentElement.style.position = 'relative';
        ctxPas.parentElement.style.minHeight = '180px'; 
        ctxPas.parentElement.style.maxHeight = '230px'; 
        ctxPas.parentElement.style.width = '100%';

        window.chartPastelCli = new Chart(ctxPas, {
            type: 'doughnut',
            data: { labels: pastelLabels.length > 0 ? pastelLabels : ['Sin datos'], datasets: [{ data: pastelData.length > 0 ? pastelData : [1], backgroundColor: pastelData.length > 0 ? pastelColors : ['#374151'], borderWidth: 0, hoverOffset: 4 }] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: '70%', 
                layout: {
                    padding: 10
                },
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { color: colText, font: { size: 10 }, boxWidth: 10, padding: 10 } 
                    }, 
                    tooltip: { enabled: pastelData.length > 0 } 
                } 
            }
        });
    }
}

// ─── Render: lista de clientes ──────────────────────────────────────────
function renderizarListaClientes() {
    const contenedor = document.getElementById('lista-clientes-grid');
    if (!contenedor) return;

    const selectFiltro = document.getElementById('filtro-global-clientes');
    if (selectFiltro) {
        selectFiltro.innerHTML = construirOpcionesFiltroGlobal();
    }

    const stats = calcularMetricasGlobales();

    if (stats.length === 0) {
        contenedor.innerHTML = `<div class="estado-vacio"><i class="ti ti-users" aria-hidden="true"></i> No tienes clientes aún. Haz clic en <strong>Nuevo cliente</strong> para empezar.</div>`;
        return;
    }

    contenedor.innerHTML = stats.map(c => {
        const imgOAvatar = c.foto
            ? `<img src="${c.foto}" alt="${c.nombre}" class="cliente-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="cliente-avatar" ${inicialesToAvatar(c.nombre).replace('style="', 'style="display:none;')}>${c.nombre.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}</div>`
            : `<div class="cliente-avatar" ${inicialesToAvatar(c.nombre)}>${c.nombre.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}</div>`;

        let badgeClase, badgeTxt;
        if (c.pendientes === 0) {
            if (c.inactivo) {
                badgeClase = 'inactivo'; badgeTxt = 'Inactivo';
            } else {
                badgeClase = 'aldia'; badgeTxt = 'Al día'; 
            }
        } else {
            let detalles = [];
            if (c.enCurso > 0) detalles.push(`${c.enCurso} en curso`);
            if (c.sinEmpezar > 0) detalles.push(`${c.sinEmpezar} sin empezar`);
            badgeClase = c.pendientes <= 2 ? 'pendiente' : 'atrasado'; 
            badgeTxt = detalles.join(', ');
        }

        let badgeBalance;
        if (c.balance > 0) badgeBalance = `<div style="font-size:10px; color:var(--status-danger); font-weight:700; margin-top:4px">Consignación: $${c.balance.toFixed(2)}</div>`;
        else if (c.balance < 0) badgeBalance = `<div style="font-size:10px; color:var(--status-ok); font-weight:700; margin-top:4px">Por cobrar: $${Math.abs(c.balance).toFixed(2)}</div>`;
        else badgeBalance = `<div style="font-size:10px; color:var(--text-lo); font-weight:700; margin-top:4px">Balance al día</div>`;

        return `
        <div class="cliente-card-horizontal" onclick="window.abrirPanelCliente(${c.id})">
            ${imgOAvatar}
            <div style="min-width:0">
                <div class="cliente-nombre">${c.nombre}${obtenerBandera(c.pais)}</div>
                <div class="cliente-proyecto">${c.proyecto || 'Edición de videos'}</div>
            </div>
            <div class="cliente-col-dinero">
                <div class="cliente-monto" title="Ingresos en el periodo (Videos entregados)">$${c.ingMesAct.toFixed(2)}</div>
                <div class="cliente-metrica ${c.tendenciaClase}">${c.tendenciaTexto} ${c.textoComparativo}</div>
                ${badgeBalance}
            </div>
            <div class="cliente-col-videos">
                <div class="videos-num">${c.totalVideos}</div>
                <div class="videos-lbl">videos totales</div>
            </div>
            <div class="cliente-col-estado">
                <span class="badge-estado ${badgeClase}">${badgeTxt}</span>
            </div>
            <div class="cliente-col-acciones" onclick="event.stopPropagation()">
                <div class="btn-accion-mini primary" title="Ver panel" onclick="window.abrirPanelCliente(${c.id})"><i class="ti ti-eye" aria-hidden="true"></i></div>
                <div class="btn-accion-mini" title="Editar" onclick="window.abrirModalEdicion(${c.id})"><i class="ti ti-pencil" aria-hidden="true"></i></div>
                <div class="btn-accion-mini danger" title="Eliminar" onclick="window.borrarCliente(${c.id})"><i class="ti ti-trash" aria-hidden="true"></i></div>
            </div>
        </div>`;
    }).join('');
}

// ─── Navegación: panel del cliente y KPIs ──────────────────────────────
window.abrirPanelCliente = function (id) {
    clienteActualId   = id;
    filtroVideoTexto  = ''; filtroVideoEstado = 'todos'; ordenVideoColumna = 'numero'; ordenVideoDireccion = 'asc';
    mesSeleccionadoCliente = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const datos   = cargarDatos();
    const cliente = datos.clientes.find(c => c.id === id);
    if (!cliente) return;

    // --- MIGRACIÓN DE PROYECTOS Y SELECCIÓN AUTOMÁTICA ---
    asegurarMigracionProyectos(cliente);
    if(!proyectoActualId || !cliente.proyectos.find(p => p.id === proyectoActualId)) {
        proyectoActualId = cliente.proyectos[0].id;
    }

    document.getElementById('vista-lista-clientes').style.display = 'none';
    document.getElementById('vista-panel-cliente').style.display  = 'block';

    document.getElementById('titulo-panel-cliente').textContent = cliente.nombre;
    // Ahora mostramos la cantidad de proyectos creados para este cliente
    document.getElementById('panel-ch-meta').textContent = `${cliente.proyectos.length} proyecto(s) · ${cliente.pais || ''}`;

    const avatarEl = document.getElementById('panel-avatar');
    if (avatarEl) {
        const avAttrs = inicialesToAvatar(cliente.nombre, 52, 18);
        const avAttrsHidden = avAttrs.replace('style="', 'style="display:none;');
        const inicialesLetras = cliente.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        avatarEl.outerHTML = cliente.foto
            ? `<div id="panel-avatar" class="cliente-avatar" style="width:52px;height:52px;font-size:18px;flex-shrink:0;position:relative;border-radius:50%"><img src="${cliente.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="cliente-avatar" ${avAttrsHidden}>${inicialesLetras}</div></div>`
            : `<div id="panel-avatar" class="cliente-avatar" ${avAttrs}>${inicialesLetras}</div>`;
    }

    const selectMesCliente = document.getElementById('filtro-mes-cliente');
    if (selectMesCliente) {
        const meses = obtenerMesesDisponibles(cliente.id);
        if (!meses.includes(mesSeleccionadoCliente)) meses.unshift(mesSeleccionadoCliente);
        selectMesCliente.innerHTML = meses.map(m => `<option value="${m}" ${m === mesSeleccionadoCliente ? 'selected' : ''}>${formatearMes(m)}</option>`).join('');
    }

    renderizarTabsProyectos();
    renderizarKpisCliente();
    const inp = document.getElementById('buscar-video-notion'); if (inp) inp.value = '';
    actualizarPills();
    renderizarTablaVideos();
};

window.cerrarPanelCliente = function () {
    clienteActualId = null;
    proyectoActualId = null;
    document.getElementById('vista-panel-cliente').style.display  = 'none';
    document.getElementById('vista-lista-clientes').style.display = 'block';
    renderizarListaClientes();
};

window.renderizarKpisCliente = function() {
    const datos   = cargarDatos();
    const cliente = datos.clientes.find(c => c.id === clienteActualId);
    if (!cliente) return;

    if (!mesSeleccionadoCliente) mesSeleccionadoCliente = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const [ySel, mSel] = mesSeleccionadoCliente.split('-');
    const mesAct  = parseInt(mSel, 10) - 1; const anoAct  = parseInt(ySel, 10);

    let ingMes = 0, totalPagado = 0, totalConsumido = 0, entregados = 0, pendientes = 0;

    // Solo sumar pagos para el balance DEL PROYECTO ACTUAL
    (cliente.pagos || []).filter(p => p.id_proyecto === proyectoActualId).forEach(p => {
        const monto = parseFloat(p.monto) || 0;
        totalPagado += monto;
    });

    // Sumar ingresos desde los videos "listos" DEL PROYECTO ACTUAL
    (cliente.videos || []).filter(v => v.id_proyecto === proyectoActualId).forEach(v => {
        const cobrado = (v.finanzas?.inversion || 0) + (v.finanzas?.bono || 0);
        
        if (v.estado === 'listo') { 
            entregados++; 
            totalConsumido += cobrado; 
            
            const strFecha = v.fecha_entrega || v.fecha_pago || v.fecha_recibido || (v.ultima_edicion ? v.ultima_edicion.split('T')[0] : null);
            if (strFecha) {
                const f = new Date(strFecha + 'T00:00:00');
                if (!isNaN(f) && f.getMonth() === mesAct && f.getFullYear() === anoAct) {
                    ingMes += cobrado;
                }
            }
        } else { 
            pendientes++; 
        }
    });
    
    const balance = totalPagado - totalConsumido;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('pkpi-mes', `$${ingMes.toFixed(2)}`);
    set('pkpi-entregados', entregados);
    set('pkpi-pendientes', pendientes);
    
    const balEl = document.getElementById('pkpi-balance');
    const balLbl = document.getElementById('pkpi-balance-label');
    const caja = document.getElementById('caja-kpi-balance');
    if (balEl && balLbl && caja) {
        if (balance > 0) {
            balEl.textContent = `$${balance.toFixed(2)}`; balEl.style.color = 'var(--status-danger)'; balLbl.textContent = 'Consignación';
            caja.style.borderColor = 'color-mix(in srgb, var(--status-danger) 30%, transparent)'; caja.style.background = 'color-mix(in srgb, var(--status-danger) 5%, transparent)';
        } else if (balance < 0) {
            balEl.textContent = `$${Math.abs(balance).toFixed(2)}`; balEl.style.color = 'var(--status-ok)'; balLbl.textContent = 'Por cobrar';
            caja.style.borderColor = 'color-mix(in srgb, var(--status-ok) 30%, transparent)'; caja.style.background = 'color-mix(in srgb, var(--status-ok) 5%, transparent)';
        } else {
            balEl.textContent = `$0.00`; balEl.style.color = 'var(--text-hi)'; balLbl.textContent = 'Balance en cero';
            caja.style.borderColor = 'var(--border-card)'; caja.style.background = 'var(--bg-card)';
        }
    }
};

// ─── Pestañas de Proyectos (CRUD Visual) ────────────────────────────────
window.renderizarTabsProyectos = function() {
    const datos = cargarDatos();
    const cliente = datos.clientes.find(c => c.id === clienteActualId);
    if (!cliente || !cliente.proyectos) return;

    const cont = document.getElementById('tabs-proyectos-container');
    if (!cont) return;

    let html = cliente.proyectos.map(p => {
        const isActive = p.id === proyectoActualId;
        return `
        <button class="btn-notion-pill ${isActive ? 'active' : ''}" style="font-size:12px; padding:6px 14px; display:inline-flex; align-items:center; gap:6px; border-radius:6px; border-style:${isActive ? 'solid' : 'dashed'}; border-width: 1px;" onclick="window.seleccionarProyecto('${p.id}')">
            <i class="ti ti-folder" aria-hidden="true"></i> ${p.nombre}
            ${isActive ? `<i class="ti ti-pencil" onclick="event.stopPropagation(); window.abrirModalProyecto('${p.id}')" style="margin-left:4px; opacity:0.6; cursor:pointer;" title="Editar Nombre"></i>` : ''}
        </button>`;
    }).join('');

    html += `<button class="btn-notion-pill" style="border-style:dashed; border-width: 1px; font-size:12px; padding:6px 14px; border-radius:6px; background:transparent;" onclick="window.abrirModalProyecto()">
        <i class="ti ti-plus" aria-hidden="true"></i> Nuevo...
    </button>`;

    cont.innerHTML = html;
};

window.seleccionarProyecto = function(id) {
    proyectoActualId = id;
    renderizarTabsProyectos();
    renderizarKpisCliente();
    renderizarTablaVideos();
};

window.abrirModalProyecto = function(id = null) {
    document.getElementById('p-id-edit').value = id || '';
    if (id) {
        const datos = cargarDatos();
        const cliente = datos.clientes.find(c => c.id === clienteActualId);
        const proj = cliente.proyectos.find(p => p.id === id);
        document.getElementById('p-nombre').value = proj ? proj.nombre : '';
        document.getElementById('modal-proyecto-titulo').textContent = 'Editar Proyecto';
    } else {
        document.getElementById('p-nombre').value = '';
        document.getElementById('modal-proyecto-titulo').textContent = 'Nuevo Proyecto';
    }
    document.getElementById('modal-proyecto').style.display = 'flex';
};

window.guardarProyecto = function() {
    const nombre = document.getElementById('p-nombre').value.trim();
    if (!nombre) return alert('Ingresa un nombre para el proyecto.');

    const idEdit = document.getElementById('p-id-edit').value;
    const datos = cargarDatos();
    const cliente = datos.clientes.find(c => c.id === clienteActualId);

    if (idEdit) {
        const proj = cliente.proyectos.find(p => p.id === idEdit);
        if (proj) proj.nombre = nombre;
    } else {
        const nuevoId = 'proj_' + Date.now();
        cliente.proyectos.push({ id: nuevoId, nombre });
        proyectoActualId = nuevoId; 
    }
    
    guardarDatos(datos);
    document.getElementById('modal-proyecto').style.display = 'none';
    
    // Actualizamos las vistas
    document.getElementById('panel-ch-meta').textContent = `${cliente.proyectos.length} proyecto(s) · ${cliente.pais || ''}`;
    renderizarTabsProyectos();
    renderizarKpisCliente();
    renderizarTablaVideos();
};


// ─── Pagos y Adelantos (El Banco) ───────────────────────────────────────
window.abrirModalPago = function() {
    document.getElementById('pago-monto').value = '';
    const hoy = new Date();
    document.getElementById('pago-fecha').value = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
    document.getElementById('pago-nota').value = '';
    document.getElementById('modal-pago').style.display = 'flex';
};

window.cerrarModalPago = function() { document.getElementById('modal-pago').style.display = 'none'; };

window.guardarPago = function() {
    if (!clienteActualId) return;
    const monto = parseFloat(document.getElementById('pago-monto').value);
    const fecha = document.getElementById('pago-fecha').value;
    const nota  = document.getElementById('pago-nota').value.trim();

    if (isNaN(monto) || monto <= 0 || !fecha) { alert('Ingresa un monto válido y una fecha.'); return; }

    const datos = cargarDatos();
    const cliente = datos.clientes.find(c => c.id === clienteActualId);
    if (!cliente.pagos) cliente.pagos = [];

    // Ahora el pago se asocia al proyecto actual
    cliente.pagos.push({ id: Date.now(), monto, fecha, nota, id_proyecto: proyectoActualId });
    guardarDatos(datos);
    window.cerrarModalPago();
    
    const y_m = fecha.substring(0, 7);
    if (!obtenerMesesDisponibles(clienteActualId).includes(y_m)) {
        mesSeleccionadoCliente = y_m; window.abrirPanelCliente(clienteActualId);
    } else {
        renderizarKpisCliente();
    }
};

window.verHistorialPagos = function() {
    const datos = cargarDatos();
    const cliente = datos.clientes.find(c => c.id === clienteActualId);
    if (!cliente) return;
    
    // Filtramos los pagos solo del proyecto seleccionado
    const pagos = (cliente.pagos || []).filter(p => p.id_proyecto === proyectoActualId).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    const tbody = document.getElementById('tabla-pagos-body');
    
    if (pagos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-lo)">Aún no tienes pagos registrados en este proyecto.</td></tr>';
    } else {
        tbody.innerHTML = pagos.map(p => `
            <tr style="border-bottom: 1px solid var(--border-card)">
                <td style="font-size:12px; padding:10px">${formatFecha(p.fecha)}</td>
                <td style="font-weight:bold; color:var(--status-ok); padding:10px">+$${parseFloat(p.monto).toFixed(2)}</td>
                <td style="font-size:11px; color:var(--text-lo); padding:10px">${p.nota || '—'}</td>
                <td style="text-align:right; padding:10px">
                    <button class="btn-accion-mini danger" onclick="window.borrarPago(${p.id})" style="float:right"><i class="ti ti-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
    
    document.getElementById('modal-historial-pagos').style.display = 'flex';
};

window.cerrarHistorialPagos = function() { document.getElementById('modal-historial-pagos').style.display = 'none'; };

window.borrarPago = function(idPago) {
    if(!confirm('¿Eliminar este registro de pago? Esto afectará tu balance de deuda/favor.')) return;
    const datos = cargarDatos();
    const cliente = datos.clientes.find(c => c.id === clienteActualId);
    if (!cliente) return;
    cliente.pagos = cliente.pagos.filter(p => p.id !== idPago);
    guardarDatos(datos);
    window.verHistorialPagos();
    renderizarKpisCliente();
};

// ─── Filtros, Tablas y Video CRUD ───────────────────────────────────────
window.filtrarVideosPorTexto = function (valor) { filtroVideoTexto = valor.toLowerCase().trim(); renderizarTablaVideos(); };
window.filtrarVideosPorEstado = function (estado) { filtroVideoEstado = estado; actualizarPills(); renderizarTablaVideos(); };
function actualizarPills() { ['todos', 'sin_empezar', 'en_curso', 'listo'].forEach(p => { const el = document.getElementById(`pill-${p}`); if (el) el.classList.toggle('active', p === filtroVideoEstado); }); }
window.cambiarOrdenVideos = function (col) { if (ordenVideoColumna === col) { ordenVideoDireccion = ordenVideoDireccion === 'asc' ? 'desc' : 'asc'; } else { ordenVideoColumna = col; ordenVideoDireccion = 'asc'; } renderizarTablaVideos(); };

function parsearHoras(tiempoStr) {
    if (!tiempoStr) return 0;
    let hrs = 0;
    const str = String(tiempoStr).toLowerCase().trim();
    const matchH = str.match(/(\d+)\s*h/);
    const matchM = str.match(/(\d+)\s*m/);
    if (matchH || matchM) {
        if (matchH) hrs += parseInt(matchH[1], 10);
        if (matchM) hrs += parseInt(matchM[1], 10) / 60;
    } else {
        const f = parseFloat(str);
        if (!isNaN(f)) hrs = f;
    }
    return hrs;
}

function actualizarIndicadoresOrden() { 
    ['numero', 'nombre', 'entrega', 'guion', 'tiempo', 'subido'].forEach(c => { 
        const el = document.getElementById(`sort-${c}`); 
        if (el) el.textContent = c === ordenVideoColumna ? (ordenVideoDireccion === 'asc' ? '▲' : '▼') : ''; 
    }); 
}

function renderizarTablaVideos() {
    const cuerpo = document.getElementById('tabla-videos-cliente');
    if (!cuerpo) return;
    const datos = cargarDatos(); const cliente = datos.clientes.find(c => c.id === clienteActualId);

    if (!cliente?.videos?.length) {
        cuerpo.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-lo)">Aún no hay videos en general. Haz clic en <strong>Agregar video</strong>.</td></tr>`;
        return;
    }

    // Filtramos SÓLO los videos del proyecto seleccionado
    let lista = cliente.videos.filter(v => v.id_proyecto === proyectoActualId && (v.nombre.toLowerCase().includes(filtroVideoTexto)) && (filtroVideoEstado === 'todos' || v.estado === filtroVideoEstado));
    
    if (lista.length === 0) {
        cuerpo.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-lo)">No hay videos en este proyecto.</td></tr>`;
        return;
    }

    lista.sort((a, b) => {
        let va, vb;
        if (ordenVideoColumna === 'numero') { va = a.numero_video || 0; vb = b.numero_video || 0; }
        else if (ordenVideoColumna === 'nombre') { va = (a.nombre || '').toLowerCase(); vb = (b.nombre || '').toLowerCase(); }
        else if (ordenVideoColumna === 'entrega') { va = a.fecha_entrega || '9999'; vb = b.fecha_entrega || '9999'; }
        else if (ordenVideoColumna === 'guion') { va = a.palabras_guion || 0; vb = b.palabras_guion || 0; }
        else if (ordenVideoColumna === 'tiempo') { va = parsearHoras(a.tiempo_trabajo); vb = parsearHoras(b.tiempo_trabajo); }
        else if (ordenVideoColumna === 'subido') { va = a.fecha_subido || '9999'; vb = b.fecha_subido || '9999'; }
        else return 0;
        if (va < vb) return ordenVideoDireccion === 'asc' ? -1 : 1;
        if (va > vb) return ordenVideoDireccion === 'asc' ? 1 : -1; return 0;
    });

    actualizarIndicadoresOrden();
    
    const promedioPal = cliente.promedio_palabras || 3000;

    cuerpo.innerHTML = lista.map(v => {
        const cobrado = (v.finanzas?.inversion || 0) + (v.finanzas?.bono || 0);
        const palabras = v.palabras_guion || 0; 
        const pctPal = Math.min(100, (palabras / promedioPal) * 100);
        
        const horasTrabajadas = parsearHoras(v.tiempo_trabajo);
        let rentabilidadHtml = '';
        if (horasTrabajadas > 0 && cobrado > 0) {
            rentabilidadHtml = `<div style="font-size:10px; color:var(--text-lo); font-weight:600; margin-top:3px" title="Rentabilidad">$${(cobrado/horasTrabajadas).toFixed(1)}/hr</div>`;
        }

        let colorEntrega = 'var(--text-hi)';
        if (v.fecha_entrega) {
            if (v.estado === 'listo') {
                colorEntrega = 'var(--text-lo)';
            } else {
                const hoy = new Date(); hoy.setHours(0,0,0,0);
                const [y, m, d] = v.fecha_entrega.split('-');
                const fEntrega = new Date(y, m - 1, d);
                const diffDays = Math.ceil((fEntrega - hoy) / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 0) colorEntrega = 'var(--status-danger)'; 
                else if (diffDays <= 3) colorEntrega = 'var(--status-warn)'; 
                else colorEntrega = 'var(--status-ok)';
            }
        }

        const rYT = v.redes?.youtube || {}; const rFB = v.redes?.facebook || {}; const rTK = v.redes?.tiktok || {}; const rIG = v.redes?.instagram || {};
        const totalVistas = (rYT.vistas || 0) + (rFB.vistas || 0) + (rTK.vistas || 0) + (rIG.vistas || 0);
        const totalLikes = (rYT.likes || 0) + (rFB.likes || 0) + (rTK.likes || 0) + (rIG.likes || 0);
        const statusClass = v.estado === 'listo' ? 'bg-notion-green' : v.estado === 'en_curso' ? 'bg-notion-yellow' : 'bg-notion-red';
        const linkDestino = v.redes?.youtube?.url || null;

        return `
        <tr>
            <td style="text-align:center;font-weight:800;color:var(--accent);font-size:15px">${v.numero_video || 1}</td>
            <td style="font-weight:600;color:var(--text-hi)">${v.nombre}</td>
            <td style="font-size:12px;color:var(--text-lo)">${formatFecha(v.fecha_recibido)}</td>
            <td style="font-size:12px;font-weight:700;color:${colorEntrega}">${formatFecha(v.fecha_entrega)}</td>
            <td style="min-width:100px"><div style="font-size:10px;color:var(--text-lo);margin-bottom:4px" title="Meta promedio: ${promedioPal} palabras">${palabras.toLocaleString()} pal.</div><div class="progress-bg"><div class="progress-fill" style="width:${pctPal}%"></div></div></td>
            <td style="text-align:center">
                <select class="notion-status-select ${statusClass}" onchange="window.actualizarCampoTabla(${v.id_video},'estado',this.value); this.className='notion-status-select '+(this.value==='listo'?'bg-notion-green':this.value==='en_curso'?'bg-notion-yellow':'bg-notion-red')">
                    <option value="sin_empezar" ${v.estado==='sin_empezar'?'selected':''}>Sin empezar</option>
                    <option value="en_curso" ${v.estado==='en_curso'?'selected':''}>En curso</option>
                    <option value="listo" ${v.estado==='listo'?'selected':''}>Listo</option>
                </select>
            </td>
            <td style="font-size:12px;color:var(--text-lo)">${v.tiempo_trabajo || '—'}</td>
            <td>
                <div style="font-size:13px;font-weight:700;color:var(--text-hi)">$${cobrado.toFixed(2)}</div>
                ${rentabilidadHtml}
            </td>
            <td style="font-size:12px;color:var(--text-lo)">${formatFecha(v.fecha_subido)}</td>
            <td><button class="btn-secondary" style="font-size:11px;padding:4px 10px;gap:4px" onclick="window.toggleRedes(${v.id_video})"><i class="ti ti-chart-bar" aria-hidden="true"></i> Ver</button></td>
            <td style="font-size:11px;color:var(--text-lo)">${formatFechaHora(v.ultima_edicion)}</td>
            <td>
                <div style="display:flex;gap:4px;align-items:center">
                    ${linkDestino ? `<a href="${linkDestino}" target="_blank" class="act-btn primary" title="Abrir video en YouTube" style="text-decoration:none"><i class="ti ti-external-link" aria-hidden="true"></i></a>` : `<div class="act-btn" style="opacity:.3;cursor:not-allowed" title="Sin link de YouTube configurado"><i class="ti ti-external-link" aria-hidden="true"></i></div>`}
                    <div class="act-btn primary" title="Editar" onclick="window.abrirModalNuevoVideo(${v.id_video})"><i class="ti ti-pencil" aria-hidden="true"></i></div>
                    <div class="act-btn danger" title="Eliminar" onclick="window.borrarVideo(${v.id_video})"><i class="ti ti-trash" aria-hidden="true"></i></div>
                </div>
            </td>
        </tr>
        <tr class="redes-row" id="redes-vid-${v.id_video}" style="display:none">
            <td colspan="12" style="padding:0;border:none">
                <div class="redes-panel-grid">
                    <div class="redes-top-row">
                        ${[{ key:'youtube', label:'YouTube', color:'#ff4757', icon:'ti-brand-youtube', r:rYT }, { key:'facebook', label:'Facebook', color:'#1877f2', icon:'ti-brand-facebook', r:rFB }, { key:'tiktok', label:'TikTok', color:'var(--text-base)', icon:'ti-brand-tiktok', r:rTK }, { key:'instagram', label:'Instagram', color:'#e1306c', icon:'ti-brand-instagram', r:rIG }].map(({ label, color, icon, r }) => `
                        <div class="data-card"><h5 style="color:${color}"><i class="ti ${icon}" aria-hidden="true"></i> ${label}</h5><div class="data-row"><span>Vistas</span><span>${formatK(r.vistas || 0)}</span></div><div class="data-row"><span>Likes</span> <span>${formatK(r.likes || 0)}</span></div>${r.url ? `<div class="data-row"><span>URL</span><span><a href="${r.url}" target="_blank" style="color:var(--accent)">Abrir ↗</a></span></div>` : ''}${r.nota ? `<div class="data-row" style="font-style:italic;color:var(--text-lo)"><span colspan="2">${r.nota}</span></div>` : ''}</div>`).join('')}
                    </div>
                    <div class="redes-bottom-row" style="grid-template-columns:repeat(3,1fr)">
                        <div class="data-card"><h5>Alcance total</h5><div class="data-row"><span>Vistas totales</span><span>${formatK(totalVistas)}</span></div><div class="data-row"><span>Likes totales</span> <span>${formatK(totalLikes)}</span></div><div class="data-row total"><span>Engagement</span><span>${totalVistas > 0 ? ((totalLikes / totalVistas) * 100).toFixed(2) + '%' : '—'}</span></div></div>
                        <div class="data-card"><h5>Precio del video</h5><div class="data-row"><span>Pago base</span><span>$${(v.finanzas?.inversion || 0).toFixed(2)}</span></div><div class="data-row"><span>Bono extra</span><span style="color:var(--status-ok)">+$${(v.finanzas?.bono || 0).toFixed(2)}</span></div><div class="data-row total"><span>Consume del balance</span><span style="color:var(--status-danger)">-$${cobrado.toFixed(2)}</span></div></div>
                        <div class="data-card"><h5>Fechas clave</h5><div class="data-row"><span>Recibido</span> <span>${formatFecha(v.fecha_recibido)}</span></div><div class="data-row"><span>Entrega</span><span>${formatFecha(v.fecha_entrega)}</span></div><div class="data-row"><span>Subido</span><span>${formatFecha(v.fecha_subido)}</span></div></div>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.toggleRedes = function (idVideo) { const el = document.getElementById(`redes-vid-${idVideo}`); if (!el) return; el.style.display = el.style.display === 'table-row' ? 'none' : 'table-row'; };
window.actualizarCampoTabla = function (idVideo, campo, valor) {
    const datos = cargarDatos(); const cliente = datos.clientes.find(c => c.id === clienteActualId); if (!cliente) return;
    const v = cliente.videos.find(vid => vid.id_video === idVideo); if (!v) return;
    v[campo] = valor; v.ultima_edicion = new Date().toISOString(); guardarDatos(datos);
    renderizarKpisCliente();
};

// ─── CRUD Cliente ───────────────────────────────────────
window.actualizarAvatarPreview = function () { const url = document.getElementById('cliente-foto').value.trim(); const nombre = document.getElementById('cliente-nombre').value.trim() || 'C'; const el = document.getElementById('cliente-preview-foto'); if (el) el.src = url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&color=fff&rounded=true&bold=true`; };
window.abrirModalNuevoCliente = function () { window.abrirModalEdicion(); };
window.abrirModalEdicion = function (id = null) {
    const modal = document.getElementById('modal-cliente'); document.getElementById('modal-cliente-titulo').textContent = id ? 'Editar cliente' : 'Nuevo cliente';
    document.getElementById('cliente-id').value = ''; document.getElementById('cliente-nombre').value = ''; document.getElementById('cliente-proyecto').value = ''; document.getElementById('cliente-pais').value = ''; document.getElementById('cliente-foto').value = '';
    document.getElementById('cliente-promedio-palabras').value = '3000'; 
    if (id) { const datos = cargarDatos(); const cliente = datos.clientes.find(c => c.id === id); if (cliente) { document.getElementById('cliente-id').value = cliente.id; document.getElementById('cliente-nombre').value = cliente.nombre || ''; document.getElementById('cliente-proyecto').value = cliente.proyecto || ''; document.getElementById('cliente-pais').value = cliente.pais || ''; document.getElementById('cliente-foto').value = cliente.foto || ''; document.getElementById('cliente-promedio-palabras').value = cliente.promedio_palabras || 3000; } }
    window.actualizarAvatarPreview(); modal.style.display = 'flex';
};
window.cerrarModalCliente = function () { document.getElementById('modal-cliente').style.display = 'none'; };
window.guardarCliente = function () {
    const id = document.getElementById('cliente-id').value; const nombre = document.getElementById('cliente-nombre').value.trim();
    if (!nombre) { alert('Por favor ingresa el nombre del cliente.'); return; }
    const promedioPalabras = parseInt(document.getElementById('cliente-promedio-palabras').value) || 3000;

    const datos = cargarDatos(); if (!datos.clientes) datos.clientes = [];
    if (id) { 
        const idx = datos.clientes.findIndex(c => c.id == id); 
        if (idx !== -1) { 
            datos.clientes[idx].nombre = nombre; 
            datos.clientes[idx].proyecto = document.getElementById('cliente-proyecto').value.trim(); 
            datos.clientes[idx].pais = document.getElementById('cliente-pais').value.trim(); 
            datos.clientes[idx].foto = document.getElementById('cliente-foto').value.trim(); 
            datos.clientes[idx].promedio_palabras = promedioPalabras;
        } 
    } 
    else { datos.clientes.push({ id: Date.now(), nombre, proyecto: document.getElementById('cliente-proyecto').value.trim(), pais: document.getElementById('cliente-pais').value.trim(), foto: document.getElementById('cliente-foto').value.trim(), promedio_palabras: promedioPalabras, videos: [], pagos: [], fecha_creacion: new Date().toISOString() }); }
    guardarDatos(datos); window.cerrarModalCliente(); renderizarListaClientes();
};
window.borrarCliente = function (id) { if (!confirm('¿Eliminar este cliente? Se borrará todo su historial y pagos.')) return; const datos = cargarDatos(); datos.clientes = datos.clientes.filter(c => c.id !== id); guardarDatos(datos); renderizarListaClientes(); };

// ─── CRUD Video ───────────────────────────────────────
window.abrirModalNuevoVideo = function (idVideoEdit = null) {
    const modal = document.getElementById('modal-video-completo'); document.getElementById('modal-video-titulo').textContent = idVideoEdit ? 'Editar video' : 'Agregar video'; document.getElementById('v-id-edit').value = '';
    ['v-nombre','v-f-recibido','v-f-entrega','v-f-subido','v-f-pago','v-tiempo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['v-numero','v-palabras','v-inversion','v-bono'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 0; });
    ['yt','fb','tk','ig'].forEach(p => { ['vistas','likes','url','nota'].forEach(campo => { const el = document.getElementById(`v-${p}-${campo}`); if (el) el.value = ['url','nota'].includes(campo) ? '' : 0; }); });
    const datos = cargarDatos(); const cliente = datos.clientes.find(c => c.id === clienteActualId); if (!cliente) return;
    
    // Obtenemos los videos SOLO de este proyecto para calcular el número que sigue
    const videosDelProyecto = cliente.videos?.filter(v => v.id_proyecto === proyectoActualId) || [];
    document.getElementById('v-numero').value = videosDelProyecto.length + 1; 
    
    document.getElementById('v-estado').value = 'sin_empezar';
    if (idVideoEdit) {
        const v = cliente.videos.find(vid => vid.id_video === idVideoEdit);
        if (v) {
            document.getElementById('v-id-edit').value = v.id_video; document.getElementById('v-numero').value = v.numero_video || 1; document.getElementById('v-nombre').value = v.nombre || ''; document.getElementById('v-estado').value = v.estado; document.getElementById('v-f-recibido').value = v.fecha_recibido || ''; document.getElementById('v-f-entrega').value = v.fecha_entrega || ''; document.getElementById('v-f-subido').value = v.fecha_subido || ''; document.getElementById('v-f-pago').value = v.fecha_pago || ''; document.getElementById('v-tiempo').value = v.tiempo_trabajo || ''; document.getElementById('v-palabras').value = v.palabras_guion || 0; document.getElementById('v-inversion').value = v.finanzas?.inversion || 0; document.getElementById('v-bono').value = v.finanzas?.bono || 0;
            ['yt','fb','tk','ig'].forEach(p => { const key = p === 'yt' ? 'youtube' : p === 'fb' ? 'facebook' : p === 'tk' ? 'tiktok' : 'instagram'; const rd = v.redes?.[key] || {}; ['vistas','likes','url','nota'].forEach(campo => { const el = document.getElementById(`v-${p}-${campo}`); if (el) el.value = rd[campo] ?? (['url','nota'].includes(campo) ? '' : 0); }); });
        }
    }
    modal.style.display = 'flex';
};
window.cerrarModalVideo = function () { document.getElementById('modal-video-completo').style.display = 'none'; };

window.guardarVideoModal = function () {
    if (!clienteActualId) return; const nombre = document.getElementById('v-nombre').value.trim(); if (!nombre) { alert('El video necesita un título.'); return; }
    const idEdit = document.getElementById('v-id-edit').value; const datos = cargarDatos(); const cliente = datos.clientes.find(c => c.id === clienteActualId); if (!cliente.videos) cliente.videos = [];
    const getRed = (p) => ({ vistas: parseInt(document.getElementById(`v-${p}-vistas`)?.value) || 0, likes: parseInt(document.getElementById(`v-${p}-likes`)?.value) || 0, url: document.getElementById(`v-${p}-url`)?.value.trim() || '', nota: document.getElementById(`v-${p}-nota`)?.value.trim() || '' });
    
    const videoData = { 
        numero_video: parseInt(document.getElementById('v-numero').value) || 1, 
        nombre, 
        estado: document.getElementById('v-estado').value, 
        fecha_recibido: document.getElementById('v-f-recibido').value, 
        fecha_entrega: document.getElementById('v-f-entrega').value, 
        fecha_subido: document.getElementById('v-f-subido').value, 
        fecha_pago: document.getElementById('v-f-pago').value, 
        tiempo_trabajo: document.getElementById('v-tiempo').value, 
        palabras_guion: parseInt(document.getElementById('v-palabras').value) || 0, 
        finanzas: { inversion: parseFloat(document.getElementById('v-inversion').value) || 0, bono: parseFloat(document.getElementById('v-bono').value) || 0 }, 
        redes: { youtube: getRed('yt'), facebook: getRed('fb'), tiktok: getRed('tk'), instagram: getRed('ig') }, 
        ultima_edicion: new Date().toISOString() 
    };
    
    if (idEdit) { 
        const idx = cliente.videos.findIndex(v => v.id_video == idEdit); 
        if (idx !== -1) { 
            videoData.id_video = cliente.videos[idx].id_video; 
            // Conservamos el proyecto actual al que pertenece el video editado
            videoData.id_proyecto = cliente.videos[idx].id_proyecto || proyectoActualId; 
            cliente.videos[idx] = videoData; 
        } 
    } else { 
        videoData.id_video = Date.now(); 
        // Asignamos el video al proyecto que actualmente está en pantalla
        videoData.id_proyecto = proyectoActualId; 
        cliente.videos.push(videoData); 
    }
    
    guardarDatos(datos); 
    window.cerrarModalVideo(); 
    window.abrirPanelCliente(clienteActualId);
};

window.borrarVideo = function (idVideo) { if (!confirm('¿Eliminar este video?')) return; const datos = cargarDatos(); const cliente = datos.clientes.find(c => c.id === clienteActualId); cliente.videos = cliente.videos.filter(v => v.id_video !== idVideo); guardarDatos(datos); window.abrirPanelCliente(clienteActualId); };