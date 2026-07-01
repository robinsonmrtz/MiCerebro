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
    fz_migrarColoresSubcategorias();
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
    else if (fz_tabActual === 'informes') fz_inf_pintarInformes();
    else if (fz_tabActual === 'presupuestos') fz_pintarPresupuestos();
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

    // 1. Rango de fechas — usa filtros avanzados si están activos, si no el mes navegado
    const fa = window.fz_filtrosAvanzados || {};
    let transDelMes;

    if (fa.activos && (fa.fechaDesde || fa.fechaHasta)) {
        transDelMes = transActivas.filter(t => {
            const ok1 = !fa.fechaDesde || t.fecha >= fa.fechaDesde;
            const ok2 = !fa.fechaHasta || t.fecha <= fa.fechaHasta;
            return ok1 && ok2;
        });
    } else {
        const year = fz_fechaActual.getFullYear();
        const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
        const mesFiltro = `${year}-${month}`;
        transDelMes = transActivas.filter(t => t.fecha.startsWith(mesFiltro));
    }

    // 2. Filtro por tipo (pill existente)
    if (window.fz_filtroTransTipoActual !== 'todos') {
        transDelMes = transDelMes.filter(t => t.tipo === window.fz_filtroTransTipoActual);
    }

    // 3. Filtros avanzados adicionales
    if (fa.activos) {
        if (fa.categorias?.length > 0) {
            transDelMes = transDelMes.filter(t => fa.categorias.some(id => String(id) === String(t.categoria_id)));
        }
        if (fa.cuentas?.length > 0) {
            transDelMes = transDelMes.filter(t =>
                fa.cuentas.some(id => String(id) === String(t.cuenta_id)) ||
                fa.cuentas.some(id => String(id) === String(t.cuenta_destino_id))
            );
        }
        if (fa.comercios?.length > 0) {
            transDelMes = transDelMes.filter(t => fa.comercios.includes(t.comercio));
        }
        if (fa.situacion?.length > 0) {
            const sit = fa.situacion[0];
            if (sit === 'pagado')    transDelMes = transDelMes.filter(t => t.pagado === true);
            if (sit === 'pendiente') transDelMes = transDelMes.filter(t => t.pagado === false);
            if (sit === 'fija')      transDelMes = transDelMes.filter(t => t.gasto_fijo === true);
        }
    }

    // 4. Búsqueda por texto (descripción o comercio)
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

    // 5. Agrupar por fecha
    const grupos = {};
    transDelMes.forEach(t => {
        if (!grupos[t.fecha]) grupos[t.fecha] = [];
        grupos[t.fecha].push(t);
    });

    let html = '';

    // 6. Renderizar ordenado (de más reciente a más antiguo)
    Object.keys(grupos).sort((a, b) => new Date(b) - new Date(a)).forEach(fecha => {

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

            const editFn = t.tipo === 'transferencia'
                ? `fz_abrirModalTransferencia(${t.id})`
                : `fz_abrirModalTransaccion('${t.tipo}', ${t.id})`;

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
    
    // Construir fecha local sin conversión UTC
    const toLocalDateStr = (fecha) => {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${y}-${m}-${dia}`;
    };

    if (periodo === 'hoy') {
        btnHoy.classList.add('activa');
        inputFecha.value = toLocalDateStr(d);
    } else if (periodo === 'ayer') {
        btnAyer.classList.add('activa');
        d.setDate(d.getDate() - 1);
        inputFecha.value = toLocalDateStr(d);
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
window.fz_filtrarDropdownDescripciones = function() {
    const input = document.getElementById('fz-trans-desc');
    const query = input.value.trim().toLowerCase();
    const dropdown = document.getElementById('fz-drop-descripciones');
    const datos = fz_obtenerDatos();

    dropdown.innerHTML = '';
    if (!query) { dropdown.classList.remove('visible'); return; }
    dropdown.classList.add('visible');

    const all = (datos.transacciones || []).filter(t => !t.archivada && t.tipo !== 'transferencia');
    const uniques = [...new Set(all.map(t => t.descripcion).filter(Boolean))];

    uniques
        .filter(d => d.toLowerCase().includes(query))
        .slice(0, 8)
        .forEach(desc => {
            // Buscar la última transacción que usó esta descripción
            const ultimaTrans = all
                .filter(t => t.descripcion === desc)
                .sort((a, b) => b.id - a.id)[0]; // La más reciente por id

            const item = document.createElement('div');
            item.className = 'fz-autocomplete-option';
            item.innerHTML = `<i class="ti ti-file-text" style="color:var(--text-lo)"></i> <span>${desc}</span>`;
            item.onclick = () => {
                input.value = desc;
                dropdown.classList.remove('visible');
                // Autocompletar con datos de la última transacción
                if (ultimaTrans) fz_autocompletarDesdeHistorico(ultimaTrans);
            };
            dropdown.appendChild(item);
        });
};

function fz_autocompletarDesdeHistorico(trans) {
    const datos = fz_obtenerDatos();

    // --- CATEGORÍA ---
    const categoria = datos.categorias.find(c => c.id == trans.categoria_id && !c.archivada);
    if (categoria) {
        document.getElementById('fz-trans-cat-input').value = categoria.nombre;
        document.getElementById('fz-trans-categoria').value = categoria.id;
    }

    // --- COMERCIO ---
    const inputComercio = document.getElementById('fz-trans-comercio-input');
    if (inputComercio && trans.comercio) {
        inputComercio.value = trans.comercio;
    }

    // --- CUENTA DE ORIGEN ---
    const selectCuenta = document.getElementById('fz-trans-cuenta');
    if (selectCuenta && trans.cuenta_id) {
        // Verificamos que la cuenta siga existiendo y activa
        const cuentaExiste = datos.cuentas.find(c => c.id == trans.cuenta_id && !c.archivada);
        if (cuentaExiste) selectCuenta.value = trans.cuenta_id;
    }

    // Toast visual sutil de confirmación
    fz_mostrarToastAutocompletado();
}

function fz_mostrarToastAutocompletado() {
    // Evitar duplicados
    const existente = document.getElementById('fz-toast-autocomplete');
    if (existente) existente.remove();

    const toast = document.createElement('div');
    toast.id = 'fz-toast-autocomplete';
    toast.innerHTML = `<i class="ti ti-sparkles"></i> Campos completados desde el historial`;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent);
        color: #fff;
        padding: 10px 20px;
        border-radius: 30px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        animation: fzFadeIn 0.25s ease-out;
        pointer-events: none;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
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

            let iter = new Date(start.getFullYear(), start.getMonth(), 1);
            while (iter <= endDate) {
                const year = iter.getFullYear();
                const month = iter.getMonth();
                const lastDay = new Date(year, month + 1, 0).getDate();
                const dayToSet = Math.min(dia, lastDay);
                const fechaStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayToSet).padStart(2,'0')}`;

                // SOLUCIÓN BUG 1: Filtrar por Mes/Año para evitar duplicados en el mismo mes
                const mesFiltro = `${year}-${String(month + 1).padStart(2,'0')}`;
                const exists = datos.finanzas_personales.transacciones.some(t => 
                    t.recurrente_id === rec.id && t.fecha.startsWith(mesFiltro)
                );

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
            if (start && new Date(start.getFullYear(), start.getMonth(), 1) > new Date(year, month, 1)) return;

            const lastDay = new Date(year, month + 1, 0).getDate();
            const dia = rec.dia || (start ? start.getDate() : 1);
            const dayToSet = Math.min(dia, lastDay);
            const fechaStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayToSet).padStart(2,'0')}`;

            // SOLUCIÓN BUG 1: Filtrar por Mes/Año
            const mesFiltro = `${year}-${String(month + 1).padStart(2,'0')}`;
            const exists = datos.finanzas_personales.transacciones.some(t0 => 
                t0.recurrente_id === rec.id && t0.fecha.startsWith(mesFiltro)
            );

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
window.fz_guardarFormularioTransaccion = function(continuar = false) {
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

    if (continuar) {
        // Limpiar campos pero conservar cuenta, comercio y fecha
        document.getElementById('fz-trans-monto').value = '';
        document.getElementById('fz-trans-desc').value = '';
        document.getElementById('fz-trans-cat-input').value = '';
        document.getElementById('fz-trans-categoria').value = '';
        document.getElementById('fz-trans-observacion').value = '';
        if (document.getElementById('fz-trans-unidad')) document.getElementById('fz-trans-unidad').value = '';
        if (document.getElementById('fz-trans-cantidad')) document.getElementById('fz-trans-cantidad').value = '';
        document.getElementById('fz-trans-id').value = '';
        document.getElementById('fz-trans-pagado').checked = true;
        if (document.getElementById('fz-trans-gasto-fijo')) document.getElementById('fz-trans-gasto-fijo').checked = false;

        // Restaurar los campos conservados
        document.getElementById('fz-trans-cuenta').value = cuenta_id;
        document.getElementById('fz-trans-comercio-input').value = comercio;
        document.getElementById('fz-trans-fecha').value = fecha;
        fz_alCambiarFechaManual();

        // Foco en monto para agilizar el siguiente registro
        setTimeout(() => document.getElementById('fz-trans-monto')?.focus(), 100);
    } else {
        document.getElementById('fz-modal-transaccion').classList.remove('visible');
    }

    if (fz_tabActual === 'transacciones') fz_pintarTransacciones();
    if (fz_tabActual === 'resumen') fz_pintarResumen();
};

window.fz_eliminarTransaccionUI = function(id) {
    const datosMem = fz_obtenerDatos();
    const trans = datosMem.transacciones.find(t => t.id === id);

    if (!trans) return;

    // SOLUCIÓN BUG 2: Detectar si es recurrente e interceptar la acción
    if (trans.recurrente_id) {
        const borrarFuturos = confirm(
            "📌 Este es un movimiento recurrente (fijo).\n\n" +
            "[ACEPTAR] = Eliminar este y cancelar todos los futuros.\n" +
            "[CANCELAR] = Ver opciones para borrar SOLO este mes."
        );

        if (borrarFuturos) {
            let datos = cargarDatos();
            
            // 1. Desactivar la plantilla para que el generador no cree más
            if (datos.finanzas_personales.recurrentes) {
                const rec = datos.finanzas_personales.recurrentes.find(r => r.id === trans.recurrente_id);
                if (rec) rec.activo = false; 
            }
            
            // 2. Filtrar y eliminar esta transacción y todas las futuras
            datos.finanzas_personales.transacciones = datos.finanzas_personales.transacciones.filter(t => {
                // Elimina si comparten recurrente_id Y la fecha es igual o mayor
                return !(t.recurrente_id === trans.recurrente_id && t.fecha >= trans.fecha);
            });
            
            guardarDatos(datos);
            alert("Movimiento y futuros cancelados correctamente.");
            
            fz_pintarTransacciones();
            if (fz_tabActual === 'resumen') fz_pintarResumen();
            if (fz_tabActual === 'cuentas') typeof fz_pintarCuentas === 'function' && fz_pintarCuentas();
            return;
        } else {
            // Si le dio a cancelar, verificamos si quiere borrar únicamente el actual
            if (!confirm("¿Seguro que deseas eliminar SOLO la instancia de este mes? Los futuros seguirán generándose.")) {
                return; // Si cancela de nuevo, abortamos todo
            }
        }
    } else {
        // Flujo normal para movimientos de una sola vez
        if (!confirm("¿Seguro que deseas ELIMINAR este movimiento? El dinero se ajustará inmediatamente en tu cuenta.")) {
            return;
        }
    }

    // Si llega aquí, es porque quiere borrar SOLO un movimiento (recurrente o no)
    fz_eliminarTransaccion(id);
    fz_pintarTransacciones();
    if (fz_tabActual === 'resumen') fz_pintarResumen();
    if (fz_tabActual === 'cuentas') typeof fz_pintarCuentas === 'function' && fz_pintarCuentas();
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
            emojiGroup.style.display = 'none';
            tipoGroup.style.display  = 'none';
            document.getElementById('fz-cat-color-group').style.display = 'none';
            document.getElementById('fz-categoria-parent-id').value = cat.parent_id;
            document.getElementById('fz-categoria-es-sub').value = '1';

            const padreGroup  = document.getElementById('fz-cat-padre-group');
            const padreSelect = document.getElementById('fz-cat-padre-select');
            padreGroup.style.display = 'flex';
            const padresDisponibles = fz_obtenerDatos().categorias.filter(c => !c.parent_id && !c.archivada && c.tipo === cat.tipo);
            padreSelect.innerHTML = padresDisponibles.map(p =>
                `<option value="${p.id}" ${p.id === cat.parent_id ? 'selected' : ''}>${p.emoji || '🏷️'} ${p.nombre}</option>`
            ).join('');
        } else {
            emojiGroup.style.display = 'flex';
            tipoGroup.style.display  = 'flex';
            document.getElementById('fz-cat-color-group').style.display = 'flex';
            document.getElementById('fz-cat-padre-group').style.display = 'none';
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
    document.getElementById('fz-cat-emoji-group').style.display  = 'none';
    document.getElementById('fz-cat-tipo-group').style.display   = 'none';
    document.getElementById('fz-cat-color-group').style.display  = 'none';
    document.getElementById('fz-cat-padre-group').style.display  = 'none';
    document.getElementById('fz-modal-categoria').classList.add('visible');
};

window.fz_guardarFormularioCategoria = function() {
    const idInput = document.getElementById('fz-categoria-id').value;
    let parentId  = document.getElementById('fz-categoria-parent-id').value;
    const esSub   = document.getElementById('fz-categoria-es-sub').value === '1';
    const nombre  = document.getElementById('fz-categoria-nombre').value.trim();
    if (!nombre) return alert("El nombre es obligatorio");

    let tipo, emoji, color;

    if (esSub) {
        const selectPadre = document.getElementById('fz-cat-padre-select');
        const nuevoParentId = (selectPadre && selectPadre.offsetParent !== null && selectPadre.value)
            ? parseInt(selectPadre.value)
            : parseInt(parentId);
        const padre = fz_obtenerDatos().categorias.find(c => c.id === nuevoParentId);
        tipo     = padre ? padre.tipo            : fz_catTipoActual;
        color    = padre ? padre.color           : '#e74c3c';
        emoji    = padre ? (padre.emoji || '🏷️') : '🏷️';
        parentId = nuevoParentId;
    } else {
        tipo  = document.getElementById('fz-categoria-tipo').value;
        color = document.getElementById('fz-categoria-color').value;
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
 
    const year  = fz_fechaActual.getFullYear();
    const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
    const mesFiltro = `${year}-${month}`;
 
    const transDelMes = transActivas.filter(t => t.fecha.startsWith(mesFiltro));
 
    let ingresosMes = 0;
    let gastosMes   = 0;
    transDelMes.forEach(t => {
        if (t.tipo === 'ingreso') ingresosMes += t.monto;
        if (t.tipo === 'gasto')   gastosMes   += t.monto;
    });
 
    // KPIs
    const saldoEl    = document.getElementById('fz-saldo-general');
    const ingresosEl = document.getElementById('fz-ingresos-mes');
    const gastosEl   = document.getElementById('fz-gastos-mes');
 
    if (saldoEl)    saldoEl.textContent    = formatearDinero(fz_calcularSaldoTotal());
    if (ingresosEl) ingresosEl.textContent = `+${formatearDinero(ingresosMes)}`;
    if (gastosEl)   gastosEl.textContent   = `-${formatearDinero(gastosMes)}`;
 
    // Subtotales en cabecera de cada dona
    const totalGastosEl    = document.getElementById('fz-res-total-gastos');
    const totalIngresosEl  = document.getElementById('fz-res-total-ingresos');
    if (totalGastosEl)   totalGastosEl.textContent   = formatearDinero(gastosMes);
    if (totalIngresosEl) totalIngresosEl.textContent = formatearDinero(ingresosMes);
 
    // Donas
    const gastosDelMes   = transDelMes.filter(t => t.tipo === 'gasto');
    const ingresosDelMes = transDelMes.filter(t => t.tipo === 'ingreso');
 
    fz_res_renderDona('gastos',   gastosDelMes,   datos.categorias);
    fz_res_renderDona('ingresos', ingresosDelMes, datos.categorias);
}

// 4. Genera el gráfico de dona de Chart.js
function fz_renderizarGraficoGastos(transDelMes, categorias) {
    // Delegamos al nuevo renderer
    fz_res_renderDona('gastos', transDelMes.filter(t => t.tipo === 'gasto'), categorias);
}

// [NUEVO] Renderer de dona individual
// tipo: 'gastos' | 'ingresos'
// ==========================================
 
// Guardamos las dos instancias de gráfico
const fz_res_graficos = { gastos: null, ingresos: null };
 
function fz_res_renderDona(tipo, trans, categorias) {
    const canvasId    = tipo === 'gastos' ? 'fz-grafico-gastos'   : 'fz-grafico-ingresos';
    const vacioId     = tipo === 'gastos' ? 'fz-grafico-vacio'    : 'fz-grafico-ingresos-vacio';
    const centerValId = tipo === 'gastos' ? 'fz-res-center-gastos-val' : 'fz-res-center-ingresos-val';
    const catListId   = tipo === 'gastos' ? 'fz-res-cat-gastos'   : 'fz-res-cat-ingresos';
    const colorMonto  = tipo === 'gastos' ? 'var(--status-danger)' : 'var(--status-ok)';
 
    const canvas    = document.getElementById(canvasId);
    const vacioEl   = document.getElementById(vacioId);
    const centerVal = document.getElementById(centerValId);
    const catList   = document.getElementById(catListId);
 
    if (!canvas) return;
 
    // Destruir instancia previa
    if (fz_res_graficos[tipo]) { fz_res_graficos[tipo].destroy(); fz_res_graficos[tipo] = null; }
 
    const total = trans.reduce((s, t) => s + t.monto, 0);
 
    if (total === 0) {
        canvas.style.display = 'none';
        if (vacioEl)   { vacioEl.style.display = 'block'; }
        if (centerVal) { centerVal.textContent = formatearDinero(0); }
        if (catList)   { catList.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:10px 0;">Sin movimientos este mes.</div>`; }
        return;
    }
 
    canvas.style.display = 'block';
    if (vacioEl) vacioEl.style.display = 'none';
    if (centerVal) centerVal.textContent = formatearDinero(total);
 
    // Agrupar por categoría padre
    const accum = {};
    trans.forEach(t => {
        const cat    = categorias.find(c => c.id == t.categoria_id);
        const padreId = (cat && cat.parent_id) ? cat.parent_id : (cat ? cat.id : '__sin__');
        accum[padreId] = (accum[padreId] || 0) + t.monto;
    });
 
    const items = Object.keys(accum).map(pid => {
        const cat = categorias.find(c => c.id == pid);
        return {
            nombre: cat ? cat.nombre : 'Sin categoría',
            color:  cat ? (cat.color || '#888') : '#888',
            emoji:  cat ? (cat.emoji || '🏷️')   : '🏷️',
            total:  accum[pid],
            pct:    total > 0 ? (accum[pid] / total * 100) : 0
        };
    }).sort((a, b) => b.total - a.total);
 
    const borderColor = getComputedStyle(document.body).getPropertyValue('--bg-card').trim() || '#fff';
 
    fz_res_graficos[tipo] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: items.map(i => i.nombre),
            datasets: [{
                data:            items.map(i => i.total),
                backgroundColor: items.map(i => i.color),
                borderWidth: 3,
                borderColor: borderColor,
                hoverOffset: 5
            }]
        },
        options: {
            responsive: false,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${formatearDinero(ctx.raw)} (${(ctx.raw / total * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
 
    // Leyenda compacta
    if (catList) {
        catList.innerHTML = items.map(item => `
            <div class="fz-res-cat-item">
                <span class="fz-res-cat-dot" style="background:${item.color};"></span>
                <span class="fz-res-cat-nombre">${item.nombre}</span>
                <span class="fz-res-cat-monto" style="color:${colorMonto};">${formatearDinero(item.total)}</span>
                <span class="fz-res-cat-pct">${item.pct.toFixed(1)}%</span>
            </div>
        `).join('');
    }
}
 
// ==========================================
// [NUEVO] Modal de Acciones Rápidas
// ==========================================
window.fz_abrirModalAccionesRapidas = function() {
    document.getElementById('fz-modal-acciones-rapidas')?.classList.add('visible');
};
 
window.fz_accRap = function(tipo) {
    document.getElementById('fz-modal-acciones-rapidas')?.classList.remove('visible');
    if (tipo === 'transferencia') {
        fz_abrirModalTransferencia();
    } else {
        fz_abrirModalTransaccion(tipo);
    }
};

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
        const hoyTransf = new Date();
        const y = hoyTransf.getFullYear();
        const m = String(hoyTransf.getMonth() + 1).padStart(2, '0');
        const d = String(hoyTransf.getDate()).padStart(2, '0');
        document.getElementById('fz-transf-fecha').value = `${y}-${m}-${d}`;
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

function fz_migrarColoresSubcategorias() {
    let datos = cargarDatos();
    const categorias = datos.finanzas_personales.categorias;
    let huboCambios = false;

    categorias.forEach(cat => {
        if (cat.parent_id) {
            const padre = categorias.find(p => p.id === cat.parent_id);
            if (padre) {
                const colorCorrecto = padre.color || '#e74c3c';
                const emojiCorrecto = padre.emoji || '🏷️';
                if (cat.color !== colorCorrecto || cat.emoji !== emojiCorrecto) {
                    cat.color = colorCorrecto;
                    cat.emoji = emojiCorrecto;
                    huboCambios = true;
                }
            }
        }
    });

    if (huboCambios) guardarDatos(datos);
}

// ==========================================
// MÓDULO: FILTROS AVANZADOS DE TRANSACCIONES
// ==========================================

// Estado actual de los filtros aplicados
window.fz_filtrosAvanzados = {
    activos: false,
    fechaDesde: null,
    fechaHasta: null,
    categorias: [],     // ids seleccionados, vacío = todas
    cuentas: [],        // ids seleccionados, vacío = todas
    comercios: [],      // strings seleccionados, vacío = todos
    situacion: []       // 'pagado', 'pendiente', 'fija' — vacío = todas
};

window.fz_abrirModalFiltros = function() {
    const datos = fz_obtenerDatos();

    // Establecer fechas por defecto: mes actual
    const hoy = new Date();
    const primerDia = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const ultimoDiaStr = `${ultimoDia.getFullYear()}-${String(ultimoDia.getMonth() + 1).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`;

    const filtros = window.fz_filtrosAvanzados;
    document.getElementById('fz-filtro-fecha-desde').value = filtros.fechaDesde || primerDia;
    document.getElementById('fz-filtro-fecha-hasta').value = filtros.fechaHasta || ultimoDiaStr;

    // Renderizar chips de Categorías
    fz_renderizarChipsFiltro(
        'categorias',
        datos.categorias.filter(c => !c.archivada && !c.parent_id && c.nombre !== 'Reajuste*').map(c => ({
            value: c.id,
            label: `${c.emoji || '🏷️'} ${c.nombre}`
        })),
        filtros.categorias
    );

    // Renderizar chips de Cuentas
    fz_renderizarChipsFiltro(
        'cuentas',
        datos.cuentas.filter(c => !c.archivada).map(c => ({
            value: c.id,
            label: c.nombre
        })),
        filtros.cuentas
    );

    // Renderizar chips de Comercios
    const datosCerebro = cargarDatos();
    const comercios = datosCerebro.finanzas_personales.comercios || [];
    fz_renderizarChipsFiltro(
        'comercios',
        comercios.map(c => ({ value: c, label: c })),
        filtros.comercios
    );

    // Restaurar chips de situación
    fz_restaurarChipsSituacion(filtros.situacion);

    // Reset toggle guardar
    document.getElementById('fz-filtro-guardar-toggle').checked = false;
    document.getElementById('fz-filtro-nombre-group').style.display = 'none';

    // Panel: filtro nuevo por defecto
    fz_switchFiltroTab('nuevo');

    document.getElementById('fz-modal-filtros').classList.add('visible');
};

window.fz_cerrarModalFiltros = function() {
    document.getElementById('fz-modal-filtros').classList.remove('visible');
};

// Renderiza los chips dinámicos (categorías, cuentas, comercios)
function fz_renderizarChipsFiltro(tipo, opciones, seleccionados) {
    const contenedor = document.getElementById(`fz-filtro-chips-${tipo}`);
    if (!contenedor) return;

    const haySeleccion = seleccionados && seleccionados.length > 0;

    let html = `<div class="fz-filtro-chip${!haySeleccion ? ' activa' : ''}" data-value="todas" onclick="fz_toggleFiltroChip(this, '${tipo}')">
        Todos${tipo === 'cuentas' ? ' las cuentas' : tipo === 'categorias' ? ' las categorías' : ' los comercios'}
    </div>`;

    opciones.sort((a, b) => a.label.localeCompare(b.label, 'es')).forEach(op => {
        const estaActivo = seleccionados && seleccionados.some(s => String(s) === String(op.value));
        html += `<div class="fz-filtro-chip${estaActivo ? ' activa' : ''}" data-value="${op.value}" onclick="fz_toggleFiltroChip(this, '${tipo}')">
            ${op.label}
        </div>`;
    });

    contenedor.innerHTML = html;
}

function fz_restaurarChipsSituacion(seleccionados) {
    const contenedor = document.getElementById('fz-filtro-chips-situacion');
    if (!contenedor) return;
    const chips = contenedor.querySelectorAll('.fz-filtro-chip');
    const haySeleccion = seleccionados && seleccionados.length > 0;
    chips.forEach(chip => {
        const val = chip.getAttribute('data-value');
        chip.classList.remove('activa');
        if (val === 'todas' && !haySeleccion) chip.classList.add('activa');
        if (val !== 'todas' && seleccionados && seleccionados.includes(val)) chip.classList.add('activa');
    });
}

// Toggle de chips — lógica de selección múltiple con "Todas" como reset

window.fz_toggleFiltroChip = function(elemento, tipo) {
    const valor = elemento.getAttribute('data-value');
    const contenedor = document.getElementById(`fz-filtro-chips-${tipo}`);
    const todos = contenedor.querySelectorAll('.fz-filtro-chip');

    if (valor === 'todas') {
        todos.forEach(c => c.classList.remove('activa'));
        elemento.classList.add('activa');
    } else if (tipo === 'situacion') {
        todos.forEach(c => c.classList.remove('activa'));
        elemento.classList.add('activa');
    } else {
        const chipTodas = contenedor.querySelector('[data-value="todas"]');
        if (chipTodas) chipTodas.classList.remove('activa');
        elemento.classList.toggle('activa');

        const hayAlgunoActivo = [...todos].some(c =>
            c.classList.contains('activa') && c.getAttribute('data-value') !== 'todas'
        );
        if (!hayAlgunoActivo && chipTodas) chipTodas.classList.add('activa');
    }

    // Actualizar el label del trigger para Categorías, Cuentas y Comercios
if (['categorias', 'cuentas', 'comercios', 'situacion'].includes(tipo)) {
    const labelEl = document.getElementById(`fz-filtro-label-${tipo}`);
    if (!labelEl) return;

    const seleccionados = [...todos].filter(c =>
        c.classList.contains('activa') && c.getAttribute('data-value') !== 'todas'
    );

    const defaultLabels = {
        categorias: 'Todas las categorías',
        cuentas: 'Todas las cuentas',
        comercios: 'Todos los comercios',
        situacion: 'Todas las situaciones'
    };

        if (seleccionados.length === 0) {
            labelEl.textContent = defaultLabels[tipo];
        } else if (seleccionados.length === 1) {
            labelEl.textContent = seleccionados[0].textContent.trim();
        } else {
            labelEl.textContent = `${seleccionados.length} seleccionados`;
        }
    }
};

window.fz_switchFiltroTab = function(tab) {
    document.getElementById('fz-ftab-nuevo').classList.toggle('activa', tab === 'nuevo');
    document.getElementById('fz-ftab-guardados').classList.toggle('activa', tab === 'guardados');
    document.getElementById('fz-filtros-panel-nuevo').style.display = tab === 'nuevo' ? 'flex' : 'none';
    document.getElementById('fz-filtros-panel-guardados').style.display = tab === 'guardados' ? 'block' : 'none';
    if (tab === 'guardados') fz_pintarFiltrosGuardados();
};

window.fz_toggleGuardarFiltroUI = function() {
    const activo = document.getElementById('fz-filtro-guardar-toggle').checked;
    document.getElementById('fz-filtro-nombre-group').style.display = activo ? 'flex' : 'none';
};

// Limpiar todos los filtros avanzados
window.fz_limpiarFiltrosAvanzados = function() {
    window.fz_filtrosAvanzados = {
        activos: false,
        fechaDesde: null,
        fechaHasta: null,
        categorias: [],
        cuentas: [],
        comercios: [],
        situacion: []
    };

    // Actualizar indicador visual del botón
    const btnFiltros = document.getElementById('fz-btn-filtros-avanzados');
    if (btnFiltros) btnFiltros.classList.remove('filtro-activo');

    document.getElementById('fz-modal-filtros').classList.remove('visible');
    fz_pintarTransacciones();
};

// Aplicar los filtros seleccionados
window.fz_aplicarFiltrosAvanzados = function() {
    const fechaDesde = document.getElementById('fz-filtro-fecha-desde').value;
    const fechaHasta = document.getElementById('fz-filtro-fecha-hasta').value;

    // Leer chips seleccionados
    const leerChips = (tipo) => {
        const contenedor = document.getElementById(`fz-filtro-chips-${tipo}`);
        const chipTodas = contenedor?.querySelector('[data-value="todas"]');
        if (!contenedor || chipTodas?.classList.contains('activa')) return [];
        return [...contenedor.querySelectorAll('.fz-filtro-chip.activa')]
            .map(c => c.getAttribute('data-value'));
    };

    const situacionChip = document.querySelector('#fz-filtro-chips-situacion .fz-filtro-chip.activa');
    const situacionVal = situacionChip?.getAttribute('data-value');
    const situacion = (!situacionVal || situacionVal === 'todas') ? [] : [situacionVal];

    window.fz_filtrosAvanzados = {
        activos: true,
        fechaDesde: fechaDesde || null,
        fechaHasta: fechaHasta || null,
        categorias: leerChips('categorias').map(v => parseInt(v) || v),
        cuentas: leerChips('cuentas').map(v => parseInt(v) || v),
        comercios: leerChips('comercios'),
        situacion: situacion
    };

    // Guardar filtro si el toggle está activo
    const guardar = document.getElementById('fz-filtro-guardar-toggle').checked;
    if (guardar) {
        const nombre = document.getElementById('fz-filtro-nombre-input').value.trim();
        if (!nombre) return alert("Escribe un nombre para guardar el filtro.");
        fz_guardarFiltroPersonalizado(nombre, window.fz_filtrosAvanzados);
    }

    // Indicador visual en el botón
    const btnFiltros = document.getElementById('fz-btn-filtros-avanzados');
    const hayFiltros = fechaDesde || fechaHasta ||
        window.fz_filtrosAvanzados.categorias.length > 0 ||
        window.fz_filtrosAvanzados.cuentas.length > 0 ||
        window.fz_filtrosAvanzados.comercios.length > 0 ||
        window.fz_filtrosAvanzados.situacion.length > 0;

    if (btnFiltros) btnFiltros.classList.toggle('filtro-activo', !!hayFiltros);

    document.getElementById('fz-modal-filtros').classList.remove('visible');
    fz_pintarTransacciones();
};

// ==========================================
// FILTROS GUARDADOS (persistidos en storage)
// ==========================================

function fz_guardarFiltroPersonalizado(nombre, filtro) {
    let datos = cargarDatos();
    if (!datos.finanzas_personales.filtros_guardados) datos.finanzas_personales.filtros_guardados = [];
    datos.finanzas_personales.filtros_guardados.push({
        id: Date.now(),
        nombre: nombre,
        filtro: { ...filtro, activos: true }
    });
    guardarDatos(datos);
}

function fz_pintarFiltrosGuardados() {
    const contenedor = document.getElementById('fz-filtros-guardados-lista');
    if (!contenedor) return;

    let datos = cargarDatos();
    const guardados = datos.finanzas_personales.filtros_guardados || [];

    if (guardados.length === 0) {
        contenedor.innerHTML = `<div style="text-align:center; color: var(--text-lo); padding: 30px 0; font-size: 13px;">
            <i class="ti ti-bookmark" style="font-size: 28px; display: block; margin-bottom: 10px; opacity: 0.4;"></i>
            No tienes filtros guardados aún.
        </div>`;
        return;
    }

    contenedor.innerHTML = guardados.map(fg => {
        const f = fg.filtro;
        const partes = [];
        if (f.fechaDesde || f.fechaHasta) partes.push(`📅 ${f.fechaDesde || '...'} → ${f.fechaHasta || '...'}`);
        if (f.categorias?.length) partes.push(`🏷️ ${f.categorias.length} categoría(s)`);
        if (f.cuentas?.length) partes.push(`🏦 ${f.cuentas.length} cuenta(s)`);
        if (f.comercios?.length) partes.push(`🏪 ${f.comercios.join(', ')}`);
        if (f.situacion?.length) partes.push(`📌 ${f.situacion.join(', ')}`);

        return `
        <div class="fz-filtro-guardado-item" onclick="fz_aplicarFiltroGuardado(${fg.id})">
            <div>
                <div class="fz-filtro-guardado-nombre">${fg.nombre}</div>
                <div class="fz-filtro-guardado-desc">${partes.join(' · ') || 'Sin restricciones'}</div>
            </div>
            <button class="fz-cat-action-btn" style="color: var(--status-danger); flex-shrink: 0;" 
                title="Eliminar" onclick="fz_eliminarFiltroGuardado(event, ${fg.id})">
                <i class="ti ti-trash"></i>
            </button>
        </div>`;
    }).join('');
}

window.fz_aplicarFiltroGuardado = function(id) {
    let datos = cargarDatos();
    const fg = (datos.finanzas_personales.filtros_guardados || []).find(f => f.id === id);
    if (!fg) return;

    window.fz_filtrosAvanzados = { ...fg.filtro };

    const btnFiltros = document.getElementById('fz-btn-filtros-avanzados');
    if (btnFiltros) btnFiltros.classList.add('filtro-activo');

    document.getElementById('fz-modal-filtros').classList.remove('visible');
    fz_pintarTransacciones();
};

window.fz_eliminarFiltroGuardado = function(e, id) {
    e.stopPropagation();
    if (!confirm('¿Eliminar este filtro guardado?')) return;
    let datos = cargarDatos();
    datos.finanzas_personales.filtros_guardados = (datos.finanzas_personales.filtros_guardados || []).filter(f => f.id !== id);
    guardarDatos(datos);
    fz_pintarFiltrosGuardados();
};

window.fz_toggleFiltroDropdown = function(tipo) {
    const panel = document.getElementById(`fz-filtro-panel-${tipo}`);
    const trigger = document.querySelector(`[onclick="fz_toggleFiltroDropdown('${tipo}')"]`);
    const estaAbierto = panel.classList.contains('abierto');

    ['categorias', 'cuentas', 'comercios', 'situacion'].forEach(t => {
        document.getElementById(`fz-filtro-panel-${t}`)?.classList.remove('abierto');
        document.querySelector(`[onclick="fz_toggleFiltroDropdown('${t}')"]`)?.classList.remove('abierto');
    });

    if (!estaAbierto) {
        panel.classList.add('abierto');
        trigger.classList.add('abierto');
    }
};

// ==========================================
// MÓDULO: INFORMES — js/modulos/finanzas-personales.js
// INSTRUCCIONES DE INTEGRACIÓN:
//   1. Pegar este bloque al final del archivo finanzas-personales.js
//   2. En la función renderizarPantallaActual(), agregar la línea:
//        else if (fz_tabActual === 'informes') fz_inf_pintarInformes();
// ==========================================

// --- Estado del módulo Informes ---
let fz_inf_tipo       = 'gasto';       // 'gasto' | 'ingreso' | 'balance'
let fz_inf_agrupacion = 'categoria';   // 'categoria' | 'cuenta' | 'comercio'
let fz_inf_grafico    = null;          // instancia Chart.js
let fz_inf_catSel     = null;          // categoría padre actualmente seleccionada

// ==========================================
// ENTRADA PRINCIPAL
// ==========================================
window.fz_inf_pintarInformes = function () {
    // Asegurar que el gráfico anterior no quede vivo si se cambia de pestaña
    fz_inf_destruirGrafico();
    fz_inf_renderizar();
};

// ==========================================
// RENDERIZADO MAESTRO
// ==========================================
function fz_inf_renderizar() {
    if (fz_inf_tipo === 'balance') {
        fz_inf_renderizarBalance();
    } else {
        fz_inf_renderizarPorTipo(fz_inf_tipo);
    }
}

// ==========================================
// RENDERER: GASTOS / INGRESOS
// ==========================================
function fz_inf_renderizarPorTipo(tipo) {
    const datos = fz_obtenerDatos();
    const year  = fz_fechaActual.getFullYear();
    const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
    const mesFiltro = `${year}-${month}`;

    const trans = (datos.transacciones || []).filter(t =>
        !t.archivada &&
        t.tipo === tipo &&
        t.fecha.startsWith(mesFiltro)
    );

    // --- AGRUPACIÓN ---
    if (fz_inf_agrupacion === 'categoria') {
        fz_inf_renderCategoria(tipo, trans, datos.categorias || []);
    } else if (fz_inf_agrupacion === 'cuenta') {
        fz_inf_renderCuenta(tipo, trans, datos.cuentas || []);
    } else {
        fz_inf_renderComercio(tipo, trans);
    }
}

// ==========================================
// RENDERER: AGRUPADO POR CATEGORÍA PADRE + HIJOS
// ==========================================
function fz_inf_renderCategoria(tipo, trans, categorias) {
    const total = trans.reduce((s, t) => s + t.monto, 0);

    if (total === 0) {
        fz_inf_mostrarVacio();
        return;
    }

    // Acumular por categoría (padre o hijo)
    const accum = {};
    trans.forEach(t => {
        const cid = t.categoria_id;
        accum[cid] = (accum[cid] || 0) + t.monto;
    });

    // Construir árbol padre → hijos
    const padresMap = {};

    Object.keys(accum).forEach(catId => {
        const cat = categorias.find(c => c.id == catId);
        if (!cat) {
            // Sin categoría → agrupar en un bucket especial
            if (!padresMap['__sin__']) {
                padresMap['__sin__'] = {
                    id: '__sin__', nombre: 'Sin categoría',
                    emoji: '🏷️', color: '#888787',
                    total: 0, subs: []
                };
            }
            padresMap['__sin__'].total += accum[catId];
            return;
        }

        const padreId = cat.parent_id || cat.id;
        const padre   = categorias.find(c => c.id == padreId) || cat;

        if (!padresMap[padreId]) {
            padresMap[padreId] = {
                id: padreId,
                nombre: padre.nombre,
                emoji:  padre.emoji  || '🏷️',
                color:  padre.color  || '#888787',
                total: 0, subs: []
            };
        }

        if (cat.parent_id) {
            // Es un hijo → agregar a subs
            const subExist = padresMap[padreId].subs.find(s => s.id == cat.id);
            if (subExist) {
                subExist.total += accum[catId];
            } else {
                padresMap[padreId].subs.push({
                    id:     cat.id,
                    nombre: cat.nombre,
                    color:  padre.color || cat.color || '#888787',
                    total:  accum[catId]
                });
            }
        }

        padresMap[padreId].total += accum[catId];
    });

    // Convertir a array y ordenar desc por total
    const items = Object.values(padresMap).sort((a, b) => b.total - a.total);

    // Calcular porcentajes
    items.forEach(item => {
        item.pct = total > 0 ? (item.total / total * 100) : 0;
        item.subs.sort((a, b) => b.total - a.total);
        item.subs.forEach(s => { s.pct = item.total > 0 ? (s.total / item.total * 100) : 0; });
    });

    // Renderizar cabecera dona + lista
    fz_inf_pintar(items, total, tipo);

    // Seleccionar el primero por defecto
    if (items.length > 0 && !fz_inf_catSel) fz_inf_catSel = items[0];
    fz_inf_pintarDetalle(fz_inf_catSel, total, tipo);
}

// ==========================================
// RENDERER: AGRUPADO POR CUENTA
// ==========================================
function fz_inf_renderCuenta(tipo, trans, cuentas) {
    const total = trans.reduce((s, t) => s + t.monto, 0);
    if (total === 0) { fz_inf_mostrarVacio(); return; }

    const map = {};
    trans.forEach(t => {
        const cid = t.cuenta_id;
        if (!map[cid]) {
            const cuenta = cuentas.find(c => c.id == cid);
            map[cid] = {
                id: cid,
                nombre: cuenta ? cuenta.nombre : 'Desconocida',
                emoji:  '🏦',
                color:  cuenta ? (cuenta.color || '#3498db') : '#3498db',
                total: 0, subs: []
            };
        }
        map[cid].total += t.monto;
    });

    const items = Object.values(map).sort((a, b) => b.total - a.total);
    items.forEach(i => { i.pct = total > 0 ? (i.total / total * 100) : 0; });

    if (!fz_inf_catSel) fz_inf_catSel = items[0];
    fz_inf_pintar(items, total, tipo);
    fz_inf_pintarDetalle(fz_inf_catSel, total, tipo);
}

// ==========================================
// RENDERER: AGRUPADO POR COMERCIO
// ==========================================
function fz_inf_renderComercio(tipo, trans) {
    const total = trans.reduce((s, t) => s + t.monto, 0);
    if (total === 0) { fz_inf_mostrarVacio(); return; }

    const map = {};
    trans.forEach(t => {
        const key = t.comercio || '(Sin comercio)';
        map[key] = (map[key] || 0) + t.monto;
    });

    const items = Object.keys(map).map(nombre => ({
        id: nombre, nombre,
        emoji: nombre === '(Sin comercio)' ? '❓' : '🏪',
        color: '#3498db',
        total: map[nombre], subs: [],
        pct: total > 0 ? (map[nombre] / total * 100) : 0
    })).sort((a, b) => b.total - a.total);

    if (!fz_inf_catSel) fz_inf_catSel = items[0];
    fz_inf_pintar(items, total, tipo);
    fz_inf_pintarDetalle(fz_inf_catSel, total, tipo);
}

// ==========================================
// RENDERER: BALANCE (INGRESOS vs GASTOS)
// ==========================================
function fz_inf_renderizarBalance() {
    const datos = fz_obtenerDatos();
    const year  = fz_fechaActual.getFullYear();
    const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
    const mesFiltro = `${year}-${month}`;

    const transDelMes = (datos.transacciones || []).filter(t =>
        !t.archivada && t.fecha.startsWith(mesFiltro)
    );

    const ingresos = transDelMes.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
    const gastos   = transDelMes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
    const balance  = ingresos - gastos;
    const total    = ingresos + gastos;

    if (total === 0) { fz_inf_mostrarVacio(); return; }

    const items = [
        { id: 'ingresos', nombre: 'Ingresos',  emoji: '💚', color: '#2ecc71', total: ingresos, pct: total > 0 ? ingresos/total*100 : 0, subs: [] },
        { id: 'gastos',   nombre: 'Gastos',    emoji: '❤️', color: '#e74c3c', total: gastos,   pct: total > 0 ? gastos/total*100   : 0, subs: [] },
    ];

    // Mostrar balance en el centro de la dona
    const totalEl = document.getElementById('fz-inf-total-val');
    if (totalEl) {
        totalEl.textContent = formatearDinero(balance);
        totalEl.style.color = balance >= 0 ? 'var(--status-ok)' : 'var(--status-danger)';
    }

    if (!fz_inf_catSel) fz_inf_catSel = items[0];
    fz_inf_pintar(items, total, 'balance');
    fz_inf_pintarDetalle(fz_inf_catSel, total, 'balance');
}

// ==========================================
// PINTAR DONA + LISTA DE CATEGORÍAS PADRE
// ==========================================
function fz_inf_pintar(items, total, tipo) {
    // ---- Dona ----
    const canvas = document.getElementById('fz-inf-dona');
    const emptyEl = document.getElementById('fz-inf-grafico-vacio');
    const centerEl = document.getElementById('fz-inf-dona-center');
    const totalEl  = document.getElementById('fz-inf-total-val');

    if (!canvas) return;

    canvas.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';
    if (centerEl) centerEl.style.display = 'flex';

    if (totalEl && tipo !== 'balance') {
        totalEl.textContent = formatearDinero(total);
        totalEl.style.color = '';
    }

    fz_inf_destruirGrafico();

    const colorTexto = getComputedStyle(document.body).getPropertyValue('--text-lo').trim() || '#888';

    fz_inf_grafico = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: items.map(i => i.nombre),
            datasets: [{
                data: items.map(i => i.total),
                backgroundColor: items.map(i => i.color),
                borderWidth: 3,
                borderColor: getComputedStyle(document.body).getPropertyValue('--bg-card').trim() || '#fff',
                hoverOffset: 6,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const pct = total > 0 ? (ctx.raw / total * 100).toFixed(2) : '0.00';
                            return ` ${formatearDinero(ctx.raw)} (${pct}%)`;
                        }
                    }
                }
            },
            onClick: (_, els) => {
                if (els.length) {
                    const idx = els[0].index;
                    fz_inf_seleccionarCat(idx, items, total, tipo);
                }
            }
        }
    });

    // ---- Lista de categorías padre ----
    const lista = document.getElementById('fz-inf-cat-list');
    if (!lista) return;

    lista.innerHTML = items.map((item, idx) => {
        const colorMonto = tipo === 'gasto' ? 'var(--status-danger)' :
                           tipo === 'ingreso' ? 'var(--status-ok)' :
                           (item.id === 'ingresos' ? 'var(--status-ok)' : 'var(--status-danger)');
        return `
        <div class="fz-inf-cat-item${idx === 0 ? ' seleccionada' : ''}"
             id="fz-inf-cat-item-${idx}"
             onclick="fz_inf_seleccionarCat(${idx}, null, null, null)">
            <div class="fz-inf-cat-icon" style="background:${item.color}22; color:${item.color};">
                ${item.emoji}
            </div>
            <div class="fz-inf-cat-info">
                <div class="fz-inf-cat-nombre">${item.nombre}</div>
                <div class="fz-inf-cat-sub">${item.pct.toFixed(2)}%</div>
            </div>
            <div>
                <div class="fz-inf-cat-monto" style="color:${colorMonto};">${formatearDinero(item.total)}</div>
            </div>
        </div>`;
    }).join('');

    // Guardamos los items en el DOM para usarlos en seleccionarCat
    lista.dataset.items  = JSON.stringify(items);
    lista.dataset.total  = String(total);
    lista.dataset.tipo   = tipo;
}

