from flask import Flask, jsonify, request
from flask_cors import CORS
from .utils import (
    carregar_base_conhecimento,
    salvar_base_conhecimento,
    listar_kbs,
    criar_kb,
    deletar_kb,
)
from .models import Variavel, Regra, Condicao
from .inference_engine import MotorBackwardChaining, MotorForwardChaining

app = Flask(__name__)
CORS(app)

sessao_ativa = {}

# ------------------ GERENCIAMENTO DE KBs ------------------
@app.route("/api/kbs", methods=["GET"])
def listar_kbs_endpoint():
    return jsonify(listar_kbs())

@app.route("/api/kbs", methods=["POST"])
def criar_kb_endpoint():
    dados = request.get_json() or {}
    nome = dados.get("name")
    if not nome:
        return jsonify({"erro": "Nome é obrigatório"}), 400
    ok, msg = criar_kb(nome)
    status = 201 if ok else 409
    return jsonify({"mensagem": msg}), status

@app.route("/api/kbs/<string:nome_kb>", methods=["DELETE"])
def deletar_kb_endpoint(nome_kb):
    ok, msg = deletar_kb(nome_kb)
    status = 200 if ok else 404
    return jsonify({"mensagem": msg}), status

# ------------------ VARIÁVEIS ------------------
@app.route("/api/variaveis", methods=["GET", "POST"])
def variaveis_endpoint():
    kb_name = request.args.get('kb')
    if not kb_name:
        return jsonify({"erro": "Nome da KB é obrigatório"}), 400
    bc = carregar_base_conhecimento(kb_name)
    if request.method == 'GET':
        return jsonify([v.to_dict() for v in bc.variaveis.values()])
    # POST
    dados = request.get_json() or {}
    try:
        nova = Variavel(
            nome=dados['nome'],
            tipo=dados['tipo'],
            valores_possiveis=dados.get('valores_possiveis', []),
            min_val=dados.get('min_val'),
            max_val=dados.get('max_val'),
            pergunta=dados.get('pergunta', ''),
            explicacao=dados.get('explicacao', ''),
        )
    except KeyError:
        return jsonify({"erro": "Estrutura do JSON inválida"}), 400
    bc.adicionar_variavel(nova)
    salvar_base_conhecimento(kb_name, bc)
    return jsonify(nova.to_dict()), 201

@app.route("/api/variaveis/<string:nome_var>", methods=["PUT", "DELETE"])
def variavel_detalhe_endpoint(nome_var):
    kb_name = request.args.get('kb')
    if not kb_name:
        return jsonify({"erro": "Nome da KB é obrigatório"}), 400
    bc = carregar_base_conhecimento(kb_name)
    if request.method == 'DELETE':
        if nome_var not in bc.variaveis:
            return jsonify({"erro": "Variável não encontrada."}), 404
        # impedir deleção se usada em regra
        for regra in bc.regras:
            for cond in regra.condicoes_se + regra.conclusoes_entao:
                if cond.variavel == nome_var:
                    return jsonify({"erro": f"Variável '{nome_var}' em uso pela regra '{regra.nome}'."}), 409
        del bc.variaveis[nome_var]
        salvar_base_conhecimento(kb_name, bc)
        return jsonify({"mensagem": f"Variável '{nome_var}' apagada."}), 200
    # PUT
    if nome_var not in bc.variaveis:
        return jsonify({"erro": "Variável para atualizar não encontrada."}), 404
    dados = request.get_json() or {}
    if dados.get('nome') != nome_var:
        return jsonify({"erro": "Renomear variável não é permitido."}), 400
    try:
        atualizada = Variavel(
            nome=dados['nome'],
            tipo=dados['tipo'],
            valores_possiveis=dados.get('valores_possiveis', []),
            min_val=dados.get('min_val'),
            max_val=dados.get('max_val'),
            pergunta=dados.get('pergunta', ''),
            explicacao=dados.get('explicacao', ''),
        )
    except KeyError:
        return jsonify({"erro": "Estrutura do JSON inválida."}), 400
    bc.variaveis[nome_var] = atualizada
    salvar_base_conhecimento(kb_name, bc)
    return jsonify(atualizada.to_dict()), 200

