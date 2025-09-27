# inicio main.py


# Para rodar: pip install pywebview

import subprocess
import time
import os
import webview

def start_backend():
	backend_path = os.path.join('backend', 'run.py')
	return subprocess.Popen(['python', backend_path])

def start_desktop_frontend():
	frontend_path = os.path.join('frontend', 'index.html')
	url = f'file://{os.path.abspath(frontend_path)}'
	print(f"[INFO] Abrindo janela desktop para {url}")
	try:
		webview.create_window('My Expert App', url, width=1200, height=800)
		webview.start()
	except Exception as e:
		print(f"[ERRO] Falha ao abrir janela desktop: {e}")
		input("Pressione Enter para sair...")

if __name__ == "__main__":
	backend_proc = start_backend()
	print("[INFO] Backend iniciado. Esperando 2 segundos para garantir inicialização...")
	time.sleep(2)
	try:
		start_desktop_frontend()
	except Exception as e:
		print(f"[ERRO] Falha ao iniciar frontend: {e}")
	finally:
		print("[INFO] Encerrando backend...")
		backend_proc.terminate()

# fim main