// ==========================================
// SELECCIONAR UNA CATEGORÍA
// ==========================================
window.fz_inf_seleccionarCat = function(idx, items, total, tipo) {
    const lista = document.getElementById('fz-inf-cat-list');
    if (!lista) return;

    // Recuperar desde DOM si no se pasaron como parámetro
    if (!items) {
        try { items = JSON.parse(lista.dataset.items || '[]'); } catch { items = []; }
        total = parseFloat(lista.dataset.total || '0');
        tipo  = lista.dataset.tipo || 'gasto';
    }

    if (!items[idx]) return;

    // Quitar selección previa
    lista.querySelectorAll('.fz-inf-cat-item').forEach(el => el.classList.remove('seleccionada'));
    const el = document.getElementById(`fz-inf-cat-item-${idx}`);
    if (el) el.classList.add('seleccionada');

    fz_inf_catSel = items[idx];
    fz_inf_pintarDetalle(items[idx], total, tipo);
};

// ==========================================
// PINTAR TABLA DE DETALLE (padre + hijos)
// ==========================================
function fz_inf_pintarDetalle(item, totalGlobal, tipo) {
    const panel = document.getElementById('fz-inf-sub-list');
    if (!panel || !item) return;

    const pctGlobal = totalGlobal > 0 ? (item.total / totalGlobal * 100).toFixed(2) : '0.00';
    const colorMonto = tipo === 'gasto' ? 'var(--status-danger)' :
                       tipo === 'ingreso' ? 'var(--status-ok)' :
                       (item.id === 'ingresos' ? 'var(--status-ok)' : 'var(--status-danger)');

    let html = `
    <div class="fz-inf-sub-row padre">
        <div class="fz-inf-sub-nombre" style="font-weight:700;">
            <span style="font-size:18px;">${item.emoji}</span>
            <span class="fz-inf-sub-nombre-txt">${item.nombre}</span>
        </div>
        <div class="fz-inf-sub-pct" style="font-weight:600;">${pctGlobal}%</div>
        <div class="fz-inf-sub-monto" style="color:${colorMonto}; font-weight:800;">${formatearDinero(item.total)}</div>
    </div>`;

    if (item.subs && item.subs.length > 0) {
        html += item.subs.map(sub => {
            const pctSub = item.total > 0 ? (sub.total / item.total * 100).toFixed(2) : '0.00';
            return `
            <div class="fz-inf-sub-row">
                <div class="fz-inf-sub-nombre">
                    <span class="fz-inf-sub-arrow">↳</span>
                    <span class="fz-inf-sub-dot" style="background:${sub.color};"></span>
                    <span class="fz-inf-sub-nombre-txt">${sub.nombre}</span>
                </div>
                <div class="fz-inf-sub-pct">${pctSub}%</div>
                <div class="fz-inf-sub-monto" style="color:${colorMonto};">${formatearDinero(sub.total)}</div>
            </div>`;
        }).join('');
    } else {
        html += `
        <div style="padding:14px 16px; font-size:12px; color:var(--text-lo);">
            Esta categoría no tiene subcategorías registradas.
        </div>`;
    }

    panel.innerHTML = html;
}

