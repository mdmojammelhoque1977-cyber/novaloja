// Painel administrativo
import { sb, CONFIGURADO, esc, ic, brl, dataBR, linkWhats, digitos, toast, erroAmigavel, aplicarTema, STATUS, chipStatus, descontoPct, $, $$ } from './core.js';
import { gerarPix } from './pix.js';

const app = $('#app');
document.body.classList.add('pronto');

if (!CONFIGURADO) {
  app.innerHTML = `<div class="adm-login"><div class="painel"><h1>Painel administrativo</h1>
    <div class="alerta alerta-info">Preencha o arquivo <b>assets/js/config.js</b> com a URL e a chave anon do seu projeto Supabase e rode o <b>supabase/schema.sql</b>. Veja o passo a passo no README.</div></div></div>`;
  throw new Error('Supabase não configurado');
}

const c = await sb();
let cfg = null;
let categorias = [];

// =====================================================================
// LOGIN
// =====================================================================
function telaLogin(msg = '') {
  app.innerHTML = `
  <div class="adm-login">
    <form class="painel" id="f-login">
      <div class="adm-login-ic">${ic.config}</div>
      <h1>Painel administrativo</h1>
      <p class="muted">Entre com o e-mail e senha da sua conta de administrador.</p>
      ${msg ? `<div class="alerta alerta-erro">${msg}</div>` : ''}
      <div class="form-grid">
        <div class="campo"><label>E-mail</label><input id="a-email" type="email" autocomplete="email" required></div>
        <div class="campo"><label>Senha</label><input id="a-senha" type="password" autocomplete="current-password" required></div>
      </div>
      <button class="btn btn-p btn-grande btn-bloco" style="margin-top:18px">Entrar no painel</button>
      <p style="text-align:center;margin:14px 0 0"><a href="index.html" class="muted">← Voltar para a loja</a></p>
    </form>
  </div>`;
  $('#f-login').onsubmit = async (e) => {
    e.preventDefault();
    const b = $('button', e.target); b.disabled = true; b.textContent = 'Entrando...';
    const { error } = await c.auth.signInWithPassword({ email: $('#a-email').value.trim(), password: $('#a-senha').value });
    if (error) return telaLogin(esc(erroAmigavel(error)));
    iniciar();
  };
}

function semPermissao(email) {
  app.innerHTML = `<div class="adm-login"><div class="painel"><h1>Acesso restrito</h1>
    <p>A conta <b>${esc(email)}</b> não é administradora.</p>
    <div class="alerta alerta-info">Para liberar, no Supabase vá em <b>SQL Editor</b> e rode:<br>
    <code style="display:block;margin-top:8px;word-break:break-all">update public.perfis set is_admin = true where email = '${esc(email)}';</code></div>
    <button class="btn btn-leve" id="sair">${ic.sair} Sair</button></div></div>`;
  $('#sair').onclick = async () => { await c.auth.signOut(); telaLogin(); };
}

async function iniciar() {
  const { data: { session } } = await c.auth.getSession();
  if (!session) return telaLogin();
  const { data: perfil } = await c.from('perfis').select('is_admin').eq('id', session.user.id).maybeSingle();
  if (!perfil?.is_admin) return semPermissao(session.user.email);
  await recarregarConfig();
  renderLayout(session.user.email);
  ir(location.hash.slice(1) || 'painel');
}

async function recarregarConfig() {
  const r = await c.from('configuracoes').select('*').eq('id', 1).single();
  cfg = r.data;
  aplicarTema(cfg);
  categorias = (await c.from('categorias').select('*').order('ordem').order('nome')).data || [];
}

// =====================================================================
// LAYOUT
// =====================================================================
const SECOES = {
  painel: { nome: 'Painel', icone: ic.grafico, fn: secaoPainel },
  pedidos: { nome: 'Pedidos', icone: ic.caixa, fn: secaoPedidos },
  produtos: { nome: 'Produtos', icone: ic.sacola, fn: secaoProdutos },
  categorias: { nome: 'Categorias', icone: ic.grade, fn: secaoCategorias },
  banners: { nome: 'Banners', icone: ic.imagem, fn: secaoBanners },
  clientes: { nome: 'Clientes', icone: ic.usuarios, fn: secaoClientes },
  config: { nome: 'Configurações', icone: ic.config, fn: secaoConfig },
};

function renderLayout(email) {
  app.innerHTML = `
  <div class="adm">
    <aside class="adm-lado" id="adm-lado">
      <div class="adm-marca">${cfg.logo_url ? `<img src="${esc(cfg.logo_url)}" alt="">` : `<b>${esc(cfg.nome_loja)}</b>`}<small>Painel administrativo</small></div>
      <nav>${Object.entries(SECOES).map(([k, s]) => `<button data-ir="${k}">${s.icone}<span>${s.nome}</span><em class="adm-badge" id="badge-${k}"></em></button>`).join('')}</nav>
      <div class="adm-pe">
        <a href="index.html" target="_blank">${ic.externo} Ver loja</a>
        <span class="muted" title="${esc(email)}">${esc(email)}</span>
        <button id="adm-sair">${ic.sair} Sair</button>
      </div>
    </aside>
    <div class="adm-main">
      <header class="adm-topo">
        <button class="adm-menu" id="adm-menu" aria-label="Menu">${ic.menu}</button>
        <h1 id="adm-titulo"></h1>
        <div id="adm-acoes" class="adm-acoes"></div>
      </header>
      <div id="adm-conteudo" class="adm-conteudo"></div>
    </div>
  </div>`;
  $$('[data-ir]').forEach((b) => (b.onclick = () => ir(b.dataset.ir)));
  $('#adm-menu').onclick = () => $('#adm-lado').classList.toggle('aberto');
  $('#adm-sair').onclick = async () => { await c.auth.signOut(); location.hash = ''; telaLogin(); };
  atualizarBadge();
}

