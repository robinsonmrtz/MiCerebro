// ==========================================
// MÓDULO DE TIEMPO DE TRABAJO: temporizador.js
// ==========================================

let segundosTrabajados = 0, segundosDescansoActual = 0, segundosDescansoAcumulado = 0;   
let intervaloReloj, estadoActual = 'inactivo'; 
let inicioMatematico = 0, tiempoInicioDescanso = 0, ultimoTramoAvisado = 0, limiteDescanso = 0; 
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

let pantallaTiempo, pantallaEstado, btnTrabajar, btnDescansar, btnDetener, inputBloqueAviso, inputDescansoMin;

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
        new Notification("⏸️ Inactividad detectada", { body: "Presiona Descansar para silenciar" });
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

function obtenerAcumuladoHoy() {
    const hoy = new Date().toLocaleDateString('es-CO');
    const memo = JSON.parse(localStorage.getItem('memoria_diaria_trabajo')) || {};
    return memo.fecha === hoy ? memo.segundos : 0;
}

function guardarAcumuladoHoy(segs) {
    const hoy = new Date().toLocaleDateString('es-CO');
    localStorage.setItem('memoria_diaria_trabajo', JSON.stringify({ fecha: hoy, segundos: segs }));
}

function guardarEstadoContinuo() {
    const metaInput = document.getElementById('input-meta');
    const hoy = new Date().toLocaleDateString('es-CO');
    localStorage.setItem('sesionTrabajoTemporal', JSON.stringify({
        fecha: hoy, estado: estadoActual, inicioTrabajo: inicioMatematico, inicioDescanso: tiempoInicioDescanso,
        segundosTrabajados, segundosDescansoActual,
        segundosDescansoAcumulado, // ✅ Guardamos el acumulado para recargas de página
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
    const panelDescansado = document.getElementById('panel-descansado');
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

    // ✅ Cálculo del tiempo total descansado (Historial del día + descanso activo)
    const totalDescansoHoy = segundosDescansoAcumulado + (estadoActual === 'descansando' ? segundosDescansoActual : 0);

    // Barra de progreso
    if (fill) fill.style.width = pct + '%';
    if (barraLabel) barraLabel.textContent = `Meta: ${meta}h`;
    
    // Panel de sesión
    if (panelTrabajado) panelTrabajado.textContent = formatearTiempo(segs);
    if (panelDescansado) panelDescansado.textContent = formatearTiempo(totalDescansoHoy); // ✅ Muestra el acumulado
    if (panelMetaVal) panelMetaVal.textContent = `${meta}h 00m`;
    if (panelRestante) panelRestante.textContent = `${rh}h ${String(rm).padStart(2,'0')}m`;
    if (panelPct) panelPct.textContent = pct + '%';

    if (panelEstado) {
        let txt = 'Inactivo';
        let clase = '';
        if (estadoActual === 'trabajando') { txt = 'Trabajando'; clase = 'activo'; }
        else if (estadoActual === 'pausado') { txt = 'Pausado'; clase = 'descansando'; }
        else if (estadoActual === 'descansando') { txt = 'Descansando'; clase = 'descansando'; }
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

    // ✅ Si veníamos de descansar, sumamos ese descanso al acumulado histórico del día
    if (estadoActual === 'descansando') {
        segundosDescansoAcumulado += segundosDescansoActual;
    }

    estadoActual = 'trabajando';
    clearInterval(intervaloReloj);
    segundosDescansoActual = 0;
    tiempoInicioDescanso = 0;
    fechaEnCurso = new Date().toLocaleDateString('es-CO');
    
    if (!esRecuperacion) {
        segundosTrabajados = obtenerAcumuladoHoy();
        inicioMatematico = Date.now() - (segundosTrabajados * 1000);
        if (!horaInicioSesion) {
            horaInicioSesion = obtenerHoraActual();
        }
    }
    
    const minutesAviso = inputBloqueAviso ? (parseInt(inputBloqueAviso.value) || 60) : 60;
    ultimoTramoAvisado = Math.floor(segundosTrabajados / (minutesAviso * 60));
    actualizarInterfazEstado();

    intervaloReloj = setInterval(() => {
        const fechaAhora = new Date().toLocaleDateString('es-CO');
        if (fechaAhora !== fechaEnCurso) {
            const meta = document.getElementById('input-meta') ? document.getElementById('input-meta').value : 8;
            if(typeof guardarSesionTrabajo === 'function') {
                guardarSesionTrabajo(fechaEnCurso, parseFloat(meta), segundosTrabajados, segundosDescansoAcumulado, horaInicioSesion, obtenerHoraActual());
            }
            inicioMatematico = Date.now();
            segundosTrabajados = 0;
            segundosDescansoAcumulado = 0; // ✅ Reseteamos el descanso para el nuevo día
            ultimoTramoAvisado = 0;
            horaInicioSesion = null;
            fechaEnCurso = fechaAhora;
            localStorage.removeItem('memoria_diaria_trabajo');
            localStorage.removeItem('sesionTrabajoTemporal');
        }

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
        guardarAcumuladoHoy(segundosTrabajados); 
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

function iniciarDescanso(esRecuperacion = false) {
    if (estadoActual === 'descansando') return;
    detenerAlarmaIntermitente();
    estadoActual = 'descansando';
    if(pantallaEstado) { pantallaEstado.innerText = "DESCANSANDO..."; pantallaEstado.className = "estado-descansando"; }
    clearInterval(intervaloReloj);
    
    segundosDescansoActual = 0;
    tiempoInicioDescanso = Date.now();

    limiteDescanso = inputDescansoMin ? (parseInt(inputDescansoMin.value) || 20) * 60 : 1200;
    let alarmaSonada = false;

    intervaloReloj = setInterval(() => {
        segundosDescansoActual = Math.floor((Date.now() - tiempoInicioDescanso) / 1000);
        if(pantallaTiempo) pantallaTiempo.innerText = formatearTiempo(segundosDescansoActual);
        
        if (limiteDescanso > 0 && segundosDescansoActual >= limiteDescanso && !alarmaSonada) {
            activarAlarma("¡Tu tiempo de descanso ha terminado!"); 
            alarmaSonada = true;
            if(pantallaEstado) pantallaEstado.innerText = "¡DESCANSO TERMINADO!";
        }
        guardarEstadoContinuo();
    }, 1000);
}

function detenerTodo() {
    if (segundosTrabajados === 0 && estadoActual === 'inactivo') return;
    detenerAlarmaIntermitente();
    localStorage.removeItem('sesionTrabajoTemporal');
    clearInterval(intervaloReloj);
    
    // ✅ Si terminamos el día mientras estábamos descansando, aseguramos de sumar ese último descanso
    if (estadoActual === 'descansando') {
        segundosDescansoAcumulado += segundosDescansoActual;
    }
    
    guardarAcumuladoHoy(segundosTrabajados);
    const meta = document.getElementById('input-meta') ? document.getElementById('input-meta').value : 8;
    const horaFin = obtenerHoraActual();
    
    if(typeof guardarSesionTrabajo === 'function') {
        // ✅ Guardamos también el acumulado total en el historial final del día
        guardarSesionTrabajo(new Date().toLocaleDateString('es-CO'), parseFloat(meta), segundosTrabajados, segundosDescansoAcumulado, horaInicioSesion, horaFin);
    }
    
    segundosTrabajados = 0;
    segundosDescansoActual = 0; 
    segundosDescansoAcumulado = 0; // ✅ Se reinicia
    inicioMatematico = 0; 
    tiempoInicioDescanso = 0;
    horaInicioSesion = null;
    estadoActual = 'inactivo';
    
    if(pantallaTiempo) pantallaTiempo.innerText = "00:00:00"; 
    if(pantallaEstado) { pantallaEstado.innerText = "SESIÓN GUARDADA"; pantallaEstado.className = "estado-inactivo"; }
    if (typeof actualizarGraficos === 'function') actualizarGraficos();
}

window.resetearAcumuladoTrabajo = function() {
    localStorage.removeItem('memoria_diaria_trabajo');
    segundosTrabajados = 0;
    segundosDescansoAcumulado = 0; // ✅ También resetea descansos
    horaInicioSesion = null;
    if(estadoActual === 'inactivo' && pantallaTiempo) pantallaTiempo.innerText = "00:00:00";
}

function recuperarEstadoTemporal() {
    const guardado = localStorage.getItem('sesionTrabajoTemporal');
    const hoy = new Date().toLocaleDateString('es-CO');
    
    if (guardado) {
        const temp = JSON.parse(guardado);
        if (temp.fecha !== hoy) {
            localStorage.removeItem('sesionTrabajoTemporal');
            return;
        }
        if(document.getElementById('input-meta')) document.getElementById('input-meta').value = temp.meta || 8;
        segundosTrabajados = temp.segundosTrabajados || 0;
        segundosDescansoAcumulado = temp.segundosDescansoAcumulado || 0; // ✅ Recuperar histórico
        inicioMatematico = temp.inicioTrabajo || 0;
        segundosDescansoActual = 0;
        tiempoInicioDescanso = 0;
        horaInicioSesion = temp.horaInicio || null;

        if (temp.estado === 'trabajando') {
            segundosTrabajados = Math.floor((Date.now() - inicioMatematico) / 1000);
            estadoActual = 'inactivo';
            iniciarTrabajo(true);
        } else if (temp.estado === 'descansando') {
            estadoActual = 'inactivo';
            // ✅ Truco ninja: si el usuario refrescó la página mientras descansaba, 
            // volcamos su descanso anterior en el acumulado para que no se pierda ni un segundo en la tarjeta.
            segundosDescansoAcumulado += (temp.segundosDescansoActual || 0);
            iniciarDescanso(false);
        } else if (temp.estado === 'pausado') {
            estadoActual = 'pausado';
            if(pantallaTiempo) pantallaTiempo.innerText = formatearTiempo(segundosTrabajados);
            if(pantallaEstado) { pantallaEstado.innerText = "⏸️ PAUSADO"; pantallaEstado.className = "estado-inactivo"; }
        }
    } else {
        if(pantallaTiempo) pantallaTiempo.innerText = "00:00:00";
    }
}

window.inicializarTemporizador = function() {
    pantallaTiempo = document.getElementById('tiempo-display');
    pantallaEstado = document.getElementById('estado-display');
    btnTrabajar = document.getElementById('btn-trabajar');
    btnDescansar = document.getElementById('btn-descansar');
    btnDetener = document.getElementById('btn-detener');
    inputBloqueAviso = document.getElementById('input-bloque');
    inputDescansoMin = document.getElementById('input-descanso');

    if (!btnTrabajar) return;

    btnTrabajar.onclick = () => iniciarTrabajo(false);
    btnDescansar.onclick = () => iniciarDescanso(false);
    btnDetener.onclick = detenerTodo;

    if (window.intervaloPanelUI) clearInterval(window.intervaloPanelUI);
    window.intervaloPanelUI = setInterval(actualizarPanelUI, 1000);
    actualizarPanelUI(); 

    recuperarEstadoTemporal();
}