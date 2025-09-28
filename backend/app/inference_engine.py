
# backend/app/inference_engine.py

from .models import BaseConhecimento, Condicao

# --- Motor de Encadeamento para Frente ---
class MotorForwardChaining:
    def __init__(self, bc: BaseConhecimento):
        self.bc = bc
        self.fatos_sessao = dict(bc.fatos)  # Fatos conhecidos
        self.trilha_explicacao = []

    def adicionar_fato(self, variavel, valor):
        self.fatos_sessao[variavel] = valor

    def encadear(self):
        alterado = True
        while alterado:
            alterado = False
            for regra in self.bc.regras:
                # Verifica se todas as condições SE são satisfeitas
                todas_satisfeitas = True
                for cond in regra.condicoes_se:
                    valor = self.fatos_sessao.get(cond.variavel)
                    if valor is None or not avaliar_condicao_com_valor(cond, valor):
                        todas_satisfeitas = False
                        break
                if todas_satisfeitas:
                    # Aplica conclusões ENTÃO
                    for conc in regra.conclusoes_entao:
                        valor_existente = self.fatos_sessao.get(conc.variavel)
                        if valor_existente != conc.valor:
                            self.fatos_sessao[conc.variavel] = conc.valor
                            self.trilha_explicacao.append(regra)
                            alterado = True

        return {
            "fatos": self.fatos_sessao,
            "explicacao_como": [r.nome for r in self.trilha_explicacao],
        }


# --- Exceção Customizada ---
class AskUserException(Exception):
    def __init__(self, variavel, pergunta="", explicacao="", regra_contexto=None):
        self.variavel = variavel
        self.pergunta = pergunta
        self.explicacao = explicacao
        self.regra_contexto = regra_contexto


# --- Função de Avaliação Simplificada ---
def avaliar_condicao_com_valor(condicao: Condicao, valor):
    op = condicao.operador
    alvo = condicao.valor

    try:
        valor_num = float(valor)
        alvo_num = float(alvo)
    except (ValueError, TypeError):
        valor_num = None
        alvo_num = None

    if op == "==":
        return valor == alvo
    if op == "!=":
        return valor != alvo
    if valor_num is not None and alvo_num is not None:
        if op == ">":
            return valor_num > alvo_num
        if op == "<":
            return valor_num < alvo_num
        if op == ">=":
            return valor_num >= alvo_num
        if op == "<=":
            return valor_num <= alvo_num
    return False


def _combinar_cf(cf1, cf2):
    """Fórmula de combinação de Fatores de Confiança (variante do MYCIN)."""
    if cf1 >= 0 and cf2 >= 0:
        return cf1 + cf2 * (1 - cf1)
    return max(cf1, cf2)  # Simplificação para outros casos


class MotorBackwardChaining:
    def __init__(self, bc: BaseConhecimento):
        self.bc = bc
        self.fatos_sessao = {}
        for var, val in bc.fatos.items():
            self.fatos_sessao[var] = (val, 1.0)
        self.trilha_explicacao = []
        self.objetivo_inicial = None

    def adicionar_resposta(self, variavel: str, valor):
        self.fatos_sessao[variavel] = (valor, 1.0)
        return self.provar_objetivo(self.objetivo_inicial)

    def provar_objetivo(self, objetivo: str):
        self.objetivo_inicial = objetivo
        try:
            resultado = self._buscar_valor_para(objetivo)
            valor, cf = resultado if resultado else (None, 0)
            return {
                "tipo": "resultado",
                "objetivo": objetivo,
                "valor": valor,
                "cf": cf,
                "explicacao_como": [regra.nome for regra in self.trilha_explicacao],
            }
        except AskUserException as e:
            justificativa_regra = e.regra_contexto.nome if e.regra_contexto else ""
            return {
                "tipo": "pergunta",
                "variavel": e.variavel,
                "pergunta_texto": e.pergunta,
                "explicacao_texto": e.explicacao,
                "contexto_regra": justificativa_regra,
            }

    def _buscar_valor_para(self, variavel_alvo: str, pilha_recursao=None):
        if pilha_recursao is None:
            pilha_recursao = set()

        if variavel_alvo in self.fatos_sessao:
            return self.fatos_sessao[variavel_alvo]

        if variavel_alvo in pilha_recursao:
            return None
        pilha_recursao.add(variavel_alvo)

        regras_relevantes = [
            r
            for r in self.bc.regras
            if any(c.variavel == variavel_alvo for c in r.conclusoes_entao)
        ]

        for regra in regras_relevantes:
            cf_premissa = 1.0
            try:
                for condicao in regra.condicoes_se:
                    valor_condicao, cf_condicao = self._buscar_valor_para(
                        condicao.variavel, pilha_recursao
                    )
                    if avaliar_condicao_com_valor(condicao, valor_condicao):
                        cf_premissa = min(cf_premissa, cf_condicao)
                    else:
                        cf_premissa = 0
                        break
            except AskUserException:
                raise
            except TypeError:
                cf_premissa = 0

            if cf_premissa > 0:
                for conclusao in regra.conclusoes_entao:
                    cf_final_conclusao = cf_premissa * getattr(conclusao, "fc", 1.0)
                    if conclusao.variavel in self.fatos_sessao:
                        valor_existente, cf_existente = self.fatos_sessao[
                            conclusao.variavel
                        ]
                        if valor_existente == conclusao.valor:
                            novo_cf = _combinar_cf(cf_existente, cf_final_conclusao)
                            self.fatos_sessao[conclusao.variavel] = (
                                conclusao.valor,
                                novo_cf,
                            )
                    else:
                        self.fatos_sessao[conclusao.variavel] = (
                            conclusao.valor,
                            cf_final_conclusao,
                        )
                    self.trilha_explicacao.append(regra)

        pilha_recursao.remove(variavel_alvo)
        if variavel_alvo in self.fatos_sessao:
            return self.fatos_sessao[variavel_alvo]

        variavel_obj = self.bc.variaveis.get(variavel_alvo)
        pergunta_texto = (
            variavel_obj.pergunta if variavel_obj and variavel_obj.pergunta else f"Informe o valor para '{variavel_alvo}'."
        )
        explicacao_texto = variavel_obj.explicacao if variavel_obj else ""

        regra_contexto = next(
            (
                r
                for r in self.bc.regras
                if any(c.variavel == variavel_alvo for c in r.condicoes_se)
            ),
            None,
        )

        raise AskUserException(
            variavel_alvo, pergunta_texto, explicacao_texto, regra_contexto
        )


# fim de inference_engine.py
