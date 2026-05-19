// ==========================================
// CORE: app.js (El Router / Conserje)
// FIX: Backup ahora incluye registro_trabajo correctamente
// ==========================================

const menuItems = document.querySelectorAll('#menu-principal li');
const contenedorVistas = document.getElementById('contenedor-vistas');

menuItems.forEach(item => {
    item.addEventListener('click', async (e) => {
        menuItems.forEach(i => i.classList.remove('activo'));
        const elementoClickeado = e.currentTarget; 
        elementoClickeado.classList.add('activo');
        const nombreVista = elementoClickeado.getAttribute('data-target');
        await cargarVista(nombreVista);
    });
});

async function cargarVista(nombreVista) {
    if (!nombreVista) {
        contenedorVistas.innerHTML = `<div style="padding: 40px; text-align: center;"><h2>🚧 Módulo en construcción 🚧</h2></div>`;
        return;
    }

    try {
        const respuesta = await fetch(`vistas/${nombreVista}.html`);
        if (respuesta.ok) {
            const html = await respuesta.text();
            contenedorVistas.innerHTML = html; 
            
            if (nombreVista === 'trabajo') {
                setTimeout(() => {
                    if (typeof inicializarTemporizador === 'function') inicializarTemporizador();
                    if (typeof inicializarMetricas === 'function') inicializarMetricas();
                }, 50);
            } else if (nombreVista === 'clientes') {
                setTimeout(() => {
                    if (typeof inicializarClientes === 'function') inicializarClientes();
                }, 50);
            } else if  (nombreVista === 'habitos') {
                setTimeout(() => {
                    if (typeof inicializarHabitos === 'function') inicializarHabitos();
                }, 50);
            }
        } else {
            contenedorVistas.innerHTML = "<h2>Error 404: Archivo no encontrado.</h2>";
        }
    } catch (error) {
        console.error("Error al cargar la vista:", error);
    }
}

// --- FUNCIONES DE BACKUP ---
// ✅ FIX: Todo vive en 'datos_cerebro', el backup ya incluye hábitos + trabajo + todo

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
            JSON.parse(contenido); // Valida que sea JSON válido
            localStorage.setItem('datos_cerebro', contenido); // ✅ Restaura en la clave correcta
            // ✅ FIX: Limpiamos la sesión temporal para que no pise los datos recién restaurados
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

// Iniciar app
cargarVista('inicio');