# ------------------ REGRAS ------------------
@app.route("/api/regras", methods=["GET", "POST"])
def regras_endpoint():
    kb_name = request.args.get('kb')
    if not kb_name:
        return jsonify({"erro": "Nome da KB é obrigatório"}), 400
    bc = carregar_base_conhecimento(kb_name)
    if request.method == 'GET':
        return jsonify([r.to_dict() for r in bc.regras])
    dados = request.get_json() or {}
    try:
        se = [Condicao(**c) for c in dados['condicoes_se']]
        entao = [Condicao(**c) for c in dados['conclusoes_entao']]
        nova = Regra(dados['nome'], se, entao)
    except KeyError:
        return jsonify({"erro": "Estrutura do JSON inválida"}), 400
    bc.adicionar_regra(nova)
    salvar_base_conhecimento(kb_name, bc)
    return jsonify(nova.to_dict()), 201

@app.route("/api/regras/<string:nome_regra>", methods=["PUT", "DELETE"])
def regra_detalhe_endpoint(nome_regra):
    kb_name = request.args.get('kb')
    if not kb_name:
        return jsonify({"erro": "Nome da KB é obrigatório"}), 400
    bc = carregar_base_conhecimento(kb_name)
    regra_existente = next((r for r in bc.regras if r.nome == nome_regra), None)
    if request.method == 'DELETE':
        if not regra_existente:
            return jsonify({"erro": "Regra não encontrada."}), 404
        bc.regras.remove(regra_existente)
        salvar_base_conhecimento(kb_name, bc)
        return jsonify({"mensagem": f"Regra '{nome_regra}' apagada."}), 200
    # PUT
    if not regra_existente:
        return jsonify({"erro": "Regra para atualizar não encontrada."}), 404
    dados = request.get_json() or {}
    try:
        bc.regras.remove(regra_existente)
        se = [Condicao(**c) for c in dados['condicoes_se']]
        entao = [Condicao(**c) for c in dados['conclusoes_entao']]
        atualizada = Regra(dados['nome'], se, entao)
    except KeyError:
        bc.adicionar_regra(regra_existente)
        return jsonify({"erro": "Estrutura do JSON inválida"}), 400
    bc.adicionar_regra(atualizada)
    salvar_base_conhecimento(kb_name, bc)
    return jsonify(atualizada.to_dict()), 200

# ------------------ CONSULTA BACKWARD ------------------
@app.route('/api/consulta/iniciar', methods=['POST'])
def iniciar_consulta():
    kb_name = request.args.get('kb')
    if not kb_name:
        return jsonify({"erro": "Nome da KB é obrigatório"}), 400
    dados = request.get_json() or {}
    objetivo = dados.get('objetivo')
    if not objetivo:
        return jsonify({"erro": "Um 'objetivo' deve ser fornecido."}), 400
    bc = carregar_base_conhecimento(kb_name)
    motor = MotorBackwardChaining(bc)
    sessao_ativa[kb_name] = motor
    resultado = motor.provar_objetivo(objetivo)
    return jsonify(resultado)

@app.route('/api/consulta/responder', methods=['POST'])
def responder_pergunta():
    kb_name = request.args.get('kb')
    if not kb_name:
        return jsonify({"erro": "Nome da KB é obrigatório"}), 400
    motor = sessao_ativa.get(kb_name)
    if not motor:
        return jsonify({"erro": "Nenhuma consulta ativa."}), 400
    dados = request.get_json() or {}
    if not all(k in dados for k in ['variavel', 'valor']):
        return jsonify({"erro": "A resposta deve conter 'variavel' e 'valor'."}), 400
    resultado = motor.adicionar_resposta(dados['variavel'], dados['valor'])
    return jsonify(resultado)

# ------------------ CONSULTA FORWARD ------------------
@app.route('/api/consulta/forward', methods=['POST'])
def consulta_forward():
    kb_name = request.args.get('kb')
    if not kb_name:
        return jsonify({"erro": "Nome da KB é obrigatório"}), 400
    dados = request.get_json() or {}
    fatos = dados.get('fatos', {})
    bc = carregar_base_conhecimento(kb_name)
    motor = MotorForwardChaining(bc)
    for var, val in fatos.items():
        motor.adicionar_fato(var, val)
    resultado = motor.encadear()
    return jsonify(resultado)

@app.route('/')
def index():
    return '<h1>API Sistema Especialista - Multi KB</h1>'
