import { iniciarPagina, api, carrinho, esc, ic, brl, $ } from './core.js';

const { cfg, usuario } = await iniciarPagina();
document.title = `Carrinho | ${cfg.nome_loja}`;
const main = $('#conteudo');

let produtos = await api.produtosPorIds(carrinho.itens().map((i) => i.id));
// remove do carrinho o que não existe mais
const ids = new Set(produtos.map((p) => p.id));
const sumiram = carrinho.itens().filter((i) => !ids.has(i.id));
if (sumiram.length) sumiram.forEach((i) => carrinho.remover(i.id));

function render() {
  const itens = carrinho.itens().map((i) => ({ ...i, p: produtos.find((p) => p.id === i.id) })).filter((i) => i.p);
  if (!itens.length) {
    main.innerHTML = `<h1>Meu carrinho</h1><div class="painel vazio">${ic.carrinho}<h2>Seu carrinho está vazio</h2><p>Aproveite as ofertas de Natal antecipado!</p><a class="btn btn-p" href="index.html#ofertas">Ver ofertas</a></div>`;
    return;
  }
  const subtotal = itens.reduce((s, i) => s + i.p.preco_por * i.qtd, 0);
  const descPix = cfg.pix_ativo && Number(cfg.desconto_pix) > 0 ? subtotal * cfg.desconto_pix / 100 : 0;
  const parc = Math.max(1, cfg.parcelas_max || 1);
  main.innerHTML = `
  <h1>Meu carrinho</h1>
  ${sumiram.length ? `<div class="alerta alerta-info">Alguns produtos saíram da promoção e foram removidos do carrinho.</div>` : ''}
  <div class="duas-col">
    <div class="painel">
      ${itens.map((i) => `
      <div class="item-car">
        <a href="produto.html?id=${esc(i.p.id)}"><img src="${esc(i.p.imagens?.[0] || '')}" alt=""></a>
        <div>
          <a class="nome" href="produto.html?id=${esc(i.p.id)}">${esc(i.p.nome)}</a>
          <div class="unit">${brl(i.p.preco_por)} cada</div>
        </div>
        <div class="dir">
          <div class="qtd">
            <button data-menos="${esc(i.id)}" aria-label="Diminuir">${ic.menos}</button>
            <input type="number" value="${i.qtd}" min="1" data-qtd="${esc(i.id)}">
            <button data-mais="${esc(i.id)}" aria-label="Aumentar">${ic.mais}</button>
          </div>
          <div class="sub">${brl(i.p.preco_por * i.qtd)}</div>
          <button class="btn-remover" data-rem="${esc(i.id)}">${ic.lixo} Remover</button>
        </div>
      </div>`).join('')}
    </div>
    <aside class="painel resumo">
      <h2>${ic.sacola} Resumo</h2>
      <div class="linha-res"><span>Subtotal</span><span>${brl(subtotal)}</span></div>
      ${descPix ? `<div class="linha-res desc"><span>No PIX (-${Number(cfg.desconto_pix)}%)</span><span>${brl(subtotal - descPix)}</span></div>` : ''}
      <div class="linha-res"><span>Frete</span><span class="muted">A combinar</span></div>
      <div class="linha-res total"><span>Total</span><span>${brl(subtotal)}</span></div>
      ${cfg.cartao_ativo && parc > 1 ? `<p class="muted" style="margin:4px 0 0;font-size:13px">ou até ${parc}x de ${brl(subtotal / parc)} no cartão</p>` : ''}
      <a class="btn btn-p btn-grande btn-bloco" style="margin-top:18px" href="${usuario ? 'checkout.html' : 'entrar.html?next=checkout.html'}">Finalizar compra ${ic.dir}</a>
      <a class="btn btn-leve btn-bloco" style="margin-top:10px" href="index.html#ofertas">Continuar comprando</a>
    </aside>
  </div>`;
}

main.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  const atual = (id) => carrinho.itens().find((i) => i.id === id)?.qtd || 1;
  const lim = (id) => produtos.find((p) => p.id === id)?.estoque ?? 99;
  if (t.dataset.menos) carrinho.definir(t.dataset.menos, atual(t.dataset.menos) - 1);
  else if (t.dataset.mais) carrinho.definir(t.dataset.mais, Math.min(lim(t.dataset.mais), atual(t.dataset.mais) + 1));
  else if (t.dataset.rem) carrinho.remover(t.dataset.rem);
  else return;
  render();
});
main.addEventListener('change', (e) => {
  const id = e.target.dataset.qtd;
  if (!id) return;
  const lim = produtos.find((p) => p.id === id)?.estoque ?? 99;
  carrinho.definir(id, Math.min(lim, parseInt(e.target.value) || 1));
  render();
});

render();
