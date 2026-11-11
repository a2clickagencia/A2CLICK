'use strict';
// ===================== CONSTANTES =====================
const ZR = 1, ZC = 2, ZI = 3;
const T_EMPTY = 0, T_ROAD = 1, T_HWY = 2, T_PLINE = 3, T_ZONE = 4, T_BLD = 5, T_RUBBLE = 6, T_BRIDGE = 7;
const F_POW = 1, F_WAT = 2, F_FIRE = 4, F_ABAND = 8, F_ROAD = 16;
const ZONE_NAMES = { 1: 'Residencial', 2: 'Comercial', 3: 'Industrial' };
const DEN_NAMES = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
const ZMAX = { 1: [0, 3, 7, 11], 2: [0, 3, 7, 11], 3: [0, 3, 5, 7] };
const CAPBASE = [0, 6, 14, 28, 50, 90, 150, 240, 360, 520, 750, 1000];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAYS_PER_MONTH = 30;

function zoneCap(zt, lvl, size) {
  if (lvl <= 0) return 0;
  let c = CAPBASE[Math.min(lvl, 11)] * size * size * (size > 1 ? 1.25 : 1);
  if (zt === ZC) c *= 0.7; else if (zt === ZI) c *= 0.65;
  return Math.round(c);
}

// ===================== EDIFÍCIOS =====================
// s: tamanho, c: custo, u: manutenção/mês, pw: energia gerada, wt: água gerada, use: consumo
// cov: tipo de cobertura, r: raio, park: valor lazer, transit: redução de tráfego
// pop: população p/ desbloquear, yr: ano p/ desbloquear, once: marco único
const BLD = {
  coal:    { n: 'Usina a Carvão', cat: 'power', s: 3, c: 4000, u: 70, pw: 2200, pol: 230, yr: 1900, d: 'Barata e poderosa, mas muito poluente.' },
  gas:     { n: 'Usina a Gás', cat: 'power', s: 2, c: 2800, u: 55, pw: 1200, pol: 80, yr: 1950, d: 'Equilíbrio entre custo e poluição.' },
  wind:    { n: 'Turbina Eólica', cat: 'power', s: 1, c: 300, u: 4, pw: 80, yr: 1975, d: 'Energia limpa em pequena escala.' },
  solar:   { n: 'Fazenda Solar', cat: 'power', s: 3, c: 5500, u: 35, pw: 1000, yr: 1990, d: 'Limpa. Rende +50% com a política Incentivo Verde.' },
  nuclear: { n: 'Usina Nuclear', cat: 'power', s: 4, c: 17000, u: 220, pw: 8000, pol: 10, yr: 1965, d: 'Enorme potência. Pequeno risco de acidente sem bombeiros.' },
  fusion:  { n: 'Reator de Fusão', cat: 'power', s: 4, c: 65000, u: 500, pw: 35000, yr: 2040, d: 'Energia do futuro: limpa e quase infinita.' },
  pump:    { n: 'Bomba d\'Água', cat: 'water', s: 1, c: 500, u: 12, wt: 700, use: 15, yr: 1900, d: 'Rende o dobro se estiver junto à água.' },
  wtower:  { n: 'Caixa d\'Água', cat: 'water', s: 1, c: 350, u: 6, wt: 300, use: 5, yr: 1900, d: 'Pequena fonte, funciona em qualquer lugar.' },
  desal:   { n: 'Dessalinizadora', cat: 'water', s: 3, c: 9000, u: 110, wt: 9000, use: 120, yr: 1985, nearWater: true, d: 'Muita água. Precisa ficar junto à água.' },
  treat:   { n: 'Estação de Reciclagem', cat: 'water', s: 2, c: 3500, u: 60, use: 40, cov: 'clean', r: 18, yr: 1970, d: 'Reduz a poluição em 45% na região.' },
  police:  { n: 'Delegacia', cat: 'serv', s: 2, c: 900, u: 85, use: 15, cov: 'police', r: 17, d: 'Reduz o crime ao redor.' },
  policehq:{ n: 'Central de Polícia', cat: 'serv', s: 3, c: 3800, u: 240, use: 40, cov: 'police', r: 32, pop: 25000, d: 'Grande cobertura contra o crime.' },
  fire:    { n: 'Corpo de Bombeiros', cat: 'serv', s: 2, c: 800, u: 75, use: 15, cov: 'fire', r: 17, d: 'Previne e combate incêndios.' },
  clinic:  { n: 'Posto de Saúde', cat: 'serv', s: 1, c: 500, u: 45, use: 8, cov: 'health', r: 11, d: 'Saúde básica para o bairro.' },
  hospital:{ n: 'Hospital', cat: 'serv', s: 3, c: 4200, u: 260, use: 60, cov: 'health', r: 30, pop: 8000, d: 'Saúde de qualidade para a região.' },
  school:  { n: 'Escola', cat: 'serv', s: 2, c: 1000, u: 100, use: 15, cov: 'edu', r: 16, d: 'Educa a população (aumenta o QE).' },
  library: { n: 'Biblioteca', cat: 'serv', s: 1, c: 600, u: 35, use: 6, cov: 'edu', r: 10, d: 'Cultura e educação.' },
  univ:    { n: 'Universidade', cat: 'serv', s: 4, c: 13000, u: 480, use: 90, cov: 'edu', r: 48, pop: 15000, d: 'Grande impulso ao QE e à indústria tecnológica.' },
  plaza:   { n: 'Praça', cat: 'park', s: 1, c: 120, u: 2, park: 1.2, r: 5, d: 'Valoriza a vizinhança.' },
  park:    { n: 'Parque', cat: 'park', s: 2, c: 450, u: 8, park: 2.2, r: 8, d: 'Lazer e valorização.' },
  sports:  { n: 'Quadra Esportiva', cat: 'park', s: 2, c: 700, u: 12, park: 2, r: 8, d: 'Lazer e menos crime juvenil.' },
  bigpark: { n: 'Parque Central', cat: 'park', s: 4, c: 3000, u: 40, park: 4, r: 15, pop: 5000, d: 'Um oásis verde na cidade.' },
  marina:  { n: 'Marina', cat: 'park', s: 2, c: 2500, u: 30, park: 3, r: 12, nearWater: true, pop: 3000, d: 'Atrai turistas. Precisa ficar junto à água.' },
  zoo:     { n: 'Zoológico', cat: 'park', s: 3, c: 6000, u: 110, park: 3.5, r: 16, pop: 15000, tour: 0.06, d: 'Atrai turismo (+demanda comercial).' },
  bus:     { n: 'Terminal de Ônibus', cat: 'trans', s: 2, c: 700, u: 30, use: 10, transit: 0.28, r: 9, d: 'Reduz o trânsito ao redor.' },
  metro:   { n: 'Estação de Metrô', cat: 'trans', s: 1, c: 1500, u: 45, use: 25, transit: 0.55, r: 13, yr: 1960, d: 'Estações se ligam automaticamente. Grande redução de trânsito.' },
  airport: { n: 'Aeroporto', cat: 'trans', s: 5, c: 28000, u: 380, use: 120, pol: 70, pop: 20000, tour: 0.12, d: 'Impulsiona comércio e indústria.' },
  cityhall:{ n: 'Prefeitura', cat: 'mark', s: 3, c: 3000, u: 30, use: 20, pop: 2000, once: true, appr: 6, park: 1.5, r: 10, d: 'Marco: +6 de aprovação.' },
  statue:  { n: 'Monumento ao Fundador', cat: 'mark', s: 1, c: 1500, u: 2, pop: 5000, once: true, appr: 3, park: 2, r: 8, d: 'Marco: orgulho cívico.' },
  cathedral:{ n: 'Catedral', cat: 'mark', s: 3, c: 9000, u: 20, pop: 12000, once: true, appr: 4, park: 3, r: 14, tour: 0.05, d: 'Marco: atrai turistas.' },
  stadium: { n: 'Estádio', cat: 'mark', s: 4, c: 22000, u: 280, use: 80, pop: 30000, once: true, appr: 6, tour: 0.1, park: 2.5, r: 14, d: 'Marco: +turismo, +aprovação.' },
  tvtower: { n: 'Torre Panorâmica', cat: 'mark', s: 2, c: 30000, u: 60, use: 40, pop: 60000, once: true, appr: 4, tour: 0.12, park: 2, r: 20, d: 'Marco icônico do skyline.' },
  arco:    { n: 'Arcologia', cat: 'mark', s: 4, c: 90000, u: 600, use: 1600, wuse: 1200, pop: 150000, yr: 2025, house: 30000, d: 'Megaestrutura: abriga 30.000 habitantes.' },
  spire:   { n: 'Torre Infinita', cat: 'mark', s: 3, c: 250000, u: 900, use: 3000, pop: 400000, yr: 2030, once: true, appr: 10, tour: 0.3, park: 4, r: 40, d: 'O maior edifício do mundo. Lenda.' },
};
// Novos itens (v1.2) — adicionados NO FINAL para manter os IDs dos saves antigos
Object.assign(BLD, {
  playground:{ n: 'Parquinho Infantil', cat: 'park', s: 1, c: 180, u: 3, park: 1.4, r: 5, d: 'Brinquedos para as crianças do bairro.' },
  skate:   { n: 'Pista de Skate', cat: 'park', s: 2, c: 650, u: 10, park: 2, r: 8, pop: 1500, d: 'Lazer jovem, reduz o crime juvenil.' },
  soccer:  { n: 'Campo de Futebol', cat: 'park', s: 3, c: 1400, u: 18, park: 2.6, r: 11, pop: 2000, d: 'O campinho do bairro, com arquibancada.' },
  amph:    { n: 'Anfiteatro ao Ar Livre', cat: 'park', s: 3, c: 3800, u: 45, park: 3, r: 14, pop: 10000, tour: 0.03, d: 'Shows e teatro a céu aberto.' },
  garden:  { n: 'Jardim Botânico', cat: 'park', s: 3, c: 5200, u: 60, park: 4, r: 16, pop: 8000, tour: 0.04, d: 'Estufa de vidro e canteiros floridos.' },
  waterpark:{ n: 'Parque Aquático', cat: 'park', s: 3, c: 7500, u: 90, park: 3.5, r: 15, pop: 12000, tour: 0.05, d: 'Piscinas e toboáguas.' },
  ferris:  { n: 'Roda-Gigante', cat: 'park', s: 2, c: 9000, u: 70, use: 30, park: 3, r: 14, pop: 20000, tour: 0.06, d: 'Gira de verdade! Ilumina a noite.' },
  obelisk: { n: 'Obelisco', cat: 'mark', s: 1, c: 2500, u: 4, pop: 3000, appr: 1, park: 1.5, r: 8, d: 'Marco de granito no centro da praça.' },
  clock:   { n: 'Torre do Relógio', cat: 'mark', s: 1, c: 3200, u: 6, pop: 4000, appr: 1, park: 1.5, r: 8, d: 'Marca as horas da cidade.' },
  lighthouse:{ n: 'Farol', cat: 'mark', s: 1, c: 2800, u: 8, use: 6, pop: 2000, nearWater: true, tour: 0.02, park: 1, r: 8, d: 'Precisa ficar junto à água. Feixe de luz à noite.' },
  archmon: { n: 'Arco Monumental', cat: 'mark', s: 2, c: 12000, u: 15, pop: 15000, once: true, appr: 3, tour: 0.04, park: 2, r: 12, d: 'Marco: portal triunfal da cidade.' },
  museum:  { n: 'Museu de Arte Moderna', cat: 'mark', s: 3, c: 18000, u: 120, use: 30, pop: 20000, once: true, appr: 3, tour: 0.07, park: 2, r: 14, d: 'Marco: arquitetura ousada, atrai turistas.' },
  planet:  { n: 'Planetário', cat: 'mark', s: 2, c: 14000, u: 90, use: 25, pop: 25000, once: true, appr: 2, tour: 0.04, park: 1.5, r: 12, d: 'Marco: +educação e turismo.' },
  opera:   { n: 'Teatro Municipal', cat: 'mark', s: 3, c: 26000, u: 150, use: 30, pop: 35000, once: true, appr: 5, tour: 0.08, park: 2.5, r: 15, d: 'Marco: ópera, balé e cultura.' },
  pyramid: { n: 'Pirâmide de Vidro', cat: 'mark', s: 2, c: 30000, u: 60, use: 20, pop: 45000, once: true, appr: 3, tour: 0.08, park: 2, r: 14, d: 'Marco: ícone de vidro e aço.' },
  castle:  { n: 'Castelo Histórico', cat: 'mark', s: 3, c: 40000, u: 80, pop: 50000, once: true, appr: 4, tour: 0.12, park: 3, r: 16, d: 'Marco: muralhas e torres medievais.' },
  colossus:{ n: 'Colosso da Cidade', cat: 'mark', s: 2, c: 70000, u: 40, pop: 80000, once: true, appr: 7, tour: 0.18, park: 3, r: 22, d: 'Marco: estátua gigante segurando uma tocha.' },
});
const BKEYS = Object.keys(BLD);
BKEYS.forEach((k, i) => { BLD[k].id = i + 1; BLD[k].key = k; });
const BYID = [null].concat(BKEYS.map(k => BLD[k]));

