// ==========================================
// MÓDULO: FINANZAS PERSONALES
// ARQUITECTURA: Sub-router por pestañas y filtro mensual
// ==========================================

let fz_fechaActual = new Date(); // Guardará el mes y año en el que estamos navegando
let fz_tabActual = 'resumen';

// Formateador de moneda utilitario
const formatearDinero = (monto) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
};

// 1. INICIALIZACIÓN (Llamada por app.js)
window.inicializarFinanzasPersonales = function() {
    console.log("Módulo de Finanzas Personales iniciado.");
    actualizarEtiquetaMes();
    configurarSubMenu();
    // Asegurar que existan instancias de recurrentes para los próximos meses
    if (typeof fz_generarInstanciasRecurrentesHasta === 'function') fz_generarInstanciasRecurrentesHasta(12);
    renderizarPantallaActual();
};

// 2. CONTROL DEL MES
window.finanzasMoverMes = function(direccion) {
    // direccion: -1 (atrás) o 1 (adelante)
    fz_fechaActual.setMonth(fz_fechaActual.getMonth() + direccion);
    actualizarEtiquetaMes();
    // Generamos las instancias necesarias para el mes al que navegamos
    if (typeof fz_generarInstanciasRecurrentesParaMes === 'function') fz_generarInstanciasRecurrentesParaMes(fz_fechaActual);
    renderizarPantallaActual(); // Recargar datos de la pantalla actual con el nuevo mes
};

function actualizarEtiquetaMes() {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const etiqueta = `${meses[fz_fechaActual.getMonth()]} ${fz_fechaActual.getFullYear()}`;
    document.getElementById('finanzas-mes-actual').textContent = etiqueta;
}

// 3. CONTROL DE PESTAÑAS (SUB-MENÚ)
// 3. CONTROL DE PESTAÑAS Y SUB-MENÚ
function configurarSubMenu() {
    const tabsPrincipales = document.querySelectorAll('.finanzas-tab[data-tab]');
    const dropdownItems = document.querySelectorAll('.finanzas-dropdown-item');
    const btnMasOpciones = document.getElementById('btn-mas-opciones');
    const menuMasOpciones = document.getElementById('menu-mas-opciones');

    const cambiarPestana = (tabId, elementoClickeado) => {
        // Limpiamos estados
        tabsPrincipales.forEach(t => t.classList.remove('activa'));
        btnMasOpciones.classList.remove('activa');
        dropdownItems.forEach(t => t.style.color = 'var(--text-hi)');
        
        // Asignar estado activo al presionado
        if (elementoClickeado.classList.contains('finanzas-tab')) {
            elementoClickeado.classList.add('activa');
        } else if (elementoClickeado.classList.contains('finanzas-dropdown-item')) {
            btnMasOpciones.classList.add('activa'); // Encendemos el botón padre
            elementoClickeado.style.color = 'var(--accent)'; // Resaltamos el hijo
        }

        fz_tabActual = tabId;
        renderizarPantallaActual();
        menuMasOpciones.classList.remove('visible'); // Cierra el menú siempre
    };

    // Eventos a las pestañas de la barra
    tabsPrincipales.forEach(tab => {
        tab.addEventListener('click', (e) => cambiarPestana(tab.getAttribute('data-tab'), e.currentTarget));
    });

    // Eventos a los items del submenú
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            cambiarPestana(item.getAttribute('data-tab'), e.currentTarget);
        });
    });

    // Abrir/Cerrar submenú "Más opciones"
    if (btnMasOpciones) {
        btnMasOpciones.addEventListener('click', (e) => {
            e.stopPropagation();
            menuMasOpciones.classList.toggle('visible');
        });
    }

    // Cerrar el submenú si hacemos clic en cualquier otra parte de la pantalla
    document.addEventListener('click', (e) => {
        if (menuMasOpciones && menuMasOpciones.classList.contains('visible') && !btnMasOpciones.contains(e.target)) {
            menuMasOpciones.classList.remove('visible');
        }
    });
}

// 4. RENDERIZADO MAESTRO AMPLIADO
function renderizarPantallaActual() {
    // Array con TODAS las pantallas posibles
    const pantallas = ['resumen', 'cuentas', 'transacciones', 'tarjetas', 'presupuestos', 'informes', 'categorias', 'objetivos', 'comercios', 'calendario', 'actuacion'];
    
    // 1. Apagamos todas las pantallas en el HTML
    pantallas.forEach(p => {
        const el = document.getElementById(`pantalla-${p}`);
        if(el) el.style.display = 'none';
    });
    
    // 2. Encendemos únicamente la actual
    const pantallaActiva = document.getElementById(`pantalla-${fz_tabActual}`);
    if (pantallaActiva) pantallaActiva.style.display = 'block';

    // 3. Llamamos a su renderizador de datos si ya existe
    if (fz_tabActual === 'resumen') fz_pintarResumen();
    else if (fz_tabActual === 'cuentas') fz_pintarCuentas();
    else if (fz_tabActual === 'categorias') fz_pintarCategorias();
    else if (fz_tabActual === 'transacciones') fz_pintarTransacciones();
    // Las nuevas vistas no tienen función aún, así que no llaman a nada y muestran el letrero "En construcción"
}
// ==========================================
// LÓGICA DE TRANSACCIONES
// ==========================================