async function atualizarBadge() {
  const { count } = await c.from('pedidos').select('id', { count: 'exact', head: true }).eq('status', 'aguardando_pagamento');
  const b = $('#badge-pedidos');
  if (b) b.textContent = count ? count : '';
}

function ir(sec) {
  if (!SECOES[sec]) sec = 'painel';
  history.replaceState(null, '', '#' + sec);
  $$('[data-ir]').forEach((b) => b.classList.toggle('ativo', b.dataset.ir === sec));
  $('#adm-lado').classList.remove('aberto');
  $('#adm-titulo').textContent = SECOES[sec].nome;
  $('#adm-acoes').innerHTML = '';
  const area = $('#adm-conteudo');
  area.onclick = area.onchange = null;
  area.innerHTML = '<div class="carregando"><div class="spinner"></div></div>';
  SECOES[sec].fn().catch((e) => {
    console.error(e);
    $('#adm-conteudo').innerHTML = `<div class="alerta alerta-erro">${esc(erroAmigavel(e))}</div>`;
  });
}

// =====================================================================
// MODAL + FORMULÁRIOS
// =====================================================================
function modal(titulo, corpo, largura = '760px') {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-caixa" style="max-width:${largura}"><div class="modal-topo"><h3>${titulo}</h3><button class="modal-x" aria-label="Fechar">${ic.x}</button></div><div class="modal-corpo">${corpo}</div></div>`;
  document.body.appendChild(m);
  document.body.style.overflow = 'hidden';
  const fechar = () => { m.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => e.key === 'Escape' && fechar();
  document.addEventListener('keydown', esc_);
  $('.modal-x', m).onclick = fechar;
  m.addEventListener('mousedown', (e) => { if (e.target === m) fechar(); });
  requestAnimationFrame(() => m.classList.add('show'));
  return { el: m, fechar };
}

function confirmar(texto) {
  return new Promise((ok) => {
    const { el, fechar } = modal('Confirmar', `<p>${texto}</p><div class="modal-botoes"><button class="btn btn-leve" data-n>Cancelar</button><button class="btn btn-p" data-s>Confirmar</button></div>`, '420px');
    $('[data-n]', el).onclick = () => { fechar(); ok(false); };
    $('[data-s]', el).onclick = () => { fechar(); ok(true); };
  });
}

const paraLocal = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function campoHtml(f, v) {
  const span = f.col ? ` c${f.col}` : '';
  const aj = f.ajuda ? `<span class="ajuda">${f.ajuda}</span>` : '';
  const lab = `<label for="f-${f.k}">${f.label}${f.obrig ? ' *' : ''}</label>`;
  const nome = `name="${f.k}" id="f-${f.k}"`;
  switch (f.tipo) {
    case 'textarea': return `<div class="campo${span}">${lab}<textarea ${nome} placeholder="${esc(f.ph || '')}">${esc(v ?? '')}</textarea>${aj}</div>`;
    case 'checkbox': return `<label class="checkbox campo sw${span}"><input type="checkbox" ${nome} ${v ? 'checked' : ''}><span>${f.label}${f.ajuda ? `<br><small class="muted">${f.ajuda}</small>` : ''}</span></label>`;
    case 'select': return `<div class="campo${span}">${lab}<select ${nome}>${f.opcoes.map((o) => `<option value="${esc(o.v)}" ${String(o.v) === String(v ?? '') ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>${aj}</div>`;
    case 'cor': return `<div class="campo${span}">${lab}<div class="cor-linha"><input type="color" ${nome} value="${esc(v || '#000000')}"><code>${esc(v || '')}</code></div>${aj}</div>`;
    case 'datahora': return `<div class="campo${span}">${lab}<input type="datetime-local" ${nome} value="${paraLocal(v)}">${aj}</div>`;
    case 'dinheiro': return `<div class="campo${span}">${lab}<div class="pre-campo"><span>R$</span><input type="number" step="0.01" min="0" inputmode="decimal" ${nome} value="${v ?? ''}"></div>${aj}</div>`;
    case 'numero': return `<div class="campo${span}">${lab}<input type="number" step="${f.passo || 1}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.maxv !== undefined ? `max="${f.maxv}"` : ''} ${nome} value="${v ?? ''}">${aj}</div>`;
    case 'imagem':
    case 'imagens': {
      const lista = f.tipo === 'imagens' ? (v || []) : (v ? [v] : []);
      return `<div class="campo${span}">${lab}
        <div class="up" data-multi="${f.tipo === 'imagens' ? 1 : 0}" data-pasta="${f.pasta || 'geral'}" data-max="${f.max || 1600}">
          <input type="hidden" ${nome} value="${esc(JSON.stringify(lista))}">
          <div class="up-lista"></div>
          <div class="up-linha">
            <label class="btn btn-leve btn-peq up-btn">${ic.imagem} ${f.tipo === 'imagens' ? 'Enviar imagens' : 'Enviar imagem'}<input type="file" accept="image/*" ${f.tipo === 'imagens' ? 'multiple' : ''} hidden></label>
            <input type="url" class="up-url" placeholder="ou cole o link de uma imagem e tecle Enter">
          </div>
        </div>${aj}</div>`;
    }
    default: return `<div class="campo${span}">${lab}<input type="${f.tipo || 'text'}" ${nome} value="${esc(v ?? '')}" placeholder="${esc(f.ph || '')}">${aj}</div>`;
  }
}

function lerCampos(form, campos) {
  const o = {};
  for (const f of campos) {
    const el = form.elements[f.k];
    if (!el) continue;
    switch (f.tipo) {
      case 'checkbox': o[f.k] = el.checked; break;
      case 'numero': case 'dinheiro': o[f.k] = el.value === '' ? null : Number(el.value); break;
      case 'imagem': o[f.k] = JSON.parse(el.value || '[]')[0] || null; break;
      case 'imagens': o[f.k] = JSON.parse(el.value || '[]'); break;
      case 'datahora': o[f.k] = el.value ? new Date(el.value).toISOString() : null; break;
      case 'select': o[f.k] = el.value === '' && f.nulo ? null : el.value; break;
      default: o[f.k] = el.value.trim();
    }
  }
  return o;
}

function validar(form, campos, dados) {
  const faltando = campos.filter((f) => f.obrig && (dados[f.k] === null || dados[f.k] === '' || (Array.isArray(dados[f.k]) && !dados[f.k].length)));
  $$('.invalido', form).forEach((x) => x.classList.remove('invalido'));
  faltando.forEach((f) => form.elements[f.k]?.classList?.add('invalido'));
  return faltando.length ? `Preencha: ${faltando.map((f) => f.label).join(', ')}` : '';
}

// ---------- upload de imagens (redimensiona e converte para WebP antes de enviar)
async function otimizar(file, max) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/webp', 0.86));
    return blob && blob.size < file.size * 1.2 ? blob : file;
  } catch { return file; }
}

