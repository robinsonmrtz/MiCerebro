// ==========================================
// MÓDULO DE TIEMPO DE TRABAJO: temporizador.js
// ==========================================

let segundosTrabajados = 0; 
let segundosDescansadosTotal = 0; // <-- NUEVA VARIABLE
let segundosDescansoActual = 0;   
let intervaloReloj;         
let estadoActual = 'inactivo'; 
let tiempoInicioDescanso = 0;

const pantallaTiempo = document.getElementById('tiempo-display');
const pantallaEstado = document.getElementById('estado-display');
const btnTrabajar = document.getElementById('btn-trabajar');
const btnDescansar = document.getElementById('btn-descansar');
const btnDetener = document.getElementById('btn-detener');

function formatearTiempo(segundosTotales) {
    const horas = Math.floor(segundosTotales / 3600);
    const minutos = Math.floor((segundosTotales % 3600) / 60);
    const segundos = segundosTotales % 60;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

function iniciarTrabajo() {
    if (estadoActual === 'trabajando') return;
    
    // Si veníamos de un descanso, sumamos lo que descansamos antes de volver a trabajar
    if (estadoActual === 'descansando') {
        finalizarContadorDescanso();
    }

    estadoActual = 'trabajando';
    pantallaEstado.innerText = "TRABAJANDO...";
    pantallaEstado.className = "estado-trabajando";
    clearInterval(intervaloReloj);

    const inicioMatematico = Date.now() - (segundosTrabajados * 1000);

    intervaloReloj = setInterval(() => {
        segundosTrabajados = Math.floor((Date.now() - inicioMatematico) / 1000);
        pantallaTiempo.innerText = formatearTiempo(segundosTrabajados);
        
        localStorage.setItem('sesionTrabajoTemporal', JSON.stringify({
            segundos: segundosTrabajados,
            descanso: segundosDescansadosTotal,
            meta: document.getElementById('input-meta').value
        }));
    }, 1000);
}

function iniciarDescanso() {
    if (estadoActual === 'descansando') return;
    
    estadoActual = 'descansando';
    pantallaEstado.innerText = "DESCANSANDO...";
    pantallaEstado.className = "estado-descansando";
    clearInterval(intervaloReloj);

    tiempoInicioDescanso = Date.now();

    intervaloReloj = setInterval(() => {
        segundosDescansoActual = Math.floor((Date.now() - tiempoInicioDescanso) / 1000);
        pantallaTiempo.innerText = formatearTiempo(segundosDescansoActual);
    }, 1000);
}

function finalizarContadorDescanso() {
    segundosDescansadosTotal += segundosDescansoActual;
    segundosDescansoActual = 0;
}

function detenerTodo() {
    if (segundosTrabajados === 0) return;

    if (estadoActual === 'descansando') {
        finalizarContadorDescanso();
    }

    localStorage.removeItem('sesionTrabajoTemporal');
    clearInterval(intervaloReloj);
    
    const meta = document.getElementById('input-meta').value;
    const fechaHoy = new Date().toLocaleDateString('es-CO');
    
    // ENVIAMOS TRABAJO Y DESCANSO
    guardarSesionTrabajo(fechaHoy, parseFloat(meta), segundosTrabajados, segundosDescansadosTotal);
    
    segundosTrabajados = 0;
    segundosDescansadosTotal = 0;
    estadoActual = 'inactivo';
    pantallaTiempo.innerText = "00:00:00";
    pantallaEstado.innerText = "DÍA TERMINADO";
    pantallaEstado.className = "estado-inactivo";

    if (typeof actualizarGraficos === 'function') { actualizarGraficos(); }
}

function recuperarEstadoTemporal() {
    const guardado = localStorage.getItem('sesionTrabajoTemporal');
    if (guardado) {
        const temp = JSON.parse(guardado);
        segundosTrabajados = temp.segundos;
        segundosDescansadosTotal = temp.descanso || 0;
        document.getElementById('input-meta').value = temp.meta;
        pantallaTiempo.innerText = formatearTiempo(segundosTrabajados);
        pantallaEstado.innerText = "SESIÓN RECUPERADA";
    }
}

btnTrabajar.addEventListener('click', iniciarTrabajo);
btnDescansar.addEventListener('click', iniciarDescanso);
btnDetener.addEventListener('click', detenerTodo);
recuperarEstadoTemporal();