function fz_pintarTransacciones() {
    const contenedor = document.getElementById('fz-lista-transacciones');
    const datos = fz_obtenerDatos();
    const transActivas = datos.transacciones.filter(t => !t.archivada);
    
    const year = fz_fechaActual.getFullYear();
    const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
    const mesFiltro = `${year}-${month}`;
    const transDelMes = transActivas.filter(t => t.fecha.startsWith(mesFiltro));

    transDelMes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (transDelMes.length === 0) {
        contenedor.innerHTML = `<div class="card-surface" style="padding: 30px; text-align: center; color: var(--text-lo);">No hay movimientos en este mes.</div>`;
        return;
    }

    contenedor.innerHTML = transDelMes.map(t => {
        let colorDinero, signo, desc, info, colorCat;

        if (t.tipo === 'transferencia') {
            colorDinero = '#2773d6'; // Azul
            signo = '⇄ ';
            const origen = datos.cuentas.find(c => c.id == t.cuenta_id);
            const destino = datos.cuentas.find(c => c.id == t.cuenta_destino_id);
            info = `${origen ? origen.nombre : '?'} ➔ ${destino ? destino.nombre : '?'} • ${t.fecha}`;
            colorCat = '#2773d6';
            desc = "Transferencia";
        } else {
            const esIngreso = t.tipo === 'ingreso';
            colorDinero = esIngreso ? 'var(--status-ok)' : 'var(--status-danger)';
            signo = esIngreso ? '+' : '-';
            const cuenta = datos.cuentas.find(c => c.id == t.cuenta_id);
            const categoria = datos.categorias.find(c => c.id == t.categoria_id);
            info = `${cuenta ? cuenta.nombre : '?'} • ${t.fecha}`;
            colorCat = categoria ? categoria.color : 'var(--text-lo)';
            desc = t.descripcion;
        }

        return `
            <div class="card-surface" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${colorCat};"></div>
                    <div>
                        <h4 style="color: var(--text-hi); font-size: 13px; margin: 0;">${desc}</h4>
                        <p style="color: var(--text-lo); font-size: 11px; margin: 0;">${info}</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <p style="color: ${colorDinero}; font-size: 14px; font-weight: 700; margin: 0;">${signo}${formatearDinero(t.monto)}</p>
                    <button class="btn-borrar" style="padding: 2px 6px; margin-top: 4px;" onclick="fz_archivarTransaccionUI(${t.id})"><i class="ti ti-archive"></i></button>
                </div>
            </div>
        `;
    }).join('');
}
// Para que los botones rápidos funcionen
// Para que los botones rápidos funcionen
window.abrirModalTransaccion = function(tipo) { window.fz_abrirModalTransaccion(tipo); };

window.fz_abrirModalTransaccion = function(tipo, id = null) {
    const datos = fz_obtenerDatos();
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada);
    
    if (cuentasActivas.length === 0) {
        return alert("Debes crear al menos una Cuenta financiera antes de registrar movimientos.");
    }

    // Configurar Tipo
    document.getElementById('fz-trans-tipo').value = tipo;
    document.getElementById('fz-trans-id').value = id || '';
    
    // Muta Visualmente el Modal
    const txtTitulo = document.getElementById('fz-modal-trans-titulo');
    const txtSimbolo = document.getElementById('fz-trans-simbolo-tipo');
    const containerGastoFijo = document.getElementById('fz-container-gasto-fijo');
    const containerUnidad = document.getElementById('fz-container-unidad');
    
    // Ajustes visuales según tipo (gasto / ingreso)
    if (tipo === 'ingreso') {
        txtTitulo.innerHTML = `Registrar <span style="color: var(--status-ok);">Ingreso</span>`;
        txtSimbolo.style.color = 'var(--status-ok)';
        // Mostrar la opción de "fijo" también para ingresos y adaptar el texto
        if (containerGastoFijo) {
            containerGastoFijo.style.visibility = 'visible';
            const tituloFijo = containerGastoFijo.querySelector('.fz-toggle-titulo');
            if (tituloFijo) tituloFijo.innerText = 'Ingreso fijo mensual';
        }
        // Ocultar unidad: no es un ítem comprado
        if (containerUnidad) containerUnidad.style.display = 'none';
        // Cambiar texto del toggle principal
        const toggleTitulo = document.getElementById('fz-lbl-toggle-titulo');
        if (toggleTitulo) toggleTitulo.innerText = 'Recibido';
    } else {
        txtTitulo.innerHTML = `Registrar <span style="color: var(--status-danger);">Gasto</span>`;
        txtSimbolo.style.color = 'var(--status-danger)';
        if (containerGastoFijo) {
            containerGastoFijo.style.visibility = 'visible';
            const tituloFijo = containerGastoFijo.querySelector('.fz-toggle-titulo');
            if (tituloFijo) tituloFijo.innerText = 'Gasto fijo mensual';
        }
        if (containerUnidad) containerUnidad.style.display = 'block';
        const toggleTitulo = document.getElementById('fz-lbl-toggle-titulo');
        if (toggleTitulo) toggleTitulo.innerText = 'Estado del pago';
    }

    // Llenar Cuentas
    document.getElementById('fz-trans-cuenta').innerHTML = cuentasActivas.map(c => 
        `<option value="${c.id}">${c.nombre}</option>`
    ).join('');

    // Limpiar inputs
    document.getElementById('fz-trans-monto').value = '';
    document.getElementById('fz-trans-desc').value = '';
    document.getElementById('fz-trans-unidad').value = '';
    document.getElementById('fz-trans-observacion').value = '';
    document.getElementById('fz-trans-cat-input').value = '';
    document.getElementById('fz-trans-categoria').value = '';
    document.getElementById('fz-trans-comercio-input').value = '';
    document.getElementById('fz-trans-pagado').checked = true;
    document.getElementById('fz-trans-gasto-fijo').checked = false;
    
    document.getElementById('fz-trans-pagado').onchange = function() {
        const esIngreso = document.getElementById('fz-trans-tipo').value === 'ingreso';
        if (esIngreso) {
            document.getElementById('fz-lbl-toggle-pagado').innerText = this.checked ? 'Sí' : 'No';
        } else {
            document.getElementById('fz-lbl-toggle-pagado').innerText = this.checked ? 'Marcado como pagado' : 'Pendiente por pagar / Cobrar';
        }
    };
    document.getElementById('fz-trans-pagado').onchange();

    fz_establecerFechaRapida('hoy');
    fz_cerrarTodosLosDropdownsAutoComplete();

    document.getElementById('fz-modal-transaccion').classList.add('visible');
};