async function enviarImagem(file, pasta, max) {
  if (file.size > 15 * 1024 * 1024) throw new Error('Imagem muito grande (máx. 15 MB).');
  const blob = await otimizar(file, max);
  const ext = blob.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'png').toLowerCase();
  const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await c.storage.from('loja').upload(caminho, blob, { contentType: blob.type || file.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return c.storage.from('loja').getPublicUrl(caminho).data.publicUrl;
}

function ligarUploads(raiz) {
  $$('.up', raiz).forEach((box) => {
    const multi = box.dataset.multi === '1';
    const hid = $('input[type=hidden]', box);
    const lista = $('.up-lista', box);
    const ler = () => JSON.parse(hid.value || '[]');
    const gravar = (arr) => { hid.value = JSON.stringify(arr); desenhar(); };
    const desenhar = (enviando = 0) => {
      const urls = ler();
      lista.innerHTML = urls.map((u, i) => `
        <div class="up-item">
          <img src="${esc(u)}" alt="">
          ${multi && i === 0 ? '<span class="up-princ">Principal</span>' : ''}
          <div class="up-acoes">
            ${multi && i > 0 ? `<button type="button" data-princ="${i}" title="Tornar principal">★</button>` : ''}
            <button type="button" data-rem="${i}" title="Remover">${ic.lixo}</button>
          </div>
        </div>`).join('') + '<div class="up-item up-enviando"><div class="spinner"></div></div>'.repeat(enviando);
    };
    const adicionar = (url) => gravar(multi ? [...ler(), url] : [url]);
    lista.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = ler();
      if (b.dataset.rem !== undefined) a.splice(Number(b.dataset.rem), 1);
      if (b.dataset.princ !== undefined) a.unshift(a.splice(Number(b.dataset.princ), 1)[0]);
      gravar(a);
    };
    $('input[type=file]', box).onchange = async (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      let faltam = files.length;
      desenhar(faltam);
      for (const f of files) {
        try { adicionar(await enviarImagem(f, box.dataset.pasta, Number(box.dataset.max))); }
        catch (err) { toast(erroAmigavel(err), 'erro'); }
        desenhar(--faltam);
      }
    };
    $('.up-url', box).onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const u = e.target.value.trim();
      if (/^https?:\/\//.test(u)) { adicionar(u); e.target.value = ''; } else toast('Cole um link começando com https://', 'erro');
    };
    desenhar();
  });
  $$('input[type=color]', raiz).forEach((i) => i.addEventListener('input', () => { i.nextElementSibling.textContent = i.value; }));
}