// ===================== FERRAMENTAS =====================
const TOOL_DEFS = {
  road:  { n: 'Rua', cost: 10, icon: '🛣️', d: 'Ruas levam energia e água. Arraste. Pontes sobre a água custam 6×.' },
  hwy:   { n: 'Avenida Expressa', cost: 40, icon: '🛤️', d: 'Capacidade de trânsito 4×. Arraste.' },
  bridge1: { n: 'Ponte Simples', cost: 60, icon: '🌉', br: 1, d: 'Arraste em linha reta sobre a água, de uma rua até a outra.' },
  bridge2: { n: 'Ponte em Arco (pedra)', cost: 95, icon: '🌁', br: 2, d: 'Arcada clássica de pedra. Arraste sobre a água.' },
  bridge3: { n: 'Ponte Estaiada', cost: 160, icon: '🎐', br: 3, d: 'Torres altas com cabos em leque. Arraste sobre a água.' },
  viaduct: { n: 'Viaduto', cost: 80, icon: '🛣️', br: 4, d: 'Via elevada com rampas: passa por cima de ruas, avenidas e terrenos.' },
  pline: { n: 'Linha de Energia', cost: 5, icon: '🔌', d: 'Conecta energia por terrenos vazios.' },
  zR1: { n: 'Residencial Baixa', cost: 5, zt: ZR, zd: 1, icon: '🏡' },
  zR2: { n: 'Residencial Média', cost: 10, zt: ZR, zd: 2, icon: '🏘️' },
  zR3: { n: 'Residencial Alta', cost: 20, zt: ZR, zd: 3, icon: '🏢' },
  zC1: { n: 'Comercial Baixa', cost: 5, zt: ZC, zd: 1, icon: '🏪' },
  zC2: { n: 'Comercial Média', cost: 10, zt: ZC, zd: 2, icon: '🏬' },
  zC3: { n: 'Comercial Alta', cost: 20, zt: ZC, zd: 3, icon: '🏙️' },
  zI1: { n: 'Industrial Baixa', cost: 5, zt: ZI, zd: 1, icon: '🏚️' },
  zI2: { n: 'Industrial Média', cost: 10, zt: ZI, zd: 2, icon: '🏭' },
  zI3: { n: 'Industrial Alta', cost: 20, zt: ZI, zd: 3, icon: '⚙️' },
  dezone: { n: 'Remover Zona', cost: 1, icon: '⬜', d: 'Remove o zoneamento de lotes vazios.' },
  trees: { n: 'Plantar Árvores', cost: 3, icon: '🌳', d: 'Reduzem poluição e valorizam.' },
  tWater: { n: 'Criar Água', cost: 50, icon: '🌊', d: 'Escava lagos e canais.' },
  tLand: { n: 'Aterrar', cost: 50, icon: '⛰️', d: 'Transforma água em terra.' },
  dFire: { n: 'Incêndio', cost: 0, icon: '🔥', d: 'Inicia um incêndio no local.' },
  dTornado: { n: 'Tornado', cost: 0, icon: '🌪️', d: 'Um tornado percorre a cidade.' },
  dMeteor: { n: 'Meteoro', cost: 0, icon: '☄️', d: 'Clique no alvo do impacto.' },
  dQuake: { n: 'Terremoto', cost: 0, icon: '🫨', d: 'Abala a cidade inteira.' },
};

