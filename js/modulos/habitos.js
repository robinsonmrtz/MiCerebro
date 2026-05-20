/* ====================================================
   RUTA DEL ARCHIVO: js/modulos/habitos.js
   VERSIÓN: 4.3 — Una sola casilla Emoji + Sincronización Total
   ==================================================== */

let fechaSeleccionada = new Date().toLocaleDateString('es-CO');
let offsetDias = 0;
let habitoAccionActual = null;
let idHabitoParaBorrar = null;

const PALETA_COLORES_DEFAULT = [
    '#FF9800', '#2196F3', '#3F51B5', '#E91E63',
    '#4CAF50', '#9C27B0', '#00BCD4', '#F44336',
    '#FF5722', '#8BC34A'
];

const CONFIG_HABITOS_DEFAULT = {
    grupos: [
        { icono: '☕', nombre: 'Mañana', color: '#FF9800' },
        { icono: '⚡', nombre: 'Tarde',  color: '#2196F3' },
        { icono: '🌙', nombre: 'Noche',  color: '#3F51B5' }
    ],
    paleta: PALETA_COLORES_DEFAULT
};

// ─── LISTA COMPLETA DE EMOJIS ───────────────────────────
const EMOJIS_SISTEMA = "😀, 😃, 😄, 😁, 😆, 😅, 😂, 🤣, 🥲, ☺️, 😊, 😇, 🙂, 🙃, 😉, 😌, 😍, 🥰, 😘, 😗, 😙, 😚, 😋, 😛, 😝, 😜, 🤪, 🤨, 🧐, 🤓, 😎, 🥸, 🤩, 🥳, 😏, 😒, 😞, 😔, 😟, 😕, 🙁, ☹️, 😣, 😖, 😫, 😩, 🥺, 😢, 😭, 😤, 😠, 😡, 🤬, 🤯, 😳, 🥵, 🥶, 😱, 😨, 😰, 😥, 😓, 🤗, 🤔, 🤭, 🤫, 🤥, 😶, 😐, 😑, 😬, 🙄, 😯, 😦, 😧, 😮, 😲, 🥱, 😴, 🤤, 😪, 😵, 🤐, 🥴, 🤢, 🤮, 🤧, 😷, 🤒, 🤕, 🤑, 🤠, 😈, 👿, 👹, 👺, 🤡, 💩, 👻, 💀, ☠️, 👽, 👾, 🤖, 🎃, 😺, 😸, 😹, 😻, 😼, 😽, 🙀, 😿, 😾, 👋, 🤚, 🖐️, ✋, 🖖, 👌, 🤌, 🤏, ✌️, 🤞, 🤟, 🤘, 🤙, 👈, 👉, 👆, 👇, ☝️, 👍, 👎, ✊, 👊, 🤛, 🤜, 👏, 🙌, 👐, 🤲, 🤝, 🙏, ✍️, 💅, 🤳, 💪, 🦾, 🦵, 🦿, 🦶, 👂, 🦻, 👃, 🧠, 🫀, 🫁, 🦷, 🦴, 👀, 👁️, 👅, 👄, 💋, 🩸, 👶, 👧, 🧒, 👦, 👩, 🧑, 👨, 🧓, 👴, 🧔, 👱, 🧕, 👮, 👷, 💂, 🕵️, 👩‍⚕️, 👩‍🌾, 👩‍🍳, 👩‍🎓, 👩‍🎤, 👩‍🏫, 👩‍🏭, 👩‍💻, 👩‍💼, 👩‍🔧, 👩‍🔬, 👩‍🎨, 👩‍🚒, 👩‍✈️, 👩‍🚀, 👩‍⚖️, 👰, 🤵, 👸, 🤴, 🦸, 🦹, 🤶, 🎅, 🧙, 🧝, 🧛, 🧟, 🧞, 🧜, 🧚, 👼, 🤰, 🤱, 🙇, 💁, 🙅, 🙆, 🙋, 🧏, 🤦, 🤷, 🙎, 🙍, 💇, 💆, 🧖, 💃, 🕺, 👯, 🕴️, 🚶, 🏃, 🧍, 🧎, 👫, 👭, 👬, 💑, 💏, 👪, 🗣️, 👤, 👥, 🫂, 👣, 🐵, 🐒, 🦍, 🦧, 🐶, 🐕, 🐩, 🐺, 🦊, 🦝, 🐱, 🐈, 🦁, 🐯, 🐅, 🐆, 🐴, 🐎, 🦄, 🦓, 🦌, 🐮, 🐂, 🐃, 🐄, 🐷, 🐖, 🐗, 🐽, 🐏, 🐑, 🐐, 🐪, 🐫, 🦙, 🦒, 🐘, 🦣, 🦏, 🦛, 🐭, 🐁, 🐀, 🐹, 🐰, 🐇, 🐿️, 🦫, 🦔, 🦇, 🐻, 🐨, 🐼, 🦥, 🦦, 🦨, 🦘, 🦡, 🐾, 🦃, 🐔, 🐓, 🐣, 🐤, 🐥, 🐦, 🐧, 🕊️, 🦅, 🦆, 🦢, 🦉, 🦤, 🪶, 🦩, 🦚, 🦜, 🐸, 🐊, 🐢, 🦎, 🐍, 🐲, 🐉, 🦕, 🦖, 🐳, 🐋, 🐬, 🦭, 🐟, 🐠, 🐡, 🦈, 🐙, 🐚, 🪸, 🐌, 🦋, 🐛, 🐜, 🐝, 🪲, 🐞, 🦗, 🪳, 🕷️, 🕸️, 🦂, 🦟, 🪰, 🪱, 🦠, 💐, 🌸, 💮, 🏵️, 🌹, 🥀, 🌺, 🌻, 🌼, 🌷, 🌱, 🪴, 🌲, 🌳, 🌴, 🌵, 🌾, 🌿, ☘️, 🍀, 🍁, 🍂, 🍃, 🍇, 🍈, 🍉, 🍊, 🍋, 🍌, 🍍, 🥭, 🍎, 🍏, 🍐, 🍑, 🍒, 🍓, 🫐, 🥝, 🍅, 🫒, 🥥, 🥑, 🍆, 🥔, 🥕, 🌽, 🌶️, 🫑, 🥒, 🥬, 🥦, 🧄, 🧅, 🍄, 🥜, 🌰, 🍞, 🥐, 🥖, 🫓, 🥨, 🥯, 🥞, 🧇, 🧀, 🍖, 🍗, 🥩, 🥓, 🍔, 🍟, 🍕, 🌭, 🥪, 🌮, 🌯, 🫔, 🥙, 🧆, 🥚, 🍳, 🥘, 🍲, 🫕, 🥣, 🥗, 🍿, 🧈, 🧂, 🥫, 🍱, 🍘, 🍙, 🍚, 🍛, 🍜, 🍝, 🍠, 🍢, 🍣, 🍤, 🍥, 🥮, 🍡, 🥟, 🥠, 🥡, 🦀, 🦞, 🦐, 🦑, 🦪, 🍦, 🍧, 🍨, 🍩, 🍪, 🎂, 🍰, 🧁, 🥧, 🍫, 🍬, 🍭, 🍮, 🍯, 🍼, 🥛, ☕, 🍵, 🧃, 🥤, 🧋, 🍶, 🍺, 🍻, 🥂, 🍷, 🥃, 🍸, 🍹, 🧉, 🍾, 🧊, 🥄, 🍴, 🍽️, 🥣, 🥡, 🥢, 🧂, ⚽, 🏀, 🏈, ⚾, 🥎, 🎾, 🏐, 🏉, 🥏, 🎱, 🪀, 🏓, 🏸, 🏒, 🏑, 🥍, 🏏, 🥅, ⛳, 🪁, 🏹, 🎣, 🤿, 🥊, 🥋, 🎽, 🛹, 🛼, 🛷, ⛸️, 🥌, 🎿, ⛷️, 🏂, 🏋️, 🤼, 🤸, ⛹️, 🤺, 🤾, 🏌️, 🏇, 🧘, 🏄, 🏊, 🤽, 🚣, 🧗, 🚵, 🚴, 🏆, 🥇, 🥈, 🥉, 🏅, 🎖️, 🏵️, 🎗️, 🎫, 🎟️, 🎪, 🤹, 🎭, 🎨, 🎬, 🎤, 🎧, 🎼, 🎹, 🥁, 🪘, 🎷, 🎺, 🪗, 🎸, 🪕, 🎻, 🎲, ♟️, 🎯, 🎳, 🎮, 🎰, 🧩, 🚗, 🚕, 🚙, 🚌, 🚎, 🏎️, 🚓, 🚑, 🚒, 🚐, 🛻, 🚚, 🚛, 🚜, 🦯, 🦽, 🦼, 🛴, 🚲, 🛵, 🏍️, 🛺, 🚨, 🚔, 🚍, 🚘, 🚖, 🚡, 🚠, 🚟, 🚃, 🚋, 🚞, 🚝, 🚄, 🚅, 🚈, 🚂, 🚆, 🚇, 🚊, 🚉, ✈️, 🛫, 🛬, 🛩️, 💺, 🛰️, 🚀, 🛸, 🚁, 🛶, ⛵, 🚤, 🛥️, 🛳️, ⛴️, 🚢, ⚓, 🪝, ⛽, 🚧, 🚦, 🚥, 🚏, 🗺️, 🗿, 🗽, 🗼, 🏰, 🏯, 🏟️, 🎡, 🎢, ⛲, ⛱️, 🏖️, 🏝️, 🏜️, 🌋, ⛰️, 🏔️, 🗻, 🏕️, ⛺, 🏠, 🏡, 🏘️, 🏚️, 🏗️, 🏭, 🏢, 🏬, 🏣, 🏤, 🏥, 🏦, 🏨, 🏪, 🏫, 🏩, 💒, 🏛️, ⛪, 🕌, 🕍, 🛕, 🕋, ⛩️, 🛤️, 🛣️, 🗾, 🎑, 🏞️, 🌅, 🌄, 🌠, 🎇, 🎆, 🌇, 🌆, 🏙️, 🌃, 🌌, 🌉, 🌁, ⌚, 📱, 📲, 💻, ⌨️, 🖥️, 🖨️, 🖱️, 🖲️, 🕹️, 🗜️, 💽, 💾, 💿, 📀, 📼, 📷, 📸, 📹, 🎥, 📽️, 🎞️, 📞, ☎️, 📟, 📠, 📺, 📻, 🎙️, 🎚️, 🎛️, 🧭, ⏱️, ⏲️, ⏰, 🕰️, ⌛, ⏳, 📡, 🔋, 🔌, 💡, 🔦, 🕯️, 🪔, 🧯, 🛢️, 💸, 💵, 💴, 💶, 💷, 🪙, 💰, 💳, 💎, ⚖️, 🪜, 🧰, 🪛, 🔧, 🔨, ⚒️, 🛠️, ⛏️, 🪚, 🔩, ⚙️, 🪤, 🧱, ⛓️, 🧲, 🔫, 💣, 🧨, 🪓, 🔪, 🗡️, ⚔️, 🛡️, 🚬, ⚰️, 🪦, ⚱️, 🏺, 🔮, 📿, 🧿, 💈, ⚗️, 🔭, 🔬, 🕳️, 🩹, 🩺, 💊, 💉, 🩸, 🧬, 🦠, 🧫, 🧪, 🌡️, 🧹, 🪠, 🧺, 🧻, 🚽, 🚰, 🚿, 🛁, 🛀, 🧼, 🪥, 🪒, 🧽, 🪣, 🔑, 🗝️, 🚪, 🪑, 🛋️, 🛏️, 🛌, 🧸, 🪆, 🖼️, 🪞, 🪟, 🛍️, 🛒, 🎁, 🎈, 🎏, 🎀, 🪄, 🪅, 🎊, 🎉, 🎎, 🏮, 🎐, 🧧, ✉️, 📩, 📨, 📧, 💌, 📥, 📤, 📦, 🏷️, 🪧, 📪, 📫, 📬, 📭, 📮, 📯, 📜, 📃, 📄, 📑, 🧾, 📊, 📈, 📉, 🗒️, 🗓️, 📆, 📅, 🗑️, 📇, 🗃️, 🗳️, 🗄️, 📋, 📁, 📂, 🗂️, 🗞️, 📰, 📓, 📔, 📒, 📕, 📗, 📘, 📙, 📚, 📖, 🔖, 🧷, 🔗, 📎, 🖇️, 📐, 📏, 🧮, 📌, 📍, ✂️, 🖊️, 🖋️, ✒️, 🖌️, 🖍️, 📝, 📝, 🔍, 🔎, 🔏, 🔐, 🔒, 🔓, ❤️, 🧡, 💛, 💚, 💙, 💜, 🖤, 🤍, 🤎, 💔, ❣️, 💕, 💞, 💓, 💗, 💖, 💘, 💝, 💟, ☮️, ✝️, ☪️, 🕉️, ☸️, ✡️, 🔯, 🕎, ☯️, ☦️, 🛐, ⛎, ♈, ♉, ♊, ♋, ♌, ♍, ♎, ♏, ♐, ♑, ♒, ♓, 🆔, ⚛️, 🉑, ☢️, ☣️, 📴, 📳, 🈶, 🈚, 🈸, 🈺, 🈷️, ✴️, 🆚, 💮, 🉐, ㊙️, ㊗️, 🈴, 🈵, 🈹, 🈲, 🅰️, 🅱️, 🆎, 🆑, 🅾️, 🆘, ❌, ⭕, 🛑, ⛔, 📛, 🚫, 💯, 💢, ♨️, 🚷, 🚯, 🚳, 🚱, 🔞, 📵, 🚭, ❗, ❕, ❓, ❔, ‼️, ⁉️, 🔅, 🔆, 〽️, ⚠️, 🚸, 🔱, ⚜️, 🔰, ♻️, ✅, 🈯, 💹, ❇️, ✳️, ❎, 🌐, 💠, Ⓜ️, 🌀, 💤, 🏧, 🚾, ♿, 🅿️, 🈳, 🈂️, 🛂, 🛃, 🛄, 🛅, 🚹, 🚺, 🚼, ⚧️, 🚻, 🚮, 🎦, 📶, 🈁, 🔣, ℹ️, 🔤, 🔡, 🔠, 🆖, 🆗, 🆙, 🆒, 🆕, 🆓, 0️⃣, 1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣, 6️⃣, 7️⃣, 8️⃣, 9️⃣, 🔟, 🔢, #️⃣, *️⃣, ⏏️, ▶️, ⏸️, ⏯️, ⏹️, ⏺️, ⏭️, ⏮️, ⏩, ⏪, ⏫, ⏬, ◀️, 🔼, 🔽, ➡️, ⬅️, ⬆️, ⬇️, ↗️, ↘️, ↙️, ↖️, ↕️, ↔️, ↪️, ↩️, ⤴️, ⤵️, 🔀, 🔁, 🔂, 🔄, 🔃, 🎵, 🎶, ➕, ➖, ➗, ✖️, ♾️, 💲, 💱, ™️, ©️, ®️, 〰️, ➰, ➿, 🔚, 🔙, 🔛, 🔝, 🔜, ✔️, ☑️, 🔘, 🔴, 🟠, 🟡, 🟢, 🔵, 🟣, ⚫, ⚪, 🟤, 🔺, 🔻, 🔸, 🔹, 🔶, 🔷, 🔳, 🔲, ▪️, ▫️, ◾, ◽, ◼️, ◻️, 🟥, 🟧, 🟨, 🟩, 🟦, 🟪, ⬛, ⬜, 🟫, 🔈, 🔇, 🔉, 🔊, 🔔, 🔕, 📣, 📢, 👁️‍🗨️, 💭, 🗯️, ♠️, ♣️, ♥️, ♦️, 🃏, 🎴, 🀄, 🕐, 🕑, 🕒, 🕓, 🕔, 🕕, 🕖, 🕗, 🕘, 🕙, 🕚, 🕛, 🕜, 🕝, 🕞, 🕟, 🕠, 🕡, 🕢, 🕣, 🕤, 🕥, 🕦, 🕧, 🏳️, 🏴, 🏴‍☠️, 🏁, 🚩, 🏳️‍🌈, 🏳️‍⚧️".split(',');

