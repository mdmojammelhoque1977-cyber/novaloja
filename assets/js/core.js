// Núcleo compartilhado: conexão com Supabase, cabeçalho/rodapé, carrinho e utilidades.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { DEMO } from './demo.js';

export const CONFIGURADO = /^https:\/\/.+/.test(SUPABASE_URL) && !SUPABASE_ANON_KEY.includes('COLE_AQUI');

let _cliente = null;
export async function sb() {
  if (!CONFIGURADO) return null;
  if (_cliente) return _cliente;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  _cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return _cliente;
}

// ------------------------------------------------------------------ utilidades
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const digitos = (s) => String(s || '').replace(/\D/g, '');
export const param = (k) => new URLSearchParams(location.search).get(k);
export const dataBR = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function linkWhats(numero, texto) {
  const n = digitos(numero);
  return `https://wa.me/${n}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}

export function descontoPct(p) {
  return p.preco_de && Number(p.preco_de) > Number(p.preco_por)
    ? Math.round((1 - Number(p.preco_por) / Number(p.preco_de)) * 100) : 0;
}

export function validarCPF(cpf) {
  const c = digitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (n) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export const mascaras = {
  cpf: (v) => {
    const d = digitos(v).slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  },
  tel: (v) => {
    const d = digitos(v).slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return '(' + d;
    const r = d.slice(2), corte = r.length > 8 ? 5 : 4;
    return r.length <= 4 ? `(${d.slice(0, 2)}) ${r}` : `(${d.slice(0, 2)}) ${r.slice(0, corte)}-${r.slice(corte)}`;
  },
  cep: (v) => digitos(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'),
};

export function aplicarMascaras(raiz = document) {
  $$('[data-mask]', raiz).forEach((inp) => {
    const fn = mascaras[inp.dataset.mask];
    if (!fn) return;
    inp.value = fn(inp.value);
    inp.addEventListener('input', () => { inp.value = fn(inp.value); });
  });
}

export async function buscarCEP(cep) {
  const d = digitos(cep);
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const j = await r.json();
    return j.erro ? null : j;
  } catch { return null; }
}

export function toast(msg, tipo = 'ok', acao) {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.innerHTML = `<span>${esc(msg)}</span>${acao ? `<a href="${esc(acao.href)}">${esc(acao.texto)}</a>` : ''}`;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3800);
}

export function erroAmigavel(e) {
  const m = e?.message || String(e);
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (/User already registered/i.test(m)) return 'Este e-mail já tem cadastro. Faça login.';
  if (/Password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão. Verifique sua internet.';
  return m;
}

// ------------------------------------------------------------------ ícones
const sv = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const ic = {
  busca: sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  carrinho: sv('<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21.5 8H6"/>'),
  entrar: sv('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5M15 12H3"/>'),
  usuario: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  usuarioMais: sv('<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>'),
  atendimento: sv('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>'),
  escudo: sv('<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  caminhao: sv('<path d="M1 4h13v12H1zM14 8h4l4 4v4h-8"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>'),
  esq: sv('<path d="m15 18-6-6 6-6"/>'),
  dir: sv('<path d="m9 18 6-6-6-6"/>'),
  cima: sv('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  menu: sv('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  x: sv('<path d="M18 6 6 18M6 6l12 12"/>'),
  lixo: sv('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  mais: sv('<path d="M12 5v14M5 12h14"/>'),
  menos: sv('<path d="M5 12h14"/>'),
  check: sv('<path d="M20 6 9 17l-5-5"/>'),
  copiar: sv('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  cartao: sv('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'),
  pix: sv('<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M8 12h8M12 8v8"/>'),
  caixa: sv('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  editar: sv('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  imagem: sv('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  sair: sv('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  config: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  tag: sv('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>'),
  grade: sv('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  usuarios: sv('<circle cx="9" cy="8" r="4"/><path d="M1 21a8 8 0 0 1 16 0M17 4a4 4 0 0 1 0 8M23 21a8 8 0 0 0-5-7.4"/>'),
  grafico: sv('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>'),
  sacola: sv('<path d="M6 7h12l1 14H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>'),
  relogio: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  presente: sv('<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10.5 3 8 3.5 7.5 8 12 8zm0 0s1.5-5 4-4.5S16.5 8 12 8z"/>'),
  externo: sv('<path d="M14 3h7v7M10 14 21 3M21 14v7H3V3h7"/>'),
  whats: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>`,
};

// ------------------------------------------------------------------ dados
const cache = {};
const uma = (k, fn) => (cache[k] ??= fn());

async function q(fn) {
  const c = await sb();
  const { data, error } = await fn(c);
  if (error) throw error;
  return data;
}

