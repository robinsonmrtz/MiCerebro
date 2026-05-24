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
    else if (fz_tabActual === 'comercios') fz_pintarComercios();
    // Las nuevas vistas no tienen función aún, así que no llaman a nada y muestran el letrero "En construcción"
}
// ==========================================
// LÓGICA DE TRANSACCIONES
// ==========================================

window.fz_filtroTransTipoActual = 'todos'; // Variable global de filtro

function fz_pintarTransacciones() {
    const contenedor = document.getElementById('fz-lista-transacciones-tabla');
    if (!contenedor) return;

    const datos = fz_obtenerDatos();
    const transActivas = datos.transacciones.filter(t => !t.archivada);
    const query = (document.getElementById('fz-trans-search-input')?.value || '').toLowerCase();

    const year = fz_fechaActual.getFullYear();
    const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
    const mesFiltro = `${year}-${month}`;

    // 1. Filtrar por mes
    let transDelMes = transActivas.filter(t => t.fecha.startsWith(mesFiltro));

    // 2. Filtro por tipo (gasto, ingreso, todos, transferencias)
    if (window.fz_filtroTransTipoActual !== 'todos') {
        transDelMes = transDelMes.filter(t => t.tipo === window.fz_filtroTransTipoActual);
    }

    // 3. Búsqueda por texto (Descripción o Comercio)
    if (query) {
        transDelMes = transDelMes.filter(t => 
            t.descripcion.toLowerCase().includes(query) || 
            (t.comercio && t.comercio.toLowerCase().includes(query))
        );
    }

    if (transDelMes.length === 0) {
        contenedor.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-lo);">No hay movimientos registrados.</div>`;
        return;
    }

    // 4. Agrupar por fecha
    const grupos = {};
    transDelMes.forEach(t => {
        if (!grupos[t.fecha]) grupos[t.fecha] = [];
        grupos[t.fecha].push(t);
    });

    let html = '';

    // 5. Renderizar ordenado (de más reciente a más antiguo)
    Object.keys(grupos).sort((a, b) => new Date(b) - new Date(a)).forEach(fecha => {
        
        // Formateador de Fecha "Viernes, 21 de Mayo"
        const objFecha = new Date(fecha + 'T00:00:00');
        const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
        let fechaTexto = objFecha.toLocaleDateString('es-ES', opciones);
        fechaTexto = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);

        html += `<div class="fz-trans-date-header">${fechaTexto}</div>`;

        grupos[fecha].sort((a, b) => b.id - a.id).forEach(t => {
            let colorDinero, signo, colorCat, iconoCat, nombreCat;

            if (t.tipo === 'transferencia') {
                colorDinero = '#2773d6';
                signo = '⇄ ';
                colorCat = '#2773d6';
                iconoCat = '⇄';
                nombreCat = 'Transferencia';
            } else {
                const esIngreso = t.tipo === 'ingreso';
                colorDinero = esIngreso ? 'var(--status-ok)' : 'var(--status-danger)';
                signo = esIngreso ? '+' : '-';
                const categoria = datos.categorias.find(c => c.id == t.categoria_id);
                colorCat = categoria ? categoria.color : 'var(--text-lo)';
                iconoCat = categoria ? (categoria.emoji || '🏷️') : '🏷️';
                nombreCat = categoria ? categoria.nombre : 'Sin categoría';
            }

            // Función de Edición Dinámica
            const editFn = t.tipo === 'transferencia' ? `fz_abrirModalTransferencia(${t.id})` : `fz_abrirModalTransaccion('${t.tipo}', ${t.id})`;

            html += `
            <div class="fz-trans-row">
                <div class="fz-cat-col-nombre-cell fz-trans-col-desc">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span style="font-weight:600; color:var(--text-hi); font-size:13.5px;">${t.descripcion}</span>
                        ${t.comercio ? `<span style="font-size:11px; color:var(--text-lo);"><i class="ti ti-building-store"></i> ${t.comercio}</span>` : ''}
                    </div>
                </div>
                <div class="fz-cat-col-icono-cell fz-trans-col-cat">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:26px; height:26px; border-radius:8px; background:rgba(0,0,0,0.05); border: 1px solid var(--border-card); display:flex; align-items:center; justify-content:center; font-size:14px; color:${colorCat};">
                            ${iconoCat}
                        </div>
                        <span style="font-size:12.5px; color:var(--text-base);">${nombreCat}</span>
                    </div>
                </div>
                <div class="fz-cat-col-color-cell fz-trans-col-monto" style="justify-content: flex-end;">
                    <span style="color: ${colorDinero}; font-size: 14px; font-weight: 700;">${signo}${formatearDinero(t.monto)}</span>
                </div>
                <div class="fz-cat-col-acciones-cell fz-trans-col-acc" style="justify-content: center;">
                    <button class="fz-cat-action-btn" title="Editar" onclick="${editFn}"><i class="ti ti-pencil"></i></button>
                    <button class="fz-cat-action-btn" title="Eliminar" style="color: var(--status-danger);" onclick="fz_eliminarTransaccionUI(${t.id})"><i class="ti ti-trash"></i></button>
                </div>
            </div>`;
        });
    });

    contenedor.innerHTML = html;
}

// --- HELPERS UI DE TRANSACCIONES ---
window.fz_toggleBuscadorTrans = function() {
    const bar = document.getElementById('fz-trans-search-bar');
    const oculto = bar.style.display === 'none' || bar.style.display === '';
    bar.style.display = oculto ? 'flex' : 'none';
    if (oculto) document.getElementById('fz-trans-search-input')?.focus();
};

window.fz_toggleTransTipoMenu = function() {
    document.getElementById('fz-trans-tipo-menu').classList.toggle('visible');
    document.getElementById('fz-trans-add-menu').classList.remove('visible'); // Cierra el otro
};

window.fz_toggleAddTransMenu = function() {
    document.getElementById('fz-trans-add-menu').classList.toggle('visible');
    document.getElementById('fz-trans-tipo-menu').classList.remove('visible'); // Cierra el otro
};

window.fz_filtrarTransacciones = function(tipo) {
    window.fz_filtroTransTipoActual = tipo;
    const label = document.getElementById('fz-trans-pill-label');
    const icon = document.getElementById('fz-trans-pill-arrow');
    
    if(tipo === 'todos') { label.innerText = 'Todos los movimientos'; icon.className = 'ti ti-filter'; }
    if(tipo === 'ingreso') { label.innerText = 'Ingresos'; icon.className = 'ti ti-plus'; }
    if(tipo === 'gasto') { label.innerText = 'Gastos'; icon.className = 'ti ti-minus'; }
    if(tipo === 'transferencia') { label.innerText = 'Transferencias'; icon.className = 'ti ti-arrows-right-left'; }
    
    document.getElementById('fz-trans-tipo-menu').classList.remove('visible');
    fz_pintarTransacciones();
};
// Para que los botones rápidos funcionen
// Para que los botones rápidos funcionen
window.abrirModalTransaccion = function(tipo) { window.fz_abrirModalTransaccion(tipo); };