const CATEGORIES = [
  { id: 'inspect', icon: '🔍', n: 'Inspecionar (I)', tool: 'inspect' },
  { id: 'bulldoze', icon: '🧨', n: 'Demolir (B)', tool: 'bulldoze' },
  { id: 'trans', icon: '🛣️', n: 'Transporte (R)', items: ['road', 'hwy', 'bridge1', 'bridge2', 'bridge3', 'viaduct', 'bus', 'metro', 'airport'] },
  { id: 'zones', icon: '🏘️', n: 'Zoneamento (Z)', items: ['zR1', 'zR2', 'zR3', 'zC1', 'zC2', 'zC3', 'zI1', 'zI2', 'zI3', 'dezone'] },
  { id: 'power', icon: '⚡', n: 'Energia (P)', items: ['pline', 'coal', 'gas', 'wind', 'solar', 'nuclear', 'fusion'] },
  { id: 'water', icon: '💧', n: 'Água e Saneamento', items: ['pump', 'wtower', 'desal', 'treat'] },
  { id: 'serv', icon: '🏛️', n: 'Serviços', items: ['police', 'policehq', 'fire', 'clinic', 'hospital', 'school', 'library', 'univ'] },
  { id: 'park', icon: '🌳', n: 'Lazer', items: ['plaza', 'playground', 'park', 'sports', 'skate', 'soccer', 'bigpark', 'garden', 'amph', 'waterpark', 'ferris', 'marina', 'zoo'] },
  { id: 'mark', icon: '🏆', n: 'Marcos e Recompensas', items: ['cityhall', 'statue', 'obelisk', 'clock', 'lighthouse', 'cathedral', 'archmon', 'museum', 'planet', 'stadium', 'opera', 'pyramid', 'castle', 'tvtower', 'colossus', 'arco', 'spire'] },
  { id: 'terrain', icon: '⛰️', n: 'Terreno', items: ['trees', 'tWater', 'tLand'] },
  { id: 'disaster', icon: '🌋', n: 'Desastres', items: ['dFire', 'dTornado', 'dMeteor', 'dQuake'] },
];

