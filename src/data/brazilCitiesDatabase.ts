import { VehicleAxles } from '../types/cockpit';

export type TripType = 'somente_ida' | 'ida_e_volta';

export interface BrazilCity {
  city: string;
  state: string; // UF (SP, MT, GO, etc.)
  stateName: string;
  fullLabel: string; // e.g. "Rondonópolis - MT"
  region: 'Centro-Oeste' | 'Sudeste' | 'Sul' | 'Nordeste' | 'Norte';
  lat: number;
  lng: number;
  highways: string[];
  role: 'Porto' | 'Agronegócio' | 'Indústria' | 'Entroncamento' | 'Capital' | 'Logística';
  avgDieselPrice: number;
}

export const ALL_BRAZILIAN_CITIES: BrazilCity[] = [
  // CENTRO-OESTE - MT
  { city: 'Rondonópolis', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Rondonópolis - MT', region: 'Centro-Oeste', lat: -16.4674, lng: -54.6361, highways: ['BR-163', 'BR-364'], role: 'Agronegócio', avgDieselPrice: 6.29 },
  { city: 'Sorriso', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Sorriso - MT', region: 'Centro-Oeste', lat: -12.5441, lng: -55.7231, highways: ['BR-163', 'MT-242'], role: 'Agronegócio', avgDieselPrice: 6.38 },
  { city: 'Sinop', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Sinop - MT', region: 'Centro-Oeste', lat: -11.8608, lng: -55.5095, highways: ['BR-163'], role: 'Agronegócio', avgDieselPrice: 6.42 },
  { city: 'Lucas do Rio Verde', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Lucas do Rio Verde - MT', region: 'Centro-Oeste', lat: -13.0531, lng: -55.9125, highways: ['BR-163'], role: 'Agronegócio', avgDieselPrice: 6.35 },
  { city: 'Nova Mutum', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Nova Mutum - MT', region: 'Centro-Oeste', lat: -13.8344, lng: -56.0792, highways: ['BR-163'], role: 'Agronegócio', avgDieselPrice: 6.32 },
  { city: 'Primavera do Leste', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Primavera do Leste - MT', region: 'Centro-Oeste', lat: -15.5583, lng: -54.2986, highways: ['BR-070'], role: 'Agronegócio', avgDieselPrice: 6.31 },
  { city: 'Campo Novo do Parecis', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Campo Novo do Parecis - MT', region: 'Centro-Oeste', lat: -13.6744, lng: -57.8869, highways: ['BR-364', 'MT-235'], role: 'Agronegócio', avgDieselPrice: 6.41 },
  { city: 'Cuiabá', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Cuiabá - MT', region: 'Centro-Oeste', lat: -15.6014, lng: -56.0979, highways: ['BR-163', 'BR-364', 'BR-070'], role: 'Capital', avgDieselPrice: 6.25 },
  { city: 'Barra do Garças', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Barra do Garças - MT', region: 'Centro-Oeste', lat: -15.8931, lng: -52.2569, highways: ['BR-070', 'BR-158'], role: 'Entroncamento', avgDieselPrice: 6.33 },
  { city: 'Tangará da Serra', state: 'MT', stateName: 'Mato Grosso', fullLabel: 'Tangará da Serra - MT', region: 'Centro-Oeste', lat: -14.6228, lng: -57.4914, highways: ['MT-358'], role: 'Agronegócio', avgDieselPrice: 6.36 },

  // CENTRO-OESTE - GO & DF
  { city: 'Rio Verde', state: 'GO', stateName: 'Goiás', fullLabel: 'Rio Verde - GO', region: 'Centro-Oeste', lat: -17.7925, lng: -50.9192, highways: ['BR-060', 'BR-452'], role: 'Agronegócio', avgDieselPrice: 6.19 },
  { city: 'Jataí', state: 'GO', stateName: 'Goiás', fullLabel: 'Jataí - GO', region: 'Centro-Oeste', lat: -17.8814, lng: -51.7144, highways: ['BR-364', 'BR-158'], role: 'Agronegócio', avgDieselPrice: 6.22 },
  { city: 'Goiânia', state: 'GO', stateName: 'Goiás', fullLabel: 'Goiânia - GO', region: 'Centro-Oeste', lat: -16.6869, lng: -49.2648, highways: ['BR-153', 'BR-060'], role: 'Capital', avgDieselPrice: 6.12 },
  { city: 'Anápolis', state: 'GO', stateName: 'Goiás', fullLabel: 'Anápolis - GO', region: 'Centro-Oeste', lat: -16.3267, lng: -48.9533, highways: ['BR-153', 'BR-060'], role: 'Logística', avgDieselPrice: 6.14 },
  { city: 'Itumbiara', state: 'GO', stateName: 'Goiás', fullLabel: 'Itumbiara - GO', region: 'Centro-Oeste', lat: -18.4194, lng: -49.2172, highways: ['BR-153'], role: 'Indústria', avgDieselPrice: 6.15 },
  { city: 'Catalão', state: 'GO', stateName: 'Goiás', fullLabel: 'Catalão - GO', region: 'Centro-Oeste', lat: -18.1658, lng: -47.9464, highways: ['BR-050'], role: 'Indústria', avgDieselPrice: 6.18 },
  { city: 'Cristalina', state: 'GO', stateName: 'Goiás', fullLabel: 'Cristalina - GO', region: 'Centro-Oeste', lat: -16.7686, lng: -47.6139, highways: ['BR-040', 'BR-050'], role: 'Agronegócio', avgDieselPrice: 6.21 },
  { city: 'Brasília', state: 'DF', stateName: 'Distrito Federal', fullLabel: 'Brasília - DF', region: 'Centro-Oeste', lat: -15.7975, lng: -47.8919, highways: ['BR-040', 'BR-060', 'BR-020'], role: 'Capital', avgDieselPrice: 6.19 },

  // CENTRO-OESTE - MS
  { city: 'Campo Grande', state: 'MS', stateName: 'Mato Grosso do Sul', fullLabel: 'Campo Grande - MS', region: 'Centro-Oeste', lat: -20.4697, lng: -54.6201, highways: ['BR-163', 'BR-262'], role: 'Capital', avgDieselPrice: 6.15 },
  { city: 'Dourados', state: 'MS', stateName: 'Mato Grosso do Sul', fullLabel: 'Dourados - MS', region: 'Centro-Oeste', lat: -22.2231, lng: -54.8125, highways: ['BR-163', 'MS-156'], role: 'Agronegócio', avgDieselPrice: 6.18 },
  { city: 'Três Lagoas', state: 'MS', stateName: 'Mato Grosso do Sul', fullLabel: 'Três Lagoas - MS', region: 'Centro-Oeste', lat: -20.7849, lng: -51.7042, highways: ['BR-262', 'BR-158'], role: 'Indústria', avgDieselPrice: 6.12 },
  { city: 'Maracaju', state: 'MS', stateName: 'Mato Grosso do Sul', fullLabel: 'Maracaju - MS', region: 'Centro-Oeste', lat: -21.6144, lng: -55.1683, highways: ['MS-162', 'BR-267'], role: 'Agronegócio', avgDieselPrice: 6.20 },
  { city: 'Chapadão do Sul', state: 'MS', stateName: 'Mato Grosso do Sul', fullLabel: 'Chapadão do Sul - MS', region: 'Centro-Oeste', lat: -18.7933, lng: -52.6222, highways: ['BR-060'], role: 'Agronegócio', avgDieselPrice: 6.23 },

  // SUDESTE - SP
  { city: 'Santos', state: 'SP', stateName: 'São Paulo', fullLabel: 'Porto de Santos - SP', region: 'Sudeste', lat: -23.9618, lng: -46.3322, highways: ['SP-160 (Imigrantes)', 'SP-150 (Anchieta)'], role: 'Porto', avgDieselPrice: 5.99 },
  { city: 'São Paulo', state: 'SP', stateName: 'São Paulo', fullLabel: 'São Paulo - SP', region: 'Sudeste', lat: -23.5505, lng: -46.6333, highways: ['SP-021 (Rodoanel)', 'BR-116 (Dutra)', 'SP-330 (Anhanguera)', 'SP-348 (Bandeirantes)'], role: 'Capital', avgDieselPrice: 5.95 },
  { city: 'Campinas', state: 'SP', stateName: 'São Paulo', fullLabel: 'Campinas - SP', region: 'Sudeste', lat: -22.9099, lng: -47.0626, highways: ['SP-330', 'SP-348', 'SP-065 (Dom Pedro I)'], role: 'Logística', avgDieselPrice: 5.92 },
  { city: 'Ribeirão Preto', state: 'SP', stateName: 'São Paulo', fullLabel: 'Ribeirão Preto - SP', region: 'Sudeste', lat: -21.1767, lng: -47.8208, highways: ['SP-330 (Anhanguera)', 'SP-322'], role: 'Agronegócio', avgDieselPrice: 5.98 },
  { city: 'São José do Rio Preto', state: 'SP', stateName: 'São Paulo', fullLabel: 'São José do Rio Preto - SP', region: 'Sudeste', lat: -20.8113, lng: -49.3758, highways: ['SP-310 (Washington Luís)', 'BR-153'], role: 'Entroncamento', avgDieselPrice: 5.97 },
  { city: 'Sorocaba', state: 'SP', stateName: 'São Paulo', fullLabel: 'Sorocaba - SP', region: 'Sudeste', lat: -23.5015, lng: -47.4526, highways: ['SP-280 (Castello Branco)', 'SP-075'], role: 'Indústria', avgDieselPrice: 5.96 },
  { city: 'Paulínia', state: 'SP', stateName: 'São Paulo', fullLabel: 'Paulínia (Replan) - SP', region: 'Sudeste', lat: -22.7611, lng: -47.1539, highways: ['SP-332', 'SP-065'], role: 'Indústria', avgDieselPrice: 5.89 },
  { city: 'Bauru', state: 'SP', stateName: 'São Paulo', fullLabel: 'Bauru - SP', region: 'Sudeste', lat: -22.3147, lng: -49.0606, highways: ['SP-300 (Marechal Rondon)', 'SP-225'], role: 'Entroncamento', avgDieselPrice: 5.94 },
  { city: 'Piracicaba', state: 'SP', stateName: 'São Paulo', fullLabel: 'Piracicaba - SP', region: 'Sudeste', lat: -22.7253, lng: -47.6492, highways: ['SP-304', 'SP-147'], role: 'Agronegócio', avgDieselPrice: 5.93 },
  { city: 'Presidente Prudente', state: 'SP', stateName: 'São Paulo', fullLabel: 'Presidente Prudente - SP', region: 'Sudeste', lat: -22.1256, lng: -51.3889, highways: ['SP-270 (Raposo Tavares)'], role: 'Agronegócio', avgDieselPrice: 6.02 },
  { city: 'São José dos Campos', state: 'SP', stateName: 'São Paulo', fullLabel: 'São José dos Campos - SP', region: 'Sudeste', lat: -23.1896, lng: -45.8841, highways: ['BR-116 (Presidente Dutra)', 'SP-070'], role: 'Indústria', avgDieselPrice: 5.96 },
  { city: 'Taubaté', state: 'SP', stateName: 'São Paulo', fullLabel: 'Taubaté - SP', region: 'Sudeste', lat: -23.0344, lng: -45.5619, highways: ['BR-116 (Dutra)', 'SP-123'], role: 'Indústria', avgDieselPrice: 5.97 },

  // SUDESTE - MG
  { city: 'Belo Horizonte', state: 'MG', stateName: 'Minas Gerais', fullLabel: 'Belo Horizonte - MG', region: 'Sudeste', lat: -19.9167, lng: -43.9345, highways: ['BR-040', 'BR-381 (Fernão Dias)'], role: 'Capital', avgDieselPrice: 6.08 },
  { city: 'Betim', state: 'MG', stateName: 'Minas Gerais', fullLabel: 'Betim (Pólo Automotivo) - MG', region: 'Sudeste', lat: -19.9678, lng: -44.1983, highways: ['BR-381', 'BR-262'], role: 'Indústria', avgDieselPrice: 6.05 },
  { city: 'Uberlândia', state: 'MG', stateName: 'Minas Gerais', fullLabel: 'Uberlândia - MG', region: 'Sudeste', lat: -18.9186, lng: -48.2772, highways: ['BR-050', 'BR-365', 'BR-452'], role: 'Logística', avgDieselPrice: 6.07 },
  { city: 'Uberaba', state: 'MG', stateName: 'Minas Gerais', fullLabel: 'Uberaba - MG', region: 'Sudeste', lat: -19.7472, lng: -47.9392, highways: ['BR-050', 'BR-262'], role: 'Agronegócio', avgDieselPrice: 6.09 },
  { city: 'Pouso Alegre', state: 'MG', stateName: 'Minas Gerais', fullLabel: 'Pouso Alegre - MG', region: 'Sudeste', lat: -22.2306, lng: -45.9353, highways: ['BR-381 (Fernão Dias)', 'BR-459'], role: 'Logística', avgDieselPrice: 6.04 },
  { city: 'Juiz de Fora', state: 'MG', stateName: 'Minas Gerais', fullLabel: 'Juiz de Fora - MG', region: 'Sudeste', lat: -21.7642, lng: -43.3496, highways: ['BR-040', 'BR-267'], role: 'Indústria', avgDieselPrice: 6.11 },
  { city: 'Montes Claros', state: 'MG', stateName: 'Minas Gerais', fullLabel: 'Montes Claros - MG', region: 'Sudeste', lat: -16.735, lng: -43.8617, highways: ['BR-135', 'BR-251'], role: 'Entroncamento', avgDieselPrice: 6.16 },
  { city: 'Governador Valadares', state: 'MG', stateName: 'Minas Gerais', fullLabel: 'Governador Valadares - MG', region: 'Sudeste', lat: -18.8511, lng: -41.9494, highways: ['BR-116 (Rio-Bahia)', 'BR-259'], role: 'Entroncamento', avgDieselPrice: 6.14 },

  // SUDESTE - RJ & ES
  { city: 'Rio de Janeiro', state: 'RJ', stateName: 'Rio de Janeiro', fullLabel: 'Rio de Janeiro - RJ', region: 'Sudeste', lat: -22.9068, lng: -43.1729, highways: ['BR-116', 'BR-101', 'BR-040'], role: 'Porto', avgDieselPrice: 6.12 },
  { city: 'Duque de Caxias', state: 'RJ', stateName: 'Rio de Janeiro', fullLabel: 'Duque de Caxias (Reduc) - RJ', region: 'Sudeste', lat: -22.7856, lng: -43.3056, highways: ['BR-040', 'BR-116 (Arco Metropolitano)'], role: 'Indústria', avgDieselPrice: 6.09 },
  { city: 'Resende', state: 'RJ', stateName: 'Rio de Janeiro', fullLabel: 'Resende - RJ', region: 'Sudeste', lat: -22.4689, lng: -44.4467, highways: ['BR-116 (Presidente Dutra)'], role: 'Indústria', avgDieselPrice: 6.10 },
  { city: 'Vitória', state: 'ES', stateName: 'Espírito Santo', fullLabel: 'Porto de Vitória - ES', region: 'Sudeste', lat: -20.3155, lng: -40.3128, highways: ['BR-101', 'BR-262'], role: 'Porto', avgDieselPrice: 6.06 },
  { city: 'Linhares', state: 'ES', stateName: 'Espírito Santo', fullLabel: 'Linhares - ES', region: 'Sudeste', lat: -19.3911, lng: -40.0722, highways: ['BR-101'], role: 'Agronegócio', avgDieselPrice: 6.08 },

  // SUL - PR
  { city: 'Paranaguá', state: 'PR', stateName: 'Paraná', fullLabel: 'Porto de Paranaguá - PR', region: 'Sul', lat: -25.5163, lng: -48.5225, highways: ['BR-277'], role: 'Porto', avgDieselPrice: 6.05 },
  { city: 'Curitiba', state: 'PR', stateName: 'Paraná', fullLabel: 'Curitiba - PR', region: 'Sul', lat: -25.4284, lng: -49.2733, highways: ['BR-277', 'BR-376', 'BR-116 (Régis Bittencourt)'], role: 'Capital', avgDieselPrice: 6.02 },
  { city: 'Cascavel', state: 'PR', stateName: 'Paraná', fullLabel: 'Cascavel - PR', region: 'Sul', lat: -24.9578, lng: -53.4595, highways: ['BR-277', 'BR-467', 'BR-369'], role: 'Agronegócio', avgDieselPrice: 6.08 },
  { city: 'Londrina', state: 'PR', stateName: 'Paraná', fullLabel: 'Londrina - PR', region: 'Sul', lat: -23.3045, lng: -51.1696, highways: ['BR-369', 'PR-445'], role: 'Agronegócio', avgDieselPrice: 6.04 },
  { city: 'Maringá', state: 'PR', stateName: 'Paraná', fullLabel: 'Maringá - PR', region: 'Sul', lat: -23.4205, lng: -51.9333, highways: ['BR-376', 'PR-317'], role: 'Agronegócio', avgDieselPrice: 6.06 },
  { city: 'Ponta Grossa', state: 'PR', stateName: 'Paraná', fullLabel: 'Ponta Grossa - PR', region: 'Sul', lat: -25.0994, lng: -50.1583, highways: ['BR-376 (Rodovia do Café)', 'BR-277'], role: 'Entroncamento', avgDieselPrice: 6.03 },
  { city: 'Foz do Iguaçu', state: 'PR', stateName: 'Paraná', fullLabel: 'Foz do Iguaçu - PR', region: 'Sul', lat: -25.5161, lng: -54.5854, highways: ['BR-277'], role: 'Entroncamento', avgDieselPrice: 6.14 },

  // SUL - SC
  { city: 'Itajaí', state: 'SC', stateName: 'Santa Catarina', fullLabel: 'Porto de Itajaí - SC', region: 'Sul', lat: -26.9078, lng: -48.6619, highways: ['BR-101', 'BR-470'], role: 'Porto', avgDieselPrice: 6.09 },
  { city: 'Chapecó', state: 'SC', stateName: 'Santa Catarina', fullLabel: 'Chapecó - SC', region: 'Sul', lat: -27.1004, lng: -52.6152, highways: ['BR-282', 'BR-480'], role: 'Agronegócio', avgDieselPrice: 6.14 },
  { city: 'Joinville', state: 'SC', stateName: 'Santa Catarina', fullLabel: 'Joinville - SC', region: 'Sul', lat: -26.3045, lng: -48.8487, highways: ['BR-101'], role: 'Indústria', avgDieselPrice: 6.05 },
  { city: 'Florianópolis', state: 'SC', stateName: 'Santa Catarina', fullLabel: 'Florianópolis - SC', region: 'Sul', lat: -27.5954, lng: -48.548, highways: ['BR-101', 'BR-282'], role: 'Capital', avgDieselPrice: 6.15 },
  { city: 'São Francisco do Sul', state: 'SC', stateName: 'Santa Catarina', fullLabel: 'Porto de São Francisco do Sul - SC', region: 'Sul', lat: -26.2436, lng: -48.6381, highways: ['BR-280'], role: 'Porto', avgDieselPrice: 6.08 },

  // SUL - RS
  { city: 'Porto Alegre', state: 'RS', stateName: 'Rio Grande do Sul', fullLabel: 'Porto Alegre - RS', region: 'Sul', lat: -30.0346, lng: -51.2177, highways: ['BR-116', 'BR-290', 'BR-386'], role: 'Capital', avgDieselPrice: 6.12 },
  { city: 'Rio Grande', state: 'RS', stateName: 'Rio Grande do Sul', fullLabel: 'Porto de Rio Grande - RS', region: 'Sul', lat: -32.035, lng: -52.0986, highways: ['BR-392'], role: 'Porto', avgDieselPrice: 6.16 },
  { city: 'Passo Fundo', state: 'RS', stateName: 'Rio Grande do Sul', fullLabel: 'Passo Fundo - RS', region: 'Sul', lat: -28.2628, lng: -52.4067, highways: ['BR-285'], role: 'Agronegócio', avgDieselPrice: 6.18 },
  { city: 'Caxias do Sul', state: 'RS', stateName: 'Rio Grande do Sul', fullLabel: 'Caxias do Sul - RS', region: 'Sul', lat: -29.1678, lng: -51.1794, highways: ['BR-116', 'RS-122'], role: 'Indústria', avgDieselPrice: 6.15 },
  { city: 'Uruguaiana', state: 'RS', stateName: 'Rio Grande do Sul', fullLabel: 'Uruguaiana (Fronteira) - RS', region: 'Sul', lat: -29.7547, lng: -57.0883, highways: ['BR-290', 'BR-472'], role: 'Entroncamento', avgDieselPrice: 6.25 },

  // NORDESTE
  { city: 'Salvador', state: 'BA', stateName: 'Bahia', fullLabel: 'Porto de Salvador - BA', region: 'Nordeste', lat: -12.9777, lng: -38.5016, highways: ['BR-324', 'BA-099'], role: 'Porto', avgDieselPrice: 6.32 },
  { city: 'Feira de Santana', state: 'BA', stateName: 'Bahia', fullLabel: 'Feira de Santana - BA', region: 'Nordeste', lat: -12.2664, lng: -38.9663, highways: ['BR-116', 'BR-324', 'BR-101'], role: 'Entroncamento', avgDieselPrice: 6.28 },
  { city: 'Vitória da Conquista', state: 'BA', stateName: 'Bahia', fullLabel: 'Vitória da Conquista - BA', region: 'Nordeste', lat: -14.8661, lng: -40.8394, highways: ['BR-116 (Rio-Bahia)'], role: 'Entroncamento', avgDieselPrice: 6.34 },
  { city: 'Luís Eduardo Magalhães', state: 'BA', stateName: 'Bahia', fullLabel: 'Luís Eduardo Magalhães - BA', region: 'Nordeste', lat: -12.0969, lng: -45.7972, highways: ['BR-020', 'BR-242'], role: 'Agronegócio', avgDieselPrice: 6.45 },
  { city: 'Barreiras', state: 'BA', stateName: 'Bahia', fullLabel: 'Barreiras - BA', region: 'Nordeste', lat: -12.1444, lng: -44.9969, highways: ['BR-242', 'BR-135'], role: 'Agronegócio', avgDieselPrice: 6.42 },
  { city: 'Recife', state: 'PE', stateName: 'Pernambuco', fullLabel: 'Recife / Suape - PE', region: 'Nordeste', lat: -8.0476, lng: -34.877, highways: ['BR-101', 'BR-232'], role: 'Porto', avgDieselPrice: 6.29 },
  { city: 'Petrolina', state: 'PE', stateName: 'Pernambuco', fullLabel: 'Petrolina - PE', region: 'Nordeste', lat: -9.3986, lng: -40.5008, highways: ['BR-407', 'BR-428'], role: 'Agronegócio', avgDieselPrice: 6.35 },
  { city: 'Fortaleza', state: 'CE', stateName: 'Ceará', fullLabel: 'Fortaleza / Pecém - CE', region: 'Nordeste', lat: -3.7172, lng: -38.5433, highways: ['BR-116', 'BR-222'], role: 'Porto', avgDieselPrice: 6.31 },
  { city: 'São Luís', state: 'MA', stateName: 'Maranhão', fullLabel: 'Porto do Itaqui (São Luís) - MA', region: 'Nordeste', lat: -2.5307, lng: -44.3068, highways: ['BR-135'], role: 'Porto', avgDieselPrice: 6.36 },
  { city: 'Imperatriz', state: 'MA', stateName: 'Maranhão', fullLabel: 'Imperatriz - MA', region: 'Nordeste', lat: -5.5264, lng: -47.4775, highways: ['BR-010 (Belém-Brasília)'], role: 'Entroncamento', avgDieselPrice: 6.39 },
  { city: 'Balsas', state: 'MA', stateName: 'Maranhão', fullLabel: 'Balsas - MA', region: 'Nordeste', lat: -7.5322, lng: -46.0356, highways: ['BR-230 (Transamazônica)'], role: 'Agronegócio', avgDieselPrice: 6.48 },
  { city: 'Teresina', state: 'PI', stateName: 'Piauí', fullLabel: 'Teresina - PI', region: 'Nordeste', lat: -5.092, lng: -42.8038, highways: ['BR-343', 'BR-316'], role: 'Capital', avgDieselPrice: 6.34 },
  { city: 'Maceió', state: 'AL', stateName: 'Alagoas', fullLabel: 'Maceió - AL', region: 'Nordeste', lat: -9.6658, lng: -35.735, highways: ['BR-101', 'AL-101'], role: 'Porto', avgDieselPrice: 6.27 },
  { city: 'Aracaju', state: 'SE', stateName: 'Sergipe', fullLabel: 'Aracaju - SE', region: 'Nordeste', lat: -10.9472, lng: -37.0731, highways: ['BR-101'], role: 'Capital', avgDieselPrice: 6.26 },
  { city: 'Natal', state: 'RN', stateName: 'Rio Grande do Norte', fullLabel: 'Natal - RN', region: 'Nordeste', lat: -5.7945, lng: -35.211, highways: ['BR-101', 'BR-304'], role: 'Capital', avgDieselPrice: 6.30 },
  { city: 'João Pessoa', state: 'PB', stateName: 'Paraíba', fullLabel: 'João Pessoa (Cabedelo) - PB', region: 'Nordeste', lat: -7.1195, lng: -34.845, highways: ['BR-101', 'BR-230'], role: 'Porto', avgDieselPrice: 6.28 },

  // NORTE
  { city: 'Belém', state: 'PA', stateName: 'Pará', fullLabel: 'Belém / Barcarena - PA', region: 'Norte', lat: -1.4558, lng: -48.4902, highways: ['BR-316', 'PA-150'], role: 'Porto', avgDieselPrice: 6.42 },
  { city: 'Marabá', state: 'PA', stateName: 'Pará', fullLabel: 'Marabá - PA', region: 'Norte', lat: -5.3686, lng: -49.1178, highways: ['BR-155', 'BR-230'], role: 'Indústria', avgDieselPrice: 6.46 },
  { city: 'Paragominas', state: 'PA', stateName: 'Pará', fullLabel: 'Paragominas - PA', region: 'Norte', lat: -2.9961, lng: -47.3528, highways: ['BR-010'], role: 'Agronegócio', avgDieselPrice: 6.44 },
  { city: 'Porto Velho', state: 'RO', stateName: 'Rondônia', fullLabel: 'Porto Velho - RO', region: 'Norte', lat: -8.7619, lng: -63.9039, highways: ['BR-364', 'BR-319'], role: 'Porto', avgDieselPrice: 6.49 },
  { city: 'Vilhena', state: 'RO', stateName: 'Rondônia', fullLabel: 'Vilhena - RO', region: 'Norte', lat: -12.7406, lng: -60.1458, highways: ['BR-364'], role: 'Agronegócio', avgDieselPrice: 6.45 },
  { city: 'Ji-Paraná', state: 'RO', stateName: 'Rondônia', fullLabel: 'Ji-Paraná - RO', region: 'Norte', lat: -10.8828, lng: -61.9519, highways: ['BR-364'], role: 'Agronegócio', avgDieselPrice: 6.47 },
  { city: 'Palmas', state: 'TO', stateName: 'Tocantins', fullLabel: 'Palmas - TO', region: 'Norte', lat: -10.1844, lng: -48.3336, highways: ['TO-050', 'BR-010'], role: 'Capital', avgDieselPrice: 6.32 },
  { city: 'Araguaína', state: 'TO', stateName: 'Tocantins', fullLabel: 'Araguaína - TO', region: 'Norte', lat: -7.1925, lng: -48.2078, highways: ['BR-153 (Belém-Brasília)'], role: 'Entroncamento', avgDieselPrice: 6.35 },
  { city: 'Gurupi', state: 'TO', stateName: 'Tocantins', fullLabel: 'Gurupi - TO', region: 'Norte', lat: -11.7297, lng: -49.0686, highways: ['BR-153'], role: 'Agronegócio', avgDieselPrice: 6.33 },
  { city: 'Manaus', state: 'AM', stateName: 'Amazonas', fullLabel: 'Manaus (Polo Industrial) - AM', region: 'Norte', lat: -3.119, lng: -60.0217, highways: ['BR-174', 'BR-319'], role: 'Porto', avgDieselPrice: 6.55 },
  { city: 'Macapá', state: 'AP', stateName: 'Amapá', fullLabel: 'Macapá (Santana) - AP', region: 'Norte', lat: 0.0389, lng: -51.0664, highways: ['BR-156', 'BR-210'], role: 'Porto', avgDieselPrice: 6.52 },
  { city: 'Boa Vista', state: 'RR', stateName: 'Roraima', fullLabel: 'Boa Vista - RR', region: 'Norte', lat: 2.8235, lng: -60.6758, highways: ['BR-174'], role: 'Capital', avgDieselPrice: 6.58 },
  { city: 'Rio Branco', state: 'AC', stateName: 'Acre', fullLabel: 'Rio Branco - AC', region: 'Norte', lat: -9.9747, lng: -67.8243, highways: ['BR-364'], role: 'Capital', avgDieselPrice: 6.62 },
];

/**
 * Searches Brazilian cities by city name, state (UF, e.g. "MT"), stateName (e.g. "Mato Grosso") or highway
 */
export const searchBrazilianCities = (rawQuery: string, limit = 8): BrazilCity[] => {
  if (!rawQuery || !rawQuery.trim()) return [];
  const q = rawQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return ALL_BRAZILIAN_CITIES.filter((item) => {
    const normCity = item.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normState = item.state.toLowerCase();
    const normStateName = item.stateName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normFull = item.fullLabel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return (
      normCity.includes(q) ||
      normState === q ||
      normState.startsWith(q) ||
      normStateName.includes(q) ||
      normFull.includes(q) ||
      item.highways.some((h) => h.toLowerCase().includes(q))
    );
  }).slice(0, limit);
};

export interface CalculatedRouteResult {
  origin: string;
  destination: string;
  tripType: TripType;
  oneWayDistanceKm: number;
  totalDistanceKm: number;
  oneWayTollCount: number;
  totalTollCount: number;
  oneWayTollCost: number;
  totalTollCost: number;
  highways: string;
  drivingHours: number;
  estimatedDieselLiters: number;
  estimatedDieselCost: number;
  avgDieselPricePerL: number;
}

/**
 * Corridor database with exact highway kilometerage and toll matrices
 */
const CORRIDORS: Record<string, { distanceKm: number; tollCount: number; tollPerAxle: number; highways: string }> = {
  'rondonopolis-santos': { distanceKm: 1480, tollCount: 14, tollPerAxle: 11.2, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-348 ➔ SP-160' },
  'sorriso-santos': { distanceKm: 1880, tollCount: 18, tollPerAxle: 11.5, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160' },
  'sinop-santos': { distanceKm: 1960, tollCount: 19, tollPerAxle: 11.5, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160' },
  'lucas do rio verde-santos': { distanceKm: 1810, tollCount: 17, tollPerAxle: 11.4, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160' },
  'cuiaba-santos': { distanceKm: 1610, tollCount: 15, tollPerAxle: 11.2, highways: 'BR-364 ➔ BR-163 ➔ SP-310 ➔ SP-160' },
  'rio verde-santos': { distanceKm: 980, tollCount: 10, tollPerAxle: 10.8, highways: 'BR-060 ➔ BR-153 ➔ SP-310 ➔ SP-160' },
  'jatai-santos': { distanceKm: 1070, tollCount: 11, tollPerAxle: 10.9, highways: 'BR-364 ➔ BR-060 ➔ SP-310 ➔ SP-160' },
  'campo grande-santos': { distanceKm: 1010, tollCount: 10, tollPerAxle: 10.6, highways: 'BR-262 ➔ SP-300 (Marechal Rondon) ➔ SP-160' },
  'dourados-paranagua': { distanceKm: 890, tollCount: 8, tollPerAxle: 9.8, highways: 'BR-163 ➔ BR-277 ➔ Porto de Paranaguá' },
  'cascavel-paranagua': { distanceKm: 680, tollCount: 7, tollPerAxle: 9.8, highways: 'BR-277 ➔ Rodovia do Café ➔ BR-277' },
  'curitiba-paranagua': { distanceKm: 95, tollCount: 1, tollPerAxle: 14.5, highways: 'BR-277 (Descida da Serra do Mar)' },
  'londrina-santos': { distanceKm: 610, tollCount: 7, tollPerAxle: 10.4, highways: 'BR-369 ➔ SP-225 ➔ SP-280 (Castello Branco) ➔ SP-160' },
  'maringa-paranagua': { distanceKm: 540, tollCount: 6, tollPerAxle: 10.2, highways: 'BR-376 ➔ BR-277' },
  'chapeco-itajaí': { distanceKm: 540, tollCount: 5, tollPerAxle: 9.2, highways: 'BR-282 ➔ BR-470 ➔ BR-101' },
  'chapeco-santos': { distanceKm: 980, tollCount: 11, tollPerAxle: 10.2, highways: 'BR-282 ➔ BR-116 ➔ SP-280 ➔ SP-160' },
  'passo fundo-rio grande': { distanceKm: 560, tollCount: 6, tollPerAxle: 10.5, highways: 'BR-285 ➔ BR-392 ➔ Porto de Rio Grande' },
  'porto alegre-rio grande': { distanceKm: 320, tollCount: 3, tollPerAxle: 11.0, highways: 'BR-116 ➔ BR-392' },
  'uberlandia-santos': { distanceKm: 690, tollCount: 8, tollPerAxle: 11.0, highways: 'BR-050 ➔ SP-330 (Anhanguera) ➔ SP-160' },
  'betim-salvador': { distanceKm: 1340, tollCount: 9, tollPerAxle: 8.5, highways: 'BR-381 ➔ BR-116 (Rio-Bahia) ➔ BR-324' },
  'luis eduardo magalhaes-salvador': { distanceKm: 940, tollCount: 4, tollPerAxle: 7.8, highways: 'BR-242 ➔ BR-116 ➔ BR-324' },
  'barreiras-salvador': { distanceKm: 860, tollCount: 4, tollPerAxle: 7.8, highways: 'BR-242 ➔ BR-116 ➔ BR-324' },
  'sao paulo-rio de janeiro': { distanceKm: 435, tollCount: 6, tollPerAxle: 12.8, highways: 'BR-116 (Rodovia Presidente Dutra)' },
  'sao paulo-curitiba': { distanceKm: 408, tollCount: 6, tollPerAxle: 10.5, highways: 'BR-116 (Rodovia Régis Bittencourt)' },
  'sao paulo-belo horizonte': { distanceKm: 585, tollCount: 8, tollPerAxle: 9.8, highways: 'BR-381 (Rodovia Fernão Dias)' },
  'brasilia-santos': { distanceKm: 1080, tollCount: 11, tollPerAxle: 10.8, highways: 'BR-040 ➔ BR-050 ➔ SP-330 (Anhanguera) ➔ SP-160' },
};

import { calculatePreciseRoadDistance } from '../utils/brazilDistanceEngine';

/**
 * Calculates road metrics with automatic round-trip (ida e volta) or one-way (somente ida) logic
 * using precision Brazilian highway corridors and geodesic sinuosity algorithm.
 */
export const calculateAdvancedRoute = (
  originText: string,
  destText: string,
  axles: VehicleAxles = 6,
  tripType: TripType = 'somente_ida'
): CalculatedRouteResult => {
  return calculatePreciseRoadDistance(originText, destText, axles, tripType);
};