window.fz_abrirModalTransaccion = function(tipo, id = null) {
    const datos = fz_obtenerDatos();
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada);
    
    if (cuentasActivas.length === 0) {
        return alert("Debes crear al menos una Cuenta financiera antes de registrar movimientos.");
    }

    // Configurar Tipo y Títulos Visuales
    document.getElementById('fz-trans-tipo').value = tipo;
    document.getElementById('fz-trans-id').value = id || '';
    
    const txtTitulo = document.getElementById('fz-modal-trans-titulo');
    const txtSimbolo = document.getElementById('fz-trans-simbolo-tipo');
    const containerGastoFijo = document.getElementById('fz-container-gasto-fijo');
    const containerUnidad = document.getElementById('fz-container-unidad');
    const containerCantidad = document.getElementById('fz-container-cantidad');
    
    if (tipo === 'ingreso') {
        txtTitulo.innerHTML = id ? `Editar <span style="color: var(--status-ok);">Ingreso</span>` : `Registrar <span style="color: var(--status-ok);">Ingreso</span>`;
        txtSimbolo.style.color = 'var(--status-ok)';
        if (containerGastoFijo) {
            containerGastoFijo.style.visibility = 'visible';
            const tituloFijo = containerGastoFijo.querySelector('.fz-toggle-titulo');
            if (tituloFijo) tituloFijo.innerText = 'Ingreso fijo mensual';
        }
        if (containerUnidad) containerUnidad.style.display = 'none';
        if (containerCantidad) containerCantidad.style.display = 'flex';
        const toggleTitulo = document.getElementById('fz-lbl-toggle-titulo');
        if (toggleTitulo) toggleTitulo.innerText = 'Recibido';
    } else {
        txtTitulo.innerHTML = id ? `Editar <span style="color: var(--status-danger);">Gasto</span>` : `Registrar <span style="color: var(--status-danger);">Gasto</span>`;
        txtSimbolo.style.color = 'var(--status-danger)';
        if (containerGastoFijo) {
            containerGastoFijo.style.visibility = 'visible';
            const tituloFijo = containerGastoFijo.querySelector('.fz-toggle-titulo');
            if (tituloFijo) tituloFijo.innerText = 'Gasto fijo mensual';
        }
        if (containerUnidad) containerUnidad.style.display = 'flex';
        if (containerCantidad) containerCantidad.style.display = 'flex';
        const toggleTitulo = document.getElementById('fz-lbl-toggle-titulo');
        if (toggleTitulo) toggleTitulo.innerText = 'Estado del pago';
    }

    // Llenar Cuentas
    document.getElementById('fz-trans-cuenta').innerHTML = cuentasActivas.map(c => 
        `<option value="${c.id}">${c.nombre}</option>`
    ).join('');

    // === MODO EDICIÓN vs MODO CREACIÓN ===
    if (id) {
        // Pre-llenar Formulario (Update)
        const trans = datos.transacciones.find(t => t.id === id);
        if(trans) {
            document.getElementById('fz-trans-monto').value = trans.monto;
            document.getElementById('fz-trans-desc').value = trans.descripcion;
            document.getElementById('fz-trans-fecha').value = trans.fecha;
            document.getElementById('fz-trans-cuenta').value = trans.cuenta_id;
            document.getElementById('fz-trans-categoria').value = trans.categoria_id;
            
            const cat = datos.categorias.find(c => c.id == trans.categoria_id);
            document.getElementById('fz-trans-cat-input').value = cat ? cat.nombre : '';
            
            document.getElementById('fz-trans-comercio-input').value = trans.comercio || '';
            if(document.getElementById('fz-trans-unidad')) document.getElementById('fz-trans-unidad').value = trans.unidad || '';
            if(document.getElementById('fz-trans-cantidad')) document.getElementById('fz-trans-cantidad').value = trans.cantidad || '';
            document.getElementById('fz-trans-observacion').value = trans.observacion || '';
            
            document.getElementById('fz-trans-pagado').checked = trans.pagado;
            if(document.getElementById('fz-trans-gasto-fijo')) document.getElementById('fz-trans-gasto-fijo').checked = trans.gasto_fijo;
            
            fz_alCambiarFechaManual(); // Limpia los botones "Hoy/Ayer"
        }
    } else {
        // Limpiar Formulario (Create)
        document.getElementById('fz-trans-monto').value = '';
        document.getElementById('fz-trans-desc').value = '';
        if(document.getElementById('fz-trans-unidad')) document.getElementById('fz-trans-unidad').value = '';
        if(document.getElementById('fz-trans-cantidad')) document.getElementById('fz-trans-cantidad').value = '';
        document.getElementById('fz-trans-observacion').value = '';
        document.getElementById('fz-trans-cat-input').value = '';
        document.getElementById('fz-trans-categoria').value = '';
        document.getElementById('fz-trans-comercio-input').value = '';
        document.getElementById('fz-trans-pagado').checked = true;
        if(document.getElementById('fz-trans-gasto-fijo')) document.getElementById('fz-trans-gasto-fijo').checked = false;
        
        fz_establecerFechaRapida('hoy');
    }

    // Toggle Labels
    document.getElementById('fz-trans-pagado').onchange = function() {
        const esIngreso = document.getElementById('fz-trans-tipo').value === 'ingreso';
        const label = document.getElementById('fz-lbl-toggle-pagado');
        if (label) {
            if (esIngreso) {
                label.innerText = this.checked ? 'Sí' : 'No';
            } else {
                label.innerText = this.checked ? 'Marcado como pagado' : 'Pendiente por pagar / Cobrar';
            }
        }
    };
    document.getElementById('fz-trans-pagado').onchange();
    
    // Cerrar Menús
    document.getElementById('fz-trans-add-menu')?.classList.remove('visible');
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
    const input    = document.getElementById('fz-trans-cat-input');
    const query    = input.value.trim().toLowerCase();
    const dropdown = document.getElementById('fz-drop-categorias');
    const tipo     = document.getElementById('fz-trans-tipo').value;

    const datos  = fz_obtenerDatos();
    const todas  = datos.categorias.filter(c => !c.archivada && c.tipo === tipo);
    const padres = todas.filter(c => !c.parent_id);
    const hijos  = todas.filter(c =>  c.parent_id);

    dropdown.innerHTML = '';
    dropdown.classList.add('visible');

    padres.forEach(padre => {
        const hijosDelPadre = hijos.filter(h => h.parent_id === padre.id);
        const padreMatch    = padre.nombre.toLowerCase().includes(query);
        const hijoMatch     = hijosDelPadre.some(h => h.nombre.toLowerCase().includes(query));
        if (query && !padreMatch && !hijoMatch) return;

        if (padreMatch || !query) {
            const item = document.createElement('div');
            item.className = 'fz-autocomplete-option';
            item.innerHTML = `<span style="font-size:15px">${padre.emoji || '🏷️'}</span> <span style="font-weight:600">${padre.nombre}</span>`;
            item.onclick = () => {
                input.value = padre.nombre;
                document.getElementById('fz-trans-categoria').value = padre.id;
                dropdown.classList.remove('visible');
            };
            dropdown.appendChild(item);
        }

        hijosDelPadre.forEach(hijo => {
            if (query && !hijo.nombre.toLowerCase().includes(query) && !padreMatch) return;
            const item = document.createElement('div');
            item.className = 'fz-autocomplete-option';
            item.innerHTML = `<span style="padding-left:18px;color:var(--text-lo);font-size:12px">↳</span> <span>${hijo.nombre}</span>`;
            item.onclick = () => {
                input.value = hijo.nombre;
                document.getElementById('fz-trans-categoria').value = hijo.id;
                dropdown.classList.remove('visible');
            };
            dropdown.appendChild(item);
        });
    });

    if (query.length > 0 && !todas.some(c => c.nombre.toLowerCase() === query)) {
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
        emoji: tipo === 'ingreso' ? '💰' : '🏷️',
        parent_id: null,
        archivada: false
    };

    // Guardar nueva categoría y actualizar el input del modal
    try {
        fz_guardarCategoria(nuevaCat);
        const input = document.getElementById('fz-trans-cat-input'); if (input) input.value = nuevaCat.nombre;
        const hidden = document.getElementById('fz-trans-categoria'); if (hidden) hidden.value = nuevaCat.id;
        const drop = document.getElementById('fz-drop-categorias'); if (drop) drop.classList.remove('visible');
    } catch (e) {
        console.error('Error creando categoría express:', e);
    }

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
    // 1. Dropdown Unidad
    if (!e.target.closest('#fz-trans-unidad') && !e.target.closest('#fz-drop-unidad')) {
        document.getElementById('fz-drop-unidad')?.classList.remove('visible');
    }
    
    // 2. Dropdown Descripciones
    if (!e.target.closest('#fz-trans-desc') && !e.target.closest('#fz-drop-descripciones')) {
        document.getElementById('fz-drop-descripciones')?.classList.remove('visible');
    }
    
    // 3. Dropdown Categorías
    if (!e.target.closest('#fz-trans-cat-input') && !e.target.closest('#fz-drop-categorias')) {
        document.getElementById('fz-drop-categorias')?.classList.remove('visible');
    }
    
    // 4. Dropdown Comercios
    if (!e.target.closest('#fz-trans-comercio-input') && !e.target.closest('#fz-drop-comercios')) {
        document.getElementById('fz-drop-comercios')?.classList.remove('visible');
    }

    const menuMasCat = document.getElementById('fz-menu-mas-categorias');
    if (menuMasCat && menuMasCat.classList.contains('visible') && !e.target.closest('#fz-menu-mas-categorias') && !e.target.closest('button[onclick*="fz_toggleMenuMasCategorias"]')) {
        menuMasCat.classList.remove('visible');
    }

    // --- Agregar esto dentro del eventListener del Clic global ---
    const menuTransTipo = document.getElementById('fz-trans-tipo-menu');
    const btnTransTipo  = document.getElementById('fz-trans-pill-btn');
    if (menuTransTipo && menuTransTipo.classList.contains('visible') && btnTransTipo && !btnTransTipo.contains(e.target)) {
        menuTransTipo.classList.remove('visible');
    }

    const menuTransAdd = document.getElementById('fz-trans-add-menu');
    const btnTransAdd  = document.getElementById('fz-btn-add-trans');
    if (menuTransAdd && menuTransAdd.classList.contains('visible') && btnTransAdd && !btnTransAdd.contains(e.target)) {
        menuTransAdd.classList.remove('visible');
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
                        cantidad: rec.cantidad,
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
                    cantidad: rec.cantidad,
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
    const unidad = document.getElementById('fz-trans-unidad') ? document.getElementById('fz-trans-unidad').value : '';
    const inputCantidad = document.getElementById('fz-trans-cantidad');
    const cantidad = (inputCantidad && inputCantidad.value.trim() !== '') ? parseInt(inputCantidad.value.trim()) : null;
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
                cantidad: cantidad,
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
        cantidad: cantidad,
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

window.fz_eliminarTransaccionUI = function(id) {
    if(confirm("¿Seguro que deseas ELIMINAR este movimiento? El dinero se ajustará inmediatamente en el saldo de tu cuenta y no podrás recuperarlo.")) {
        fz_eliminarTransaccion(id);
        fz_pintarTransacciones();
        // Recalcular y pintar el resumen si estamos en esa pestaña
        if (fz_tabActual === 'resumen') fz_pintarResumen();
    }
};

// ==========================================
// CONTROLADORES DE CATEGORÍAS ARCHIVADAS / ELIMINADAS
// ==========================================
let fz_categoriaAEliminarId = null;

window.fz_toggleMenuMasCategorias = function(e) {
    e.stopPropagation();
    document.getElementById('fz-menu-mas-categorias').classList.toggle('visible');
};

window.fz_abrirModalCategoriasArchivadas = function() {
    document.getElementById('fz-menu-mas-categorias').classList.remove('visible');
    fz_pintarCategoriasArchivadas();
    document.getElementById('fz-modal-categorias-archivadas').classList.add('visible');
};

window.fz_pintarCategoriasArchivadas = function() {
    const datos = fz_obtenerDatos();
    const archivadas = datos.categorias.filter(c => c.archivada);
    const contenedor = document.getElementById('fz-lista-cat-archivadas');
    
    if(archivadas.length === 0) {
        contenedor.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-lo)">No hay categorías en el archivo.</div>';
        return;
    }
    
    contenedor.innerHTML = archivadas.map(c => `
        <div class="fz-cat-row" style="grid-template-columns: 1fr auto; padding: 12px 16px;">
            <div class="fz-cat-col-nombre-cell">
                <span class="fz-cat-emoji-badge" style="font-size:18px;">${c.emoji || '↳'}</span>
                <span style="color:var(--text-base); font-weight: 500;">${c.nombre} <span style="font-size: 11px; color: var(--text-lo);">(${c.tipo})</span></span>
            </div>
            <div class="fz-cat-col-acciones-cell">
                <button class="fz-cat-action-btn" title="Restaurar" onclick="fz_restaurarCategoriaUI(${c.id})"><i class="ti ti-arrow-back-up"></i></button>
                <button class="fz-cat-action-btn" style="color:var(--status-danger)" title="Eliminar definitivamente" onclick="fz_iniciarEliminacionCategoria(${c.id})"><i class="ti ti-trash"></i></button>
            </div>
        </div>
    `).join('');
};

