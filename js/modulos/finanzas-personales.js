// ==========================================
// MÓDULO: FINANZAS PERSONALES
// ARQUITECTURA: Sub-router por pestañas y filtro mensual
// ==========================================

let fz_fechaActual = new Date(); // Guardará el mes y año en el que estamos navegando
let fz_tabActual = 'resumen';

// Formateador de moneda utilitario
const formatearDinero = (monto) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(monto);
};

// 1. INICIALIZACIÓN (Llamada por app.js)
window.inicializarFinanzasPersonales = function() {
    console.log("Módulo de Finanzas Personales iniciado.");
    actualizarEtiquetaMes();
    configurarSubMenu();
    renderizarPantallaActual();
};

// 2. CONTROL DEL MES
window.finanzasMoverMes = function(direccion) {
    // direccion: -1 (atrás) o 1 (adelante)
    fz_fechaActual.setMonth(fz_fechaActual.getMonth() + direccion);
    actualizarEtiquetaMes();
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
window.abrirModalTransaccion = function(tipo) { window.fz_abrirModalTransaccion(tipo); };

window.fz_abrirModalTransaccion = function(tipo, id = null) {
    const datos = fz_obtenerDatos();
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada);
    const categoriasActivas = datos.categorias.filter(c => !c.archivada && c.tipo === tipo);

    if (cuentasActivas.length === 0) return alert("Debes crear al menos una Cuenta primero.");
    if (categoriasActivas.length === 0) return alert(`Debes crear al menos una Categoría de tipo ${tipo} primero.`);

    // Llenar selects
    document.getElementById('fz-trans-cuenta').innerHTML = cuentasActivas.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    document.getElementById('fz-trans-categoria').innerHTML = categoriasActivas.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

    // Configurar Modal
    document.getElementById('fz-trans-tipo').value = tipo;
    const colorHeader = tipo === 'ingreso' ? 'var(--status-ok)' : 'var(--status-danger)';
    document.getElementById('fz-modal-trans-titulo').innerHTML = `<span style="color: ${colorHeader};">${tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span>`;
    
    // Limpiar campos
    document.getElementById('fz-trans-id').value = '';
    document.getElementById('fz-trans-monto').value = '';
    document.getElementById('fz-trans-desc').value = '';
    
    // Poner fecha de hoy por defecto
    const hoy = new Date();
    document.getElementById('fz-trans-fecha').value = hoy.toISOString().split('T')[0];

    document.getElementById('fz-modal-transaccion').classList.add('visible');
};

window.fz_guardarFormularioTransaccion = function() {
    const idInput = document.getElementById('fz-trans-id').value;
    const tipo = document.getElementById('fz-trans-tipo').value;
    const monto = parseFloat(document.getElementById('fz-trans-monto').value);
    const desc = document.getElementById('fz-trans-desc').value.trim();
    const fecha = document.getElementById('fz-trans-fecha').value;
    const cuenta_id = parseInt(document.getElementById('fz-trans-cuenta').value);
    const categoria_id = parseInt(document.getElementById('fz-trans-categoria').value);

    if (!monto || monto <= 0) return alert("Ingresa un monto válido.");
    if (!desc) return alert("Ingresa una descripción.");
    if (!fecha) return alert("Selecciona una fecha.");

    fz_guardarTransaccion({
        id: idInput ? parseInt(idInput) : Date.now(),
        tipo: tipo,
        monto: monto,
        descripcion: desc,
        fecha: fecha,
        cuenta_id: cuenta_id,
        categoria_id: categoria_id,
        archivada: false
    });

    document.getElementById('fz-modal-transaccion').classList.remove('visible');
    fz_pintarTransacciones();
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

window.fz_abrirModalCuenta = function(id = null) {
    document.getElementById('fz-modal-cuenta-titulo').textContent = id ? 'Editar Cuenta' : 'Nueva Cuenta';
    document.getElementById('fz-cuenta-id').value = id || '';
    
    if (id) {
        const cuenta = fz_obtenerDatos().cuentas.find(c => c.id === id);
        document.getElementById('fz-cuenta-nombre').value = cuenta.nombre;
        document.getElementById('fz-cuenta-saldo').value = cuenta.saldo_inicial;
    } else {
        document.getElementById('fz-cuenta-nombre').value = '';
        document.getElementById('fz-cuenta-saldo').value = '';
    }
    
    document.getElementById('fz-modal-cuenta').classList.add('visible');
};

window.fz_guardarFormularioCuenta = function() {
    const idInput = document.getElementById('fz-cuenta-id').value;
    const nombre = document.getElementById('fz-cuenta-nombre').value.trim();
    const saldo = parseFloat(document.getElementById('fz-cuenta-saldo').value) || 0;

    if (!nombre) return alert("El nombre es obligatorio");

    fz_guardarCuenta({
        id: idInput ? parseInt(idInput) : Date.now(),
        nombre: nombre,
        saldo_inicial: saldo,
        archivada: false
    });

    document.getElementById('fz-modal-cuenta').classList.remove('visible');
    fz_pintarCuentas();
};

window.fz_archivarCuentaUI = function(id) {
    if(confirm("¿Seguro que deseas archivar esta cuenta? Las transacciones pasadas se mantendrán seguras.")) {
        fz_archivarCuenta(id);
        fz_pintarCuentas();
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
    
    let saldoActual = cuenta.saldo_inicial || 0;
    const transActivas = datos.transacciones.filter(t => !t.archivada);
    
    transActivas.forEach(t => {
        if (t.tipo === 'ingreso' && t.cuenta_id === cuentaId) saldoActual += t.monto;
        if (t.tipo === 'gasto' && t.cuenta_id === cuentaId) saldoActual -= t.monto;
        if (t.tipo === 'transferencia') {
            if (t.cuenta_id === cuentaId) saldoActual -= t.monto; // Salió de esta cuenta (Origen)
            if (t.cuenta_destino_id === cuentaId) saldoActual += t.monto; // Entró a esta cuenta (Destino)
        }
    });
    
    return saldoActual;
}

// 2. Calcula la suma de TODO el dinero en todas las cuentas
function fz_calcularSaldoTotal() {
    const datos = fz_obtenerDatos();
    const cuentasActivas = datos.cuentas.filter(c => !c.archivada);
    return cuentasActivas.reduce((total, c) => total + fz_calcularSaldoCuenta(c.id), 0);
}

// 3. Pinta la pantalla principal (Resumen)
let fz_graficoInstancia = null; // Guardará el gráfico para destruirlo/crearlo al cambiar de mes

function fz_pintarResumen() {
    const datos = fz_obtenerDatos();
    const transActivas = datos.transacciones.filter(t => !t.archivada);
    
    // Obtener mes actual del calendario global
    const year = fz_fechaActual.getFullYear();
    const month = String(fz_fechaActual.getMonth() + 1).padStart(2, '0');
    const mesFiltro = `${year}-${month}`;

    const transDelMes = transActivas.filter(t => t.fecha.startsWith(mesFiltro));

    let ingresosMes = 0;
    let gastosMes = 0;

    // Calcular KPIs
    transDelMes.forEach(t => {
        if (t.tipo === 'ingreso') ingresosMes += t.monto;
        if (t.tipo === 'gasto') gastosMes += t.monto;
    });

    // Inyectar KPIs al HTML
    document.getElementById('fz-saldo-general').textContent = formatearDinero(fz_calcularSaldoTotal());
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

