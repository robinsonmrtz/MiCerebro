// ==========================================
// MÓDULO DE TIEMPO DE TRABAJO: temporizador.js
// ==========================================

let segundosTrabajados = 0, segundosDescansoActual = 0;   
let intervaloReloj, estadoActual = 'inactivo'; 
let inicioMatematico = 0, tiempoInicioDescanso = 0, ultimoTramoAvisado = 0, limiteDescanso = 0; 
let detectorInactividadActivo = false; 
let fechaEnCurso = "";
let intervaloAlarmaInactividad = null;

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

// Sonido original — para avisos de bloque y descanso terminado
function activarAlarma(mensaje) {
    const ctx = obtenerAudioCtx();
    const now = ctx.currentTime;
    playTone(880.00, now, 0.4); 
    playTone(1108.73, now + 0.15, 0.6); 
    if (Notification.permission === "granted") new Notification("⏱️ Cerebro", { body: mensaje });
}

// Sonido de inactividad — igual al original
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
        segundosTrabajados, segundosDescansoActual, meta: metaInput ? metaInput.value : 8
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
    estadoActual = 'trabajando';
    clearInterval(intervaloReloj);
    // ✅ Resetea el descanso para que la próxima vez empiece desde cero
    segundosDescansoActual = 0;
    tiempoInicioDescanso = 0;
    fechaEnCurso = new Date().toLocaleDateString('es-CO');
    
    if (!esRecuperacion) {
        segundosTrabajados = obtenerAcumuladoHoy();
        inicioMatematico = Date.now() - (segundosTrabajados * 1000);
    }
    
    const minutesAviso = inputBloqueAviso ? (parseInt(inputBloqueAviso.value) || 60) : 60;
    ultimoTramoAvisado = Math.floor(segundosTrabajados / (minutesAviso * 60));
    actualizarInterfazEstado();

    intervaloReloj = setInterval(() => {
        const fechaAhora = new Date().toLocaleDateString('es-CO');
        if (fechaAhora !== fechaEnCurso) {
            const meta = document.getElementById('input-meta') ? document.getElementById('input-meta').value : 8;
            if(typeof guardarSesionTrabajo === 'function') {
                guardarSesionTrabajo(fechaEnCurso, parseFloat(meta), segundosTrabajados, 0);
            }
            inicioMatematico = Date.now();
            segundosTrabajados = 0;
            ultimoTramoAvisado = 0;
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
    
    guardarAcumuladoHoy(segundosTrabajados);
    const meta = document.getElementById('input-meta') ? document.getElementById('input-meta').value : 8;
    
    if(typeof guardarSesionTrabajo === 'function') {
        guardarSesionTrabajo(new Date().toLocaleDateString('es-CO'), parseFloat(meta), segundosTrabajados, 0);
    }
    
    segundosTrabajados = 0;
    segundosDescansoActual = 0; 
    inicioMatematico = 0; 
    tiempoInicioDescanso = 0; 
    estadoActual = 'inactivo';
    
    if(pantallaTiempo) pantallaTiempo.innerText = "00:00:00"; 
    if(pantallaEstado) { pantallaEstado.innerText = "SESIÓN GUARDADA"; pantallaEstado.className = "estado-inactivo"; }
    if (typeof actualizarGraficos === 'function') actualizarGraficos();
}

window.resetearAcumuladoTrabajo = function() {
    localStorage.removeItem('memoria_diaria_trabajo');
    segundosTrabajados = 0;
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
        inicioMatematico = temp.inicioTrabajo || 0;
        // ✅ Nunca restauramos el descanso acumulado — siempre empieza desde cero
        segundosDescansoActual = 0;
        tiempoInicioDescanso = 0;

        if (temp.estado === 'trabajando') {
            segundosTrabajados = Math.floor((Date.now() - inicioMatematico) / 1000);
            estadoActual = 'inactivo';
            iniciarTrabajo(true);
        } else if (temp.estado === 'descansando') {
            estadoActual = 'inactivo';
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

    recuperarEstadoTemporal();
}