# --- base_conhecimento.py ---


class Variavel:
    def __init__(
        self,
        nome,
        tipo="univalorada",
        valores_possiveis=None,
        min_val=None,
        max_val=None,
    ):
        self.nome = nome
        self.tipo = tipo  # univalorada, multivalorada, numerica
        self.valores_possiveis = valores_possiveis or []
        self.min_val = min_val
        self.max_val = max_val

    def to_dict(self):
        return {
            "nome": self.nome,
            "tipo": self.tipo,
            "valores_possiveis": self.valores_possiveis,
            "min_val": self.min_val,
            "max_val": self.max_val,
        }


class Condicao:
    def __init__(self, variavel, operador, valor, fc=1.0):
        self.variavel = variavel  # Nome da variável (string)
        self.operador = operador  # ex: '==', '!=', '>', '<', 'in'
        self.valor = valor
        self.fc = float(fc)

    def __str__(self):
        return f"{self.variavel} {self.operador} {self.valor}"

    def to_dict(self):
        return {
            "variavel": self.variavel,
            "operador": self.operador,
            "valor": self.valor,
            "fc": self.fc,
        }


class Regra:
    def __init__(self, nome, condicoes_se, conclusoes_entao):
        self.nome = nome
        self.condicoes_se = condicoes_se  # Lista de objetos Condicao
        self.conclusoes_entao = (
            conclusoes_entao  # Lista de objetos Condicao (representando as conclusões)
        )

    def __str__(self):
        se_str = " E ".join(map(str, self.condicoes_se))
        entao_str = " E ".join(map(str, self.conclusoes_entao))
        return f"REGRA {self.nome}: SE ({se_str}) ENTÃO ({entao_str})"

    def to_dict(self):
        return {
            "nome": self.nome,
            "condicoes_se": [c.to_dict() for c in self.condicoes_se],
            "conclusoes_entao": [c.to_dict() for c in self.conclusoes_entao],
        }


class BaseConhecimento:
    def __init__(self):
        self.regras = []
        self.variaveis = {}  # Dicionário para guardar as variáveis
        self.fatos = (
            {}
        )  # Dicionário para guardar os fatos conhecidos (ex: {'Idade': 25})

    def adicionar_regra(self, regra):
        self.regras.append(regra)

    def adicionar_variavel(self, variavel):
        self.variaveis[variavel.nome] = variavel


# fim de models.py