// --- CONTROLADOR DE FECHAS ---
window.fz_establecerFechaRapida = function(periodo) {
    const inputFecha = document.getElementById('fz-trans-fecha');
    const btnHoy = document.getElementById('fz-btn-fecha-hoy');
    const btnAyer = document.getElementById('fz-btn-fecha-ayer');
    
    btnHoy.classList.remove('activa');
    btnAyer.classList.remove('activa');
    
    const d = new Date();
    if (periodo === 'hoy') {
        btnHoy.classList.add('activa');
        inputFecha.value = d.toISOString().split('T')[0];
    } else if (periodo === 'ayer') {
        btnAyer.classList.add('activa');
        d.setDate(d.getDate() - 1);
        inputFecha.value = d.toISOString().split('T')[0];
    }
};

window.fz_alCambiarFechaManual = function() {
    document.getElementById('fz-btn-fecha-hoy').classList.remove('activa');
    document.getElementById('fz-btn-fecha-ayer').classList.remove('activa');
};

// --- CONTROLADOR DE UNIDADES ---
window.fz_toggleDropdownInline = function(idContainer) {
    const el = document.getElementById(idContainer);
    const estaAbierto = el.classList.contains('visible');
    fz_cerrarTodosLosDropdownsAutoComplete();
    if(!estaAbierto) el.classList.add('visible');
};

window.fz_seleccionarUnidad = function(unidad) {
    document.getElementById('fz-trans-unidad').value = unidad;
    document.getElementById('fz-drop-unidad').classList.remove('visible');
};

// --- AUTOCOMPLETADO Y CREACIÓN EXPRÉS ---
window.fz_filtrarDropdownCategorias = function() {
    const input = document.getElementById('fz-trans-cat-input');
    const query = input.value.trim().toLowerCase();
    const dropdown = document.getElementById('fz-drop-categorias');
    const tipo = document.getElementById('fz-trans-tipo').value;
    
    const datos = fz_obtenerDatos();
    const catsFiltradas = datos.categorias.filter(c => !c.archivada && c.tipo === tipo);
    
    dropdown.innerHTML = '';
    dropdown.classList.add('visible');

    catsFiltradas.forEach(c => {
        if (c.nombre.toLowerCase().includes(query)) {
            const item = document.createElement('div');
            item.className = 'fz-autocomplete-option';
            item.innerHTML = `<div style="width:10px; height:10px; border-radius:50%; background:${c.color || '#888'}"></div> <span>${c.nombre}</span>`;
            item.onclick = () => {
                input.value = c.nombre;
                document.getElementById('fz-trans-categoria').value = c.id;
                dropdown.classList.remove('visible');
            };
            dropdown.appendChild(item);
        }
    });

    if (query.length > 0 && !catsFiltradas.some(c => c.nombre.toLowerCase() === query)) {
        const itemExpress = document.createElement('div');
        itemExpress.className = 'fz-autocomplete-option-express';
        itemExpress.innerHTML = `<i class="ti ti-sparkles"></i> Crear "${input.value}" al vuelo...`;
        itemExpress.onclick = () => fz_crearExpressCategoria(input.value, tipo);
        dropdown.appendChild(itemExpress);
    }
};

function fz_crearExpressCategoria(nombre, tipo) {
    const nuevaCat = {
        id: Date.now(),
        nombre: nombre.trim(),
        tipo: tipo,
        color: tipo === 'ingreso' ? '#2ecc71' : '#e74c3c',
        archivada: false
    };
    fz_guardarCategoria(nuevaCat);
    document.getElementById('fz-trans-cat-input').value = nuevaCat.nombre;
    document.getElementById('fz-trans-categoria').value = nuevaCat.id;
    document.getElementById('fz-drop-categorias').classList.remove('visible');
}

window.fz_filtrarDropdownComercios = function() {
    const input = document.getElementById('fz-trans-comercio-input');
    const query = input.value.trim().toLowerCase();
    const dropdown = document.getElementById('fz-drop-comercios');
    
    let datosCerebroGlobal = cargarDatos();
    if(!datosCerebroGlobal.finanzas_personales.comercios) datosCerebroGlobal.finanzas_personales.comercios = [];
    const comercios = datosCerebroGlobal.finanzas_personales.comercios;
    
    dropdown.innerHTML = '';
    dropdown.classList.add('visible');

    comercios.forEach(com => {
        if (com.toLowerCase().includes(query)) {
            const item = document.createElement('div');
            item.className = 'fz-autocomplete-option';
            item.innerHTML = `<i class="ti ti-building-store" style="color:var(--text-lo)"></i> <span>${com}</span>`;
            item.onclick = () => {
                input.value = com;
                dropdown.classList.remove('visible');
            };
            dropdown.appendChild(item);
        }
    });

    if (query.length > 0 && !comercios.some(c => c.toLowerCase() === query)) {
        const itemExpress = document.createElement('div');
        itemExpress.className = 'fz-autocomplete-option-express';
        itemExpress.innerHTML = `<i class="ti ti-plus"></i> Registrar comercio "${input.value}"...`;
        itemExpress.onclick = () => {
            let d = cargarDatos();
            if(!d.finanzas_personales.comercios) d.finanzas_personales.comercios = [];
            d.finanzas_personales.comercios.push(input.value.trim());
            guardarDatos(d);
            input.value = input.value.trim();
            dropdown.classList.remove('visible');
        };
        dropdown.appendChild(itemExpress);
    }
};

