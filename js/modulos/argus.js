// ====================================================
// ARGUS — Asistente IA · MiCerebro
// Diseño: chat minimalista, oscuro, sin ruido visual
// ====================================================

(function () {
  'use strict';

  const GEMINI_KEY = 'AQ.Ab8RN6K3dfE1jEwB2xfl4WNHMuFXy6jgUqpnNqLV-P5Z8V7hBw';
  const BASE_URL   = `https://generativelanguage.googleapis.com/v1beta/models`;

  // Modelos en orden de preferencia — Gemini 3 (API actual, junio 2026)
  // Si uno falla por cuota, intenta el siguiente automáticamente
  const MODELOS = [
    'gemini-3.1-flash-lite',   // más liviano, cuota más generosa, estable
    'gemini-3.5-flash',        // más capaz, estable
    'gemini-3-flash-preview',  // preview, buen fallback
    'gemini-2.0-flash',        // generación anterior por si acaso
  ];

  let modeloActual = 0; // índice del modelo en uso
  const MAX_HISTORY = 20;

  let historial = [];
  let pensando  = false;

  // ── PALETA ─────────────────────────────────────────────────────────
  // Base: #0a0a0f (fondo) · #111118 (panel) · #1a1a24 (inputs/burbujas)
  // Acento: #5b7fa6 (azul pizarra, apagado) — un solo acento, nada más
  // Texto: #e2e2e2 hi · #8a8a9a lo
  // Sin borders brillantes, sin glows, sin gradientes saturados

  const css = `
    /* ── FAB ───────────────────────────────────────────────────── */
    #argus-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #111118;
      border: 1px solid #2a2a38;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: border-color 0.2s, background 0.2s;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    #argus-fab:hover {
      background: #1a1a24;
      border-color: #5b7fa6;
    }
    #argus-fab svg {
      width: 20px;
      height: 20px;
      color: #8a8a9a;
      transition: color 0.2s;
    }
    #argus-fab:hover svg { color: #a0b8cc; }

    /* Punto de estado online */
    #argus-fab .argus-dot {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4a9a6a;
      box-shadow: 0 0 0 0 rgba(74,154,106,0.4);
      animation: argus-ping 2.4s ease-in-out infinite;
    }
    @keyframes argus-ping {
      0%   { box-shadow: 0 0 0 0 rgba(74,154,106,0.4); }
      60%  { box-shadow: 0 0 0 5px rgba(74,154,106,0); }
      100% { box-shadow: 0 0 0 0 rgba(74,154,106,0); }
    }

    /* ── PANEL ─────────────────────────────────────────────────── */
    #argus-panel {
      position: fixed;
      bottom: 80px;
      right: 24px;
      width: 360px;
      max-width: calc(100vw - 32px);
      height: 540px;
      max-height: calc(100vh - 100px);
      background: #111118;
      border: 1px solid #1e1e2a;
      border-radius: 16px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      z-index: 10000;
      overflow: hidden;
      opacity: 0;
      transform: translateY(12px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    #argus-panel.argus-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    /* ── HEADER ────────────────────────────────────────────────── */
    .argus-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid #1e1e2a;
      flex-shrink: 0;
    }

    /* Avatar texto */
    .argus-avatar {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: #1a1a24;
      border: 1px solid #2a2a38;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
      line-height: 1;
    }
    .argus-avatar.thinking {
      animation: argus-think-pulse 0.9s ease-in-out infinite alternate;
    }
    @keyframes argus-think-pulse {
      from { border-color: #2a2a38; }
      to   { border-color: #5b7fa6; }
    }

    .argus-header-info { flex: 1; min-width: 0; }
    .argus-name {
      font-size: 13px;
      font-weight: 600;
      color: #e2e2e2;
      letter-spacing: 0.02em;
    }
    .argus-status {
      font-size: 11px;
      color: #4a9a6a;
      margin-top: 1px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .argus-status::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
    .argus-status.thinking-status { color: #8a8a9a; }

    .argus-header-btns { display: flex; gap: 4px; }
    .argus-icon-btn {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: #4a4a5a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .argus-icon-btn:hover { background: #1a1a24; color: #8a8a9a; }
    .argus-icon-btn svg { width: 14px; height: 14px; }

    /* ── KPI STRIP ─────────────────────────────────────────────── */
    .argus-kpi-strip {
      display: flex;
      border-bottom: 1px solid #1a1a24;
      flex-shrink: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .argus-kpi-strip::-webkit-scrollbar { display: none; }

    .argus-kpi {
      flex: 1;
      min-width: 72px;
      padding: 8px 10px;
      border-right: 1px solid #1a1a24;
      text-align: center;
    }
    .argus-kpi:last-child { border-right: none; }
    .argus-kpi-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #3a3a4a;
      margin-bottom: 3px;
    }
    .argus-kpi-value {
      font-size: 12px;
      font-weight: 600;
      color: #6a6a7a;
      font-variant-numeric: tabular-nums;
    }
    .argus-kpi-value.ok   { color: #4a9a6a; }
    .argus-kpi-value.warn { color: #9a8a4a; }
    .argus-kpi-value.bad  { color: #9a4a4a; }

    /* ── MENSAJES ──────────────────────────────────────────────── */
    .argus-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: #1e1e2a transparent;
    }
    .argus-messages::-webkit-scrollbar { width: 3px; }
    .argus-messages::-webkit-scrollbar-track { background: transparent; }
    .argus-messages::-webkit-scrollbar-thumb { background: #2a2a38; border-radius: 2px; }

    /* Burbujas */
    .argus-bubble {
      max-width: 85%;
      font-size: 13px;
      line-height: 1.6;
      animation: argus-in 0.18s ease;
      word-break: break-word;
    }
    @keyframes argus-in {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Usuario: alineado derecha, fondo sutil */
    .argus-bubble.user {
      align-self: flex-end;
      background: #1a1a24;
      border: 1px solid #2a2a38;
      border-radius: 12px 12px 3px 12px;
      padding: 9px 13px;
      color: #c8c8d8;
    }

    /* Argus: sin burbuja, texto libre con nombre */
    .argus-bubble.model {
      align-self: flex-start;
      color: #b8b8c8;
      padding: 0;
      max-width: 92%;
    }
    .argus-bubble-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: #3a3a4a;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .argus-bubble-text {
      color: #b8b8c8;
      line-height: 1.65;
    }
    .argus-bubble-text p  { margin: 0 0 6px; }
    .argus-bubble-text p:last-child { margin: 0; }
    .argus-bubble-text strong { color: #d8d8e8; font-weight: 600; }
    .argus-bubble-text code {
      background: #1a1a24;
      border: 1px solid #2a2a38;
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 11.5px;
      color: #8aabcc;
      font-family: 'Share Tech Mono', 'Courier New', monospace;
    }
    .argus-bubble-text em { color: #9a9aaa; font-style: normal; }

    /* Typing indicator */
    .argus-typing {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 0;
    }
    .argus-typing-label {
      font-size: 10px;
      color: #3a3a4a;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-right: 4px;
    }
    .argus-typing span {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #3a3a4a;
      animation: argus-dot 1.1s ease-in-out infinite;
    }
    .argus-typing span:nth-child(2) { animation-delay: 0.18s; }
    .argus-typing span:nth-child(3) { animation-delay: 0.36s; }
    @keyframes argus-dot {
      0%,80%,100% { transform: scale(0.7); opacity: 0.4; }
      40%         { transform: scale(1.1); opacity: 1; }
    }

    /* ── CHIPS ─────────────────────────────────────────────────── */
    .argus-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      padding: 8px 14px 6px;
      flex-shrink: 0;
    }
    .argus-chip {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      border: 1px solid #2a2a38;
      background: #111118;
      color: #5a5a6a;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
      white-space: nowrap;
    }
    .argus-chip:hover {
      border-color: #3a3a4a;
      color: #9a9aaa;
      background: #1a1a24;
    }

    /* Estado vacío */
    .argus-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
      gap: 8px;
    }
    .argus-empty-icon {
      font-size: 28px;
      opacity: 0.2;
      margin-bottom: 4px;
    }
    .argus-empty h3 {
      font-size: 13px;
      font-weight: 600;
      color: #3a3a4a;
    }
    .argus-empty p {
      font-size: 12px;
      color: #2a2a38;
      line-height: 1.6;
      max-width: 230px;
    }

    /* ── INPUT ─────────────────────────────────────────────────── */
    .argus-input-wrap {
      padding: 10px 12px 13px;
      border-top: 1px solid #1a1a24;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex-shrink: 0;
    }
    #argus-textarea {
      flex: 1;
      resize: none;
      min-height: 36px;
      max-height: 100px;
      background: #0e0e15;
      border: 1px solid #1e1e2a;
      border-radius: 9px;
      color: #c8c8d8;
      font-size: 13px;
      font-family: 'Inter', -apple-system, sans-serif;
      padding: 8px 11px;
      outline: none;
      line-height: 1.5;
      transition: border-color 0.2s;
      scrollbar-width: none;
    }
    #argus-textarea:focus { border-color: #2e2e3e; }
    #argus-textarea::placeholder { color: #2e2e3e; }

    #argus-send {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: none;
      background: #1a1a24;
      color: #4a4a5a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    #argus-send:hover:not(:disabled) { background: #5b7fa6; color: #fff; }
    #argus-send:disabled { opacity: 0.3; cursor: not-allowed; }
    #argus-send svg { width: 15px; height: 15px; }

    /* ── RESPONSIVE ────────────────────────────────────────────── */
    @media (max-width: 480px) {
      #argus-panel {
        right: 0;
        bottom: 0;
        width: 100vw;
        max-width: 100vw;
        height: 70vh;
        max-height: 70vh;
        border-radius: 16px 16px 0 0;
        border-bottom: none;
      }
      #argus-fab { bottom: 16px; right: 16px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── HTML ────────────────────────────────────────────────────────────
  const html = `
    <button id="argus-fab" title="Argus">
      <div class="argus-dot"></div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" opacity=".3"/>
        <path d="M12 5v2M12 17v2M5 12H3M21 12h-2M6.34 6.34l1.42 1.42M16.24 16.24l1.42 1.42M6.34 17.66l1.42-1.42M16.24 7.76l1.42-1.42"/>
      </svg>
    </button>

    <div id="argus-panel" role="dialog" aria-label="Argus">
      <!-- Header -->
      <div class="argus-header">
        <div class="argus-avatar" id="argus-avatar">👁</div>
        <div class="argus-header-info">
          <div class="argus-name">Argus</div>
          <div class="argus-status" id="argus-status">en línea</div>
        </div>
        <div class="argus-header-btns">
          <button class="argus-icon-btn" id="argus-clear" title="Limpiar chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
          <button class="argus-icon-btn" id="argus-close" title="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="argus-kpi-strip" id="argus-kpis"></div>

      <!-- Mensajes -->
      <div class="argus-messages" id="argus-messages">
        <div class="argus-empty" id="argus-empty">
          <div class="argus-empty-icon">👁</div>
          <h3>Argus disponible</h3>
          <p>Tengo acceso a todos tus datos. Pregúntame lo que necesites.</p>
        </div>
      </div>

      <!-- Chips -->
      <div class="argus-chips" id="argus-chips">
        <button class="argus-chip" data-msg="Analiza mi situación financiera y dame 3 acciones concretas.">Finanzas</button>
        <button class="argus-chip" data-msg="Cómo van mis hábitos esta semana, qué estoy fallando y por qué.">Hábitos</button>
        <button class="argus-chip" data-msg="Diagnóstico de mi productividad laboral esta semana.">Productividad</button>
        <button class="argus-chip" data-msg="Detecta patrones de conducta compulsiva en mis datos.">Conducta</button>
        <button class="argus-chip" data-msg="Plan de acción para esta semana con lo que tienes de mí.">Plan semanal</button>
      </div>

      <!-- Input -->
      <div class="argus-input-wrap">
        <textarea id="argus-textarea" placeholder="Escribe algo..." rows="1"></textarea>
        <button id="argus-send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  // ── REFS ────────────────────────────────────────────────────────────
  const fab      = document.getElementById('argus-fab');
  const panel    = document.getElementById('argus-panel');
  const closeBtn = document.getElementById('argus-close');
  const clearBtn = document.getElementById('argus-clear');
  const messages = document.getElementById('argus-messages');
  const textarea = document.getElementById('argus-textarea');
  const sendBtn  = document.getElementById('argus-send');
  const kpisEl   = document.getElementById('argus-kpis');
  const avatar   = document.getElementById('argus-avatar');
  const statusEl = document.getElementById('argus-status');
  const emptyEl  = document.getElementById('argus-empty');
  const chipsEl  = document.getElementById('argus-chips');

  // ── PANEL TOGGLE ────────────────────────────────────────────────────
  function abrir() {
    panel.classList.add('argus-open');
    actualizarKPIs();
    setTimeout(() => textarea.focus(), 200);
  }
  function cerrar() { panel.classList.remove('argus-open'); }

  fab.addEventListener('click', () => panel.classList.contains('argus-open') ? cerrar() : abrir());
  closeBtn.addEventListener('click', cerrar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

  // ── UTILS ───────────────────────────────────────────────────────────
  function fmtCOP(n) {
    if (typeof n !== 'number') return '–';
    if (Math.abs(n) >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)     return `$${(n/1_000).toFixed(0)}K`;
    return `$${n}`;
  }
  function fmtH(seg) {
    if (!seg && seg !== 0) return '–';
    const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60);
    return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
  }
  function leerDatos() {
    try { return JSON.parse(localStorage.getItem('datos_cerebro') || 'null'); }
    catch { return null; }
  }

  // ── KPI STRIP ───────────────────────────────────────────────────────
  function actualizarKPIs() {
    const datos = leerDatos();
    if (!datos) {
      kpisEl.innerHTML = `<div class="argus-kpi"><div class="argus-kpi-label">Estado</div><div class="argus-kpi-value">Sin datos</div></div>`;
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.slice(0, 7);

    // Trabajo hoy
    const tw = (datos.registro_trabajo || []).find(r => r.fecha === hoy);
    const trabSeg = tw?.trabajado || 0;
    const metaSeg = tw?.meta || 0;
    const pctTrab = metaSeg > 0 ? Math.round((trabSeg / metaSeg) * 100) : null;

    // Hábitos hoy
    const habs = datos.habitos || [];
    const regH = (datos.registro_habitos || {})[hoy] || {};
    const habCumplidos = habs.filter(h => (regH[h.id] || 0) >= (h.meta || 1)).length;

    // Finanzas
    const fz = datos.finanzas_personales || {};
    const cuentas = (fz.cuentas || []).filter(c => !c.archivada);
    const txs = (fz.transacciones || []).filter(t => !t.archivada && (t.fecha || '').startsWith(mesActual));
    const gastos   = txs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + (t.monto || 0), 0);
    const balance  = cuentas.reduce((s, c) => s + (c.saldo_actual ?? c.saldo_inicial ?? 0), 0);

    const kpis = [
      { label: 'Trabajo', value: pctTrab !== null ? `${pctTrab}%` : fmtH(trabSeg), cls: pctTrab !== null ? (pctTrab >= 80 ? 'ok' : pctTrab >= 40 ? 'warn' : 'bad') : '' },
      { label: 'Hábitos', value: habs.length ? `${habCumplidos}/${habs.length}` : '–', cls: habs.length ? (habCumplidos === habs.length ? 'ok' : habCumplidos > 0 ? 'warn' : 'bad') : '' },
      { label: 'Balance', value: cuentas.length ? fmtCOP(balance) : '–', cls: balance >= 0 ? 'ok' : 'bad' },
      { label: 'Gastos', value: gastos > 0 ? fmtCOP(gastos) : '–', cls: '' },
    ];

    kpisEl.innerHTML = kpis.map(k =>
      `<div class="argus-kpi"><div class="argus-kpi-label">${k.label}</div><div class="argus-kpi-value ${k.cls}">${k.value}</div></div>`
    ).join('');
  }

  // ── CONTEXTO PARA GEMINI ────────────────────────────────────────────
  function construirContexto() {
    const datos = leerDatos();
    const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let ctx = `Eres ARGUS, el asistente personal de inteligencia de Robinson. Eres simultáneamente su:\n`;
    ctx += `- Estratega financiero: analizas cuentas, flujo, gastos, deudas, tendencias con rigor.\n`;
    ctx += `- Coach de productividad y hábitos: revisas métricas reales, celebras consistencia, señalas quiebres sin suavizarlos.\n`;
    ctx += `- Psiquiatra especializado en conductas compulsivas y financieras: detectas patrones automáticos, compulsiones de gasto, evitación, sabotaje. Usas lenguaje claro y directo.\n\n`;
    ctx += `Personalidad: directo, conciso, sin rodeos. Estilo JARVIS — inteligente, eficiente, siempre del lado de Robinson. Si algo está mal, lo dices. Sin suavizar, sin dramatizar.\n\n`;
    ctx += `Reglas: respuestas concisas (máximo 4 párrafos salvo que pidan análisis largo). Usa datos concretos del contexto — nunca inventes cifras. Habla en español, tuteo.\n\n`;
    ctx += `Fecha: ${hoy}\n\n`;
    ctx += `═══════════════════════ DATOS ACTUALES ═══════════════════════\n\n`;

    if (!datos) { ctx += `SIN DATOS: localStorage vacío.\n`; return ctx; }

    // TRABAJO
    ctx += `[TRABAJO]\n`;
    const regT = datos.registro_trabajo || [];
    if (!regT.length) { ctx += `Sin registros.\n`; }
    else {
      regT.slice(-21).forEach(r => {
        const th = (r.trabajado || 0) / 3600, mh = (r.meta || 0) / 3600;
        const pct = mh > 0 ? Math.round((th / mh) * 100) : '–';
        ctx += `  ${r.fecha}: ${th.toFixed(1)}h trabajado / ${mh.toFixed(1)}h meta → ${pct}%`;
        if (r.pausado > 0) ctx += ` (pausado ${(r.pausado/3600).toFixed(1)}h)`;
        ctx += `\n`;
      });
      const prom = (regT.reduce((s, r) => s + (r.trabajado || 0), 0) / 3600 / regT.length).toFixed(1);
      ctx += `  Promedio diario: ${prom}h | Total registros: ${regT.length}\n`;
    }

    // HÁBITOS
    ctx += `\n[HÁBITOS]\n`;
    const habs = datos.habitos || [];
    const regH = datos.registro_habitos || {};
    if (!habs.length) { ctx += `Sin hábitos.\n`; }
    else {
      habs.forEach(h => { ctx += `  · "${h.nombre}" meta:${h.meta||1} ${h.unidad||'veces'}/día\n`; });
      ctx += `  Progreso 14 días:\n`;
      Array.from({length:14}, (_,i) => { const d = new Date(); d.setDate(d.getDate()-13+i); return d.toISOString().split('T')[0]; })
        .forEach(f => {
          const rd = regH[f] || {};
          const c = habs.filter(h => (rd[h.id]||0) >= (h.meta||1)).length;
          const det = habs.map(h => `${h.nombre.slice(0,12)}:${rd[h.id]||0}/${h.meta||1}`).join(' ');
          ctx += `  ${f}: ${c}/${habs.length} [${det}]\n`;
        });
    }

    // FINANZAS
    ctx += `\n[FINANZAS]\n`;
    const fz = datos.finanzas_personales || {};
    const cuentas = (fz.cuentas || []).filter(c => !c.archivada);
    const cats = (fz.categorias || []).filter(c => !c.archivada);
    const txs = (fz.transacciones || []).filter(t => !t.archivada);
    const recs = (fz.recurrentes || []).filter(r => r.activo !== false);

    if (!cuentas.length && !txs.length) { ctx += `Sin datos financieros.\n`; }
    else {
      let bal = 0;
      cuentas.forEach(c => {
        const s = c.saldo_actual ?? c.saldo_inicial ?? 0; bal += s;
        ctx += `  Cuenta "${c.nombre}" [${c.tipo||'–'}]: ${fmtCOP(s)}\n`;
      });
      ctx += `  Balance total: ${fmtCOP(bal)}\n`;

      // Resumen mensual 6 meses
      const pm = {};
      txs.forEach(t => {
        const m = (t.fecha||'').slice(0,7); if (!m) return;
        if (!pm[m]) pm[m] = {i:0, g:0};
        if (t.tipo === 'ingreso') pm[m].i += t.monto||0;
        else if (t.tipo === 'gasto') pm[m].g += t.monto||0;
      });
      ctx += `  Resumen mensual:\n`;
      Object.keys(pm).sort().slice(-6).forEach(m => {
        ctx += `  ${m}: ingresos ${fmtCOP(pm[m].i)}, gastos ${fmtCOP(pm[m].g)}, neto ${fmtCOP(pm[m].i-pm[m].g)}\n`;
      });

      // Top categorías
      const pc = {};
      txs.filter(t=>t.tipo==='gasto').forEach(t => {
        const cat = cats.find(c=>c.id===t.categoria_id);
        const n = cat?.nombre || 'Sin categoría';
        pc[n] = (pc[n]||0) + (t.monto||0);
      });
      const top = Object.entries(pc).sort((a,b)=>b[1]-a[1]).slice(0,7);
      if (top.length) { ctx += `  Top gasto: ${top.map(([n,v])=>`${n}:${fmtCOP(v)}`).join(' | ')}\n`; }

      // Últimas transacciones
      ctx += `  Últimas 15 transacciones:\n`;
      [...txs].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).slice(0,15).forEach(t => {
        const cat = cats.find(c=>c.id===t.categoria_id);
        const cta = cuentas.find(c=>c.id===t.cuenta_id);
        ctx += `  ${t.fecha||'?'} ${t.tipo==='gasto'?'▼':'▲'} ${fmtCOP(t.monto||0)} ${cat?.nombre||'–'} "${t.descripcion||''}" [${cta?.nombre||'–'}]\n`;
      });

      if (recs.length) {
        ctx += `  Recurrentes: ${recs.map(r=>`"${r.nombre}" ${fmtCOP(r.monto)} c/${r.frecuencia||'?'}`).join(' | ')}\n`;
      }
    }

    // CLIENTES
    const clientes = datos.clientes || [];
    if (clientes.length) {
      ctx += `\n[CLIENTES] ${clientes.length} total\n`;
      clientes.forEach(c => {
        ctx += `  · "${c.nombre||c.empresa||'–'}"`;
        if (c.tarifa) ctx += ` | ${fmtCOP(c.tarifa)}/h`;
        if (c.estado) ctx += ` | ${c.estado}`;
        ctx += `\n`;
      });
    }

    // TAREAS
    const cal = datos.calendario_tareas || {};
    const pendientes = (cal.tareas||[]).filter(t=>t.estado==='pendiente');
    if (pendientes.length) {
      ctx += `\n[TAREAS PENDIENTES] ${pendientes.length}\n`;
      pendientes.slice(0,12).forEach(t => {
        const lista = (cal.listas||[]).find(l=>l.id===t.lista_id);
        ctx += `  · [${lista?.nombre||'–'}] "${t.texto||'–'}"${t.fecha_limite ? ` → ${t.fecha_limite}` : ''}\n`;
      });
    }

    ctx += `\n═════════════════════════════════════════════════════════\n`;
    return ctx;
  }

  // ── RENDER ──────────────────────────────────────────────────────────
  function quitarEmpty() { if (emptyEl) emptyEl.style.display = 'none'; }
  function quitarChips() { if (chipsEl) chipsEl.style.display = 'none'; }

  function md2html(txt) {
    return txt
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  function addBubble(role, text) {
    quitarEmpty();
    const div = document.createElement('div');
    div.className = `argus-bubble ${role}`;
    if (role === 'model') {
      div.innerHTML = `
        <div class="argus-bubble-label">Argus</div>
        <div class="argus-bubble-text"><p>${md2html(text)}</p></div>
      `;
    } else {
      div.textContent = text;
    }
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'argus-typing';
    div.id = 'argus-typing-el';
    div.innerHTML = `<span class="argus-typing-label">Argus</span><span></span><span></span><span></span>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
  function hideTyping() { document.getElementById('argus-typing-el')?.remove(); }

  function setThinking(on) {
    avatar.classList.toggle('thinking', on);
    statusEl.textContent = on ? 'procesando…' : 'en línea';
    statusEl.className = `argus-status${on ? ' thinking-status' : ''}`;
    sendBtn.disabled = on;
  }

  // ── LLAMADA A UN MODELO ESPECÍFICO ─────────────────────────────────
  async function llamarModelo(modelo, body) {
    const url = `${BASE_URL}/${modelo}:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      const msg = e.error?.message || `HTTP ${res.status}`;
      const esQuota = msg.toLowerCase().includes('quota') || res.status === 429;
      throw { msg, esQuota };
    }
    return res.json();
  }

  // ── ENVÍO CON FALLBACK AUTOMÁTICO ───────────────────────────────────
  async function send(text) {
    if (!text.trim() || pensando) return;
    pensando = true;
    setThinking(true);
    quitarChips();
    addBubble('user', text);
    historial.push({ role: 'user', parts: [{ text }] });
    if (historial.length > MAX_HISTORY * 2) historial = historial.slice(-MAX_HISTORY * 2);
    showTyping();

    const body = {
      system_instruction: { parts: [{ text: construirContexto() }] },
      contents: historial,
      generationConfig: { temperature: 0.72, maxOutputTokens: 1024, topP: 0.9 }
    };

    let reply = null;
    let intentos = modeloActual; // empieza desde el último modelo que funcionó

    while (intentos < MODELOS.length) {
      const modelo = MODELOS[intentos];
      try {
        // Mostrar qué modelo se está usando si no es el primero
        if (intentos > 0) {
          statusEl.textContent = `intentando ${modelo}…`;
        }
        const data = await llamarModelo(modelo, body);
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta.';
        modeloActual = intentos; // guardar el modelo que funcionó
        break;
      } catch (err) {
        if (err.esQuota && intentos + 1 < MODELOS.length) {
          intentos++; // cuota agotada → probar siguiente
          continue;
        }
        // Error real o sin más modelos
        hideTyping();
        if (err.esQuota) {
          addBubble('model',
            `**Cuota de API agotada en todos los modelos disponibles.**\n\n` +
            `Para solucionarlo tienes dos opciones:\n` +
            `**1. Activar billing** en [aistudio.google.com](https://aistudio.google.com) → API keys → Billing (recomendado, cuesta centavos).\n` +
            `**2. Crear una nueva API key** gratis en [aistudio.google.com](https://aistudio.google.com) y reemplazar la key en \`argus.js\`.`
          );
        } else {
          addBubble('model', `Error de conexión: ${err.msg || err}`);
        }
        pensando = false;
        setThinking(false);
        textarea.focus();
        return;
      }
    }

    hideTyping();
    if (reply) {
      addBubble('model', reply);
      historial.push({ role: 'model', parts: [{ text: reply }] });
    }
    pensando = false;
    setThinking(false);
    textarea.focus();
  }

  // ── EVENTOS ─────────────────────────────────────────────────────────
  sendBtn.addEventListener('click', () => {
    const t = textarea.value.trim();
    if (t) { textarea.value = ''; textarea.style.height = ''; send(t); }
  });

  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const t = textarea.value.trim();
      if (t) { textarea.value = ''; textarea.style.height = ''; send(t); }
    }
  });

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  });

  document.querySelectorAll('.argus-chip').forEach(chip => {
    chip.addEventListener('click', () => send(chip.dataset.msg));
  });

  clearBtn.addEventListener('click', () => {
    historial = [];
    messages.innerHTML = '';
    const e = document.createElement('div');
    e.className = 'argus-empty'; e.id = 'argus-empty';
    e.innerHTML = `<div class="argus-empty-icon">👁</div><h3>Listo</h3><p>Conversación borrada.</p>`;
    messages.appendChild(e);
    chipsEl.style.display = 'flex';
  });

  actualizarKPIs();
  console.log('%c ARGUS online', 'color:#5b7fa6;font-weight:600;');

})();