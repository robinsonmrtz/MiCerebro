// ==========================================
// MÓDULO DE TIEMPO DE TRABAJO: temporizador.js
// ==========================================

let segundosTrabajados = 0, segundosPausaActual = 0, segundosPausaAcumulado = 0;
let intervaloReloj, estadoActual = 'inactivo';
let inicioMatematico = 0, tiempoInicioPausa = 0, ultimoTramoAvisado = 0, limitePausa = 0;
let detectorInactividadActivo = false;
let fechaEnCurso = "";
let intervaloAlarmaInactividad = null;

// Hora de inicio del día — se registra al primer clic de Trabajar
let horaInicioSesion = null;

let audioCtxGlobal = null;

function obtenerAudioCtx() {
    if (!audioCtxGlobal || audioCtxGlobal.state === 'closed') {
        audioCtxGlobal = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxGlobal.state === 'suspended') audioCtxGlobal.resume();
    return audioCtxGlobal;
}

document.addEventListener('click', () => { obtenerAudioCtx(); });

let pantallaTiempo, pantallaEstado, btnTrabajar, btnPausar, btnDetener, inputBloqueAviso, inputPausaMin;

function formatearTiempo(segundosTotales) {
    const h = Math.floor(segundosTotales / 3600), m = Math.floor((segundosTotales % 3600) / 60), s = segundosTotales % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function obtenerHoraActual() {
    const ahora = new Date();
    return `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
}

function playTone(freq, startTime, duration) {
    const ctx = obtenerAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function activarAlarma(mensaje) {
    const ctx = obtenerAudioCtx();
    const now = ctx.currentTime;
    playTone(880.00, now, 0.4);
    playTone(1108.73, now + 0.15, 0.6);
    if (Notification.permission === "granted") new Notification("⏱️ Cerebro", { body: mensaje });
}

function tocarAlarmaInactividad() {
    const ctx = obtenerAudioCtx();
    const now = ctx.currentTime;
    playTone(880.00, now, 0.4);
    playTone(1108.73, now + 0.15, 0.6);
}

function activarAlarmaIntermitente() {
    detenerAlarmaIntermitente();
    tocarAlarmaInactividad();
    if (Notification.permission === "granted") {
        new Notification("⏸️ Inactividad detectada", { body: "Presiona Pausar para silenciar" });
    }
    intervaloAlarmaInactividad = setInterval(() => {
        if (estadoActual === 'pausado') {
            tocarAlarmaInactividad();
        } else {
            detenerAlarmaIntermitente();
        }
    }, 4000);
}

function detenerAlarmaIntermitente() {
    if (intervaloAlarmaInactividad) {
        clearInterval(intervaloAlarmaInactividad);
        intervaloAlarmaInactividad = null;
    }
}

// ✅ CLAVE DEL FIX DE MEDIANOCHE:
// El acumulado temporal se guarda usando "fechaEnCurso" (el día lógico en que
// arrancó la sesión), NO la fecha real del sistema. Así, si el reloj cruza la
// medianoche mientras se trabaja, el acumulado sigue perteneciendo al mismo día.
function obtenerAcumuladoDia(fecha) {
    const memo = JSON.parse(localStorage.getItem('memoria_diaria_trabajo')) || {};
    return memo.fecha === fecha ? memo.segundos : 0;
}

function guardarAcumuladoDia(fecha, segs) {
    localStorage.setItem('memoria_diaria_trabajo', JSON.stringify({ fecha, segundos: segs }));
}

function guardarEstadoContinuo() {
    const metaInput = document.getElementById('input-meta');
    localStorage.setItem('sesionTrabajoTemporal', JSON.stringify({
        fecha: fechaEnCurso, // ✅ día lógico en que inició la sesión (no necesariamente "hoy")
        estado: estadoActual,
        inicioTrabajo: inicioMatematico,
        inicioPausa: tiempoInicioPausa,
        segundosTrabajados,
        segundosPausaActual,
        segundosPausaAcumulado,
        meta: metaInput ? metaInput.value : 8,
        horaInicio: horaInicioSesion
    }));
}

function actualizarInterfazEstado() {
    if(!pantallaEstado) return;
    const metaSegundos = (parseFloat(document.getElementById('input-meta').value) || 8) * 3600;
    if (estadoActual === 'trabajando') {
        if (segundosTrabajados >= metaSegundos) {
            pantallaEstado.innerText = "⭐ ¡META CUMPLIDA!";
            pantallaEstado.className = "estado-trabajando";
        } else {
            pantallaEstado.innerText = "TRABAJANDO...";
            pantallaEstado.className = "estado-trabajando";
        }
    }
}

// ✅ Sincroniza la barra de progreso y el panel lateral
function actualizarPanelUI() {
    const metaInput = document.getElementById('input-meta');
    if(!metaInput) return; // Si no existe el input, es que no estamos en la vista de trabajo

    const fill = document.getElementById('barra-meta-fill');
    const barraLabel = document.getElementById('barra-meta-label');
    const panelTrabajado = document.getElementById('panel-trabajado');
    const panelPausado = document.getElementById('panel-pausado');
    const panelRestante = document.getElementById('panel-restante');
    const panelPct = document.getElementById('panel-pct');
    const panelMetaVal = document.getElementById('panel-meta-val');
    const panelBloques = document.getElementById('panel-bloques');
    const panelInicio = document.getElementById('panel-inicio');
    const panelEstado = document.getElementById('panel-estado');

    const segs = segundosTrabajados || 0;
    const meta = parseFloat(metaInput.value) || 8;
    const metaSegs = meta * 3600;
    const pct = Math.min(100, Math.round((segs / metaSegs) * 100));

    const restSegs = Math.max(0, metaSegs - segs);
    const rh = Math.floor(restSegs / 3600);
    const rm = Math.floor((restSegs % 3600) / 60);

    // ✅ Tiempo total en pausa del día (histórico del día + pausa activa)
    const totalPausaHoy = segundosPausaAcumulado + (estadoActual === 'pausando' ? segundosPausaActual : 0);

    // Barra de progreso
    if (fill) fill.style.width = pct + '%';
    if (barraLabel) barraLabel.textContent = `Meta: ${meta}h`;

    // Panel de sesión
    if (panelTrabajado) panelTrabajado.textContent = formatearTiempo(segs);
    if (panelPausado) panelPausado.textContent = formatearTiempo(totalPausaHoy);
    if (panelMetaVal) panelMetaVal.textContent = `${meta}h 00m`;
    if (panelRestante) panelRestante.textContent = `${rh}h ${String(rm).padStart(2,'0')}m`;
    if (panelPct) panelPct.textContent = pct + '%';

    if (panelEstado) {
        let txt = 'Inactivo';
        let clase = '';
        if (estadoActual === 'trabajando') { txt = 'Trabajando'; clase = 'activo'; }
        else if (estadoActual === 'pausado') { txt = 'Pausado (inactividad)'; clase = 'pausando'; }
        else if (estadoActual === 'pausando') { txt = 'En pausa'; clase = 'pausando'; }
        panelEstado.innerHTML = `<span class="status-dot ${clase}"></span>${txt}`;
    }

    if (panelInicio) {
        panelInicio.textContent = horaInicioSesion ? horaInicioSesion : '--:--';
    }

    const bloqueMin = parseInt(document.getElementById('input-bloque')?.value) || 60;
    if (panelBloques) panelBloques.textContent = Math.floor(segs / (bloqueMin * 60));
}

async function encenderSensorVigilante() {
    if (!('IdleDetector' in window)) return;
    if (detectorInactividadActivo) return;
    try {
        const permiso = await IdleDetector.requestPermission();
        if (permiso === 'granted') {
            const detector = new IdleDetector();
            detector.addEventListener('change', () => {
                if (detector.userState === 'idle' && estadoActual === 'trabajando') {
                    pausarTrabajo();
                    activarAlarmaIntermitente();
                }
            });
            await detector.start({ threshold: 60000 });
            detectorInactividadActivo = true;
        }
    } catch (error) { console.error(error); }
}

function iniciarTrabajo(esRecuperacion = false) {
    if (estadoActual === 'trabajando') return;
    if (Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission();

    detenerAlarmaIntermitente();
    encenderSensorVigilante();

    // ✅ Solo es "inicio fresco" si todavía no hay una sesión de trabajo en curso hoy
    // (no hay hora de inicio guardada). Si venimos de una pausa, NO es inicio fresco.
    const esInicioFresco = !horaInicioSesion;

    // ✅ Si veníamos de una pausa, sumamos ese tramo al acumulado de pausas del día
    if (estadoActual === 'pausando') {
        segundosPausaAcumulado += segundosPausaActual;
    }

    estadoActual = 'trabajando';
    clearInterval(intervaloReloj);
    segundosPausaActual = 0;
    tiempoInicioPausa = 0;

    if (!esRecuperacion) {
        if (esInicioFresco) {
            fechaEnCurso = new Date().toLocaleDateString('es-CO');
            segundosTrabajados = obtenerAcumuladoDia(fechaEnCurso);
            horaInicioSesion = obtenerHoraActual();
        }
        // ✅ Si NO es inicio fresco (venimos de una pausa), segundosTrabajados se
        // mantiene tal como estaba en memoria: no se reinicia ni se pierde aunque
        // la pausa haya cruzado la medianoche.
        inicioMatematico = Date.now() - (segundosTrabajados * 1000);
    }

    const minutesAviso = inputBloqueAviso ? (parseInt(inputBloqueAviso.value) || 60) : 60;
    ultimoTramoAvisado = Math.floor(segundosTrabajados / (minutesAviso * 60));
    actualizarInterfazEstado();

    intervaloReloj = setInterval(() => {
        // ✅ El cronómetro avanza siempre en base a la hora real (Date.now()).
        // Ya NO se corta ni se reinicia automáticamente al cruzar la medianoche:
        // el día lógico de la sesión (fechaEnCurso) permanece fijo y TODO el
        // tiempo trabajado se le sigue sumando, hasta que el usuario presione
        // "Terminar día".
        segundosTrabajados = Math.floor((Date.now() - inicioMatematico) / 1000);
        if(pantallaTiempo) pantallaTiempo.innerText = formatearTiempo(segundosTrabajados);
        actualizarInterfazEstado();

        if (minutesAviso > 0) {
            const tramoActual = Math.floor(segundosTrabajados / (minutesAviso * 60));
            if (tramoActual > ultimoTramoAvisado && segundosTrabajados > 0) {
                activarAlarma(`¡Llevas ${tramoActual * minutesAviso} min trabajando!`);
                ultimoTramoAvisado = tramoActual;
            }
        }
        guardarEstadoContinuo();
        guardarAcumuladoDia(fechaEnCurso, segundosTrabajados);
    }, 1000);
}

function pausarTrabajo() {
    if (estadoActual !== 'trabajando') return;
    clearInterval(intervaloReloj);
    estadoActual = 'pausado';
    if(pantallaEstado) {
        pantallaEstado.innerText = "⏸️ PAUSADO (INACTIVIDAD)";
        pantallaEstado.className = "estado-inactivo";
    }
    guardarEstadoContinuo();
}

// ✅ Pausa manual (antes llamada "Descansar"). Detiene el reloj de trabajo sin
// sumar a la meta diaria; se acumula aparte como tiempo en pausa.
function iniciarPausa(esRecuperacion = false) {
    if (estadoActual === 'pausando') return;
    detenerAlarmaIntermitente();
    estadoActual = 'pausando';
    if(pantallaEstado) { pantallaEstado.innerText = "PAUSANDO..."; pantallaEstado.className = "estado-pausando"; }
    clearInterval(intervaloReloj);

    // ✅ Si NO es recuperación, empezamos de cero el reloj de la pausa
    if (!esRecuperacion) {
        segundosPausaActual = 0;
        tiempoInicioPausa = Date.now();
    } else {
        // ✅ Si venimos de un F5 o de apagar el PC, calculamos los segundos reales
        // en base a la hora matemática original de inicio de pausa.
        segundosPausaActual = Math.floor((Date.now() - tiempoInicioPausa) / 1000);
    }

    limitePausa = inputPausaMin ? (parseInt(inputPausaMin.value) || 20) * 60 : 1200;

    // ✅ Averiguamos en qué tramo de alarma estamos para que suene a los 20, 40, 60...
    let ultimoTramoPausa = limitePausa > 0 ? Math.floor(segundosPausaActual / limitePausa) : 0;

    intervaloReloj = setInterval(() => {
        segundosPausaActual = Math.floor((Date.now() - tiempoInicioPausa) / 1000);
        if(pantallaTiempo) pantallaTiempo.innerText = formatearTiempo(segundosPausaActual);

        if (limitePausa > 0) {
            const tramoActual = Math.floor(segundosPausaActual / limitePausa);
            if (tramoActual > ultimoTramoPausa && segundosPausaActual > 0) {
                activarAlarma(`¡Aviso: Llevas ${tramoActual * (limitePausa / 60)} min en pausa!`);
                ultimoTramoPausa = tramoActual;
                if(pantallaEstado) pantallaEstado.innerText = `¡PAUSA EXCEDIDA (${tramoActual * (limitePausa / 60)}m)!`;
            }
        }
        guardarEstadoContinuo();
    }, 1000);
}

function detenerTodo() {
    if (segundosTrabajados === 0 && estadoActual === 'inactivo') return;
    detenerAlarmaIntermitente();
    localStorage.removeItem('sesionTrabajoTemporal');
    clearInterval(intervaloReloj);

    // ✅ Si terminamos el día mientras estábamos en pausa, sumamos ese último tramo
    if (estadoActual === 'pausando') {
        segundosPausaAcumulado += segundosPausaActual;
    }

    guardarAcumuladoDia(fechaEnCurso, segundosTrabajados);
    const meta = document.getElementById('input-meta') ? document.getElementById('input-meta').value : 8;
    const horaFin = obtenerHoraActual();

    if(typeof guardarSesionTrabajo === 'function') {
        // ✅ Se guarda usando fechaEnCurso: el día en que EMPEZÓ la sesión, aunque
        // haya terminado después de medianoche, así todas las horas quedan
        // contabilizadas en el día correcto.
        guardarSesionTrabajo(
            fechaEnCurso || new Date().toLocaleDateString('es-CO'),
            parseFloat(meta),
            segundosTrabajados,
            segundosPausaAcumulado,
            horaInicioSesion,
            horaFin
        );
    }

    segundosTrabajados = 0;
    segundosPausaActual = 0;
    segundosPausaAcumulado = 0;
    tiempoInicioPausa = 0;
    inicioMatematico = 0;
    horaInicioSesion = null;
    fechaEnCurso = "";
    estadoActual = 'inactivo';

    if(pantallaTiempo) pantallaTiempo.innerText = "00:00:00";
    if(pantallaEstado) { pantallaEstado.innerText = "SESIÓN GUARDADA"; pantallaEstado.className = "estado-inactivo"; }
    if (typeof actualizarGraficos === 'function') actualizarGraficos();
}

window.resetearAcumuladoTrabajo = function() {
    localStorage.removeItem('memoria_diaria_trabajo');
    segundosTrabajados = 0;
    segundosPausaAcumulado = 0;
    horaInicioSesion = null;
    if(estadoActual === 'inactivo' && pantallaTiempo) pantallaTiempo.innerText = "00:00:00";
}

function recuperarEstadoTemporal() {
    const guardado = localStorage.getItem('sesionTrabajoTemporal');

    if (guardado) {
        const temp = JSON.parse(guardado);

        // ✅ Ya NO se descarta el estado guardado solo por tener una fecha distinta
        // a "hoy": una sesión puede haber empezado ayer y seguir activa. El día
        // lógico de la sesión se restaura desde el propio estado guardado.
        fechaEnCurso = temp.fecha || new Date().toLocaleDateString('es-CO');

        if(document.getElementById('input-meta')) document.getElementById('input-meta').value = temp.meta || 8;
        segundosTrabajados = temp.segundosTrabajados || 0;
        segundosPausaAcumulado = temp.segundosPausaAcumulado || 0;
        inicioMatematico = temp.inicioTrabajo || 0;
        segundosPausaActual = 0;
        tiempoInicioPausa = 0;
        horaInicioSesion = temp.horaInicio || null;

        if (temp.estado === 'trabajando') {
            segundosTrabajados = Math.floor((Date.now() - inicioMatematico) / 1000);
            estadoActual = 'inactivo';
            iniciarTrabajo(true);
        } else if (temp.estado === 'pausando') {
            estadoActual = 'inactivo';
            // ✅ Recuperamos la hora matemática exacta de inicio de la pausa, así el
            // reloj persiste aunque cierres el navegador o apagues el PC.
            tiempoInicioPausa = temp.inicioPausa || (Date.now() - ((temp.segundosPausaActual || 0) * 1000));
            iniciarPausa(true);
        } else if (temp.estado === 'pausado') {
            estadoActual = 'pausado';
            if(pantallaTiempo) pantallaTiempo.innerText = formatearTiempo(segundosTrabajados);
            if(pantallaEstado) { pantallaEstado.innerText = "⏸️ PAUSADO (INACTIVIDAD)"; pantallaEstado.className = "estado-inactivo"; }
        }
    } else {
        if(pantallaTiempo) pantallaTiempo.innerText = "00:00:00";
    }
}

window.inicializarTemporizador = function() {
    pantallaTiempo = document.getElementById('tiempo-display');
    pantallaEstado = document.getElementById('estado-display');
    btnTrabajar = document.getElementById('btn-trabajar');
    btnPausar = document.getElementById('btn-pausar');
    btnDetener = document.getElementById('btn-detener');
    inputBloqueAviso = document.getElementById('input-bloque');
    inputPausaMin = document.getElementById('input-pausa');

    if (!btnTrabajar) return;

    btnTrabajar.onclick = () => iniciarTrabajo(false);
    if (btnPausar) btnPausar.onclick = () => iniciarPausa(false);
    btnDetener.onclick = detenerTodo;

    if (window.intervaloPanelUI) clearInterval(window.intervaloPanelUI);
    window.intervaloPanelUI = setInterval(actualizarPanelUI, 1000);
    actualizarPanelUI();

    recuperarEstadoTemporal();
}