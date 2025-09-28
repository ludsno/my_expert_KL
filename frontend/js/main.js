// --- Forward Chaining em modo chat ---
let forwardChatVars = [];
let forwardChatFatos = {};
let forwardChatIndex = 0;

function iniciarForwardChat() {
    forwardChatVars = Object.keys(todasAsVariaveis);
    forwardChatFatos = {};
    forwardChatIndex = 0;
    secaoInicio.classList.add('hidden');
    secaoConsulta.classList.remove('hidden');
    dialogoBox.innerHTML = '';
    areaInputUsuario.innerHTML = '';
    perguntarProximaForward();
}

function perguntarProximaForward() {
    if (forwardChatIndex >= forwardChatVars.length) {
        // Envia fatos para dedução
        secaoConsulta.classList.add('hidden');
        consultaForward(forwardChatFatos);
        return;
    }
    const varName = forwardChatVars[forwardChatIndex];
    const detalhe = todasAsVariaveis[varName];
    adicionarMensagem(`Sistema: ${detalhe.pergunta && detalhe.pergunta.trim() ? detalhe.pergunta : `Informe o valor para ${varName}`}`, 'sistema');
    areaInputUsuario.innerHTML = '';
    let inputElement;
    if (detalhe.tipo === 'univalorada' && detalhe.valores_possiveis.length > 0) {
        inputElement = document.createElement('select');
        inputElement.id = 'input-forward-chat';
        const blankOption = document.createElement('option');
        blankOption.value = '';
        blankOption.textContent = '(deixe em branco)';
        inputElement.appendChild(blankOption);
        detalhe.valores_possiveis.forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            inputElement.appendChild(option);
        });
    } else {
        inputElement = document.createElement('input');
        inputElement.type = detalhe.tipo === 'numerica' ? 'number' : 'text';
        inputElement.id = 'input-forward-chat';
        inputElement.placeholder = 'Digite o valor aqui...';
        if (detalhe.tipo === 'numerica') {
            if (detalhe.min_val !== null && detalhe.min_val !== undefined) inputElement.min = detalhe.min_val;
            if (detalhe.max_val !== null && detalhe.max_val !== undefined) inputElement.max = detalhe.max_val;
        }
    }
    areaInputUsuario.appendChild(inputElement);
    let avisoRange = null;
    let minVal = null, maxVal = null;
    if (detalhe.tipo === 'numerica') {
        minVal = (detalhe.min_val !== null && detalhe.min_val !== undefined) ? Number(detalhe.min_val) : null;
        maxVal = (detalhe.max_val !== null && detalhe.max_val !== undefined) ? Number(detalhe.max_val) : null;
        avisoRange = document.createElement('div');
        avisoRange.className = 'msg-range';
        let baseMsgRange = '';
        if (minVal !== null || maxVal !== null) {
            const partes = [];
            if (minVal !== null) partes.push(`mínimo ${minVal}`);
            if (maxVal !== null) partes.push(`máximo ${maxVal}`);
            baseMsgRange = `Informe um valor ${partes.join(' e ')}`;
            avisoRange.textContent = baseMsgRange;
        }
        areaInputUsuario.appendChild(avisoRange);
    }
    const btnEnviar = document.createElement('button');
    btnEnviar.textContent = 'Enviar';
    btnEnviar.onclick = () => {
        const valor = inputElement.value;
        // Permite pular variável (deixar em branco)
        if (valor.trim() !== '') {
            if (detalhe.tipo === 'numerica') {
                const num = Number(valor);
                if ((minVal !== null && num < minVal) || (maxVal !== null && num > maxVal)) {
                    alert('Valor fora do intervalo permitido.');
                    return;
                }
            }
            adicionarMensagem(`Você: ${valor}`, 'usuario');
            forwardChatFatos[varName] = valor.trim();
        } else {
            adicionarMensagem('Você pulou esta variável.', 'usuario');
        }
        forwardChatIndex++;
        perguntarProximaForward();
    };
    areaInputUsuario.appendChild(btnEnviar);

    // Botão "O que isso significa?" (Explica a VARIÁVEL)
    const btnExplicacao = document.createElement('button');
    btnExplicacao.textContent = 'O que isso significa?';
    btnExplicacao.className = 'btn-explicacao';
    if (!detalhe.explicacao || !detalhe.explicacao.trim()) {
        btnExplicacao.disabled = true;
        btnExplicacao.title = 'Nenhuma explicação disponível para esta variável.';
    }
    btnExplicacao.onclick = () => {
        alert(detalhe.explicacao);
    };
    areaInputUsuario.appendChild(btnExplicacao);
    // Enter para enviar
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            btnEnviar.click();
        }
    });
    if (detalhe.tipo === 'numerica') {
        inputElement.addEventListener('input', () => {
            const v = inputElement.value.trim();
            if (v === '') { btnEnviar.disabled = false; avisoRange?.classList.remove('erro'); return; }
            const num = Number(v);
            let invalido = false;
            if (minVal !== null && num < minVal) invalido = true;
            if (maxVal !== null && num > maxVal) invalido = true;
            if (invalido) {
                btnEnviar.disabled = true;
                if (avisoRange) { avisoRange.textContent = `Fora do intervalo (${minVal !== null ? 'mín ' + minVal : ''}${(minVal!==null&&maxVal!==null)?' / ':''}${maxVal !== null ? 'máx ' + maxVal : ''})`; avisoRange.classList.add('erro'); }
            } else {
                btnEnviar.disabled = false;
                if (avisoRange) { avisoRange.textContent = baseMsgRange; avisoRange.classList.remove('erro'); }
            }
        });
    }
    inputElement.focus();
}