// --- AUTOCOMPLETADO DE DESCRIPCIONES (Histórico) ---
function fz_filtrarDropdownDescripciones() {
    const input = document.getElementById('fz-trans-desc');
    const query = input.value.trim().toLowerCase();
    const dropdown = document.getElementById('fz-drop-descripciones');
    const datos = fz_obtenerDatos();

    dropdown.innerHTML = '';
    if (!query) { dropdown.classList.remove('visible'); return; }
    dropdown.classList.add('visible');

    const all = (datos.transacciones || []).map(t => t.descripcion).filter(Boolean);
    const uniques = [...new Set(all)];
    uniques.filter(d => d.toLowerCase().includes(query)).slice(0, 8).forEach(desc => {
        const item = document.createElement('div');
        item.className = 'fz-autocomplete-option';
        item.innerHTML = `<i class="ti ti-file-text" style="color:var(--text-lo)"></i> <span>${desc}</span>`;
        item.onclick = () => { input.value = desc; dropdown.classList.remove('visible'); };
        dropdown.appendChild(item);
    });
}

function fz_cerrarTodosLosDropdownsAutoComplete() {
    document.getElementById('fz-drop-unidad').classList.remove('visible');
    document.getElementById('fz-drop-categorias').classList.remove('visible');
    document.getElementById('fz-drop-comercios').classList.remove('visible');
    document.getElementById('fz-drop-descripciones') && document.getElementById('fz-drop-descripciones').classList.remove('visible');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('#fz-trans-unidad') && !e.target.closest('#fz-drop-unidad')) {
        document.getElementById('fz-drop-unidad').classList.remove('visible');
    }
    if (!e.target.closest('#fz-trans-desc') && !e.target.closest('#fz-drop-descripciones')) {
        const el = document.getElementById('fz-drop-descripciones'); if (el) el.classList.remove('visible');
    }
    if (!e.target.closest('#fz-trans-cat-input') && !e.target.closest('#fz-drop-categorias')) {
        document.getElementById('fz-drop-categorias').classList.remove('visible');
    }
    if (!e.target.closest('#fz-trans-comercio-input') && !e.target.closest('#fz-drop-comercios')) {
        document.getElementById('fz-drop-comercios').classList.remove('visible');
    }
});

// === RECURRANCES: Generador de instancias mensuales ===
function fz_generarInstanciasRecurrentesHasta(monthsAhead = 12) {
    try {
        let datos = cargarDatos();
        if (!datos.finanzas_personales) return;
        if (!datos.finanzas_personales.recurrentes) datos.finanzas_personales.recurrentes = [];
        if (!datos.finanzas_personales.transacciones) datos.finanzas_personales.transacciones = [];

        const recurrentes = datos.finanzas_personales.recurrentes.filter(r => r && r.activo !== false);
        const today = new Date();
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + monthsAhead);

        recurrentes.forEach(rec => {
            const start = rec.start_date ? new Date(rec.start_date + 'T00:00:00') : today;
            const dia = rec.dia || (start.getDate ? start.getDate() : 1);

            // iteramos desde el mes de inicio hasta endDate
            let iter = new Date(start.getFullYear(), start.getMonth(), 1);
            while (iter <= endDate) {
                const year = iter.getFullYear();
                const month = iter.getMonth();
                const lastDay = new Date(year, month + 1, 0).getDate();
                const dayToSet = Math.min(dia, lastDay);
                const fechaStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayToSet).padStart(2,'0')}`;

                const exists = datos.finanzas_personales.transacciones.some(t => t.recurrente_id === rec.id && t.fecha === fechaStr);
                if (!exists) {
                    datos.finanzas_personales.transacciones.push({
                        id: Date.now() + Math.floor(Math.random() * 100000),
                        tipo: rec.tipo,
                        monto: rec.monto,
                        descripcion: rec.descripcion,
                        fecha: fechaStr,
                        cuenta_id: rec.cuenta_id,
                        categoria_id: rec.categoria_id,
                        comercio: rec.comercio,
                        unidad: rec.unidad,
                        pagado: !!rec.pagado_por_defecto,
                        gasto_fijo: true,
                        observacion: rec.observacion,
                        archivada: false,
                        recurrente_id: rec.id
                    });
                }

                iter.setMonth(iter.getMonth() + 1);
            }
        });

        guardarDatos(datos);
    } catch (err) {
        console.error('Error generando instancias recurrentes:', err);
    }
}

function fz_generarInstanciasRecurrentesParaMes(targetDate) {
    try {
        let datos = cargarDatos();
        if (!datos.finanzas_personales) return;
        if (!datos.finanzas_personales.recurrentes) datos.finanzas_personales.recurrentes = [];
        if (!datos.finanzas_personales.transacciones) datos.finanzas_personales.transacciones = [];

        const recurrentes = datos.finanzas_personales.recurrentes.filter(r => r && r.activo !== false);
        const t = targetDate instanceof Date ? new Date(targetDate) : new Date(fz_fechaActual);
        const year = t.getFullYear();
        const month = t.getMonth();

        recurrentes.forEach(rec => {
            const start = rec.start_date ? new Date(rec.start_date + 'T00:00:00') : null;
            // no generar si la plantilla empieza después del mes objetivo
            if (start && new Date(start.getFullYear(), start.getMonth(), 1) > new Date(year, month, 1)) return;

            const lastDay = new Date(year, month + 1, 0).getDate();
            const dia = rec.dia || (start ? start.getDate() : 1);
            const dayToSet = Math.min(dia, lastDay);
            const fechaStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayToSet).padStart(2,'0')}`;

            const exists = datos.finanzas_personales.transacciones.some(t0 => t0.recurrente_id === rec.id && t0.fecha === fechaStr);
            if (!exists) {
                datos.finanzas_personales.transacciones.push({
                    id: Date.now() + Math.floor(Math.random() * 100000),
                    tipo: rec.tipo,
                    monto: rec.monto,
                    descripcion: rec.descripcion,
                    fecha: fechaStr,
                    cuenta_id: rec.cuenta_id,
                    categoria_id: rec.categoria_id,
                    comercio: rec.comercio,
                    unidad: rec.unidad,
                    pagado: !!rec.pagado_por_defecto,
                    gasto_fijo: true,
                    observacion: rec.observacion,
                    archivada: false,
                    recurrente_id: rec.id
                });
            }
        });

        guardarDatos(datos);
    } catch (err) {
        console.error('Error generando instancia recurrente para mes:', err);
    }
}

