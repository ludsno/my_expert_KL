# backend/app/api.py

from flask import Flask, jsonify, request
from flask_cors import CORS

from .utils import (
    carregar_base_conhecimento,
    salvar_base_conhecimento,
    salvar_base_conhecimento,
)
from .models import BaseConhecimento, Regra, Condicao, Variavel

# IMPORTANTE: Importe o motor e a exceção
from .inference_engine import MotorBackwardChaining, AskUserException

app = Flask(__name__)
CORS(app)

# --- Base de Conhecimento e Sessão de Consulta ---


bc_global = carregar_base_conhecimento()


# Dicionário para guardar a sessão de consulta ativa.
sessao_ativa = {"motor": None}

# --- Endpoints do Editor da Base de Conhecimento ---


@app.route("/api/regras", methods=["GET"])
def get_regras():
    regras_em_dict = [regra.to_dict() for regra in bc_global.regras]
    return jsonify(regras_em_dict)


@app.route("/api/regras", methods=["POST"])
def add_regra():
    dados = request.get_json()
    if not dados:
        return jsonify({"erro": "Nenhum dado enviado"}), 400
    try:
        condicoes_se = [Condicao(**c) for c in dados["condicoes_se"]]
        conclusoes_entao = [Condicao(**c) for c in dados["conclusoes_entao"]]
        nova_regra = Regra(
            nome=dados["nome"],
            condicoes_se=condicoes_se,
            conclusoes_entao=conclusoes_entao,
        )
        bc_global.adicionar_regra(nova_regra)
        salvar_base_conhecimento(bc_global)
        return jsonify(nova_regra.to_dict()), 201
    except KeyError:
        return jsonify({"erro": "Estrutura do JSON inválida"}), 400


@app.route("/api/variaveis", methods=["GET"])
def get_variaveis():
    variaveis_em_dict = [var.to_dict() for var in bc_global.variaveis.values()]
    return jsonify(variaveis_em_dict)


@app.route("/api/variaveis", methods=["POST"])
def add_variavel():
    dados = request.get_json()
    if not dados:
        return jsonify({"erro": "Nenhum dado enviado"}), 400
    try:
        nova_variavel = Variavel(
            nome=dados["nome"],
            tipo=dados["tipo"],
            valores_possiveis=dados.get("valores_possiveis", []),
            min_val=dados.get("min_val"),
            max_val=dados.get("max_val"),
        )
        bc_global.adicionar_variavel(nova_variavel)
        salvar_base_conhecimento(bc_global)
        return jsonify(nova_variavel.to_dict()), 201
    except KeyError:
        return jsonify({"erro": "Estrutura do JSON inválida"}), 400


# --- Endpoints da Consulta ---


@app.route("/api/consulta/iniciar", methods=["POST"])
def iniciar_consulta():
    """
    Inicia uma nova sessão de consulta, limpando a anterior.
    Espera um JSON como: {"objetivo": "NomeDaVariavel"}
    """
    dados = request.get_json()
    if not dados or "objetivo" not in dados:
        return jsonify({"erro": "Um 'objetivo' deve ser fornecido."}), 400

    objetivo = dados["objetivo"]

    # Cria uma nova instância do motor para cada consulta, usando a BC global como base
    motor = MotorBackwardChaining(bc_global)
    sessao_ativa["motor"] = motor

    # Inicia o processo de inferência
    resultado = motor.provar_objetivo(objetivo)
    return jsonify(resultado)


@app.route("/api/consulta/responder", methods=["POST"])
def responder_pergunta():
    """
    Recebe a resposta do usuário e continua a inferência.
    Espera um JSON como: {"variavel": "NomeDaVariavel", "valor": "ValorDaResposta"}
    """
    motor = sessao_ativa.get("motor")
    if not motor:
        return jsonify({"erro": "Nenhuma consulta ativa. Inicie uma primeiro."}), 400

    dados = request.get_json()
    if not dados or "variavel" not in dados or "valor" not in dados:
        return jsonify({"erro": "A resposta deve conter 'variavel' e 'valor'."}), 400

    variavel = dados["variavel"]
    valor = dados["valor"]

    # Adiciona a resposta ao motor e continua o processo
    resultado = motor.adicionar_resposta(variavel, valor)
    return jsonify(resultado)


# backend/app/api.py

# ... (importações e código existente) ...

# --- Endpoints de Edição e Deleção ---


@app.route("/api/variaveis/<string:nome_variavel>", methods=["DELETE"])
def delete_variavel(nome_variavel):
    """Apaga uma variável pelo seu nome."""
    if nome_variavel in bc_global.variaveis:
        # Adicional: Verificar se a variável não está sendo usada em alguma regra
        for regra in bc_global.regras:
            for cond in regra.condicoes_se + regra.conclusoes_entao:
                if cond.variavel == nome_variavel:
                    return (
                        jsonify(
                            {
                                "erro": f"Variável '{nome_variavel}' está em uso pela regra '{regra.nome}' e não pode ser apagada."
                            }
                        ),
                        409,
                    )  # Conflict

        del bc_global.variaveis[nome_variavel]
        salvar_base_conhecimento(bc_global)
        return (
            jsonify({"mensagem": f"Variável '{nome_variavel}' apagada com sucesso."}),
            200,
        )
    else:
        return jsonify({"erro": "Variável não encontrada."}), 404


@app.route("/api/regras/<string:nome_regra>", methods=["DELETE"])
def delete_regra(nome_regra):
    """Apaga uma regra pelo seu nome."""
    regra_encontrada = next((r for r in bc_global.regras if r.nome == nome_regra), None)
    if regra_encontrada:
        bc_global.regras.remove(regra_encontrada)
        salvar_base_conhecimento(bc_global)
        return jsonify({"mensagem": f"Regra '{nome_regra}' apagada com sucesso."}), 200
    else:
        return jsonify({"erro": "Regra não encontrada."}), 404


@app.route("/api/regras/<string:nome_regra_original>", methods=["PUT"])
def update_regra(nome_regra_original):
    """Atualiza uma regra existente."""
    regra_existente = next(
        (r for r in bc_global.regras if r.nome == nome_regra_original), None
    )
    if not regra_existente:
        return jsonify({"erro": "Regra para atualizar não encontrada."}), 404

    dados = request.get_json()
    if not dados:
        return jsonify({"erro": "Nenhum dado enviado"}), 400

    try:
        # Remove a regra antiga
        bc_global.regras.remove(regra_existente)

        # Cria a nova regra com os dados atualizados
        condicoes_se = [Condicao(**c) for c in dados["condicoes_se"]]
        conclusoes_entao = [Condicao(**c) for c in dados["conclusoes_entao"]]
        regra_atualizada = Regra(
            nome=dados["nome"],  # O nome também pode ser atualizado
            condicoes_se=condicoes_se,
            conclusoes_entao=conclusoes_entao,
        )
        bc_global.adicionar_regra(regra_atualizada)
        salvar_base_conhecimento(bc_global)
        return jsonify(regra_atualizada.to_dict()), 200
    except KeyError:
        # Se falhar, readiciona a regra antiga para não perder dados
        bc_global.adicionar_regra(regra_existente)
        return jsonify({"erro": "Estrutura do JSON inválida"}), 400


# Endpoint de teste
@app.route("/")
def index():
    return "<h1>Servidor da API do Sistema Especialista (endpoint de teste)</h1>"
