# main.py (Versão Definitiva)
import sys
import os
import subprocess
import time
import webview

def get_base_path():
    """ Retorna o caminho base para encontrar os arquivos,
        seja em modo de desenvolvimento ou 'congelado' pelo PyInstaller. """
    if getattr(sys, 'frozen', False):
        # O programa está 'congelado' (executável)
        return os.path.dirname(sys.executable)
    else:
        # O programa está rodando normalmente (python main.py)
        return os.path.dirname(os.path.abspath(__file__))

BASE_PATH = get_base_path()

def start_backend():
    """ Inicia o servidor Flask em um processo separado, apenas se não estiver congelado. """
    if not getattr(sys, 'frozen', False):
        backend_path = os.path.join(BASE_PATH, 'backend', 'run.py')
        # Garante que o subprocesso use o mesmo interpretador Python
        return subprocess.Popen([sys.executable, backend_path])
    return None

if __name__ == "__main__":
    backend_proc = start_backend()
    if backend_proc:
        print("[INFO] Backend iniciado em processo separado. Esperando 2 segundos...")
        time.sleep(2)

    # Define qual é a sua página HTML inicial
    frontend_path = os.path.join(BASE_PATH, 'frontend', 'kbs.html')
    url = f'file://{os.path.abspath(frontend_path)}'
    
    print(f"[INFO] Abrindo janela desktop para {url}")
    
    try:
        webview.create_window('My Expert App', url, width=1200, height=800)
        webview.start()
    except Exception as e:
        print(f"[ERRO] Falha ao iniciar o frontend: {e}")
    finally:
        if backend_proc:
            print("[INFO] Encerrando backend...")
            backend_proc.terminate()