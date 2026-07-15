// ====================================================
// RUTA DEL ARCHIVO: js/core/app.js
// ====================================================
// ====================================================
// CORE: app.js (El Router / Conserje de Vistas)
// ====================================================

const menuItems = document.querySelectorAll('#menu-principal li');
const contenedorVistas = document.getElementById('contenedor-vistas');
const VISTA_INICIAL = 'inicio';

function actualizarMenuActivo(nombreVista) {
    menuItems.forEach(item => {
        const esActivo = item.getAttribute('data-target') === nombreVista;
        item.classList.toggle('activo', esActivo);
    });

    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle) {
        const label = document.querySelector(`#menu-principal li[data-target="${nombreVista}"] span`)?.textContent;
        topbarTitle.textContent = label || (nombreVista === 'ajustes' ? 'Ajustes' : 'Inicio');
    }
}

// Manejador del menú de navegación lateral
menuItems.forEach(item => {
    item.addEventListener('click', async (e) => {
        menuItems.forEach(i => i.classList.remove('activo'));
        const elementoClickeado = e.currentTarget; 
        elementoClickeado.classList.add('activo');
        const nombreVista = elementoClickeado.getAttribute('data-target');
        await cargarVista(nombreVista);
    });
});

// Enrutador principal de la aplicación
async function cargarVista(nombreVista) {
    const vistaSolicitada = nombreVista || VISTA_INICIAL;

    if (!vistaSolicitada) {
        contenedorVistas.innerHTML = `<div style="padding: 40px; text-align: center;"><h2>🚧 Módulo en construcción 🚧</h2></div>`;
        return;
    }

    try {
        const respuesta = await fetch(`vistas/${vistaSolicitada}.html`);
        if (respuesta.ok) {
            const html = await respuesta.text();
            contenedorVistas.innerHTML = html; 
            actualizarMenuActivo(vistaSolicitada);
            
            // Inicializadores automáticos según el módulo cargado
            if (vistaSolicitada === 'trabajo') {
                setTimeout(() => {
                    if (typeof inicializarTemporizador === 'function') inicializarTemporizador();
                    if (typeof inicializarMetricas === 'function') inicializarMetricas();
                }, 50);
                
            } else if (vistaSolicitada === 'inicio') {
                setTimeout(() => {
                    if (typeof inicializarDashboard === 'function') inicializarDashboard();
                }, 50);
                
            } else if (vistaSolicitada === 'calendario') {
                setTimeout(() => {
                    if (typeof inicializarCalendario === 'function') inicializarCalendario();
                }, 50);
                
            } else if (vistaSolicitada === 'clientes') {
                setTimeout(() => {
                    if (typeof inicializarClientes === 'function') inicializarClientes();
                }, 50);
                
            } else if (vistaSolicitada === 'habitos') {
                setTimeout(() => {
                    if (typeof inicializarHabitos === 'function') inicializarHabitos();
                }, 50);
                
            } else if (vistaSolicitada === 'estadisticas-habitos') {
                setTimeout(() => {
                    if (typeof inicializarEstadisticasHabitos === 'function') inicializarEstadisticasHabitos();
                }, 50);
                
            } else if (vistaSolicitada === 'finanzas-personales') {
                setTimeout(() => {
                    if (typeof inicializarFinanzasPersonales === 'function') inicializarFinanzasPersonales();
                }, 50);
                
            } else if (vistaSolicitada === 'dopamina') {
                setTimeout(() => {
                    if (typeof inicializarDopamina === 'function') inicializarDopamina();
                }, 50);
                
            } else if (vistaSolicitada === 'planes') {
                setTimeout(() => {
                    if (typeof inicializarPlanes === 'function') inicializarPlanes();
                }, 50);
                
            } else if (vistaSolicitada === 'ajustes') {
                setTimeout(() => {
                    if (typeof inicializarAjustes === 'function') inicializarAjustes();
                }, 50);
            }
            } else if (vistaSolicitada === 'ejercicio') {
            setTimeout(() => {
                if (typeof inicializarEjercicio === 'function') inicializarEjercicio();
            }, 50);
            
        } else {
            contenedorVistas.innerHTML = "<h2>Error 404: Archivo no encontrado.</h2>";
        }
    } catch (error) {
        console.error("Error al cargar la vista:", error);
    }
}

// ==========================================
// ACCIONES INTERNAS DE LA VISTA DE AJUSTES
// ==========================================
window.confirmarBorradoModulo = function() {
    const select = document.getElementById('select-modulo-borrar');
    const statusDiv = document.getElementById('ajustes-status');
    
    if (!select || !select.value) {
        if (statusDiv) {
            statusDiv.style.color = 'var(--status-danger)';
            statusDiv.innerText = "❌ Por favor, selecciona un módulo válido de la lista.";
        }
        return;
    }
    
    const modal = document.getElementById('modal-confirmar-borrar');
    if (modal) modal.classList.add('visible');
};

window.cerrarModalBorrado = function() {
    const modal = document.getElementById('modal-confirmar-borrar');
    if (modal) modal.classList.remove('visible');
};

window.ejecutarBorradoModulo = function() {
    const select = document.getElementById('select-modulo-borrar');
    const statusDiv = document.getElementById('ajustes-status');
    if (!select || !select.value) return window.cerrarModalBorrado();

    const modulo = select.value;
    
    if (typeof reiniciarModulo === 'function' && reiniciarModulo(modulo)) {
        window.cerrarModalBorrado();
        if (statusDiv) {
            statusDiv.style.color = 'var(--status-ok)';
            statusDiv.innerText = "✅ ¡Toda la información del módulo fue eliminada correctamente!";
        }
        select.value = "";
    } else {
        window.cerrarModalBorrado();
        if (statusDiv) {
            statusDiv.style.color = 'var(--status-danger)';
            statusDiv.innerText = "❌ Error crítico: No se pudo restablecer el módulo de almacenamiento.";
        }
    }
};

// ==========================================
// SISTEMA GLOBALES DE BACKUP (JSON)
// ==========================================
window.exportarDatos = function() {
    const datos = localStorage.getItem('datos_cerebro');
    if (!datos) return alert("No hay datos para exportar.");

    const blob = new Blob([datos], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cerebro_backup_${new Date().toLocaleDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const statusDiv = document.getElementById('backup-status');
    if(statusDiv) statusDiv.innerText = "✅ ¡Copia descargada con éxito!";
};

window.importarDatos = function(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const contenido = e.target.result;
            JSON.parse(contenido); // Valida formato estructurado JSON
            localStorage.setItem('datos_cerebro', contenido);
            localStorage.removeItem('sesionTrabajoTemporal');
            localStorage.removeItem('memoria_diaria_trabajo');
            const statusDiv = document.getElementById('backup-status');
            if(statusDiv) statusDiv.innerText = "✅ Datos importados. Reiniciando...";
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            alert("Error: El archivo no es un backup válido.");
        }
    };
    lector.readAsText(archivo);
    event.target.value = '';
};

// Carga inicial por defecto de la aplicación
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => cargarVista(VISTA_INICIAL));
} else {
    cargarVista(VISTA_INICIAL);
}