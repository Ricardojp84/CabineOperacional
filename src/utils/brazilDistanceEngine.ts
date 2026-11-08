import { VehicleAxles } from '../types/cockpit';

export type TripType = 'somente_ida' | 'ida_e_volta';

export interface RouteCalculationOutput {
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
  isExactCorridor: boolean;
}

// -------------------------------------------------------------
// 1. EXTENSIVE BRAZILIAN CITIES COORDINATES DATABASE
// -------------------------------------------------------------
interface CityCoord {
  city: string;
  state: string; // UF
  lat: number;
  lng: number;
  highways?: string[];
  tollDensity?: number; // toll plazas per 100km
}

export const BRAZIL_COORDINATES_MAP: Record<string, CityCoord> = {
  // SÃO PAULO
  'santos-sp': { city: 'Santos', state: 'SP', lat: -23.9618, lng: -46.3322, highways: ['SP-160', 'SP-150'] },
  'sao paulo-sp': { city: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333, highways: ['SP-021', 'BR-116', 'SP-330', 'SP-348'] },
  'guarulhos-sp': { city: 'Guarulhos', state: 'SP', lat: -23.4542, lng: -46.5333, highways: ['BR-116', 'SP-070'] },
  'campinas-sp': { city: 'Campinas', state: 'SP', lat: -22.9099, lng: -47.0626, highways: ['SP-330', 'SP-348', 'SP-065'] },
  'sao bernardo do campo-sp': { city: 'São Bernardo do Campo', state: 'SP', lat: -23.6939, lng: -46.565, highways: ['SP-150', 'SP-021'] },
  'santo andre-sp': { city: 'Santo André', state: 'SP', lat: -23.6639, lng: -46.5383, highways: ['SP-021'] },
  'osasco-sp': { city: 'Osasco', state: 'SP', lat: -23.5325, lng: -46.7917, highways: ['SP-280', 'SP-021'] },
  'sorocaba-sp': { city: 'Sorocaba', state: 'SP', lat: -23.5015, lng: -47.4526, highways: ['SP-280', 'SP-075'] },
  'ribeirao preto-sp': { city: 'Ribeirão Preto', state: 'SP', lat: -21.1767, lng: -47.8208, highways: ['SP-330', 'SP-322'] },
  'sao jose dos campos-sp': { city: 'São José dos Campos', state: 'SP', lat: -23.1896, lng: -45.8841, highways: ['BR-116', 'SP-070'] },
  'sao jose do rio preto-sp': { city: 'São José do Rio Preto', state: 'SP', lat: -20.8113, lng: -49.3758, highways: ['SP-310', 'BR-153'] },
  'bauru-sp': { city: 'Bauru', state: 'SP', lat: -22.3147, lng: -49.0606, highways: ['SP-300', 'SP-225'] },
  'piracicaba-sp': { city: 'Piracicaba', state: 'SP', lat: -22.7253, lng: -47.6492, highways: ['SP-304', 'SP-147'] },
  'jundiai-sp': { city: 'Jundiaí', state: 'SP', lat: -23.1857, lng: -46.8978, highways: ['SP-330', 'SP-348'] },
  'franca-sp': { city: 'Franca', state: 'SP', lat: -20.5386, lng: -47.4008, highways: ['SP-334'] },
  'taubate-sp': { city: 'Taubaté', state: 'SP', lat: -23.0344, lng: -45.5619, highways: ['BR-116', 'SP-123'] },
  'limeira-sp': { city: 'Limeira', state: 'SP', lat: -22.5647, lng: -47.4017, highways: ['SP-330', 'SP-147'] },
  'praia grande-sp': { city: 'Praia Grande', state: 'SP', lat: -24.0058, lng: -46.4028, highways: ['SP-160'] },
  'paulinia-sp': { city: 'Paulínia', state: 'SP', lat: -22.7611, lng: -47.1539, highways: ['SP-332', 'SP-065'] },
  'presidente prudente-sp': { city: 'Presidente Prudente', state: 'SP', lat: -22.1256, lng: -51.3889, highways: ['SP-270'] },
  'marilia-sp': { city: 'Marília', state: 'SP', lat: -22.2139, lng: -49.9458, highways: ['SP-294', 'SP-333'] },
  'araraquara-sp': { city: 'Araraquara', state: 'SP', lat: -21.7944, lng: -48.1758, highways: ['SP-310'] },
  'sao carlos-sp': { city: 'São Carlos', state: 'SP', lat: -22.0175, lng: -47.8908, highways: ['SP-310'] },
  'americana-sp': { city: 'Americana', state: 'SP', lat: -22.7375, lng: -47.3331, highways: ['SP-330', 'SP-304'] },
  'hortolandia-sp': { city: 'Hortolândia', state: 'SP', lat: -22.8583, lng: -47.22, highways: ['SP-101'] },
  'rio claro-sp': { city: 'Rio Claro', state: 'SP', lat: -22.4114, lng: -47.5614, highways: ['SP-310'] },
  'aracatuba-sp': { city: 'Araçatuba', state: 'SP', lat: -21.2089, lng: -50.4328, highways: ['SP-300'] },
  'santa barbara d oeste-sp': { city: "Santa Bárbara d'Oeste", state: 'SP', lat: -22.7539, lng: -47.4142, highways: ['SP-304'] },
  'braganca paulista-sp': { city: 'Bragança Paulista', state: 'SP', lat: -22.9525, lng: -46.5419, highways: ['BR-381'] },
  'itapetininga-sp': { city: 'Itapetininga', state: 'SP', lat: -23.5894, lng: -48.0531, highways: ['SP-127', 'SP-270'] },
  'barretos-sp': { city: 'Barretos', state: 'SP', lat: -20.5572, lng: -48.5678, highways: ['SP-326'] },
  'bebedouro-sp': { city: 'Bebedouro', state: 'SP', lat: -20.9497, lng: -48.4794, highways: ['SP-326'] },
  'catanduva-sp': { city: 'Catanduva', state: 'SP', lat: -21.1378, lng: -48.9739, highways: ['SP-310'] },
  'ourinhos-sp': { city: 'Ourinhos', state: 'SP', lat: -22.9789, lng: -49.8706, highways: ['SP-270', 'BR-153'] },
  'assis-sp': { city: 'Assis', state: 'SP', lat: -22.6617, lng: -50.4189, highways: ['SP-270', 'SP-333'] },
  'botucatu-sp': { city: 'Botucatu', state: 'SP', lat: -22.8858, lng: -48.445, highways: ['SP-300', 'SP-209'] },
  'jau-sp': { city: 'Jaú', state: 'SP', lat: -22.2964, lng: -48.5586, highways: ['SP-225'] },
  'araras-sp': { city: 'Araras', state: 'SP', lat: -22.3572, lng: -47.3842, highways: ['SP-330'] },
  'mogi guacu-sp': { city: 'Mogi Guaçu', state: 'SP', lat: -22.3708, lng: -46.9428, highways: ['SP-340'] },
  'atibaia-sp': { city: 'Atibaia', state: 'SP', lat: -23.1172, lng: -46.5503, highways: ['BR-381', 'SP-065'] },
  'pindamonhangaba-sp': { city: 'Pindamonhangaba', state: 'SP', lat: -22.9242, lng: -45.4617, highways: ['BR-116'] },
  'valinhos-sp': { city: 'Valinhos', state: 'SP', lat: -22.9708, lng: -46.9961, highways: ['SP-330'] },
  'sertaozinho-sp': { city: 'Sertãozinho', state: 'SP', lat: -21.1375, lng: -47.9903, highways: ['SP-322'] },
  'birigui-sp': { city: 'Birigui', state: 'SP', lat: -21.2886, lng: -50.34, highways: ['SP-300'] },
  'votuporanga-sp': { city: 'Votuporanga', state: 'SP', lat: -20.4228, lng: -49.9728, highways: ['SP-310'] },

  // MATO GROSSO
  'rondonopolis-mt': { city: 'Rondonópolis', state: 'MT', lat: -16.4674, lng: -54.6361, highways: ['BR-163', 'BR-364'] },
  'cuiaba-mt': { city: 'Cuiabá', state: 'MT', lat: -15.6014, lng: -56.0979, highways: ['BR-163', 'BR-364', 'BR-070'] },
  'varzea grande-mt': { city: 'Várzea Grande', state: 'MT', lat: -15.6469, lng: -56.1325, highways: ['BR-070', 'BR-364'] },
  'sorriso-mt': { city: 'Sorriso', state: 'MT', lat: -12.5441, lng: -55.7231, highways: ['BR-163', 'MT-242'] },
  'sinop-mt': { city: 'Sinop', state: 'MT', lat: -11.8608, lng: -55.5095, highways: ['BR-163'] },
  'lucas do rio verde-mt': { city: 'Lucas do Rio Verde', state: 'MT', lat: -13.0531, lng: -55.9125, highways: ['BR-163'] },
  'nova mutum-mt': { city: 'Nova Mutum', state: 'MT', lat: -13.8344, lng: -56.0792, highways: ['BR-163'] },
  'primavera do leste-mt': { city: 'Primavera do Leste', state: 'MT', lat: -15.5583, lng: -54.2986, highways: ['BR-070'] },
  'campo novo do parecis-mt': { city: 'Campo Novo do Parecis', state: 'MT', lat: -13.6744, lng: -57.8869, highways: ['BR-364', 'MT-235'] },
  'barra do garcas-mt': { city: 'Barra do Garças', state: 'MT', lat: -15.8931, lng: -52.2569, highways: ['BR-070', 'BR-158'] },
  'tangara da serra-mt': { city: 'Tangará da Serra', state: 'MT', lat: -14.6228, lng: -57.4914, highways: ['MT-358'] },
  'caceres-mt': { city: 'Cáceres', state: 'MT', lat: -16.0758, lng: -57.6789, highways: ['BR-070'] },
  'pontes e lacerda-mt': { city: 'Pontes e Lacerda', state: 'MT', lat: -15.2261, lng: -59.3353, highways: ['BR-174'] },
  'juina-mt': { city: 'Juína', state: 'MT', lat: -11.3783, lng: -58.7428, highways: ['MT-170'] },
  'confresa-mt': { city: 'Confresa', state: 'MT', lat: -10.6439, lng: -51.5694, highways: ['BR-158'] },
  'sapezal-mt': { city: 'Sapezal', state: 'MT', lat: -13.5422, lng: -58.8142, highways: ['MT-235'] },
  'diamantino-mt': { city: 'Diamantino', state: 'MT', lat: -14.4086, lng: -56.4461, highways: ['MT-240'] },

  // GOIÁS & DISTRITO FEDERAL
  'goiania-go': { city: 'Goiânia', state: 'GO', lat: -16.6869, lng: -49.2648, highways: ['BR-153', 'BR-060'] },
  'aparecida de goiania-go': { city: 'Aparecida de Goiânia', state: 'GO', lat: -16.8228, lng: -49.2458, highways: ['BR-153'] },
  'anapolis-go': { city: 'Anápolis', state: 'GO', lat: -16.3267, lng: -48.9533, highways: ['BR-153', 'BR-060'] },
  'rio verde-go': { city: 'Rio Verde', state: 'GO', lat: -17.7925, lng: -50.9192, highways: ['BR-060', 'BR-452'] },
  'jatai-go': { city: 'Jataí', state: 'GO', lat: -17.8814, lng: -51.7144, highways: ['BR-364', 'BR-158'] },
  'itumbiara-go': { city: 'Itumbiara', state: 'GO', lat: -18.4194, lng: -49.2172, highways: ['BR-153'] },
  'catalao-go': { city: 'Catalão', state: 'GO', lat: -18.1658, lng: -47.9464, highways: ['BR-050'] },
  'cristalina-go': { city: 'Cristalina', state: 'GO', lat: -16.7686, lng: -47.6139, highways: ['BR-040', 'BR-050'] },
  'caldas novas-go': { city: 'Caldas Novas', state: 'GO', lat: -17.7444, lng: -48.6258, highways: ['GO-213'] },
  'luziania-go': { city: 'Luziânia', state: 'GO', lat: -16.2525, lng: -47.95, highways: ['BR-040'] },
  'formosa-go': { city: 'Formosa', state: 'GO', lat: -15.5392, lng: -47.3364, highways: ['BR-020'] },
  'porangatu-go': { city: 'Porangatu', state: 'GO', lat: -13.4408, lng: -49.1486, highways: ['BR-153'] },
  'uruacu-go': { city: 'Uruaçu', state: 'GO', lat: -14.5247, lng: -49.1408, highways: ['BR-153'] },
  'brasilia-df': { city: 'Brasília', state: 'DF', lat: -15.7975, lng: -47.8919, highways: ['BR-040', 'BR-060', 'BR-020'] },
  'taguatinga-df': { city: 'Taguatinga', state: 'DF', lat: -15.8331, lng: -48.0567, highways: ['BR-070'] },

  // MATO GROSSO DO SUL
  'campo grande-ms': { city: 'Campo Grande', state: 'MS', lat: -20.4697, lng: -54.6201, highways: ['BR-163', 'BR-262'] },
  'dourados-ms': { city: 'Dourados', state: 'MS', lat: -22.2231, lng: -54.8125, highways: ['BR-163', 'MS-156'] },
  'tres lagoas-ms': { city: 'Três Lagoas', state: 'MS', lat: -20.7849, lng: -51.7042, highways: ['BR-262', 'BR-158'] },
  'corumba-ms': { city: 'Corumbá', state: 'MS', lat: -19.0097, lng: -57.6533, highways: ['BR-262'] },
  'ponta pora-ms': { city: 'Ponta Porã', state: 'MS', lat: -22.5361, lng: -55.7256, highways: ['BR-463'] },
  'maracaju-ms': { city: 'Maracaju', state: 'MS', lat: -21.6144, lng: -55.1683, highways: ['MS-162', 'BR-267'] },
  'chapadao do sul-ms': { city: 'Chapadão do Sul', state: 'MS', lat: -18.7933, lng: -52.6222, highways: ['BR-060'] },
  'navirai-ms': { city: 'Naviraí', state: 'MS', lat: -23.065, lng: -54.1906, highways: ['BR-163'] },
  'nova andradina-ms': { city: 'Nova Andradina', state: 'MS', lat: -22.2331, lng: -53.3436, highways: ['BR-376'] },
  'sao gabriel do oeste-ms': { city: 'São Gabriel do Oeste', state: 'MS', lat: -19.3922, lng: -54.5808, highways: ['BR-163'] },

  // MINAS GERAIS
  'belo horizonte-mg': { city: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345, highways: ['BR-040', 'BR-381'] },
  'betim-mg': { city: 'Betim', state: 'MG', lat: -19.9678, lng: -44.1983, highways: ['BR-381', 'BR-262'] },
  'contagem-mg': { city: 'Contagem', state: 'MG', lat: -19.9317, lng: -44.0536, highways: ['BR-381', 'BR-040'] },
  'uberlandia-mg': { city: 'Uberlândia', state: 'MG', lat: -18.9186, lng: -48.2772, highways: ['BR-050', 'BR-365', 'BR-452'] },
  'uberaba-mg': { city: 'Uberaba', state: 'MG', lat: -19.7472, lng: -47.9392, highways: ['BR-050', 'BR-262'] },
  'juiz de fora-mg': { city: 'Juiz de Fora', state: 'MG', lat: -21.7642, lng: -43.3496, highways: ['BR-040', 'BR-267'] },
  'montes claros-mg': { city: 'Montes Claros', state: 'MG', lat: -16.735, lng: -43.8617, highways: ['BR-135', 'BR-251'] },
  'governador valadares-mg': { city: 'Governador Valadares', state: 'MG', lat: -18.8511, lng: -41.9494, highways: ['BR-116', 'BR-259'] },
  'ipatinga-mg': { city: 'Ipatinga', state: 'MG', lat: -19.4683, lng: -42.5367, highways: ['BR-381', 'BR-458'] },
  'pouso alegre-mg': { city: 'Pouso Alegre', state: 'MG', lat: -22.2306, lng: -45.9353, highways: ['BR-381', 'BR-459'] },
  'divinopolis-mg': { city: 'Divinópolis', state: 'MG', lat: -20.1439, lng: -44.8872, highways: ['MG-050'] },
  'sete lagoas-mg': { city: 'Sete Lagoas', state: 'MG', lat: -19.4597, lng: -44.2469, highways: ['BR-040'] },
  'pocos de caldas-mg': { city: 'Poços de Caldas', state: 'MG', lat: -21.785, lng: -46.5622, highways: ['BR-146', 'BR-267'] },
  'patos de minas-mg': { city: 'Patos de Minas', state: 'MG', lat: -18.5789, lng: -46.5181, highways: ['BR-365'] },
  'varginha-mg': { city: 'Varginha', state: 'MG', lat: -21.5517, lng: -45.4303, highways: ['BR-491'] },
  'araguari-mg': { city: 'Araguari', state: 'MG', lat: -18.6483, lng: -48.1872, highways: ['BR-050'] },
  'passos-mg': { city: 'Passos', state: 'MG', lat: -20.7189, lng: -46.6097, highways: ['MG-050'] },
  'lavras-mg': { city: 'Lavras', state: 'MG', lat: -21.2464, lng: -44.9997, highways: ['BR-381'] },
  'conselheiro lafaiete-mg': { city: 'Conselheiro Lafaiete', state: 'MG', lat: -20.6606, lng: -43.7858, highways: ['BR-040'] },
  'ituiutaba-mg': { city: 'Ituiutaba', state: 'MG', lat: -18.9697, lng: -49.4647, highways: ['BR-365'] },

  // PARANÁ
  'curitiba-pr': { city: 'Curitiba', state: 'PR', lat: -25.4284, lng: -49.2733, highways: ['BR-277', 'BR-376', 'BR-116'] },
  'paranagua-pr': { city: 'Paranaguá', state: 'PR', lat: -25.5163, lng: -48.5225, highways: ['BR-277'] },
  'londrina-pr': { city: 'Londrina', state: 'PR', lat: -23.3045, lng: -51.1696, highways: ['BR-369', 'PR-445'] },
  'maringa-pr': { city: 'Maringá', state: 'PR', lat: -23.4205, lng: -51.9333, highways: ['BR-376', 'PR-317'] },
  'ponta grossa-pr': { city: 'Ponta Grossa', state: 'PR', lat: -25.0994, lng: -50.1583, highways: ['BR-376', 'BR-277'] },
  'cascavel-pr': { city: 'Cascavel', state: 'PR', lat: -24.9578, lng: -53.4595, highways: ['BR-277', 'BR-467', 'BR-369'] },
  'foz do iguacu-pr': { city: 'Foz do Iguaçu', state: 'PR', lat: -25.5161, lng: -54.5854, highways: ['BR-277'] },
  'sao jose dos pinhais-pr': { city: 'São José dos Pinhais', state: 'PR', lat: -25.5347, lng: -49.2064, highways: ['BR-376', 'BR-277'] },
  'toledo-pr': { city: 'Toledo', state: 'PR', lat: -24.7139, lng: -53.7431, highways: ['BR-467', 'PR-182'] },
  'guarapuava-pr': { city: 'Guarapuava', state: 'PR', lat: -25.3953, lng: -51.4625, highways: ['BR-277'] },
  'apucarana-pr': { city: 'Apucarana', state: 'PR', lat: -23.5517, lng: -51.4614, highways: ['BR-369', 'BR-376'] },
  'arapongas-pr': { city: 'Arapongas', state: 'PR', lat: -23.4158, lng: -51.4244, highways: ['BR-369'] },
  'campo mourao-pr': { city: 'Campo Mourão', state: 'PR', lat: -24.0458, lng: -52.3808, highways: ['BR-158', 'BR-369', 'BR-487'] },
  'paranavai-pr': { city: 'Paranavaí', state: 'PR', lat: -23.0825, lng: -52.4647, highways: ['BR-376'] },
  'pato branco-pr': { city: 'Pato Branco', state: 'PR', lat: -26.2289, lng: -52.6711, highways: ['BR-158', 'PR-280'] },
  'francisco beltrao-pr': { city: 'Francisco Beltrão', state: 'PR', lat: -26.0811, lng: -53.055, highways: ['PR-483', 'PR-180'] },
  'castro-pr': { city: 'Castro', state: 'PR', lat: -24.7911, lng: -50.0119, highways: ['PR-151'] },
  'telemaco borba-pr': { city: 'Telêmaco Borba', state: 'PR', lat: -24.3239, lng: -50.6158, highways: ['PR-160'] },

  // SANTA CATARINA
  'itajai-sc': { city: 'Itajaí', state: 'SC', lat: -26.9078, lng: -48.6619, highways: ['BR-101', 'BR-470'] },
  'joinville-sc': { city: 'Joinville', state: 'SC', lat: -26.3045, lng: -48.8487, highways: ['BR-101'] },
  'florianopolis-sc': { city: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.548, highways: ['BR-101', 'BR-282'] },
  'blumenau-sc': { city: 'Blumenau', state: 'SC', lat: -26.9194, lng: -49.0661, highways: ['BR-470'] },
  'chapeco-sc': { city: 'Chapecó', state: 'SC', lat: -27.1004, lng: -52.6152, highways: ['BR-282', 'BR-480'] },
  'criciuma-sc': { city: 'Criciúma', state: 'SC', lat: -28.6775, lng: -49.3703, highways: ['BR-101'] },
  'jaragua do sul-sc': { city: 'Jaraguá do Sul', state: 'SC', lat: -26.4853, lng: -49.0722, highways: ['BR-280'] },
  'lages-sc': { city: 'Lages', state: 'SC', lat: -27.8158, lng: -50.3261, highways: ['BR-116', 'BR-282'] },
  'brusque-sc': { city: 'Brusque', state: 'SC', lat: -27.0983, lng: -48.9167, highways: ['SC-486'] },
  'tubarao-sc': { city: 'Tubarão', state: 'SC', lat: -28.4739, lng: -49.0069, highways: ['BR-101'] },
  'concordia-sc': { city: 'Concórdia', state: 'SC', lat: -27.2339, lng: -52.0231, highways: ['BR-153'] },
  'sao francisco do sul-sc': { city: 'São Francisco do Sul', state: 'SC', lat: -26.2436, lng: -48.6381, highways: ['BR-280'] },
  'navegantes-sc': { city: 'Navegantes', state: 'SC', lat: -26.8986, lng: -48.6542, highways: ['BR-470', 'BR-101'] },
  'cacador-sc': { city: 'Caçador', state: 'SC', lat: -26.7753, lng: -51.0125, highways: ['SC-350'] },
  'videira-sc': { city: 'Videira', state: 'SC', lat: -27.0083, lng: -51.1528, highways: ['SC-355'] },

  // RIO GRANDE DO SUL
  'porto alegre-rs': { city: 'Porto Alegre', state: 'RS', lat: -30.0346, lng: -51.2177, highways: ['BR-116', 'BR-290', 'BR-386'] },
  'rio grande-rs': { city: 'Rio Grande', state: 'RS', lat: -32.035, lng: -52.0986, highways: ['BR-392'] },
  'caxias do sul-rs': { city: 'Caxias do Sul', state: 'RS', lat: -29.1678, lng: -51.1794, highways: ['BR-116', 'RS-122'] },
  'pelotas-rs': { city: 'Pelotas', state: 'RS', lat: -31.7654, lng: -52.3376, highways: ['BR-116', 'BR-392'] },
  'passo fundo-rs': { city: 'Passo Fundo', state: 'RS', lat: -28.2628, lng: -52.4067, highways: ['BR-285'] },
  'santa maria-rs': { city: 'Santa Maria', state: 'RS', lat: -29.6842, lng: -53.8069, highways: ['BR-158', 'BR-287'] },
  'uruguaiana-rs': { city: 'Uruguaiana', state: 'RS', lat: -29.7547, lng: -57.0883, highways: ['BR-290', 'BR-472'] },
  'bento goncalves-rs': { city: 'Bento Gonçalves', state: 'RS', lat: -29.1697, lng: -51.5186, highways: ['RS-453', 'BR-470'] },
  'erechim-rs': { city: 'Erechim', state: 'RS', lat: -27.6342, lng: -52.2736, highways: ['BR-153'] },
  'ijui-rs': { city: 'Ijuí', state: 'RS', lat: -28.3878, lng: -53.9147, highways: ['BR-285'] },
  'santa cruz do sul-rs': { city: 'Santa Cruz do Sul', state: 'RS', lat: -29.7153, lng: -52.4286, highways: ['BR-471', 'RSC-287'] },
  'bage-rs': { city: 'Bagé', state: 'RS', lat: -31.3283, lng: -54.1069, highways: ['BR-153', 'BR-293'] },
  'santana do livramento-rs': { city: 'Santana do Livramento', state: 'RS', lat: -30.8908, lng: -55.5328, highways: ['BR-158', 'BR-293'] },

  // RIO DE JANEIRO & ESPÍRITO SANTO
  'rio de janeiro-rj': { city: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729, highways: ['BR-116', 'BR-101', 'BR-040'] },
  'duque de caxias-rj': { city: 'Duque de Caxias', state: 'RJ', lat: -22.7856, lng: -43.3056, highways: ['BR-040', 'BR-116'] },
  'niteroi-rj': { city: 'Niterói', state: 'RJ', lat: -22.8858, lng: -43.1153, highways: ['BR-101'] },
  'volta redonda-rj': { city: 'Volta Redonda', state: 'RJ', lat: -22.5231, lng: -44.1042, highways: ['BR-393', 'BR-116'] },
  'resende-rj': { city: 'Resende', state: 'RJ', lat: -22.4689, lng: -44.4467, highways: ['BR-116'] },
  'campos dos goytacazes-rj': { city: 'Campos dos Goytacazes', state: 'RJ', lat: -21.7539, lng: -41.3239, highways: ['BR-101'] },
  'macae-rj': { city: 'Macaé', state: 'RJ', lat: -22.3708, lng: -41.7869, highways: ['BR-101'] },
  'petropolis-rj': { city: 'Petrópolis', state: 'RJ', lat: -22.505, lng: -43.1789, highways: ['BR-040'] },
  'vitoria-es': { city: 'Vitória', state: 'ES', lat: -20.3155, lng: -40.3128, highways: ['BR-101', 'BR-262'] },
  'vila velha-es': { city: 'Vila Velha', state: 'ES', lat: -20.3297, lng: -40.2925, highways: ['BR-101'] },
  'serra-es': { city: 'Serra', state: 'ES', lat: -20.1286, lng: -40.3078, highways: ['BR-101'] },
  'linhares-es': { city: 'Linhares', state: 'ES', lat: -19.3911, lng: -40.0722, highways: ['BR-101'] },
  'colatina-es': { city: 'Colatina', state: 'ES', lat: -19.5392, lng: -40.6303, highways: ['BR-259'] },
  'cachoeiro de itapemirim-es': { city: 'Cachoeiro de Itapemirim', state: 'ES', lat: -20.8489, lng: -41.1128, highways: ['BR-101', 'BR-482'] },
  'sao mateus-es': { city: 'São Mateus', state: 'ES', lat: -18.7161, lng: -39.8589, highways: ['BR-101'] },

  // BAHIA
  'salvador-ba': { city: 'Salvador', state: 'BA', lat: -12.9777, lng: -38.5016, highways: ['BR-324', 'BA-099'] },
  'feira de santana-ba': { city: 'Feira de Santana', state: 'BA', lat: -12.2664, lng: -38.9663, highways: ['BR-116', 'BR-324', 'BR-101'] },
  'vitoria da conquista-ba': { city: 'Vitória da Conquista', state: 'BA', lat: -14.8661, lng: -40.8394, highways: ['BR-116'] },
  'luis eduardo magalhaes-ba': { city: 'Luís Eduardo Magalhães', state: 'BA', lat: -12.0969, lng: -45.7972, highways: ['BR-020', 'BR-242'] },
  'barreiras-ba': { city: 'Barreiras', state: 'BA', lat: -12.1444, lng: -44.9969, highways: ['BR-242', 'BR-135'] },
  'ilheus-ba': { city: 'Ilhéus', state: 'BA', lat: -14.7939, lng: -39.0464, highways: ['BR-101', 'BA-001'] },
  'itabuna-ba': { city: 'Itabuna', state: 'BA', lat: -14.7939, lng: -39.2778, highways: ['BR-101'] },
  'juazeiro-ba': { city: 'Juazeiro', state: 'BA', lat: -9.4161, lng: -40.5033, highways: ['BR-407', 'BR-235'] },
  'jequie-ba': { city: 'Jequié', state: 'BA', lat: -13.8581, lng: -40.0839, highways: ['BR-116', 'BR-330'] },
  'teixeira de freitas-ba': { city: 'Teixeira de Freitas', state: 'BA', lat: -17.5358, lng: -39.7422, highways: ['BR-101'] },
  'alagoinhas-ba': { city: 'Alagoinhas', state: 'BA', lat: -12.1356, lng: -38.4192, highways: ['BR-101'] },
  'camacari-ba': { city: 'Camaçari', state: 'BA', lat: -12.6975, lng: -38.3242, highways: ['BA-093', 'BA-535'] },
  'porto seguro-ba': { city: 'Porto Seguro', state: 'BA', lat: -16.4497, lng: -39.0647, highways: ['BR-367', 'BR-101'] },
  'eunapolis-ba': { city: 'Eunápolis', state: 'BA', lat: -16.3725, lng: -39.5806, highways: ['BR-101', 'BR-367'] },

  // PERNAMBUCO, CEARÁ & DEMAIS NORDESTE
  'recife-pe': { city: 'Recife', state: 'PE', lat: -8.0476, lng: -34.877, highways: ['BR-101', 'BR-232'] },
  'suape-pe': { city: 'Porto de Suape', state: 'PE', lat: -8.3942, lng: -34.9608, highways: ['BR-101', 'PE-060'] },
  'caruaru-pe': { city: 'Caruaru', state: 'PE', lat: -8.2833, lng: -35.9761, highways: ['BR-232', 'BR-104'] },
  'petrolina-pe': { city: 'Petrolina', state: 'PE', lat: -9.3986, lng: -40.5008, highways: ['BR-407', 'BR-428'] },
  'garanhuns-pe': { city: 'Garanhuns', state: 'PE', lat: -8.8903, lng: -36.4928, highways: ['BR-423', 'BR-424'] },
  'fortaleza-ce': { city: 'Fortaleza', state: 'CE', lat: -3.7172, lng: -38.5433, highways: ['BR-116', 'BR-222'] },
  'pecem-ce': { city: 'Porto do Pecém', state: 'CE', lat: -3.5489, lng: -38.8089, highways: ['CE-085', 'BR-222'] },
  'sobral-ce': { city: 'Sobral', state: 'CE', lat: -3.6894, lng: -40.3486, highways: ['BR-222'] },
  'juazeiro do norte-ce': { city: 'Juazeiro do Norte', state: 'CE', lat: -7.2131, lng: -39.3153, highways: ['CE-060', 'BR-122'] },
  'sao luis-ma': { city: 'São Luís', state: 'MA', lat: -2.5307, lng: -44.3068, highways: ['BR-135'] },
  'imperatriz-ma': { city: 'Imperatriz', state: 'MA', lat: -5.5264, lng: -47.4775, highways: ['BR-010'] },
  'acailandia-ma': { city: 'Açailândia', state: 'MA', lat: -4.9458, lng: -47.5028, highways: ['BR-222', 'BR-010'] },
  'balsas-ma': { city: 'Balsas', state: 'MA', lat: -7.5322, lng: -46.0356, highways: ['BR-230'] },
  'teresina-pi': { city: 'Teresina', state: 'PI', lat: -5.092, lng: -42.8038, highways: ['BR-343', 'BR-316'] },
  'parnaiba-pi': { city: 'Parnaíba', state: 'PI', lat: -2.9031, lng: -41.7769, highways: ['BR-343'] },
  'picos-pi': { city: 'Picos', state: 'PI', lat: -7.0769, lng: -41.4669, highways: ['BR-316', 'BR-230'] },
  'natal-rn': { city: 'Natal', state: 'RN', lat: -5.7945, lng: -35.211, highways: ['BR-101', 'BR-304'] },
  'mossoro-rn': { city: 'Mossoró', state: 'RN', lat: -5.1878, lng: -37.3442, highways: ['BR-304', 'BR-110'] },
  'joao pessoa-pb': { city: 'João Pessoa', state: 'PB', lat: -7.1195, lng: -34.845, highways: ['BR-101', 'BR-230'] },
  'campina grande-pb': { city: 'Campina Grande', state: 'PB', lat: -7.2219, lng: -35.8858, highways: ['BR-230', 'BR-104'] },
  'maceio-al': { city: 'Maceió', state: 'AL', lat: -9.6658, lng: -35.735, highways: ['BR-101', 'AL-101'] },
  'arapiraca-al': { city: 'Arapiraca', state: 'AL', lat: -9.7547, lng: -36.6614, highways: ['AL-220', 'BR-101'] },
  'aracaju-se': { city: 'Aracaju', state: 'SE', lat: -10.9472, lng: -37.0731, highways: ['BR-101'] },

  // NORTE
  'palmas-to': { city: 'Palmas', state: 'TO', lat: -10.1844, lng: -48.3336, highways: ['TO-050', 'BR-010'] },
  'araguaina-to': { city: 'Araguaína', state: 'TO', lat: -7.1925, lng: -48.2078, highways: ['BR-153'] },
  'gurupi-to': { city: 'Gurupi', state: 'TO', lat: -11.7297, lng: -49.0686, highways: ['BR-153'] },
  'porto nacional-to': { city: 'Porto Nacional', state: 'TO', lat: -10.7083, lng: -48.4172, highways: ['TO-050'] },
  'belem-pa': { city: 'Belém', state: 'PA', lat: -1.4558, lng: -48.4902, highways: ['BR-316', 'PA-150'] },
  'barcarena-pa': { city: 'Barcarena', state: 'PA', lat: -1.5058, lng: -48.6258, highways: ['PA-151'] },
  'maraba-pa': { city: 'Marabá', state: 'PA', lat: -5.3686, lng: -49.1178, highways: ['BR-155', 'BR-230'] },
  'parauapebas-pa': { city: 'Parauapebas', state: 'PA', lat: -6.0683, lng: -49.9022, highways: ['PA-275'] },
  'santarem-pa': { city: 'Santarém', state: 'PA', lat: -2.4431, lng: -54.7083, highways: ['BR-163'] },
  'paragominas-pa': { city: 'Paragominas', state: 'PA', lat: -2.9961, lng: -47.3528, highways: ['BR-010'] },
  'porto velho-ro': { city: 'Porto Velho', state: 'RO', lat: -8.7619, lng: -63.9039, highways: ['BR-364', 'BR-319'] },
  'ji-parana-ro': { city: 'Ji-Paraná', state: 'RO', lat: -10.8828, lng: -61.9519, highways: ['BR-364'] },
  'ariquemes-ro': { city: 'Ariquemes', state: 'RO', lat: -9.9133, lng: -63.0408, highways: ['BR-364'] },
  'vilhena-ro': { city: 'Vilhena', state: 'RO', lat: -12.7406, lng: -60.1458, highways: ['BR-364'] },
  'cacoal-ro': { city: 'Cacoal', state: 'RO', lat: -11.4386, lng: -61.4472, highways: ['BR-364'] },
  'rio branco-ac': { city: 'Rio Branco', state: 'AC', lat: -9.9747, lng: -67.8243, highways: ['BR-364'] },
  'cruzeiro do sul-ac': { city: 'Cruzeiro do Sul', state: 'AC', lat: -7.6311, lng: -72.67, highways: ['BR-364'] },
  'manaus-am': { city: 'Manaus', state: 'AM', lat: -3.119, lng: -60.0217, highways: ['BR-174', 'BR-319'] },
  'macapa-ap': { city: 'Macapá', state: 'AP', lat: 0.0389, lng: -51.0664, highways: ['BR-156'] },
  'boa vista-rr': { city: 'Boa Vista', state: 'RR', lat: 2.8235, lng: -60.6758, highways: ['BR-174'] },
};