// ==========================================
// ESTADO VACÍO
// ==========================================
function fz_inf_mostrarVacio() {
    fz_inf_destruirGrafico();

    const canvas  = document.getElementById('fz-inf-dona');
    const emptyEl = document.getElementById('fz-inf-grafico-vacio');
    const centerEl = document.getElementById('fz-inf-dona-center');
    const lista   = document.getElementById('fz-inf-cat-list');
    const panel   = document.getElementById('fz-inf-sub-list');
    const totalEl = document.getElementById('fz-inf-total-val');

    if (canvas)  canvas.style.display  = 'none';
    if (emptyEl) emptyEl.style.display = 'block';
    if (centerEl) centerEl.style.display = 'none';
    if (totalEl) { totalEl.textContent = formatearDinero(0); totalEl.style.color = ''; }
    if (lista)   lista.innerHTML  = `<div style="color:var(--text-lo);font-size:13px;padding:20px;text-align:center;">Sin movimientos en este período.</div>`;
    if (panel)   panel.innerHTML  = '';
}

// ==========================================
// HELPERS UI
// ==========================================
function fz_inf_destruirGrafico() {
    if (fz_inf_grafico) { fz_inf_grafico.destroy(); fz_inf_grafico = null; }
}

window.fz_inf_cambiarTipo = function(tipo) {
    fz_inf_tipo = tipo;
    fz_inf_catSel = null;

    ['gastos', 'ingresos', 'balance'].forEach(t => {
        document.getElementById(`fz-inf-btn-${t}`)?.classList.remove('activo');
    });
    document.getElementById(`fz-inf-btn-${tipo}s`)?.classList.add('activo');
    if (tipo === 'balance') {
        document.getElementById('fz-inf-btn-balances')?.classList.remove('activo');
        document.getElementById('fz-inf-btn-balance')?.classList.add('activo');
    }

    // Actualizar label de agrupación
    fz_inf_actualizarLabelAgrup();
    fz_inf_renderizar();
};