async function consultaForward(fatos) {
    try {
        if (!kbAtiva) { alert('Selecione uma KB antes de consultar.'); return; }
        const response = await fetch(`${API_URL}/api/consulta/forward?kb=${encodeURIComponent(kbAtiva)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fatos })
        });
        const data = await response.json();
        mostrarResultadoForward(data);
    } catch (error) {
        resultadoFinal.textContent = 'Erro de comunicação com o servidor.';
        explicacaoComo.innerHTML = '';
    }
}

function mostrarResultadoForward(data) {
    secaoConsulta.classList.add('hidden');
    secaoResultado.classList.remove('hidden');
    let html = '<b>Fatos deduzidos:</b><ul>';
    for (const [varName, valor] of Object.entries(data.fatos)) {
        html += `<li><b>${varName}:</b> ${valor}</li>`;
    }
    html += '</ul>';
    resultadoFinal.innerHTML = html;
    explicacaoComo.innerHTML = '';
    if (data.explicacao_como && data.explicacao_como.length > 0) {
        data.explicacao_como.forEach(regra => {
            const li = document.createElement('li');
            li.textContent = regra;
            explicacaoComo.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'Nenhuma regra foi utilizada.';
        explicacaoComo.appendChild(li);
    }
}
const secaoForward = document.getElementById('secao-forward');
const formForward = document.getElementById('form-forward');
const inputsForward = document.getElementById('inputs-forward');
const btnCancelarForward = document.getElementById('btn-cancelar-forward');

function mostrarFormularioForward() {
    secaoInicio.classList.add('hidden');
    secaoConsulta.classList.add('hidden');
    secaoResultado.classList.add('hidden');
    secaoForward.classList.remove('hidden');
    inputsForward.innerHTML = '';
    for (const varName in todasAsVariaveis) {
        const detalhe = todasAsVariaveis[varName];
        const div = document.createElement('div');
        div.className = 'form-group';
        const label = document.createElement('label');
        label.textContent = detalhe.pergunta && detalhe.pergunta.trim() ? detalhe.pergunta : `Informe o valor para ${varName}`;
        label.htmlFor = `forward-${varName}`;
        div.appendChild(label);
        let input;
        if (detalhe.tipo === 'univalorada' && detalhe.valores_possiveis.length > 0) {
            input = document.createElement('select');
            input.id = `forward-${varName}`;
            input.name = varName;
            input.innerHTML = '<option value="">(deixe em branco)</option>';
            detalhe.valores_possiveis.forEach(val => {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = val;
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.type = detalhe.tipo === 'numerica' ? 'number' : 'text';
            input.id = `forward-${varName}`;
            input.name = varName;
            input.placeholder = '(deixe em branco)';
            if (detalhe.tipo === 'numerica') {
                if (detalhe.min_val !== null && detalhe.min_val !== undefined) {
                    input.min = detalhe.min_val;
                }
                if (detalhe.max_val !== null && detalhe.max_val !== undefined) {
                    input.max = detalhe.max_val;
                }
            }
        }
        div.appendChild(input);
        inputsForward.appendChild(div);
    }
}

formForward.addEventListener('submit', function(e) {
    e.preventDefault();
    const fatos = {};
    for (const varName in todasAsVariaveis) {
        const input = formForward.querySelector(`[name="${varName}"]`);
        if (input && input.value.trim() !== '') {
            fatos[varName] = input.value.trim();
        }
    }
    secaoForward.classList.add('hidden');
    consultaForward(fatos);
});

btnCancelarForward.addEventListener('click', function() {
    secaoForward.classList.add('hidden');
    secaoInicio.classList.remove('hidden');
});
// frontend/js/main.js

// --- Configurações e Variáveis Globais ---
// API_URL deve vir de common.js. A linha antiga usava "const API_URL = typeof API_URL..." que gerava
// ReferenceError (TDZ) em alguns navegadores por causa do uso de const antes da declaração.
// Aqui garantimos um fallback seguro sem redeclarar se já existir.
if (typeof window !== 'undefined' && typeof window.API_URL === 'undefined') {
    window.API_URL = 'http://127.0.0.1:5000';
}
// Obtém KB ativa se função existir (common.js carregado antes)
let kbAtiva = (typeof getKbAtiva === 'function') ? getKbAtiva() : null;

// Mapeamento dos elementos do HTML
const secaoInicio = document.getElementById('secao-inicio');
const secaoConsulta = document.getElementById('secao-consulta');
const secaoResultado = document.getElementById('secao-resultado');

const selectObjetivo = document.getElementById('select-objetivo');
const btnIniciar = document.getElementById('btn-iniciar');
const btnNovaConsulta = document.getElementById('btn-nova-consulta');
// Status bar elementos (podem não existir em versões antigas)
const statusKb = document.getElementById('status-kb');
const statusModo = document.getElementById('status-modo');
const statusObjetivo = document.getElementById('status-objetivo');

const dialogoBox = document.getElementById('dialogo-box');
const areaInputUsuario = document.getElementById('area-input-usuario');
const resultadoFinal = document.getElementById('resultado-final');
const explicacaoComo = document.getElementById('explicacao-como');

// Variáveis de estado
let estadoConsulta = {
    objetivo: null,
    variavelAtual: null,
    contextoPorque: null,
    explicacaoAtual: null,
};
let todasAsVariaveis = {}; // Cache para guardar detalhes das variáveis

// Desabilita o botão iniciar até que condições sejam satisfeitas
btnIniciar.disabled = true;

function atualizarEstadoBotaoIniciar() {
    // Habilita apenas se houver KB ativa e um objetivo selecionado (não vazio)
    const objetivoVal = selectObjetivo.value && selectObjetivo.value.trim();
    btnIniciar.disabled = !(kbAtiva && objetivoVal);
}

// --- Funções de Comunicação com a API ---

async function buscarVariaveis() {
    if (!kbAtiva) {
        selectObjetivo.innerHTML = '<option>Selecione uma KB primeiro</option>';
        selectObjetivo.disabled = true;
        atualizarEstadoBotaoIniciar();
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/variaveis?kb=${encodeURIComponent(kbAtiva)}`);
        const variaveisArray = await response.json();
        
        // Limpa e preenche o cache de variáveis
        todasAsVariaveis = {};
        variaveisArray.forEach(v => {
            todasAsVariaveis[v.nome] = v;
        });

        // Preenche o <select> com as variáveis
        selectObjetivo.innerHTML = '<option value="">Selecione um objetivo...</option>';
        variaveisArray.forEach(v => {
            const option = document.createElement('option');
            option.value = v.nome;
            option.textContent = v.nome;
            selectObjetivo.appendChild(option);
        });
        selectObjetivo.disabled = false;
        atualizarEstadoBotaoIniciar();
        if (statusObjetivo) statusObjetivo.textContent = 'Objetivo: -';
    } catch (error) {
        console.error("Erro ao carregar variáveis:", error);
        selectObjetivo.innerHTML = '<option>Erro ao carregar</option>';
        atualizarEstadoBotaoIniciar();
    }
}

