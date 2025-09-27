# backend/app/utils.py

import json
import os
from .models import BaseConhecimento, Variavel, Regra, Condicao

# Define os caminhos para os arquivos de dados
# Usamos os.path para garantir que funcione em qualquer sistema operacional
PASTA_DATA = os.path.join(os.path.dirname(__file__), '..', 'data')
ARQUIVO_VARIAVEIS = os.path.join(PASTA_DATA, 'variaveis.json')
ARQUIVO_REGRAS = os.path.join(PASTA_DATA, 'regras.json')

def salvar_base_conhecimento(bc: BaseConhecimento):
    """Salva as variáveis e regras da base de conhecimento nos arquivos JSON."""
    
    # Prepara os dados para salvar
    dados_variaveis = [var.to_dict() for var in bc.variaveis.values()]
    dados_regras = [regra.to_dict() for regra in bc.regras]

    try:
        # Salva as variáveis
        with open(ARQUIVO_VARIAVEIS, 'w', encoding='utf-8') as f:
            json.dump(dados_variaveis, f, indent=4, ensure_ascii=False)
            
        # Salva as regras
        with open(ARQUIVO_REGRAS, 'w', encoding='utf-8') as f:
            json.dump(dados_regras, f, indent=4, ensure_ascii=False)
            
        print("Base de conhecimento salva com sucesso!")
        
    except IOError as e:
        print(f"Erro ao salvar a base de conhecimento: {e}")

def carregar_base_conhecimento() -> BaseConhecimento:
    """Carrega as variáveis e regras dos arquivos JSON e retorna um objeto BaseConhecimento."""
    
    bc = BaseConhecimento()
    
    # Carrega as variáveis
    try:
        with open(ARQUIVO_VARIAVEIS, 'r', encoding='utf-8') as f:
            dados_variaveis = json.load(f)
            for dados_var in dados_variaveis:
                # Cria o objeto Variavel a partir do dicionário
                variavel = Variavel(**dados_var)
                bc.adicionar_variavel(variavel)
    except (FileNotFoundError, json.JSONDecodeError):
        print(f"Arquivo de variáveis '{ARQUIVO_VARIAVEIS}' não encontrado ou inválido. Começando com base vazia.")

    # Carrega as regras
    try:
        with open(ARQUIVO_REGRAS, 'r', encoding='utf-8') as f:
            dados_regras = json.load(f)
            for dados_regra in dados_regras:
                # Recria as listas de objetos Condicao
                condicoes_se = [Condicao(**c) for c in dados_regra['condicoes_se']]
                conclusoes_entao = [Condicao(**c) for c in dados_regra['conclusoes_entao']]
                
                regra = Regra(
                    nome=dados_regra['nome'],
                    condicoes_se=condicoes_se,
                    conclusoes_entao=conclusoes_entao
                )
                bc.adicionar_regra(regra)
    except (FileNotFoundError, json.JSONDecodeError):
        print(f"Arquivo de regras '{ARQUIVO_REGRAS}' não encontrado ou inválido. Começando sem regras.")
        
    print("Base de conhecimento carregada.")
    return bc