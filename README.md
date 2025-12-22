# My Expert App

My Expert App é um sistema de especialista modular, com interface web e integração desktop, desenvolvido para facilitar a criação, edição e consulta de bases de conhecimento baseadas em regras.

## Funcionalidades
- **Interface Desktop**: Executa como aplicativo desktop via PyWebView.
- **Backend Flask**: Servidor Python para lógica de inferência e manipulação das bases de conhecimento.
- **Frontend Web**: Interface moderna em HTML/CSS/JS para consulta, edição e visualização das regras.
- **Bases de Conhecimento**: Suporte a múltiplos domínios (ex: diagnóstico médico, mini akinator, problema do gerente), cada um com suas regras e variáveis em arquivos JSON.
- **Editor Visual**: Permite criar e editar regras e variáveis de forma intuitiva.

## Estrutura do Projeto
```
main.py                # Inicializador desktop (PyWebView)
backend/
  run.py               # Inicializador do backend Flask
  app/
    api.py             # Rotas e lógica de API
    inference_engine.py# Motor de inferência
    models.py          # Modelos de dados
    utils.py           # Utilitários
  data/
    <domínio>/         # Pastas para cada domínio
      regras.json      # Regras do domínio
      variaveis.json   # Variáveis do domínio
frontend/
  *.html               # Páginas web
  css/                 # Estilos
  js/                  # Scripts
misc/
  extrair_codigo.py    # Scripts auxiliares
```

## Igamens do Jopreto
<img width="1920" height="1020" alt="image" src="https://github.com/user-attachments/assets/291a4224-0243-475d-9aa2-43a1c85cad48" />
<img width="1920" height="1020" alt="image" src="https://github.com/user-attachments/assets/c998806d-f88b-4577-9c56-d6fe014b1750" />


## Como Executar
1. Instale as dependências Python:
   ```bash
   pip install flask pywebview
   ```
2. Execute o aplicativo:
   ```bash
   python main.py
   ```
3. A interface será aberta automaticamente.

## Tecnologias Utilizadas
- Python 3
- Flask
- PyWebView
- HTML5, CSS3, JavaScript

## Autores
- Ludson (equipe)

## Licença
Este projeto é acadêmico e livre para uso educacional.