async function iniciarConsulta(objetivo) {
    if (!kbAtiva) { alert('Selecione uma KB antes.'); return; }
    try {
        const response = await fetch(`${API_URL}/api/consulta/iniciar?kb=${encodeURIComponent(kbAtiva)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objetivo })
        });
        const data = await response.json();
        processarRespostaAPI(data);
    } catch (error) {
        console.error("Erro ao iniciar consulta:", error);
        adicionarMensagem('Erro de comunicação com o servidor.', 'sistema');
    }
}

async function enviarResposta(valor) {
    try {
        const response = await fetch(`${API_URL}/api/consulta/responder?kb=${encodeURIComponent(kbAtiva)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variavel: estadoConsulta.variavelAtual, valor })
        });
        const data = await response.json();
        processarRespostaAPI(data);
    } catch (error) {
        console.error("Erro ao enviar resposta:", error);
        adicionarMensagem('Erro de comunicação com o servidor.', 'sistema');
    }
}

// --- Funções de Manipulação da Interface ---

function adicionarMensagem(texto, tipo) {
    const div = document.createElement('div');
    div.className = `mensagem mensagem-${tipo}`;
    div.textContent = texto;
    dialogoBox.appendChild(div);
    dialogoBox.scrollTop = dialogoBox.scrollHeight;
}