export const api = {
  config: () => uma('config', () => CONFIGURADO
    ? q((c) => c.from('configuracoes').select('*').eq('id', 1).single())
    : Promise.resolve(DEMO.config)),
  categorias: () => uma('cats', () => CONFIGURADO
    ? q((c) => c.from('categorias').select('*').eq('ativo', true).order('ordem').order('nome'))
    : Promise.resolve(DEMO.categorias)),
  banners: () => CONFIGURADO
    ? q((c) => c.from('banners').select('*').eq('ativo', true).order('ordem'))
    : Promise.resolve(DEMO.banners),
  produtos: () => uma('prods', () => CONFIGURADO
    ? q((c) => c.from('produtos').select('*').eq('ativo', true).order('destaque', { ascending: false }).order('ordem').order('criado_em', { ascending: false }))
    : Promise.resolve(DEMO.produtos)),
  async produto(id) {
    if (!CONFIGURADO) return DEMO.produtos.find((p) => p.id === id) || null;
    return q((c) => c.from('produtos').select('*').eq('id', id).eq('ativo', true).maybeSingle());
  },
  async produtosPorIds(ids) {
    if (!ids.length) return [];
    if (!CONFIGURADO) return DEMO.produtos.filter((p) => ids.includes(p.id));
    return q((c) => c.from('produtos').select('*').in('id', ids).eq('ativo', true));
  },
  async usuario() {
    const c = await sb();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data.session?.user || null;
  },
  async perfil() {
    const u = await api.usuario();
    if (!u) return null;
    return q((c) => c.from('perfis').select('*').eq('id', u.id).maybeSingle());
  },
  async sair() {
    const c = await sb();
    if (c) await c.auth.signOut();
  },
};

// ------------------------------------------------------------------ carrinho
const CHAVE = 'carrinho_promo_v1';
export const carrinho = {
  itens() { try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch { return []; } },
  salvar(itens) {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
    document.dispatchEvent(new CustomEvent('carrinho'));
  },
  adicionar(id, qtd = 1) {
    const itens = carrinho.itens();
    const it = itens.find((i) => i.id === id);
    if (it) it.qtd = Math.min(99, it.qtd + qtd); else itens.push({ id, qtd });
    carrinho.salvar(itens);
  },
  definir(id, qtd) {
    carrinho.salvar(carrinho.itens().map((i) => (i.id === id ? { ...i, qtd: Math.max(1, Math.min(99, qtd)) } : i)));
  },
  remover(id) { carrinho.salvar(carrinho.itens().filter((i) => i.id !== id)); },
  limpar() { carrinho.salvar([]); },
  quantidade() { return carrinho.itens().reduce((s, i) => s + i.qtd, 0); },
};

// ------------------------------------------------------------------ tema
function hexParaRgb(h) {
  const m = String(h || '').replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const misturar = (rgb, alvo, t) => `rgb(${rgb.map((v, i) => Math.round(v + (alvo[i] - v) * t)).join(',')})`;

export function aplicarTema(cfg) {
  const r = document.documentElement.style;
  const p = hexParaRgb(cfg.cor_primaria);
  if (p) {
    r.setProperty('--p', cfg.cor_primaria);
    r.setProperty('--p-esc', misturar(p, [0, 0, 0], 0.35));
    r.setProperty('--p-claro', misturar(p, [255, 255, 255], 0.9));
    r.setProperty('--p-rgb', p.join(','));
  }
  if (hexParaRgb(cfg.cor_destaque)) r.setProperty('--d', cfg.cor_destaque);
  if (cfg.logo_url) {
    let l = $('link[rel=icon]');
    if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    l.href = cfg.logo_url;
  }
}

// ------------------------------------------------------------------ cartão de produto
export function cardProduto(p, cfg) {
  const off = descontoPct(p);
  const img = p.imagens?.[0] || '';
  const pix = cfg.pix_ativo && Number(cfg.desconto_pix) > 0 ? p.preco_por * (1 - cfg.desconto_pix / 100) : null;
  const parc = Math.max(1, cfg.parcelas_max || 1);
  const esgotado = p.estoque !== null && p.estoque !== undefined && p.estoque <= 0;
  return `
  <article class="card-prod${esgotado ? ' esgotado' : ''}">
    <a class="card-img" href="produto.html?id=${esc(p.id)}">
      <div class="selos">
        <span class="selo-promo">% PROMOÇÃO</span>
        ${p.selo ? `<span class="selo-extra">${esc(p.selo)}</span>` : ''}
      </div>
      ${off ? `<span class="selo-off">-${off}%</span>` : ''}
      ${img ? `<img src="${esc(img)}" alt="${esc(p.nome)}" loading="lazy">` : `<div class="sem-img">${ic.imagem}</div>`}
    </a>
    <div class="card-corpo">
      <a href="produto.html?id=${esc(p.id)}" class="card-nome">${esc(p.nome)}</a>
      <div class="card-precos">
        ${off ? `<span class="preco-de">${brl(p.preco_de)}</span>` : ''}
        <span class="preco-por">${brl(p.preco_por)}</span>
        ${pix ? `<span class="preco-pix">${ic.pix}<b>${brl(pix)}</b> no PIX</span>` : ''}
        ${cfg.cartao_ativo && parc > 1 ? `<span class="preco-parc">ou ${parc}x de ${brl(p.preco_por / parc)}</span>` : ''}
      </div>
      <button class="btn btn-comprar" data-add="${esc(p.id)}" ${esgotado ? 'disabled' : ''}>
        ${esgotado ? 'Esgotado' : `${ic.sacola} Comprar`}
      </button>
    </div>
  </article>`;
}

export function ligarBotoesComprar(raiz = document) {
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    carrinho.adicionar(b.dataset.add, 1);
    b.classList.add('ok');
    b.innerHTML = `${ic.check} Adicionado`;
    setTimeout(() => { b.classList.remove('ok'); b.innerHTML = `${ic.sacola} Comprar`; }, 1600);
    toast('Produto adicionado ao carrinho!', 'ok', { href: 'carrinho.html', texto: 'Ver carrinho' });
  });
}

