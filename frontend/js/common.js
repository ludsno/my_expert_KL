// frontend/js/common.js
// Utilidades compartilhadas entre páginas
const API_URL = 'http://127.0.0.1:5000';

function getKbAtiva() {
    try { return localStorage.getItem('kbAtiva'); } catch (e) { return null; }
}
function setKbAtiva(nome) {
    try { localStorage.setItem('kbAtiva', nome); } catch (e) { }
    atualizarStatusBar({ kb: nome });
}

function atualizarStatusBar({ kb, modo, objetivo } = {}) {
    const elKb = document.getElementById('status-kb');
    const elModo = document.getElementById('status-modo');
    const elObj = document.getElementById('status-objetivo');
    if (elKb && kb !== undefined) elKb.textContent = kb ? `KB: ${kb}` : 'KB: (nenhuma)';
    if (elModo && modo !== undefined) elModo.textContent = `Modo: ${modo || '-'}`;
    if (elObj && objetivo !== undefined) elObj.textContent = `Objetivo: ${objetivo || '-'}`;
}

function exigirKbAtiva(callbackSeTem, callbackSeNao) {
    const kb = getKbAtiva();
    if (!kb) {
        if (typeof callbackSeNao === 'function') callbackSeNao();
        return null;
    }
    if (typeof callbackSeTem === 'function') callbackSeTem(kb);
    return kb;
}