window.fz_inf_toggleAgrupacion = function() {
    const menu = document.getElementById('fz-inf-agrup-menu');
    const btn  = document.querySelector('.fz-inf-agrupacion-btn');
    menu?.classList.toggle('visible');
    btn?.classList.toggle('abierto');
};

window.fz_inf_setAgrupacion = function(agrup) {
    fz_inf_agrupacion = agrup;
    fz_inf_catSel     = null;
    fz_inf_actualizarLabelAgrup();
    document.getElementById('fz-inf-agrup-menu')?.classList.remove('visible');
    document.querySelector('.fz-inf-agrupacion-btn')?.classList.remove('abierto');
    fz_inf_renderizar();
};

function fz_inf_actualizarLabelAgrup() {
    const labelEl = document.getElementById('fz-inf-agrup-label');
    if (!labelEl) return;
    const nombres = {
        categoria: { gasto:'Gastos por categoría', ingreso:'Ingresos por categoría', balance:'Balance por categoría' },
        cuenta:    { gasto:'Gastos por cuenta',     ingreso:'Ingresos por cuenta',    balance:'Balance por cuenta' },
        comercio:  { gasto:'Gastos por comercio',   ingreso:'Ingresos por comercio',  balance:'Balance por comercio' }
    };
    labelEl.textContent = (nombres[fz_inf_agrupacion] || {})[fz_inf_tipo] || 'Por categoría';
}

