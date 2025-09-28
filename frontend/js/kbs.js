// frontend/js/kbs.js
// Página dedicada à gestão/seleção de bases de conhecimento

const listaKbsEl = document.getElementById('lista-kbs');
const inputNovaKb = document.getElementById('input-nova-kb');
const btnCriarKb = document.getElementById('btn-criar-kb');
const kbInfo = document.getElementById('kb-info');

function renderKbInfo() {
  const kb = getKbAtiva();
  kbInfo.textContent = kb ? `KB ativa: ${kb}. Você pode ir para Consulta ou Editor.` : 'Nenhuma KB selecionada.';
  atualizarStatusBar({ kb, modo: 'Bases', objetivo: '-' });
}

async function carregarKbs() {
  try {
    const resp = await fetch(`${API_URL}/api/kbs`);
    const kbs = await resp.json();
    listaKbsEl.innerHTML = '';
    if (kbs.length === 0) {
      listaKbsEl.innerHTML = '<li>Nenhuma KB encontrada.</li>';
      return;
    }
    kbs.forEach(kb => {
      const li = document.createElement('li');
      li.className = 'lista-item' + (kb === getKbAtiva() ? ' kb-ativa' : '');
      li.innerHTML = `<span>${kb}</span>`;
      const acoes = document.createElement('div');
      acoes.className = 'item-acoes';
      const btnSel = document.createElement('button');
      btnSel.textContent = 'Selecionar';
      btnSel.onclick = () => { 
        setKbAtiva(kb); 
        carregarKbs(); 
        renderKbInfo(); 
        // Removido redirecionamento automático para evitar navegação brusca
        // Usuário agora decide manualmente ir para Consulta ou Editor pelo menu
      };
      const btnDel = document.createElement('button');
      btnDel.textContent = 'Apagar';
      btnDel.onclick = () => apagarKb(kb);
      acoes.append(btnSel, btnDel);
      li.appendChild(acoes);
      listaKbsEl.appendChild(li);
    });
  } catch(e) {
    listaKbsEl.innerHTML = '<li>Erro ao carregar KBs.</li>';
  }
}

async function apagarKb(nome) {
  if (!confirm(`Apagar KB '${nome}'? Esta ação é irreversível.`)) return;
  await fetch(`${API_URL}/api/kbs/${encodeURIComponent(nome)}`, { method: 'DELETE' });
  if (getKbAtiva() === nome) setKbAtiva('');
  carregarKbs();
  renderKbInfo();
}

async function criarKb() {
  const nome = (inputNovaKb.value || '').trim();
  if (!nome) { alert('Informe um nome.'); return; }
  const resp = await fetch(`${API_URL}/api/kbs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nome })
  });
  if (!resp.ok) {
    const d = await resp.json().catch(()=>({}));
    alert(d.mensagem || d.erro || 'Falha ao criar KB');
  }
  inputNovaKb.value='';
  carregarKbs();
  renderKbInfo();
}

btnCriarKb?.addEventListener('click', criarKb);

document.addEventListener('DOMContentLoaded', () => {
  carregarKbs();
  renderKbInfo();
});