// -------------------------------------------------------------
// 2. STATE CAPITAL & REGIONAL CENTROID FALLBACKS
// -------------------------------------------------------------
export const BRAZIL_STATE_CENTROIDS: Record<string, { lat: number; lng: number; mainCity: string }> = {
  SP: { lat: -23.5505, lng: -46.6333, mainCity: 'São Paulo' },
  MT: { lat: -14.5, lng: -55.8, mainCity: 'Cuiabá' },
  MS: { lat: -20.4697, lng: -54.6201, mainCity: 'Campo Grande' },
  GO: { lat: -16.6869, lng: -49.2648, mainCity: 'Goiânia' },
  DF: { lat: -15.7975, lng: -47.8919, mainCity: 'Brasília' },
  MG: { lat: -19.9167, lng: -43.9345, mainCity: 'Belo Horizonte' },
  RJ: { lat: -22.9068, lng: -43.1729, mainCity: 'Rio de Janeiro' },
  ES: { lat: -20.3155, lng: -40.3128, mainCity: 'Vitória' },
  PR: { lat: -25.4284, lng: -49.2733, mainCity: 'Curitiba' },
  SC: { lat: -27.5954, lng: -48.548, mainCity: 'Florianópolis' },
  RS: { lat: -30.0346, lng: -51.2177, mainCity: 'Porto Alegre' },
  BA: { lat: -12.9777, lng: -38.5016, mainCity: 'Salvador' },
  PE: { lat: -8.0476, lng: -34.877, mainCity: 'Recife' },
  CE: { lat: -3.7172, lng: -38.5433, mainCity: 'Fortaleza' },
  MA: { lat: -2.5307, lng: -44.3068, mainCity: 'São Luís' },
  PI: { lat: -5.092, lng: -42.8038, mainCity: 'Teresina' },
  RN: { lat: -5.7945, lng: -35.211, mainCity: 'Natal' },
  PB: { lat: -7.1195, lng: -34.845, mainCity: 'João Pessoa' },
  AL: { lat: -9.6658, lng: -35.735, mainCity: 'Maceió' },
  SE: { lat: -10.9472, lng: -37.0731, mainCity: 'Aracaju' },
  TO: { lat: -10.1844, lng: -48.3336, mainCity: 'Palmas' },
  PA: { lat: -1.4558, lng: -48.4902, mainCity: 'Belém' },
  RO: { lat: -8.7619, lng: -63.9039, mainCity: 'Porto Velho' },
  AC: { lat: -9.9747, lng: -67.8243, mainCity: 'Rio Branco' },
  AM: { lat: -3.119, lng: -60.0217, mainCity: 'Manaus' },
  AP: { lat: 0.0389, lng: -51.0664, mainCity: 'Macapá' },
  RR: { lat: 2.8235, lng: -60.6758, mainCity: 'Boa Vista' },
};