const BLD_ICONS = {
  coal: '🏭', gas: '🔥', wind: '🌬️', solar: '☀️', nuclear: '☢️', fusion: '🌀', pump: '🚰', wtower: '🗼', desal: '🌊', treat: '♻️',
  police: '👮', policehq: '🚓', fire: '🚒', clinic: '🩺', hospital: '🏥', school: '🏫', library: '📚', univ: '🎓',
  plaza: '⛲', park: '🌲', sports: '🏀', bigpark: '🏞️', marina: '⛵', zoo: '🦁', bus: '🚌', metro: 'Ⓜ️', airport: '✈️',
  playground: '🛝', skate: '🛹', soccer: '⚽', amph: '🎭', garden: '🌺', waterpark: '🏊', ferris: '🎡',
  obelisk: '🗿', clock: '🕰️', lighthouse: '🗼', archmon: '⛩️', museum: '🖼️', planet: '🔭', opera: '🎻', pyramid: '🔺', castle: '🏰', colossus: '🗽',
  cityhall: '🏛️', statue: '🗽', cathedral: '⛪', stadium: '🏟️', tvtower: '📡', arco: '🌆', spire: '🗼'
};

// ===================== POLÍTICAS =====================
const POLICIES = {
  recycle:  { n: 'Coleta Seletiva', cost: 0.010, d: '−20% poluição.' },
  carfree:  { n: 'Rodízio de Veículos', cost: 0.004, d: '−20% trânsito, −3 aprovação.' },
  green:    { n: 'Incentivo Verde', cost: 0.012, d: 'Solar/eólica +50%, −10% poluição industrial.' },
  curfew:   { n: 'Toque de Recolher Jovem', cost: 0.003, d: '−15% crime, −demanda comercial.' },
  tourism:  { n: 'Campanha de Turismo', cost: 0.015, d: '+demanda comercial.' },
  literacy: { n: 'Programa de Alfabetização', cost: 0.010, d: 'QE cresce mais rápido.' },
  freezone: { n: 'Zona Franca Industrial', cost: 0.000, d: '+demanda industrial, −30% imposto industrial.' },
  bike:     { n: 'Ciclovias', cost: 0.006, d: '−10% trânsito, −5% poluição, +1 aprovação.' },
  smartgrid:{ n: 'Rede Inteligente', cost: 0.008, d: '−12% consumo de energia.', yr: 1995 },
  watersave:{ n: 'Economia de Água', cost: 0.004, d: '−20% consumo de água.' },
  neighborhood:{ n: 'Vigilância Comunitária', cost: 0.003, d: '−8% crime, +1 aprovação.' },
  nuclearfree:{ n: 'Cidade Livre de Nucleares', cost: 0, d: '+3 aprovação, impede usinas nucleares.' },
};