// --- GUARDAR FORMULARIO DE TRANSACCIONES ---
window.fz_guardarFormularioTransaccion = function() {
    const idInput = document.getElementById('fz-trans-id').value;
    const tipo = document.getElementById('fz-trans-tipo').value;
    const monto = parseFloat(document.getElementById('fz-trans-monto').value);
    const desc = document.getElementById('fz-trans-desc').value.trim();
    const fecha = document.getElementById('fz-trans-fecha').value;
    const cuenta_id = parseInt(document.getElementById('fz-trans-cuenta').value);
    const categoria_id = parseInt(document.getElementById('fz-trans-categoria').value);
    const comercio = document.getElementById('fz-trans-comercio-input').value.trim();
    const unidad = document.getElementById('fz-trans-unidad').value;
    const pagado = document.getElementById('fz-trans-pagado').checked;
    const gasto_fijo = document.getElementById('fz-trans-gasto-fijo').checked;
    const observacion = document.getElementById('fz-trans-observacion').value.trim();

    if (!monto || monto <= 0) return alert("Por favor, introduce un monto válido superior a cero.");
    if (!desc) return alert("La descripción o concepto es obligatoria.");
    if (!fecha) return alert("Debes seleccionar una fecha.");
    if (!categoria_id) return alert("Debes vincular una categoría al movimiento.");

    // Si es fijo y estamos creando (no editando), primero creamos la plantilla recurrente
    let recurrenteId = null;
    if (gasto_fijo && !idInput) {
        try {
            const start = new Date(fecha + 'T00:00:00');
            const dia = start.getDate();
            const recId = Date.now() + Math.floor(Math.random() * 100000);
            const recurrente = {
                id: recId,
                tipo: tipo,
                monto: monto,
                descripcion: desc,
                cuenta_id: cuenta_id,
                categoria_id: categoria_id,
                comercio: comercio,
                unidad: unidad,
                observacion: observacion,
                dia: dia,
                start_date: fecha,
                pagado_por_defecto: false,
                activo: true
            };
            if (typeof fz_guardarRecurrente === 'function') fz_guardarRecurrente(recurrente);
            recurrenteId = recId;
        } catch (err) {
            console.error('Error creando plantilla recurrente:', err);
        }
    }

    const transObj = {
        id: idInput ? parseInt(idInput) : Date.now(),
        tipo: tipo,
        monto: monto,
        descripcion: desc,
        fecha: fecha,
        cuenta_id: cuenta_id,
        categoria_id: categoria_id,
        comercio: comercio,
        unidad: unidad,
        pagado: pagado,
        gasto_fijo: gasto_fijo,
        observacion: observacion,
        archivada: false
    };

    if (recurrenteId) transObj.recurrente_id = recurrenteId;

    fz_guardarTransaccion(transObj);

    // Si creamos una plantilla recurrente, generamos instancias hasta 12 meses por defecto
    if (recurrenteId && typeof fz_generarInstanciasRecurrentesHasta === 'function') {
        try { fz_generarInstanciasRecurrentesHasta(12); } catch(e) { console.error(e); }
    }

    document.getElementById('fz-modal-transaccion').classList.remove('visible');
    
    if (fz_tabActual === 'transacciones') fz_pintarTransacciones();
    if (fz_tabActual === 'resumen') fz_pintarResumen();
};

window.fz_archivarTransaccionUI = function(id) {
    if(confirm("¿Seguro que deseas archivar este movimiento? Desaparecerá de los reportes.")) {
        fz_archivarTransaccion(id);
        fz_pintarTransacciones();
    }
};