// ------------------------------------------------------------------ cabeçalho / rodapé
function logoHtml(cfg) {
  return cfg.logo_url
    ? `<img src="${esc(cfg.logo_url)}" alt="${esc(cfg.nome_loja)}">`
    : `<span class="logo-texto">${esc(cfg.nome_loja)}</span>`;
}

function contagem(el, fim) {
  const alvo = new Date(fim).getTime();
  if (!el || !alvo || isNaN(alvo)) return;
  const tick = () => {
    const s = Math.max(0, Math.floor((alvo - Date.now()) / 1000));
    if (s <= 0) { el.textContent = ''; return; }
    const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, ss = s % 60;
    const z = (n) => String(n).padStart(2, '0');
    el.innerHTML = `${ic.relogio} Termina em <b>${d}d ${z(h)}h ${z(m)}m ${z(ss)}s</b>`;
  };
  tick();
  setInterval(tick, 1000);
}

function renderTopo(cfg, cats, usuario) {
  const zap = cfg.whatsapp ? linkWhats(cfg.whatsapp, `Olá! Vim pelo site ${cfg.nome_loja}.`) : '#';
  const tel = cfg.telefone_exibicao || mascaras.tel(digitos(cfg.whatsapp).replace(/^55/, ''));
  const contaLinks = usuario
    ? `<a href="minha-conta.html">${ic.usuario} Minha conta</a><span>|</span><a href="minha-conta.html#pedidos">${ic.caixa} Meus pedidos</a><span>|</span><a href="#" id="btn-sair">${ic.sair} Sair</a>`
    : `<a href="entrar.html">${ic.entrar} Já é cliente? - Entrar</a><span>|</span><a href="entrar.html?modo=cadastro">${ic.usuarioMais} Não é cliente? - Cadastrar</a>`;

  $('#topo').innerHTML = `
  ${!CONFIGURADO ? `<div class="aviso-demo">Modo demonstração — preencha <b>assets/js/config.js</b> com os dados do seu Supabase para ativar a loja.</div>` : ''}
  ${cfg.faixa_topo ? `<div class="faixa-promo"><div class="container"><span>${esc(cfg.faixa_topo)}</span><span class="contagem" id="contagem"></span></div></div>` : ''}
  <div class="barra-topo"><div class="container">
    ${contaLinks}<span>|</span><a href="${zap}" target="_blank" rel="noopener">${ic.atendimento} Atendimento Personalizado</a>
  </div></div>
  <header class="cabecalho"><div class="container cab-linha">
    <button class="btn-menu" id="btn-menu" aria-label="Abrir menu">${ic.menu}</button>
    <a class="logo" href="index.html">${logoHtml(cfg)}</a>
    <form class="busca" action="index.html" role="search">
      <input type="search" name="q" placeholder="Busca por código, nome ou marca" value="${esc(param('q') || '')}" aria-label="Buscar">
      <button type="submit" aria-label="Buscar">${ic.busca}</button>
    </form>
    <a class="btn-carrinho" href="carrinho.html" aria-label="Carrinho">${ic.carrinho}<span class="bolha" id="qtd-carrinho">0</span></a>
    <div class="fale">
      <strong>Fale Conosco</strong>
      <a href="${zap}" target="_blank" rel="noopener">${ic.whats} ${esc(tel)}</a>
    </div>
  </div></header>
  <nav class="menu-cats" id="menu-cats"><div class="container">
    <a href="index.html#ofertas">${ic.presente} OFERTAS DE NATAL</a>
    ${cats.map((c) => `<a href="index.html?cat=${esc(c.id)}#ofertas">${esc(c.nome.toUpperCase())}</a>`).join('')}
    <div class="menu-mobile-extra">
      ${usuario ? `<a href="minha-conta.html">Minha conta</a>` : `<a href="entrar.html">Entrar / Cadastrar</a>`}
    </div>
  </div></nav>`;

  contagem($('#contagem'), cfg.data_fim_promo);
  const atualizar = () => { const n = carrinho.quantidade(); const b = $('#qtd-carrinho'); b.textContent = n; b.classList.toggle('pulse', n > 0); };
  atualizar();
  document.addEventListener('carrinho', atualizar);
  window.addEventListener('storage', atualizar);
  $('#btn-menu').onclick = () => document.body.classList.toggle('menu-aberto');
  $('#btn-sair')?.addEventListener('click', async (e) => { e.preventDefault(); await api.sair(); location.href = 'index.html'; });
}

