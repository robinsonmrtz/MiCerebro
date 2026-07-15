// ==========================================
// MÓDULO: ejercicio.js
// ⚠️ FASE DE DISEÑO — este archivo solo controla interacciones
// visuales de demostración (tabs, click en músculos, selector de
// tipo de cuerpo, wizard de configuración). NO lee ni escribe en
// localStorage['datos_cerebro'] todavía. Cuando el diseño quede
// aprobado, esta función se conectará a js/core/storage.js
// siguiendo el mismo patrón que habitos.js / temporizador.js.
// ==========================================

// Datos de ejemplo SOLO para poblar el panel de detalle en la demo.
// En la versión funcional esto vendrá de datos.registro_habitos /
// una futura sección "ejercicio" dentro de datos_cerebro.
const EJ_DATOS_DEMO = {
    'pecho':            { nombre: 'Pecho',                valor: 96, unidad: 'cm de contorno', tendencia: '+1.2 cm / mes', ejercicios: ['Flexiones abiertas', 'Flexiones diamante', 'Fondos en silla'] },
    'hombro-izq':        { nombre: 'Hombro izquierdo',      valor: 45, unidad: 'cm de contorno', tendencia: '+0.4 cm / mes', ejercicios: ['Flexiones declinadas', 'Plancha'] },
    'hombro-der':        { nombre: 'Hombro derecho',        valor: 45, unidad: 'cm de contorno', tendencia: '+0.4 cm / mes', ejercicios: ['Flexiones declinadas', 'Plancha'] },
    'biceps-izq':        { nombre: 'Bíceps izquierdo',      valor: 33, unidad: 'cm de contorno', tendencia: '+0.6 cm / mes', ejercicios: ['Dominadas (próximamente)'] },
    'biceps-der':        { nombre: 'Bíceps derecho',        valor: 33, unidad: 'cm de contorno', tendencia: '+0.6 cm / mes', ejercicios: ['Dominadas (próximamente)'] },
    'antebrazo-izq':     { nombre: 'Antebrazo izquierdo',   valor: 28, unidad: 'cm de contorno', tendencia: '+0.2 cm / mes', ejercicios: ['Plancha', 'Flexiones (agarre)'] },
    'antebrazo-der':     { nombre: 'Antebrazo derecho',     valor: 28, unidad: 'cm de contorno', tendencia: '+0.2 cm / mes', ejercicios: ['Plancha', 'Flexiones (agarre)'] },
    'abdomen':           { nombre: 'Abdomen',               valor: 82, unidad: 'cm de cintura',   tendencia: '−0.8 cm / mes', ejercicios: ['Plancha', 'Elevación de piernas (próximamente)'], baja: true },
    'oblicuo-izq':       { nombre: 'Oblicuo izquierdo',     valor: 82, unidad: 'cm de cintura',   tendencia: '−0.5 cm / mes', ejercicios: ['Plancha lateral (próximamente)'], baja: true },
    'oblicuo-der':       { nombre: 'Oblicuo derecho',       valor: 82, unidad: 'cm de cintura',   tendencia: '−0.5 cm / mes', ejercicios: ['Plancha lateral (próximamente)'], baja: true },
    'cuadriceps-izq':    { nombre: 'Cuádriceps izquierdo',  valor: 54, unidad: 'cm de contorno', tendencia: '+0.9 cm / mes', ejercicios: ['Sentadillas', 'Zancadas'] },
    'cuadriceps-der':    { nombre: 'Cuádriceps derecho',    valor: 54, unidad: 'cm de contorno', tendencia: '+0.9 cm / mes', ejercicios: ['Sentadillas', 'Zancadas'] },
    'gemelo-izq':        { nombre: 'Gemelo izquierdo',      valor: 36, unidad: 'cm de contorno', tendencia: '+0.3 cm / mes', ejercicios: ['Elevación de talones (próximamente)'] },
    'gemelo-der':        { nombre: 'Gemelo derecho',        valor: 36, unidad: 'cm de contorno', tendencia: '+0.3 cm / mes', ejercicios: ['Elevación de talones (próximamente)'] },
    'trapecio':          { nombre: 'Trapecio',              valor: 47, unidad: 'cm de contorno', tendencia: '+0.3 cm / mes', ejercicios: ['Dominadas (próximamente)'] },
    'dorsales':          { nombre: 'Dorsales',               valor: 98, unidad: 'cm de espalda',  tendencia: '+1.0 cm / mes', ejercicios: ['Dominadas (próximamente)', 'Remo (próximamente)'] },
    'triceps-izq':       { nombre: 'Tríceps izquierdo',      valor: 32, unidad: 'cm de contorno', tendencia: '+0.5 cm / mes', ejercicios: ['Flexiones cerradas', 'Flexiones diamante'] },
    'triceps-der':       { nombre: 'Tríceps derecho',        valor: 32, unidad: 'cm de contorno', tendencia: '+0.5 cm / mes', ejercicios: ['Flexiones cerradas', 'Flexiones diamante'] },
    'lumbares':          { nombre: 'Lumbares',               valor: 30, unidad: 'cm de contorno', tendencia: 'Estable',       ejercicios: ['Plancha'] },
    'gluteos':           { nombre: 'Glúteos',                valor: 98, unidad: 'cm de contorno', tendencia: '+0.7 cm / mes', ejercicios: ['Sentadillas', 'Zancadas'] },
    'isquios-izq':       { nombre: 'Isquiotibiales izquierdo', valor: 54, unidad: 'cm de contorno', tendencia: '+0.4 cm / mes', ejercicios: ['Sentadillas'] },
    'isquios-der':       { nombre: 'Isquiotibiales derecho', valor: 54, unidad: 'cm de contorno', tendencia: '+0.4 cm / mes', ejercicios: ['Sentadillas'] },
};