// ==========================================
// LÓGICA DE CUENTAS
// ==========================================
function fz_pintarCuentas() {
    const contenedor = document.getElementById('fz-lista-cuentas');
    const datos = fz_obtenerDatos();
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada);

    if (cuentasActivas.length === 0) {
        contenedor.innerHTML = `<p style="color: var(--text-lo); grid-column: 1 / -1;">No hay cuentas activas. Crea una para empezar.</p>`;
        return;
    }

        contenedor.innerHTML = cuentasActivas.map(c => {
        const saldoReal = fz_calcularSaldoCuenta(c.id); // ¡Llama a nuestra nueva calculadora!
        return `
        <div class="card-surface" style="padding: 16px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <h4 style="color: var(--text-hi); font-size: 14px; margin: 0;">${c.nombre}</h4>
                <div>
                    <button class="btn-ghost" style="padding: 4px;" onclick="fz_abrirModalCuenta(${c.id})"><i class="ti ti-edit"></i></button>
                    <button class="btn-borrar" style="padding: 4px;" onclick="fz_archivarCuentaUI(${c.id})"><i class="ti ti-archive"></i></button>
                </div>
            </div>
            <p style="font-size: 11px; color: var(--text-lo);">Saldo Actual</p>
            <p style="font-size: 18px; font-weight: 700; color: ${saldoReal >= 0 ? 'var(--status-ok)' : 'var(--status-danger)'};">${formatearDinero(saldoReal)}</p>
        </div>
        `;
    }).join('');
}

// ==========================================
// LÓGICA DE CUENTAS (ACTUALIZADA)
// ==========================================

// Acciones asociadas al botón izquierdo dinámico
window.fz_reajustarSaldoUI = function() {
    const idInput = document.getElementById('fz-cuenta-id').value;
    if (idInput) {
        // Modo Edición: Foco rápido al input gigante de saldo para cambiar el valor
        const inputSaldo = document.getElementById('fz-cuenta-saldo');
        inputSaldo.focus();
        inputSaldo.select();
    } else {
        // Modo Creador: Simplemente limpia el formulario
        document.getElementById('fz-cuenta-saldo').value = '';
        document.getElementById('fz-cuenta-nombre').value = '';
        document.getElementById('fz-cuenta-logo-url').value = '';
        fz_actualizarPreviewLogo();
    }
};

// ====================================================
// CONTROLADOR INTEGRAL DEL MODAL PREMIUM DE CUENTAS
// ====================================================

window.fz_abrirModalCuenta = function(id = null) {
    document.getElementById('fz-modal-cuenta-titulo').textContent = id ? 'Editar cuenta' : 'Añadir cuenta';
    document.getElementById('fz-cuenta-id').value = id || '';
    
    // Obtener referencias exactas a los campos
    const inputSaldo = document.getElementById('fz-cuenta-saldo');
    const inputNombre = document.getElementById('fz-cuenta-nombre');
    const selectTipo = document.getElementById('fz-cuenta-tipo-select');
    const inputLogoUrl = document.getElementById('fz-cuenta-logo-url');
    const inputToggle = document.getElementById('fz-cuenta-incluir');
    const btnReajustar = document.getElementById('fz-btn-reajustar');
    
    if (id) {
        const cuenta = fz_obtenerDatos().cuentas.find(c => c.id === id);
        inputSaldo.value = parseFloat(cuenta.saldo_inicial || 0).toFixed(2);
        inputNombre.value = cuenta.nombre || '';
        selectTipo.value = cuenta.tipo || 'debito';
        inputLogoUrl.value = cuenta.logo || '';
        inputToggle.checked = cuenta.incluir_dashboard !== false;
        
        // Cambiamos el texto del botón izquierdo si está editando
        btnReajustar.innerHTML = `<i class="ti ti-adjustments"></i> Re-ajustar saldo`;
        fz_activarColorUI(cuenta.color || '#3498db');
    } else {
        inputSaldo.value = '';
        inputNombre.value = '';
        selectTipo.value = 'debito';
        inputLogoUrl.value = '';
        inputToggle.checked = true;
        
        // Si es una cuenta nueva, actúa como botón de limpiar/cancelar
        btnReajustar.innerHTML = `<i class="ti ti-trash"></i> Limpiar campos`;
        fz_activarColorUI('#3498db');
    }
    
    fz_actualizarPreviewLogo();
    document.getElementById('fz-modal-cuenta').classList.add('visible');
};

window.fz_guardarFormularioCuenta = function() {
    const idInput = document.getElementById('fz-cuenta-id').value;
    const saldo = parseFloat(document.getElementById('fz-cuenta-saldo').value) || 0;
    const nombre = document.getElementById('fz-cuenta-nombre').value.trim();
    const tipo = document.getElementById('fz-cuenta-tipo-select').value;
    const logoUrl = document.getElementById('fz-cuenta-logo-url').value.trim();
    const color = document.getElementById('fz-cuenta-color').value;
    const incluir = document.getElementById('fz-cuenta-incluir').checked;

    if (!nombre) return alert("Por favor, introduce el nombre de la institución financiera.");

    fz_guardarCuenta({
        id: idInput ? parseInt(idInput) : Date.now(),
        nombre: nombre,
        saldo_inicial: saldo,
        tipo: tipo,
        logo: logoUrl,
        color: color,
        incluir_dashboard: incluir,
        archivada: false
    });

    document.getElementById('fz-modal-cuenta').classList.remove('visible');
    fz_pintarCuentas();
    if (typeof fz_pintarResumen === 'function') fz_pintarResumen();
};

window.fz_archivarCuentaUI = function(id) {
    if(confirm("¿Seguro que deseas archivar esta cuenta? Las transacciones pasadas se mantendrán seguras.")) {
        fz_archivarCuenta(id);
        fz_pintarCuentas();
    }
};

// ------------------------------------------
// Lógica de Interfaz del Modal (Colores y Logo)
// ------------------------------------------
// Manejo estricto de UI de la paleta de colores
window.fz_seleccionarColor = function(elemento, colorHex) {
    document.getElementById('fz-cuenta-color').value = colorHex;
    document.querySelectorAll('.fz-circle-exacto').forEach(el => el.classList.remove('activa'));
    elemento.classList.add('activa');
};

