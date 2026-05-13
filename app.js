// ==========================================
// ARCHIVO PRINCIPAL DE NAVEGACIÓN: app.js
// Controla el cambio de pantallas (Vistas SPA)
// ==========================================

// 1. Buscamos todos los botones del menú y todas las vistas (cajas)
const opcionesMenu = document.querySelectorAll('#menu-principal li');
const vistas = document.querySelectorAll('.vista');

// 2. Le decimos a cada botón del menú que escuche cuando le hagan 'clic'
opcionesMenu.forEach(opcion => {
    opcion.addEventListener('click', () => {
        
        // Obtenemos a qué caja quiere ir este botón (ej. "vista-trabajo")
        const targetId = opcion.getAttribute('data-target');
        
        // Si el botón aún no tiene un data-target (como Finanzas), no hacemos nada por ahora
        if (!targetId) return;

        // --- PASO A: Apagar lo anterior ---
        // Le quitamos el color azul a todos los botones del menú
        opcionesMenu.forEach(item => item.classList.remove('activo'));
        // Ocultamos todas las cajas
        vistas.forEach(vista => vista.style.display = 'none');

        // --- PASO B: Encender lo nuevo ---
        // Le ponemos el color azul al botón que acabas de tocar
        opcion.classList.add('activo');
        // Mostramos la caja que corresponde a ese botón
        document.getElementById(targetId).style.display = 'block';
    });
});