// =========================================================================
// MÓDULO PROYECTOS — proyectos.js
// FASE 1: Selector de tipo + formulario de proyecto tipo Video + grid.
// FASE 2 (futura): edición avanzada, filtros.
// FASE 3 (futura): panel del proyecto + tabla de videos (sin guion).
// FASE 4 (futura): guion y extras.
// =========================================================================

let tipoProyectoSeleccionado = null; // 'video' | 'roblox' | 'app' (mientras se crea)
let idProyectoActivo = null; // 'null' = estamos en la lista; con valor = estamos en el panel

// ─── Inicialización ─────────────────────────────────────────────────────
window.inicializarProyectos = function () {
    idProyectoActivo = null;
    document.getElementById('vista-lista-proyectos').style.display = 'block';
    document.getElementById('vista-panel-proyecto').style.display  = 'none';
    renderizarListaProyectos();
};

// ─── Utilidad de avatar por iniciales (reutiliza el patrón de clientes) ──
function pr_inicialesAvatar(nombre, size = 44, fontSize = 15) {
    const iniciales = (nombre || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const colores = [ ['rgba(66,39,214,.22)','#a78bfa'], ['rgba(16,185,129,.18)','#34d399'], ['rgba(245,158,11,.18)','#fbbf24'], ['rgba(231,76,60,.15)', '#f87171'], ['rgba(59,130,246,.18)','#93c5fd'], ['rgba(236,72,153,.15)','#f9a8d4'] ];
    const idx = (nombre || '?').charCodeAt(0) % colores.length;
    const [bg, color] = colores[idx];
    return { iniciales, style: `width:${size}px;height:${size}px;font-size:${fontSize}px;background:${bg};color:${color}` };
}

// ─── PASO 1: Selector de tipo de proyecto ───────────────────────────────
window.abrirModalSelectorTipo = function () {
    document.getElementById('modal-selector-tipo').style.display = 'flex';
};

window.cerrarModalSelectorTipo = function () {
    document.getElementById('modal-selector-tipo').style.display = 'none';
};

window.seleccionarTipoProyecto = function (tipo) {
    window.cerrarModalSelectorTipo();
    tipoProyectoSeleccionado = tipo;

    if (tipo === 'video') {
        window.abrirModalProyectoVideo();
    } else {
        // Roblox / Aplicación: aún no tienen interfaz dedicada
        document.getElementById('modal-en-construccion').style.display = 'flex';
    }
};

// ─── PASO 2 (tipo Video): Formulario de creación / edición ─────────────
window.actualizarAvatarPreviewProyecto = function () {
    const url = document.getElementById('prv-foto').value.trim();
    const nombre = document.getElementById('prv-nombre').value.trim() || 'P';
    const el = document.getElementById('prv-preview-foto');
    if (el) el.src = url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&color=fff&rounded=true&bold=true`;
};

window.abrirModalProyectoVideo = function (id = null) {
    const modal = document.getElementById('modal-proyecto-video');
    document.getElementById('modal-proyecto-video-titulo').textContent = id ? 'Editar proyecto' : 'Nuevo proyecto de Video';
    document.getElementById('prv-id-edit').value = '';

    // Reset de campos
    ['prv-nombre', 'prv-foto'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('prv-monetizado').checked = false;
    document.getElementById('prv-cpm').value = 0;
    ['yt', 'tk', 'fb', 'ig'].forEach(p => {
        document.getElementById(`prv-${p}-url`).value = '';
        document.getElementById(`prv-${p}-usuario`).value = '';
        document.getElementById(`prv-${p}-seguidores`).value = 0;
        document.getElementById(`prv-${p}-fecha`).value = '';
    });

    if (id) {
        const proyecto = pr_obtenerProyecto(id);
        if (proyecto) {
            document.getElementById('prv-id-edit').value = proyecto.id;
            document.getElementById('prv-nombre').value = proyecto.nombre || '';
            document.getElementById('prv-foto').value = proyecto.imagen || '';
            document.getElementById('prv-monetizado').checked = !!proyecto.monetizado;
            document.getElementById('prv-cpm').value = proyecto.cpm || 0;

            const mapa = { yt: 'youtube', tk: 'tiktok', fb: 'facebook', ig: 'instagram' };
            Object.entries(mapa).forEach(([prefijo, clave]) => {
                const r = proyecto.redes?.[clave] || {};
                document.getElementById(`prv-${prefijo}-url`).value = r.url || '';
                document.getElementById(`prv-${prefijo}-usuario`).value = r.usuario || '';
                document.getElementById(`prv-${prefijo}-seguidores`).value = r.seguidores || 0;
                document.getElementById(`prv-${prefijo}-fecha`).value = r.fecha_creacion || '';
            });
        }
    }

    window.actualizarAvatarPreviewProyecto();
    modal.style.display = 'flex';
};

window.cerrarModalProyectoVideo = function () {
    document.getElementById('modal-proyecto-video').style.display = 'none';
};

window.guardarProyectoVideo = function () {
    const nombre = document.getElementById('prv-nombre').value.trim();
    if (!nombre) { alert('El proyecto necesita un nombre.'); return; }

    const idEdit = document.getElementById('prv-id-edit').value;
    const getRed = (p) => ({
        url: document.getElementById(`prv-${p}-url`).value.trim(),
        usuario: document.getElementById(`prv-${p}-usuario`).value.trim(),
        seguidores: parseInt(document.getElementById(`prv-${p}-seguidores`).value) || 0,
        fecha_creacion: document.getElementById(`prv-${p}-fecha`).value || ''
    });

    let proyecto = idEdit ? pr_obtenerProyecto(parseInt(idEdit)) : pr_plantillaProyecto('video');
    if (!proyecto) proyecto = pr_plantillaProyecto('video');

    proyecto.nombre = nombre;
    proyecto.imagen = document.getElementById('prv-foto').value.trim();
    proyecto.monetizado = document.getElementById('prv-monetizado').checked;
    proyecto.cpm = parseFloat(document.getElementById('prv-cpm').value) || 0;
    proyecto.redes = {
        youtube: getRed('yt'),
        tiktok: getRed('tk'),
        facebook: getRed('fb'),
        instagram: getRed('ig')
    };
    if (!proyecto.videos) proyecto.videos = [];

    pr_guardarProyecto(proyecto);
    window.cerrarModalProyectoVideo();

    if (idProyectoActivo === proyecto.id) {
        // Estamos dentro del panel de este proyecto: refrescar header + KPIs
        window.abrirProyecto(proyecto.id);
    } else {
        renderizarListaProyectos();
    }
};

window.borrarProyecto = function (id) {
    if (!confirm('¿Eliminar este proyecto? Se borrará toda su información asociada.')) return;
    pr_eliminarProyecto(id);
    renderizarListaProyectos();
};

// ─── Render: lista de proyectos (filas horizontales) ────────────────────
function renderizarListaProyectos() {
    const contenedor = document.getElementById('lista-proyectos-grid');
    if (!contenedor) return;

    const proyectos = pr_obtenerProyectos();

    if (proyectos.length === 0) {
        contenedor.innerHTML = `<div class="estado-vacio"><i class="ti ti-folder" aria-hidden="true"></i> No tienes proyectos aún. Haz clic en <strong>Nuevo proyecto</strong> para empezar.</div>`;
        return;
    }

    const iconosTipo = { video: 'ti-video', roblox: 'ti-device-gamepad-2', app: 'ti-apps' };
    const nombresTipo = { video: 'Video', roblox: 'Roblox', app: 'Aplicación' };
    const iconosRedes = { youtube: 'ti-brand-youtube', tiktok: 'ti-brand-tiktok', facebook: 'ti-brand-facebook', instagram: 'ti-brand-instagram' };

    contenedor.innerHTML = proyectos.map(p => {
        const av = pr_inicialesAvatar(p.nombre);
        const avatarHtml = p.imagen
            ? `<img src="${p.imagen}" alt="${p.nombre}" class="proyecto-row-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="proyecto-row-avatar" style="display:none;${av.style}">${av.iniciales}</div>`
            : `<div class="proyecto-row-avatar" style="${av.style}">${av.iniciales}</div>`;

        const redesActivas = p.redes ? Object.entries(p.redes).filter(([_, r]) => r.url).map(([k]) => k) : [];
        const redesHtml = Object.keys(iconosRedes).map(k =>
            `<i class="ti ${iconosRedes[k]} ${redesActivas.includes(k) ? 'activa' : ''}" title="${k}" aria-hidden="true"></i>`
        ).join('');

        const totalSeguidores = p.redes
            ? Object.values(p.redes).reduce((acc, r) => acc + (r.seguidores || 0), 0)
            : 0;

        return `
        <div class="proyecto-row" onclick="window.abrirProyecto(${p.id})">
            ${avatarHtml}
            <div style="min-width:0">
                <div class="proyecto-row-nombre">${p.nombre}</div>
                <div class="proyecto-row-tipo"><i class="ti ${iconosTipo[p.tipo] || 'ti-folder'}" aria-hidden="true"></i> ${nombresTipo[p.tipo] || p.tipo}</div>
            </div>
            <div class="proyecto-row-redes">${redesHtml}</div>
            <div class="proyecto-row-seguidores">
                <div class="proyecto-row-seguidores-num">${formatK(totalSeguidores)}</div>
                <div class="proyecto-row-seguidores-lbl">seguidores</div>
            </div>
            <div class="proyecto-row-acciones" onclick="event.stopPropagation()">
                <div class="btn-accion-mini primary" title="Ver proyecto" onclick="window.abrirProyecto(${p.id})"><i class="ti ti-eye" aria-hidden="true"></i></div>
                <div class="btn-accion-mini" title="Editar" onclick="window.abrirModalProyectoVideo(${p.id})"><i class="ti ti-pencil" aria-hidden="true"></i></div>
                <div class="btn-accion-mini danger" title="Eliminar" onclick="window.borrarProyecto(${p.id})"><i class="ti ti-trash" aria-hidden="true"></i></div>
            </div>
        </div>`;
    }).join('');
}

