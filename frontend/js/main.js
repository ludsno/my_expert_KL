// frontend/js/main.js

// --- Configurações e Variáveis Globais ---
const API_URL = 'http://127.0.0.1:5000';

// Mapeamento dos elementos do HTML
const secaoInicio = document.getElementById('secao-inicio');
const secaoConsulta = document.getElementById('secao-consulta');
const secaoResultado = document.getElementById('secao-resultado');

const selectObjetivo = document.getElementById('select-objetivo');
const btnIniciar = document.getElementById('btn-iniciar');
const btnNovaConsulta = document.getElementById('btn-nova-consulta');

const dialogoBox = document.getElementById('dialogo-box');
const areaInputUsuario = document.getElementById('area-input-usuario');
const resultadoFinal = document.getElementById('resultado-final');
const explicacaoComo = document.getElementById('explicacao-como');

// Variáveis de estado
let estadoConsulta = {
    objetivo: null,
    variavelAtual: null,
    contextoPorque: null
};
let todasAsVariaveis = {}; // Cache para guardar detalhes das variáveis

// --- Funções de Comunicação com a API ---

async function buscarVariaveis() {
    try {
        const response = await fetch(`${API_URL}/api/variaveis`);
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
    } catch (error) {
        console.error("Erro ao carregar variáveis:", error);
        selectObjetivo.innerHTML = '<option>Erro ao carregar</option>';
    }
}

async function iniciarConsulta(objetivo) {
    try {
        const response = await fetch(`${API_URL}/api/consulta/iniciar`, {
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
        const response = await fetch(`${API_URL}/api/consulta/responder`, {
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
        estadoConsulta.contextoPorque = data.contexto_porque;
        
        adicionarMensagem(`Sistema: Por favor, informe o valor para "${data.variavel}".`, 'sistema');
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

    // Cria o botão de enviar
    const btnEnviar = document.createElement('button');
    btnEnviar.textContent = 'Enviar Resposta';
    btnEnviar.onclick = () => {
        const valor = inputElement.value;
        if (valor.trim() === '') {
            alert('Por favor, informe um valor.');
            return;
        }
        adicionarMensagem(`Você: ${valor}`, 'usuario');
        enviarResposta(valor);
        areaInputUsuario.innerHTML = '<p>Processando...</p>';
    };
    areaInputUsuario.appendChild(btnEnviar);

    // Cria o botão "Por Quê?"
    const btnPorque = document.createElement('button');
    btnPorque.textContent = 'Por Quê?';
    btnPorque.className = 'btn-porque'; // Para estilização opcional
    btnPorque.onclick = () => {
        const explicacao = estadoConsulta.contextoPorque
            ? `Estou fazendo esta pergunta para tentar avaliar a REGRA: "${estadoConsulta.contextoPorque}".`
            : `Esta informação é necessária para alcançar o objetivo final.`;
        alert(explicacao);
    };
    areaInputUsuario.appendChild(btnPorque);

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
}

// --- Inicialização e Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    buscarVariaveis();

    btnIniciar.addEventListener('click', () => {
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
    });

    btnNovaConsulta.addEventListener('click', resetarInterface);
});