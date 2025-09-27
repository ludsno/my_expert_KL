// frontend/js/editor.js

const API_URL = 'http://127.0.0.1:5000';

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
// NOVO: Estado de edição para variáveis
let modoEdicaoVariavel = { ativo: false, nomeOriginal: null };


// --- FUNÇÕES DE APAGAR ---
async function apagarVariavel(nome) {
    if (!confirm(`Tem certeza que deseja apagar a variável "${nome}"?`)) return;
    try {
        const response = await fetch(`${API_URL}/api/variaveis/${encodeURIComponent(nome)}`, { method: 'DELETE' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(`Erro: ${data.erro || 'Falha ao apagar variável.'}`);
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
        const response = await fetch(`${API_URL}/api/regras/${encodeURIComponent(nome)}`, { method: 'DELETE' });
        if (response.ok) {
            cancelarEdicaoRegra();
            carregarRegras();
        } else {
            const data = await response.json().catch(() => ({}));
            alert(`Erro: ${data.erro || 'Falha ao apagar regra.'}`);
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
        li.className = 'lista-item';
        // ALTERADO: Adicionado o botão "Editar"
        li.innerHTML = `
            <span>${v.nome} (${v.tipo})</span>
            <div class="item-acoes">
                <button class="btn-editar">Editar</button>
                <button class="btn-apagar">Apagar</button>
            </div>
        `;
        li.querySelector('.btn-editar').addEventListener('click', () => popularFormularioVariavel(v));
        li.querySelector('.btn-apagar').addEventListener('click', () => apagarVariavel(v.nome));
        listaVariaveis.appendChild(li);
    });
}

function renderizarRegras() {
    listaRegras.innerHTML = '';
    if (regrasDisponiveis.length === 0) {
        listaRegras.innerHTML = '<li>Nenhuma regra cadastrada.</li>';
        return;
    }
    regrasDisponiveis.forEach(r => {
        const seStr = r.condicoes_se.map(c => `${c.variavel} ${c.operador} ${c.valor}`).join(' E ');
        const entaoStr = r.conclusoes_entao.map(c => {
            const fcTxt = c.fc !== 1.0 ? ` (fc=${c.fc})` : '';
            return `${c.variavel} = ${c.valor}${fcTxt}`;
        }).join(', ');
        const li = document.createElement('li');
        li.className = 'lista-item';
        li.innerHTML = `
            <div>
                <strong>${r.nome}:</strong> SE (${seStr}) ENTÃO (${entaoStr})
            </div>
            <div class="item-acoes">
                <button class="btn-editar">Editar</button>
                <button class="btn-apagar">Apagar</button>
            </div>
        `;
        li.querySelector('.btn-editar').addEventListener('click', () => popularFormularioRegra(r));
        li.querySelector('.btn-apagar').addEventListener('click', () => apagarRegra(r.nome));
        listaRegras.appendChild(li);
    });
}

async function carregarVariaveis() {
    try {
        const response = await fetch(`${API_URL}/api/variaveis`);
        variaveisDisponiveis = await response.json();
        renderizarVariaveis();
    } catch (error) {
        console.error('Erro ao carregar variáveis:', error);
        listaVariaveis.innerHTML = '<li>Erro ao carregar.</li>';
    }
}

async function carregarRegras() {
    try {
        const response = await fetch(`${API_URL}/api/regras`);
        regrasDisponiveis = await response.json();
        renderizarRegras();
    } catch (error) {
        console.error('Erro ao carregar regras:', error);
        listaRegras.innerHTML = '<li>Erro ao carregar.</li>';
    }
}

function carregarTudo() {
    // Carrega variáveis primeiro, pois as regras dependem delas nos dropdowns
    carregarVariaveis().then(() => {
        carregarRegras();
    });
}

// --- FUNÇÕES DE EDIÇÃO (Variáveis e Regras) ---

// NOVO: Funções para popular e limpar o formulário de variáveis
function popularFormularioVariavel(variavel) {
    modoEdicaoVariavel.ativo = true;
    modoEdicaoVariavel.nomeOriginal = variavel.nome;

    if (tituloFormVariavel) tituloFormVariavel.textContent = `Editando Variável: "${variavel.nome}"`;
    if (btnSalvarVariavel) btnSalvarVariavel.textContent = 'Salvar Alterações';
    
    document.getElementById('var-nome').value = variavel.nome;
    document.getElementById('var-nome').disabled = true; // Desabilita edição do nome para evitar inconsistências
    document.getElementById('var-tipo').value = variavel.tipo;

    selectVarTipo.dispatchEvent(new Event('change')); 
    
    if (variavel.tipo === 'univalorada') {
        document.getElementById('var-valores').value = variavel.valores_possiveis.join(', ');
    } else if (variavel.tipo === 'numerica') {
        document.getElementById('var-min').value = variavel.min_val || '';
        document.getElementById('var-max').value = variavel.max_val || '';
    }

    formVariavel.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicaoVariavel() {
    modoEdicaoVariavel.ativo = false;
    modoEdicaoVariavel.nomeOriginal = null;
    
    if (tituloFormVariavel) tituloFormVariavel.textContent = 'Adicionar Nova Variável';
    if (btnSalvarVariavel) btnSalvarVariavel.textContent = 'Salvar Variável';
    document.getElementById('var-nome').disabled = false;
    formVariavel.reset();
    selectVarTipo.dispatchEvent(new Event('change'));
}

function popularFormularioRegra(regra) {
    modoEdicaoRegra.ativo = true;
    modoEdicaoRegra.nomeOriginal = regra.nome;
    if (tituloFormRegra) tituloFormRegra.textContent = `Editando Regra: "${regra.nome}"`;
    if (btnSalvarRegra) btnSalvarRegra.textContent = 'Salvar Alterações';
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
    if (tituloFormRegra) tituloFormRegra.textContent = 'Adicionar Nova Regra';
    if (btnSalvarRegra) btnSalvarRegra.textContent = 'Salvar Regra';
    formRegra.reset();
    condicoesSeContainer.innerHTML = '';
    conclusoesEntaoContainer.innerHTML = '';
}

// --- FUNÇÕES DE MANIPULAÇÃO DE FORMULÁRIO ---
// (criarLinhaCondicao permanece igual ao seu código)
function criarLinhaCondicao(condicaoExistente = null, isConclusao = false) {
    const div = document.createElement('div');
    div.className = 'condicao-linha';
    const selectVar = document.createElement('select');
    selectVar.className = 'condicao-variavel';
    variaveisDisponiveis.forEach(v => {
        const option = document.createElement('option');
        option.value = v.nome;
        option.textContent = v.nome;
        selectVar.appendChild(option);
    });
    const selectOp = document.createElement('select');
    selectOp.className = 'condicao-operador';
    const operadores = ['==', '!=', '>', '<', '>=', '<='];
    operadores.forEach(op => {
        const option = document.createElement('option');
        option.value = op;
        option.textContent = op;
        selectOp.appendChild(option);
    });
    const inputValor = document.createElement('input');
    inputValor.type = 'text';
    inputValor.className = 'condicao-valor';
    inputValor.placeholder = 'Valor';
    div.appendChild(selectVar);
    div.appendChild(selectOp);
    div.appendChild(inputValor);
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
        if (isConclusao) {
            div.querySelector('.condicao-fc').value = condicaoExistente.fc;
        }
    }
    return div;
}


// --- HANDLERS DE EVENTOS ---
if(btnAddCondicaoSe) btnAddCondicaoSe.addEventListener('click', () => condicoesSeContainer.appendChild(criarLinhaCondicao(null, false)));
if(btnAddConclusaoEntao) btnAddConclusaoEntao.addEventListener('click', () => conclusoesEntaoContainer.appendChild(criarLinhaCondicao(null, true)));

// CORRIGIDO: Handler de submit do formulário de variável
formVariavel.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('var-nome').value;
    const tipo = document.getElementById('var-tipo').value;
    const payload = { nome, tipo, valores_possiveis: [], min_val: null, max_val: null };
    if (tipo === 'univalorada') {
        const valores = document.getElementById('var-valores').value.split(',').map(v => v.trim());
        payload.valores_possiveis = valores.filter(v => v);
    } else if (tipo === 'numerica') {
        const min = document.getElementById('var-min').value;
        const max = document.getElementById('var-max').value;
        if (min) payload.min_val = parseFloat(min);
        if (max) payload.max_val = parseFloat(max);
    }
    let url = `${API_URL}/api/variaveis`;
    let method = 'POST';
    if (modoEdicaoVariavel.ativo) {
        url = `${API_URL}/api/variaveis/${encodeURIComponent(modoEdicaoVariavel.nomeOriginal)}`;
        method = 'PUT';
    }
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            cancelarEdicaoVariavel();
            carregarTudo();
        } else {
            const data = await response.json().catch(() => ({}));
            alert(`Erro ao salvar variável: ${data.erro || 'Falha ao salvar.'}`);
        }
    } catch (error) {
        console.error('Erro ao salvar variável:', error);
    }
});


