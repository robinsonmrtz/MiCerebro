// ==========================================
// MÓDULO: planes.js — Hoja de Ruta Visual
// Sistema de diagramas de flujo interactivo
// ==========================================

(function () {
  'use strict';

  // ── CONSTANTES ──────────────────────────────────────────────
  const NODO_W = 200;
  const NODO_H = 155; // Altura ampliada para soportar 4 líneas + fecha límite
  const HANDLE_R = 6;
  const GRID = 20;

  // Posiciones de handles: [nombre, fracX, fracY]
  const HANDLE_DEFS = [
    ['tl', 0,    0   ],
    ['tc', 0.5,  0   ],
    ['tr', 1,    0   ],
    ['ml', 0,    0.5 ],
    ['mr', 1,    0.5 ],
    ['bl', 0,    1   ],
    ['bc', 0.5,  1   ],
    ['br', 1,    1   ],
  ];

  // ── ESTADO ───────────────────────────────────────────────────
  let plano = null;        // plano activo
  let planos = [];         // lista de planos

  let lienzo = null;       // SVG element
  let nodoSeleccionadoId = null;
  let portapapelesNodo = null;
  let contenedor = null;   // div wrapper

  // Interacción
  let modoCrear = false;
  let arrastrandoNodo = null;  
  let conectandoDesde = null;  
  let lineaTemporal = null;    
  let editandoNodo = null;     
  let escala = 1;
  let panX = 0, panY = 0;
  let panActivo = false;
  let panStart = null;

  // ── STORAGE ──────────────────────────────────────────────────
  function cargarPlanos() {
    let datos = cargarDatos();
    if (!datos.planes) datos.planes = [];
    planos = datos.planes;
    return planos;
  }

  function guardarPlanos() {
    let datos = cargarDatos();
    datos.planes = planos;
    guardarDatos(datos);
  }

  // ── UTILIDADES ───────────────────────────────────────────────
  function uid() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function snap(v) {
    return Math.round(v / GRID) * GRID;
  }

  function handlePos(nodo, hNombre) {
    const def = HANDLE_DEFS.find(h => h[0] === hNombre);
    return {
      x: nodo.x + def[1] * NODO_W,
      y: nodo.y + def[2] * NODO_H,
    };
  }

  function svgPoint(e) {
    const rect = lienzo.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panX) / escala,
      y: (e.clientY - rect.top  - panY) / escala,
    };
  }

  function formatFecha(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function diasRestantes(iso) {
    if (!iso) return null;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fecha = new Date(iso + 'T00:00:00');
    return Math.round((fecha - hoy) / 86400000);
  }

  function ocultarEditorFecha() {
    const overlay = document.getElementById('planes-date-editor');
    if (overlay) overlay.style.display = 'none';
  }

  function crearOverlayFecha() {
    let overlay = document.getElementById('planes-date-editor');
    if (!overlay) {
      const cont = document.getElementById('planes-canvas-wrapper');
      if (!cont) return null;
      overlay = document.createElement('div');
      overlay.id = 'planes-date-editor';
      overlay.className = 'planes-date-editor';
      overlay.style.display = 'none';
      cont.appendChild(overlay);
    }
    return overlay;
  }

  function mostrarEditorFecha(nodoId) {
    const n = plano?.nodos.find(nd => nd.id === nodoId);
    if (!n) return;

    const overlay = crearOverlayFecha();
    const cont = document.getElementById('planes-canvas-wrapper');
    if (!overlay || !cont || !lienzo) return;

    const left = n.x * escala + panX + 10;
    const top = n.y * escala + panY + (NODO_H * escala) - 70;
    const maxLeft = Math.max(8, Math.min(cont.clientWidth - 220, left));
    const maxTop = Math.max(8, Math.min(cont.clientHeight - 140, top));

    overlay.dataset.nodoId = n.id;
    overlay.style.left = `${maxLeft}px`;
    overlay.style.top = `${maxTop}px`;
    overlay.innerHTML = `
      <div class="planes-date-editor-title">Fecha límite</div>
      <input type="date" class="planes-date-editor-input" value="${n.fecha || ''}">
      <div class="planes-date-editor-actions">
        <button type="button" class="btn-primary planes-date-btn-save">Guardar</button>
        <button type="button" class="btn-ghost planes-date-btn-clear">${n.fecha ? 'Borrar' : 'Limpiar'}</button>
        <button type="button" class="btn-cancelar-modal planes-date-btn-cancel">Cerrar</button>
      </div>`;
    overlay.style.display = 'flex';

    const input = overlay.querySelector('.planes-date-editor-input');
    if (input) setTimeout(() => input.focus(), 20);

    overlay.querySelector('.planes-date-btn-save').addEventListener('click', () => {
      const target = plano?.nodos.find(nd => nd.id === overlay.dataset.nodoId);
      const valor = overlay.querySelector('.planes-date-editor-input').value;
      if (target) {
        target.fecha = valor;
        guardarPlanos();
        renderTodo();
        renderResumen();
      }
      ocultarEditorFecha();
    });

    overlay.querySelector('.planes-date-btn-clear').addEventListener('click', () => {
      const target = plano?.nodos.find(nd => nd.id === overlay.dataset.nodoId);
      if (target) {
        target.fecha = '';
        guardarPlanos();
        renderTodo();
        renderResumen();
      }
      ocultarEditorFecha();
    });

    overlay.querySelector('.planes-date-btn-cancel').addEventListener('click', ocultarEditorFecha);
    overlay.addEventListener('click', (e) => e.stopPropagation());
  }

  // ── FLECHA AUTOMÁTICA (ESTILO RECTO) ─────────────────────────
  function generarPath(x1, y1, hFrom, x2, y2, hTo) {
    // Retorna una línea completamente recta en lugar de curvas
    return `M${x1},${y1} L${x2},${y2}`;
  }

  // ── EDITOR FLOTANTE EN LÍNEA ──────────────────────────────────
  function mostrarEditorFlotante(n) {
    const editor = document.getElementById('planes-editor-flotante');
    if (!editor || !contenedor) return;

    const screenX = n.x * escala + panX;
    const screenY = n.y * escala + panY;

    // Posicionar textarea sobre el texto, respetando espacio de fecha
    editor.style.left = `${screenX + 10}px`; 
    editor.style.top = `${screenY + 30}px`; 
    editor.style.width = `${(NODO_W - 20) * escala}px`;
    editor.style.height = `${(NODO_H - 55) * escala}px`;
    editor.style.fontSize = `${12 * escala}px`;
    editor.style.display = 'block';

    const textoCompleto = (n.titulo ? n.titulo : '') + (n.descripcion ? '\n' + n.descripcion : '');
    editor.value = textoCompleto.trim();
    
    setTimeout(() => {
      editor.focus();
      editor.selectionStart = editor.selectionEnd = editor.value.length; 
    }, 10);

    editor.onblur = () => guardarEditorFlotante(n.id);
    editor.onkeydown = (e) => {
      if (e.key === 'Enter' && e.ctrlKey) editor.blur(); 
      if (e.key === 'Escape') { editor.value = textoCompleto; editor.blur(); }
    };
  }

  function guardarEditorFlotante(nodoId) {
    const editor = document.getElementById('planes-editor-flotante');
    if (!editor || editor.style.display === 'none') return;
    
    editor.style.display = 'none';
    editor.onblur = null;
    editor.onkeydown = null;

    const n = plano.nodos.find(nd => nd.id === nodoId);
    if (!n) return;

    const lineas = editor.value.trim().split('\n');
    n.titulo = lineas[0] || '';
    n.descripcion = lineas.slice(1).join('\n');

    guardarPlanos();
    renderTodo();
    renderResumen();
  }

  // ── RENDER PRINCIPAL ──────────────────────────────────────────
  function renderTodo() {
    if (!lienzo || !plano) return;
    ocultarEditorFecha();
    lienzo.innerHTML = '';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="flecha" viewBox="0 0 10 10" refX="8" refY="5"
        markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M2 1.5L8 5L2 8.5" fill="none" stroke="var(--accent)"
          stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </marker>`;
    lienzo.appendChild(defs);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${panX},${panY}) scale(${escala})`);
    lienzo.appendChild(g);

    // Conexiones (Líneas rectas)
    plano.conexiones.forEach(c => {
      const nA = plano.nodos.find(n => n.id === c.desde.nodoId);
      const nB = plano.nodos.find(n => n.id === c.hasta.nodoId);
      if (!nA || !nB) return;

      const pA = handlePos(nA, c.desde.handle);
      const pB = handlePos(nB, c.hasta.handle);
      const d  = generarPath(pA.x, pA.y, c.desde.handle, pB.x, pB.y, c.hasta.handle);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'var(--accent)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('marker-end', 'url(#flecha)');
      path.setAttribute('data-cid', c.id);
      path.style.cursor = 'pointer';
      
      path.addEventListener('dblclick', () => eliminarConexion(c.id));
      path.addEventListener('mouseover', () => path.setAttribute('stroke', 'var(--status-danger)'));
      path.addEventListener('mouseout',  () => path.setAttribute('stroke', 'var(--accent)'));
      g.appendChild(path);
    });

    plano.nodos.forEach(n => renderNodo(g, n));
  }

  function dividirTextoEnLineas(texto, maxChars, maxLines) {
    if (!texto) return [];

    const lineas = [];
    const bloques = texto.replace(/\r/g, '').split('\n');

    bloques.forEach(bloque => {
      const limpio = bloque.trim();
      if (!limpio) {
        if (lineas.length < maxLines) lineas.push('');
        return;
      }

      const palabras = limpio.split(/\s+/);
      let actual = '';

      palabras.forEach(palabra => {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (prueba.length <= maxChars) {
          actual = prueba;
        } else {
          if (actual) lineas.push(actual);
          actual = palabra;
        }
      });

      if (actual) lineas.push(actual);
    });

    return lineas.slice(0, maxLines);
  }

  function seleccionarNodo(nodoId) {
    nodoSeleccionadoId = nodoId;
    renderTodo();
  }

  function copiarNodoSeleccionado() {
    if (!plano || !nodoSeleccionadoId) return;
    const n = plano.nodos.find(nd => nd.id === nodoSeleccionadoId);
    if (!n) return;

    portapapelesNodo = {
      titulo: n.titulo || '',
      descripcion: n.descripcion || '',
      fecha: n.fecha || '',
      completado: false,
    };
  }

  function pegarNodoDesdePortapapeles() {
    if (!plano || !portapapelesNodo) return;

    const base = plano.nodos.find(nd => nd.id === nodoSeleccionadoId);
    const nuevoNodo = {
      id: uid(),
      x: snap((base ? base.x : 80) + 30),
      y: snap((base ? base.y : 80) + 30),
      titulo: portapapelesNodo.titulo,
      descripcion: portapapelesNodo.descripcion,
      fecha: portapapelesNodo.fecha,
      completado: false,
    };

    plano.nodos.push(nuevoNodo);
    guardarPlanos();
    nodoSeleccionadoId = nuevoNodo.id;
    renderTodo();
    renderResumen();
  }

  function eliminarNodoSeleccionado() {
    if (!plano || !nodoSeleccionadoId) return;
    eliminarNodo(nodoSeleccionadoId);
    nodoSeleccionadoId = null;
  }

  function renderNodo(g, n) {
    const grp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grp.setAttribute('data-nid', n.id);
    grp.style.cursor = 'move';
    const esSeleccionado = n.id === nodoSeleccionadoId;

    // Sombra/fondo
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', n.x);
    rect.setAttribute('y', n.y);
    rect.setAttribute('width', NODO_W);
    rect.setAttribute('height', NODO_H);
    rect.setAttribute('rx', '10');
    rect.setAttribute('fill', 'var(--bg-card)');
    rect.setAttribute('stroke', esSeleccionado ? 'var(--accent)' : (n.completado ? 'var(--status-ok)' : 'var(--border-card)'));
    rect.setAttribute('stroke-width', esSeleccionado || n.completado ? '2' : '1');
    grp.appendChild(rect);

    // Barra superior de color
    const barra = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    barra.setAttribute('x', n.x + 1);
    barra.setAttribute('y', n.y + 1);
    barra.setAttribute('width', NODO_W - 2);
    barra.setAttribute('height', '5');
    barra.setAttribute('rx', '9');
    barra.setAttribute('fill', n.completado ? 'var(--status-ok)' : 'var(--accent)');
    grp.appendChild(barra);

    // Checkbox completado
    const chkG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    chkG.style.cursor = 'pointer';
    chkG.addEventListener('click', (e) => { e.stopPropagation(); toggleCompletar(n.id); });

    const chkRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    chkRect.setAttribute('x', n.x + NODO_W - 24);
    chkRect.setAttribute('y', n.y + 11);
    chkRect.setAttribute('width', '16');
    chkRect.setAttribute('height', '16');
    chkRect.setAttribute('rx', '4');
    chkRect.setAttribute('fill', n.completado ? 'var(--status-ok)' : 'var(--bg-input)');
    chkRect.setAttribute('stroke', n.completado ? 'var(--status-ok)' : 'var(--border-card)');
    chkRect.setAttribute('stroke-width', '1');
    chkG.appendChild(chkRect);

    if (n.completado) {
      const check = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      check.setAttribute('d', `M${n.x+NODO_W-21} ${n.y+19} l3 3 5-6`);
      check.setAttribute('fill', 'none');
      check.setAttribute('stroke', '#fff');
      check.setAttribute('stroke-width', '1.8');
      check.setAttribute('stroke-linecap', 'round');
      check.setAttribute('stroke-linejoin', 'round');
      chkG.appendChild(check);
    }
    grp.appendChild(chkG);

    // Botón lápiz (Abre Modal de Fechas)
    const editG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    editG.style.cursor = 'pointer';
    editG.addEventListener('click', (e) => { e.stopPropagation(); abrirEditorNodo(n.id); });

    const editCirc = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    editCirc.setAttribute('x', n.x + NODO_W - 48);
    editCirc.setAttribute('y', n.y + 11);
    editCirc.setAttribute('width', '16');
    editCirc.setAttribute('height', '16');
    editCirc.setAttribute('rx', '4');
    editCirc.setAttribute('fill', 'var(--bg-input)');
    editCirc.setAttribute('stroke', 'var(--border-card)');
    editCirc.setAttribute('stroke-width', '1');
    editG.appendChild(editCirc);

    const editPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    editPath.setAttribute('d', `M${n.x+NODO_W-44} ${n.y+24} l8-8 2 2-8 8-3 1z`);
    editPath.setAttribute('fill', 'var(--text-lo)');
    editG.appendChild(editPath);
    grp.appendChild(editG);

    // Botón basura (Eliminar Nodo)
    const delG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    delG.style.cursor = 'pointer';
    delG.setAttribute('opacity', '0');
    delG.setAttribute('class', 'nodo-del-btn');
    delG.addEventListener('click', (e) => { e.stopPropagation(); eliminarNodo(n.id); });

    const delRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    delRect.setAttribute('x', n.x + 4);
    delRect.setAttribute('y', n.y + 11);
    delRect.setAttribute('width', '16');
    delRect.setAttribute('height', '16');
    delRect.setAttribute('rx', '4');
    delRect.setAttribute('fill', 'var(--bg-input)');
    delRect.setAttribute('stroke', 'var(--border-card)');
    delRect.setAttribute('stroke-width', '1');
    delG.appendChild(delRect);

    const delPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    delPath.setAttribute('d', `M${n.x+7} ${n.y+18} l10 0 M${n.x+10} ${n.y+15} l0 8 M${n.x+14} ${n.y+15} l0 8`);
    delPath.setAttribute('fill', 'none');
    delPath.setAttribute('stroke', 'var(--status-danger)');
    delPath.setAttribute('stroke-width', '1.5');
    delPath.setAttribute('stroke-linecap', 'round');
    delG.appendChild(delPath);
    grp.appendChild(delG);

    grp.addEventListener('mouseenter', () => delG.setAttribute('opacity', '1'));
    grp.addEventListener('mouseleave', () => delG.setAttribute('opacity', '0'));
    grp.addEventListener('mousedown', (e) => {
      if (e.target.closest('.handle') || e.target.closest('g[style*="cursor: pointer"]')) return;
      seleccionarNodo(n.id);
    });
    grp.addEventListener('click', (e) => {
      if (e.target.closest('.handle') || e.target.closest('g[style*="cursor: pointer"]')) return;
      seleccionarNodo(n.id);
    });

    const contenido = [n.titulo || 'Sin título', n.descripcion].filter(Boolean).join('\n');
    const lineas = dividirTextoEnLineas(contenido, 26, 4);

    lineas.forEach((linea, i) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', n.x + 12);
      t.setAttribute('y', n.y + 36 + i * 16);
      t.setAttribute('fill', n.completado ? 'var(--status-ok)' : 'var(--text-base)');
      t.setAttribute('font-size', '11');
      t.setAttribute('font-weight', '400');
      t.setAttribute('font-family', 'Inter, sans-serif');
      t.textContent = linea || ' ';
      grp.appendChild(t);
    });

    // Bloque rectangular de fecha límite (CRUD)
    const fechaBox = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    fechaBox.style.cursor = 'pointer';
    fechaBox.addEventListener('click', (e) => { e.stopPropagation(); mostrarEditorFecha(n.id); });

    const fechaRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fechaRect.setAttribute('x', n.x + 12);
    fechaRect.setAttribute('y', n.y + NODO_H - 34);
    fechaRect.setAttribute('width', NODO_W - 24);
    fechaRect.setAttribute('height', '22');
    fechaRect.setAttribute('rx', '8');
    fechaRect.setAttribute('fill', n.completado ? 'rgba(34, 197, 94, 0.16)' : n.fecha ? 'var(--bg-input)' : 'rgba(88, 130, 255, 0.12)');
    fechaRect.setAttribute('stroke', n.fecha ? 'var(--accent)' : 'var(--border-card)');
    fechaRect.setAttribute('stroke-width', '1');
    fechaBox.appendChild(fechaRect);

    const fechaText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    fechaText.setAttribute('x', n.x + 22);
    fechaText.setAttribute('y', n.y + NODO_H - 18);
    fechaText.setAttribute('fill', n.completado ? 'var(--status-ok)' : n.fecha ? 'var(--text-hi)' : 'var(--accent)');
    fechaText.setAttribute('font-size', '10');
    fechaText.setAttribute('font-weight', '600');
    fechaText.setAttribute('font-family', 'Inter, sans-serif');
    fechaText.textContent = n.fecha ? `📅 ${formatFecha(n.fecha)}` : 'Agregar fecha';
    fechaBox.appendChild(fechaText);
    grp.appendChild(fechaBox);

    // Puntos de conexión (Handles)
    HANDLE_DEFS.forEach(([hNom, fx, fy]) => {
      const hx = n.x + fx * NODO_W;
      const hy = n.y + fy * NODO_H;

      const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circ.setAttribute('cx', hx);
      circ.setAttribute('cy', hy);
      circ.setAttribute('r', HANDLE_R);
      circ.setAttribute('fill', 'var(--accent)');
      circ.setAttribute('stroke', 'var(--bg-card)');
      circ.setAttribute('stroke-width', '2');
      circ.setAttribute('opacity', '0');
      circ.setAttribute('class', 'handle');
      circ.style.cursor = 'crosshair';
      circ.setAttribute('data-nid', n.id);
      circ.setAttribute('data-handle', hNom);

      // Despegar flecha con clic sostenido
      circ.addEventListener('mousedown', (e) => { 
        e.stopPropagation(); 
        let connHasta = plano.conexiones.find(c => c.hasta.nodoId === n.id && c.hasta.handle === hNom);
        
        if (connHasta) {
          circ._holdTimer = setTimeout(() => {
            plano.conexiones = plano.conexiones.filter(c => c.id !== connHasta.id);
            const nDesde = plano.nodos.find(nd => nd.id === connHasta.desde.nodoId);
            if (nDesde) {
              const pDesde = handlePos(nDesde, connHasta.desde.handle);
              iniciarConexion(e, connHasta.desde.nodoId, connHasta.desde.handle, pDesde.x, pDesde.y);
              renderTodo(); 
            }
            circ._holdTimer = null;
          }, 200);
        } else {
          iniciarConexion(e, n.id, hNom, hx, hy); 
        }
      });

      circ.addEventListener('mouseup', (e) => { 
        e.stopPropagation(); 
        if (circ._holdTimer) { clearTimeout(circ._holdTimer); circ._holdTimer = null; }
        terminarConexion(n.id, hNom); 
      });

      circ.addEventListener('mouseenter', () => circ.setAttribute('opacity', '1'));
      circ.addEventListener('mouseleave', () => {
        if (circ._holdTimer) { clearTimeout(circ._holdTimer); circ._holdTimer = null; }
        if (!conectandoDesde || conectandoDesde.nodoId !== n.id) circ.setAttribute('opacity', '0');
      });

      grp.appendChild(circ);
    });

    // Mostrar handles al acercar mouse
    grp.addEventListener('mouseenter', () => {
      grp.querySelectorAll('.handle').forEach(h => h.setAttribute('opacity', '1'));
    });
    grp.addEventListener('mouseleave', () => {
      if (!conectandoDesde) {
        grp.querySelectorAll('.handle').forEach(h => h.setAttribute('opacity', '0'));
      }
    });

    // Drag vs Editor Flotante (Lógica Timer)
    let pressTimer = null;
    grp.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('handle') || e.target.closest('g[style*="cursor: pointer"]')) return; 
      e.preventDefault();

      pressTimer = setTimeout(() => {
        iniciarDrag(e, n.id);
        lienzo.style.cursor = 'grabbing';
        pressTimer = null; 
      }, 200); 
    });

    grp.addEventListener('mouseup', (e) => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
        mostrarEditorFlotante(n);
      }
      if (arrastrandoNodo) {
        lienzo.style.cursor = modoCrear ? 'crosshair' : 'grab';
      }
    });

    grp.addEventListener('mouseleave', () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });

    g.appendChild(grp);
  }

  function partirTexto(texto, maxChars) {
    const palabras = texto.split(' ');
    const lineas = [];
    let actual = '';
    palabras.forEach(p => {
      if ((actual + ' ' + p).trim().length <= maxChars) {
        actual = (actual + ' ' + p).trim();
      } else {
        if (actual) lineas.push(actual);
        actual = p;
      }
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  // ── DRAG DE NODOS ─────────────────────────────────────────────
  function iniciarDrag(e, nodoId) {
    if (modoCrear) return;
    const pt = svgPoint(e);
    const n = plano.nodos.find(n => n.id === nodoId);
    if (!n) return;

    const offsetX = pt.x - n.x;
    const offsetY = pt.y - n.y;
    arrastrandoNodo = { id: nodoId, offsetX, offsetY };
  }

  function onMouseMove(e) {
    if (arrastrandoNodo) {
      const pt = svgPoint(e);
      const n = plano.nodos.find(n => n.id === arrastrandoNodo.id);
      if (n) {
        n.x = snap(pt.x - arrastrandoNodo.offsetX);
        n.y = snap(pt.y - arrastrandoNodo.offsetY);
        renderTodo();
      }
    } else if (conectandoDesde && lineaTemporal) {
      const rect = lienzo.getBoundingClientRect();
      const mx = (e.clientX - rect.left - panX) / escala;
      const my = (e.clientY - rect.top  - panY) / escala;
      lineaTemporal.setAttribute('x2', mx);
      lineaTemporal.setAttribute('y2', my);
    } else if (panActivo && panStart) {
      panX += e.clientX - panStart.x;
      panY += e.clientY - panStart.y;
      panStart = { x: e.clientX, y: e.clientY };
      renderTodo();
    }
  }

  function onMouseUp() {
    if (arrastrandoNodo) {
      guardarPlanos();
      arrastrandoNodo = null;
      lienzo.style.cursor = modoCrear ? 'crosshair' : 'grab';
    }
    if (panActivo) {
      panActivo = false;
      panStart = null;
      lienzo.style.cursor = modoCrear ? 'crosshair' : 'grab';
    }
    if (conectandoDesde && lineaTemporal) {
      lineaTemporal.remove();
      lineaTemporal = null;
      conectandoDesde = null;
    }
  }

  // ── CREAR NODO ────────────────────────────────────────────────
  function onLienzoClick(e) {
    if (!modoCrear) return;
    if (e.target.closest('[data-nid]')) return;

    const pt = svgPoint(e);
    const nuevoNodo = {
      id:          uid(),
      x:           snap(pt.x - NODO_W / 2),
      y:           snap(pt.y - NODO_H / 2),
      titulo:      '',
      descripcion: '',
      fecha:       '',
      completado:  false,
    };
    plano.nodos.push(nuevoNodo);
    guardarPlanos();
    
    modoCrear = false;
    const btnCrear = document.getElementById('planes-btn-crear');
    if(btnCrear) {
        btnCrear.classList.remove('activo');
        btnCrear.textContent = '+ Agregar Paso';
    }
    lienzo.style.cursor = 'grab';

    renderTodo();
    renderResumen();
    mostrarEditorFlotante(nuevoNodo);
  }

  // ── CONEXIONES ────────────────────────────────────────────────
  function iniciarConexion(e, nodoId, handle, hx, hy) {
    e.preventDefault();
    conectandoDesde = { nodoId, handle };

    const g = lienzo.querySelector('g');
    lineaTemporal = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineaTemporal.setAttribute('x1', hx);
    lineaTemporal.setAttribute('y1', hy);
    lineaTemporal.setAttribute('x2', hx);
    lineaTemporal.setAttribute('y2', hy);
    lineaTemporal.setAttribute('stroke', 'var(--accent)');
    lineaTemporal.setAttribute('stroke-width', '2');
    lineaTemporal.setAttribute('stroke-dasharray', '6 3');
    lineaTemporal.setAttribute('marker-end', 'url(#flecha)');
    
    // Evita bloqueo del mouse
    lineaTemporal.setAttribute('pointer-events', 'none');
    lineaTemporal.style.pointerEvents = 'none';

    g.appendChild(lineaTemporal);
  }

  function terminarConexion(nodoId, handle) {
    if (!conectandoDesde) return;
    if (lineaTemporal) { lineaTemporal.remove(); lineaTemporal = null; }

    if (conectandoDesde.nodoId === nodoId && conectandoDesde.handle === handle) {
      conectandoDesde = null;
      return;
    }

    const existe = plano.conexiones.find(c =>
      c.desde.nodoId === conectandoDesde.nodoId && c.desde.handle === conectandoDesde.handle &&
      c.hasta.nodoId === nodoId && c.hasta.handle === handle
    );

    if (!existe) {
      plano.conexiones.push({
        id:    uid(),
        desde: { nodoId: conectandoDesde.nodoId, handle: conectandoDesde.handle },
        hasta: { nodoId, handle },
      });
      guardarPlanos();
    }

    conectandoDesde = null;
    renderTodo();
    renderResumen();
  }

  function eliminarConexion(cid) {
    if (!confirm('¿Eliminar esta conexión?')) return;
    plano.conexiones = plano.conexiones.filter(c => c.id !== cid);
    guardarPlanos();
    renderTodo();
  }

  function eliminarNodo(nodoId) {
    plano.nodos = plano.nodos.filter(n => n.id !== nodoId);
    plano.conexiones = plano.conexiones.filter(c =>
      c.desde.nodoId !== nodoId && c.hasta.nodoId !== nodoId
    );
    if (nodoSeleccionadoId === nodoId) nodoSeleccionadoId = null;
    guardarPlanos();
    renderTodo();
    renderResumen();
  }

  function toggleCompletar(nodoId) {
    const n = plano.nodos.find(n => n.id === nodoId);
    if (n) {
      n.completado = !n.completado;
      guardarPlanos();
      renderTodo();
      renderResumen();
    }
  }

  // ── EDITOR MODAL (PARA FECHAS Y AJUSTES MANUALES) ─────────────
  function abrirEditorNodo(nodoId) {
    editandoNodo = nodoId;
    const n = plano.nodos.find(n => n.id === nodoId);
    if (!n) return;

    const modal = document.getElementById('planes-modal-nodo');
    if (!modal) return;
    
    document.getElementById('planes-nodo-titulo').value = n.titulo || '';
    document.getElementById('planes-nodo-desc').value = n.descripcion || '';
    document.getElementById('planes-nodo-fecha').value = n.fecha || '';
    modal.classList.add('visible');
  }

  function cerrarEditorNodo() {
    const modal = document.getElementById('planes-modal-nodo');
    if (modal) modal.classList.remove('visible');
    editandoNodo = null;
  }

  function guardarEditorNodo() {
    if (!editandoNodo) return;
    const n = plano.nodos.find(n => n.id === editandoNodo);
    if (n) {
      n.titulo = document.getElementById('planes-nodo-titulo').value.trim();
      n.descripcion = document.getElementById('planes-nodo-desc').value.trim();
      n.fecha = document.getElementById('planes-nodo-fecha').value;
      guardarPlanos();
      renderTodo();
      renderResumen(); // El resumen lee la nueva fecha
    }
    cerrarEditorNodo();
  }

  // ── RESUMEN SUPERIOR ──────────────────────────────────────────
  function renderResumen() {
    const cont = document.getElementById('planes-resumen');
    if (!cont || !plano) return;

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const total = plano.nodos.length;
    const completados = plano.nodos.filter(n => n.completado).length;
    
    // Solo toma los pendientes que sí tienen fecha asignada
    const pendientes = plano.nodos.filter(n => !n.completado && n.fecha).sort((a,b) => a.fecha.localeCompare(b.fecha));
    const vencidos = pendientes.filter(n => {
      const f = new Date(n.fecha + 'T00:00:00');
      return f < hoy;
    });

    let html = `
      <div class="planes-resumen-stats">
        <div class="planes-stat">
          <span class="planes-stat-num">${total}</span>
          <span class="planes-stat-label">Pasos</span>
        </div>
        <div class="planes-stat">
          <span class="planes-stat-num" style="color:var(--status-ok)">${completados}</span>
          <span class="planes-stat-label">Completados</span>
        </div>
        <div class="planes-stat">
          <span class="planes-stat-num" style="color:var(--accent)">${total - completados}</span>
          <span class="planes-stat-label">Pendientes</span>
        </div>
        ${vencidos.length ? `<div class="planes-stat">
          <span class="planes-stat-num" style="color:var(--status-danger)">${vencidos.length}</span>
          <span class="planes-stat-label">Vencidos</span>
        </div>` : ''}
      </div>`;

    if (pendientes.length > 0) {
      html += `<div class="planes-proximos">`;
      html += `<span class="planes-proximos-label">Próximas tareas:</span>`;
      pendientes.slice(0, 5).forEach(n => {
        const dr = diasRestantes(n.fecha);
        const drText = dr < 0 ? `hace ${Math.abs(dr)}d` : dr === 0 ? 'Hoy' : `en ${dr}d`;
        const color  = dr < 0 ? 'var(--status-danger)' : dr <= 3 ? 'var(--status-warn)' : 'var(--text-lo)';
        html += `
          <div class="planes-tarea-chip" onclick="window._planesEditarNodo('${n.id}')">
            <span class="planes-chip-titulo">${n.titulo || 'Sin título'}</span>
            <span class="planes-chip-fecha" style="color:${color}">${drText}</span>
          </div>`;
      });
      html += `</div>`;
    }

    cont.innerHTML = html;
    window._planesEditarNodo = (nodoId) => abrirEditorNodo(nodoId);
  }

  // ── GESTIÓN DE PLANOS ─────────────────────────────────────────
  function crearPlano(nombre) {
    const nuevo = {
      id: uid(),
      nombre: nombre || 'Mi Hoja de Ruta',
      nodos: [],
      conexiones: [],
    };
    planos.push(nuevo);
    guardarPlanos();
    return nuevo;
  }

  function cargarPlanoActivo(id) {
    plano = planos.find(p => p.id === id) || null;
    if (!plano && planos.length > 0) plano = planos[0];
    if (!plano) plano = crearPlano('Mi primera hoja de ruta');

    panX = 0; panY = 0; escala = 1;
    renderSelectorPlanos();
    renderTodo();
    renderResumen();
  }

  function renderSelectorPlanos() {
    const sel = document.getElementById('planes-selector');
    if (!sel) return;
    sel.innerHTML = '';
    planos.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nombre;
      opt.selected = plano && plano.id === p.id;
      sel.appendChild(opt);
    });
  }

  function eliminarPlanoActual() {
    if (!plano) return;
    if (planos.length === 1) {
      alert('No puedes eliminar el único plano. Renómbralo o crea uno nuevo primero.');
      return;
    }
    if (!confirm(`¿Eliminar el plano "${plano.nombre}"? Se perderán todos sus nodos y conexiones.`)) return;
    planos = planos.filter(p => p.id !== plano.id);
    guardarPlanos();
    cargarPlanoActivo(planos[0]?.id);
  }

  // ── ZOOM & PAN ────────────────────────────────────────────────
  function onWheel(e) {
    e.preventDefault();
    if (document.activeElement === document.getElementById('planes-editor-flotante')) {
      document.activeElement.blur(); 
    }
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = lienzo.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    panX = mx - (mx - panX) * factor;
    panY = my - (my - panY) * factor;
    escala = Math.min(3, Math.max(0.2, escala * factor));
    renderTodo();
  }

  function onMiddleDown(e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      if (document.activeElement === document.getElementById('planes-editor-flotante')) {
        document.activeElement.blur(); 
      }
      panActivo = true;
      panStart = { x: e.clientX, y: e.clientY };
      lienzo.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  // ── INICIALIZAR MÓDULO ────────────────────────────────────────
  window.inicializarPlanes = function () {
    const root = document.getElementById('contenedor-vistas');
    if (!root) return;

    cargarPlanos();
    if (planos.length === 0) plano = crearPlano('Mi primera hoja de ruta');
    else plano = planos[0];

    setTimeout(() => {
      contenedor = document.getElementById('planes-canvas-wrapper');
      lienzo = document.getElementById('planes-lienzo');
      if (!lienzo) return;

      crearOverlayFecha();
      lienzo.addEventListener('click',      onLienzoClick);
      lienzo.addEventListener('mousemove',  onMouseMove);
      lienzo.addEventListener('mouseup',    onMouseUp);
      lienzo.addEventListener('wheel',      onWheel, { passive: false });
      lienzo.addEventListener('mousedown',  onMiddleDown);
      lienzo.style.cursor = 'grab';

      const btnCrear = document.getElementById('planes-btn-crear');
      if (btnCrear) {
        btnCrear.addEventListener('click', () => {
          modoCrear = !modoCrear;
          btnCrear.classList.toggle('activo', modoCrear);
          btnCrear.textContent = modoCrear ? '✕ Cancelar' : '+ Agregar Paso';
          lienzo.style.cursor = modoCrear ? 'crosshair' : 'grab';
        });
      }

      const sel = document.getElementById('planes-selector');
      if (sel) sel.addEventListener('change', () => cargarPlanoActivo(sel.value));

      const btnNuevo = document.getElementById('planes-btn-nuevo');
      if (btnNuevo) {
        btnNuevo.addEventListener('click', () => {
          const nombre = prompt('Nombre del nuevo plano:');
          if (!nombre) return;
          const p = crearPlano(nombre.trim());
          cargarPlanoActivo(p.id);
        });
      }

      const btnRen = document.getElementById('planes-btn-renombrar');
      if (btnRen) {
        btnRen.addEventListener('click', () => {
          if (!plano) return;
          const nombre = prompt('Nuevo nombre:', plano.nombre);
          if (!nombre) return;
          plano.nombre = nombre.trim();
          guardarPlanos();
          renderSelectorPlanos();
        });
      }

      const btnElim = document.getElementById('planes-btn-eliminar-plano');
      if (btnElim) btnElim.addEventListener('click', eliminarPlanoActual);

      const btnZoom = document.getElementById('planes-btn-reset-zoom');
      if (btnZoom) btnZoom.addEventListener('click', () => { panX = 0; panY = 0; escala = 1; renderTodo(); });

      const btnGuardar = document.getElementById('planes-nodo-guardar');
      if (btnGuardar) btnGuardar.addEventListener('click', guardarEditorNodo);

      const btnCancelar = document.getElementById('planes-nodo-cancelar');
      if (btnCancelar) btnCancelar.addEventListener('click', cerrarEditorNodo);

      document.addEventListener('keydown', function handler(e) {
        const esInput = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);

        if (e.key === 'Escape') {
          e.preventDefault();
          cerrarEditorNodo();
          nodoSeleccionadoId = null;
          renderTodo();
          if (modoCrear) {
            modoCrear = false;
            if (btnCrear) { btnCrear.classList.remove('activo'); btnCrear.textContent = '+ Agregar Paso'; }
            lienzo.style.cursor = 'grab';
          }
        }

        if (esInput) return;

        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          copiarNodoSeleccionado();
          return;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
          e.preventDefault();
          pegarNodoDesdePortapapeles();
          return;
        }

        const key = e.key || e.code;
        if (key === 'Delete' || key === 'Del' || key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace') {
          e.preventDefault();
          e.stopPropagation();
          eliminarNodoSeleccionado();
          return;
        }

        if (!document.getElementById('planes-lienzo')) {
          document.removeEventListener('keydown', handler);
        }
      });

      renderSelectorPlanos();
      renderTodo();
      renderResumen();
    }, 60);
  };
})();