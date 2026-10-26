import { iniciarPagina, sb, CONFIGURADO, esc, ic, param, digitos, validarCPF, aplicarMascaras, buscarCEP, erroAmigavel, $, $$ } from './core.js';

const { cfg, usuario } = await iniciarPagina();
document.title = `Entrar | ${cfg.nome_loja}`;

const proximoBruto = param('next') || 'minha-conta.html';
const proximo = /^[a-z0-9-]+\.html(\?[\w=&%-]*)?(#[\w-]*)?$/i.test(proximoBruto) ? proximoBruto : 'minha-conta.html';
if (usuario) location.replace(proximo);

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const main = $('#conteudo');
main.innerHTML = `
<div class="auth-wrap">
  <h1>Minha conta</h1>
  ${proximo.startsWith('checkout') ? `<div class="alerta alerta-info">Para finalizar sua compra, entre na sua conta ou faça seu cadastro rapidinho.</div>` : ''}
  ${!CONFIGURADO ? `<div class="alerta alerta-erro">Modo demonstração: login e cadastro funcionam após configurar o Supabase.</div>` : ''}
  <div class="abas">
    <button data-aba="entrar">${ic.entrar} Já sou cliente</button>
    <button data-aba="cadastro">${ic.usuarioMais} Criar cadastro</button>
  </div>

  <form class="painel" id="f-entrar" novalidate>
    <div id="msg-entrar"></div>
    <div class="form-grid">
      <div class="campo"><label for="le">E-mail (login)</label><input id="le" type="email" autocomplete="email" required></div>
      <div class="campo"><label for="ls">Senha</label><input id="ls" type="password" autocomplete="current-password" required></div>
    </div>
    <button class="btn btn-p btn-grande btn-bloco" style="margin-top:18px" type="submit">Entrar</button>
    <p style="text-align:center;margin:14px 0 0"><a href="#" id="esqueci" style="color:var(--p);font-weight:600">Esqueci minha senha</a></p>
  </form>

  <form class="painel oculto" id="f-cadastro" novalidate>
    <div id="msg-cad"></div>
    <div class="form-grid">
      <div class="sub-titulo" style="border:0;margin:0;padding:0">Seus dados</div>
      <div class="campo"><label for="c-nome">Nome completo *</label><input id="c-nome" autocomplete="name" required></div>
      <div class="campo c3"><label for="c-cpf">CPF *</label><input id="c-cpf" data-mask="cpf" inputmode="numeric" required></div>
      <div class="campo c3"><label for="c-tel">Telefone / WhatsApp *</label><input id="c-tel" data-mask="tel" inputmode="tel" autocomplete="tel" required></div>
      <div class="sub-titulo">Endereço de entrega</div>
      <div class="campo c2"><label for="c-cep">CEP *</label><input id="c-cep" data-mask="cep" inputmode="numeric" autocomplete="postal-code" required><span class="ajuda" id="cep-ajuda">Preenche o endereço sozinho</span></div>
      <div class="campo c4"><label for="c-rua">Rua / Avenida *</label><input id="c-rua" autocomplete="address-line1" required></div>
      <div class="campo c2"><label for="c-num">Número *</label><input id="c-num" required></div>
      <div class="campo c4"><label for="c-comp">Complemento</label><input id="c-comp" placeholder="Apto, bloco, referência"></div>
      <div class="campo c2"><label for="c-bairro">Bairro *</label><input id="c-bairro" required></div>
      <div class="campo c2"><label for="c-cidade">Cidade *</label><input id="c-cidade" autocomplete="address-level2" required></div>
      <div class="campo c2"><label for="c-uf">Estado *</label><select id="c-uf" required><option value="">UF</option>${UFS.map((u) => `<option>${u}</option>`).join('')}</select></div>
      <div class="sub-titulo">Acesso à sua conta</div>
      <div class="campo"><label for="c-email">E-mail (será seu login) *</label><input id="c-email" type="email" autocomplete="email" required></div>
      <div class="campo c3"><label for="c-senha">Senha *</label><input id="c-senha" type="password" autocomplete="new-password" minlength="6" required><span class="ajuda">Mínimo 6 caracteres</span></div>
      <div class="campo c3"><label for="c-senha2">Confirmar senha *</label><input id="c-senha2" type="password" autocomplete="new-password" required></div>
      <label class="checkbox campo"><input type="checkbox" id="c-aceite" required> <span>Li e concordo com a <a href="politicas.html#privacidade" target="_blank" style="color:var(--p);font-weight:600">Política de Privacidade</a> e autorizo o uso dos meus dados para processar meus pedidos.</span></label>
    </div>
    <button class="btn btn-p btn-grande btn-bloco" style="margin-top:18px" type="submit">Criar cadastro e continuar</button>
  </form>
</div>`;

aplicarMascaras(main);

function aba(nome) {
  $$('.abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
  $('#f-entrar').classList.toggle('oculto', nome !== 'entrar');
  $('#f-cadastro').classList.toggle('oculto', nome !== 'cadastro');
}
$$('.abas button').forEach((b) => (b.onclick = () => aba(b.dataset.aba)));
aba(param('modo') === 'cadastro' ? 'cadastro' : 'entrar');

const msg = (el, txt, tipo = 'erro') => { $(el).innerHTML = txt ? `<div class="alerta alerta-${tipo}">${txt}</div>` : ''; };
const carregando = (form, on) => { const b = $('button[type=submit]', form); b.disabled = on; b.dataset.t ??= b.textContent; b.textContent = on ? 'Aguarde...' : b.dataset.t; };

// ---------- CEP automático
$('#c-cep').addEventListener('input', async (e) => {
  if (digitos(e.target.value).length !== 8) return;
  $('#cep-ajuda').textContent = 'Buscando...';
  const r = await buscarCEP(e.target.value);
  if (!r) { $('#cep-ajuda').textContent = 'CEP não encontrado, preencha manualmente.'; return; }
  $('#c-rua').value = r.logradouro || ''; $('#c-bairro').value = r.bairro || '';
  $('#c-cidade').value = r.localidade || ''; $('#c-uf').value = r.uf || '';
  $('#cep-ajuda').textContent = 'Endereço encontrado ✓';
  $(r.logradouro ? '#c-num' : '#c-rua').focus();
});

// ---------- entrar
$('#f-entrar').addEventListener('submit', async (e) => {
  e.preventDefault();
  msg('#msg-entrar', '');
  const c = await sb();
  if (!c) return msg('#msg-entrar', 'Configure o Supabase para ativar o login.');
  carregando(e.target, true);
  const { error } = await c.auth.signInWithPassword({ email: $('#le').value.trim(), password: $('#ls').value });
  carregando(e.target, false);
  if (error) return msg('#msg-entrar', esc(erroAmigavel(error)));
  location.href = proximo;
});

$('#esqueci').onclick = async (e) => {
  e.preventDefault();
  const email = $('#le').value.trim();
  if (!email) return msg('#msg-entrar', 'Digite seu e-mail no campo acima e clique de novo em "Esqueci minha senha".', 'info');
  const c = await sb();
  if (!c) return;
  const destino = new URL('minha-conta.html?reset=1', location.href).href;
  const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: destino });
  msg('#msg-entrar', error ? esc(erroAmigavel(error)) : 'Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.', error ? 'erro' : 'ok');
};