window.fz_restaurarCategoriaUI = function(id) {
    fz_restaurarCategoria(id);
    fz_pintarCategoriasArchivadas();
    fz_pintarCategorias();
};

window.fz_iniciarEliminacionCategoria = function(id) {
    fz_categoriaAEliminarId = id;
    document.getElementById('fz-modal-categorias-archivadas').classList.remove('visible');
    document.getElementById('fz-modal-confirmar-eliminar-cat').classList.add('visible');
};

window.fz_opcionEliminarTodo = function() {
    if(confirm("🚨 ADVERTENCIA: Se borrarán TODOS los movimientos asociados a esta categoría. Esto alterará los saldos de tus cuentas. ¿Estás absolutamente seguro?")) {
        fz_eliminarCategoriaDefinitiva(fz_categoriaAEliminarId, null);
        document.getElementById('fz-modal-confirmar-eliminar-cat').classList.remove('visible');
        fz_pintarCategorias();
        fz_pintarTransacciones();
    }
};

window.fz_opcionEliminarYMover = function() {
    document.getElementById('fz-modal-confirmar-eliminar-cat').classList.remove('visible');
    
    const datos = fz_obtenerDatos();
    const catAEliminar = datos.categorias.find(c => c.id === fz_categoriaAEliminarId);
    const select = document.getElementById('fz-select-mover-cat');

    // Buscamos otras categorías activas (no archivadas) que sean del mismo tipo y que NO sean la que vamos a borrar ni sus hijos
    const opciones = datos.categorias.filter(c => !c.archivada && c.id !== fz_categoriaAEliminarId && c.parent_id !== fz_categoriaAEliminarId && c.tipo === catAEliminar.tipo);
    
    if(opciones.length === 0) {
        alert("No tienes otras categorías de este tipo disponibles. Por favor, restaura o crea otra categoría antes de usar la opción de mover.");
        return;
    }
    
    select.innerHTML = opciones.map(c => `<option value="${c.id}">${c.emoji || '↳'} ${c.nombre}</option>`).join('');
    document.getElementById('fz-modal-mover-cat').classList.add('visible');
};