// Handler de submit do formulário de regra (seu código já estava bom, pequenas melhorias)
formRegra.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('regra-nome').value;
    const condicoes_se = Array.from(condicoesSeContainer.querySelectorAll('.condicao-linha')).map(linha => ({
        variavel: linha.querySelector('.condicao-variavel').value,
        operador: linha.querySelector('.condicao-operador').value,
        valor: linha.querySelector('.condicao-valor').value
    }));
    const conclusoes_entao = Array.from(conclusoesEntaoContainer.querySelectorAll('.condicao-linha')).map(linha => ({
        variavel: linha.querySelector('.condicao-variavel').value,
        operador: '==',
        valor: linha.querySelector('.condicao-valor').value,
        fc: parseFloat(linha.querySelector('.condicao-fc').value) || 1.0
    }));
    if (condicoes_se.length === 0 || conclusoes_entao.length === 0) {
        alert('Uma regra deve ter pelo menos uma condição e uma conclusão.');
        return;
    }
    const payload = { nome, condicoes_se, conclusoes_entao };
    let url = `${API_URL}/api/regras`;
    let method = 'POST';
    if (modoEdicaoRegra.ativo) {
        url = `${API_URL}/api/regras/${encodeURIComponent(modoEdicaoRegra.nomeOriginal)}`;
        method = 'PUT';
    }
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            cancelarEdicaoRegra();
            carregarRegras();
        } else {
            const data = await response.json().catch(() => ({}));
            alert(`Erro ao salvar regra: ${data.erro || 'Falha ao salvar.'}`);
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
document.addEventListener('DOMContentLoaded', carregarTudo);