// ---------- cadastro
$('#f-cadastro').addEventListener('submit', async (e) => {
  e.preventDefault();
  msg('#msg-cad', '');
  const v = (id) => $(id).value.trim();
  const obrig = ['#c-nome', '#c-cpf', '#c-tel', '#c-cep', '#c-rua', '#c-num', '#c-bairro', '#c-cidade', '#c-uf', '#c-email', '#c-senha'];
  obrig.forEach((id) => $(id).classList.toggle('invalido', !v(id)));
  const erros = [];
  if (obrig.some((id) => !v(id))) erros.push('Preencha todos os campos obrigatórios (*).');
  if (v('#c-nome').split(' ').filter(Boolean).length < 2) erros.push('Informe nome e sobrenome.');
  if (!validarCPF(v('#c-cpf'))) { erros.push('CPF inválido.'); $('#c-cpf').classList.add('invalido'); }
  if (digitos(v('#c-tel')).length < 10) erros.push('Telefone inválido.');
  if (digitos(v('#c-cep')).length !== 8) erros.push('CEP inválido.');
  if (v('#c-senha').length < 6) erros.push('A senha precisa ter pelo menos 6 caracteres.');
  if (v('#c-senha') !== $('#c-senha2').value) erros.push('As senhas não conferem.');
  if (!$('#c-aceite').checked) erros.push('Aceite a Política de Privacidade para continuar.');
  if (erros.length) { msg('#msg-cad', erros.join('<br>')); $('#msg-cad').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

  const c = await sb();
  if (!c) return msg('#msg-cad', 'Configure o Supabase para ativar o cadastro.');
  carregando(e.target, true);
  const dados = {
    nome: v('#c-nome'), cpf: v('#c-cpf'), telefone: v('#c-tel'), cep: v('#c-cep'), rua: v('#c-rua'),
    numero: v('#c-num'), complemento: v('#c-comp'), bairro: v('#c-bairro'), cidade: v('#c-cidade'), uf: v('#c-uf'),
  };
  const { data, error } = await c.auth.signUp({
    email: v('#c-email'), password: v('#c-senha'),
    options: { data: dados, emailRedirectTo: new URL(proximo, location.href).href },
  });
  carregando(e.target, false);
  if (error) return msg('#msg-cad', esc(erroAmigavel(error)));
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return msg('#msg-cad', 'Este e-mail já tem cadastro. Use a aba "Já sou cliente".');
  }
  if (data.session) { location.href = proximo; return; }
  $('#f-cadastro').innerHTML = `<div class="vazio">${ic.check}<h2>Cadastro criado!</h2><p>Enviamos um link de confirmação para <b>${esc(v('#c-email'))}</b>.<br>Clique nele e depois faça login para finalizar sua compra.</p><button class="btn btn-p" type="button" id="ir-login">Ir para o login</button></div>`;
  $('#ir-login').onclick = () => aba('entrar');
});
