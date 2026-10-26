import { iniciarPagina, sb, api, esc, ic, brl, param, digitos, validarCPF, aplicarMascaras, buscarCEP, erroAmigavel, chipStatus, dataBR, toast, CONFIGURADO, $, $$ } from './core.js';

// Link de "esqueci minha senha" (capturado antes do Supabase limpar a URL)
const recuperando = /type=recovery/.test(location.hash) || new URLSearchParams(location.search).get('reset') === '1';

const { cfg } = await iniciarPagina();
document.title = `Minha conta | ${cfg.nome_loja}`;
const main = $('#conteudo');
const c = await sb();

const usuario = await api.usuario();
if (!usuario) {
  if (!CONFIGURADO) main.innerHTML = `<div class="painel vazio"><h2>Modo demonstração</h2><p>Configure o Supabase para usar a área do cliente.</p></div>`;
  else location.replace('entrar.html?next=minha-conta.html');
  throw new Error('sem login');
}

const perfil = (await api.perfil()) || { id: usuario.id, email: usuario.email };
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

main.innerHTML = `
<h1>Olá, ${esc((perfil.nome || 'cliente').split(' ')[0])}!</h1>
<div class="conta-grid">
  <nav class="conta-menu">
    <button data-sec="pedidos">${ic.caixa} Meus pedidos</button>
    <button data-sec="dados">${ic.usuario} Meus dados</button>
    <button data-sec="senha">${ic.config} Alterar senha</button>
    <a href="#" id="sair-conta">${ic.sair} Sair</a>
  </nav>
  <div>
    <section id="sec-pedidos" class="painel"><h2>${ic.caixa} Meus pedidos</h2><div id="lista-pedidos"><div class="carregando"><div class="spinner"></div></div></div></section>

    <form id="sec-dados" class="painel" novalidate>
      <h2>${ic.usuario} Meus dados</h2>
      <div id="msg-dados"></div>
      <div class="form-grid">
        <div class="campo"><label>Nome completo *</label><input id="d-nome" value="${esc(perfil.nome || '')}"></div>
        <div class="campo c3"><label>CPF *</label><input id="d-cpf" data-mask="cpf" inputmode="numeric" value="${esc(perfil.cpf || '')}"></div>
        <div class="campo c3"><label>Telefone / WhatsApp *</label><input id="d-tel" data-mask="tel" inputmode="tel" value="${esc(perfil.telefone || '')}"></div>
        <div class="campo"><label>E-mail (login)</label><input value="${esc(usuario.email)}" disabled></div>
        <div class="sub-titulo">Endereço de entrega</div>
        <div class="campo c2"><label>CEP *</label><input id="d-cep" data-mask="cep" inputmode="numeric" value="${esc(perfil.cep || '')}"></div>
        <div class="campo c4"><label>Rua / Avenida *</label><input id="d-rua" value="${esc(perfil.rua || '')}"></div>
        <div class="campo c2"><label>Número *</label><input id="d-num" value="${esc(perfil.numero || '')}"></div>
        <div class="campo c4"><label>Complemento</label><input id="d-comp" value="${esc(perfil.complemento || '')}"></div>
        <div class="campo c2"><label>Bairro *</label><input id="d-bairro" value="${esc(perfil.bairro || '')}"></div>
        <div class="campo c2"><label>Cidade *</label><input id="d-cidade" value="${esc(perfil.cidade || '')}"></div>
        <div class="campo c2"><label>Estado *</label><select id="d-uf"><option value="">UF</option>${UFS.map((u) => `<option ${u === perfil.uf ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      </div>
      <button class="btn btn-p btn-grande" style="margin-top:18px" type="submit">Salvar dados</button>
    </form>

    <form id="sec-senha" class="painel" novalidate>
      <h2>${ic.config} ${recuperando ? 'Crie sua nova senha' : 'Alterar senha'}</h2>
      <div id="msg-senha"></div>
      <div class="form-grid">
        <div class="campo c3"><label>Nova senha</label><input id="s1" type="password" autocomplete="new-password"></div>
        <div class="campo c3"><label>Confirmar nova senha</label><input id="s2" type="password" autocomplete="new-password"></div>
      </div>
      <button class="btn btn-p" style="margin-top:18px" type="submit">Salvar nova senha</button>
    </form>
  </div>
</div>`;

aplicarMascaras(main);

function mostrar(sec) {
  ['pedidos', 'dados', 'senha'].forEach((s) => $(`#sec-${s}`).classList.toggle('oculto', s !== sec));
  $$('.conta-menu button').forEach((b) => b.classList.toggle('ativa', b.dataset.sec === sec));
}
$$('.conta-menu button').forEach((b) => (b.onclick = () => { mostrar(b.dataset.sec); history.replaceState(null, '', '#' + b.dataset.sec); }));
$('#sair-conta').onclick = async (e) => { e.preventDefault(); await api.sair(); location.href = 'index.html'; };
mostrar(recuperando ? 'senha' : (['dados', 'senha'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'pedidos'));

// ---------- pedidos
const { data: pedidos, error } = await c.from('pedidos').select('*, pedido_itens(nome, quantidade)').order('criado_em', { ascending: false });
$('#lista-pedidos').innerHTML = error ? `<div class="alerta alerta-erro">${esc(erroAmigavel(error))}</div>`
  : !pedidos.length ? `<div class="vazio">${ic.sacola}<p>Você ainda não fez pedidos.</p><a class="btn btn-p" href="index.html#ofertas">Ver ofertas</a></div>`
  : pedidos.map((p) => `
    <div class="pedido-card">
      <div><div class="cod">${esc(p.codigo)}</div><div class="meta">${dataBR(p.criado_em)} • ${p.metodo === 'pix' ? 'PIX' : 'Cartão'}</div></div>
      <div class="total">${brl(p.total)}</div>
      <div class="meta" style="grid-column:1/-1">${(p.pedido_itens || []).map((i) => `${i.quantidade}× ${esc(i.nome)}`).join(' • ')}</div>
      <div class="acts">${chipStatus(p.status)}
        <a class="btn ${p.status === 'aguardando_pagamento' ? 'btn-p' : 'btn-leve'} btn-peq" href="pagamento.html?id=${esc(p.id)}">${p.status === 'aguardando_pagamento' ? `${ic.pix} Pagar / enviar comprovante` : 'Ver detalhes'}</a>
      </div>
    </div>`).join('');

// ---------- dados
$('#d-cep').addEventListener('input', async (e) => {
  if (digitos(e.target.value).length !== 8) return;
  const r = await buscarCEP(e.target.value);
  if (!r) return;
  $('#d-rua').value = r.logradouro || ''; $('#d-bairro').value = r.bairro || '';
  $('#d-cidade').value = r.localidade || ''; $('#d-uf').value = r.uf || '';
  $('#d-num').focus();
});

$('#sec-dados').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  const erros = [];
  if (['#d-nome', '#d-cpf', '#d-tel', '#d-cep', '#d-rua', '#d-num', '#d-bairro', '#d-cidade', '#d-uf'].some((id) => !v(id))) erros.push('Preencha todos os campos obrigatórios (*).');
  if (!validarCPF(v('#d-cpf'))) erros.push('CPF inválido.');
  if (digitos(v('#d-tel')).length < 10) erros.push('Telefone inválido.');
  if (erros.length) { $('#msg-dados').innerHTML = `<div class="alerta alerta-erro">${erros.join('<br>')}</div>`; return; }
  const dados = {
    id: usuario.id, email: usuario.email, nome: v('#d-nome'), cpf: v('#d-cpf'), telefone: v('#d-tel'), cep: v('#d-cep'),
    rua: v('#d-rua'), numero: v('#d-num'), complemento: v('#d-comp'), bairro: v('#d-bairro'), cidade: v('#d-cidade'), uf: v('#d-uf'),
  };
  const { error } = await c.from('perfis').upsert(dados);
  if (error) { $('#msg-dados').innerHTML = `<div class="alerta alerta-erro">${esc(erroAmigavel(error))}</div>`; return; }
  $('#msg-dados').innerHTML = '';
  toast('Dados salvos!');
  if (param('volta') === 'checkout') location.href = 'checkout.html';
});

// ---------- senha
$('#sec-senha').addEventListener('submit', async (e) => {
  e.preventDefault();
  const s1 = $('#s1').value, s2 = $('#s2').value;
  const m = $('#msg-senha');
  if (s1.length < 6) { m.innerHTML = '<div class="alerta alerta-erro">A senha precisa ter pelo menos 6 caracteres.</div>'; return; }
  if (s1 !== s2) { m.innerHTML = '<div class="alerta alerta-erro">As senhas não conferem.</div>'; return; }
  const { error } = await c.auth.updateUser({ password: s1 });
  m.innerHTML = error ? `<div class="alerta alerta-erro">${esc(erroAmigavel(error))}</div>` : '<div class="alerta alerta-ok">Senha alterada com sucesso!</div>';
  if (!error) { $('#s1').value = $('#s2').value = ''; }
});
