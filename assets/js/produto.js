import { iniciarPagina, api, cardProduto, ligarBotoesComprar, carrinho, esc, ic, brl, param, linkWhats, descontoPct, toast, $, $$ } from './core.js';

const { cfg, cats } = await iniciarPagina();
const main = $('#conteudo');
const p = await api.produto(param('id') || '');

if (!p) {
  main.innerHTML = `<div class="vazio pagina">${ic.caixa}<h2>Produto não encontrado</h2><p>Ele pode ter saído da promoção.</p><a class="btn btn-p" href="index.html#ofertas">Ver ofertas</a></div>`;
} else {
  document.title = `${p.nome} | ${cfg.nome_loja}`;
  const cat = cats.find((c) => c.id === p.categoria_id);
  const off = descontoPct(p);
  const imgs = p.imagens?.length ? p.imagens : [''];
  const pix = cfg.pix_ativo && Number(cfg.desconto_pix) > 0 ? p.preco_por * (1 - cfg.desconto_pix / 100) : null;
  const parc = Math.max(1, cfg.parcelas_max || 1);
  const esgotado = p.estoque !== null && p.estoque !== undefined && p.estoque <= 0;
  const maxQtd = p.estoque ?? 99;

  main.innerHTML = `
  <nav class="migalha"><a href="index.html">Início</a> › ${cat ? `<a href="index.html?cat=${esc(cat.id)}#ofertas">${esc(cat.nome)}</a> ›` : ''} <span>${esc(p.nome)}</span></nav>
  <div class="produto">
    <div class="galeria">
      <div class="galeria-principal">
        <div class="selos"><span class="selo-promo">% PROMOÇÃO</span>${p.selo ? `<span class="selo-extra">${esc(p.selo)}</span>` : ''}</div>
        ${off ? `<span class="selo-off">-${off}%</span>` : ''}
        ${imgs[0] ? `<img id="img-principal" src="${esc(imgs[0])}" alt="${esc(p.nome)}">` : `<div class="sem-img">${ic.imagem}</div>`}
      </div>
      ${imgs.length > 1 ? `<div class="miniaturas">${imgs.map((u, i) => `<button class="${i ? '' : 'ativa'}" data-i="${i}"><img src="${esc(u)}" alt=""></button>`).join('')}</div>` : ''}
    </div>
    <div class="info-prod">
      <h1>${esc(p.nome)}</h1>
      <div class="caixa-preco">
        ${off ? `<div class="preco-de">De ${brl(p.preco_de)}</div>` : ''}
        <div class="preco-por">${brl(p.preco_por)}</div>
        ${cfg.cartao_ativo && parc > 1 ? `<div class="preco-parc">em até ${parc}x de ${brl(p.preco_por / parc)} no cartão</div>` : ''}
        ${pix ? `<div class="linha-pix">${ic.pix} ${brl(pix)} à vista no PIX (${Number(cfg.desconto_pix)}% de desconto)</div>` : ''}
      </div>
      ${esgotado ? `<div class="alerta alerta-erro">Produto esgotado no momento.</div>` : `
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <span style="font-weight:600">Quantidade</span>
        <div class="qtd"><button id="menos" aria-label="Diminuir">${ic.menos}</button><input id="qtd" type="number" value="1" min="1" max="${maxQtd}"><button id="mais" aria-label="Aumentar">${ic.mais}</button></div>
        ${p.estoque !== null && p.estoque !== undefined && p.estoque <= 10 ? `<span class="muted">Restam só ${p.estoque}!</span>` : ''}
      </div>
      <div class="acoes-prod">
        <button class="btn btn-p btn-grande" id="comprar-agora">${ic.sacola} Comprar agora</button>
        <button class="btn btn-borda btn-grande" id="add-carrinho">${ic.carrinho} Adicionar ao carrinho</button>
      </div>`}
      ${cfg.whatsapp ? `<a class="btn btn-leve btn-bloco" target="_blank" rel="noopener" href="${linkWhats(cfg.whatsapp, `Olá! Tenho interesse no produto: ${p.nome} (${brl(p.preco_por)})`)}">${ic.whats} Tirar dúvidas no WhatsApp</a>` : ''}
      <ul class="beneficios">
        <li>${ic.escudo} Compra 100% segura</li>
        <li>${ic.caminhao} ${esc(cfg.aviso_frete || 'Consulte frete e prazo')}</li>
        <li>${ic.caixa} Você acompanha o pedido na sua conta</li>
      </ul>
      ${p.descricao ? `<div class="descricao-box"><h2>Descrição</h2><div class="descricao">${esc(p.descricao)}</div></div>` : ''}
    </div>
  </div>
  <section class="secao" id="relacionados"></section>`;

  $$('.miniaturas button').forEach((b) => (b.onclick = () => {
    $('#img-principal').src = imgs[b.dataset.i];
    $$('.miniaturas button').forEach((x) => x.classList.toggle('ativa', x === b));
  }));

  if (!esgotado) {
    const inp = $('#qtd');
    const val = () => Math.max(1, Math.min(maxQtd, parseInt(inp.value) || 1));
    $('#menos').onclick = () => (inp.value = Math.max(1, val() - 1));
    $('#mais').onclick = () => (inp.value = Math.min(maxQtd, val() + 1));
    inp.onchange = () => (inp.value = val());
    $('#add-carrinho').onclick = () => { carrinho.adicionar(p.id, val()); toast('Produto adicionado ao carrinho!', 'ok', { href: 'carrinho.html', texto: 'Ver carrinho' }); };
    $('#comprar-agora').onclick = () => { carrinho.adicionar(p.id, val()); location.href = 'carrinho.html'; };
  }

  const todos = await api.produtos();
  const rel = todos.filter((x) => x.id !== p.id && (!p.categoria_id || x.categoria_id === p.categoria_id)).slice(0, 4);
  if (rel.length) {
    $('#relacionados').innerHTML = `<div class="titulo-secao"><h2>Você também pode gostar</h2></div><div class="grade">${rel.map((x) => cardProduto(x, cfg)).join('')}</div>`;
    ligarBotoesComprar($('#relacionados'));
  }
}