// ─── LÓGICA DEL SELECTOR GLOBAL ─────────────────────────
window.abrirSelectorEmojiGlobal = function(btn, inputId) {
    let panel = document.getElementById('panel-emoji-global');
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'panel-emoji-global';
        document.body.appendChild(panel);
        
        document.addEventListener('click', (e) => {
            if (panel.style.display === 'flex') {
                if (e.target !== panel && !panel.contains(e.target) && !e.target.classList.contains('emoji-trigger-input')) {
                    panel.style.display = 'none';
                }
            }
        });
    }

    if (panel.style.display === 'flex' && panel.dataset.targetInput === inputId) {
        panel.style.display = 'none';
        return;
    }

    // Regenerar contenido del panel CON EL INPUTID CORRECTO cada vez que se abre
    panel.innerHTML = EMOJIS_SISTEMA.map(emoji => 
        `<button type="button" class="emoji-global-btn" onclick="window.seleccionarEmojiGlobal('${emoji}', '${inputId}')">${emoji}</button>`
    ).join('');

    panel.dataset.targetInput = inputId;
    panel.style.display = 'flex';
    panel.style.position = 'fixed';

    // Calcular posición debajo de la casilla seleccionada
    const rect = btn.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    if (top + 280 > window.innerHeight) {
        top = rect.top - 288;
    }
    if (left + 300 > window.innerWidth) {
        left = window.innerWidth - 310;
    }

    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
};

