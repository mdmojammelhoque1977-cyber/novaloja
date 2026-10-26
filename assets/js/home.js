import { iniciarPagina, api, cardProduto, ligarBotoesComprar, esc, ic, param, linkWhats, descontoPct, $, $$ } from './core.js';

const { cfg, cats } = await iniciarPagina();
document.title = `${cfg.titulo_ofertas || 'Ofertas'} | ${cfg.nome_loja}`;

const main = $('#conteudo');
main.innerHTML = `
  <section class="hero" id="hero"></section>
  <section class="confianca"><div class="container">
    <div class="conf-item">${ic.escudo}<div>Compra segura<small>Seus dados protegidos</small></div></div>
    <div class="conf-item">${ic.caminhao}<div>Consulte frete e prazo<small>${esc(cfg.aviso_frete || '')}</small></div></div>
    <a class="conf-item" href="${cfg.whatsapp ? linkWhats(cfg.whatsapp, 'Olá! Quero tirar uma dúvida.') : '#'}" target="_blank" rel="noopener">${ic.whats}<div>Atendimento pelo WhatsApp<small>Fale com a gente agora</small></div></a>
  </div></section>
  ${cats.length ? `<section class="secao"><div class="container">
    <div class="titulo-secao"><h2>Compre por categoria</h2></div>
    <div class="cats-wrap">
      <button class="cats-seta esq" aria-label="Anterior">${ic.esq}</button>
      <div class="cats" id="cats"></div>
      <button class="cats-seta dir" aria-label="Próximo">${ic.dir}</button>
    </div>
  </div></section>` : ''}
  <section class="secao" id="ofertas"><div class="container">
    <div class="titulo-secao"><h2 id="titulo-ofertas">${esc(cfg.titulo_ofertas || 'Ofertas')}</h2></div>
    <div class="filtros">
      <div class="chips" id="chips"></div>
      <select class="ordenar" id="ordenar" aria-label="Ordenar">
        <option value="">Mais relevantes</option>
        <option value="menor">Menor preço</option>
        <option value="maior">Maior preço</option>
        <option value="desconto">Maior desconto</option>
      </select>
    </div>
    <div class="grade" id="grade">${'<div class="esqueleto"></div>'.repeat(4)}</div>
  </div></section>`;

const [banners, produtos] = await Promise.all([api.banners(), api.produtos()]);