// Estado de filtros/orden de la tabla de videos del proyecto (independiente de Clientes)
let filtroPVTexto = '';
let filtroPVEstado = 'todos';
let ordenPVColumna = 'numero';
let ordenPVDireccion = 'asc';

// ─── Navegación: panel del proyecto ─────────────────────────────────────
window.abrirProyecto = function (id) {
    idProyectoActivo = id;
    filtroPVTexto = ''; filtroPVEstado = 'todos'; ordenPVColumna = 'numero'; ordenPVDireccion = 'asc';

    const proyecto = pr_obtenerProyecto(id);
    if (!proyecto) return;
    if (!proyecto.videos) proyecto.videos = [];

    document.getElementById('vista-lista-proyectos').style.display = 'none';
    document.getElementById('vista-panel-proyecto').style.display  = 'block';

    document.getElementById('pv-titulo-panel').textContent = proyecto.nombre;

    const redesActivas = proyecto.redes ? Object.entries(proyecto.redes).filter(([_, r]) => r.url).length : 0;
    document.getElementById('pv-panel-meta').textContent = `${redesActivas} red(es) conectada(s)`;

    const avatarEl = document.getElementById('pv-panel-avatar');
    if (avatarEl) {
        const av = pr_inicialesAvatar(proyecto.nombre, 52, 18);
        avatarEl.outerHTML = proyecto.imagen
            ? `<div id="pv-panel-avatar" class="cliente-avatar" style="width:52px;height:52px;font-size:18px;flex-shrink:0;position:relative;border-radius:50%"><img src="${proyecto.imagen}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="cliente-avatar" style="display:none;${av.style}">${av.iniciales}</div></div>`
            : `<div id="pv-panel-avatar" class="cliente-avatar" style="${av.style}">${av.iniciales}</div>`;
    }

    const inp = document.getElementById('pv-buscar-video'); if (inp) inp.value = '';
    actualizarPillsProyecto();
    renderizarKpisProyecto();
    renderizarTablaVideosProyecto();
};