window.fz_ejecutarMoverYEliminar = function() {
    const targetId = parseInt(document.getElementById('fz-select-mover-cat').value);
    if(!targetId) return alert("Selecciona una categoría destino.");
    
    fz_eliminarCategoriaDefinitiva(fz_categoriaAEliminarId, targetId);
    document.getElementById('fz-modal-mover-cat').classList.remove('visible');
    fz_pintarCategorias();
    fz_pintarTransacciones();
};

// ==========================================
// LÓGICA DE CUENTAS
// ==========================================
// ==========================================
// CÁLCULO DE SALDO PREVISTO
// ==========================================

// Saldo actual  = saldo_inicial + transacciones PAGADAS hasta HOY
// (ya lo hace fz_calcularSaldoCuenta — sin cambios)

// Saldo previsto = saldo_inicial + TODAS las transacciones hasta el fin del mes seleccionado
function fz_calcularSaldoPrevisto(cuentaId) {
    const datos = fz_obtenerDatos();
    const cuenta = datos.cuentas.find(c => c.id === cuentaId);
    if (!cuenta) return 0;

    const year  = fz_fechaActual.getFullYear();
    const month = fz_fechaActual.getMonth();
    const finMes = new Date(year, month + 1, 0).toISOString().split('T')[0]; // último día del mes

    let saldo = cuenta.saldo_inicial || 0;

    // Incluye pagadas Y pendientes, hasta el fin del mes navegado
    datos.transacciones.filter(t => !t.archivada && t.fecha <= finMes).forEach(t => {
        if (t.tipo === 'ingreso' && t.cuenta_id === cuentaId) saldo += t.monto;
        if (t.tipo === 'gasto'   && t.cuenta_id === cuentaId) saldo -= t.monto;
        if (t.tipo === 'transferencia') {
            if (t.cuenta_id         === cuentaId) saldo -= t.monto;
            if (t.cuenta_destino_id === cuentaId) saldo += t.monto;
        }
    });

    return saldo;
}

// ==========================================
// PINTADO DE CUENTAS — REDISEÑO MOBILLS
// ==========================================
function fz_pintarCuentas() {
    const contenedor = document.getElementById('fz-lista-cuentas');
    if (!contenedor) return;

    const datos = fz_obtenerDatos();
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada);

    // Totales del panel lateral
    const cuentasDashboard = datos.cuentas.filter(c => !c.archivada && c.incluir_dashboard !== false);
    const saldoActualTotal  = cuentasDashboard.reduce((s, c) => s + fz_calcularSaldoCuenta(c.id), 0);
    const saldoPrevistoTotal = cuentasDashboard.reduce((s, c) => s + fz_calcularSaldoPrevisto(c.id), 0);

    const cardsHtml = cuentasActivas.map(c => {
        const saldoActual   = fz_calcularSaldoCuenta(c.id);
        const saldoPrevisto = fz_calcularSaldoPrevisto(c.id);
        const colAct  = saldoActual   >= 0 ? 'var(--status-ok)' : 'var(--status-danger)';
        const colPrev = saldoPrevisto >= 0 ? 'var(--status-ok)' : 'var(--status-danger)';

        const logoHtml = c.logo
            ? `<img src="${c.logo}" style="width:34px;height:34px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">`
            : `<div style="width:34px;height:34px;border-radius:8px;background:${c.color||'#3498db'};display:flex;align-items:center;justify-content:center;">
                   <i class="ti ti-building-bank" style="color:#fff;font-size:17px;"></i>
               </div>`;

        return `
        <div class="fz-cuenta-card">
            <div class="fz-cuenta-card-header">
                <div style="display:flex;align-items:center;gap:10px;">
                    ${logoHtml}
                    <span class="fz-cuenta-card-nombre">${c.nombre}</span>
                </div>
                <div style="position:relative;">
                    <button class="fz-cat-icon-btn" style="border:none;background:transparent;width:30px;height:30px;" onclick="fz_toggleMenuCuenta(event,${c.id})">
                        <i class="ti ti-dots-vertical"></i>
                    </button>
                    <div class="fz-cuenta-menu" id="fz-menu-cuenta-${c.id}">
                        <div class="fz-cat-tipo-item" onclick="fz_abrirModalCuenta(${c.id})">
                            <i class="ti ti-pencil"></i> Editar
                        </div>
                        <div class="fz-cat-tipo-item" style="color:var(--status-danger)" onclick="fz_archivarCuentaUI(${c.id})">
                            <i class="ti ti-archive"></i> Archivar
                        </div>
                    </div>
                </div>
            </div>

            <div class="fz-cuenta-card-body">
                <div class="fz-cuenta-saldo-row">
                    <span class="fz-cuenta-saldo-label">Saldo actual</span>
                    <span class="fz-cuenta-saldo-valor" style="color:${colAct}">${formatearDinero(saldoActual)}</span>
                </div>
                <div class="fz-cuenta-saldo-row">
                    <span class="fz-cuenta-saldo-label">
                        Saldo previsto
                        <i class="ti ti-info-circle" title="Proyección al final del mes · incluye movimientos pendientes"></i>
                    </span>
                    <span class="fz-cuenta-saldo-valor" style="color:${colPrev}">${formatearDinero(saldoPrevisto)}</span>
                </div>
            </div>

            <div class="fz-cuenta-card-footer">
                <button class="fz-cuenta-quick-btn" onclick="fz_quickGasto(${c.id})">AÑADIR GASTO</button>
            </div>
        </div>`;
    }).join('');

    contenedor.innerHTML = `
    <div class="fz-cuentas-layout">

        <div class="fz-cuentas-grid">
            <div class="fz-cuenta-card fz-cuenta-nueva" onclick="fz_abrirModalCuenta()">
                <div class="fz-cuenta-nueva-inner">
                    <div class="fz-cuenta-nueva-circle"><i class="ti ti-plus"></i></div>
                    <span>Nueva cuenta</span>
                </div>
            </div>
            ${cardsHtml || `<p style="color:var(--text-lo);padding:20px;">Crea tu primera cuenta para empezar.</p>`}
        </div>

        <div class="fz-cuentas-resumen">
            <div class="fz-resumen-mini-card">
                <span class="fz-resumen-mini-label">Saldo actual</span>
                <span class="fz-resumen-mini-valor">${formatearDinero(saldoActualTotal)}</span>
                <div class="fz-resumen-mini-icon"><i class="ti ti-building-bank"></i></div>
            </div>
            <div class="fz-resumen-mini-card">
                <span class="fz-resumen-mini-label">Saldo previsto</span>
                <span class="fz-resumen-mini-valor">${formatearDinero(saldoPrevistoTotal)}</span>
                <div class="fz-resumen-mini-icon"><i class="ti ti-chart-line"></i></div>
            </div>
        </div>

    </div>`;
}

// Abre modal de gasto y preselecciona la cuenta
window.fz_quickGasto = function(cuentaId) {
    fz_abrirModalTransaccion('gasto');
    setTimeout(() => {
        const sel = document.getElementById('fz-trans-cuenta');
        if (sel) sel.value = cuentaId;
    }, 60);
};