window.fz_seleccionarColorPersonalizado = function(input) {
    const colorHex = input.value;
    const trigger = input.parentElement;
    fz_seleccionarColor(trigger, colorHex);
    trigger.style.background = colorHex;
};

window.fz_activarColorUI = function(colorHex) {
    document.getElementById('fz-cuenta-color').value = colorHex;
    const circulos = document.querySelectorAll('.fz-circle-exacto:not(.fz-custom-picker-trigger)');
    let encontrado = false;
    
    circulos.forEach(c => {
        c.classList.remove('activa');
        if (c.style.backgroundColor === colorHex || c.style.background.includes(colorHex)) {
            c.classList.add('activa');
            encontrado = true;
        }
    });

    const triggerCustom = document.querySelector('.fz-custom-picker-trigger');
    if (!encontrado) {
        triggerCustom.classList.add('activa');
        triggerCustom.style.background = colorHex;
    } else {
        triggerCustom.style.background = 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)';
    }
};

window.fz_actualizarPreviewLogo = function() {
    const url = document.getElementById('fz-cuenta-logo-url').value.trim();
    const icon = document.getElementById('fz-logo-icon');
    const img = document.getElementById('fz-logo-img');

    if (url) {
        img.src = url;
        img.style.display = 'block';
        icon.style.display = 'none';
    } else {
        img.src = '';
        img.style.display = 'none';
        icon.style.display = 'block';
    }
};
// ==========================================
// LÓGICA DE CATEGORÍAS
// ==========================================
function fz_pintarCategorias() {
    const contenedorIngresos = document.getElementById('fz-lista-categorias-ingreso');
    const contenedorGastos = document.getElementById('fz-lista-categorias-gasto');
    
    const categoriasActivas = fz_obtenerDatos().categorias.filter(c => !c.archivada);
    
    const pintarFila = (c) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-input); padding: 8px 12px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${c.color};"></div>
                <span style="color: var(--text-base); font-size: 13px; font-weight: 500;">${c.nombre}</span>
            </div>
            <div>
                <button class="btn-ghost" style="padding: 4px;" onclick="fz_abrirModalCategoria(${c.id})"><i class="ti ti-edit"></i></button>
                <button class="btn-borrar" style="padding: 4px;" onclick="fz_archivarCategoriaUI(${c.id})"><i class="ti ti-archive"></i></button>
            </div>
        </div>
    `;

    const ingresos = categoriasActivas.filter(c => c.tipo === 'ingreso');
    const gastos = categoriasActivas.filter(c => c.tipo === 'gasto');

    contenedorIngresos.innerHTML = ingresos.length ? ingresos.map(pintarFila).join('') : '<p style="color: var(--text-lo); font-size:12px;">Sin categorías</p>';
    contenedorGastos.innerHTML = gastos.length ? gastos.map(pintarFila).join('') : '<p style="color: var(--text-lo); font-size:12px;">Sin categorías</p>';
}

window.fz_abrirModalCategoria = function(id = null) {
    document.getElementById('fz-modal-categoria-titulo').textContent = id ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('fz-categoria-id').value = id || '';
    
    if (id) {
        const cat = fz_obtenerDatos().categorias.find(c => c.id === id);
        document.getElementById('fz-categoria-nombre').value = cat.nombre;
        document.getElementById('fz-categoria-tipo').value = cat.tipo;
        document.getElementById('fz-categoria-color').value = cat.color || '#2773d6';
    } else {
        document.getElementById('fz-categoria-nombre').value = '';
        document.getElementById('fz-categoria-tipo').value = 'gasto';
        document.getElementById('fz-categoria-color').value = '#e74c3c'; // Rojo por defecto para gastos
    }
    
    document.getElementById('fz-modal-categoria').classList.add('visible');
};

window.fz_guardarFormularioCategoria = function() {
    const idInput = document.getElementById('fz-categoria-id').value;
    const nombre = document.getElementById('fz-categoria-nombre').value.trim();
    const tipo = document.getElementById('fz-categoria-tipo').value;
    const color = document.getElementById('fz-categoria-color').value;

    if (!nombre) return alert("El nombre es obligatorio");

    fz_guardarCategoria({
        id: idInput ? parseInt(idInput) : Date.now(),
        nombre: nombre,
        tipo: tipo,
        color: color,
        archivada: false
    });

    document.getElementById('fz-modal-categoria').classList.remove('visible');
    fz_pintarCategorias();
};

window.fz_archivarCategoriaUI = function(id) {
    if(confirm("¿Seguro que deseas archivar esta categoría? Los registros antiguos seguirán atados a ella de forma segura.")) {
        fz_archivarCategoria(id);
        fz_pintarCategorias();
    }
};

// ==========================================
// CEREBRO MATEMÁTICO Y DASHBOARD
// ==========================================

// 1. Calcula el saldo real actual de una cuenta específica
// 1. Calcula el saldo real actual de una cuenta específica
function fz_calcularSaldoCuenta(cuentaId) {
    const datos = fz_obtenerDatos();
    const cuenta = datos.cuentas.find(c => c.id === cuentaId);
    if (!cuenta) return 0;

    const hoy = new Date().toISOString().split('T')[0]; // "2026-05-20"
    let saldoActual = cuenta.saldo_inicial || 0;

    // Solo cuenta transacciones hasta HOY y que estén marcadas como pagadas
    const transContables = datos.transacciones.filter(t =>
        !t.archivada &&
        t.fecha <= hoy &&
        t.pagado !== false
    );

    transContables.forEach(t => {
        if (t.tipo === 'ingreso' && t.cuenta_id === cuentaId) saldoActual += t.monto;
        if (t.tipo === 'gasto' && t.cuenta_id === cuentaId) saldoActual -= t.monto;
        if (t.tipo === 'transferencia') {
            if (t.cuenta_id === cuentaId) saldoActual -= t.monto;
            if (t.cuenta_destino_id === cuentaId) saldoActual += t.monto;
        }
    });

    return saldoActual;
}

// 2. Calcula la suma de TODO el dinero en todas las cuentas
function fz_calcularSaldoTotal() {
    const datos = fz_obtenerDatos();
    // 🚨 Filtro: Si incluir_dashboard es exactamente false, lo saltamos.
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada && c.incluir_dashboard !== false);
    return cuentasActivas.reduce((total, c) => total + fz_calcularSaldoCuenta(c.id), 0);
}

// 3. Pinta la pantalla principal (Resumen)
let fz_graficoInstancia = null; // Guardará el gráfico para destruirlo/crearlo al cambiar de mes

function fz_pintarResumen() {
    const datos = fz_obtenerDatos();
    const transActivas = datos.transacciones.filter(t => !t.archivada);

    const year = fz_fechaActual.getFullYear();
    const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
    const mesFiltro = `${year}-${month}`;

    // Todas las transacciones del mes seleccionado, sin importar si son futuras o pendientes
    const transDelMes = transActivas.filter(t => t.fecha.startsWith(mesFiltro));

    let ingresosMes = 0;
    let gastosMes = 0;

    transDelMes.forEach(t => {
        if (t.tipo === 'ingreso') ingresosMes += t.monto;
        if (t.tipo === 'gasto') gastosMes += t.monto;
    });

    // Saldo General: SIEMPRE el dinero real a hoy, nunca incluye el futuro
    document.getElementById('fz-saldo-general').textContent = formatearDinero(fz_calcularSaldoTotal());

    // Ingresos y Gastos: muestran el total del mes navegado (proyectado si es futuro)
    document.getElementById('fz-ingresos-mes').textContent = `+${formatearDinero(ingresosMes)}`;
    document.getElementById('fz-gastos-mes').textContent = `-${formatearDinero(gastosMes)}`;

    fz_renderizarGraficoGastos(transDelMes, datos.categorias);
}

// 4. Genera el gráfico de dona de Chart.js
function fz_renderizarGraficoGastos(transDelMes, categorias) {
    const canvas = document.getElementById('fz-grafico-gastos');
    const emptyMsg = document.getElementById('fz-grafico-vacio');
    
    const gastos = transDelMes.filter(t => t.tipo === 'gasto');
    
    if (gastos.length === 0) {
        canvas.style.display = 'none';
        emptyMsg.style.display = 'block';
        if (fz_graficoInstancia) fz_graficoInstancia.destroy();
        return;
    }
    
    canvas.style.display = 'block';
    emptyMsg.style.display = 'none';

    // Agrupar gastos por categoría
    let totalesCat = {};
    gastos.forEach(g => {
        totalesCat[g.categoria_id] = (totalesCat[g.categoria_id] || 0) + g.monto;
    });

    const labels = [];
    const data = [];
    const bgColors = [];

    Object.keys(totalesCat).forEach(catId => {
        const cat = categorias.find(c => c.id == catId);
        labels.push(cat ? cat.nombre : 'Sin Categoría');
        data.push(totalesCat[catId]);
        bgColors.push(cat ? cat.color : 'var(--text-lo)');
    });

    if (fz_graficoInstancia) fz_graficoInstancia.destroy();

    const colorTexto = getComputedStyle(document.body).getPropertyValue('--text-lo').trim() || '#888';

    fz_graficoInstancia = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { color: colorTexto, font: {family: 'Inter, sans-serif'} } }
            }
        }
    });
}

// Funciones Modal Transferencia
window.fz_abrirModalTransferencia = function() {
    const datos = fz_obtenerDatos();
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada);

    if (cuentasActivas.length < 2) return alert("Debes crear al menos 2 Cuentas para poder transferir dinero entre ellas.");

    const opciones = cuentasActivas.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    document.getElementById('fz-transf-origen').innerHTML = opciones;
    document.getElementById('fz-transf-destino').innerHTML = opciones;
    
    // Seleccionar por defecto la segunda cuenta en el destino para que no sean la misma
    if(cuentasActivas.length > 1) {
        document.getElementById('fz-transf-destino').selectedIndex = 1;
    }

    document.getElementById('fz-transf-monto').value = '';
    document.getElementById('fz-transf-fecha').value = new Date().toISOString().split('T')[0];

    document.getElementById('fz-modal-transferencia').classList.add('visible');
};

window.fz_guardarFormularioTransferencia = function() {
    const monto = parseFloat(document.getElementById('fz-transf-monto').value);
    const origen = parseInt(document.getElementById('fz-transf-origen').value);
    const destino = parseInt(document.getElementById('fz-transf-destino').value);
    const fecha = document.getElementById('fz-transf-fecha').value;

    if (!monto || monto <= 0) return alert("Ingresa un monto válido.");
    if (origen === destino) return alert("La cuenta de origen y destino no pueden ser la misma.");
    if (!fecha) return alert("Selecciona una fecha.");

    fz_guardarTransaccion({
        id: Date.now(),
        tipo: 'transferencia',
        monto: monto,
        descripcion: "Transferencia",
        fecha: fecha,
        cuenta_id: origen,
        cuenta_destino_id: destino,
        categoria_id: null,
        archivada: false
    });

    document.getElementById('fz-modal-transferencia').classList.remove('visible');
    fz_pintarTransacciones();
};