// Cerrar menú de agrupación al clicar afuera
document.addEventListener('click', function(e) {
    const menu = document.getElementById('fz-inf-agrup-menu');
    const btn  = document.querySelector('.fz-inf-agrupacion-btn');
    if (menu && menu.classList.contains('visible') &&
        !e.target.closest('.fz-inf-agrupacion-wrap')) {
        menu.classList.remove('visible');
        btn?.classList.remove('abierto');
    }
});

// ==========================================
// MÓDULO: PRESUPUESTOS (Control de Gastos)
// ==========================================

window.fz_pintarPresupuestos = function() {
    const contenedor = document.getElementById('fz-lista-presupuestos');
    const kpiContenedor = document.getElementById('fz-presupuesto-kpis');
    if (!contenedor || !kpiContenedor) return;

    const datos = fz_obtenerDatos();
    const presupuestos = datos.presupuestos || [];
    const categorias = datos.categorias || [];

    // 1. Filtrar las transacciones del mes seleccionado (exactamente igual que el Resumen)
    const year = fz_fechaActual.getFullYear();
    const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
    const mesFiltro = `${year}-${month}`;

    const gastosDelMes = (datos.transacciones || []).filter(t =>
        !t.archivada &&
        t.tipo === 'gasto' &&
        t.fecha.startsWith(mesFiltro)
    );

    // 2. Acumular gastos agrupándolos en las categorías padre
    const gastosPorCat = {};
    gastosDelMes.forEach(t => {
        const cat = categorias.find(c => c.id === t.categoria_id);
        if (cat) {
            // Si es subcategoría, el gasto cuenta para el presupuesto del padre
            const targetId = cat.parent_id || cat.id; 
            gastosPorCat[targetId] = (gastosPorCat[targetId] || 0) + t.monto;
        }
    });

    let totalPresupuestado = 0;
    let totalGastadoEnPresupuestos = 0;
    let htmlCards = '';

    // 3. Renderizar vista vacía o tarjetas
    if (presupuestos.length === 0) {
        htmlCards = `
        <div style="grid-column: 1 / -1; padding: 50px 20px; text-align: center; color: var(--text-lo); border: 2px dashed var(--border-card); border-radius: 16px; background: rgba(0,0,0,0.02);">
            <i class="ti ti-target" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
            <h3 style="color: var(--text-hi); margin-bottom: 8px;">Sin presupuestos definidos</h3>
            <p style="font-size: 13.5px;">Controla tus finanzas estableciendo límites mensuales por categoría.</p>
        </div>`;
    } else {
        presupuestos.forEach(p => {
            const cat = categorias.find(c => c.id === p.categoria_id);
            if(!cat || cat.archivada) return; // Omitir si la categoría ya no existe

            const gastado = gastosPorCat[cat.id] || 0;
            const limite = p.monto;
            const porcentaje = limite > 0 ? (gastado / limite) * 100 : 0;

            totalPresupuestado += limite;
            totalGastadoEnPresupuestos += gastado;

            // Determinar color semántico
            let colorBarra = 'var(--status-ok)'; // Verde (Bien)
            if (porcentaje >= 100) colorBarra = 'var(--status-danger)'; // Rojo (Excedido)
            else if (porcentaje >= 80) colorBarra = '#f39c12'; // Naranja (Alerta)

            const disponible = limite - gastado;
            let textoEstado = '';
            if (disponible > 0) {
                textoEstado = `<span style="color: var(--text-lo);">${formatearDinero(disponible)} disponibles</span>`;
            } else if (disponible === 0) {
                textoEstado = `<span style="color: #f39c12; font-weight: 600;">Límite alcanzado</span>`;
            } else {
                textoEstado = `<span style="color: var(--status-danger); font-weight: 600;">Excedido por ${formatearDinero(Math.abs(disponible))}</span>`;
            }

            htmlCards += `
            <div class="fz-presupuesto-card">
                <div class="fz-presupuesto-header">
                    <div class="fz-presupuesto-cat-info">
                        <div class="fz-presupuesto-icon" style="background: ${cat.color}22; color: ${cat.color};">
                            ${cat.emoji || '🏷️'}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 3px;">
                            <h4 style="margin:0; font-size:15px; font-weight:700; color:var(--text-hi);">${cat.nombre}</h4>
                            <span style="font-size:12px;">${textoEstado}</span>
                        </div>
                    </div>
                    <button class="fz-cat-icon-btn" style="border:none; width:34px; height:34px;" onclick="fz_abrirModalPresupuesto(${p.id})">
                        <i class="ti ti-pencil"></i>
                    </button>
                </div>
                <div style="margin-top: auto;">
                    <div class="fz-presupuesto-montos">
                        <div>
                            <span style="font-weight:800; font-size:15px; color:var(--text-hi);">${formatearDinero(gastado)}</span>
                            <span style="color:var(--text-lo);"> gastados</span>
                        </div>
                        <span style="font-weight:600; color:var(--text-lo);">/ ${formatearDinero(limite)}</span>
                    </div>
                    <div class="fz-pb-bg">
                        <div class="fz-pb-fill" style="width: ${Math.min(porcentaje, 100)}%; background-color: ${colorBarra};"></div>
                    </div>
                </div>
            </div>`;
        });
    }

    contenedor.innerHTML = htmlCards;

    // 4. Renderizar panel superior (KPIs de desempeño del mes)
    if (presupuestos.length > 0) {
        const pctGlobal = totalPresupuestado > 0 ? (totalGastadoEnPresupuestos / totalPresupuestado) * 100 : 0;
        let colorKpi = 'var(--status-ok)';
        if (pctGlobal >= 100) colorKpi = 'var(--status-danger)';
        else if (pctGlobal >= 80) colorKpi = '#f39c12';

        kpiContenedor.innerHTML = `
        <div class="fz-res-kpi-card" style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; align-items: center; background: var(--bg-card); padding: 24px;">
            
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 11.5px; color: var(--text-lo); font-weight: 600; text-transform: uppercase;">Presupuesto Global</span>
                <span style="font-size: 20px; font-weight: 800; color: var(--text-hi);">${formatearDinero(totalPresupuestado)}</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 11.5px; color: var(--text-lo); font-weight: 600; text-transform: uppercase;">Consumo</span>
                    <span style="font-size: 18px; font-weight: 800; color: ${colorKpi};">${pctGlobal.toFixed(1)}%</span>
                </div>
                <div class="fz-pb-bg" style="height: 8px;">
                    <div class="fz-pb-fill" style="width: ${Math.min(pctGlobal, 100)}%; background-color: ${colorKpi};"></div>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 4px; text-align: right;">
                <span style="font-size: 11.5px; color: var(--text-lo); font-weight: 600; text-transform: uppercase;">Total Gastado</span>
                <span style="font-size: 20px; font-weight: 800; color: var(--text-hi);">${formatearDinero(totalGastadoEnPresupuestos)}</span>
            </div>
        </div>
        `;
        kpiContenedor.style.display = 'grid';
    } else {
        kpiContenedor.style.display = 'none';
    }
};

