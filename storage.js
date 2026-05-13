// ==========================================
// ARCHIVO DE ALMACENAMIENTO: storage.js
// Aquí manejamos cómo se guardan los datos en 
// tu navegador (LocalStorage) y cómo se exportan.
// ==========================================

// Definimos la versión actual de nuestra estructura de datos.
// Si mañana agregamos "Gimnasio", cambiaremos esto a 1.1 o 2.0
const VERSION_ACTUAL = "1.0"; 

// Esta función asegura que los datos siempre tengan el formato correcto
function obtenerDatosBase() {
    return {
        version: VERSION_ACTUAL,
        finanzas: [],
        habitos: [],
        tareas: []
        // Aquí agregaremos "gimnasio: []" a futuro
    };
}

// Función para guardar datos simulados en el navegador (LocalStorage)
function guardarDatosDePrueba() {
    const misDatos = obtenerDatosBase();
    misDatos.finanzas.push({ concepto: "Sueldo", cantidad: 1000 });
    
    // Guardamos en el navegador convirtiendo el objeto a texto (JSON)
    localStorage.setItem('miCerebroData', JSON.stringify(misDatos));
    alert("Datos de prueba guardados en tu navegador.");
}

// Función para descargar tus datos en un archivo .json a tu computadora
function descargarJSON() {
    // 1. Buscamos los datos en el navegador
    const datosGuardados = localStorage.getItem('miCerebroData');
    
    if (!datosGuardados) {
        alert("No hay datos para exportar aún.");
        return;
    }

    // 2. Creamos un archivo virtual (Blob) con tus datos
    const blob = new Blob([datosGuardados], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // 3. Creamos un botón invisible y lo "hacemos clic" para descargar
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi_respaldo_cerebro.json"; // Nombre del archivo que se descargará
    a.click();
    
    // Limpiamos la memoria
    URL.revokeObjectURL(url);
}