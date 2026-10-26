import { iniciarPagina, sb, api, carrinho, exigirLogin, esc, ic, brl, erroAmigavel, $, $$ } from './core.js';

const { cfg } = await iniciarPagina();
document.title = `Finalizar compra | ${cfg.nome_loja}`;
await exigirLogin('checkout.html');
const main = $('#conteudo');

const [perfil, produtos] = await Promise.all([api.perfil(), api.produtosPorIds(carrinho.itens().map((i) => i.id))]);
const itens = carrinho.itens().map((i) => ({ ...i, p: produtos.find((p) => p.id === i.id) })).filter((i) => i.p);

if (!itens.length) {
  main.innerHTML = `<h1>Finalizar compra</h1><div class="painel vazio">${ic.carrinho}<h2>Seu carrinho está vazio</h2><a class="btn btn-p" href="index.html#ofertas">Ver ofertas</a></div>`;
} else {
  const completo = perfil && perfil.cpf && perfil.rua && perfil.cidade && perfil.telefone;
  const subtotal = itens.reduce((s, i) => s + i.p.preco_por * i.qtd, 0);
  const metodos = [];
  if (cfg.pix_ativo) metodos.push({ id: 'pix', nome: 'PIX', desc: 'Aprovação rápida • QR Code ou Copia e Cola', icone: ic.pix, tag: Number(cfg.desconto_pix) > 0 ? `${Number(cfg.desconto_pix)}% OFF` : '' });
  if (cfg.cartao_ativo) metodos.push({ id: 'cartao', nome: 'Cartão de crédito', desc: cfg.parcelas_max > 1 ? `Em até ${cfg.parcelas_max}x` : 'Pagamento seguro', icone: ic.cartao, tag: '' });

  main.innerHTML = `
  <h1>Finalizar compra</h1>
  <div class="duas-col">
    <div>
      <div class="painel">
        <h2>${ic.usuario} Dados para entrega</h2>
        ${completo ? `
          <div class="dados-cli">
            <b>${esc(perfil.nome)}</b><br>
            CPF: ${esc(perfil.cpf)} • ${esc(perfil.telefone)}<br>
            ${esc(perfil.email || '')}<br>
            ${esc(perfil.rua)}, ${esc(perfil.numero)}${perfil.complemento ? ' - ' + esc(perfil.complemento) : ''}<br>
            ${esc(perfil.bairro)} — ${esc(perfil.cidade)}/${esc(perfil.uf)} • CEP ${esc(perfil.cep)}
          </div>
          <a class="btn btn-leve btn-peq" style="margin-top:12px" href="minha-conta.html?volta=checkout#dados">${ic.editar} Alterar dados</a>`
        : `<div class="alerta alerta-info">Complete seu cadastro (CPF, telefone e endereço) para finalizar.</div>
           <a class="btn btn-p" href="minha-conta.html?volta=checkout#dados">Completar cadastro</a>`}
      </div>
      <div class="painel">
        <h2>${ic.cartao} Forma de pagamento</h2>
        ${metodos.length ? `<div class="metodos">${metodos.map((m, i) => `
          <label class="metodo${i === 0 ? ' sel' : ''}">
            <input type="radio" name="metodo" value="${m.id}" ${i === 0 ? 'checked' : ''}>
            <span class="ic-met">${m.icone}</span>
            <span><strong>${m.nome}</strong><small>${m.desc}</small></span>
            ${m.tag ? `<span class="tag-desc">${m.tag}</span>` : ''}
          </label>`).join('')}</div>`
        : `<div class="alerta alerta-erro">Nenhuma forma de pagamento disponível no momento. Fale conosco pelo WhatsApp.</div>`}
      </div>
    </div>
    <aside class="painel resumo">
      <h2>${ic.sacola} Seu pedido</h2>
      ${itens.map((i) => `<div class="linha-res" style="gap:12px"><span>${i.qtd}× ${esc(i.p.nome)}</span><span style="white-space:nowrap">${brl(i.p.preco_por * i.qtd)}</span></div>`).join('')}
      <div class="linha-res" style="border-top:1px solid var(--borda);margin-top:8px;padding-top:12px"><span>Subtotal</span><span>${brl(subtotal)}</span></div>
      <div class="linha-res desc" id="l-desc"></div>
      <div class="linha-res"><span>Frete</span><span class="muted">A combinar</span></div>
      <div class="linha-res total"><span>Total</span><span id="total"></span></div>
      <div id="msg"></div>
      <button class="btn btn-p btn-grande btn-bloco" id="confirmar" style="margin-top:16px" ${!completo || !metodos.length ? 'disabled' : ''}>${ic.check} Confirmar pedido</button>
      <p class="muted" style="font-size:12px;text-align:center;margin:10px 0 0">Após confirmar, você recebe o número do pedido e vai para a área de pagamento.</p>
    </aside>
  </div>`;

  const metodoSel = () => $('input[name=metodo]:checked')?.value;
  const atualizar = () => {
    $$('.metodo').forEach((l) => l.classList.toggle('sel', $('input', l).checked));
    const desc = metodoSel() === 'pix' && Number(cfg.desconto_pix) > 0 ? Math.round(subtotal * cfg.desconto_pix) / 100 : 0;
    $('#l-desc').innerHTML = desc ? `<span>Desconto PIX</span><span>- ${brl(desc)}</span>` : '';
    $('#l-desc').style.display = desc ? '' : 'none';
    $('#total').textContent = brl(subtotal - desc);
  };
  $$('input[name=metodo]').forEach((r) => (r.onchange = atualizar));
  atualizar();

  $('#confirmar').onclick = async (e) => {
    const b = e.currentTarget;
    b.disabled = true; b.textContent = 'Gerando pedido...';
    $('#msg').innerHTML = '';
    const c = await sb();
    const { data, error } = await c.rpc('criar_pedido', {
      p_itens: itens.map((i) => ({ id: i.id, qtd: i.qtd })),
      p_metodo: metodoSel(),
    });
    if (error) {
      $('#msg').innerHTML = `<div class="alerta alerta-erro" style="margin-top:12px">${esc(erroAmigavel(error))}</div>`;
      b.disabled = false; b.innerHTML = `${ic.check} Confirmar pedido`;
      return;
    }
    carrinho.limpar();
    location.href = `pagamento.html?id=${encodeURIComponent(data.id)}`;
  };
}
