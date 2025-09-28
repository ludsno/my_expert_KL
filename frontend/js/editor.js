// frontend/js/editor.js

const API_URL = 'http://127.0.0.1:5000';
let kbAtiva = null; // Compartilhar escolha de KB (idealmente sincronizar com index via armazenamento local)
// Tenta recuperar KB ativa do localStorage se existir
try { kbAtiva = localStorage.getItem('kbAtiva') || null; } catch(e) {}

// --- Mapeamento de Elementos ---
const formVariavel = document.getElementById('form-variavel');
const listaVariaveis = document.getElementById('lista-variaveis');
const formRegra = document.getElementById('form-regra');
const listaRegras = document.getElementById('lista-regras');
const btnAddCondicaoSe = document.getElementById('btn-add-condicao-se');
const btnAddConclusaoEntao = document.getElementById('btn-add-conclusao-entao');
const condicoesSeContainer = document.getElementById('condicoes-se');
const conclusoesEntaoContainer = document.getElementById('conclusoes-entao');

// Mapeamento para Edição de Regras
const tituloFormRegra = formRegra ? formRegra.querySelector('h3') : null;
const btnSalvarRegra = formRegra ? formRegra.querySelector('.btn-salvar-regra') : null;

// Mapeamento para Edição de Variáveis
const tituloFormVariavel = formVariavel ? formVariavel.querySelector('h3') : null;
const btnSalvarVariavel = formVariavel ? formVariavel.querySelector('button[type="submit"]') : null;
const selectVarTipo = document.getElementById('var-tipo');
const campoValoresPossiveis = document.getElementById('campo-valores-possiveis');
const campoRangeNumerico = document.getElementById('campo-range-numerico');

// --- Variáveis de Estado ---
let variaveisDisponiveis = [];
let regrasDisponiveis = [];
let modoEdicaoRegra = { ativo: false, nomeOriginal: null };
let modoEdicaoVariavel = { ativo: false, nomeOriginal: null };

// --- FUNÇÕES DE APAGAR ---
async function apagarVariavel(nome) {
    if (!confirm(`Tem certeza que deseja apagar a variável "${nome}"?`)) return;
    try {
    if (!kbAtiva) { alert('Selecione uma KB na tela principal antes de editar.'); return; }
    const response = await fetch(`${API_URL}/api/variaveis/${encodeURIComponent(nome)}?kb=${encodeURIComponent(kbAtiva)}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) {
            alert(`Erro: ${data.erro}`);
        } else {
            carregarTudo();
        }
    } catch (error) {
        console.error('Erro ao apagar variável:', error);
    }
}

async function apagarRegra(nome) {
    if (!confirm(`Tem certeza que deseja apagar a regra "${nome}"?`)) return;
    try {
    if (!kbAtiva) { alert('Selecione uma KB na tela principal antes de editar.'); return; }
    const response = await fetch(`${API_URL}/api/regras/${encodeURIComponent(nome)}?kb=${encodeURIComponent(kbAtiva)}`, { method: 'DELETE' });
        if (response.ok) {
            cancelarEdicaoRegra();
            carregarRegras();
        } else {
            const data = await response.json();
            alert(`Erro: ${data.erro}`);
        }
    } catch (error) {
        console.error('Erro ao apagar regra:', error);
    }
}

// --- FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO ---
function renderizarVariaveis() {
    listaVariaveis.innerHTML = '';
    if (variaveisDisponiveis.length === 0) {
        listaVariaveis.innerHTML = '<li>Nenhuma variável cadastrada.</li>';
        return;
    }
    variaveisDisponiveis.forEach(v => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${v.nome} <small style="opacity:.6">(${v.tipo})</small></span>
            <div class="item-acoes">
                <button class="btn-editar" title="Editar">Editar</button>
                <button class="btn-apagar" title="Apagar">Apagar</button>
            </div>
        `;
        li.querySelector('.btn-editar').addEventListener('click', () => popularFormularioVariavel(v));
        li.querySelector('.btn-apagar').addEventListener('click', () => apagarVariavel(v.nome));
        listaVariaveis.appendChild(li);
    });
}

