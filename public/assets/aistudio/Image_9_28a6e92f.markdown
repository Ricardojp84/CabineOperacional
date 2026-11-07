---
name: Cabine Operacional
colors:
  surface: '#081425'
  surface-dim: '#081425'
  surface-bright: '#2f3a4c'
  surface-container-lowest: '#040e1f'
  surface-container-low: '#111c2d'
  surface-container: '#152031'
  surface-container-high: '#1f2a3c'
  surface-container-highest: '#2a3548'
  on-surface: '#d8e3fb'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#d8e3fb'
  inverse-on-surface: '#263143'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#001c10'
  on-tertiary-container: '#009365'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#081425'
  on-background: '#d8e3fb'
  surface-variant: '#2a3548'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

O design system estabelece uma linguagem visual utilitária, robusta e focada em ergonomia de alta performance para motoristas autônomos e gestores de frete de longa distância. A atmosfera visual é moldada pelas exigências de uma cabine em movimento: variações extremas de luminosidade solar, reflexos no para-brisa, vibrações da estrada e uso com toques rápidos em paradas rodoviárias.

O estilo combina **Modernismo Utilitário** e **High-Contrast Dark Surface**, afastando-se de interfaces frágeis ou excessivamente decorativas. A estética é precisa, funcional e confiável como um painel de instrumentos automotivo digital, entregando clareza operacional instantânea através de divisões de blocos sólidos, tipografia com traços limpos e feedback tátil/visual imediato para decisões de lucro por quilômetro rodado e controle de combustível.

## Colors

A paleta prioriza ergonomia visual prolongada sob condições de baixa luminosidade na estrada, sem sacrificar a visibilidade sob sol escaldante graças ao contraste calibrado entre planos de fundo escuros e acentos luminosos.

