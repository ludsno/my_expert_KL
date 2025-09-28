# backend/app/api.py

from flask import Flask, jsonify, request
from flask_cors import CORS

from .utils import (
    carregar_base_conhecimento,
    salvar_base_conhecimento,
)
from .models import BaseConhecimento, Regra, Condicao, Variavel
from .inference_engine import MotorBackwardChaining, AskUserException

app = Flask(__name__)
CORS(app)

bc_global = carregar_base_conhecimento()
sessao_ativa = {"motor": None}

# --- Endpoint de Consulta por Encadeamento para Frente ---
from .inference_engine import MotorForwardChaining

@app.route("/api/consulta/forward", methods=["POST"])
def consulta_forward():
    dados = request.get_json()
    fatos = dados.get("fatos", {})
    motor = MotorForwardChaining(bc_global)
    for var, val in fatos.items():
        motor.adicionar_fato(var, val)
    resultado = motor.encadear()
    return jsonify(resultado)


# --- Endpoints de Leitura ---


@app.route("/api/regras", methods=["GET"])
def get_regras():
    regras_em_dict = [regra.to_dict() for regra in bc_global.regras]
    return jsonify(regras_em_dict)


@app.route("/api/variaveis", methods=["GET"])
def get_variaveis():
    variaveis_em_dict = [var.to_dict() for var in bc_global.variaveis.values()]
    return jsonify(variaveis_em_dict)


# --- Endpoints de Criação ---


@app.route("/api/regras", methods=["POST"])
def add_regra():
    dados = request.get_json()
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


@app.route("/api/variaveis", methods=["POST"])
def add_variavel():
    dados = request.get_json()
    try:
        nova_variavel = Variavel(
            nome=dados["nome"],
            tipo=dados["tipo"],
            valores_possiveis=dados.get("valores_possiveis", []),
            min_val=dados.get("min_val"),
            max_val=dados.get("max_val"),
            pergunta=dados.get("pergunta", ""),
            explicacao=dados.get("explicacao", ""),
        )
        bc_global.adicionar_variavel(nova_variavel)
        salvar_base_conhecimento(bc_global)
        return jsonify(nova_variavel.to_dict()), 201
    except KeyError:
        return jsonify({"erro": "Estrutura do JSON inválida"}), 400


# --- Endpoints de Deleção ---


@app.route("/api/variaveis/<string:nome_variavel>", methods=["DELETE"])
def delete_variavel(nome_variavel):
    if nome_variavel not in bc_global.variaveis:
        return jsonify({"erro": "Variável não encontrada."}), 404
    for regra in bc_global.regras:
        for cond in regra.condicoes_se + regra.conclusoes_entao:
            if cond.variavel == nome_variavel:
                return (
                    jsonify(
                        {
                            "erro": f"Variável '{nome_variavel}' em uso pela regra '{regra.nome}'."
                        }
                    ),
                    409,
                )
    del bc_global.variaveis[nome_variavel]
    salvar_base_conhecimento(bc_global)
    return jsonify({"mensagem": f"Variável '{nome_variavel}' apagada."}), 200


@app.route("/api/regras/<string:nome_regra>", methods=["DELETE"])
def delete_regra(nome_regra):
    regra_encontrada = next((r for r in bc_global.regras if r.nome == nome_regra), None)
    if regra_encontrada:
        bc_global.regras.remove(regra_encontrada)
        salvar_base_conhecimento(bc_global)
        return jsonify({"mensagem": f"Regra '{nome_regra}' apagada."}), 200
    return jsonify({"erro": "Regra não encontrada."}), 404


# --- Endpoints de Atualização (PUT) ---


@app.route("/api/regras/<string:nome_regra_original>", methods=["PUT"])
def update_regra(nome_regra_original):
    regra_existente = next(
        (r for r in bc_global.regras if r.nome == nome_regra_original), None
    )
    if not regra_existente:
        return jsonify({"erro": "Regra para atualizar não encontrada."}), 404
    dados = request.get_json()
    try:
        bc_global.regras.remove(regra_existente)
        condicoes_se = [Condicao(**c) for c in dados["condicoes_se"]]
        conclusoes_entao = [Condicao(**c) for c in dados["conclusoes_entao"]]
        regra_atualizada = Regra(
            nome=dados["nome"],
            condicoes_se=condicoes_se,
            conclusoes_entao=conclusoes_entao,
        )
        bc_global.adicionar_regra(regra_atualizada)
        salvar_base_conhecimento(bc_global)
        return jsonify(regra_atualizada.to_dict()), 200
    except KeyError:
        bc_global.adicionar_regra(regra_existente)
        return jsonify({"erro": "Estrutura do JSON inválida"}), 400


# NOVO ENDPOINT ADICIONADO AQUI
@app.route("/api/variaveis/<string:nome_variavel_original>", methods=["PUT"])
def update_variavel(nome_variavel_original):
    """Atualiza uma variável existente."""
    if nome_variavel_original not in bc_global.variaveis:
        return jsonify({"erro": "Variável para atualizar não encontrada."}), 404

    dados = request.get_json()
    if not dados:
        return jsonify({"erro": "Nenhum dado enviado."}), 400

    # Prevenção contra renomear a variável, que é mais complexo
    if dados.get("nome") != nome_variavel_original:
        return jsonify({"erro": "A renomeação de variáveis não é permitida."}), 400

    try:
        variavel_atualizada = Variavel(
            nome=dados["nome"],
            tipo=dados["tipo"],
            valores_possiveis=dados.get("valores_possiveis", []),
            min_val=dados.get("min_val"),
            max_val=dados.get("max_val"),
            pergunta=dados.get("pergunta", ""),
            explicacao=dados.get("explicacao", ""),
        )
        bc_global.variaveis[nome_variavel_original] = variavel_atualizada
        salvar_base_conhecimento(bc_global)
        return jsonify(variavel_atualizada.to_dict()), 200
    except KeyError:
        return jsonify({"erro": "Estrutura do JSON inválida."}), 400


# --- Endpoints da Consulta ---


@app.route("/api/consulta/iniciar", methods=["POST"])
def iniciar_consulta():
    dados = request.get_json()
    objetivo = dados.get("objetivo")
    if not objetivo:
        return jsonify({"erro": "Um 'objetivo' deve ser fornecido."}), 400
    motor = MotorBackwardChaining(bc_global)
    sessao_ativa["motor"] = motor
    resultado = motor.provar_objetivo(objetivo)
    return jsonify(resultado)


@app.route("/api/consulta/responder", methods=["POST"])
def responder_pergunta():
    motor = sessao_ativa.get("motor")
    if not motor:
        return jsonify({"erro": "Nenhuma consulta ativa."}), 400
    dados = request.get_json()
    if not all(k in dados for k in ["variavel", "valor"]):
        return jsonify({"erro": "A resposta deve conter 'variavel' e 'valor'."}), 400
    resultado = motor.adicionar_resposta(dados["variavel"], dados["valor"])
    return jsonify(resultado)


# Endpoint de teste
@app.route("/")
def index():
    return "<h1>Servidor da API do Sistema Especialista</h1>"