window.fz_abrirModalPresupuesto = function(id = null) {
    const datos = fz_obtenerDatos();
    const presupuestos = datos.presupuestos || [];
    
    // Filtrar: Solo categorías padre que sean de tipo "gasto"
    const categoriasGastos = (datos.categorias || []).filter(c => !c.archivada && c.tipo === 'gasto' && !c.parent_id && c.nombre !== 'Reajuste*');

    if (categoriasGastos.length === 0) {
        return alert("Primero debes crear al menos una categoría de gasto.");
    }

    const selectCat = document.getElementById('fz-presupuesto-categoria');
    selectCat.innerHTML = categoriasGastos.map(c => `<option value="${c.id}">${c.emoji || '🏷️'} ${c.nombre}</option>`).join('');

    document.getElementById('fz-presupuesto-id').value = id || '';
    const btnEliminar = document.getElementById('fz-btn-eliminar-presupuesto');

    if (id) {
        const p = presupuestos.find(x => x.id === id);
        if (p) {
            selectCat.value = p.categoria_id;
            document.getElementById('fz-presupuesto-monto').value = parseFloat(p.monto).toFixed(2);
            document.getElementById('fz-modal-presupuesto-titulo').textContent = 'Editar Presupuesto';
            btnEliminar.style.display = 'flex';
        }
    } else {
        document.getElementById('fz-presupuesto-monto').value = '';
        document.getElementById('fz-modal-presupuesto-titulo').textContent = 'Nuevo Presupuesto';
        btnEliminar.style.display = 'none';
    }

    document.getElementById('fz-modal-presupuesto').classList.add('visible');
    setTimeout(() => document.getElementById('fz-presupuesto-monto').focus(), 100);
};

