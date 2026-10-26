// Gera o código "PIX Copia e Cola" (BR Code / EMV) com valor e identificador do pedido.

const tlv = (id, valor) => id + String(valor.length).padStart(2, '0') + valor;

function limpar(texto, max) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim().toUpperCase().slice(0, max);
}

export function normalizarChave(tipo, chave) {
  const c = String(chave || '').trim();
  const d = c.replace(/\D/g, '');
  switch (tipo) {
    case 'cpf':
    case 'cnpj': return d;
    case 'telefone': return '+' + (d.startsWith('55') && d.length >= 12 ? d : '55' + d);
    case 'email': return c.toLowerCase();
    default: return c;
  }
}

export function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function gerarPix({ tipo, chave, nome, cidade, valor, txid }) {
  const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', normalizarChave(tipo, chave));
  let p = tlv('00', '01') + tlv('26', conta) + tlv('52', '0000') + tlv('53', '986');
  if (Number(valor) > 0) p += tlv('54', Number(valor).toFixed(2));
  p += tlv('58', 'BR');
  p += tlv('59', limpar(nome, 25) || 'RECEBEDOR');
  p += tlv('60', limpar(cidade, 15) || 'BRASIL');
  const id = String(txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  p += tlv('62', tlv('05', id));
  p += '6304';
  return p + crc16(p);
}