// Menú contextual ⋮ de cada cuenta
window.fz_toggleMenuCuenta = function(e, id) {
    e.stopPropagation();
    document.querySelectorAll('.fz-cuenta-menu.visible').forEach(m => {
        if (m.id !== `fz-menu-cuenta-${id}`) m.classList.remove('visible');
    });
    document.getElementById(`fz-menu-cuenta-${id}`)?.classList.toggle('visible');
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
// ==========================================
// LÓGICA DE CATEGORÍAS REDISEÑADA
// ==========================================
let fz_catTipoActual = 'gasto';

const FZ_EMOJIS = {
    'Finanzas':        ['💰','💵','💴','💶','💷','💳','🏧','💎','📈','📉','📊','🏦','🏪','🏬','🛒','🛍️','🤑','💸','🪙','💹'],
    'Comida':          ['🍔','🍕','🍣','🍜','🍱','🥗','🍰','🍩','☕','🍺','🍷','🥤','🥦','🥩','🍞','🍳','🥐','🍦','🍭','🥡'],
    'Transporte':      ['🚗','🚕','✈️','🚌','🚇','🛵','🚲','⛽','🚦','🛣️','🚁','🛳️','🏎️','🛺','🚐','🚓'],
    'Hogar':           ['🏠','🏡','🛋️','🛏️','🔧','💡','💧','🔌','📦','🧹','🧺','🪴','🛁','🪑','🖼️','🪞'],
    'Salud':           ['💊','🏥','🩺','🧘','🏋️','💪','🦷','👓','🩹','🧪','🩻','💉','🧬','🏃','🧴','🪥'],
    'Entretenimiento': ['🎮','🎬','🎵','🎸','📺','📱','💻','🎯','⚽','🏀','🎭','🎲','🎻','🎹','🎨','📸'],
    'Educación':       ['📚','📖','✏️','🎓','🏫','📝','🔬','🔭','🗺️','📐','📏','🖊️','📓'],
    'Personas':        ['👨‍👩‍👧','👤','🤝','❤️','🎁','🎉','🎂','💌','👶','🐾','💍','🌹'],
    'Naturaleza':      ['🌿','🌱','🌳','🌺','☀️','🌙','⭐','🌊','🌈','🌵','🍀','🌸','🦋','🐝'],
    'Servicios':       ['📡','🔐','🛡️','⚙️','🔑','📋','🗂️','📁','🗃️','🔒','📮','🖨️'],
    'Símbolos':        ['✅','❌','⚠️','💯','🔴','🟢','🔵','🟡','⭕','🏷️','📌','📍','🔖','⚡','🔥','💫']
};

function fz_pintarCategorias() {
    const contenedor = document.getElementById('fz-lista-categorias-tabla');
    if (!contenedor) return;
    const query = (document.getElementById('fz-cat-search-input')?.value || '').toLowerCase();

    const datos = fz_obtenerDatos();
    const todas = datos.categorias.filter(c => !c.archivada && c.tipo === fz_catTipoActual);
    const padres = todas.filter(c => !c.parent_id);
    const hijos  = todas.filter(c =>  c.parent_id);

    let filas = '';
    const esIngreso = fz_catTipoActual === 'ingreso';

    padres.forEach(padre => {
        const hijosDelPadre = hijos.filter(h => h.parent_id === padre.id);
        const padreMatch = padre.nombre.toLowerCase().includes(query);
        const hijoMatch  = hijosDelPadre.some(h => h.nombre.toLowerCase().includes(query));
        if (query && !padreMatch && !hijoMatch) return;

        const emoji = padre.emoji || '🏷️';
        filas += `
        <div class="fz-cat-row">
            <div class="fz-cat-col-nombre-cell">
                <span style="font-weight:600;color:var(--text-hi)">${padre.nombre}</span>
            </div>
            <div class="fz-cat-col-icono-cell">
                <span class="fz-cat-emoji-badge">${emoji}</span>
            </div>
            <div class="fz-cat-col-color-cell">
                <div class="fz-cat-color-dot" style="background:${padre.color || '#888'}"></div>
            </div>
            <div class="fz-cat-col-acciones-cell">
                <button class="fz-cat-action-btn" title="Editar" onclick="fz_abrirModalCategoria(${padre.id})"><i class="ti ti-pencil"></i></button>
                <button class="fz-cat-action-btn" title="Archivar" onclick="fz_archivarCategoriaUI(${padre.id})"><i class="ti ti-archive"></i></button>
                <button class="fz-cat-action-btn add-sub${esIngreso ? ' ingreso' : ''}" title="Agregar subcategoría" onclick="fz_abrirModalSubcategoria(${padre.id})">
                    <i class="ti ti-plus"></i>
                </button>
            </div>
        </div>`;

        hijosDelPadre.forEach(hijo => {
            if (query && !hijo.nombre.toLowerCase().includes(query) && !padreMatch) return;
            filas += `
            <div class="fz-cat-row es-sub">
                <div class="fz-cat-col-nombre-cell">
                    <span class="fz-cat-sub-arrow">↳</span>
                    <span style="color:var(--text-base)">${hijo.nombre}</span>
                </div>
                <div class="fz-cat-col-icono-cell"></div>
                <div class="fz-cat-col-color-cell">
                    <div class="fz-cat-color-dot" style="background:${hijo.color || padre.color || '#888'}"></div>
                </div>
                <div class="fz-cat-col-acciones-cell">
                    <button class="fz-cat-action-btn" title="Editar" onclick="fz_abrirModalCategoria(${hijo.id})"><i class="ti ti-pencil"></i></button>
                    <button class="fz-cat-action-btn" title="Archivar" onclick="fz_archivarCategoriaUI(${hijo.id})"><i class="ti ti-archive"></i></button>
                </div>
            </div>`;
        });
    });

    contenedor.innerHTML = filas || `<div style="padding:30px;text-align:center;color:var(--text-lo)">Sin categorías. Usa el botón + para crear una.</div>`;
}

window.fz_cambiarTipoCat = function(tipo) {
    fz_catTipoActual = tipo;
    const pill   = document.getElementById('fz-cat-pill-btn');
    const label  = document.getElementById('fz-cat-pill-label');
    const addBtn = document.querySelector('.fz-cat-add-pill');
    if (tipo === 'ingreso') {
        label.textContent = 'Categorías Ingresos';
        pill.classList.add('ingreso-activo');
        if (addBtn) addBtn.style.background = 'var(--status-ok)';
    } else {
        label.textContent = 'Categorías Gastos';
        pill.classList.remove('ingreso-activo');
        if (addBtn) addBtn.style.background = 'var(--status-danger)';
    }
    document.getElementById('fz-cat-tipo-menu').classList.remove('visible');
    const arrow = document.getElementById('fz-cat-pill-arrow');
    if (arrow) arrow.style.transform = '';
    fz_pintarCategorias();
};

window.fz_toggleCatTipoMenu = function() {
    const menu  = document.getElementById('fz-cat-tipo-menu');
    const arrow = document.getElementById('fz-cat-pill-arrow');
    menu.classList.toggle('visible');
    if (arrow) arrow.style.transform = menu.classList.contains('visible') ? 'rotate(180deg)' : '';
};

window.fz_toggleBuscadorCat = function() {
    const bar = document.getElementById('fz-cat-search-bar');
    const oculto = bar.style.display === 'none' || bar.style.display === '';
    bar.style.display = oculto ? 'flex' : 'none';
    if (oculto) document.getElementById('fz-cat-search-input')?.focus();
};

document.addEventListener('click', function(e) {
    const menu = document.getElementById('fz-cat-tipo-menu');
    const btn  = document.getElementById('fz-cat-pill-btn');
    if (menu && menu.classList.contains('visible') && btn && !btn.contains(e.target)) {
        menu.classList.remove('visible');
        const arrow = document.getElementById('fz-cat-pill-arrow');
        if (arrow) arrow.style.transform = '';
    }
        if (!e.target.closest('.fz-cuenta-menu') && !e.target.closest('button[onclick*="fz_toggleMenuCuenta"]')) {
        document.querySelectorAll('.fz-cuenta-menu.visible').forEach(m => m.classList.remove('visible'));
    }
});

window.fz_abrirModalCategoria = function(id = null) {
    document.getElementById('fz-modal-categoria-titulo').textContent = id ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('fz-categoria-id').value       = id || '';
    document.getElementById('fz-categoria-parent-id').value = '';
    document.getElementById('fz-categoria-es-sub').value    = '';

    const emojiGroup = document.getElementById('fz-cat-emoji-group');
    const tipoGroup  = document.getElementById('fz-cat-tipo-group');

    if (id) {
        const cat = fz_obtenerDatos().categorias.find(c => c.id === id);
        document.getElementById('fz-categoria-nombre').value = cat.nombre;
        document.getElementById('fz-cat-emoji-preview').textContent = cat.emoji || '🏷️';
        fz_activarColorCat(cat.color || '#e74c3c');

        if (cat.parent_id) {
            // Es subcategoría: sin emoji ni tipo
            emojiGroup.style.display = 'none';
            tipoGroup.style.display  = 'none';
            // Mantener la jerarquía al editar para que no se convierta en categoría padre
            document.getElementById('fz-categoria-parent-id').value = cat.parent_id;
            document.getElementById('fz-categoria-es-sub').value = '1';
        } else {
            emojiGroup.style.display = 'flex';
            tipoGroup.style.display  = 'flex';
            document.getElementById('fz-categoria-tipo').value = cat.tipo;
        }
    } else {
        document.getElementById('fz-categoria-nombre').value = '';
        document.getElementById('fz-cat-emoji-preview').textContent = '🏷️';
        document.getElementById('fz-categoria-tipo').value = fz_catTipoActual;
        emojiGroup.style.display = 'flex';
        tipoGroup.style.display  = 'flex';
        fz_activarColorCat(fz_catTipoActual === 'ingreso' ? '#2ecc71' : '#e74c3c');
    }

    document.getElementById('fz-modal-categoria').classList.add('visible');
};

window.fz_abrirModalSubcategoria = function(parentId) {
    const padre = fz_obtenerDatos().categorias.find(c => c.id === parentId);
    document.getElementById('fz-modal-categoria-titulo').textContent = `Subcategoría de "${padre?.nombre || ''}"`;
    document.getElementById('fz-categoria-id').value        = '';
    document.getElementById('fz-categoria-parent-id').value = parentId;
    document.getElementById('fz-categoria-es-sub').value    = '1';
    document.getElementById('fz-categoria-nombre').value    = '';
    document.getElementById('fz-cat-emoji-group').style.display = 'none';
    document.getElementById('fz-cat-tipo-group').style.display  = 'none';
    fz_activarColorCat(padre?.color || '#e74c3c');
    document.getElementById('fz-modal-categoria').classList.add('visible');
};

window.fz_guardarFormularioCategoria = function() {
    const idInput  = document.getElementById('fz-categoria-id').value;
    const parentId = document.getElementById('fz-categoria-parent-id').value;
    const esSub    = document.getElementById('fz-categoria-es-sub').value === '1';
    const nombre   = document.getElementById('fz-categoria-nombre').value.trim();
    const color    = document.getElementById('fz-categoria-color').value;
    if (!nombre) return alert("El nombre es obligatorio");

    let tipo, emoji;
    if (esSub) {
        const padre = fz_obtenerDatos().categorias.find(c => c.id === parseInt(parentId));
        tipo  = padre ? padre.tipo : fz_catTipoActual;
        emoji = null;
    } else {
        tipo  = document.getElementById('fz-categoria-tipo').value;
        emoji = document.getElementById('fz-cat-emoji-preview').textContent || '🏷️';
    }

    fz_guardarCategoria({
        id:        idInput ? parseInt(idInput) : Date.now(),
        nombre, tipo, color, emoji,
        parent_id: parentId ? parseInt(parentId) : null,
        archivada: false
    });

    document.getElementById('fz-modal-categoria').classList.remove('visible');
    fz_pintarCategorias();
};

window.fz_archivarCategoriaUI = function(id) {
    if (confirm("¿Archivar esta categoría? Sus subcategorías también se archivarán.")) {
        const datos = fz_obtenerDatos();
        datos.categorias.filter(c => c.parent_id === id).forEach(h => fz_archivarCategoria(h.id));
        fz_archivarCategoria(id);
        fz_pintarCategorias();
    }
};

// ==========================================
// COLORES DEL MODAL DE CATEGORÍA
// ==========================================
window.fz_seleccionarColorCat = function(el, color) {
    document.getElementById('fz-categoria-color').value = color;
    document.querySelectorAll('.fz-cat-color-circle').forEach(c => c.classList.remove('activa'));
    el.classList.add('activa');
};

window.fz_colorCatCustom = function(input) {
    const color = input.value;
    document.getElementById('fz-categoria-color').value = color;
    document.querySelectorAll('.fz-cat-color-circle').forEach(c => c.classList.remove('activa'));
    const trigger = input.parentElement;
    trigger.classList.add('activa');
    trigger.style.background = color;
};

function fz_activarColorCat(colorHex) {
    document.getElementById('fz-categoria-color').value = colorHex;
    let encontrado = false;
    document.querySelectorAll('.fz-cat-color-circle:not(.fz-cat-color-custom)').forEach(c => {
        c.classList.remove('activa');
        if (c.style.background === colorHex) { c.classList.add('activa'); encontrado = true; }
    });
    const custom = document.querySelector('.fz-cat-color-custom');
    if (custom) {
        if (!encontrado) { custom.classList.add('activa'); custom.style.background = colorHex; }
        else { custom.classList.remove('activa'); custom.style.background = 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)'; }
    }
}

// ==========================================
// EMOJI PICKER
// ==========================================
window.fz_toggleEmojiPicker = function() {
    document.getElementById('fz-emoji-search').value = '';
    fz_renderizarEmojis(FZ_EMOJIS);
    document.getElementById('fz-modal-emoji').classList.add('visible');
};

function fz_renderizarEmojis(fuente) {
    const grid = document.getElementById('fz-emoji-grid');
    const titulo = document.getElementById('fz-emoji-section-title');
    if (Array.isArray(fuente)) {
        titulo.textContent = 'Resultados';
        grid.innerHTML = fuente.map(e =>
            `<button class="fz-emoji-btn" onclick="fz_seleccionarEmoji('${e}')">${e}</button>`
        ).join('');
    } else {
        const grupos = Object.keys(fuente);
        titulo.textContent = grupos[0] || '';
        grid.innerHTML = grupos.map(g =>
            fuente[g].map(e => `<button class="fz-emoji-btn" onclick="fz_seleccionarEmoji('${e}')">${e}</button>`).join('')
        ).join('');
    }
}

window.fz_filtrarEmojis = function() {
    const q = document.getElementById('fz-emoji-search').value.toLowerCase().trim();
    if (!q) { fz_renderizarEmojis(FZ_EMOJIS); return; }
    fz_renderizarEmojis(Object.values(FZ_EMOJIS).flat());
};

window.fz_seleccionarEmoji = function(emoji) {
    document.getElementById('fz-cat-emoji-preview').textContent = emoji;
    document.getElementById('fz-modal-emoji').classList.remove('visible');
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
window.fz_abrirModalTransferencia = function(id = null) {
    const datos = fz_obtenerDatos();
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada);

    if (cuentasActivas.length < 2) return alert("Debes crear al menos 2 Cuentas para poder transferir dinero entre ellas.");

    document.getElementById('fz-modal-transf-titulo').innerText = id ? 'Editar Transferencia' : 'Transferir Dinero';
    
    const opciones = cuentasActivas.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    document.getElementById('fz-transf-origen').innerHTML = opciones;
    document.getElementById('fz-transf-destino').innerHTML = opciones;

    if (id) {
        // MODO EDICIÓN
        const t = datos.transacciones.find(tr => tr.id === id);
        if(t) {
            document.getElementById('fz-transf-id').value = t.id;
            document.getElementById('fz-transf-monto').value = t.monto;
            document.getElementById('fz-transf-origen').value = t.cuenta_id;
            document.getElementById('fz-transf-destino').value = t.cuenta_destino_id;
            document.getElementById('fz-transf-fecha').value = t.fecha;
        }
    } else {
        // MODO CREACIÓN
        document.getElementById('fz-transf-id').value = '';
        if(cuentasActivas.length > 1) document.getElementById('fz-transf-destino').selectedIndex = 1;
        document.getElementById('fz-transf-monto').value = '';
        document.getElementById('fz-transf-fecha').value = new Date().toISOString().split('T')[0];
    }

    document.getElementById('fz-trans-add-menu')?.classList.remove('visible');
    document.getElementById('fz-modal-transferencia').classList.add('visible');
};

window.fz_guardarFormularioTransferencia = function() {
    const idInput = document.getElementById('fz-transf-id').value;
    const monto = parseFloat(document.getElementById('fz-transf-monto').value);
    const origen = parseInt(document.getElementById('fz-transf-origen').value);
    const destino = parseInt(document.getElementById('fz-transf-destino').value);
    const fecha = document.getElementById('fz-transf-fecha').value;

    if (!monto || monto <= 0) return alert("Ingresa un monto válido.");
    if (origen === destino) return alert("La cuenta de origen y destino no pueden ser la misma.");
    if (!fecha) return alert("Selecciona una fecha.");

    // ==========================================
    // 🔒 NUEVO CANDADO DE FONDOS INSUFICIENTES
    // ==========================================
    const datos = fz_obtenerDatos();
    let saldoDisponible = fz_calcularSaldoCuenta(origen);

    // Si estamos editando, devolvemos temporalmente el dinero viejo a la cuenta para que las mates cuadren
    if (idInput) {
        const transVieja = datos.transacciones.find(tr => tr.id === parseInt(idInput));
        if (transVieja) saldoDisponible += transVieja.monto;
    }

    if (monto > saldoDisponible) {
        return alert(`FONDOS INSUFICIENTES:\nNo puedes transferir ${formatearDinero(monto)}. La cuenta origen solo dispone de ${formatearDinero(saldoDisponible)}.`);
    }

    fz_guardarTransaccion({
        id: idInput ? parseInt(idInput) : Date.now(),
        tipo: 'transferencia',
        monto: monto,
        descripcion: "Transferencia",
        fecha: fecha,
        cuenta_id: origen,
        cuenta_destino_id: destino,
        categoria_id: null,
        pagado: true, // Siempre pagado
        archivada: false
    });

    document.getElementById('fz-modal-transferencia').classList.remove('visible');
    fz_pintarTransacciones();
};

// ==========================================
// LÓGICA DE COMERCIOS
// ==========================================

function fz_pintarComercios() {
    const contenedor = document.getElementById('fz-lista-comercios-tabla');
    if (!contenedor) return;

    const query = (document.getElementById('fz-com-search-input')?.value || '').toLowerCase();
    const datos = cargarDatos();
    const comercios = (datos.finanzas_personales.comercios || []);

    const filtrados = query
        ? comercios.filter(c => c.toLowerCase().includes(query))
        : comercios;

    if (filtrados.length === 0) {
        contenedor.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-lo);">
            ${query ? 'No se encontraron comercios.' : 'Sin comercios registrados. Los que crees al registrar gastos aparecerán aquí.'}
        </div>`;
        return;
    }

    contenedor.innerHTML = filtrados
        .slice() // no mutamos el original
        .sort((a, b) => a.localeCompare(b, 'es'))
        .map(nombre => `
        <div class="fz-cat-row" style="grid-template-columns: 1fr 160px;">
            <div class="fz-cat-col-nombre-cell">
                <i class="ti ti-building-store" style="color: var(--text-lo); font-size: 18px;"></i>
                <span style="font-weight: 500; color: var(--text-hi);">${nombre}</span>
            </div>
            <div class="fz-cat-col-acciones-cell" style="justify-content: center;">
                <button class="fz-cat-action-btn" title="Editar" onclick="fz_abrirModalComercio('${nombre.replace(/'/g, "\\'")}')">
                    <i class="ti ti-pencil"></i>
                </button>
                <button class="fz-cat-action-btn" title="Eliminar" onclick="fz_eliminarComercioUI('${nombre.replace(/'/g, "\\'")}')">
                    <i class="ti ti-trash"></i>
                </button>
            </div>
        </div>
        `).join('');
}

window.fz_toggleBuscadorComercios = function() {
    const bar = document.getElementById('fz-com-search-bar');
    const oculto = bar.style.display === 'none' || bar.style.display === '';
    bar.style.display = oculto ? 'flex' : 'none';
    if (oculto) document.getElementById('fz-com-search-input')?.focus();
};

window.fz_abrirModalComercio = function(nombreExistente = null) {
    document.getElementById('fz-modal-comercio-titulo').textContent = nombreExistente ? 'Editar Comercio' : 'Nuevo Comercio';
    document.getElementById('fz-comercio-nombre-original').value = nombreExistente || '';
    document.getElementById('fz-comercio-nombre-input').value = nombreExistente || '';
    document.getElementById('fz-modal-comercio').classList.add('visible');
    setTimeout(() => document.getElementById('fz-comercio-nombre-input')?.focus(), 100);
};

window.fz_guardarFormularioComercio = function() {
    const nombreNuevo = document.getElementById('fz-comercio-nombre-input').value.trim();
    const nombreOriginal = document.getElementById('fz-comercio-nombre-original').value;

    if (!nombreNuevo) return alert("El nombre del comercio no puede estar vacío.");

    let datos = cargarDatos();
    if (!datos.finanzas_personales.comercios) datos.finanzas_personales.comercios = [];

    // Si es edición, reemplaza el valor original
    if (nombreOriginal) {
        const idx = datos.finanzas_personales.comercios.indexOf(nombreOriginal);
        if (idx > -1) datos.finanzas_personales.comercios[idx] = nombreNuevo;
    } else {
        // Evitar duplicados (case-insensitive)
        const existe = datos.finanzas_personales.comercios.some(c => c.toLowerCase() === nombreNuevo.toLowerCase());
        if (existe) return alert(`El comercio "${nombreNuevo}" ya existe.`);
        datos.finanzas_personales.comercios.push(nombreNuevo);
    }

    guardarDatos(datos);
    document.getElementById('fz-modal-comercio').classList.remove('visible');
    fz_pintarComercios();
};

window.fz_eliminarComercioUI = function(nombre) {
    if (confirm(`¿Eliminar el comercio "${nombre}"? Solo se borrará del catálogo, las transacciones que lo usan no se verán afectadas.`)) {
        fz_eliminarComercio(nombre);
        fz_pintarComercios();
    }
};

window.fz_reajustarSaldoUI = function() {
    const cuentaId = document.getElementById('fz-cuenta-id').value;
    
    // CASO NUEVO: Si no hay cuentaId, actúa como limpiador clásico de campos
    if (!cuentaId) {
        document.getElementById('fz-cuenta-saldo').value = '';
        document.getElementById('fz-cuenta-nombre').value = '';
        document.getElementById('fz-cuenta-tipo-select').value = 'debito';
        document.getElementById('fz-cuenta-logo-url').value = '';
        document.getElementById('fz-cuenta-incluir').checked = true;
        if (typeof fz_activarColorUI === 'function') fz_activarColorUI('#3498db');
        if (typeof fz_actualizarPreviewLogo === 'function') fz_actualizarPreviewLogo();
        return;
    }

    // CASO EDICIÓN: Cerramos el modal de edición de cuenta
    document.getElementById('fz-modal-cuenta').classList.remove('visible');
    
    const datosNode = fz_obtenerDatos();
    const cuenta = datosNode.cuentas.find(c => c.id === parseInt(cuentaId));
    if (!cuenta) return;

    // Calculamos quirúrgicamente el saldo a la fecha de hoy
    const saldoActual = fz_calcularSaldoCuenta(cuenta.id);

    // Inyectamos la información en el nuevo modal de reajuste
    document.getElementById('fz-reajuste-cuenta-id').value = cuenta.id;
    document.getElementById('fz-reajuste-cuenta-nombre').textContent = cuenta.nombre;
    document.getElementById('fz-reajuste-saldo-actual').textContent = formatearDinero(saldoActual);
    document.getElementById('fz-reajuste-nuevo-saldo').value = parseFloat(saldoActual).toFixed(2);
    document.getElementById('fz-reajuste-desc').value = 'Reajuste de saldo';
    document.getElementById('fz-reajuste-metodo').value = 'transaccion';

    // Desplegamos el modal premium de reajuste
    document.getElementById('fz-modal-reajuste').classList.add('visible');
};

// Motor de Reajuste Avanzado de Saldos
window.fz_guardarReajusteSaldo = function() {
    const cuentaId = parseInt(document.getElementById('fz-reajuste-cuenta-id').value);
    const nuevoSaldo = parseFloat(document.getElementById('fz-reajuste-nuevo-saldo').value);
    const metodo = document.getElementById('fz-reajuste-metodo').value;
    const desc = document.getElementById('fz-reajuste-desc').value.trim() || 'Reajuste de saldo';

    if (isNaN(nuevoSaldo)) return alert("Por favor, ingresa un valor numérico válido.");

    let datosCerebro = cargarDatos();
    let finanzas = datosCerebro.finanzas_personales;
    let cuenta = finanzas.cuentas.find(c => c.id === cuentaId);
    if (!cuenta) return;

    // Determinamos la diferencia real matemática
    const saldoActual = fz_calcularSaldoCuenta(cuentaId);
    const diferencia = nuevoSaldo - saldoActual;

    // Si el usuario no modificó el valor, cerramos sin alterar nada
    if (Math.abs(diferencia) < 0.01) {
        document.getElementById('fz-modal-reajuste').classList.remove('visible');
        return;
    }

    // OPCIÓN A: Crear una transacción matemática transparente
    if (metodo === 'transaccion') {
        const tipoTrans = diferencia > 0 ? 'ingreso' : 'gasto';
        const montoFinalTrans = Math.abs(diferencia);

        // Buscar o autogenerar la categoría oculta "Reajuste*"
        let catReajuste = finanzas.categorias.find(c => c.nombre === 'Reajuste*' && c.tipo === tipoTrans && !c.archivada);
        
        if (!catReajuste) {
            catReajuste = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                nombre: 'Reajuste*',
                tipo: tipoTrans,
                color: tipoTrans === 'ingreso' ? '#2ecc71' : '#e74c3c',
                emoji: '🔧',
                parent_id: null,
                archivada: false
            };
            finanzas.categorias.push(catReajuste);
        }

        // Estructurar el movimiento contable
        const nuevaTransaccion = {
            id: Date.now(),
            tipo: tipoTrans,
            monto: montoFinalTrans,
            descripcion: desc,
            fecha: new Date().toISOString().split('T')[0], // Se asienta con fecha de hoy
            cuenta_id: cuentaId,
            categoria_id: catReajuste.id,
            comercio: '',
            unidad: '',
            cantidad: null,
            pagado: true,
            gasto_fijo: false,
            observacion: 'Ajuste de saldo generado automáticamente por el sistema.',
            archivada: false
        };

        finanzas.transacciones.push(nuevaTransaccion);

    } 
    // OPCIÓN B: Alterar el balance de inicio original de la cuenta (Efecto retroactivo)
    else if (metodo === 'inicial') {
        cuenta.saldo_inicial = (cuenta.saldo_inicial || 0) + diferencia;
    }

    // Persistencia centralizada e inviolable en datos_cerebro
    guardarDatos(datosCerebro);

    // Cierre ordenado de la UI y refresco instantáneo del Dashboard sin recargar página
    document.getElementById('fz-modal-reajuste').classList.remove('visible');
    
    // Forzamos el repintado matemático total
    fz_pintarCuentas();
    if (fz_tabActual === 'transacciones') fz_pintarTransacciones();
    if (typeof fz_pintarResumen === 'function') fz_pintarResumen();
};

// ====================================================
// INYECCIÓN DE BLINDAJE PARA HACER INVISIBLE LA CATEGORÍA
// ====================================================
// Modificamos quirúrgicamente los pintadores para omitir 'Reajuste*' en las vistas del usuario
const fz_originalPintarCategorias = fz_pintarCategorias;
fz_pintarCategorias = function() {
    // Interceptamos la ejecución para limpiar la visualización en la tabla de categorías
    fz_originalPintarCategorias();
    const tabla = document.getElementById('fz-lista-categorias-tabla');
    if(tabla) {
        // Removemos cualquier fila de categoría que intente renderizar la palabra Reajuste*
        const filas = tabla.querySelectorAll('.fz-cat-row');
        filas.forEach(f => {
            if(f.textContent.includes('Reajuste*')) f.remove();
        });
    }
};

const fz_originalFiltrarDropdownCategorias = fz_filtrarDropdownCategorias;
fz_filtrarDropdownCategorias = function() {
    // Interceptamos el menú flotante desplegable cuando registras movimientos regulares
    fz_originalFiltrarDropdownCategorias();
    const dropdown = document.getElementById('fz-drop-categorias');
    if(dropdown) {
        const opciones = dropdown.querySelectorAll('.fz-autocomplete-option');
        opciones.forEach(o => {
            if(o.textContent.includes('Reajuste*')) o.remove();
        });
    }
};