function processarRespostaAPI(data) {
    if (data.erro) {
        adicionarMensagem(`Erro do sistema: ${data.erro}`, 'sistema');
        return;
    }

    if (data.tipo === 'pergunta') {
        estadoConsulta.variavelAtual = data.variavel;
    estadoConsulta.contextoPorque = data.contexto_regra;
        estadoConsulta.explicacaoAtual = data.explicacao_texto;
        // Mostra pergunta personalizada se existir, senão texto padrão
        const pergunta = data.pergunta_texto && data.pergunta_texto.trim() ? data.pergunta_texto : `Por favor, informe o valor para "${data.variavel}".`;
        adicionarMensagem(`Sistema: ${pergunta}`, 'sistema');
        renderizarInputUsuario();
    } else if (data.tipo === 'resultado') {
        mostrarResultado(data);
    }
}

function renderizarInputUsuario() {
    areaInputUsuario.innerHTML = ''; // Limpa a área
    const detalheVariavel = todasAsVariaveis[estadoConsulta.variavelAtual];

    // Cria o input (texto, número ou select)
    let inputElement;
    if (detalheVariavel && detalheVariavel.tipo === 'univalorada' && detalheVariavel.valores_possiveis.length > 0) {
        inputElement = document.createElement('select');
        detalheVariavel.valores_possiveis.forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            inputElement.appendChild(option);
        });
    } else {
        inputElement = document.createElement('input');
        inputElement.type = (detalheVariavel && detalheVariavel.tipo === 'numerica') ? 'number' : 'text';
        inputElement.placeholder = 'Digite o valor aqui...';
    }
    inputElement.id = 'input-resposta';
    areaInputUsuario.appendChild(inputElement);
    let avisoRange = null;
    let minVal = null, maxVal = null;
    if (detalheVariavel && detalheVariavel.tipo === 'numerica') {
        minVal = (detalheVariavel.min_val !== null && detalheVariavel.min_val !== undefined) ? Number(detalheVariavel.min_val) : null;
        maxVal = (detalheVariavel.max_val !== null && detalheVariavel.max_val !== undefined) ? Number(detalheVariavel.max_val) : null;
        if (minVal !== null) inputElement.min = minVal;
        if (maxVal !== null) inputElement.max = maxVal;
        avisoRange = document.createElement('div');
        avisoRange.className = 'msg-range';
        let baseMsgRange = '';
        if (minVal !== null || maxVal !== null) {
            const partes = [];
            if (minVal !== null) partes.push(`mínimo ${minVal}`);
            if (maxVal !== null) partes.push(`máximo ${maxVal}`);
            baseMsgRange = `Informe um valor ${partes.join(' e ')}`;
            avisoRange.textContent = baseMsgRange;
        }
        areaInputUsuario.appendChild(avisoRange);
    }

    // Cria o botão de enviar
    const btnEnviar = document.createElement('button');
    btnEnviar.textContent = 'Enviar Resposta';
    btnEnviar.onclick = () => {
        const valor = inputElement.value;
        if (valor.trim() === '') {
            alert('Por favor, informe um valor.');
            return;
        }
        if (detalheVariavel && detalheVariavel.tipo === 'numerica') {
            const num = Number(valor);
            if ((minVal !== null && num < minVal) || (maxVal !== null && num > maxVal)) {
                alert('Valor fora do intervalo permitido.');
                return;
            }
        }
        adicionarMensagem(`Você: ${valor}`, 'usuario');
        enviarResposta(valor);
        areaInputUsuario.innerHTML = '<p>Processando...</p>';
    };
    areaInputUsuario.appendChild(btnEnviar);

    // Botão "O que isso significa?" (Explica a VARIÁVEL)
    const btnExplicacao = document.createElement('button');
    btnExplicacao.textContent = 'O que isso significa?';
    btnExplicacao.className = 'btn-explicacao'; // Para estilização
    // Desabilita o botão se não houver explicação cadastrada
    if (!estadoConsulta.explicacaoAtual) {
        btnExplicacao.disabled = true;
        btnExplicacao.title = 'Nenhuma explicação disponível para esta variável.';
    }
    btnExplicacao.onclick = () => {
        alert(estadoConsulta.explicacaoAtual);
    };
    areaInputUsuario.appendChild(btnExplicacao);
    // Enviar com Enter (sem Shift) para melhorar fluxo
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            btnEnviar.click();
        }
    });
    if (detalheVariavel && detalheVariavel.tipo === 'numerica') {
        inputElement.addEventListener('input', () => {
            const v = inputElement.value.trim();
            if (v === '') { btnEnviar.disabled = true; avisoRange?.classList.remove('erro'); return; }
            const num = Number(v);
            let invalido = false;
            if (minVal !== null && num < minVal) invalido = true;
            if (maxVal !== null && num > maxVal) invalido = true;
            if (invalido) {
                btnEnviar.disabled = true;
                if (avisoRange) { avisoRange.textContent = `Fora do intervalo (${minVal !== null ? 'mín ' + minVal : ''}${(minVal!==null&&maxVal!==null)?' / ':''}${maxVal !== null ? 'máx ' + maxVal : ''})`; avisoRange.classList.add('erro'); }
            } else {
                btnEnviar.disabled = false;
                if (avisoRange) { avisoRange.textContent = baseMsgRange; avisoRange.classList.remove('erro'); }
            }
        });
        // força checagem inicial
        inputElement.dispatchEvent(new Event('input'));
    }
    inputElement.focus();
}

