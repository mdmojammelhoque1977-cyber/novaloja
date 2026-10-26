import { iniciarPagina, sb, exigirLogin, esc, ic, brl, param, linkWhats, chipStatus, dataBR, toast, $ } from './core.js';
import { gerarPix } from './pix.js';

const { cfg } = await iniciarPagina();
const id = param('id') || '';
await exigirLogin(`pagamento.html?id=${id}`);
const main = $('#conteudo');

const c = await sb();
const { data: ped, error } = await c.from('pedidos').select('*, pedido_itens(*)').eq('id', id).maybeSingle();

if (error || !ped) {
  main.innerHTML = `<div class="painel vazio">${ic.caixa}<h2>Pedido não encontrado</h2><a class="btn btn-p" href="minha-conta.html#pedidos">Meus pedidos</a></div>`;
} else {
  document.title = `Pedido ${ped.codigo} | ${cfg.nome_loja}`;
  const aguardando = ped.status === 'aguardando_pagamento';
  const msgZap = `Olá! Segue o comprovante de pagamento do pedido *${ped.codigo}*\n`
    + `Cliente: ${ped.cliente?.nome || ''}\n`
    + `Valor: ${brl(ped.total)} (${ped.metodo === 'pix' ? 'PIX' : 'Cartão'})`;
  const zap = cfg.whatsapp ? linkWhats(cfg.whatsapp, msgZap) : '';

  let blocoPagamento = '';
  if (!aguardando) {
    blocoPagamento = `<div class="painel" style="text-align:center"><h2 style="justify-content:center">${ic.check} Situação do pedido</h2>${chipStatus(ped.status)}
      <p class="muted">Atualizado em ${dataBR(ped.atualizado_em || ped.criado_em)}</p></div>`;
  } else if (ped.metodo === 'pix') {
    const ok = cfg.pix_chave && cfg.pix_nome && cfg.pix_cidade;
    const codigo = ok ? gerarPix({ tipo: cfg.pix_tipo, chave: cfg.pix_chave, nome: cfg.pix_nome, cidade: cfg.pix_cidade, valor: ped.total, txid: ped.codigo }) : '';
    blocoPagamento = `
    <div class="painel qr-box">
      <h2 style="justify-content:center">${ic.pix} Pague com PIX</h2>
      <div class="valor-pagar">${brl(ped.total)}</div>
      ${ok ? `
        <div class="qr" id="qr"><div class="spinner"></div></div>
        <div class="copia-cola"><input readonly value="${esc(codigo)}" id="pix-codigo" aria-label="Código PIX"><button class="btn btn-p" id="copiar">${ic.copiar} Copiar</button></div>
        <div class="chave-pix">Recebedor: <b>${esc(cfg.pix_nome)}</b> • Chave (${esc(cfg.pix_tipo)}): ${esc(cfg.pix_chave)}</div>
        <ol class="passos" style="margin-top:18px">
          <li>Abra o app do seu banco e escolha <b>PIX › Pagar com QR Code</b> ou <b>Copia e Cola</b>.</li>
          <li>Escaneie o QR Code ou cole o código copiado. Confira o valor de <b>${brl(ped.total)}</b>.</li>
          <li>Depois de pagar, envie o comprovante no WhatsApp pelo botão abaixo.</li>
        </ol>`
      : `<div class="alerta alerta-info">A chave PIX está sendo configurada. Chame no WhatsApp para receber os dados de pagamento.</div>`}
    </div>`;
  } else {
    blocoPagamento = `
    <div class="painel qr-box">
      <h2 style="justify-content:center">${ic.cartao} Pague com cartão</h2>
      <div class="valor-pagar">${brl(ped.total)}</div>
      ${cfg.parcelas_max > 1 ? `<p class="muted">em até ${cfg.parcelas_max}x</p>` : ''}
      <p>${esc(cfg.cartao_instrucoes || '')}</p>
      ${cfg.cartao_link
        ? `<a class="btn btn-p btn-grande btn-bloco" href="${esc(cfg.cartao_link)}" target="_blank" rel="noopener">${ic.cartao} Pagar com cartão ${ic.externo}</a>
           <p class="muted" style="font-size:13px">Informe o valor <b>${brl(ped.total)}</b> e o número do pedido <b>${esc(ped.codigo)}</b>, se solicitado.</p>`
        : `<div class="alerta alerta-info">Vamos te enviar o link de pagamento pelo WhatsApp. Clique no botão abaixo para solicitar.</div>`}
    </div>`;
  }

  main.innerHTML = `
  <div class="pag-topo">
    <div class="icone-ok">${ic.check}</div>
    <h1>${aguardando ? 'Pedido realizado!' : 'Seu pedido'}</h1>
    <div class="num-pedido"><small>Nº DO PEDIDO</small> ${esc(ped.codigo)}</div>
    <p class="muted">Guarde este número. Ele identifica sua compra no nosso atendimento.</p>
  </div>
  <div class="pag-grid">
    <div>${blocoPagamento}</div>
    <div>
      ${zap ? `<div class="painel zap-box">
        <h2 style="justify-content:center;color:#146c3a">${ic.whats} ${aguardando ? 'Já pagou? Envie o comprovante' : 'Fale conosco'}</h2>
        <p>${aguardando ? 'Clique no botão, anexe o comprovante na conversa e pronto! A mensagem já vai com o número do seu pedido.' : 'Dúvidas sobre o pedido? Chame no WhatsApp.'}</p>
        <a class="btn btn-zap btn-grande btn-bloco" href="${zap}" target="_blank" rel="noopener">${ic.whats} ${aguardando ? 'Enviar comprovante no WhatsApp' : 'Abrir WhatsApp'}</a>
      </div>` : ''}
      <div class="painel">
        <h2>${ic.sacola} Resumo ${chipStatus(ped.status)}</h2>
        ${(ped.pedido_itens || []).map((i) => `<div class="linha-res" style="gap:12px"><span>${i.quantidade}× ${esc(i.nome)}</span><span style="white-space:nowrap">${brl(i.total)}</span></div>`).join('')}
        ${Number(ped.desconto) > 0 ? `<div class="linha-res desc" style="border-top:1px solid var(--borda);margin-top:8px;padding-top:12px"><span>Desconto PIX</span><span>- ${brl(ped.desconto)}</span></div>` : ''}
        <div class="linha-res total"><span>Total</span><span>${brl(ped.total)}</span></div>
        <p class="muted" style="font-size:13px;margin-bottom:0">Pedido feito em ${dataBR(ped.criado_em)} • Pagamento: ${ped.metodo === 'pix' ? 'PIX' : 'Cartão'}</p>
        <a class="btn btn-leve btn-bloco" style="margin-top:14px" href="minha-conta.html#pedidos">${ic.caixa} Ver meus pedidos</a>
      </div>
    </div>
  </div>`;

  const inp = $('#pix-codigo');
  if (inp) {
    $('#copiar').onclick = async () => {
      try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand('copy'); }
      toast('Código PIX copiado! Cole no app do seu banco.');
    };
    try {
      const m = await import('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/+esm');
      const qrcode = m.default?.default || m.default || m;
      const qr = qrcode(0, 'M');
      qr.addData(inp.value);
      qr.make();
      $('#qr').innerHTML = `<img src="${qr.createDataURL(8, 2)}" alt="QR Code PIX" style="image-rendering:pixelated">`;
    } catch (e) {
      console.warn(e);
      $('#qr').innerHTML = '<p class="muted" style="font-size:13px">Use o código Copia e Cola abaixo.</p>';
    }
  }
}
