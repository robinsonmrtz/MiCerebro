// ==========================================
// MÓDULO DE MÉTRICAS COMPLETO: metricas.js
// ==========================================

let graficoActual = null;
let paginaActual = 1;
const registrosPorPagina = 10;
let idSeleccionadoParaBorrar = null;

// Función para procesar fechas
function parsearFecha(fechaStr) {
    const partes = fechaStr.split('/');
    if(partes.length !== 3) return new Date(); 
    return new Date(partes[2], partes[1] - 1, partes[0]);
}

// Función principal que refresca TODO
function actualizarGraficos() {
    const datos = cargarDatos();
    const registrosTotales = datos.registro_trabajo || [];

    if (registrosTotales.length === 0) {
        document.getElementById('tabla-cuerpo').innerHTML = '<tr><td colspan="6">No hay registros aún.</td></tr>';
        return;
    }

    actualizarKPIs(registrosTotales);
    renderizarTabla(registrosTotales);
    dibujarGrafica(registrosTotales);
}

// 1. DIBUJAR LA GRÁFICA (Líneas)
function dibujarGrafica(registros) {
    const ctx = document.getElementById('graficoTrabajo').getContext('2d');
    if(graficoActual) graficoActual.destroy();

    // Filtramos solo los últimos 7 para no saturar la gráfica
    const ultimos7 = registros.slice(-7);

    graficoActual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ultimos7.map(r => r.fecha),
            datasets: [
                {
                    label: 'Horas Trabajadas',
                    data: ultimos7.map(r => (r.trabajado / 3600).toFixed(2)),
                    borderColor: '#1A73E8',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Meta',
                    data: ultimos7.map(r => r.meta),
                    borderColor: '#2ECC71',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// 2. RENDERIZAR TABLA CON PAGINACIÓN
function renderizarTabla(registros) {
    const tablaCuerpo = document.getElementById('tabla-cuerpo');
    const registrosOrdenados = [...registros].reverse();
    
    const totalPaginas = Math.ceil(registrosOrdenados.length / registrosPorPagina) || 1;
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const visibles = registrosOrdenados.slice(inicio, inicio + registrosPorPagina);

    tablaCuerpo.innerHTML = '';
    visibles.forEach(reg => {
        const hTrabajo = (reg.trabajado / 3600).toFixed(2);
        const hDescanso = (reg.descansado / 3600 || 0).toFixed(2); // Evita error si es 0
        const cumplio = parseFloat(hTrabajo) >= reg.meta;

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td style="font-weight: 600;">${reg.fecha}</td>
            <td>${reg.meta}h</td>
            <td style="color: #1A73E8; font-weight: bold;">${hTrabajo}h</td>
            <td style="color: #F39C12;">${hDescanso}h</td>
            <td>${cumplio ? '<span class="badge-exito">SÍ</span>' : '<span class="badge-fallo">NO</span>'}</td>
            <td><button class="btn-borrar" onclick="preguntarBorrar(${reg.id})">🗑️ Borrar</button></td>
        `;
        tablaCuerpo.appendChild(fila);
    });
    document.getElementById('info-paginacion').innerText = `Página ${paginaActual} de ${totalPaginas}`;
}

// 3. ACTUALIZAR TARJETAS (KPIs)
function actualizarKPIs(registros) {
    const totalSegundos = registros.reduce((sum, reg) => sum + reg.trabajado, 0);
    const promedio = (totalSegundos / registros.length) / 3600;
    document.getElementById('kpi-promedio').innerText = `${promedio.toFixed(1)} hrs`;

    // Cálculo de racha
    let racha = 0;
    for (let i = registros.length - 1; i >= 0; i--) {
        if ((registros[i].trabajado / 3600) >= registros[i].meta) racha++;
        else break;
    }
    document.getElementById('kpi-racha').innerText = `${racha} días`;
}

// MODAL Y PAGINACIÓN
window.preguntarBorrar = function(id) {
    idSeleccionadoParaBorrar = id;
    document.getElementById('modal-confirmar').style.display = 'flex';
}

document.getElementById('confirmar-si').onclick = () => {
    borrarRegistroTrabajo(idSeleccionadoParaBorrar);
    document.getElementById('modal-confirmar').style.display = 'none';
    actualizarGraficos();
};

document.getElementById('confirmar-no').onclick = () => {
    document.getElementById('modal-confirmar').style.display = 'none';
};

document.getElementById('btn-anterior').onclick = () => {
    if (paginaActual > 1) { paginaActual--; actualizarGraficos(); }
};
document.getElementById('btn-siguiente').onclick = () => {
    const datos = cargarDatos();
    const totalPaginas = Math.ceil(datos.registro_trabajo.length / registrosPorPagina);
    if (paginaActual < totalPaginas) { paginaActual++; actualizarGraficos(); }
};

// Carga inicial
document.addEventListener('DOMContentLoaded', actualizarGraficos);