// -------------------------------------------------------------
// 3. EXACT HIGHWAY CORRIDORS (OVER 110 HIGH-ACCURACY ROUTES)
// -------------------------------------------------------------
export const EXACT_HIGHWAY_CORRIDORS: Record<
  string,
  { distanceKm: number; tollCount: number; tollPerAxle: number; highways: string }
> = {
  // Grain & Agribusiness to Ports
  'rondonopolis-santos': { distanceKm: 1480, tollCount: 14, tollPerAxle: 11.2, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-348 ➔ SP-160' },
  'sorriso-santos': { distanceKm: 1880, tollCount: 18, tollPerAxle: 11.5, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160' },
  'sinop-santos': { distanceKm: 1960, tollCount: 19, tollPerAxle: 11.5, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160' },
  'lucas do rio verde-santos': { distanceKm: 1810, tollCount: 17, tollPerAxle: 11.4, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160' },
  'nova mutum-santos': { distanceKm: 1720, tollCount: 16, tollPerAxle: 11.3, highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160' },
  'primavera do leste-santos': { distanceKm: 1420, tollCount: 13, tollPerAxle: 11.0, highways: 'BR-070 ➔ BR-163 ➔ SP-310 ➔ SP-160' },
  'cuiaba-santos': { distanceKm: 1610, tollCount: 15, tollPerAxle: 11.2, highways: 'BR-364 ➔ BR-163 ➔ SP-310 ➔ SP-160' },
  'rio verde-santos': { distanceKm: 980, tollCount: 10, tollPerAxle: 10.8, highways: 'BR-060 ➔ BR-153 ➔ SP-310 ➔ SP-160' },
  'jatai-santos': { distanceKm: 1070, tollCount: 11, tollPerAxle: 10.9, highways: 'BR-364 ➔ BR-060 ➔ SP-310 ➔ SP-160' },
  'itumbiara-santos': { distanceKm: 810, tollCount: 9, tollPerAxle: 10.7, highways: 'BR-153 ➔ SP-310 ➔ SP-160' },
  'campo grande-santos': { distanceKm: 1010, tollCount: 10, tollPerAxle: 10.6, highways: 'BR-262 ➔ SP-300 (Marechal Rondon) ➔ SP-160' },
  'dourados-paranagua': { distanceKm: 890, tollCount: 8, tollPerAxle: 9.8, highways: 'BR-163 ➔ BR-277 ➔ Porto de Paranaguá' },
  'dourados-santos': { distanceKm: 1090, tollCount: 11, tollPerAxle: 10.4, highways: 'BR-163 ➔ SP-270 ➔ SP-280 ➔ SP-160' },
  'cascavel-paranagua': { distanceKm: 680, tollCount: 7, tollPerAxle: 9.8, highways: 'BR-277 ➔ Rodovia do Café ➔ BR-277' },
  'curitiba-paranagua': { distanceKm: 95, tollCount: 1, tollPerAxle: 14.5, highways: 'BR-277 (Descida da Serra do Mar)' },
  'londrina-santos': { distanceKm: 610, tollCount: 7, tollPerAxle: 10.4, highways: 'BR-369 ➔ SP-225 ➔ SP-280 ➔ SP-160' },
  'maringa-paranagua': { distanceKm: 540, tollCount: 6, tollPerAxle: 10.2, highways: 'BR-376 ➔ BR-277' },
  'maringa-santos': { distanceKm: 680, tollCount: 8, tollPerAxle: 10.3, highways: 'BR-376 ➔ SP-280 ➔ SP-160' },
  'ponta grossa-paranagua': { distanceKm: 210, tollCount: 2, tollPerAxle: 11.5, highways: 'BR-376 ➔ BR-277' },
  'foz do iguacu-paranagua': { distanceKm: 730, tollCount: 7, tollPerAxle: 9.8, highways: 'BR-277' },
  'chapeco-itajaí': { distanceKm: 540, tollCount: 5, tollPerAxle: 9.2, highways: 'BR-282 ➔ BR-470 ➔ BR-101' },
  'chapeco-santos': { distanceKm: 980, tollCount: 11, tollPerAxle: 10.2, highways: 'BR-282 ➔ BR-116 ➔ SP-280 ➔ SP-160' },
  'passo fundo-rio grande': { distanceKm: 560, tollCount: 6, tollPerAxle: 10.5, highways: 'BR-285 ➔ BR-392 ➔ Porto de Rio Grande' },
  'porto alegre-rio grande': { distanceKm: 320, tollCount: 3, tollPerAxle: 11.0, highways: 'BR-116 ➔ BR-392' },
  'caxias do sul-rio grande': { distanceKm: 420, tollCount: 4, tollPerAxle: 10.8, highways: 'RS-122 ➔ BR-116 ➔ BR-392' },
  'uberlandia-santos': { distanceKm: 690, tollCount: 8, tollPerAxle: 11.0, highways: 'BR-050 ➔ SP-330 (Anhanguera) ➔ SP-160' },
  'uberaba-santos': { distanceKm: 585, tollCount: 7, tollPerAxle: 11.0, highways: 'BR-050 ➔ SP-330 ➔ SP-160' },
  'luis eduardo magalhaes-salvador': { distanceKm: 940, tollCount: 4, tollPerAxle: 7.8, highways: 'BR-242 ➔ BR-116 ➔ BR-324' },
  'barreiras-salvador': { distanceKm: 860, tollCount: 4, tollPerAxle: 7.8, highways: 'BR-242 ➔ BR-116 ➔ BR-324' },
  'brasilia-santos': { distanceKm: 1080, tollCount: 11, tollPerAxle: 10.8, highways: 'BR-040 ➔ BR-050 ➔ SP-330 ➔ SP-160' },

  // São Paulo Interior & Metropolitan Corridors
  'sao paulo-santos': { distanceKm: 75, tollCount: 2, tollPerAxle: 15.2, highways: 'SP-160 (Rodovia dos Imigrantes) / SP-150 (Anchieta)' },
  'campinas-santos': { distanceKm: 165, tollCount: 3, tollPerAxle: 14.8, highways: 'SP-348 (Bandeirantes) ➔ SP-021 (Rodoanel) ➔ SP-160' },
  'sao paulo-campinas': { distanceKm: 95, tollCount: 2, tollPerAxle: 13.5, highways: 'SP-348 (Bandeirantes) / SP-330 (Anhanguera)' },
  'campinas-ribeirao preto': { distanceKm: 220, tollCount: 3, tollPerAxle: 12.2, highways: 'SP-330 (Rodovia Anhanguera)' },
  'sao paulo-ribeirao preto': { distanceKm: 315, tollCount: 5, tollPerAxle: 12.5, highways: 'SP-348 ➔ SP-330' },
  'sao paulo-sao jose do rio preto': { distanceKm: 440, tollCount: 6, tollPerAxle: 12.0, highways: 'SP-348 ➔ SP-310 (Washington Luís)' },
  'sao paulo-bauru': { distanceKm: 330, tollCount: 5, tollPerAxle: 11.8, highways: 'SP-280 (Castello Branco) ➔ SP-209 ➔ SP-300' },
  'sao paulo-sorocaba': { distanceKm: 98, tollCount: 2, tollPerAxle: 12.0, highways: 'SP-280 (Castello Branco)' },
  'sao paulo-sao jose dos campos': { distanceKm: 90, tollCount: 2, tollPerAxle: 11.5, highways: 'BR-116 (Presidente Dutra) / SP-070 (Ayrton Senna)' },
  'sao paulo-taubate': { distanceKm: 130, tollCount: 2, tollPerAxle: 12.0, highways: 'BR-116 (Presidente Dutra)' },
  'sao paulo-franca': { distanceKm: 400, tollCount: 6, tollPerAxle: 12.2, highways: 'SP-330 ➔ SP-334' },
  'sao paulo-marilia': { distanceKm: 440, tollCount: 6, tollPerAxle: 11.5, highways: 'SP-280 ➔ SP-225 ➔ SP-294' },
  'sao paulo-presidente prudente': { distanceKm: 560, tollCount: 7, tollPerAxle: 11.0, highways: 'SP-280 ➔ SP-270 (Raposo Tavares)' },
  'campinas-limeira': { distanceKm: 55, tollCount: 1, tollPerAxle: 12.0, highways: 'SP-330 (Anhanguera)' },
  'campinas-piracicaba': { distanceKm: 70, tollCount: 1, tollPerAxle: 11.5, highways: 'SP-304' },
  'ribeirao preto-franca': { distanceKm: 85, tollCount: 1, tollPerAxle: 10.5, highways: 'SP-334' },
  'bauru-marilia': { distanceKm: 100, tollCount: 1, tollPerAxle: 11.0, highways: 'SP-294' },
  'araraquara-sao carlos': { distanceKm: 45, tollCount: 1, tollPerAxle: 11.0, highways: 'SP-310' },

  // Interstate Trunk Routes
  'sao paulo-rio de janeiro': { distanceKm: 435, tollCount: 6, tollPerAxle: 12.8, highways: 'BR-116 (Rodovia Presidente Dutra)' },
  'sao paulo-curitiba': { distanceKm: 408, tollCount: 6, tollPerAxle: 10.5, highways: 'BR-116 (Rodovia Régis Bittencourt)' },
  'sao paulo-belo horizonte': { distanceKm: 585, tollCount: 8, tollPerAxle: 9.8, highways: 'BR-381 (Rodovia Fernão Dias)' },
  'belo horizonte-rio de janeiro': { distanceKm: 440, tollCount: 5, tollPerAxle: 10.2, highways: 'BR-040' },
  'belo horizonte-uberlandia': { distanceKm: 535, tollCount: 5, tollPerAxle: 9.5, highways: 'BR-262 ➔ BR-452' },
  'belo horizonte-betim': { distanceKm: 35, tollCount: 0, tollPerAxle: 0, highways: 'BR-381' },
  'belo horizonte-juiz de fora': { distanceKm: 260, tollCount: 3, tollPerAxle: 10.0, highways: 'BR-040' },
  'belo horizonte-salvador': { distanceKm: 1370, tollCount: 9, tollPerAxle: 8.5, highways: 'BR-381 ➔ BR-116 (Rio-Bahia) ➔ BR-324' },
  'belo horizonte-vitoria': { distanceKm: 525, tollCount: 3, tollPerAxle: 8.0, highways: 'BR-381 ➔ BR-262' },
  'rio de janeiro-vitoria': { distanceKm: 520, tollCount: 5, tollPerAxle: 9.5, highways: 'BR-101' },
  'brasilia-goiania': { distanceKm: 209, tollCount: 2, tollPerAxle: 8.2, highways: 'BR-060' },
  'goiania-anapolis': { distanceKm: 55, tollCount: 1, tollPerAxle: 8.0, highways: 'BR-060 / BR-153' },
  'goiania-rio verde': { distanceKm: 230, tollCount: 2, tollPerAxle: 9.5, highways: 'BR-060' },
  'rio verde-jatai': { distanceKm: 100, tollCount: 1, tollPerAxle: 9.0, highways: 'BR-060' },
  'uberlandia-uberaba': { distanceKm: 105, tollCount: 1, tollPerAxle: 10.0, highways: 'BR-050' },
  'uberlandia-itumbiara': { distanceKm: 135, tollCount: 1, tollPerAxle: 9.5, highways: 'BR-452 / BR-153' },

  // South Region
  'curitiba-florianopolis': { distanceKm: 305, tollCount: 4, tollPerAxle: 9.8, highways: 'BR-376 ➔ BR-101' },
  'curitiba-joinville': { distanceKm: 130, tollCount: 2, tollPerAxle: 9.5, highways: 'BR-376 ➔ BR-101' },
  'joinville-itajai': { distanceKm: 85, tollCount: 1, tollPerAxle: 9.2, highways: 'BR-101' },
  'florianopolis-itajai': { distanceKm: 95, tollCount: 1, tollPerAxle: 9.2, highways: 'BR-101' },
  'florianopolis-porto alegre': { distanceKm: 460, tollCount: 5, tollPerAxle: 9.5, highways: 'BR-101 ➔ BR-290' },
  'curitiba-porto alegre': { distanceKm: 740, tollCount: 8, tollPerAxle: 9.5, highways: 'BR-376 ➔ BR-101 ➔ BR-290' },
  'curitiba-londrina': { distanceKm: 380, tollCount: 4, tollPerAxle: 10.5, highways: 'BR-376 (Rodovia do Café) ➔ BR-369' },
  'curitiba-maringa': { distanceKm: 430, tollCount: 5, tollPerAxle: 10.5, highways: 'BR-376' },
  'curitiba-cascavel': { distanceKm: 495, tollCount: 5, tollPerAxle: 10.0, highways: 'BR-277' },
  'curitiba-foz do iguacu': { distanceKm: 635, tollCount: 6, tollPerAxle: 10.0, highways: 'BR-277' },
  'cascavel-foz do iguacu': { distanceKm: 140, tollCount: 1, tollPerAxle: 9.5, highways: 'BR-277' },
  'londrina-maringa': { distanceKm: 115, tollCount: 1, tollPerAxle: 10.0, highways: 'BR-369' },
  'porto alegre-caxias do sul': { distanceKm: 125, tollCount: 1, tollPerAxle: 10.0, highways: 'BR-116 / RS-122' },
  'porto alegre-passo fundo': { distanceKm: 290, tollCount: 3, tollPerAxle: 10.5, highways: 'BR-386 ➔ BR-285' },
  'porto alegre-pelotas': { distanceKm: 250, tollCount: 2, tollPerAxle: 11.0, highways: 'BR-116' },
  'pelotas-rio grande': { distanceKm: 60, tollCount: 1, tollPerAxle: 11.0, highways: 'BR-392' },

  // Mato Grosso Intrastate
  'cuiaba-rondonopolis': { distanceKm: 215, tollCount: 2, tollPerAxle: 9.5, highways: 'BR-163 / BR-364' },
  'rondonopolis-primavera do leste': { distanceKm: 130, tollCount: 1, tollPerAxle: 9.0, highways: 'BR-163 ➔ BR-070' },
  'cuiaba-nova mutum': { distanceKm: 240, tollCount: 2, tollPerAxle: 9.5, highways: 'BR-163' },
  'nova mutum-lucas do rio verde': { distanceKm: 90, tollCount: 1, tollPerAxle: 9.5, highways: 'BR-163' },
  'lucas do rio verde-sorriso': { distanceKm: 65, tollCount: 1, tollPerAxle: 9.5, highways: 'BR-163' },
  'sorriso-sinop': { distanceKm: 85, tollCount: 1, tollPerAxle: 9.5, highways: 'BR-163' },
  'sinop-matupa': { distanceKm: 205, tollCount: 2, tollPerAxle: 9.5, highways: 'BR-163' },
  'cuiaba-sinop': { distanceKm: 480, tollCount: 5, tollPerAxle: 9.5, highways: 'BR-163' },

  // Mato Grosso do Sul Intrastate
  'campo grande-dourados': { distanceKm: 230, tollCount: 2, tollPerAxle: 9.0, highways: 'BR-163' },
  'campo grande-tres lagoas': { distanceKm: 335, tollCount: 2, tollPerAxle: 9.0, highways: 'BR-262' },
  'dourados-ponta pora': { distanceKm: 120, tollCount: 0, tollPerAxle: 0, highways: 'BR-463' },

  // Northeast & North Intrastate
  'salvador-feira de santana': { distanceKm: 110, tollCount: 1, tollPerAxle: 7.5, highways: 'BR-324' },
  'salvador-vitoria da conquista': { distanceKm: 510, tollCount: 3, tollPerAxle: 7.8, highways: 'BR-324 ➔ BR-116' },
  'barreiras-luis eduardo magalhaes': { distanceKm: 90, tollCount: 0, tollPerAxle: 0, highways: 'BR-242' },
  'recife-suape': { distanceKm: 50, tollCount: 1, tollPerAxle: 10.0, highways: 'BR-101' },
  'recife-caruaru': { distanceKm: 135, tollCount: 0, tollPerAxle: 0, highways: 'BR-232' },
  'recife-petrolina': { distanceKm: 715, tollCount: 0, tollPerAxle: 0, highways: 'BR-232 ➔ BR-428' },
  'fortaleza-pecem': { distanceKm: 60, tollCount: 0, tollPerAxle: 0, highways: 'BR-222 / CE-085' },
  'fortaleza-sobral': { distanceKm: 235, tollCount: 0, tollPerAxle: 0, highways: 'BR-222' },
  'fortaleza-juazeiro do norte': { distanceKm: 495, tollCount: 0, tollPerAxle: 0, highways: 'BR-116 ➔ BR-122' },
  'sao luis-imperatriz': { distanceKm: 630, tollCount: 0, tollPerAxle: 0, highways: 'BR-135 ➔ BR-222 ➔ BR-010' },
  'imperatriz-acailandia': { distanceKm: 70, tollCount: 0, tollPerAxle: 0, highways: 'BR-010' },
  'palmas-araguaina': { distanceKm: 380, tollCount: 0, tollPerAxle: 0, highways: 'TO-050 ➔ BR-153' },
  'palmas-gurupi': { distanceKm: 220, tollCount: 0, tollPerAxle: 0, highways: 'TO-050 ➔ BR-153' },
  'belem-barcarena': { distanceKm: 110, tollCount: 0, tollPerAxle: 0, highways: 'PA-151' },
  'belem-maraba': { distanceKm: 550, tollCount: 0, tollPerAxle: 0, highways: 'PA-150' },
  'maraba-parauapebas': { distanceKm: 165, tollCount: 0, tollPerAxle: 0, highways: 'PA-275' },
  'porto velho-ariquemes': { distanceKm: 200, tollCount: 0, tollPerAxle: 0, highways: 'BR-364' },
  'porto velho-ji-parana': { distanceKm: 375, tollCount: 0, tollPerAxle: 0, highways: 'BR-364' },
  'ji-parana-cacoal': { distanceKm: 105, tollCount: 0, tollPerAxle: 0, highways: 'BR-364' },
  'cacoal-vilhena': { distanceKm: 230, tollCount: 0, tollPerAxle: 0, highways: 'BR-364' },
  'vilhena-cuiaba': { distanceKm: 720, tollCount: 4, tollPerAxle: 9.5, highways: 'BR-364' },
};

// -------------------------------------------------------------
// 4. PARSER HELPER: EXTRACT CITY AND UF REGIONALLY
// -------------------------------------------------------------
export interface ParsedLocation {
  raw: string;
  cityName: string;
  cleanKey: string;
  stateUf: string | null;
  coord?: CityCoord;
}

export function parseBrazilianLocation(input: string): ParsedLocation {
  const raw = (input || '').trim();
  if (!raw) {
    return { raw: '', cityName: '', cleanKey: '', stateUf: null };
  }

  // Remove common prefixes
  let cleaned = raw
    .replace(/^(porto\s+de\s+|terminal\s+de\s+|polo\s+automotivo\s+de\s+|aeroporto\s+de\s+)/i, '')
    .trim();

  // Try extracting state UF (e.g., "- SP", ", SP", "/SP", "(SP)")
  let stateUf: string | null = null;
  const ufMatch = cleaned.match(/[-/,(\s]+([A-Za-z]{2})[)]?\s*$/);
  if (ufMatch) {
    const candidateUf = ufMatch[1].toUpperCase();
    if (BRAZIL_STATE_CENTROIDS[candidateUf]) {
      stateUf = candidateUf;
      // Strip UF from city
      cleaned = cleaned.substring(0, ufMatch.index).trim();
    }
  }

  // Normalization for matching
  const normalizedCity = cleaned
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Look up in coordinates database
  // 1. Try with state if known: "santos-sp"
  let coord: CityCoord | undefined;
  if (stateUf) {
    const keyWithUf = `${normalizedCity}-${stateUf.toLowerCase()}`;
    coord = BRAZIL_COORDINATES_MAP[keyWithUf];
  }

  // 2. If not found, try searching city name prefix or inclusion
  if (!coord) {
    const matchKey = Object.keys(BRAZIL_COORDINATES_MAP).find((k) => {
      const cityPart = k.split('-')[0];
      return cityPart === normalizedCity || normalizedCity.includes(cityPart) || cityPart.includes(normalizedCity);
    });
    if (matchKey) {
      coord = BRAZIL_COORDINATES_MAP[matchKey];
      if (!stateUf && coord) {
        stateUf = coord.state;
      }
    }
  }

  return {
    raw,
    cityName: cleaned,
    cleanKey: normalizedCity,
    stateUf,
    coord,
  };
}

// -------------------------------------------------------------
// 5. HAVERSINE GEODESIC TO HIGHWAY DISTANCE
// -------------------------------------------------------------
function haversineStraightKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates realistic road highway kilometers from geodesic distance
 * taking into account Brazilian relief and highway network layout.
 */
function geodesicToRoadKm(straightKm: number, state1?: string | null, state2?: string | null): number {
  if (straightKm <= 5) return Math.max(10, Math.round(straightKm * 1.5));
  if (straightKm <= 40) return Math.round(straightKm * 1.25);
  if (straightKm <= 120) return Math.round(straightKm * 1.22);

  // Cross-state or coastal / mountainous regions have higher sinuosity
  const isMountainous =
    (state1 === 'RJ' || state2 === 'RJ') ||
    (state1 === 'MG' || state2 === 'MG') ||
    (state1 === 'ES' || state2 === 'ES') ||
    (state1 === 'SC' || state2 === 'SC');

  const sinuosity = isMountainous ? 1.28 : 1.22;
  return Math.round(straightKm * sinuosity);
}

// -------------------------------------------------------------
// 6. MAIN ENGINE: CALCULATE PRECISE DISTANCE & TOLLS
// -------------------------------------------------------------
export function calculatePreciseRoadDistance(
  originText: string,
  destText: string,
  axles: VehicleAxles = 6,
  tripType: TripType = 'somente_ida'
): RouteCalculationOutput {
  const parsedOrigin = parseBrazilianLocation(originText);
  const parsedDest = parseBrazilianLocation(destText);

  // Build corridor lookup keys
  const orgCityKey = parsedOrigin.coord ? parsedOrigin.coord.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : parsedOrigin.cleanKey;
  const dstCityKey = parsedDest.coord ? parsedDest.coord.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : parsedDest.cleanKey;

  const corridorKey1 = `${orgCityKey}-${dstCityKey}`;
  const corridorKey2 = `${dstCityKey}-${orgCityKey}`;

  let oneWayKm = 0;
  let oneWayTolls = 0;
  let tollPerAxle = 10.5;
  let highways = 'Rodovias Federais / Estaduais';
  let isExactCorridor = false;

  // 1. Check verified exact highway corridors database first
  if (EXACT_HIGHWAY_CORRIDORS[corridorKey1]) {
    const c = EXACT_HIGHWAY_CORRIDORS[corridorKey1];
    oneWayKm = c.distanceKm;
    oneWayTolls = c.tollCount;
    tollPerAxle = c.tollPerAxle;
    highways = c.highways;
    isExactCorridor = true;
  } else if (EXACT_HIGHWAY_CORRIDORS[corridorKey2]) {
    const c = EXACT_HIGHWAY_CORRIDORS[corridorKey2];
    oneWayKm = c.distanceKm;
    oneWayTolls = c.tollCount;
    tollPerAxle = c.tollPerAxle;
    highways = c.highways;
    isExactCorridor = true;
  } else {
    // 2. Resolve coordinates from direct city coordinates or state centroid
    let orgLat = parsedOrigin.coord?.lat;
    let orgLng = parsedOrigin.coord?.lng;
    let dstLat = parsedDest.coord?.lat;
    let dstLng = parsedDest.coord?.lng;

    // Fallback to State Centroid if city coordinate is not individually mapped
    if ((orgLat === undefined || orgLng === undefined) && parsedOrigin.stateUf && BRAZIL_STATE_CENTROIDS[parsedOrigin.stateUf]) {
      orgLat = BRAZIL_STATE_CENTROIDS[parsedOrigin.stateUf].lat;
      orgLng = BRAZIL_STATE_CENTROIDS[parsedOrigin.stateUf].lng;
    }
    if ((dstLat === undefined || dstLng === undefined) && parsedDest.stateUf && BRAZIL_STATE_CENTROIDS[parsedDest.stateUf]) {
      dstLat = BRAZIL_STATE_CENTROIDS[parsedDest.stateUf].lat;
      dstLng = BRAZIL_STATE_CENTROIDS[parsedDest.stateUf].lng;
    }

    if (orgLat !== undefined && orgLng !== undefined && dstLat !== undefined && dstLng !== undefined) {
      const straight = haversineStraightKm(orgLat, orgLng, dstLat, dstLng);

      // If cities are identical or virtually at same point
      if (straight < 8) {
        oneWayKm = 25; // standard municipal transfer distance
        oneWayTolls = 0;
        highways = 'Trecho Urbano / Rodoanel Regional';
      } else {
        oneWayKm = geodesicToRoadKm(straight, parsedOrigin.stateUf, parsedDest.stateUf);

        // Toll plazas estimation: ~1 toll plaza every 110-130 km in concession corridors (SP, RJ, PR, MG, MS, MT)
        const hasTollsInRegion =
          ['SP', 'RJ', 'PR', 'MG', 'MS', 'MT', 'SC', 'RS', 'GO'].includes(parsedOrigin.stateUf || '') ||
          ['SP', 'RJ', 'PR', 'MG', 'MS', 'MT', 'SC', 'RS', 'GO'].includes(parsedDest.stateUf || '');

        if (hasTollsInRegion && oneWayKm >= 60) {
          oneWayTolls = Math.max(1, Math.round(oneWayKm / 115));
          tollPerAxle = 10.8;
        } else {
          oneWayTolls = Math.round(oneWayKm / 180);
          tollPerAxle = 8.5;
        }

        const orgHwy = parsedOrigin.coord?.highways?.[0] || 'Rodovia Estadual';
        const dstHwy = parsedDest.coord?.highways?.[0] || 'Rodovia Federal';
        highways = `${orgHwy} ➔ ${dstHwy}`;
      }
    } else {
      // Intrastate heuristic fallback if text only has state or partial match
      if (parsedOrigin.stateUf && parsedOrigin.stateUf === parsedDest.stateUf) {
        oneWayKm = 180; // realistic average intra-state trip
        oneWayTolls = 1;
        highways = `Rodovias Estaduais (${parsedOrigin.stateUf})`;
      } else {
        oneWayKm = 480; // realistic average interstate freight run
        oneWayTolls = 4;
        highways = 'Malha Rodoviária Nacional';
      }
    }
  }

  // Multiplier for round-trip (ida e volta)
  const isRoundTrip = tripType === 'ida_e_volta';
  const multiplier = isRoundTrip ? 2 : 1;

  const totalDistanceKm = oneWayKm * multiplier;
  const oneWayTollCost = Math.round(oneWayTolls * tollPerAxle * axles);
  const totalTollCost = oneWayTollCost * multiplier;
  const totalTollCount = oneWayTolls * multiplier;

  // Realistic heavy truck average speed: 65 - 72 km/h
  const drivingHours = Math.round((totalDistanceKm / 68) * 10) / 10;
  // Average consumption: 2.2 km/l for loaded truck
  const estimatedDieselLiters = Math.round(totalDistanceKm / 2.2);
  const avgDieselPricePerL = 6.25;
  const estimatedDieselCost = Math.round(estimatedDieselLiters * avgDieselPricePerL);

  return {
    origin: originText,
    destination: destText,
    tripType,
    oneWayDistanceKm: oneWayKm,
    totalDistanceKm,
    oneWayTollCount: oneWayTolls,
    totalTollCount,
    oneWayTollCost,
    totalTollCost,
    highways: isRoundTrip ? `${highways} (Percurso de Ida e Volta)` : highways,
    drivingHours,
    estimatedDieselLiters,
    estimatedDieselCost,
    avgDieselPricePerL,
    isExactCorridor,
  };
}
