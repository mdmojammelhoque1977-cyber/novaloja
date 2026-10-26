import { iniciarPagina, esc, $ } from './core.js';

const { cfg } = await iniciarPagina();
document.title = `Políticas | ${cfg.nome_loja}`;
const loja = esc(cfg.nome_loja);
const contato = [cfg.whatsapp && `WhatsApp ${esc(cfg.telefone_exibicao || cfg.whatsapp)}`, cfg.email_contato && esc(cfg.email_contato)].filter(Boolean).join(' ou ');

$('#conteudo').innerHTML = `
<div class="texto-legal">
  <h1>Políticas da loja</h1>
  <p class="muted">Texto modelo — revise com seu contador/advogado e ajuste às regras do seu negócio.</p>

  <h2 id="privacidade">Política de Privacidade</h2>
  <p>A ${loja}${cfg.cnpj ? `, CNPJ ${esc(cfg.cnpj)},` : ''} respeita a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
  <ul>
    <li><b>Dados coletados:</b> nome, CPF, telefone, e-mail e endereço informados no cadastro, além dos pedidos realizados.</li>
    <li><b>Para que usamos:</b> identificar o cliente, emitir nota fiscal, processar pagamentos, entregar os produtos e prestar atendimento.</li>
    <li><b>Compartilhamento:</b> apenas com transportadoras, instituições de pagamento e órgãos fiscais, quando necessário para concluir a compra.</li>
    <li><b>Segurança:</b> os dados ficam em banco de dados protegido; cada cliente acessa somente as próprias informações com login e senha.</li>
    <li><b>Seus direitos:</b> você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento${contato ? ` pelo ${contato}` : ''}.</li>
  </ul>

  <h2 id="trocas">Trocas e Devoluções</h2>
  <ul>
    <li>Conforme o Código de Defesa do Consumidor, compras pela internet podem ser canceladas em até <b>7 dias corridos</b> após o recebimento, com reembolso integral.</li>
    <li>Produtos com defeito de fabricação seguem a garantia legal e a garantia do fabricante.</li>
    <li>Para solicitar troca ou devolução, entre em contato informando o <b>número do pedido</b>${contato ? ` pelo ${contato}` : ''}.</li>
  </ul>

  <h2>Pagamentos</h2>
  <p>Aceitamos ${[cfg.pix_ativo && 'PIX', cfg.cartao_ativo && 'cartão de crédito'].filter(Boolean).join(' e ') || 'as formas informadas no checkout'}. O pedido é confirmado após a identificação do pagamento.</p>
</div>`;