window.fz_guardarFormularioPresupuesto = function() {
    const idInput = document.getElementById('fz-presupuesto-id').value;
    const catId = parseInt(document.getElementById('fz-presupuesto-categoria').value);
    const monto = parseFloat(document.getElementById('fz-presupuesto-monto').value);

    if (isNaN(monto) || monto <= 0) return alert("Por favor, ingresa un monto válido superior a cero.");
    if (!catId) return alert("Selecciona una categoría válida.");

    let datosBase = cargarDatos();
    if (!datosBase.finanzas_personales.presupuestos) datosBase.finanzas_personales.presupuestos = [];

    // Validar que no estemos duplicando presupuesto para la misma categoría (si es creación)
    if (!idInput) {
        const existe = datosBase.finanzas_personales.presupuestos.some(p => p.categoria_id === catId);
        if (existe) return alert("Ya existe un presupuesto definido para esta categoría. Por favor edítalo en la lista.");
    }

    const presupObj = {
        id: idInput ? parseInt(idInput) : Date.now(),
        categoria_id: catId,
        monto: monto
    };

    let idx = datosBase.finanzas_personales.presupuestos.findIndex(p => p.id === presupObj.id || p.categoria_id === presupObj.categoria_id);
    if (idx > -1) {
        datosBase.finanzas_personales.presupuestos[idx] = presupObj; // Actualiza
    } else {
        datosBase.finanzas_personales.presupuestos.push(presupObj); // Crea
    }

    guardarDatos(datosBase);
    document.getElementById('fz-modal-presupuesto').classList.remove('visible');
    fz_pintarPresupuestos();
};

window.fz_eliminarPresupuesto = function() {
    const id = document.getElementById('fz-presupuesto-id').value;
    if (!id) return;

    if (confirm("¿Estás seguro de que deseas eliminar este presupuesto? Los gastos registrados no se verán afectados.")) {
        let datosBase = cargarDatos();
        if (datosBase.finanzas_personales.presupuestos) {
            datosBase.finanzas_personales.presupuestos = datosBase.finanzas_personales.presupuestos.filter(p => p.id !== parseInt(id));
            guardarDatos(datosBase);
        }
        document.getElementById('fz-modal-presupuesto').classList.remove('visible');
        fz_pintarPresupuestos();
    }
};