// ---------- banner
function renderHero() {
  const el = $('#hero');
  if (!banners.length) {
    const maxOff = Math.max(0, ...produtos.map(descontoPct));
    el.innerHTML = `<div class="hero-padrao"><div class="container">
      <div>
        <span class="hero-tag">NATAL ANTECIPADO</span>
        <h1>Refresque seu verão<br>com <em>preço de Natal.</em></h1>
        <p>Climatizadores, ventiladores e ar-condicionado em promoção por tempo limitado. Pague no PIX ou no cartão.</p>
        <a class="btn btn-d btn-grande" href="#ofertas">Ver ofertas ${ic.dir}</a>
      </div>
      ${maxOff ? `<div class="hero-selo"><small>ATÉ</small><strong>${maxOff}%</strong><small>DE DESCONTO</small></div>` : ''}
    </div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="hero-trilho" id="trilho">
      ${banners.map((b) => {
        const img = `<picture>${b.imagem_mobile_url ? `<source media="(max-width:760px)" srcset="${esc(b.imagem_mobile_url)}">` : ''}<img src="${esc(b.imagem_url)}" alt="${esc(b.titulo || cfg.nome_loja)}"></picture>`;
        return `<div class="hero-slide">${b.link ? `<a href="${esc(b.link)}">${img}</a>` : img}</div>`;
      }).join('')}
    </div>
    ${banners.length > 1 ? `<button class="hero-seta esq" aria-label="Anterior">${ic.esq}</button><button class="hero-seta dir" aria-label="Próximo">${ic.dir}</button>` : ''}`;
  if (banners.length < 2) return;
  el.insertAdjacentHTML('afterend', `<div class="hero-pontos" id="pontos">${banners.map((_, i) => `<button aria-label="Banner ${i + 1}"></button>`).join('')}</div>`);
  let atual = 0, timer;
  const ir = (i) => {
    atual = (i + banners.length) % banners.length;
    $('#trilho').style.transform = `translateX(-${atual * 100}%)`;
    $$('#pontos button').forEach((b, k) => b.classList.toggle('ativo', k === atual));
    clearInterval(timer); timer = setInterval(() => ir(atual + 1), 5500);
  };
  $('.hero-seta.esq', el).onclick = () => ir(atual - 1);
  $('.hero-seta.dir', el).onclick = () => ir(atual + 1);
  $$('#pontos button').forEach((b, k) => (b.onclick = () => ir(k)));
  let x0 = null;
  el.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  ir(0);
}

// ---------- categorias
let catAtual = param('cat') || '';
const busca = (param('q') || '').trim();

function renderCats() {
  const box = $('#cats');
  if (!box) return;
  box.innerHTML = cats.map((c) => `
    <a class="cat${c.id === catAtual ? ' ativa' : ''}" href="?cat=${esc(c.id)}#ofertas" data-cat="${esc(c.id)}">
      <div class="cat-img">${c.imagem_url ? `<img src="${esc(c.imagem_url)}" alt="" loading="lazy">` : ic.tag}</div>
      <span>${esc(c.nome)}</span>
    </a>`).join('');
  const passo = () => box.clientWidth * 0.8;
  $('.cats-seta.esq').onclick = () => box.scrollBy({ left: -passo(), behavior: 'smooth' });
  $('.cats-seta.dir').onclick = () => box.scrollBy({ left: passo(), behavior: 'smooth' });
}

// ---------- produtos
const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function renderChips() {
  $('#chips').innerHTML = [`<button class="chip-f${!catAtual ? ' ativo' : ''}" data-c="">Todas</button>`,
    ...cats.map((c) => `<button class="chip-f${c.id === catAtual ? ' ativo' : ''}" data-c="${esc(c.id)}">${esc(c.nome)}</button>`)].join('');
}

function renderGrade() {
  let lista = produtos.slice();
  if (catAtual) lista = lista.filter((p) => p.categoria_id === catAtual);
  if (busca) {
    const termos = normal(busca).split(/\s+/);
    lista = lista.filter((p) => { const t = normal(p.nome + ' ' + p.descricao + ' ' + p.id); return termos.every((x) => t.includes(x)); });
    $('#titulo-ofertas').textContent = `Resultados para "${busca}"`;
  }
  const ord = $('#ordenar').value;
  if (ord === 'menor') lista.sort((a, b) => a.preco_por - b.preco_por);
  if (ord === 'maior') lista.sort((a, b) => b.preco_por - a.preco_por);
  if (ord === 'desconto') lista.sort((a, b) => descontoPct(b) - descontoPct(a));
  $('#grade').innerHTML = lista.length
    ? lista.map((p) => cardProduto(p, cfg)).join('')
    : `<div class="vazio">${ic.busca}<p>Nenhum produto encontrado${busca ? ` para "<b>${esc(busca)}</b>"` : ''}.</p><a class="btn btn-borda" href="index.html#ofertas">Ver todas as ofertas</a></div>`;
}

$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  catAtual = b.dataset.c;
  const u = new URL(location.href);
  catAtual ? u.searchParams.set('cat', catAtual) : u.searchParams.delete('cat');
  history.replaceState(null, '', u);
  renderChips(); renderGrade(); renderCats();
});
$('#ordenar').onchange = renderGrade;
ligarBotoesComprar($('#grade'));

renderHero();
renderCats();
renderChips();
renderGrade();
if (catAtual || busca || location.hash === '#ofertas') $('#ofertas').scrollIntoView();