function renderRodape(cfg) {
  const zap = cfg.whatsapp ? linkWhats(cfg.whatsapp, `Olá! Vim pelo site ${cfg.nome_loja}.`) : '#';
  $('#rodape').innerHTML = `
  <footer class="rodape">
    <div class="container rodape-grid">
      <div>
        <a class="logo logo-rodape" href="index.html">${logoHtml(cfg)}</a>
        <p>${esc(cfg.nome_loja)} — promoções de Natal antecipado em climatização.</p>
      </div>
      <div>
        <h4>Atendimento</h4>
        ${cfg.whatsapp ? `<a href="${zap}" target="_blank" rel="noopener">${ic.whats} WhatsApp ${esc(cfg.telefone_exibicao || '')}</a>` : ''}
        ${cfg.email_contato ? `<a href="mailto:${esc(cfg.email_contato)}">${esc(cfg.email_contato)}</a>` : ''}
        ${cfg.endereco_loja ? `<span>${esc(cfg.endereco_loja)}</span>` : ''}
      </div>
      <div>
        <h4>Institucional</h4>
        <a href="minha-conta.html">Minha conta</a>
        <a href="politicas.html#privacidade">Política de privacidade</a>
        <a href="politicas.html#trocas">Trocas e devoluções</a>
      </div>
      <div>
        <h4>Pagamento</h4>
        <div class="pagamentos">
          ${cfg.pix_ativo ? `<span>${ic.pix} PIX</span>` : ''}
          ${cfg.cartao_ativo ? `<span>${ic.cartao} Cartão</span>` : ''}
        </div>
        <span class="seguro">${ic.escudo} Compra segura</span>
      </div>
    </div>
    <div class="rodape-base"><div class="container">
      © ${new Date().getFullYear()} ${esc(cfg.nome_loja)}${cfg.cnpj ? ` • CNPJ ${esc(cfg.cnpj)}` : ''} • Todos os direitos reservados
    </div></div>
  </footer>
  ${cfg.whatsapp ? `<a class="zap-flutuante" href="${zap}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic.whats}</a>` : ''}
  <button class="voltar-topo" id="voltar-topo" aria-label="Voltar ao topo">${ic.cima}</button>`;
  const vt = $('#voltar-topo');
  window.addEventListener('scroll', () => vt.classList.toggle('show', scrollY > 600), { passive: true });
  vt.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
}

export async function iniciarPagina() {
  try {
    const [cfg, cats, usuario] = await Promise.all([api.config(), api.categorias(), api.usuario()]);
    aplicarTema(cfg);
    renderTopo(cfg, cats, usuario);
    renderRodape(cfg);
    document.body.classList.add('pronto');
    return { cfg, cats, usuario };
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `<div class="erro-geral"><h2>Não foi possível carregar a loja</h2><p>${esc(erroAmigavel(e))}</p>
      <p class="muted">Se você é o administrador: confira o arquivo <b>assets/js/config.js</b> e se o <b>schema.sql</b> foi executado no Supabase.</p></div>`;
    throw e;
  }
}

// Redireciona para o login se não houver usuário
export async function exigirLogin(destino) {
  const u = await api.usuario();
  if (!u) {
    location.href = `entrar.html?next=${encodeURIComponent(destino || location.pathname.split('/').pop() + location.search)}`;
    return new Promise(() => {});
  }
  return u;
}

export const STATUS = {
  aguardando_pagamento: { txt: 'Aguardando pagamento', cls: 'st-aguardando' },
  pago: { txt: 'Pagamento confirmado', cls: 'st-pago' },
  enviado: { txt: 'Enviado', cls: 'st-enviado' },
  entregue: { txt: 'Entregue', cls: 'st-entregue' },
  cancelado: { txt: 'Cancelado', cls: 'st-cancelado' },
};
export const chipStatus = (s) => `<span class="chip ${STATUS[s]?.cls || ''}">${esc(STATUS[s]?.txt || s)}</span>`;