// FUNCIÓN DE SINCRONIZACIÓN CORREGIDA 
window.seleccionarEmojiGlobal = function(emoji, inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = emoji;
        
        // Forzamos al sistema a entender que el valor cambió
        input.dispatchEvent(new Event('change'));
        input.dispatchEvent(new Event('input'));

        // Sincronización Directa de la Tarjeta (Estrellita por defecto)
        if (inputId === 'habito-icono') {
            window.actualizarPreviewHabito();
        }
    }
    
    const panel = document.getElementById('panel-emoji-global');
    if (panel) panel.style.display = 'none';
};

window.estadosGruposContraidos = window.estadosGruposContraidos || {};

/* ─── Helpers Estables de Datos ────────────────────────── */
function obtenerDatosHabitosSeguros() {
    let d = cargarDatos() || { habitos: [], registro_habitos: {} };
    if (!d.config_habitos || !d.config_habitos.grupos) {
        guardarConfigHabitos(CONFIG_HABITOS_DEFAULT);
        d.config_habitos = CONFIG_HABITOS_DEFAULT;
    }
    if (d.config_habitos.grupos) {
        d.config_habitos.grupos = d.config_habitos.grupos.map(g => ({
            icono: g.icono || '📁',
            nombre: g.nombre,
            color: g.color
        }));
    }
    if (!d.config_habitos.paleta) {
        d.config_habitos.paleta = PALETA_COLORES_DEFAULT;
    }
    return d;
}