// ===================== EVENTOS COM ESCOLHAS =====================
const EVENTS = [
  { id: 'festival', t: 'Festival de Música', d: 'Produtores querem realizar um grande festival na cidade. A prefeitura pode patrocinar.', cond: () => G.pop > 2000,
    a: ['Patrocinar ($2.000)', () => { if (!spend(2000)) return false; G.mod.appr += 5; G.mod.cdemT = 6; G.mod.cdem = 0.15; news('🎸 O festival foi um sucesso! Comércio em alta.'); }],
    b: ['Recusar', () => { G.mod.appr -= 2; news('Jovens lamentam o cancelamento do festival.'); }] },
  { id: 'factory', t: 'Investidor Estrangeiro', d: 'Uma multinacional oferece $8.000 para se instalar, mas exige regras ambientais mais frouxas por 1 ano.', cond: () => G.pop > 1500,
    a: ['Aceitar (+$8.000)', () => { G.money += 8000; G.mod.idemT = 12; G.mod.idem = 0.25; G.mod.polT = 12; G.mod.pol = 0.25; news('🏭 Multinacional chega à cidade. Ambientalistas protestam.'); }],
    b: ['Recusar', () => { G.mod.appr += 1; news('Prefeito recusa investimento poluente.'); }] },
  { id: 'strike', t: 'Greve dos Garis', d: 'Os garis exigem aumento salarial. Sem acordo, o lixo vai se acumular.', cond: () => G.pop > 5000,
    a: ['Negociar ($1.500)', () => { if (!spend(1500)) return false; news('🧹 Acordo fechado. Ruas limpas novamente.'); }],
    b: ['Endurecer', () => { G.mod.polT = 4; G.mod.pol = 0.3; G.mod.appr -= 4; news('🗑️ Lixo se acumula pelas ruas durante a greve.'); }] },
  { id: 'startup', t: 'Startup Bilionária', d: 'Uma startup local quer um campus tecnológico. Pede isenção fiscal de 6 meses.', cond: () => G.eq > 85 && G.pop > 8000,
    a: ['Conceder isenção', () => { G.mod.techT = 24; G.mod.tech = 0.3; G.mod.idemT = 12; G.mod.idem = 0.2; news('💻 Campus tecnológico anunciado! Indústria limpa em expansão.'); }],
    b: ['Recusar', () => { news('Startup se muda para a cidade vizinha.'); }] },
  { id: 'heat', t: 'Onda de Calor', d: 'Meteorologistas preveem calor extremo. Distribuir ventiladores e abrir piscinas públicas?', cond: () => G.month >= 10 || G.month <= 2,
    a: ['Ajudar ($1.000)', () => { if (!spend(1000)) return false; G.mod.appr += 3; news('🌡️ População agradece apoio na onda de calor.'); }],
    b: ['Não agir', () => { G.mod.appr -= 3; G.mod.powT = 3; G.mod.pow = 0.2; news('🥵 Consumo de energia dispara no calor.'); }] },
  { id: 'president', t: 'Visita Presidencial', d: 'O Presidente quer visitar a cidade. Uma recepção custa caro, mas pode render verbas federais.', cond: () => G.pop > 10000,
    a: ['Recepção ($3.000)', () => { if (!spend(3000)) return false; if (G.approval > 55) { G.money += 12000; news('🇧🇷 Presidente elogia a cidade e libera $12.000 em verbas!'); } else { news('Presidente sai irritado com protestos durante a visita.'); } }],
    b: ['Recusar', () => { news('Presidente cancela visita.'); }] },
  { id: 'casino', t: 'Proposta de Cassino', d: 'Empresários querem abrir um cassino. Renda de $600/mês, mas o crime deve subir.', cond: () => G.pop > 15000 && !G.mod.casino,
    a: ['Aprovar', () => { G.mod.casino = 1; news('🎰 Cassino inaugurado. Moralistas protestam.'); }],
    b: ['Rejeitar', () => { G.mod.appr += 2; news('Câmara rejeita cassino.'); }] },
  { id: 'donor', t: 'Filantropo Generoso', d: 'Uma bilionária deseja doar à cidade. O que pedir?', cond: () => G.pop > 3000,
    a: ['Dinheiro ($6.000)', () => { G.money += 6000; news('💰 Doação de $6.000 recebida!'); }],
    b: ['Educação (+QE)', () => { G.eq += 12; news('📚 Doação financia bolsas de estudo. QE em alta!'); }] },
  { id: 'olymp', t: 'Candidatura Olímpica', d: 'O comitê convida a cidade a sediar os Jogos. Custa $60.000, mas o turismo explodirá por anos.', cond: () => G.pop > 120000,
    a: ['Candidatar ($60.000)', () => { if (!spend(60000)) return false; G.mod.cdemT = 48; G.mod.cdem = 0.35; G.mod.appr += 8; news('🏅 A cidade sediará os Jogos! Turismo em êxtase.'); }],
    b: ['Recusar', () => { news('Cidade desiste da candidatura olímpica.'); }] },
  { id: 'drought', t: 'Seca Prolongada', d: 'Reservatórios baixos. Racionar água ou comprar de vizinhos?', cond: () => G.pop > 4000,
    a: ['Comprar ($2.500)', () => { if (!spend(2500)) return false; news('🚰 Água comprada dos vizinhos. Abastecimento normal.'); }],
    b: ['Racionar', () => { G.mod.watT = 4; G.mod.wat = 0.3; G.mod.appr -= 3; news('🏜️ Racionamento de água irrita moradores.'); }] },
];