// =====================================================================
// CRUD GENÉRICO (produtos, categorias, banners)
// =====================================================================
async function secaoCrud({ tabela, singular, campos, colunas, ordem, filtro }) {
  const area = $('#adm-conteudo');
  $('#adm-acoes').innerHTML = `<button class="btn btn-p" id="novo">${ic.mais} Novo ${singular}</button>`;
  let linhas = [];
  let termo = '';

  async function carregar() {
    let qy = c.from(tabela).select('*');
    for (const [col, asc] of ordem) qy = qy.order(col, { ascending: asc });
    const { data, error } = await qy;
    if (error) throw error;
    linhas = data;
    desenhar();
  }

  function desenhar() {
    const vis = termo ? linhas.filter((l) => JSON.stringify(l).toLowerCase().includes(termo)) : linhas;
    area.innerHTML = `
      ${filtro ? `<div class="adm-barra"><div class="adm-busca">${ic.busca}<input id="busca" placeholder="Buscar..." value="${esc(termo)}"></div><span class="muted">${vis.length} de ${linhas.length}</span></div>` : ''}
      <div class="painel adm-tabela-wrap">${vis.length ? `
        <table class="adm-tabela">
          <thead><tr>${colunas.map((col) => `<th>${col.t}</th>`).join('')}<th>Ativo</th><th></th></tr></thead>
          <tbody>${vis.map((l) => `<tr>
            ${colunas.map((col) => `<td data-t="${esc(col.t)}">${col.v(l)}</td>`).join('')}
            <td data-t="Ativo"><label class="switch"><input type="checkbox" data-ativo="${l.id}" ${l.ativo ? 'checked' : ''}><span></span></label></td>
            <td class="td-acoes"><button class="btn btn-leve btn-peq" data-edit="${l.id}">${ic.editar} Editar</button><button class="btn-ic" data-del="${l.id}" title="Excluir">${ic.lixo}</button></td>
          </tr>`).join('')}</tbody>
        </table>` : `<div class="vazio">${ic.caixa}<p>Nenhum ${singular} ${termo ? 'encontrado' : 'cadastrado ainda'}.</p></div>`}
      </div>`;
    const b = $('#busca');
    if (b) { b.oninput = () => { termo = b.value.toLowerCase(); const pos = b.selectionStart; desenhar(); const nb = $('#busca'); nb.focus(); nb.setSelectionRange(pos, pos); }; }
  }

  function abrir(reg) {
    const camposAtuais = typeof campos === 'function' ? campos() : campos;
    const { el, fechar } = modal(reg ? `Editar ${singular}` : `Novo ${singular}`, `
      <form id="f-crud" novalidate>
        <div id="f-msg"></div>
        <div class="form-grid">${camposAtuais.map((f) => campoHtml(f, reg ? reg[f.k] : f.padrao)).join('')}</div>
        <div class="modal-botoes"><button type="button" class="btn btn-leve" data-cancelar>Cancelar</button><button class="btn btn-p">${ic.check} Salvar</button></div>
      </form>`);
    ligarUploads(el);
    $('[data-cancelar]', el).onclick = fechar;
    $('#f-crud', el).onsubmit = async (e) => {
      e.preventDefault();
      const dados = lerCampos(e.target, camposAtuais);
      const erro = validar(e.target, camposAtuais, dados) || (tabela === 'produtos' && dados.preco_de && dados.preco_de <= dados.preco_por ? 'O "Preço de" deve ser maior que o "Preço por" (ou deixe vazio).' : '');
      if (erro) { $('#f-msg', el).innerHTML = `<div class="alerta alerta-erro">${esc(erro)}</div>`; return; }
      if ($('.up-enviando', el)) { $('#f-msg', el).innerHTML = '<div class="alerta alerta-info">Aguarde o envio das imagens terminar.</div>'; return; }
      const btn = $('button:not([type])', e.target); btn.disabled = true;
      const r = reg ? await c.from(tabela).update(dados).eq('id', reg.id) : await c.from(tabela).insert(dados);
      btn.disabled = false;
      if (r.error) { $('#f-msg', el).innerHTML = `<div class="alerta alerta-erro">${esc(erroAmigavel(r.error))}</div>`; return; }
      fechar();
      toast(`${singular[0].toUpperCase() + singular.slice(1)} salvo!`);
      if (tabela === 'categorias') await recarregarConfig();
      carregar();
    };
  }

  area.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) abrir(linhas.find((l) => l.id === b.dataset.edit));
    if (b.dataset.del) {
      const l = linhas.find((x) => x.id === b.dataset.del);
      if (!(await confirmar(`Excluir "${esc(l.nome || l.titulo || singular)}"? Essa ação não pode ser desfeita.`))) return;
      const { error } = await c.from(tabela).delete().eq('id', l.id);
      if (error) return toast(erroAmigavel(error), 'erro');
      toast('Excluído.');
      if (tabela === 'categorias') await recarregarConfig();
      carregar();
    }
  };
  area.onchange = async (e) => {
    const id = e.target.dataset.ativo;
    if (!id) return;
    const { error } = await c.from(tabela).update({ ativo: e.target.checked }).eq('id', id);
    if (error) { toast(erroAmigavel(error), 'erro'); e.target.checked = !e.target.checked; return; }
    linhas.find((l) => l.id === id).ativo = e.target.checked;
    toast(e.target.checked ? 'Ativado — aparece na loja.' : 'Desativado — oculto da loja.');
  };
  $('#novo').onclick = () => abrir(null);
  await carregar();
}

const miniatura = (u) => u ? `<img class="adm-mini" src="${esc(u)}" alt="">` : `<span class="adm-mini vazio-mini">${ic.imagem}</span>`;

function secaoProdutos() {
  return secaoCrud({
    tabela: 'produtos', singular: 'produto', filtro: true,
    ordem: [['ordem', true], ['criado_em', false]],
    campos: () => [
      { k: 'nome', label: 'Nome do produto', obrig: true },
      { k: 'categoria_id', label: 'Categoria', tipo: 'select', nulo: true, col: 3, opcoes: [{ v: '', t: '— Sem categoria —' }, ...categorias.map((x) => ({ v: x.id, t: x.nome }))] },
      { k: 'selo', label: 'Selo extra', col: 3, ph: 'Ex.: EXCLUSIVO SITE', ajuda: 'Aparece em destaque no card (opcional)' },
      { k: 'preco_de', label: 'Preço "De" (riscado)', tipo: 'dinheiro', col: 3, ajuda: 'Preço antigo. Gera o selo de % OFF' },
      { k: 'preco_por', label: 'Preço "Por" (promoção)', tipo: 'dinheiro', col: 3, obrig: true },
      { k: 'imagens', label: 'Imagens do produto', tipo: 'imagens', pasta: 'produtos', max: 1400, obrig: true, ajuda: 'A primeira é a principal. Fundo branco fica mais bonito. Tamanho ideal: 1000×1000 px.' },
      { k: 'descricao', label: 'Descrição', tipo: 'textarea', ph: 'Características, voltagem, capacidade, garantia...' },
      { k: 'estoque', label: 'Estoque', tipo: 'numero', col: 2, min: 0, ajuda: 'Vazio = sem controle' },
      { k: 'ordem', label: 'Ordem', tipo: 'numero', col: 2, padrao: 0, ajuda: 'Menor aparece primeiro' },
      { k: 'destaque', label: 'Destaque', tipo: 'checkbox', col: 2, ajuda: 'Aparece no topo' },
      { k: 'ativo', label: 'Ativo na loja', tipo: 'checkbox', col: 6, padrao: true },
    ],
    colunas: [
      { t: '', v: (p) => miniatura(p.imagens?.[0]) },
      { t: 'Produto', v: (p) => `<b>${esc(p.nome)}</b>${p.destaque ? ' <span class="chip st-aguardando">Destaque</span>' : ''}<br><small class="muted">${esc(categorias.find((x) => x.id === p.categoria_id)?.nome || 'Sem categoria')}</small>` },
      { t: 'Preço', v: (p) => `${p.preco_de ? `<s class="muted">${brl(p.preco_de)}</s><br>` : ''}<b>${brl(p.preco_por)}</b>${descontoPct(p) ? ` <span class="chip st-cancelado">-${descontoPct(p)}%</span>` : ''}` },
      { t: 'Estoque', v: (p) => p.estoque === null ? '<span class="muted">—</span>' : p.estoque <= 0 ? '<span class="chip st-cancelado">Esgotado</span>' : p.estoque },
    ],
  });
}