function mostrarResultado(data) {
    secaoConsulta.classList.add('hidden');
    secaoResultado.classList.remove('hidden');

    const valorFinal = data.valor !== null ? data.valor : "Não foi possível determinar";
    const certezaPercentual = (data.cf * 100).toFixed(0);
    
    resultadoFinal.textContent = `Conclusão: ${data.objetivo} = ${valorFinal} (Certeza: ${certezaPercentual}%)`;
    
    // Renderiza a explicação "Como?"
    explicacaoComo.innerHTML = '';
    if (data.explicacao_como && data.explicacao_como.length > 0) {
        data.explicacao_como.forEach(nomeRegra => {
            const li = document.createElement('li');
            li.textContent = nomeRegra;
            explicacaoComo.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'A conclusão foi obtida diretamente de um fato ou não utilizou regras.';
        explicacaoComo.appendChild(li);
    }
}

function resetarInterface() {
    secaoInicio.classList.remove('hidden');
    secaoConsulta.classList.add('hidden');
    secaoResultado.classList.add('hidden');
    dialogoBox.innerHTML = '';
    areaInputUsuario.innerHTML = '';
    estadoConsulta = { objetivo: null, variavelAtual: null, contextoPorque: null };
    selectObjetivo.selectedIndex = 0;
    if (statusModo) statusModo.textContent = 'Modo: -';
    if (statusObjetivo) statusObjetivo.textContent = 'Objetivo: -';
}

// --- Inicialização e Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Se não houver KB ativa, redirecionar para página de seleção
    if (!kbAtiva) { window.location.href = 'kbs.html'; return; }
    if (typeof atualizarStatusBar === 'function') {
        atualizarStatusBar({ kb: kbAtiva });
    }
    document.getElementById('btn-voltar-consulta').addEventListener('click', () => {
        secaoConsulta.classList.add('hidden');
        secaoResultado.classList.add('hidden');
        secaoForward?.classList.add('hidden');
        secaoInicio.classList.remove('hidden');
        dialogoBox.innerHTML = '';
        areaInputUsuario.innerHTML = '';
    });

    document.getElementById('btn-voltar-resultado').addEventListener('click', () => {
        secaoConsulta.classList.add('hidden');
        secaoResultado.classList.add('hidden');
        secaoForward?.classList.add('hidden');
        secaoInicio.classList.remove('hidden');
        dialogoBox.innerHTML = '';
        areaInputUsuario.innerHTML = '';
    });
    // buscarVariaveis será chamada após selecionar KB

    btnIniciar.addEventListener('click', () => {
        // Modal reutilizando classes
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        const box = document.createElement('div');
        box.className = 'modal-box';
        box.innerHTML = '<h3>Escolha o tipo de consulta</h3>';
        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const btnBackward = document.createElement('button');
        btnBackward.textContent = 'Backward Chaining';
        btnBackward.className = 'btn-espacado';
        btnBackward.onclick = () => {
            document.body.removeChild(modal);
            const objetivoSelecionado = selectObjetivo.value;
            if (!objetivoSelecionado) {
                alert('Por favor, selecione um objetivo para a consulta.');
                return;
            }
            estadoConsulta.objetivo = objetivoSelecionado;
            secaoInicio.classList.add('hidden');
            secaoConsulta.classList.remove('hidden');
            adicionarMensagem(`Sistema: Iniciando consulta para determinar "${objetivoSelecionado}".`, 'sistema');
            iniciarConsulta(objetivoSelecionado);
            if (statusModo) statusModo.textContent = 'Modo: Backward';
            if (statusObjetivo) statusObjetivo.textContent = `Objetivo: ${objetivoSelecionado}`;
        };

        const btnForward = document.createElement('button');
        btnForward.textContent = 'Forward Chaining';
        btnForward.className = 'btn-espacado';
        btnForward.onclick = () => {
            document.body.removeChild(modal);
            iniciarForwardChat();
            if (statusModo) statusModo.textContent = 'Modo: Forward';
            if (statusObjetivo) statusObjetivo.textContent = 'Objetivo: -';
        };

        actions.appendChild(btnBackward);
        actions.appendChild(btnForward);
        box.appendChild(actions);
        modal.appendChild(box);
        document.body.appendChild(modal);
    });

    btnNovaConsulta.addEventListener('click', resetarInterface);
    selectObjetivo.addEventListener('change', atualizarEstadoBotaoIniciar);
    selectObjetivo.addEventListener('change', () => { if (statusObjetivo) { const v = selectObjetivo.value; statusObjetivo.textContent = v ? `Objetivo: ${v}` : 'Objetivo: -'; }});
    // Carrega variáveis da KB ativa (se houver) após garantir que common.js forneceu getKbAtiva
    if (kbAtiva) {
        buscarVariaveis();
    }
    atualizarEstadoBotaoIniciar();
});