// ===================== CONQUISTAS =====================
const ACHIEVEMENTS = [
  { id: 'p1k', n: 'Vilarejo', d: '1.000 habitantes', f: () => G.pop >= 1000 },
  { id: 'p10k', n: 'Cidade', d: '10.000 habitantes', f: () => G.pop >= 10000 },
  { id: 'p50k', n: 'Cidade Grande', d: '50.000 habitantes', f: () => G.pop >= 50000 },
  { id: 'p100k', n: 'Metrópole', d: '100.000 habitantes', f: () => G.pop >= 100000 },
  { id: 'p500k', n: 'Megalópole', d: '500.000 habitantes', f: () => G.pop >= 500000 },
  { id: 'p1m', n: 'Lenda Urbana', d: '1.000.000 habitantes', f: () => G.pop >= 1000000 },
  { id: 'rich', n: 'Cofres Cheios', d: 'Ter $500.000 em caixa', f: () => G.money >= 500000 },
  { id: 'green', n: 'Cidade Verde', d: '30.000 hab. sem usinas a carvão', f: () => G.pop >= 30000 && G.cnt.coal === 0 },
  { id: 'smart', n: 'Cidade Inteligente', d: 'QE acima de 130', f: () => G.eq >= 130 },
  { id: 'loved', n: 'Prefeito Amado', d: 'Aprovação acima de 90%', f: () => G.approval >= 90 && G.pop > 5000 },
  { id: 'tower', n: 'Arranha-céu', d: 'Construir um edifício nível máximo', f: () => G.stats.maxLvl >= 11 },
  { id: 'fusion', n: 'Energia do Futuro', d: 'Construir um Reator de Fusão', f: () => G.cnt.fusion > 0 },
  { id: 'metro', n: 'Rede Subterrânea', d: '10 estações de metrô', f: () => G.cnt.metro >= 10 },
  { id: 'safe', n: 'Cidade Segura', d: 'Crime médio baixo com 50.000 hab.', f: () => G.pop >= 50000 && G.stats.crimeAvg < 25 },
  { id: 'century', n: 'Centenária', d: 'Governar por 100 anos', f: () => G.year - G.startYear >= 100 },
];