function inicializarEjercicio() {

    // ---------- TABS ----------
    const tabs = document.querySelectorAll('.ej-tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            document.querySelectorAll('.ej-panel').forEach(p => p.classList.remove('activo'));
            document.querySelector(`.ej-panel[data-ej-panel="${btn.dataset.ejTab}"]`)?.classList.add('activo');
        });
    });

    // ---------- TOGGLE FRONTAL / POSTERIOR ----------
    const toggleVista = document.getElementById('ej-toggle-vista');
    const escenario = document.getElementById('ej-escenario');
    if (toggleVista && escenario) {
        toggleVista.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                toggleVista.querySelectorAll('button').forEach(b => b.classList.remove('activo'));
                btn.classList.add('activo');
                escenario.dataset.vista = btn.dataset.ejVista;
                cerrarDetalle();
            });
        });
    }

    // ---------- SELECTOR DE TIPO DE CUERPO (demo) ----------
    const selectorTipo = document.getElementById('ej-selector-tipo');
    if (selectorTipo && escenario) {
        selectorTipo.querySelectorAll('.ej-chip-tipo').forEach(chip => {
            chip.addEventListener('click', () => {
                selectorTipo.querySelectorAll('.ej-chip-tipo').forEach(c => c.classList.remove('activo'));
                chip.classList.add('activo');
                escenario.dataset.tipo = chip.dataset.ejTipo;
            });
        });
    }

    // ---------- CLICK EN MÚSCULOS ----------
    const panelVacio = document.getElementById('ej-detalle-vacio');
    const panelContenido = document.getElementById('ej-detalle-contenido');

    function cerrarDetalle() {
        document.querySelectorAll('.musculo.seleccionado').forEach(m => m.classList.remove('seleccionado'));
        panelContenido?.classList.remove('activo');
        panelVacio?.style.removeProperty('display');
    }

    function mostrarDetalleMusculo(grupo, id) {
        const datos = EJ_DATOS_DEMO[id];
        if (!datos) return;

        document.querySelectorAll('.musculo.seleccionado').forEach(m => m.classList.remove('seleccionado'));
        grupo.classList.add('seleccionado');

        document.getElementById('ej-detalle-nombre').textContent = datos.nombre;
        document.getElementById('ej-detalle-valor').textContent = datos.valor;
        document.querySelector('#ej-detalle-contenido .unidad').textContent = datos.unidad;

        const tendenciaEl = document.getElementById('ej-detalle-tendencia');
        tendenciaEl.innerHTML = `<i class="ti ${datos.baja ? 'ti-trending-down' : 'ti-trending-up'}"></i>${datos.tendencia}`;
        tendenciaEl.classList.toggle('baja', !!datos.baja);

        const badge = document.getElementById('ej-detalle-badge');
        badge.textContent = datos.baja ? '↓ Mejorando' : '↑ En progreso';
        badge.className = datos.baja ? 'badge-ok' : 'badge-ok';

        const listaEj = document.getElementById('ej-detalle-ejercicios');
        listaEj.innerHTML = datos.ejercicios.map(nombreEj => `
            <div class="ej-item-ejercicio">
                <span class="nombre"><i class="ti ti-barbell"></i>${nombreEj}</span>
                <span class="meta">Ver rutina</span>
            </div>
        `).join('');

        if (panelVacio) panelVacio.style.display = 'none';
        panelContenido?.classList.add('activo');
    }

    document.querySelectorAll('.musculo').forEach(grupo => {
        const id = grupo.dataset.musculo;
        grupo.addEventListener('click', () => mostrarDetalleMusculo(grupo, id));
        grupo.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                mostrarDetalleMusculo(grupo, id);
            }
        });
    });

    // ---------- RUTINAS: marcar ejercicio como completado (demo) ----------
    document.querySelectorAll('.ej-tarea-ejercicio').forEach(tarea => {
        tarea.addEventListener('click', () => {
            tarea.classList.toggle('completada');
            // TODO (fase funcional): recalcular ej-anillo-progreso del día
            // y guardar el estado en datos_cerebro vía storage.js
        });
    });

    // ---------- HISTORIAL: generar heatmap decorativo (demo) ----------
    const heatmap = document.getElementById('ej-heatmap');
    if (heatmap && !heatmap.children.length) {
        const niveles = ['', 'n1', 'n2', 'n3', 'n4'];
        for (let i = 0; i < 98; i++) {
            const celda = document.createElement('div');
            const nivel = niveles[Math.floor(Math.random() * niveles.length)];
            celda.className = `celda ${nivel}`;
            heatmap.appendChild(celda);
        }
    }

    // ---------- CONFIGURACIÓN: wizard ----------
    const opcionesInicio = document.getElementById('ej-opciones-inicio');
    if (opcionesInicio) {
        opcionesInicio.querySelectorAll('.ej-opcion-card').forEach(card => {
            card.addEventListener('click', () => {
                opcionesInicio.querySelectorAll('.ej-opcion-card').forEach(c => c.classList.remove('activo'));
                card.classList.add('activo');
            });
        });
    }

    const chipsVariante = document.getElementById('ej-chips-variante');
    const varianteCaption = document.getElementById('ej-variante-caption');
    if (chipsVariante && varianteCaption) {
        chipsVariante.querySelectorAll('.ej-chip-variante').forEach(chip => {
            chip.addEventListener('click', () => {
                chipsVariante.querySelectorAll('.ej-chip-variante').forEach(c => c.classList.remove('activo'));
                chip.classList.add('activo');
                varianteCaption.innerHTML = `Trabaja principalmente: <strong>${chip.dataset.ejTrabaja}</strong>`;
            });
        });
    }

    const progresionOpciones = document.getElementById('ej-progresion-opciones');
    if (progresionOpciones) {
        progresionOpciones.querySelectorAll('.ej-radio-card').forEach(card => {
            card.addEventListener('click', () => {
                progresionOpciones.querySelectorAll('.ej-radio-card').forEach(c => c.classList.remove('activo'));
                card.classList.add('activo');
                document.querySelectorAll('[data-ej-subcampo-de]').forEach(sc => sc.classList.remove('activo'));
                document.querySelectorAll(`[data-ej-subcampo-de="${card.dataset.ejProgresion}"]`).forEach(sc => sc.classList.add('activo'));
            });
        });
    }

    // Steppers genéricos (+ / −) — demo visual
    document.querySelectorAll('.ej-stepper').forEach(stepper => {
        const input = stepper.querySelector('input');
        const [btnMenos, btnMas] = stepper.querySelectorAll('button');
        btnMenos?.addEventListener('click', () => {
            input.value = Math.max(0, parseInt(input.value || 0) - 1);
        });
        btnMas?.addEventListener('click', () => {
            input.value = parseInt(input.value || 0) + 1;
        });
    });
}

// Se expone igual que el resto de módulos, para que app.js la invoque
// al cargar la vista (ver patrón en cargarVista() dentro de app.js)
window.inicializarEjercicio = inicializarEjercicio;