window.cerrarPanelProyecto = function () {
    idProyectoActivo = null;
    document.getElementById('vista-panel-proyecto').style.display  = 'none';
    document.getElementById('vista-lista-proyectos').style.display = 'block';
    renderizarListaProyectos();
};

// Mapeo de estados de producción (Fase 4): Guion → Locución → Edición → Render → Subido
const PV_ESTADOS = ['guion', 'locucion', 'edicion', 'render', 'subido'];
const PV_LABEL_ESTADO = { guion: 'Guion', locucion: 'Locución', edicion: 'Edición', render: 'Render', subido: 'Subido' };
const PV_CLASE_ESTADO = { guion: 'bg-notion-red', locucion: 'bg-notion-purple', edicion: 'bg-notion-accent', render: 'bg-notion-yellow', subido: 'bg-notion-green' };

// ─── KPIs del panel ──────────────────────────────────────────────────────
function renderizarKpisProyecto() {
    const proyecto = pr_obtenerProyecto(idProyectoActivo);
    if (!proyecto) return;

    const videos = proyecto.videos || [];
    const pendientes = videos.filter(v => ['guion', 'locucion', 'edicion'].includes(v.estado)).length;
    const porSubir   = videos.filter(v => v.estado === 'render').length;
    const subidos    = videos.filter(v => v.estado === 'subido').length;
    const totalSeguidores = proyecto.redes
        ? Object.values(proyecto.redes).reduce((acc, r) => acc + (r.seguidores || 0), 0)
        : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('pv-kpi-total', videos.length);
    set('pv-kpi-pendientes', pendientes);
    set('pv-kpi-porsubir', porSubir);
    set('pv-kpi-subidos', subidos);
    set('pv-kpi-seguidores', formatK(totalSeguidores));
}