- **Fundo Base & Estrutura (Primary #0f172a):** Azul petróleo ultra-profundo que reduz o consumo de bateria em telas OLED e elimina fadiga ocular noturna.
- **Painéis & Contêineres (Neutral #1e293b / #334155):** Marinho escuro estruturado que segmenta cartões, listas e métricas sem necessidade de sombras complexas.
- **Atenção Operacional & Combustível (Secondary #f59e0b & Alerta #ea580c):** Âmbar e laranja de sinalização rodoviária, dedicados a abastecimento, despesas de manutenção, alertas de pedágio e chamadas primárias de ação.
- **Lucro Líquido & Sucesso (Tertiary #10b981):** Verde esmeralda calibrado com alta luminância para saldo em conta, fretes rentáveis e metas batidas.
- **Superfície de Texto & Ícones:** Branco puro (#f8fafc) para títulos e dados de leitura imediata; cinza ardósia (#94a3b8) para unidades de medida, metadados e legendas secundárias.

## Typography

Adotou-se **Plus Jakarta Sans** universalmente pela sua geometria pura aliada a aberturas amplas (*large apertures*) e altura-x generosa, garantindo leitura instantânea a 60–80 cm de distância (distância padrão entre o suporte do celular no painel e o motorista).

- **Números e Valores Financeiros:** Devem ser renderizados sempre em peso 700 ou 800 para eliminar confusão entre dígitos semelhantes (como 6, 8 e 9) ao visualizar relatórios de despesas com o veículo estacionado.
- **Rótulos e Unidades (km, R$, L):** Utilizam pesos intermediários (600/700) com caixas padronizadas e ligeiro tracking positivo para legibilidade periférica rápida.

## Layout & Spacing

A arquitetura de layout é estruturada em uma grade fluida vertical orientada ao alcance do polegar (*thumb-zone navigation*), priorizando a porção inferior dos dispositivos móveis para ações críticas.

- **Alvos de Toque Críticos:** Nenhum elemento de interação principal possui altura inferior a 48px, com padrão de 56px para botões operacionais (adicionar combustível, registrar pedágio, aceitar frete).
- **Margens de Borda:** Margem padrão de `1.25rem` (20px) em smartphones para evitar ativações acidentais pelas bordas curvas da tela ou garras de suportes veiculares.
- **Ritmo Vertical:** Seções de dados financeiros e de rota utilizam gaps consistentes de `space-md` (16px) e `space-lg` (24px) para separar blocos sem poluição visual.

## Elevation & Depth

Para garantir consistência em telas com brilho reduzido ou anti-reflexo, o design system utiliza **Tonal Layering** aliado a **Low-Contrast Outlines**, dispensando sombras difusas pesadas que se perdem no modo escuro.

- **Nível 0 (Canvas):** Fundo absoluto `#0f172a`.
- **Nível 1 (Cartões & Superfícies Base):** Fundo `#1e293b` delimitado por borda sutil de 1px em `#334155`.
- **Nível 2 (Elementos Interativos & Modais):** Fundo `#243248` com borda de 1px em `#475569`.
- **Nível 3 (Destaque Ativo / Feedback de Foco):** Contornos de 2px na cor de acento semântico correspondente (#f59e0b para formulários ativos, #10b981 para confirmações de lucro).

## Shapes

O nível de arredondamento é **Rounded (nível 2)**, fornecendo raio de 8px (`0.5rem`) a 16px (`1rem`) em componentes de dados e cartões operacionais. 

O formato transmite solidez mecânica sem a agressividade de cantos pontiagudos e sem a fragilidade lúdica de formas em pílula excessiva. Botões de ação rápida e cartões de resumo utilizam `rounded-lg` (16px), facilitando o enquadramento visual mesmo sob vibrações da cabine.

## Components

### Botões
- **Primário Operacional (Ação Rápida):** Fundo âmbar `#f59e0b` com texto em `#0f172a` (peso 700), altura mínima de 56px, ícone à esquerda de 24px. Estado pressionado com transição imediata para `#d97706`.
- **Secundário / Neutro:** Fundo `#1e293b`, borda de 1px `#475569`, texto branco `#f8fafc`, altura de 48px a 56px.
- **Sucesso (Confirmar Frete/Recebimento):** Fundo verde esmeralda `#10b981` com texto `#022c22` em peso 700.

### Cartões de Indicador de Rota & Frete (KPI Cards)
- Estrutura em `#1e293b` com contorno de 1px em `#334155`.
- Divisão bipartida: lado esquerdo com rótulo semântico (ex: "Frete Líquido", "Custo/Km") em `label-md` e valor consolidado em `headline-lg` na cor funcional correspondente (#10b981 para lucro, #f59e0b para despesas).

### Campos de Entrada (Input Fields)
- Altura vertical de 56px para digitação ágil em paradas.
- Superfície `#0f172a` com borda de 1.5px em `#334155`, transitando para âmbar `#f59e0b` no foco. Teclados numéricos exibidos com separadores grandes para digitação de odômetro, litros e valores monetários.

### Chips de Categoria de Gasto
- Altura de 36px com preenchimento `#1e293b`, contorno de 1px e texto em `label-md`. 
- Estado ativo acende a respectiva cor de classificação: Laranja para Combustível/Arla, Âmbar para Pedágio, Azul Claro para Alimentação e Vermelho Suave para Manutenção Corretiva.

### Listas de Paradas e Trechos
- Linhas com altura mínima de 64px, separadas por divisores finos `#334155`. 
- Indicador visual vertical de status do trecho (concluído em verde, atual em âmbar pulsante, próximo em cinza).

### Componentes Especializados Rodoviários
- **Medidor de Margem de Lucro:** Barra de progresso horizontal segmentada mostrando a proporção entre diesel, pedágio, manutenção estimada e lucro real da viagem.
- **Seletor Rápido de Combustível:** Modal inferior (*bottom sheet*) ancorado com botões gigantes pré-configurados para litro/bomba de postos conveniados.