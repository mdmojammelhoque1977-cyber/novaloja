// Dados de exemplo usados só enquanto o Supabase não estiver configurado (config.js).

const svg = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);

function imgClimatizador(cor = '#8C1D40', variante = 0) {
  const largura = variante % 2 ? 150 : 120;
  const x = 200 - largura / 2;
  return svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#fff"/>
  <ellipse cx="200" cy="352" rx="${largura / 1.6}" ry="10" fill="#000" opacity=".08"/>
  <rect x="${x}" y="70" width="${largura}" height="270" rx="26" fill="#f4f4f6" stroke="#d9d9de" stroke-width="3"/>
  <rect x="${x + 14}" y="90" width="${largura - 28}" height="44" rx="10" fill="#1f1f24"/>
  <circle cx="${x + 34}" cy="112" r="6" fill="${cor}"/><rect x="${x + 48}" y="106" width="${largura - 82}" height="12" rx="6" fill="#3b3b44"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="${x + 18}" y="${152 + i * 16}" width="${largura - 36}" height="7" rx="3.5" fill="#c9c9d1"/>`).join('')}
  <rect x="${x + 18}" y="304" width="${largura - 36}" height="22" rx="8" fill="${cor}" opacity=".9"/>
  <circle cx="${x + 20}" cy="344" r="8" fill="#2a2a30"/><circle cx="${x + largura - 20}" cy="344" r="8" fill="#2a2a30"/>
</svg>`);
}

function imgVentilador(cor = '#8C1D40') {
  return svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#fff"/>
  <ellipse cx="200" cy="355" rx="80" ry="10" fill="#000" opacity=".08"/>
  <rect x="192" y="210" width="16" height="130" fill="#2a2a30"/><ellipse cx="200" cy="345" rx="70" ry="14" fill="#2a2a30"/>
  <circle cx="200" cy="150" r="105" fill="#f4f4f6" stroke="#2a2a30" stroke-width="6"/>
  ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="200" cy="100" rx="22" ry="48" fill="${cor}" opacity=".85" transform="rotate(${i * 60} 200 150)"/>`).join('')}
  <circle cx="200" cy="150" r="20" fill="#2a2a30"/>
</svg>`);
}

const CATS = [
  { id: 'c1', nome: 'Climatizadores', ordem: 1, imagem_url: imgClimatizador() },
  { id: 'c2', nome: 'Ventiladores', ordem: 2, imagem_url: imgVentilador() },
  { id: 'c3', nome: 'Ar-condicionado', ordem: 3, imagem_url: imgClimatizador('#1e6bd6', 1) },
  { id: 'c4', nome: 'Umidificadores', ordem: 4, imagem_url: imgClimatizador('#14a37f', 3) },
];

const p = (id, nome, cat, de, por, img, extra = {}) => ({
  id, nome, categoria_id: cat, preco_de: de, preco_por: por, imagens: [img], ativo: true,
  destaque: false, selo: '', estoque: null, ordem: 0,
  descricao: 'Produto de demonstração. Cadastre seus produtos reais no painel administrativo.\n\n• Baixo consumo de energia\n• Controle remoto\n• Garantia de fábrica',
  ...extra,
});

const PRODUTOS = [
  p('p1', 'Climatizador Evaporativo 45L Turbo 3 Velocidades', 'c1', 1299.9, 899.9, imgClimatizador('#8C1D40', 1), { destaque: true, selo: 'EXCLUSIVO SITE' }),
  p('p2', 'Climatizador Portátil 12L com Controle Remoto', 'c1', 699.9, 459.9, imgClimatizador('#E3262E')),
  p('p3', 'Climatizador Industrial 100L Alta Vazão', 'c1', 3499.0, 2690.0, imgClimatizador('#1f1f24', 3)),
  p('p4', 'Ventilador de Coluna 50cm 6 Pás Silencioso', 'c2', 349.9, 239.9, imgVentilador('#8C1D40')),
  p('p5', 'Ventilador de Mesa 40cm Turbo', 'c2', 219.9, 159.9, imgVentilador('#1e6bd6')),
  p('p6', 'Ar-condicionado Split Inverter 12.000 BTUs', 'c3', 2899.0, 2199.0, imgClimatizador('#1e6bd6', 1), { destaque: true }),
  p('p7', 'Umidificador Ultrassônico 4L Aromatizador', 'c4', 249.9, 169.9, imgClimatizador('#14a37f', 2)),
  p('p8', 'Climatizador 3 em 1 Umidifica, Ventila e Climatiza', 'c1', 899.9, 649.9, imgClimatizador('#8C1D40')),
];

export const DEMO = {
  config: {
    id: 1, nome_loja: 'Climatizadores Natal', logo_url: '', whatsapp: '5562999999999',
    telefone_exibicao: '(62) 99999-9999', email_contato: 'contato@sualoja.com.br', cnpj: '00.000.000/0001-00',
    endereco_loja: 'Goiânia - GO', faixa_topo: '🎄 NATAL ANTECIPADO • Ofertas por tempo limitado',
    titulo_ofertas: 'Ofertas de Natal Antecipado', data_fim_promo: '2026-12-25T00:00:00-03:00',
    aviso_frete: 'Consulte frete e prazo pelo WhatsApp', cor_primaria: '#8C1D40', cor_destaque: '#FFD23F',
    pix_ativo: true, pix_tipo: 'telefone', pix_chave: '62999999999', pix_nome: 'Loja Demonstracao', pix_cidade: 'Goiania',
    desconto_pix: 5, cartao_ativo: true, cartao_link: '', cartao_instrucoes: 'Clique no botão abaixo para pagar com cartão.',
    parcelas_max: 10,
  },
  categorias: CATS,
  banners: [],
  produtos: PRODUTOS,
};