const NEWS_FLAVOR = [
  'Gato da prefeitura eleito mascote oficial da cidade.',
  'Pesquisa: 7 em cada 10 moradores preferem pão de queijo ao croissant.',
  'Padaria local bate recorde com coxinha de 2 metros.',
  'Pombos se organizam e ocupam a praça principal.',
  'Cientistas locais descobrem que segunda-feira é mesmo o pior dia.',
  'Time da cidade empata pela 14ª vez seguida.',
  'Moradores relatam OVNI que era, na verdade, um balão de festa.',
  'Concurso de dança na praça reúne mil pessoas.',
  'Bibliotecária devolve livro com 40 anos de atraso — e paga a multa.',
  'Festival gastronômico promete o maior churrasco do estado.',
  'Prefeito é flagrado cantando no karaokê. Aprovação sobe 0,1%.',
  'Startup cria app que avisa quando o ônibus vai atrasar. Sempre.',
  'Previsão do tempo acerta pela primeira vez no mês.',
  'Moradores pedem mais ciclovias e menos buzinas.',
  'Cachorro caramelo vira patrimônio cultural do bairro.',
];

const STREET_NAMES = ['Aurora', 'Horizonte', 'Ipê', 'Jacarandá', 'Atlântico', 'Bela Vista', 'Primavera', 'Solar', 'Cristal', 'Vitória', 'Esperança', 'Monte Alegre', 'Boa Vista', 'Lumen', 'Safira', 'Pátria', 'Central', 'Jardim', 'Imperial', 'Netuno', 'Orion', 'Paraíso'];
const BLD_PREFIX = { 1: ['Residencial', 'Edifício', 'Condomínio', 'Villa', 'Solar'], 2: ['Centro Empresarial', 'Torre', 'Shopping', 'Galeria', 'Plaza'], 3: ['Indústrias', 'Fábrica', 'Metalúrgica', 'Tecnologia', 'Logística'] };
