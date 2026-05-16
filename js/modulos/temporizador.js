// ==========================================
// MÓDULO DE TIEMPO DE TRABAJO: temporizador.js
// ==========================================

let segundosTrabajados = 0, segundosDescansoActual = 0;   
let intervaloReloj, estadoActual = 'inactivo'; 
let inicioMatematico = 0, tiempoInicioDescanso = 0, ultimoTramoAvisado = 0, limiteDescanso = 0; 
let detectorInactividadActivo = false; 

// NUEVO: Variable para vigilar la regla de medianoche
let fechaEnCurso = ""; 

let pantallaTiempo, pantallaEstado, btnTrabajar, btnDescansar, btnDetener, inputBloqueAviso, inputDescansoMin;

function formatearTiempo(segundosTotales) {
    const h = Math.floor(segundosTotales / 3600), m = Math.floor((segundosTotales % 3600) / 60), s = segundosTotales % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function activarAlarma(mensaje) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    playTone(880.00, now, 0.4); 
    playTone(1108.73, now + 0.15, 0.6); 

    if (Notification.permission === "granted") new Notification("⏱️ Cerebro", { body: mensaje });
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
                    activarAlarma("El reloj se ha pausado por inactividad");
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
    
    encenderSensorVigilante();
    estadoActual = 'trabajando';
    clearInterval(intervaloReloj);
    
    // Anclamos el día de inicio
    fechaEnCurso = new Date().toLocaleDateString('es-CO');
    
    if (!esRecuperacion) {
        segundosTrabajados = obtenerAcumuladoHoy();
        inicioMatematico = Date.now() - (segundosTrabajados * 1000);
    }
    
    const minutesAviso = inputBloqueAviso ? (parseInt(inputBloqueAviso.value) || 60) : 60;
    ultimoTramoAvisado = Math.floor(segundosTrabajados / (minutesAviso * 60));
    actualizarInterfazEstado();

    intervaloReloj = setInterval(() => {
        // --- 🕛 REGLA DE LA MEDIANOCHE ---
        const fechaAhora = new Date().toLocaleDateString('es-CO');
        if (fechaAhora !== fechaEnCurso) {
            // 1. Guarda el día viejo
            const meta = document.getElementById('input-meta') ? document.getElementById('input-meta').value : 8;
            if(typeof guardarSesionTrabajo === 'function') {
                guardarSesionTrabajo(fechaEnCurso, parseFloat(meta), segundosTrabajados, 0);
            }
            // 2. Resetea los contadores para el nuevo día
            inicioMatematico = Date.now();
            segundosTrabajados = 0;
            ultimoTramoAvisado = 0;
            fechaEnCurso = fechaAhora; // Actualiza el ancla
            localStorage.removeItem('memoria_diaria_trabajo');
            localStorage.removeItem('sesionTrabajoTemporal');
        }
        // ---------------------------------

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
    estadoActual = 'descansando';
    if(pantallaEstado) { pantallaEstado.innerText = "DESCANSANDO..."; pantallaEstado.className = "estado-descansando"; }
    clearInterval(intervaloReloj);
    
    if (!esRecuperacion) tiempoInicioDescanso = Date.now() - (segundosDescansoActual * 1000);
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
        segundosDescansoActual = temp.segundosDescansoActual || 0; 
        inicioMatematico = temp.inicioTrabajo || 0;
        tiempoInicioDescanso = temp.inicioDescanso || 0;

        if (temp.estado === 'trabajando') {
            segundosTrabajados = Math.floor((Date.now() - inicioMatematico) / 1000); estadoActual = 'inactivo';
            iniciarTrabajo(true);
        } else if (temp.estado === 'descansando') {
            segundosDescansoActual = Math.floor((Date.now() - tiempoInicioDescanso) / 1000); estadoActual = 'inactivo';
            iniciarDescanso(true);
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