function obtenerFechaComparar(s) {
    const p = s.split('/');
    return new Date(p[2], p[1] - 1, p[0]);
}

function svgDonut(size, strokeW, pct, colorFill, colorBg) {
    const r = (size - strokeW) / 2;
    const circum = 2 * Math.PI * r;
    const offset = circum * (1 - Math.min(pct, 1));
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${colorBg}" stroke-width="${strokeW}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${colorFill}"
            stroke-width="${strokeW}" stroke-linecap="round"
            stroke-dasharray="${circum}" stroke-dashoffset="${offset}"
            style="transition:stroke-dashoffset 0.4s ease"/>
    </svg>`;
}

/* ─── Inicialización del Módulo ───────────────────────── */
window.inicializarHabitos = function() {
    obtenerDatosHabitosSeguros();
    renderizarCalendario();
    renderizarListaHabitos();

    const btnGuardar = document.getElementById('btn-guardar-habito-accion');
    if (btnGuardar) btnGuardar.onclick = window.guardarHabito;

    const btnB = document.getElementById('btn-borrar-final');
    if (btnB) btnB.onclick = () => { if (idHabitoParaBorrar) window.borrarHabito(idHabitoParaBorrar); };

    if (window.intervaloCronometros) clearInterval(window.intervaloCronometros);
    window.intervaloCronometros = setInterval(() => window.actualizarCronometrosVivos(), 1000);
};

/* ─── Renderizado de Calendario ────────────────────────── */
window.moverCalendario = function(dir) {
    offsetDias += dir * 3;
    renderizarCalendario();
};

function renderizarCalendario() {
    const slider = document.getElementById('calendario-habitos');
    if (!slider) return;
    slider.innerHTML = '';

    const hoy = new Date();
    const dias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const d = obtenerDatosHabitosSeguros();

    for (let i = -3 + offsetDias; i <= 3 + offsetDias; i++) {
        const f = new Date(hoy);
        f.setDate(hoy.getDate() + i);
        const txt = f.toLocaleDateString('es-CO');
        const activo = txt === fechaSeleccionada;
        const fCirc = new Date(f.getFullYear(), f.getMonth(), f.getDate());

        const reg = (d.registro_habitos && d.registro_habitos[txt]) || {};
        let totalPct = 0, cuenta = 0;
        d.habitos.forEach(h => {
            const fCrea = h.fechaCreacion ? new Date(h.fechaCreacion + 'T00:00:00') : new Date(2000, 0, 1);
            if (h.tipo === 'contador' && fCirc >= fCrea) {
                cuenta++;
                const val = reg[h.id] || 0;
                totalPct += Math.min(val / h.meta, 1);
            }
        });
        const pct = cuenta > 0 ? totalPct / cuenta : 0;

        const rootStyle   = getComputedStyle(document.documentElement);
        const accentColor = rootStyle.getPropertyValue('--accent').trim() || '#1A73E8';
        const pctRounded  = Math.round(pct * 100);

        const item = document.createElement('div');
        item.className = `dia-circulo ${activo ? 'activo' : ''}`;
        item.style.background = `conic-gradient(from -90deg, ${accentColor} ${pctRounded}%, var(--border-card) ${pctRounded}%)`;

        item.innerHTML = `
            <div class="inner-circulo">
                <span class="dia-nombre">${dias[f.getDay()]}</span>
                <span class="dia-numero">${f.getDate()}</span>
            </div>`;

        item.onclick = () => {
            fechaSeleccionada = txt;
            renderizarCalendario();
            renderizarListaHabitos();
        };
        slider.appendChild(item);
    }
}

/* ─── Renderizado de Tarjetas de Hábitos ─────────────────── */
function renderizarListaHabitos() {
    const cont = document.getElementById('lista-habitos');
    if (!cont) return;

    const d = obtenerDatosHabitosSeguros();
    const reg = (d.registro_habitos && d.registro_habitos[fechaSeleccionada]) || {};
    const fVista = obtenerFechaComparar(fechaSeleccionada);

    const filtrados = d.habitos.filter(h => {
        const fc = h.fechaCreacion ? new Date(h.fechaCreacion + 'T00:00:00') : new Date(2000, 0, 1);
        return fc <= fVista;
    });

    if (filtrados.length === 0) {
        cont.innerHTML = `<div class="estado-vacio"><h3>🍃 Sin hábitos</h3><p>Pulsa "Nuevo Hábito" para comenzar.</p></div>`;
        return;
    }

    const gruposMap = {};
    filtrados.forEach(h => {
        const conf = d.config_habitos.grupos.find(g => g.nombre === h.grupo) || { color: '#888', icono: '📁' };
        if (!gruposMap[h.grupo]) gruposMap[h.grupo] = { color: conf.color, icono: conf.icono || '', habitos: [] };
        gruposMap[h.grupo].habitos.push(h);
    });

    cont.innerHTML = '';

    for (const [nombre, data] of Object.entries(gruposMap)) {
        let totalG = 0, doneG = 0;
        data.habitos.forEach(h => {
            if (h.tipo === 'contador') {
                totalG++;
                if ((reg[h.id] || 0) >= h.meta) doneG++;
            }
        });
        const pctGrupo = totalG > 0 ? doneG / totalG : 0;
        const pctGrupoPct = Math.round(pctGrupo * 100);

        const abierto = !window.estadosGruposContraidos[nombre];
        const grupoColor = data.color;
        const donutGrupoSVG = svgDonut(36, 3, pctGrupo, grupoColor, 'rgba(255,255,255,0.2)');

        let html = `
        <div class="habito-grupo-container">
            <div class="habito-grupo-header ${abierto ? 'abierto' : ''}"
                 style="--grupo-color:${grupoColor}; --grupo-progreso:${pctGrupoPct}%"
                 onclick="window.toggleGrupo('${nombre.replace(/'/g, "\\'")}')">
                <div class="grupo-izq">
                    <span class="grupo-icono">${data.icono}</span>
                    <h3 class="habito-grupo-titulo">${nombre}</h3>
                </div>
                <div class="grupo-der">
                    ${donutGrupoSVG}
                    <div class="grupo-flecha-svg ${abierto ? 'abierto' : ''}">▼</div>
                </div>
            </div>
            <div class="habitos-grupo-contenido ${abierto ? '' : 'oculto'}">`;

        data.habitos.forEach(h => {
            const val = reg[h.id] || 0;
            const comp = h.tipo === 'contador' && val >= h.meta;
            const pctCard = h.tipo === 'contador' ? Math.min(val / h.meta, 1) * 100 : 0;

            let btnDer = '';
            if (h.tipo === 'cronometro') {
                if (h.fechaInicio) {
                    btnDer = `<span class="habito-cronometro" id="cron-${h.id}" data-inicio="${h.fechaInicio}">0d 00h 00m</span>`;
                } else {
                    btnDer = `<button class="btn-play-cron" onclick="event.stopPropagation(); window.iniciarCronometro(${h.id})">▶</button>`;
                }
            } else {
                btnDer = `<button class="habito-btn-der"
                    style="border-color:${h.color}; color:${comp ? '#fff' : h.color}; background:${comp ? h.color : 'transparent'};"
                    onclick="event.stopPropagation(); window.sumarRapido(${h.id})">
                    ${comp ? '✓' : '+'}
                </button>`;
            }

            html += `
            <div class="habito-card ${comp ? 'completado' : ''}"
                 style="--habito-color:${h.color}; --habito-progreso:${pctCard}%;"
                 onclick="window.abrirAccion(${h.id})">
                <div class="habito-info">
                    <div class="habito-icono-bg" style="background:${h.color}18; color:${h.color};">
                        ${h.icono}
                    </div>
                    <div>
                        <p class="habito-nombre">${h.nombre}</p>
                        <p class="habito-meta-txt">${
                            h.tipo === 'cronometro'
                                ? (h.fechaInicio ? '⏱ Activo' : '⏸ Pausado')
                                : `${val} / ${h.meta}`
                        }</p>
                    </div>
                </div>
                ${btnDer}
            </div>`;
        });

        html += `</div></div>`;
        cont.innerHTML += html;
    }
}

window.toggleGrupo = function(nombre) {
    window.estadosGruposContraidos[nombre] = !window.estadosGruposContraidos[nombre];
    renderizarListaHabitos();
};

window.sumarRapido = function(id) {
    const d = obtenerDatosHabitosSeguros();
    const h = d.habitos.find(x => x.id == id);
    if (!h) return;
    if (!d.registro_habitos[fechaSeleccionada]) d.registro_habitos[fechaSeleccionada] = {};
    let val = d.registro_habitos[fechaSeleccionada][h.id] || 0;
    val = Math.min(val + (h.paso || 1), h.meta);
    guardarProgresoHabito(fechaSeleccionada, h.id, val);
    renderizarListaHabitos();
    renderizarCalendario();
};

/* ─── Gestión de Grupos (CRUD Modales) ─────────────────── */
window.abrirGestionGrupos = function() {
    renderizarGestionGrupos();
    const modal = document.getElementById('modal-grupos-gestion');
    if (modal) modal.style.display = 'flex';
};

window.cerrarGestionGrupos = function() {
    const modal = document.getElementById('modal-grupos-gestion');
    if (modal) modal.style.display = 'none';
    renderizarListaHabitos();
};

// Se actualizó para que los iconos de la lista editables también sean "una sola casilla"
function renderizarGestionGrupos() {
    const d = obtenerDatosHabitosSeguros();
    renderizarPaleta('paleta-sugerida', null, true);
    const contenedor = document.getElementById('lista-gestion-grupos');
    if (!contenedor) return;

    contenedor.innerHTML = d.config_habitos.grupos.map((g, i) => `
        <div class="item-grupo-crud" style="border-left-color:${g.color};">
            <input type="text" id="edit-grupo-icono-${i}" class="grupo-crud-icono-input emoji-trigger-input"
                value="${g.icono || ''}" readonly style="cursor:pointer; text-align:center;"
                onclick="event.stopPropagation(); window.abrirSelectorEmojiGlobal(this, 'edit-grupo-icono-${i}')"
                onchange="window.actualizarGrupo(${i}, 'icono', this.value)" title="Cambiar Icono">
                
            <input type="text" class="grupo-crud-nombre-input"
                value="${g.nombre}"
                onchange="window.actualizarGrupo(${i}, 'nombre', this.value)">
            <div class="grupo-crud-acciones">
                <input type="color" value="${g.color}"
                    style="width:24px; height:24px; border:none; border-radius:50%; cursor:pointer; padding:0; background:transparent;"
                    onchange="window.actualizarGrupo(${i}, 'color', this.value)">
                <button class="btn-grupo-borrar" onclick="window.eliminarGrupo(${i})">✕</button>
            </div>
        </div>
    `).join('');
}

window.actualizarGrupo = function(idx, campo, valor) {
    let d = obtenerDatosHabitosSeguros();
    const nombreAnterior = d.config_habitos.grupos[idx].nombre;
    d.config_habitos.grupos[idx][campo] = valor;

    if (campo === 'nombre' && valor !== nombreAnterior) {
        d.habitos = d.habitos.map(h => {
            if (h.grupo === nombreAnterior) h.grupo = valor;
            return h;
        });
        guardarHabitosDefinicion(d.habitos);
    }
    guardarConfigHabitos(d.config_habitos);
    renderizarGestionGrupos();
    renderizarListaHabitos();
};

window.agregarGrupo = function() {
    const inputNombre = document.getElementById('nuevo-grupo-nombre');
    const inputColor  = document.getElementById('nuevo-grupo-color');
    const inputIcono  = document.getElementById('nuevo-grupo-icono');
    const n = inputNombre.value.trim();
    const c = inputColor.value;
    const ico = inputIcono.value.trim() || '📁';

    if (!n) return alert('Escribe un nombre para el grupo.');

    let d = obtenerDatosHabitosSeguros();
    d.config_habitos.grupos.push({ icono: ico, nombre: n, color: c });
    guardarConfigHabitos(d.config_habitos);

    inputNombre.value = '';
    inputIcono.value = '📁';
    renderizarGestionGrupos();
};

window.eliminarGrupo = function(idx) {
    let d = obtenerDatosHabitosSeguros();
    const nombreB = d.config_habitos.grupos[idx].nombre;
    if (confirm(`¿Borrar el grupo "${nombreB}"?`)) {
        d.config_habitos.grupos.splice(idx, 1);
        const primerG = d.config_habitos.grupos[0]?.nombre || 'General';
        d.habitos = d.habitos.map(h => {
            if (h.grupo === nombreB) h.grupo = primerG;
            return h;
        });
        guardarConfigHabitos(d.config_habitos);
        guardarHabitosDefinicion(d.habitos);
        renderizarGestionGrupos();
    }
};

/* ─── Paletas Rápidas Dinámicas ────────────────────────── */
function renderizarPaleta(contenedorId, colorActivo, editable, onSelect) {
    const div = document.getElementById(contenedorId);
    if (!div) return;
    const d = obtenerDatosHabitosSeguros();
    const paleta = d.config_habitos.paleta || PALETA_COLORES_DEFAULT;

    div.innerHTML = paleta.map((c, i) => `
        <div class="paleta-color-btn ${colorActivo === c ? 'seleccionado' : ''}"
             style="background:${c};"
             onclick="window._onPaletaClick('${contenedorId}', '${c}', ${editable})">
            ${editable ? `<button class="btn-quitar-color" onclick="event.stopPropagation(); window.quitarColorPaleta(${i})" title="Quitar">✕</button>` : ''}
        </div>
    `).join('');

    if (editable) {
        div.innerHTML += `<button class="btn-agregar-color-paleta" onclick="document.getElementById('input-nuevo-color-paleta').click()" title="Agregar color">+</button>`;
    }
    window._paletaCallbacks = window._paletaCallbacks || {};
    if (onSelect) window._paletaCallbacks[contenedorId] = onSelect;
}

window._onPaletaClick = function(contenedorId, color, editable) {
    const inputColor = document.getElementById('habito-color') || document.getElementById('nuevo-grupo-color');
    if (inputColor) {
        inputColor.value = color;
        inputColor.dispatchEvent(new Event('input'));
    }
    if (window._paletaCallbacks && window._paletaCallbacks[contenedorId]) {
        window._paletaCallbacks[contenedorId](color);
    }
    renderizarPaleta(contenedorId, color, editable, window._paletaCallbacks?.[contenedorId]);
};

window.agregarColorPaleta = function(color) {
    let d = obtenerDatosHabitosSeguros();
    if (!d.config_habitos.paleta) d.config_habitos.paleta = [...PALETA_COLORES_DEFAULT];
    if (!d.config_habitos.paleta.includes(color)) {
        d.config_habitos.paleta.push(color);
        guardarConfigHabitos(d.config_habitos);
    }
    renderizarGestionGrupos();
    renderizarPaleta('paleta-habito-modal', color, false, (c) => {
        const inp = document.getElementById('habito-color');
        if (inp) { inp.value = c; window.actualizarPreviewHabito(); }
    });
};

window.quitarColorPaleta = function(idx) {
    let d = obtenerDatosHabitosSeguros();
    d.config_habitos.paleta.splice(idx, 1);
    guardarConfigHabitos(d.config_habitos);
    renderizarGestionGrupos();
};

/* ─── Modal de Crear / Editar Hábitos con Tarjeta arriba ── */
window.abrirModalHabitoNueva = function() { window.abrirModalHabitoUI(null); };

window.abrirModalHabitoUI = function(id = null) {
    const modal = document.getElementById('modal-habito-principal');
    if (!modal) return;
    modal.style.display = 'flex';

    const d = obtenerDatosHabitosSeguros();
    const sel = document.getElementById('habito-grupo-select');
    sel.innerHTML = d.config_habitos.grupos.map(g =>
        `<option value="${g.nombre}">${g.nombre}</option>`
    ).join('');

    if (id) {
        const h = d.habitos.find(x => x.id == id);
        document.getElementById('modal-titulo').innerText = 'Editar Hábito';
        document.getElementById('habito-id-edit').value  = h.id;
        document.getElementById('habito-nombre').value   = h.nombre;
        document.getElementById('habito-icono').value    = h.icono || '✨';
        document.getElementById('habito-color').value    = h.color;
        document.getElementById('habito-grupo-select').value = h.grupo;
        document.getElementById('habito-tipo').value     = h.tipo;
        document.getElementById('habito-meta').value     = h.meta;
        document.getElementById('habito-paso').value     = h.paso || 1;
    } else {
        document.getElementById('modal-titulo').innerText = 'Nuevo Hábito';
        document.getElementById('habito-id-edit').value  = '';
        document.getElementById('habito-nombre').value   = '';
        document.getElementById('habito-icono').value    = '✨';
        document.getElementById('habito-color').value    = '#1A73E8';
        document.getElementById('habito-meta').value     = '1';
        document.getElementById('habito-paso').value     = '1';
    }

    window.alternarCamposTipo();
    window.actualizarPreviewHabito();

    renderizarPaleta('paleta-habito-modal',
        document.getElementById('habito-color').value,
        false,
        (c) => {
            document.getElementById('habito-color').value = c;
            window.actualizarPreviewHabito();
        }
    );
};

// Sincronización en tiempo real corregida
window.actualizarPreviewHabito = function() {
    const nombre = document.getElementById('habito-nombre')?.value || 'Nombre del hábito';
    const icono  = document.getElementById('habito-icono')?.value  || '✨';
    const color  = document.getElementById('habito-color')?.value  || '#1A73E8';
    const meta   = document.getElementById('habito-meta')?.value   || '1';

    const banner = document.getElementById('habito-preview');
    if (banner) banner.style.background = color;

    const elIcono = document.getElementById('preview-icono-banner');
    if (elIcono) elIcono.innerText = icono;

    const elNombre = document.getElementById('preview-nombre-banner');
    if (elNombre) elNombre.innerText = nombre;

    const elSub = document.getElementById('preview-sub-banner');
    if (elSub) elSub.innerText = `Cada día · meta: ${meta}`;

    renderizarPaleta('paleta-habito-modal', color, false, (c) => {
        document.getElementById('habito-color').value = c;
    });
};

window.guardarHabito = function() {
    const id = document.getElementById('habito-id-edit').value;
    const obj = {
        id:     id ? parseInt(id) : Date.now(),
        nombre: document.getElementById('habito-nombre').value,
        icono:  document.getElementById('habito-icono').value.trim() || '✨',
        color:  document.getElementById('habito-color').value,
        grupo:  document.getElementById('habito-grupo-select').value,
        tipo:   document.getElementById('habito-tipo').value,
        meta:   parseFloat(document.getElementById('habito-meta').value) || 1,
        paso:   parseFloat(document.getElementById('habito-paso').value) || 1,
        fechaCreacion: id ? null : new Date().toISOString().split('T')[0]
    };
    if (!obj.nombre) return alert('Escribe un nombre.');

    let d = obtenerDatosHabitosSeguros();
    if (id) {
        const old = d.habitos.find(x => x.id == id);
        obj.fechaCreacion = old.fechaCreacion;
        obj.fechaInicio   = old.fechaInicio;
        d.habitos = d.habitos.map(x => x.id == id ? obj : x);
    } else {
        if (obj.tipo === 'cronometro') obj.fechaInicio = null;
        d.habitos.push(obj);
    }
    guardarHabitosDefinicion(d.habitos);
    window.cerrarModalHabito();
    renderizarListaHabitos();
    renderizarCalendario();
};

/* ─── Modal de Acción Rápida (Anillo de Progreso) ──────── */
window.abrirAccion = function(id) {
    habitoAccionActual = obtenerDatosHabitosSeguros().habitos.find(x => x.id == id);
    window.actualizarVistaModalAccion();
    const modal = document.getElementById('modal-accion-habito-ui');
    if (modal) modal.style.display = 'flex';
};

window.actualizarVistaModalAccion = function() {
    const h = habitoAccionActual;
    if (!h) return;

    document.getElementById('accion-titulo').innerText = `${h.icono} ${h.nombre}`;

    const cont = document.getElementById('ui-contador-hab');
    const cron = document.getElementById('ui-cronometro-hab');

    if (h.tipo === 'cronometro') {
        cont.style.display = 'none';
        cron.style.display = 'block';
        document.getElementById('accion-subtitulo').innerText = h.fechaInicio ? '⏱ Activo' : '⏸ Pausado';
    } else {
        cont.style.display = 'block';
        cron.style.display = 'none';

        const d   = obtenerDatosHabitosSeguros();
        const reg = d.registro_habitos && d.registro_habitos[fechaSeleccionada];
        const val = (reg && reg[h.id]) || 0;
        const pct = Math.min(val / h.meta, 1);
        const circum = 2 * Math.PI * 68;

        const fill = document.getElementById('accion-anillo-fill');
        if (fill) {
            fill.style.stroke = h.color;
            fill.style.strokeDasharray  = circum;
            fill.style.strokeDashoffset = circum * (1 - pct);
        }

        const numEl  = document.getElementById('accion-num-display');
        const metaEl = document.getElementById('accion-meta-display');
        if (numEl)  numEl.innerText  = val;
        if (metaEl) metaEl.innerText = `/ ${h.meta}`;

        document.getElementById('accion-subtitulo').innerText = `${val} de ${h.meta} completados`;

        const pill = document.getElementById('btn-accion-pill-principal');
        if (pill) {
            pill.style.background = h.color;
            pill.innerText = val >= h.meta ? '✓ Completado' : `+${h.paso || 1}`;
        }
    }
};

window.modificarProgreso = function(dir, full = false) {
    const h = habitoAccionActual;
    const d = obtenerDatosHabitosSeguros();
    if (!d.registro_habitos[fechaSeleccionada]) d.registro_habitos[fechaSeleccionada] = {};
    let val = d.registro_habitos[fechaSeleccionada][h.id] || 0;
    if (full) {
        val = h.meta;
    } else {
        val = Math.max(0, val + (h.paso || 1) * dir);
    }
    guardarProgresoHabito(fechaSeleccionada, h.id, val);
    window.actualizarVistaModalAccion();
    renderizarListaHabitos();
    renderizarCalendario();
};

window.resetearProgreso = function() {
    const h = habitoAccionActual;
    guardarProgresoHabito(fechaSeleccionada, h.id, 0);
    window.actualizarVistaModalAccion();
    renderizarListaHabitos();
    renderizarCalendario();
};

window.reiniciarCronometroConfirmado = function() {
    if (!habitoAccionActual) return;
    if (confirm(`⚠️ ¿Reiniciar la racha de "${habitoAccionActual.nombre}"?`)) {
        window.iniciarCronometro(habitoAccionActual.id);
        window.cerrarModalAccion();
    }
};

window.actualizarCronometrosVivos = function() {
    document.querySelectorAll('.habito-cronometro').forEach(r => {
        const ini = r.getAttribute('data-inicio');
        if (ini && ini !== 'null') {
            r.innerText = window.calcularTiempoLimpio(ini);
            if (habitoAccionActual && `cron-${habitoAccionActual.id}` === r.id) {
                const mod = document.getElementById('cronometro-modal-display');
                if (mod) mod.innerText = window.calcularTiempoLimpio(ini);
            }
        }
    });
};

window.calcularTiempoLimpio = function(iso) {
    const dif = Math.max(0, new Date().getTime() - new Date(iso).getTime());
    const dd = Math.floor(dif / 86400000);
    const hh = Math.floor((dif % 86400000) / 3600000);
    const mm = Math.floor((dif % 3600000) / 60000);
    const ss = Math.floor((dif % 60000) / 1000);
    return `${dd}d ${String(hh).padStart(2,'0')}h ${String(mm).padStart(2,'0')}m ${String(ss).padStart(2,'0')}s`;
};

window.iniciarCronometro = function(id) {
    let d = obtenerDatosHabitosSeguros();
    d.habitos = d.habitos.map(h => {
        if (h.id == id) h.fechaInicio = new Date().toISOString();
        return h;
    });
    guardarHabitosDefinicion(d.habitos);
    renderizarListaHabitos();
};

window.alternarCamposTipo = function() {
    const s    = document.getElementById('seccion-metas');
    const tipo = document.getElementById('habito-tipo').value;
    if (s) s.style.display = tipo === 'cronometro' ? 'none' : 'block';
};

window.cerrarModalHabito = function() {
    document.getElementById('modal-habito-principal').style.display = 'none';
};

window.cerrarModalAccion = function() {
    document.getElementById('modal-accion-habito-ui').style.display = 'none';
    const dr = document.getElementById('dropdown-accion');
    if (dr) dr.style.display = 'none';
};

window.toggleOpcionesAccion = function() {
    const dr = document.getElementById('dropdown-accion');
    if (dr) dr.style.display = dr.style.display === 'block' ? 'none' : 'block';
};

window.borrarHabito = function(id) {
    let d = obtenerDatosHabitosSeguros();
    d.habitos = d.habitos.filter(x => x.id != id);
    guardarHabitosDefinicion(d.habitos);
    document.getElementById('modal-confirmar-habito-borrar').style.display = 'none';
    renderizarListaHabitos();
    renderizarCalendario();
};

window.editarDesdeAccion = function() {
    window.abrirModalHabitoUI(habitoAccionActual.id);
    window.cerrarModalAccion();
};

window.borrarDesdeAccion = function() {
    idHabitoParaBorrar = habitoAccionActual.id;
    window.cerrarModalAccion();
    document.getElementById('modal-confirmar-habito-borrar').style.display = 'flex';
};