function secaoCategorias() {
  return secaoCrud({
    tabela: 'categorias', singular: 'categoria',
    ordem: [['ordem', true], ['nome', true]],
    campos: [
      { k: 'nome', label: 'Nome', obrig: true, col: 4 },
      { k: 'ordem', label: 'Ordem', tipo: 'numero', col: 2, padrao: 0 },
      { k: 'imagem_url', label: 'Imagem (aparece no círculo)', tipo: 'imagem', pasta: 'categorias', max: 600, ajuda: 'PNG com fundo transparente fica perfeito. Ideal: 500×500 px.' },
      { k: 'ativo', label: 'Ativa na loja', tipo: 'checkbox', padrao: true },
    ],
    colunas: [
      { t: '', v: (x) => miniatura(x.imagem_url) },
      { t: 'Categoria', v: (x) => `<b>${esc(x.nome)}</b>` },
      { t: 'Ordem', v: (x) => x.ordem },
    ],
  });
}

function secaoBanners() {
  return secaoCrud({
    tabela: 'banners', singular: 'banner',
    ordem: [['ordem', true]],
    campos: [
      { k: 'imagem_url', label: 'Imagem para computador', tipo: 'imagem', pasta: 'banners', max: 1920, obrig: true, ajuda: 'Tamanho ideal: <b>1920 × 600 px</b>.' },
      { k: 'imagem_mobile_url', label: 'Imagem para celular (opcional)', tipo: 'imagem', pasta: 'banners', max: 1000, ajuda: 'Tamanho ideal: <b>1000 × 1000 px</b>. Se vazio, usa a de computador.' },
      { k: 'titulo', label: 'Título (texto alternativo)', col: 4 },
      { k: 'ordem', label: 'Ordem', tipo: 'numero', col: 2, padrao: 0 },
      { k: 'link', label: 'Link ao clicar (opcional)', ph: 'produto.html?id=... ou index.html?cat=...' },
      { k: 'ativo', label: 'Ativo na loja', tipo: 'checkbox', padrao: true },
    ],
    colunas: [
      { t: '', v: (b) => `<img class="adm-mini-banner" src="${esc(b.imagem_url)}" alt="">` },
      { t: 'Banner', v: (b) => `<b>${esc(b.titulo || 'Sem título')}</b>${b.link ? `<br><small class="muted">${esc(b.link)}</small>` : ''}` },
      { t: 'Ordem', v: (b) => b.ordem },
    ],
  });
}