// ─── Filtros, orden y render de la tabla de videos ──────────────────────
window.filtrarVideosProyectoPorTexto = function (valor) { filtroPVTexto = valor.toLowerCase().trim(); renderizarTablaVideosProyecto(); };
window.filtrarVideosProyectoPorEstado = function (estado) { filtroPVEstado = estado; actualizarPillsProyecto(); renderizarTablaVideosProyecto(); };
function actualizarPillsProyecto() { ['todos', ...PV_ESTADOS].forEach(p => { const el = document.getElementById(`pv-pill-${p}`); if (el) el.classList.toggle('active', p === filtroPVEstado); }); }
window.cambiarOrdenVideosProyecto = function (col) { if (ordenPVColumna === col) { ordenPVDireccion = ordenPVDireccion === 'asc' ? 'desc' : 'asc'; } else { ordenPVColumna = col; ordenPVDireccion = 'asc'; } renderizarTablaVideosProyecto(); };
function actualizarIndicadoresOrdenProyecto() {
    ['numero', 'nombre', 'subido'].forEach(c => {
        const el = document.getElementById(`pv-sort-${c}`);
        if (el) el.textContent = c === ordenPVColumna ? (ordenPVDireccion === 'asc' ? '▲' : '▼') : '';
    });
}

// Cuenta palabras de un texto de guion (ignora espacios/saltos de línea extra)
function contarPalabras(texto) {
    if (!texto) return 0;
    const limpio = texto.trim();
    if (!limpio) return 0;
    return limpio.split(/\s+/).length;
}

// Cuenta palabras a partir de HTML con formato (negrita/cursiva/etc.), ignorando las etiquetas
function contarPalabrasHTML(html) {
    if (!html) return 0;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return contarPalabras(tmp.textContent || '');
}

