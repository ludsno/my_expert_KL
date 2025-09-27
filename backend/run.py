# inicio de backend/run.py

from app.api import app

if __name__ == "__main__":
    # O debug=True faz com que o servidor reinicie automaticamente
    # quando você altera o código. Ótimo para desenvolvimento.
    # Não use em produção!
    app.run(debug=False, port=5000)

# fim de backend/run.py