function renderizarRegras() {
    listaRegras.innerHTML = '';
    regrasDisponiveis.forEach(r => {
        const seStr = r.condicoes_se.map(c => `${c.variavel} ${c.operador} ${c.valor}`).join(' E ');
        const entaoStr = r.conclusoes_entao.map(c => `${c.variavel} = ${c.valor}`).join(', ');
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="flex:1;">
                <strong>${r.nome}</strong><br>
                <span style="font-size:.7rem;opacity:.75">SE (${seStr})<br>ENTÃO (${entaoStr})</span>
            </div>
            <div class="item-acoes">
                <button class="btn-editar" title="Editar">Editar</button>
                <button class="btn-apagar" title="Apagar">Apagar</button>
            </div>
        `;
        li.querySelector('.btn-editar').addEventListener('click', () => popularFormularioRegra(r));
        li.querySelector('.btn-apagar').addEventListener('click', () => apagarRegra(r.nome));
        listaRegras.appendChild(li);
    });
}

async function carregarVariaveis() {
    try {
    if (!kbAtiva) { listaVariaveis.innerHTML = '<li>Selecione uma KB primeiro.</li>'; return; }
    const response = await fetch(`${API_URL}/api/variaveis?kb=${encodeURIComponent(kbAtiva)}`);
        variaveisDisponiveis = await response.json();
        renderizarVariaveis();
    } catch (error) {
        console.error('Erro ao carregar variáveis:', error);
        listaVariaveis.innerHTML = '<li>Erro ao carregar.</li>';
    }
}

async function carregarRegras() {
    try {
    if (!kbAtiva) { listaRegras.innerHTML = '<li>Selecione uma KB primeiro.</li>'; return; }
    const response = await fetch(`${API_URL}/api/regras?kb=${encodeURIComponent(kbAtiva)}`);
        regrasDisponiveis = await response.json();
        renderizarRegras();
    } catch (error) {
        console.error('Erro ao carregar regras:', error);
    }
}

function carregarTudo() {
    carregarVariaveis().then(carregarRegras);
}

// --- FUNÇÕES DE EDIÇÃO ---
function popularFormularioVariavel(variavel) {
    modoEdicaoVariavel.ativo = true;
    modoEdicaoVariavel.nomeOriginal = variavel.nome;
    tituloFormVariavel.textContent = `Editando Variável: "${variavel.nome}"`;
    btnSalvarVariavel.textContent = 'Salvar Alterações';
    document.getElementById('var-nome').value = variavel.nome;
    document.getElementById('var-nome').disabled = true;
    document.getElementById('var-tipo').value = variavel.tipo;
    selectVarTipo.dispatchEvent(new Event('change'));
    if (variavel.tipo === 'univalorada') {
        document.getElementById('var-valores').value = variavel.valores_possiveis.join(', ');
    } else if (variavel.tipo === 'numerica') {
        document.getElementById('var-min').value = variavel.min_val || '';
        document.getElementById('var-max').value = variavel.max_val || '';
    }
    document.getElementById('var-pergunta').value = variavel.pergunta || '';
    document.getElementById('var-explicacao').value = variavel.explicacao || '';
    formVariavel.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicaoVariavel() {
    modoEdicaoVariavel.ativo = false;
    modoEdicaoVariavel.nomeOriginal = null;
    tituloFormVariavel.textContent = 'Adicionar Nova Variável';
    btnSalvarVariavel.textContent = 'Salvar Variável';
    document.getElementById('var-nome').disabled = false;
    formVariavel.reset();
    selectVarTipo.dispatchEvent(new Event('change'));
}

function popularFormularioRegra(regra) {
    modoEdicaoRegra.ativo = true;
    modoEdicaoRegra.nomeOriginal = regra.nome;
    tituloFormRegra.textContent = `Editando Regra: "${regra.nome}"`;
    btnSalvarRegra.textContent = 'Salvar Alterações';
    document.getElementById('regra-nome').value = regra.nome;
    condicoesSeContainer.innerHTML = '';
    conclusoesEntaoContainer.innerHTML = '';
    regra.condicoes_se.forEach(cond => condicoesSeContainer.appendChild(criarLinhaCondicao(cond, false)));
    regra.conclusoes_entao.forEach(conc => conclusoesEntaoContainer.appendChild(criarLinhaCondicao(conc, true)));
    formRegra.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicaoRegra() {
    modoEdicaoRegra.ativo = false;
    modoEdicaoRegra.nomeOriginal = null;
    tituloFormRegra.textContent = 'Adicionar Nova Regra';
    btnSalvarRegra.textContent = 'Salvar Regra';
    formRegra.reset();
    condicoesSeContainer.innerHTML = '';
    conclusoesEntaoContainer.innerHTML = '';
}

// --- FUNÇÕES DE MANIPULAÇÃO DE FORMULÁRIO ---
function criarLinhaCondicao(condicaoExistente = null, isConclusao = false) {
    const div = document.createElement('div');
    div.className = 'condicao-linha';
    const selectVar = document.createElement('select');
    selectVar.className = 'condicao-variavel';
    variaveisDisponiveis.forEach(v => {
        selectVar.add(new Option(v.nome, v.nome));
    });
    const selectOp = document.createElement('select');
    selectOp.className = 'condicao-operador';
    ['==', '!=', '>', '<', '>=', '<='].forEach(op => {
        selectOp.add(new Option(op, op));
    });
    const inputValor = document.createElement('input');
    inputValor.type = 'text';
    inputValor.className = 'condicao-valor';
    inputValor.placeholder = 'Valor';
    div.append(selectVar, selectOp, inputValor);
    if (isConclusao) {
        selectOp.style.display = 'none';
        const inputFC = document.createElement('input');
        inputFC.type = 'number';
        inputFC.className = 'condicao-fc';
        inputFC.placeholder = 'FC (0.0 a 1.0)';
        inputFC.min = 0;
        inputFC.max = 1;
        inputFC.step = 0.1;
        inputFC.value = '1.0';
        div.appendChild(inputFC);
    }
    if (condicaoExistente) {
        selectVar.value = condicaoExistente.variavel;
        if (selectOp.style.display !== 'none') selectOp.value = condicaoExistente.operador;
        inputValor.value = condicaoExistente.valor;
        if (isConclusao) div.querySelector('.condicao-fc').value = condicaoExistente.fc;
    }
    return div;
}

// --- HANDLERS DE EVENTOS ---
btnAddCondicaoSe.addEventListener('click', () => condicoesSeContainer.appendChild(criarLinhaCondicao(null, false)));
btnAddConclusaoEntao.addEventListener('click', () => conclusoesEntaoContainer.appendChild(criarLinhaCondicao(null, true)));

formVariavel.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('var-nome').value;
    const tipo = document.getElementById('var-tipo').value;
    const pergunta = document.getElementById('var-pergunta').value;
    const payload = {
        nome,
        tipo,
        valores_possiveis: [],
        min_val: null,
        max_val: null,
        pergunta,
        explicacao: document.getElementById('var-explicacao').value
    };
    if (tipo === 'univalorada') {
        payload.valores_possiveis = document.getElementById('var-valores').value.split(',').map(v => v.trim()).filter(v => v);
    } else if (tipo === 'numerica') {
        const min = document.getElementById('var-min').value;
        const max = document.getElementById('var-max').value;
        if (min) payload.min_val = parseFloat(min);
        if (max) payload.max_val = parseFloat(max);
    }
    if (!kbAtiva) { alert('Selecione uma KB antes de salvar.'); return; }
    let url = `${API_URL}/api/variaveis?kb=${encodeURIComponent(kbAtiva)}`;
    let method = 'POST';
    if (modoEdicaoVariavel.ativo) {
    url = `${API_URL}/api/variaveis/${encodeURIComponent(modoEdicaoVariavel.nomeOriginal)}?kb=${encodeURIComponent(kbAtiva)}`;
        method = 'PUT';
    }
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            cancelarEdicaoVariavel();
            carregarTudo();
        } else {
            const data = await response.json();
            alert(`Erro ao salvar variável: ${data.erro}`);
        }
    } catch (error) {
        console.error('Erro ao salvar variável:', error);
    }
});

formRegra.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nome: document.getElementById('regra-nome').value,
        condicoes_se: Array.from(condicoesSeContainer.querySelectorAll('.condicao-linha')).map(l => ({
            variavel: l.querySelector('.condicao-variavel').value,
            operador: l.querySelector('.condicao-operador').value,
            valor: l.querySelector('.condicao-valor').value
        })),
        conclusoes_entao: Array.from(conclusoesEntaoContainer.querySelectorAll('.condicao-linha')).map(l => ({
            variavel: l.querySelector('.condicao-variavel').value,
            operador: '==',
            valor: l.querySelector('.condicao-valor').value,
            fc: parseFloat(l.querySelector('.condicao-fc').value) || 1.0
        }))
    };
    if (payload.condicoes_se.length === 0 || payload.conclusoes_entao.length === 0) {
        alert('Uma regra precisa de condições e conclusões.');
        return;
    }
    if (!kbAtiva) { alert('Selecione uma KB antes de salvar.'); return; }
    let url = `${API_URL}/api/regras?kb=${encodeURIComponent(kbAtiva)}`;
    let method = 'POST';
    if (modoEdicaoRegra.ativo) {
    url = `${API_URL}/api/regras/${encodeURIComponent(modoEdicaoRegra.nomeOriginal)}?kb=${encodeURIComponent(kbAtiva)}`;
        method = 'PUT';
    }
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            cancelarEdicaoRegra();
            carregarRegras();
        } else {
            const data = await response.json();
            alert(`Erro ao salvar regra: ${data.erro}`);
        }
    } catch (error) {
        console.error('Erro ao salvar regra:', error);
    }
});

selectVarTipo.addEventListener('change', () => {
    const tipo = selectVarTipo.value;
    campoValoresPossiveis.classList.toggle('hidden', tipo !== 'univalorada');
    campoRangeNumerico.classList.toggle('hidden', tipo !== 'numerica');
});

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Atualiza kbAtiva a partir do localStorage sempre que abrir o editor
    try { kbAtiva = localStorage.getItem('kbAtiva') || kbAtiva; } catch(e) {}
    // Status bar elementos (se existirem)
    const statusKb = document.getElementById('status-kb');
    const statusModo = document.getElementById('status-modo');
    const statusObjetivo = document.getElementById('status-objetivo');
    if (statusKb) statusKb.textContent = kbAtiva ? `KB: ${kbAtiva}` : 'KB: (nenhuma)';
    if (statusModo) statusModo.textContent = 'Modo: Editor';
    if (statusObjetivo) statusObjetivo.textContent = 'Objetivo: -';
    carregarTudo();
});