// =====================================================================
// PAINEL (resumo)
// =====================================================================
async function secaoPainel() {
  const [{ data: pedsR }, { count: nProd }, { count: nCli }] = await Promise.all([
    c.from('pedidos').select('id, codigo, status, total, metodo, criado_em, cliente').order('criado_em', { ascending: false }).limit(2000),
    c.from('produtos').select('id', { count: 'exact', head: true }).eq('ativo', true),
    c.from('perfis').select('id', { count: 'exact', head: true }),
  ]);
  const peds = pedsR || [];
  const hoje = new Date().toDateString();
  const pagos = peds.filter((p) => ['pago', 'enviado', 'entregue'].includes(p.status));
  const cards = [
    { t: 'Pedidos hoje', v: peds.filter((p) => new Date(p.criado_em).toDateString() === hoje).length, i: ic.caixa },
    { t: 'Aguardando pagamento', v: peds.filter((p) => p.status === 'aguardando_pagamento').length, i: ic.relogio, d: true },
    { t: 'Faturamento confirmado', v: brl(pagos.reduce((s, p) => s + Number(p.total), 0)), i: ic.grafico },
    { t: 'Produtos ativos', v: nProd ?? 0, i: ic.sacola },
    { t: 'Clientes cadastrados', v: nCli ?? 0, i: ic.usuarios },
  ];
  const pendencias = [];
  if (!cfg.pix_chave && cfg.pix_ativo) pendencias.push('Cadastre sua <b>chave PIX</b> em Configurações.');
  if (!cfg.whatsapp) pendencias.push('Informe o <b>WhatsApp</b> que recebe os comprovantes em Configurações.');
  if (!cfg.logo_url) pendencias.push('Envie a <b>logo</b> da loja em Configurações.');
  if (!nProd) pendencias.push('Cadastre seus <b>produtos</b> em promoção.');

  $('#adm-conteudo').innerHTML = `
    ${pendencias.length ? `<div class="alerta alerta-info"><b>Para deixar a loja pronta:</b><ul style="margin:6px 0 0;padding-left:20px">${pendencias.map((x) => `<li>${x}</li>`).join('')}</ul></div>` : ''}
    <div class="adm-cards">${cards.map((k) => `<div class="adm-card${k.d ? ' dest' : ''}"><span>${k.i}</span><div><small>${k.t}</small><strong>${k.v}</strong></div></div>`).join('')}</div>
    <div class="painel"><h2>${ic.caixa} Últimos pedidos</h2>
      ${peds.length ? `<table class="adm-tabela"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${peds.slice(0, 8).map((p) => `<tr class="clicavel" data-ped="${p.id}"><td data-t="Pedido"><b>${esc(p.codigo)}</b></td><td data-t="Cliente">${esc(p.cliente?.nome || '')}</td><td data-t="Data">${dataBR(p.criado_em)}</td><td data-t="Total">${brl(p.total)}</td><td data-t="Status">${chipStatus(p.status)}</td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">Nenhum pedido ainda.</p>'}
    </div>`;
  $('#adm-conteudo').onclick = (e) => { const tr = e.target.closest('[data-ped]'); if (tr) abrirPedido(tr.dataset.ped); };
}

// =====================================================================
// PEDIDOS
// =====================================================================
async function secaoPedidos() {
  let status = '', termo = '';
  const area = $('#adm-conteudo');
  const { data: peds, error } = await c.from('pedidos').select('*').order('criado_em', { ascending: false }).limit(1000);
  if (error) throw error;

  function desenhar() {
    const t = termo.toLowerCase();
    const vis = peds.filter((p) => (!status || p.status === status)
      && (!t || [p.codigo, p.cliente?.nome, p.cliente?.cpf, p.cliente?.telefone, p.cliente?.email].join(' ').toLowerCase().includes(t)));
    area.innerHTML = `
      <div class="adm-barra">
        <div class="adm-busca">${ic.busca}<input id="busca" placeholder="Buscar por nº do pedido, nome, CPF ou telefone" value="${esc(termo)}"></div>
        <select id="f-status" class="ordenar"><option value="">Todos os status</option>${Object.entries(STATUS).map(([k, s]) => `<option value="${k}" ${k === status ? 'selected' : ''}>${s.txt} (${peds.filter((p) => p.status === k).length})</option>`).join('')}</select>
      </div>
      <div class="painel adm-tabela-wrap">${vis.length ? `
        <table class="adm-tabela"><thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Pagamento</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
        ${vis.map((p) => `<tr class="clicavel" data-ped="${p.id}">
          <td data-t="Pedido"><b>${esc(p.codigo)}</b></td>
          <td data-t="Data">${dataBR(p.criado_em)}</td>
          <td data-t="Cliente">${esc(p.cliente?.nome || '')}<br><small class="muted">${esc(p.cliente?.telefone || '')}</small></td>
          <td data-t="Pagamento">${p.metodo === 'pix' ? `${ic.pix} PIX` : `${ic.cartao} Cartão`}</td>
          <td data-t="Total"><b>${brl(p.total)}</b></td>
          <td data-t="Status">${chipStatus(p.status)}</td>
          <td class="td-acoes"><button class="btn btn-leve btn-peq">Abrir</button></td>
        </tr>`).join('')}</tbody></table>` : `<div class="vazio">${ic.caixa}<p>Nenhum pedido encontrado.</p></div>`}
      </div>`;
    const b = $('#busca');
    b.oninput = () => { termo = b.value; const pos = b.selectionStart; desenhar(); const nb = $('#busca'); nb.focus(); nb.setSelectionRange(pos, pos); };
    $('#f-status').onchange = (e) => { status = e.target.value; desenhar(); };
  }
  area.onclick = (e) => {
    const tr = e.target.closest('[data-ped]');
    if (tr) abrirPedido(tr.dataset.ped, (atual) => { Object.assign(peds.find((p) => p.id === atual.id), atual); desenhar(); });
  };
  desenhar();
}

async function abrirPedido(id, aoSalvar) {
  const { data: p, error } = await c.from('pedidos').select('*, pedido_itens(*)').eq('id', id).single();
  if (error) return toast(erroAmigavel(error), 'erro');
  const cl = p.cliente || {};
  const endereco = `${cl.rua || ''}, ${cl.numero || ''}${cl.complemento ? ' - ' + cl.complemento : ''} — ${cl.bairro || ''} — ${cl.cidade || ''}/${cl.uf || ''} — CEP ${cl.cep || ''}`;
  const telZap = digitos(cl.telefone);
  const { el, fechar } = modal(`Pedido ${esc(p.codigo)}`, `
    <div class="ped-det">
      <div class="ped-col">
        <h4>Cliente</h4>
        <p><b>${esc(cl.nome)}</b><br>CPF: ${esc(cl.cpf)}<br>Tel: ${esc(cl.telefone)}<br>${esc(cl.email)}</p>
        ${telZap ? `<a class="btn btn-zap btn-peq" target="_blank" rel="noopener" href="${linkWhats('55' + telZap, `Olá ${(cl.nome || '').split(' ')[0]}! Sobre seu pedido ${p.codigo} na ${cfg.nome_loja}:`)}">${ic.whats} Chamar cliente</a>` : ''}
        <h4>Endereço de entrega</h4>
        <p>${esc(endereco)}</p>
        <button class="btn btn-leve btn-peq" id="copiar-end">${ic.copiar} Copiar endereço</button>
      </div>
      <div class="ped-col">
        <h4>Itens</h4>
        ${p.pedido_itens.map((i) => `<div class="linha-res" style="gap:10px"><span>${i.quantidade}× ${esc(i.nome)}<br><small class="muted">${brl(i.preco_unit)} cada</small></span><b style="white-space:nowrap">${brl(i.total)}</b></div>`).join('')}
        <div class="linha-res" style="border-top:1px solid var(--borda);margin-top:6px"><span>Subtotal</span><span>${brl(p.subtotal)}</span></div>
        ${Number(p.desconto) ? `<div class="linha-res desc"><span>Desconto PIX</span><span>- ${brl(p.desconto)}</span></div>` : ''}
        <div class="linha-res total"><span>Total</span><span>${brl(p.total)}</span></div>
        <p class="muted" style="font-size:13px">Feito em ${dataBR(p.criado_em)} • Pagamento: <b>${p.metodo === 'pix' ? 'PIX' : 'Cartão'}</b></p>
      </div>
    </div>
    <form id="f-ped" class="form-grid" style="margin-top:8px">
      <div class="campo c3"><label>Status do pedido</label><select name="status">${Object.entries(STATUS).map(([k, s]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${s.txt}</option>`).join('')}</select></div>
      <div class="campo"><label>Observação interna (só você vê)</label><textarea name="obs" placeholder="Ex.: comprovante recebido às 14h, enviado pela transportadora X, código de rastreio...">${esc(p.obs_admin || '')}</textarea></div>
      <div class="modal-botoes campo"><button type="button" class="btn btn-leve" data-fechar>Fechar</button><button class="btn btn-p">${ic.check} Salvar alterações</button></div>
    </form>`, '900px');
  $('[data-fechar]', el).onclick = fechar;
  $('#copiar-end', el).onclick = async () => { try { await navigator.clipboard.writeText(`${cl.nome}\n${endereco}\nTel: ${cl.telefone}`); toast('Endereço copiado!'); } catch { toast('Não foi possível copiar', 'erro'); } };
  $('#f-ped', el).onsubmit = async (e) => {
    e.preventDefault();
    const upd = { status: e.target.status.value, obs_admin: e.target.obs.value, atualizado_em: new Date().toISOString() };
    const { error: er } = await c.from('pedidos').update(upd).eq('id', p.id);
    if (er) return toast(erroAmigavel(er), 'erro');
    toast('Pedido atualizado!');
    fechar();
    atualizarBadge();
    aoSalvar?.({ ...p, ...upd });
  };
}

// =====================================================================
// CLIENTES
// =====================================================================
async function secaoClientes() {
  const { data, error } = await c.from('perfis').select('*').order('criado_em', { ascending: false });
  if (error) throw error;
  let termo = '';
  const area = $('#adm-conteudo');
  const desenhar = () => {
    const t = termo.toLowerCase();
    const vis = data.filter((x) => !t || [x.nome, x.email, x.cpf, x.telefone, x.cidade].join(' ').toLowerCase().includes(t));
    area.innerHTML = `
      <div class="adm-barra"><div class="adm-busca">${ic.busca}<input id="busca" placeholder="Buscar cliente" value="${esc(termo)}"></div><span class="muted">${vis.length} clientes</span></div>
      <div class="painel adm-tabela-wrap"><table class="adm-tabela"><thead><tr><th>Nome</th><th>Contato</th><th>CPF</th><th>Cidade</th><th>Cadastro</th></tr></thead><tbody>
      ${vis.map((x) => `<tr>
        <td data-t="Nome"><b>${esc(x.nome || '—')}</b>${x.is_admin ? ' <span class="chip st-enviado">Admin</span>' : ''}</td>
        <td data-t="Contato">${esc(x.email || '')}<br>${x.telefone ? `<a href="${linkWhats('55' + digitos(x.telefone))}" target="_blank" rel="noopener" style="color:var(--verde)">${esc(x.telefone)}</a>` : ''}</td>
        <td data-t="CPF">${esc(x.cpf || '')}</td>
        <td data-t="Cidade">${esc([x.cidade, x.uf].filter(Boolean).join('/'))}</td>
        <td data-t="Cadastro">${dataBR(x.criado_em)}</td>
      </tr>`).join('')}</tbody></table></div>`;
    const b = $('#busca');
    b.oninput = () => { termo = b.value; const pos = b.selectionStart; desenhar(); const nb = $('#busca'); nb.focus(); nb.setSelectionRange(pos, pos); };
  };
  desenhar();
}

// =====================================================================
// CONFIGURAÇÕES
// =====================================================================
const GRUPOS_CFG = [
  { t: 'Dados da loja', i: ic.sacola, campos: [
    { k: 'nome_loja', label: 'Nome da loja', obrig: true, col: 3 },
    { k: 'cnpj', label: 'CNPJ', col: 3 },
    { k: 'logo_url', label: 'Logo do site', tipo: 'imagem', pasta: 'logo', max: 800, ajuda: 'PNG com fundo transparente. Ideal: 600×250 px. Também vira o ícone da aba.' },
    { k: 'whatsapp', label: 'WhatsApp (recebe os comprovantes)', col: 3, obrig: true, ph: '5562999999999', ajuda: 'Somente números com 55 + DDD. Ex.: 5562999998888' },
    { k: 'telefone_exibicao', label: 'Telefone exibido no site', col: 3, ph: '(62) 99999-8888' },
    { k: 'email_contato', label: 'E-mail de contato', tipo: 'email', col: 3 },
    { k: 'endereco_loja', label: 'Cidade / endereço da loja', col: 3 },
  ] },
  { t: 'Promoção e textos', i: ic.presente, campos: [
    { k: 'faixa_topo', label: 'Faixa do topo', ajuda: 'Deixe vazio para esconder a faixa.' },
    { k: 'data_fim_promo', label: 'Fim da promoção (contagem regressiva)', tipo: 'datahora', col: 3 },
    { k: 'titulo_ofertas', label: 'Título da vitrine', col: 3 },
    { k: 'aviso_frete', label: 'Aviso de frete', ph: 'Ex.: Frete grátis para Goiânia' },
  ] },
  { t: 'Cores do site', i: ic.imagem, campos: [
    { k: 'cor_primaria', label: 'Cor principal', tipo: 'cor', col: 3, ajuda: 'Padrão: #8C1D40 (vinho)' },
    { k: 'cor_destaque', label: 'Cor de destaque', tipo: 'cor', col: 3, ajuda: 'Padrão: #FFD23F (amarelo)' },
  ] },
  { t: 'Pagamento via PIX', i: ic.pix, id: 'grupo-pix', campos: [
    { k: 'pix_ativo', label: 'Aceitar PIX', tipo: 'checkbox' },
    { k: 'pix_tipo', label: 'Tipo da chave', tipo: 'select', col: 2, opcoes: [{ v: 'cpf', t: 'CPF' }, { v: 'cnpj', t: 'CNPJ' }, { v: 'telefone', t: 'Telefone' }, { v: 'email', t: 'E-mail' }, { v: 'aleatoria', t: 'Chave aleatória' }] },
    { k: 'pix_chave', label: 'Chave PIX', col: 4, ajuda: 'Todos os pagamentos PIX caem nesta chave.' },
    { k: 'pix_nome', label: 'Nome do recebedor', col: 3, ajuda: 'Como aparece no seu banco (até 25 letras)' },
    { k: 'pix_cidade', label: 'Cidade do recebedor', col: 3 },
    { k: 'desconto_pix', label: 'Desconto no PIX (%)', tipo: 'numero', passo: 0.5, min: 0, maxv: 90, col: 2, ajuda: '0 = sem desconto' },
  ] },
  { t: 'Pagamento com cartão', i: ic.cartao, campos: [
    { k: 'cartao_ativo', label: 'Aceitar cartão de crédito', tipo: 'checkbox' },
    { k: 'cartao_link', label: 'Link de pagamento do cartão', tipo: 'url', col: 4, ph: 'https://link.mercadopago.com.br/sualoja', ajuda: 'Link da sua maquininha/gateway (Mercado Pago, InfinitePay, PagBank, Stone...). Se vazio, o cliente pede o link no WhatsApp.' },
    { k: 'parcelas_max', label: 'Parcelas máximas', tipo: 'numero', col: 2, min: 1, maxv: 24 },
    { k: 'cartao_instrucoes', label: 'Instruções mostradas ao cliente', tipo: 'textarea' },
  ] },
];

async function secaoConfig() {
  await recarregarConfig();
  const todos = GRUPOS_CFG.flatMap((g) => g.campos);
  const area = $('#adm-conteudo');
  area.innerHTML = `
    <form id="f-cfg" novalidate>
      <div id="cfg-msg"></div>
      ${GRUPOS_CFG.map((g) => `<div class="painel" ${g.id ? `id="${g.id}"` : ''}><h2>${g.i} ${g.t}</h2><div class="form-grid">${g.campos.map((f) => campoHtml(f, cfg[f.k])).join('')}</div>
        ${g.id === 'grupo-pix' ? `<div class="pix-teste"><button type="button" class="btn btn-leve btn-peq" id="testar-pix">${ic.pix} Gerar PIX de teste (R$ 1,00)</button><div id="pix-teste-res"></div></div>` : ''}</div>`).join('')}
      <div class="barra-salvar"><button class="btn btn-p btn-grande">${ic.check} Salvar configurações</button></div>
    </form>`;
  ligarUploads(area);

  $('#testar-pix').onclick = () => {
    const d = lerCampos($('#f-cfg'), todos);
    if (!d.pix_chave || !d.pix_nome || !d.pix_cidade) { $('#pix-teste-res').innerHTML = '<div class="alerta alerta-erro" style="margin-top:10px">Preencha chave, nome e cidade.</div>'; return; }
    const cod = gerarPix({ tipo: d.pix_tipo, chave: d.pix_chave, nome: d.pix_nome, cidade: d.pix_cidade, valor: 1, txid: 'TESTE' });
    $('#pix-teste-res').innerHTML = `<div class="alerta alerta-ok" style="margin-top:10px">Copie o código abaixo e cole no app do seu banco (PIX › Copia e Cola). Se aparecer seu nome e R$ 1,00, está tudo certo — não precisa pagar.<textarea readonly style="width:100%;margin-top:8px;font-size:12px;min-height:70px;border-radius:8px;border:1px solid #bde5cb;padding:8px">${esc(cod)}</textarea></div>`;
  };

  $('#f-cfg').onsubmit = async (e) => {
    e.preventDefault();
    const d = lerCampos(e.target, todos);
    d.whatsapp = digitos(d.whatsapp);
    if (d.whatsapp && !d.whatsapp.startsWith('55')) d.whatsapp = '55' + d.whatsapp;
    const msgEl = $('#cfg-msg');
    const erro = validar(e.target, todos, d)
      || (d.pix_ativo && !d.pix_chave ? 'Informe a chave PIX ou desative o PIX.' : '')
      || (!d.pix_ativo && !d.cartao_ativo ? 'Deixe pelo menos uma forma de pagamento ativa.' : '');
    if (erro) { msgEl.innerHTML = `<div class="alerta alerta-erro">${esc(erro)}</div>`; scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if ($('.up-enviando', e.target)) { msgEl.innerHTML = '<div class="alerta alerta-info">Aguarde o envio da imagem terminar.</div>'; return; }
    d.atualizado_em = new Date().toISOString();
    const btn = $('.barra-salvar button'); btn.disabled = true;
    const { error } = await c.from('configuracoes').update(d).eq('id', 1);
    btn.disabled = false;
    if (error) { msgEl.innerHTML = `<div class="alerta alerta-erro">${esc(erroAmigavel(error))}</div>`; return; }
    msgEl.innerHTML = '';
    await recarregarConfig();
    $('.adm-marca').innerHTML = `${cfg.logo_url ? `<img src="${esc(cfg.logo_url)}" alt="">` : `<b>${esc(cfg.nome_loja)}</b>`}<small>Painel administrativo</small>`;
    $('#f-cfg [name=whatsapp]').value = cfg.whatsapp;
    toast('Configurações salvas! Já estão valendo na loja.');
  };
}

// =====================================================================
c.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') telaLogin(); });
iniciar();