function renderizarTablaVideosProyecto() {
    const cuerpo = document.getElementById('pv-tabla-videos');
    if (!cuerpo) return;
    const proyecto = pr_obtenerProyecto(idProyectoActivo);
    if (!proyecto) return;

    if (!proyecto.videos?.length) {
        cuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-lo)">Aún no hay videos. Haz clic en <strong>+ Video</strong> para empezar.</td></tr>`;
        return;
    }

    let lista = proyecto.videos.filter(v => v.nombre.toLowerCase().includes(filtroPVTexto) && (filtroPVEstado === 'todos' || v.estado === filtroPVEstado));

    if (lista.length === 0) {
        cuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-lo)">No hay videos que coincidan con el filtro.</td></tr>`;
        return;
    }

    lista.sort((a, b) => {
        let va, vb;
        if (ordenPVColumna === 'numero') { va = a.numero_video || 0; vb = b.numero_video || 0; }
        else if (ordenPVColumna === 'nombre') { va = (a.nombre || '').toLowerCase(); vb = (b.nombre || '').toLowerCase(); }
        else if (ordenPVColumna === 'subido') { va = a.fecha_subido || '9999'; vb = b.fecha_subido || '9999'; }
        else return 0;
        if (va < vb) return ordenPVDireccion === 'asc' ? -1 : 1;
        if (va > vb) return ordenPVDireccion === 'asc' ? 1 : -1; return 0;
    });

    actualizarIndicadoresOrdenProyecto();

    cuerpo.innerHTML = lista.map(v => {
        const rYT = v.redes?.youtube || {}; const rFB = v.redes?.facebook || {}; const rTK = v.redes?.tiktok || {}; const rIG = v.redes?.instagram || {};
        const totalVistas = (rYT.vistas || 0) + (rFB.vistas || 0) + (rTK.vistas || 0) + (rIG.vistas || 0);
        const totalLikes = (rYT.likes || 0) + (rFB.likes || 0) + (rTK.likes || 0) + (rIG.likes || 0);
        const statusClass = PV_CLASE_ESTADO[v.estado] || 'bg-notion-red';
        const linkDestino = v.redes?.youtube?.url || null;
        const numPalabrasGuion = contarPalabrasHTML(v.guion);

        return `
        <tr>
            <td style="text-align:center;font-weight:800;color:var(--accent);font-size:15px">${v.numero_video || 1}</td>
            <td style="font-weight:600;color:var(--text-hi)">${v.nombre}</td>
            <td style="text-align:center">
                <select class="notion-status-select ${statusClass}" onchange="window.actualizarEstadoVideoProyecto(${v.id_video}, this)">
                    ${PV_ESTADOS.map(e => `<option value="${e}" ${v.estado === e ? 'selected' : ''}>${PV_LABEL_ESTADO[e]}</option>`).join('')}
                </select>
            </td>
            <td style="font-size:12px;color:var(--text-lo)">${formatFecha(v.fecha_subido)}</td>
            <td><button class="btn-secondary" style="font-size:11px;padding:4px 10px;gap:4px" onclick="window.toggleRedesProyecto(${v.id_video})"><i class="ti ti-chart-bar" aria-hidden="true"></i> Ver</button></td>
            <td style="font-size:11px;color:var(--text-lo)">${formatFechaHora(v.ultima_edicion)}</td>
            <td>
                <div style="display:flex;gap:4px;align-items:center">
                    <button class="btn-secondary" style="font-size:11px;padding:4px 10px;gap:4px;white-space:nowrap" title="Escribir/editar guion" onclick="window.abrirModalGuionProyecto(${v.id_video})">
                        <i class="ti ti-file-text" aria-hidden="true"></i> GUION${numPalabrasGuion > 0 ? ` · ${numPalabrasGuion}p` : ''}
                    </button>
                    ${linkDestino ? `<a href="${linkDestino}" target="_blank" class="act-btn primary" title="Abrir video en YouTube" style="text-decoration:none"><i class="ti ti-external-link" aria-hidden="true"></i></a>` : `<div class="act-btn" style="opacity:.3;cursor:not-allowed" title="Sin link de YouTube configurado"><i class="ti ti-external-link" aria-hidden="true"></i></div>`}
                    <div class="act-btn primary" title="Editar" onclick="window.abrirModalNuevoVideoProyecto(${v.id_video})"><i class="ti ti-pencil" aria-hidden="true"></i></div>
                    <div class="act-btn danger" title="Eliminar" onclick="window.borrarVideoProyecto(${v.id_video})"><i class="ti ti-trash" aria-hidden="true"></i></div>
                </div>
            </td>
        </tr>
        <tr class="redes-row" id="pv-redes-vid-${v.id_video}" style="display:none">
            <td colspan="7" style="padding:0;border:none">
                <div class="redes-panel-grid">
                    <div class="redes-top-row">
                        ${[{ label: 'YouTube', color: '#ff4757', icon: 'ti-brand-youtube', r: rYT }, { label: 'Facebook', color: '#1877f2', icon: 'ti-brand-facebook', r: rFB }, { label: 'TikTok', color: 'var(--text-base)', icon: 'ti-brand-tiktok', r: rTK }, { label: 'Instagram', color: '#e1306c', icon: 'ti-brand-instagram', r: rIG }].map(({ label, color, icon, r }) => `
                        <div class="data-card"><h5 style="color:${color}"><i class="ti ${icon}" aria-hidden="true"></i> ${label}</h5><div class="data-row"><span>Vistas</span><span>${formatK(r.vistas || 0)}</span></div><div class="data-row"><span>Likes</span> <span>${formatK(r.likes || 0)}</span></div>${r.url ? `<div class="data-row"><span>URL</span><span><a href="${r.url}" target="_blank" style="color:var(--accent)">Abrir ↗</a></span></div>` : ''}${r.nota ? `<div class="data-row" style="font-style:italic;color:var(--text-lo)"><span colspan="2">${r.nota}</span></div>` : ''}</div>`).join('')}
                    </div>
                    <div class="redes-bottom-row" style="grid-template-columns:repeat(2,1fr)">
                        <div class="data-card"><h5>Alcance total</h5><div class="data-row"><span>Vistas totales</span><span>${formatK(totalVistas)}</span></div><div class="data-row"><span>Likes totales</span> <span>${formatK(totalLikes)}</span></div><div class="data-row total"><span>Engagement</span><span>${totalVistas > 0 ? ((totalLikes / totalVistas) * 100).toFixed(2) + '%' : '—'}</span></div></div>
                        <div class="data-card"><h5>Guion</h5><div class="data-row"><span>Palabras</span><span>${numPalabrasGuion}</span></div><div class="data-row"><span>Subido</span><span>${formatFecha(v.fecha_subido)}</span></div></div>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.toggleRedesProyecto = function (idVideo) { const el = document.getElementById(`pv-redes-vid-${idVideo}`); if (!el) return; el.style.display = el.style.display === 'table-row' ? 'none' : 'table-row'; };

// Actualiza el estado del video y refresca el color del <select> sin re-renderizar toda la tabla
window.actualizarEstadoVideoProyecto = function (idVideo, selectEl) {
    const nuevoEstado = selectEl.value;
    selectEl.className = 'notion-status-select ' + (PV_CLASE_ESTADO[nuevoEstado] || 'bg-notion-red');
    window.actualizarCampoTablaProyecto(idVideo, 'estado', nuevoEstado);
};

window.actualizarCampoTablaProyecto = function (idVideo, campo, valor) {
    let datos = cargarDatos();
    const proyecto = datos.proyectos.find(p => p.id === idProyectoActivo);
    if (!proyecto) return;
    const v = proyecto.videos.find(vid => vid.id_video === idVideo);
    if (!v) return;
    v[campo] = valor;
    v.ultima_edicion = new Date().toISOString();
    guardarDatos(datos);
    renderizarKpisProyecto();
};

// ─── CRUD Video del proyecto ─────────────────────────────────────────────
window.abrirModalNuevoVideoProyecto = function (idVideoEdit = null) {
    const modal = document.getElementById('modal-video-proyecto');
    document.getElementById('pv-modal-video-titulo').textContent = idVideoEdit ? 'Editar video' : 'Agregar video';
    document.getElementById('pv-id-edit').value = '';

    ['pv-nombre', 'pv-f-subido'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['pv-numero'].forEach(id => { document.getElementById(id).value = 0; });
    ['yt', 'fb', 'tk', 'ig'].forEach(p => { ['vistas', 'likes', 'url', 'nota'].forEach(campo => { const el = document.getElementById(`pv-${p}-${campo}`); if (el) el.value = ['url', 'nota'].includes(campo) ? '' : 0; }); });

    const proyecto = pr_obtenerProyecto(idProyectoActivo);
    if (!proyecto) return;

    document.getElementById('pv-numero').value = (proyecto.videos?.length || 0) + 1;
    document.getElementById('pv-estado').value = 'guion';

    if (idVideoEdit) {
        const v = proyecto.videos.find(vid => vid.id_video === idVideoEdit);
        if (v) {
            document.getElementById('pv-id-edit').value = v.id_video;
            document.getElementById('pv-numero').value = v.numero_video || 1;
            document.getElementById('pv-nombre').value = v.nombre || '';
            document.getElementById('pv-estado').value = v.estado;
            document.getElementById('pv-f-subido').value = v.fecha_subido || '';
            ['yt', 'fb', 'tk', 'ig'].forEach(p => {
                const key = p === 'yt' ? 'youtube' : p === 'fb' ? 'facebook' : p === 'tk' ? 'tiktok' : 'instagram';
                const rd = v.redes?.[key] || {};
                ['vistas', 'likes', 'url', 'nota'].forEach(campo => { const el = document.getElementById(`pv-${p}-${campo}`); if (el) el.value = rd[campo] ?? (['url', 'nota'].includes(campo) ? '' : 0); });
            });
        }
    }
    modal.style.display = 'flex';
};

window.cerrarModalVideoProyecto = function () { document.getElementById('modal-video-proyecto').style.display = 'none'; };

window.guardarVideoProyecto = function () {
    if (!idProyectoActivo) return;
    const nombre = document.getElementById('pv-nombre').value.trim();
    if (!nombre) { alert('El video necesita un título.'); return; }

    const idEdit = document.getElementById('pv-id-edit').value;
    let datos = cargarDatos();
    const proyecto = datos.proyectos.find(p => p.id === idProyectoActivo);
    if (!proyecto) return;
    if (!proyecto.videos) proyecto.videos = [];

    const getRed = (p) => ({ vistas: parseInt(document.getElementById(`pv-${p}-vistas`)?.value) || 0, likes: parseInt(document.getElementById(`pv-${p}-likes`)?.value) || 0, url: document.getElementById(`pv-${p}-url`)?.value.trim() || '', nota: document.getElementById(`pv-${p}-nota`)?.value.trim() || '' });

    const videoData = {
        numero_video: parseInt(document.getElementById('pv-numero').value) || 1,
        nombre,
        estado: document.getElementById('pv-estado').value,
        fecha_subido: document.getElementById('pv-f-subido').value,
        redes: { youtube: getRed('yt'), facebook: getRed('fb'), tiktok: getRed('tk'), instagram: getRed('ig') },
        ultima_edicion: new Date().toISOString()
    };

    if (idEdit) {
        const idx = proyecto.videos.findIndex(v => v.id_video == idEdit);
        if (idx !== -1) {
            videoData.id_video = proyecto.videos[idx].id_video;
            videoData.guion = proyecto.videos[idx].guion || ''; // preservar guion existente
            proyecto.videos[idx] = videoData;
        }
    } else {
        videoData.id_video = Date.now();
        videoData.guion = '';
        proyecto.videos.push(videoData);
    }

    guardarDatos(datos);
    window.cerrarModalVideoProyecto();
    renderizarKpisProyecto();
    renderizarTablaVideosProyecto();
};

window.borrarVideoProyecto = function (idVideo) {
    if (!confirm('¿Eliminar este video?')) return;
    let datos = cargarDatos();
    const proyecto = datos.proyectos.find(p => p.id === idProyectoActivo);
    if (!proyecto) return;
    proyecto.videos = proyecto.videos.filter(v => v.id_video !== idVideo);
    guardarDatos(datos);
    renderizarKpisProyecto();
    renderizarTablaVideosProyecto();
};

// ─── Editor de Guion (Fase 4 — hoja tipo Word con formato) ──────────────
window.abrirModalGuionProyecto = function (idVideo) {
    const proyecto = pr_obtenerProyecto(idProyectoActivo);
    if (!proyecto) return;
    const v = proyecto.videos.find(vid => vid.id_video === idVideo);
    if (!v) return;

    document.getElementById('pv-guion-id-video').value = idVideo;
    document.getElementById('pv-guion-nombre-video').textContent = v.nombre;
    document.getElementById('pv-guion-pagina').innerHTML = v.guion || '';
    window.actualizarContadorGuion();
    document.getElementById('modal-guion-proyecto').style.display = 'flex';
};

window.cerrarModalGuionProyecto = function () {
    document.getElementById('modal-guion-proyecto').style.display = 'none';
};

window.actualizarContadorGuion = function () {
    const pagina = document.getElementById('pv-guion-pagina');
    const n = contarPalabras(pagina.textContent || '');
    document.getElementById('pv-guion-contador').textContent = `${n} palabra${n === 1 ? '' : 's'}`;
};

// Aplica un comando de formato (bold/italic/underline/justifyLeft/justifyCenter) a la selección actual
window.formatoGuion = function (comando) {
    document.getElementById('pv-guion-pagina').focus();
    document.execCommand(comando, false, null);
    window.actualizarContadorGuion();
};

// Cambia el tamaño de letra de la selección (escala clásica 1-7 del navegador)
window.cambiarTamanoFuenteGuion = function (valor) {
    document.getElementById('pv-guion-pagina').focus();
    document.execCommand('fontSize', false, valor);
};

window.guardarGuionProyecto = function () {
    const idVideo = parseInt(document.getElementById('pv-guion-id-video').value);
    const html = document.getElementById('pv-guion-pagina').innerHTML;

    let datos = cargarDatos();
    const proyecto = datos.proyectos.find(p => p.id === idProyectoActivo);
    if (!proyecto) return;
    const v = proyecto.videos.find(vid => vid.id_video === idVideo);
    if (!v) return;

    v.guion = html;
    v.ultima_edicion = new Date().toISOString();
    guardarDatos(datos);

    window.cerrarModalGuionProyecto();
    renderizarTablaVideosProyecto();
};