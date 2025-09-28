import json
import os
import shutil
from .models import BaseConhecimento, Variavel, Regra, Condicao

PASTA_DATA = os.path.join(os.path.dirname(__file__), '..', 'data')

def _get_kb_path(kb_name: str):
    return os.path.join(PASTA_DATA, kb_name)

def listar_kbs():
    if not os.path.exists(PASTA_DATA):
        os.makedirs(PASTA_DATA)
    return [d for d in os.listdir(PASTA_DATA) if os.path.isdir(_get_kb_path(d))]

def criar_kb(kb_name: str):
    kb_path = _get_kb_path(kb_name)
    if os.path.exists(kb_path):
        return False, "Base de conhecimento já existe."
    os.makedirs(kb_path)
    with open(os.path.join(kb_path, 'variaveis.json'), 'w', encoding='utf-8') as f: json.dump([], f)
    with open(os.path.join(kb_path, 'regras.json'), 'w', encoding='utf-8') as f: json.dump([], f)
    return True, "Base de conhecimento criada."

def carregar_base_conhecimento(kb_name: str) -> BaseConhecimento:
    bc = BaseConhecimento()
    kb_path = _get_kb_path(kb_name)
    try:
        with open(os.path.join(kb_path, 'variaveis.json'), 'r', encoding='utf-8') as f:
            for v_data in json.load(f):
                bc.adicionar_variavel(Variavel(**v_data))
        with open(os.path.join(kb_path, 'regras.json'), 'r', encoding='utf-8') as f:
            for r_data in json.load(f):
                se = [Condicao(**c) for c in r_data.get('condicoes_se', [])]
                entao = [Condicao(**c) for c in r_data.get('conclusoes_entao', [])]
                bc.adicionar_regra(Regra(r_data['nome'], se, entao))
    except FileNotFoundError:
        print(f"Aviso: KB '{kb_name}' não encontrada ou arquivos faltando.")
    return bc

def salvar_base_conhecimento(kb_name: str, bc: BaseConhecimento):
    kb_path = _get_kb_path(kb_name)
    if not os.path.exists(kb_path):
        os.makedirs(kb_path)
    with open(os.path.join(kb_path, 'variaveis.json'), 'w', encoding='utf-8') as f:
        json.dump([v.to_dict() for v in bc.variaveis.values()], f, indent=4, ensure_ascii=False)
    with open(os.path.join(kb_path, 'regras.json'), 'w', encoding='utf-8') as f:
        json.dump([r.to_dict() for r in bc.regras], f, indent=4, ensure_ascii=False)

def deletar_kb(kb_name: str):
    kb_path = _get_kb_path(kb_name)
    if not os.path.exists(kb_path):
        return False, "Base não encontrada."
    shutil.rmtree(kb_path)
    return True, "Base removida."