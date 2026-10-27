# Backlog de Tarefas — Weather App

Backlog baseado no [plano técnico](../plans/weather-app-plan.md) e rastreável
à [especificação](../specs/weather-app-spec.md). As entregas seguem a ordem
tipos → funções puras → services → hook → componentes → integração → testes →
hardening. As dependências indicam pré-requisitos reais; critérios referenciam
os AC, NFR e MS da especificação sempre que aplicável.

## Entrega 1 — Tipos de domínio

### T-01 — Definir os tipos de domínio meteorológico

- **Descrição:** Criar contratos TypeScript para localidade, condições atuais,
  previsão, unidade e estados assíncronos.
- **Critérios de aceite:**
  - `City`, `CurrentWeather`, `ForecastDay`, `ForecastResult`, `Unit` e
    estados assíncronos representam os campos e estados definidos no plano.
  - Medições auxiliares e contexto de cidade opcionais são tipados como
    opcionais; temperaturas de domínio permanecem em Celsius.
  - O arquivo não importa React nem tipos DTO de serviços externos.
- **Rastreabilidade:** AC-01.3, AC-01.4, AC-02.1 a AC-02.5, AC-03.1 a AC-03.4,
  AC-04.1 a AC-04.4, AC-05.4.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `src/types/weather.ts`.
- **Tipo:** Data

## Entrega 2 — Funções puras

### T-02 — Mapear códigos meteorológicos WMO

- **Descrição:** Implementar o mapeamento puro de códigos WMO para descrições
  em português do Brasil.
- **Critérios de aceite:**
  - Cada código WMO suportado pelo produto retorna a descrição pt-BR definida.
  - Código ausente ou não mapeado retorna resultado não reconhecido, sem
    inventar uma descrição.
  - A função não importa React nem faz chamadas de rede.
- **Rastreabilidade:** AC-02.1, AC-02.3, AC-03.1, AC-03.3, NFR-01.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/weatherCode.ts`.
- **Tipo:** Data

### T-03 — Converter temperaturas entre unidades

- **Descrição:** Implementar funções puras de conversão Celsius/Fahrenheit.
- **Critérios de aceite:**
  - Conversão para Fahrenheit usa `°F = °C × 9/5 + 32`.
  - Conversão para Celsius preserva o valor canônico recebido.
  - As funções não modificam os valores de entrada nem fazem arredondamento
    prematuro.
- **Rastreabilidade:** AC-04.1 a AC-04.4.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/temperature.ts`.
- **Tipo:** Data

### T-04 — Formatar números meteorológicos em pt-BR

- **Descrição:** Implementar formatação pura de valores numéricos e unidade
  para apresentação.
- **Critérios de aceite:**
  - Temperaturas são exibidas com uma casa decimal, vírgula decimal e símbolo
    `°C` ou `°F` conforme a unidade selecionada.
  - Formatar não altera o dado numérico canônico.
  - A função recebe explicitamente unidade e localidade de formatação, sem
    depender de configuração implícita do navegador.
- **Rastreabilidade:** AC-04.1 a AC-04.3, NFR-01.
- **Dependências:** T-01, T-03.
- **Arquivos prováveis:** `src/lib/format.ts`.
- **Tipo:** Data

### T-05 — Validar instantes, fusos e datas locais

- **Implementação:** `src/lib/date.ts` centraliza validação de datas e cálculo
  do dia local; `mapCurrent` no serviço aplica o offset e os limites de idade.
  `tests/unit/date.test.ts` cobre mudança de ano, ano bissexto e horário de
  verão; `tests/unit/weatherService.test.ts` cobre dois fusos, limites
  inclusivos de 60 minutos/agora e tempo decorrido durante a requisição.
- **Descrição:** Criar funções puras para validar observações meteorológicas
  e calcular datas locais da previsão.
- **Critérios de aceite:**
  - O instante atual é interpretado com o offset UTC retornado pela API e
    rejeitado se inválido, mais de 60 minutos anterior à solicitação ou
    posterior ao instante de validação.
  - Fuso IANA ausente ou inválido é rejeitado antes de determinar a data local.
  - O intervalo calculado contém as datas locais de hoje a hoje + 4 no fuso
    informado, inclusive.
- **Rastreabilidade:** AC-02.4, AC-03.2, AC-03.4.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/date.ts`.
- **Tipo:** Data

## Entrega 3 — Services

### T-06 — Implementar serviço de geocodificação

- **Implementação da busca:** `searchCities(name)` em
  `src/services/weatherService.ts`, com testes em
  `tests/unit/weatherService.test.ts`. Conforme solicitação específica, o nome
  é codificado com `encodeURIComponent` em vez de `URLSearchParams`.
  Cancelamento externo e classificação das falhas permanecem fora desta entrega.
- **Descrição:** Consultar o endpoint Open-Meteo Geocoding e converter
  respostas válidas em localidades do domínio.
- **Critérios de aceite:**
  - A requisição HTTPS serializa com `URLSearchParams` os parâmetros
    `name`, `count=10`, `language=pt` e `format=json`; `name` perde apenas
    espaços externos.
  - Resposta válida mapeia nome e coordenadas para `City` e só preenche região,
    país e código do país quando fornecidos.
  - Resultado válido sem localidades retorna lista vazia; falha HTTP, erro
    explícito da API, JSON inválido, formato incompatível, rede e timeout
    produzem falha distinguível.
  - Cada solicitação tem timeout de 10 segundos e aceita cancelamento.
- **Rastreabilidade:** AC-01.2 a AC-01.4, AC-05.1, AC-05.2.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/services/geocodingService.ts`.
- **Tipo:** Data

### T-07 — Implementar serviço meteorológico combinado

- **Implementação desta entrega:** `getWeather(city)` em
  `src/services/weatherService.ts` consulta `current` e `daily` juntos e retorna
  até cinco dias válidos no período local. As seções são independentes:
  `current: null` ou `forecast: []` sinalizam indisponibilidade; ambas inválidas
  lançam `WeatherServiceError`. Dias inválidos, fora do período e todas as
  ocorrências de datas duplicadas são omitidos, com aviso de previsão parcial.
  Observações são validadas contra o início da requisição (idade máxima de
  60 minutos) e o momento da validação (sem horários futuros).
  Inclui probabilidade de precipitação finita entre 0 e 100.
  `fetchWithTimeout` é compartilhado com `searchCities`, cobre também a leitura
  do JSON e sempre libera o timer no `finally`; timeout produz
  “A requisição demorou demais.” e falha de rede produz “Falha de rede.”.
  Cancelamento externo permanece fora desta entrega.
- **Descrição:** Consultar condições atuais e previsão em uma chamada
  Open-Meteo Forecast, validando as seções independentemente.
- **Critérios de aceite:**
  - A URL usa coordenadas da cidade, `forecast_days=5`, campos `current` e
    `daily` definidos no plano, Celsius, km/h, mm e `timezone=auto`; parâmetros
    são codificados com `URLSearchParams`.
  - Clima atual só é válido com temperatura finita e instante válido; código
    WMO ausente ou desconhecido não invalida a temperatura.
  - Previsão só inclui datas completas, únicas e dentro do período local; os
    dias são ordenados, mínima não excede máxima e o código WMO é reconhecido.
    Precipitação ausente não invalida o dia.
  - Cinco dias consecutivos válidos produzem resultado completo; menos dias
    válidos produzem resultado parcial sem preencher lacunas. Fuso inválido
    deixa a previsão indisponível sem invalidar clima atual válido.
  - Falha de rede, HTTP, JSON ou timeout não resulta em dados de sucesso; a
    chamada expira em 10 segundos e aceita cancelamento.
- **Rastreabilidade:** AC-02.1 a AC-02.4, AC-03.1 a AC-03.4, AC-05.3, AC-05.4.
- **Dependências:** T-01, T-02, T-05.
- **Arquivos prováveis:** `src/services/weatherService.ts`.
- **Tipo:** Data

## Entrega 4 — Hook

### T-08 — Implementar a orquestração da página

- **Implementação desta entrega:** `src/hooks/useWeather.ts` expõe `status`,
  `data`, `cities`, `error`, `query`, `search`, `selectCity` e `retry`.
  Conforme solicitação específica, há um status agregado e a primeira cidade
  é carregada automaticamente. Retry repete a última chamada: geocoding se a
  busca falhou ou ficou vazia; forecast se já houve seleção. Respostas
  obsoletas e respostas após desmontagem são ignoradas.
  `App` usa o hook, inicia em `idle`, oferece seleção das demais cidades e
  mantém `unit` exclusivamente na UI. O mock permanece apenas para testes.
  Em resposta parcial, a UI preserva a seção válida e oferece retry da
  consulta combinada para a seção indisponível, sem anúncio de sucesso completo.
- **Descrição:** Criar o hook que coordena busca, seleção, consulta
  meteorológica, retry e unidade.
- **Critérios de aceite:**
  - Enviar consulta vazia ou só com espaços não chama geocoding e expõe o
    estado para a mensagem definida na spec.
  - Busca, clima atual e previsão mantêm estados independentes; busca sem
    resultados não é representada como erro.
  - Selecionar cidade inicia uma consulta combinada, limpa os dados da cidade
    anterior e preserva a unidade durante a sessão.
  - Respostas tardias de busca ou cidade anterior não sobrescrevem a seleção
    mais recente.
  - Retry só é executado por ação explícita e repete a consulta da cidade
    selecionada, sem retry automático.
- **Rastreabilidade:** AC-01.1, AC-02.5, AC-04.4, AC-05.1 a AC-05.5.
- **Dependências:** T-01, T-06, T-07.
- **Arquivos prováveis:** `src/hooks/useWeatherApp.ts`.
- **Tipo:** Data

## Entrega 5 — Componentes

### T-09 — Implementar busca e seleção de cidades

- **Descrição:** Criar componente de busca com resultados selecionáveis e
  mensagens por estado.
- **Critérios de aceite:**
  - O formulário permite enviar por teclado e botão; cada resultado mostra
    nome e região/país somente quando fornecidos.
  - Cada resultado é um controle selecionável por teclado e expõe nome
    acessível que identifica a localidade.
  - Estados de loading, entrada vazia, nenhum resultado, erro e retry exibem
    as mensagens/ações correspondentes, sem confundir vazio com erro.
- **Rastreabilidade:** AC-01.1 a AC-01.4, AC-05.1, AC-05.2, AC-05.5, NFR-01,
  NFR-03.
- **Dependências:** T-01, T-08.
- **Arquivos prováveis:** `src/components/CitySearch.tsx`.
- **Tipo:** UI

### T-10 — Implementar apresentação do clima atual

- **Descrição:** Criar componente de condições atuais e seus estados
  indisponíveis.
- **Critérios de aceite:**
  - Sucesso mostra nome da localidade, temperatura com unidade e condição
    pt-BR; código WMO ausente/desconhecido mostra “Condição indisponível”.
  - Estado indisponível mostra “Clima atual indisponível para esta cidade.”;
    loading e erro não exibem dado de outra localidade.
  - Retry é oferecido no estado de erro e invoca somente o callback recebido.
- **Rastreabilidade:** AC-02.1 a AC-02.5, AC-05.3 a AC-05.5, NFR-01, NFR-03.
- **Dependências:** T-01, T-02, T-03, T-04, T-08.
- **Arquivos prováveis:** `src/components/CurrentWeather.tsx`.
- **Tipo:** UI

### T-11 — Implementar apresentação da previsão diária

Complemento aprovado para esta entrega:
- Implementar `ForecastList.tsx` e `ForecastCard.tsx`, com grid
  `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`, rótulos de dia de `lib/format`,
  ícones e temperaturas na unidade ativa.
- Adicionar `ForecastDay.precipitationProbabilityPercent?: number`, preencher
  o mock e mostrar “Indisponível” quando ausente, sem inferir probabilidade de mm.
- Ao implementar T-07, solicitar `daily.precipitation_probability_max` e
  validar porcentagens finitas entre 0 e 100 antes de mapear o novo campo.
- Criar estados reutilizáveis em `src/components/states/`: loading com
  `role="status"`, erro com mensagem e `onRetry`, vazio com título e dica.
- Cobrir datas sem deslocamento de fuso, unidades, previsão parcial/vazia,
  probabilidade zero/ausente e retry por teclado.

- **Descrição:** Criar componente que apresenta previsão completa, parcial ou
  indisponível.
- **Critérios de aceite:**
  - Cada dia renderizado mostra data `dd/MM/yyyy`, condição e mínima/máxima na
    unidade ativa, em ordem cronológica.
  - Resultado parcial mostra só os dias recebidos e válidos e apresenta
    “Previsão incompleta. Alguns dias estão indisponíveis.”.
  - Resultado indisponível apresenta “Previsão indisponível para esta cidade.”;
    retry é exposto por callback e não executado automaticamente.
- **Rastreabilidade:** AC-03.1 a AC-03.4, AC-05.3 a AC-05.5, NFR-01, NFR-03.
- **Dependências:** T-01, T-02, T-03, T-04, T-05, T-08.
- **Arquivos prováveis:** `src/components/DailyForecast.tsx`.
- **Tipo:** UI

### T-12 — Implementar controle de unidade

- **Descrição:** Criar controle acessível para alternar Celsius e Fahrenheit.
- **Critérios de aceite:**
  - O valor inicial é Celsius e o controle comunica nome e estado selecionado
    a tecnologias assistivas.
  - Selecionar unidade chama o callback correspondente e não realiza acesso
    de rede.
  - O controle permite operar e alternar por teclado.
- **Rastreabilidade:** AC-04.1 a AC-04.4, NFR-03.
- **Dependências:** T-01, T-03, T-08.
- **Arquivos prováveis:** `src/components/TemperatureUnitToggle.tsx`.
- **Tipo:** UI

### T-13 — Implementar atribuição do provedor

- **Descrição:** Criar componente de atribuição Open-Meteo para dados
  meteorológicos exibidos.
- **Critérios de aceite:**
  - O link tem o texto “Weather data by Open-Meteo.com” e o destino
    `https://open-meteo.com/`.
  - O link tem nome acessível e pode receber foco e ativação por teclado.
- **Rastreabilidade:** NFR-07.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/components/WeatherAttribution.tsx`.
- **Tipo:** UI

## Entrega 6 — Integração

### T-14 — Compor a página Weather App

Entrega incremental de UI com mock (antes do hook/API): montar `App` com
marca, `SearchBar`, `UnitToggle`, clima atual, previsão e atribuição. Usar
`status` temporário para idle/loading/empty/error/success e `unit` independente,
convertendo temperaturas somente na renderização. A busca apenas reconhece
a cidade do mock; outros nomes mostram vazio. Permitir pré-visualizar os
estados via `initialStatus`, sem simular respostas reais. Incluir T-15/T-16
(CSS Tailwind global e bootstrap) para desbloquear dev/build. Verificar os
cinco estados, unidade preservada, teclado e ausência de overflow em 320/1440 px.

- **Descrição:** Integrar o hook e os componentes em uma página React.
- **Critérios de aceite:**
  - A página conecta formulário, seleção, estados de clima e previsão,
    controle de unidade, atribuição e ações de retry ao hook.
  - Ao selecionar outra cidade, a página não associa dados antigos à nova
    seleção; falha em uma seção não oculta dados válidos da outra.
  - Todas as mensagens da página são apresentadas em pt-BR.
- **Rastreabilidade:** AC-01.1 a AC-05.5, NFR-01, NFR-03, NFR-07.
- **Dependências:** T-08, T-09, T-10, T-11, T-12, T-13.
- **Arquivos prováveis:** `src/App.tsx`.
- **Tipo:** UI

### T-15 — Aplicar tema e layout responsivo

Revisão incremental de NFR-02/NFR-03: reforçar contraste da borda do input
(mínimo 3:1), foco no campo inválido, anúncio persistente dos resultados sem
mover foco na busca, destino do skip link com foco visível e foco preservado
após retry. Não manter o status de carregamento dentro de `aria-busy=true`.
Validar reflow em 320–1440 px, texto ampliado a 200%, nomes longos e métricas
ausentes; preservar o grid 2/3/5 da previsão.

- **Descrição:** Criar os estilos globais e a apresentação dark glassmorphism
  responsiva.
- **Critérios de aceite:**
  - Estilos globais aplicam o tema visual definido e não implementam acesso a
    dados ou estado meteorológico.
  - Em viewport de 320 px e 1440 px, o layout não produz rolagem horizontal.
- **Rastreabilidade:** NFR-02.
- **Dependências:** T-14.
- **Arquivos prováveis:** `src/styles/index.css`.
- **Tipo:** UI

### T-16 — Conectar a aplicação ao ponto de entrada

- **Descrição:** Montar a página React e importar os estilos globais na
  entrada da aplicação.
- **Critérios de aceite:**
  - A entrada renderiza `<App />` no elemento raiz do documento.
  - O build de produção termina sem erro de inicialização ou importação de
    estilos.
- **Rastreabilidade:** NFR-02.
- **Dependências:** T-14, T-15.
- **Arquivos prováveis:** `src/main.tsx`.
- **Tipo:** Infra

## Entrega 7 — Testes

### T-17 — Configurar testes unitários e de componentes

- **Descrição:** Preparar Vitest e setup comum para testes sem rede e com DOM
  onde necessário.
- **Critérios de aceite:**
  - `pnpm test` inicia Vitest em modo não interativo e conclui com código zero
    quando não há testes falhando.
  - O ambiente DOM e o setup comum podem ser usados pelos testes de
    componentes.
- **Rastreabilidade:** Estratégia de testes da spec; AC e NFR validados pelas
  tarefas de teste seguintes.
- **Dependências:** T-16.
- **Arquivos prováveis:** `vite.config.ts`, `tests/setup.ts`.
- **Tipo:** Infra

### T-18 — Configurar execução E2E

- **Descrição:** Preparar Playwright para testar a aplicação no navegador com
  endpoints interceptados.
- **Critérios de aceite:**
  - `pnpm test:e2e` inicia a suíte configurada.
  - Um teste de fumaça consegue interceptar endpoints Open-Meteo e não faz
    requisição externa.
- **Rastreabilidade:** Estratégia E2E da spec; AC-01.1 a AC-05.5.
- **Dependências:** T-17.
- **Arquivos prováveis:** `playwright.config.ts`,
  `tests/e2e/fixtures/`.
- **Tipo:** Infra

### T-19 — Testar mapeamento de códigos WMO

- **Descrição:** Verificar códigos reconhecidos e não reconhecidos com testes
  unitários.
- **Critérios de aceite:**
  - Existe uma asserção para cada código WMO suportado e sua descrição pt-BR.
  - Código ausente e um código desconhecido não retornam descrição reconhecida.
  - `pnpm test -- tests/unit/weatherCode.test.ts` passa sem rede.
- **Rastreabilidade:** AC-02.1, AC-02.3, AC-03.1, AC-03.3, NFR-01.
- **Dependências:** T-02, T-17.
- **Arquivos prováveis:** `tests/unit/weatherCode.test.ts`.
- **Tipo:** Test

### T-20 — Testar conversão de temperaturas

- **Descrição:** Verificar fórmula, retorno ao valor canônico e casos de
  fronteira da conversão.
- **Critérios de aceite:**
  - Testes unitários verificam `18 °C → 64.4 °F`, `0 °C → 32 °F` e
    `-40 °C → -40 °F`.
  - Conversão de Celsius preserva o valor de origem, e converter Celsius para
    Fahrenheit e de volta recupera o valor inicial antes da formatação.
  - Os testes importam diretamente o módulo de conversão, não renderizam
    componentes e passam com `pnpm test -- tests/unit/temperature.test.ts`.
- **Rastreabilidade:** AC-04.1 a AC-04.3.
- **Dependências:** T-03, T-17.
- **Arquivos prováveis:** `tests/unit/temperature.test.ts`.
- **Tipo:** Test

### T-21 — Testar formatação pt-BR

- **Descrição:** Verificar casas decimais, separadores, símbolos e formato de
  data.
- **Critérios de aceite:**
  - Casos de temperatura verificam uma casa decimal, vírgula e símbolo de
    unidade em Celsius e Fahrenheit.
  - Casos de data verificam o padrão `dd/MM/yyyy`.
  - `pnpm test -- tests/unit/format.test.ts` passa sem rede.
- **Rastreabilidade:** AC-03.2, AC-04.1 a AC-04.3, NFR-01.
- **Dependências:** T-04, T-17.
- **Arquivos prováveis:** `tests/unit/format.test.ts`.
- **Tipo:** Test

### T-22 — Testar validação de datas e fusos

- **Descrição:** Cobrir instantes de observação, fuso e período local com
  referência temporal fixa.
- **Critérios de aceite:**
  - Testes verificam instante válido, ausente, inválido, mais de 60 minutos
    antigo e posterior ao momento de validação.
  - Testes verificam rejeição de fuso inválido e os limites inclusivos do
    intervalo de cinco datas em pelo menos dois fusos.
  - `pnpm test -- tests/unit/date.test.ts` passa sem relógio real ou rede.
- **Rastreabilidade:** AC-02.4, AC-03.2, AC-03.4.
- **Dependências:** T-05, T-17.
- **Arquivos prováveis:** `tests/unit/date.test.ts`.
- **Tipo:** Test

### T-23 — Testar serviço de geocodificação

- **Descrição:** Cobrir parâmetros, mapeamento e falhas do geocoding com
  `fetch` mockado.
- **Critérios de aceite:**
  - `fetch` é substituído por mock; os testes verificam URL/parâmetros e
    preservação de acentos, hífen e apóstrofo após remover espaços externos.
  - Testes cobrem resultados, lista vazia, erro HTTP/API, JSON/formato
    inválido, rede, timeout e cancelamento.
  - Nenhum teste realiza chamada de rede real; `pnpm test -- tests/unit/geocodingService.test.ts`
    passa.
- **Rastreabilidade:** AC-01.2 a AC-01.4, AC-05.1, AC-05.2.
- **Dependências:** T-06, T-17.
- **Arquivos prováveis:** `tests/unit/geocodingService.test.ts`.
- **Tipo:** Test

### T-24 — Testar serviço meteorológico combinado

- **Regressões adicionadas:** seções ausentes independentes, dias inválidos,
  arrays curtos/desordenados, exclusão de todas as duplicatas, período local,
  mínima igual à máxima e limites da probabilidade. As antigas expectativas
  de rejeição total para uma única seção inválida foram substituídas pela
  preservação da seção válida conforme AC-05.4.
- **Descrição:** Cobrir URL, validação independente e erros do serviço
  meteorológico com `fetch` mockado.
- **Critérios de aceite:**
  - `fetch` é substituído por mock; testes verificam parâmetros da URL e
    mapeamento das seções atuais e diárias.
  - Testes cobrem clima atual inválido, WMO desconhecido, fuso inválido,
    dia ausente/inválido, datas duplicadas/fora do intervalo, previsão parcial
    e completa.
  - Há casos separados em que current é válido e daily inválido e vice-versa;
    falhas HTTP/API, JSON/formato inválido, rede e timeout são rejeitados.
  - Nenhum teste realiza chamada de rede real; `pnpm test -- tests/unit/weatherService.test.ts`
    passa.
- **Rastreabilidade:** AC-02.1 a AC-02.4, AC-03.1 a AC-03.4, AC-05.3, AC-05.4.
- **Dependências:** T-07, T-17.
- **Arquivos prováveis:** `tests/unit/weatherService.test.ts`.
- **Tipo:** Test

### T-25 — Testar hook e concorrência

- **Descrição:** Cobrir transições de estado e operações concorrentes do hook
  com serviços isolados.
- **Critérios de aceite:**
  - Testes cobrem busca vazia, loading, resultados, lista vazia, erro, seleção,
    sucesso e falha independente das duas seções.
  - Retry explicitamente acionado resulta em exatamente uma nova chamada do
    serviço meteorológico.
  - Após selecionar outra cidade, a resposta atrasada da primeira não altera
    seleção nem dados ativos; a unidade continua a mesma.
  - `pnpm test -- tests/unit/useWeatherApp.test.ts` passa sem rede.
- **Rastreabilidade:** AC-01.1, AC-02.5, AC-04.4, AC-05.1 a AC-05.5.
- **Dependências:** T-08, T-17, T-23, T-24.
- **Arquivos prováveis:** `tests/unit/useWeatherApp.test.ts`.
- **Tipo:** Test

### T-26 — Testar componente de busca

- **Descrição:** Verificar resultados, estados e acessibilidade de CitySearch.
- **Critérios de aceite:**
  - Testes verificam envio por teclado, seleção de resultado, nome e contexto
    opcional da localidade.
  - Testes verificam separadamente loading, entrada necessária, estado vazio
    de busca sem resultados e erro com retry, por texto/controle acessíveis.
  - `pnpm test -- tests/components/CitySearch.test.tsx` passa usando
    localizadores por role/nome acessível.
- **Rastreabilidade:** AC-01.1 a AC-01.4, AC-05.1, AC-05.2, NFR-03.
- **Dependências:** T-09, T-17.
- **Arquivos prováveis:** `tests/components/CitySearch.test.tsx`.
- **Tipo:** Test

### T-27 — Testar componente de clima atual

- **Descrição:** Verificar dados e estados de CurrentWeather.
- **Critérios de aceite:**
  - Testes verificam temperatura/unidade, condição reconhecida e condição
    indisponível com temperatura válida.
  - Testes verificam loading, estado sem dados/indisponível e erro; nenhum
    desses estados mostra dados de outra localidade e erro disponibiliza retry
    acionável.
  - `pnpm test -- tests/components/CurrentWeather.test.tsx` passa.
- **Rastreabilidade:** AC-02.1 a AC-02.5, AC-05.3, AC-05.5, NFR-03.
- **Dependências:** T-10, T-17.
- **Arquivos prováveis:** `tests/components/CurrentWeather.test.tsx`.
- **Tipo:** Test

### T-28 — Testar componente de previsão

- **Descrição:** Verificar apresentação da previsão completa, parcial e
  indisponível.
- **Critérios de aceite:**
  - Testes verificam ordem e conteúdo de cada dia, incluindo data, condição e
    temperaturas mínima/máxima.
  - Testes verificam loading, estado sem dias/indisponível, erro com retry e
    resultado parcial.
  - Previsão parcial não cria dias e mostra o aviso especificado; estado
    indisponível apresenta a mensagem correspondente.
  - `pnpm test -- tests/components/DailyForecast.test.tsx` passa.
- **Rastreabilidade:** AC-03.1 a AC-03.4, AC-05.3, AC-05.5, NFR-01, NFR-03.
- **Dependências:** T-11, T-17.
- **Arquivos prováveis:** `tests/components/DailyForecast.test.tsx`.
- **Tipo:** Test

### T-29 — Testar controle de unidade

- **Descrição:** Verificar a interação, seleção acessível e ausência de
  chamadas de rede ao alternar unidade.
- **Critérios de aceite:**
  - Testes verificam seleção inicial em Celsius e ambas as ações de unidade
    por teclado.
  - Alternar a unidade chama o callback de unidade e não chama nenhum serviço.
  - `pnpm test -- tests/components/TemperatureUnitToggle.test.tsx` passa.
- **Rastreabilidade:** AC-04.1 a AC-04.4, NFR-03.
- **Dependências:** T-12, T-17.
- **Arquivos prováveis:** `tests/components/TemperatureUnitToggle.test.tsx`.
- **Tipo:** Test

### T-30 — Testar integração da página

- **Descrição:** Verificar o comportamento acessível da página composta.
- **Critérios de aceite:**
  - Testes cobrem busca, seleção, exibição meteorológica, erro parcial e
    retry manual a partir da página.
  - Alternar unidade atualiza todas as temperaturas e não aumenta a contagem
    de chamadas dos serviços.
  - Atribuição apresenta o texto e URL exigidos.
  - `pnpm test -- tests/components/App.test.tsx` passa.
- **Rastreabilidade:** AC-01.1 a AC-05.5, NFR-03, NFR-07.
- **Dependências:** T-14, T-17, T-25, T-26, T-27, T-28, T-29.
- **Arquivos prováveis:** `tests/components/App.test.tsx`.
- **Tipo:** Test

### T-31 — Testar fluxo completo no navegador

- **Descrição:** Validar busca, seleção e exibição meteorológica completa em
  navegador com respostas interceptadas.
- **Critérios de aceite:**
  - O cenário seleciona a localidade retornada pelo mock e verifica clima
    atual e exatamente cinco datas em ordem.
  - O fluxo completo é executado em viewport desktop de 1440 px; a página não
    apresenta rolagem horizontal (`scrollWidth <= clientWidth`).
  - A suíte intercepta os endpoints e não acessa a API pública.
  - `pnpm test:e2e -- tests/e2e/weather.spec.ts` passa.
- **Rastreabilidade:** AC-01.2 a AC-01.4, AC-02.1, AC-03.1, AC-03.2.
- **Dependências:** T-18, T-30.
- **Arquivos prováveis:** `tests/e2e/weather.spec.ts`.
- **Tipo:** Test

### T-32 — Testar falhas e estados parciais no navegador

- **Descrição:** Verificar respostas vazias, falhas e retry manual de ponta a
  ponta.
- **Critérios de aceite:**
  - Cenários verificam busca sem resultados, erro de busca e retry, além de
    erro meteorológico com retry acionado pela pessoa.
  - Resposta com apenas uma seção válida mantém essa seção visível; previsão
    parcial exibe somente dias válidos e o aviso.
  - `pnpm test:e2e -- tests/e2e/weather-errors.spec.ts` passa sem rede externa.
- **Rastreabilidade:** AC-05.1 a AC-05.5, AC-03.3, AC-03.4.
- **Dependências:** T-18, T-30.
- **Arquivos prováveis:** `tests/e2e/weather-errors.spec.ts`.
- **Tipo:** Test

### T-33 — Testar unidade, teclado e viewports

- **Descrição:** Validar operação por teclado, conversão e responsividade em
  navegador.
- **Critérios de aceite:**
  - Testes alternam Celsius/Fahrenheit e verificam valores/símbolos em todas
    as temperaturas renderizadas; não ocorre request adicional.
  - Fluxo de busca e seleção pode ser concluído por teclado.
  - Em viewport desktop de 1440 px, `scrollWidth` do documento não excede
    `clientWidth`.
  - `pnpm test:e2e -- tests/e2e/weather-accessibility.spec.ts` passa.
- **Rastreabilidade:** AC-04.1 a AC-04.4, NFR-02, NFR-03.
- **Dependências:** T-18, T-30.
- **Arquivos prováveis:** `tests/e2e/weather-accessibility.spec.ts`.
- **Tipo:** Test

## Matriz de rastreabilidade — requisitos funcionais

Cada requisito lista as tarefas de implementação e as tarefas que verificam
seu comportamento. “Verificação” identifica testes automatizados ou validação
de aceite; uma tarefa de teste não substitui a implementação correspondente.

| Requisito da spec | Tarefas de implementação | Tarefas de verificação | Cobertura |
|---|---|---|---|
| **FR-01 — Buscar e selecionar cidades** (AC-01.1–AC-01.4) | T-01, T-06, T-08, T-09, T-14 | T-23, T-25, T-26, T-30, T-31, T-32 | Coberto |
| **FR-02 — Consultar clima atual** (AC-02.1–AC-02.5) | T-01, T-02, T-05, T-07, T-08, T-10, T-14 | T-19, T-22, T-24, T-25, T-27, T-30, T-32 | Coberto |
| **FR-03 — Consultar previsão de cinco dias** (AC-03.1–AC-03.4) | T-02, T-04, T-05, T-07, T-08, T-11, T-14 | T-19, T-21, T-22, T-24, T-25, T-28, T-30, T-32 | Coberto |
| **FR-04 — Alternar unidade de temperatura** (AC-04.1–AC-04.4) | T-03, T-04, T-08, T-12, T-14 | T-20, T-21, T-25, T-29, T-30, T-33 | Coberto |
| **FR-05 — Comunicar ausência de resultados e falhas** (AC-05.1–AC-05.5) | T-06, T-07, T-08, T-09, T-10, T-11, T-14 | T-23, T-24, T-25, T-26, T-27, T-28, T-30, T-32 | Coberto |

**Lacunas identificadas:** nenhuma. Todos os requisitos funcionais FR-01 a
FR-05 têm tarefas de implementação e verificação correspondentes. A matriz não
declara como requisitos funcionais os NFR e MS, que permanecem rastreados nas
tarefas de hardening.

## Priorização e tamanho relativo

**Prioridade:** P0 = essencial para entregar o MVP funcional e seguro; P1 =
necessário para qualidade e prontidão de lançamento; P2 = validação ou melhoria
que pode ocorrer depois da primeira entrega, sem substituir requisitos
obrigatórios de conformidade. **Tamanho:** P = pequeno (uma mudança focada),
M = médio (mais de um caso ou integração limitada), G = grande (maior
complexidade, risco ou coordenação). Tamanho é estimativa relativa, não prazo.

| Tarefa | Prioridade | Tamanho |
|---|---:|:---:|
| T-01 — Definir os tipos de domínio meteorológico | P0 | P |
| T-02 — Mapear códigos meteorológicos WMO | P0 | M |
| T-03 — Converter temperaturas entre unidades | P0 | P |
| T-04 — Formatar números meteorológicos em pt-BR | P0 | P |
| T-05 — Validar instantes, fusos e datas locais | P0 | G |
| T-06 — Implementar serviço de geocodificação | P0 | M |
| T-07 — Implementar serviço meteorológico combinado | P0 | G |
| T-08 — Implementar a orquestração da página | P0 | G |
| T-09 — Implementar busca e seleção de cidades | P0 | M |
| T-10 — Implementar apresentação do clima atual | P0 | P |
| T-11 — Implementar apresentação da previsão diária | P0 | M |
| T-12 — Implementar controle de unidade | P0 | P |
| T-13 — Implementar atribuição do provedor | P0 | P |
| T-14 — Compor a página Weather App | P0 | M |
| T-15 — Aplicar tema e layout responsivo | P0 | M |
| T-16 — Conectar a aplicação ao ponto de entrada | P0 | P |
| T-17 — Configurar testes unitários e de componentes | P0 | P |
| T-18 — Configurar execução E2E | P0 | M |
| T-19 — Testar mapeamento de códigos WMO | P0 | P |
| T-20 — Testar conversão de temperaturas | P0 | P |
| T-21 — Testar formatação pt-BR | P0 | P |
| T-22 — Testar validação de datas e fusos | P0 | M |
| T-23 — Testar serviço de geocodificação | P0 | M |
| T-24 — Testar serviço meteorológico combinado | P0 | G |
| T-25 — Testar hook e concorrência | P0 | M |
| T-26 — Testar componente de busca | P0 | M |
| T-27 — Testar componente de clima atual | P0 | P |
| T-28 — Testar componente de previsão | P0 | M |
| T-29 — Testar controle de unidade | P0 | P |
| T-30 — Testar integração da página | P0 | M |
| T-31 — Testar fluxo completo no navegador | P0 | M |
| T-32 — Testar falhas e estados parciais no navegador | P1 | M |
| T-33 — Testar unidade, teclado e viewports | P1 | M |
| T-34 — Executar lint, build e suíte unitária | P0 | M |
| T-35 — Auditar acessibilidade WCAG 2.2 AA | P1 | M |
| T-36 — Medir desempenho dos fluxos principais | P1 | G |
| T-37 — Avaliar usabilidade do fluxo principal | P2 | G |
| T-38 — Configurar sondas de disponibilidade | P1 | M |
| T-39 — Verificar limites e atribuição Open-Meteo | P0 | P |

## Sequência sugerida — fatias verticais

As fatias entregam valor observável antes de concluir todo o backlog. Executar
os testes da fatia junto com a implementação correspondente; não acumular
validação apenas ao final.

1. **Primeira tela útil — busca e clima atual:** T-01, T-02, T-05 a T-10,
   T-14 (implementação progressiva), T-15 e T-16; validar com T-17, T-19,
   T-22 a T-27. Entregar primeiro busca/seleção e cartão de clima atual com
   estados de loading e erro, para pesquisar uma cidade e ver seu clima.
2. **Previsão de cinco dias:** acrescentar T-11; completar T-14 e validar com
   T-18, T-28, T-30 a T-32. A fatia termina com cinco datas locais visíveis e
   verificadas no navegador.
3. **Unidade e atribuição completas:** T-03, T-04, T-12 e T-13; verificar com
   T-20, T-21, T-29, T-30 e T-33. A pessoa alterna todas as temperaturas e
   identifica a fonte dos dados.
4. **Resiliência e acessibilidade:** completar T-22 a T-28, T-32, T-33 e
   T-35. Cobrir respostas parciais/erros, retry manual, uso por teclado,
   estados acessíveis e viewports de tablet a desktop (até 1440 px).
5. **Prontidão operacional:** T-34, T-36, T-38 e T-39. Validar build, metas de
   desempenho, sondas, atribuição e limites antes do lançamento; executar T-37
   como avaliação posterior de usabilidade.

**Ajuste de planejamento:** o grafo atual coloca T-14 depois de todos os
componentes, o que impede uma integração literalmente incremental se cada
tarefa for tratada como indivisível. Para seguir a primeira fatia, iniciar
T-14 como composição progressiva e considerar a tarefa concluída apenas
quando todos os componentes e critérios estiverem integrados. Se o processo
exigir tarefas estritamente concluídas antes de iniciar dependentes, dividir
T-14 em integrações menores antes de executar o backlog.

## Entrega 8 — Hardening e prontidão

### T-34 — Executar lint, build e suíte unitária

- **Descrição:** Verificar qualidade estática, compilação de produção e testes
  após integrar a implementação.
- **Critérios de aceite:**
  - `pnpm lint`, `pnpm build` e `pnpm test` terminam com código zero.
  - Falhas são corrigidas ou registradas com causa e não são ignoradas.
- **Rastreabilidade:** Checklist de desenvolvimento do projeto; valida os AC
  implementados nas entregas anteriores.
- **Dependências:** T-19, T-20, T-21, T-22, T-23, T-24, T-25, T-26, T-27,
  T-28, T-29, T-30, T-31, T-32, T-33.
- **Arquivos prováveis:** `src/`, `tests/`, `package.json`.
- **Tipo:** Test

### T-35 — Auditar acessibilidade WCAG 2.2 AA

- **Descrição:** Executar checagens automatizadas e revisão manual dos fluxos
  principais.
- **Critérios de aceite:**
  - Checagens automatizadas dos fluxos principais não identificam violações
    não resolvidas.
  - Revisão manual registra resultados de teclado e leitor de tela conforme
    WCAG 2.2 AA; cada falha encontrada tem registro e decisão de correção.
- **Rastreabilidade:** NFR-03.
- **Dependências:** T-26, T-27, T-28, T-29, T-30, T-33.
- **Arquivos prováveis:** relatório de auditoria; alterações pontuais em
  `src/components/` se necessárias.
- **Tipo:** Test

### T-36 — Medir desempenho dos fluxos principais

- **Descrição:** Medir latência em build de produção nas condições de NFR-04.
- **Critérios de aceite:**
  - São coletadas pelo menos 100 medições por fluxo em navegador atualizado,
    dispositivo móvel intermediário e perfil 4G simulado.
  - p95 do envio da busca à renderização dos resultados é ≤ 2 s; p95 da
    seleção à renderização das seções válidas é ≤ 3 s.
  - Ambiente, amostras e percentis obtidos ficam registrados; cada limite
    excedido gera ação corretiva registrada.
- **Rastreabilidade:** NFR-04.
- **Dependências:** T-31, T-34.
- **Arquivos prováveis:** `tests/e2e/weather-performance.spec.ts`,
  relatório de medições.
- **Tipo:** Test

### T-37 — Avaliar usabilidade do fluxo principal

- **Descrição:** Conduzir teste moderado com participantes representativos
  para validar a métrica de sucesso.
- **Critérios de aceite:**
  - Dez participantes tentam, sem ajuda, buscar e selecionar a cidade,
    localizar condição/temperatura atuais e identificar cinco datas,
    mínimas/máximas e unidade.
  - Cada participante só conta como sucesso se concluir todos os passos; são
    registrados resultados e obstáculos observados.
  - O resultado informa se pelo menos 8 de 10 participantes concluíram sem
    ajuda.
- **Rastreabilidade:** MS-01.
- **Dependências:** T-31, T-32, T-33.
- **Arquivos prováveis:** roteiro e relatório de usabilidade.
- **Tipo:** Test

### T-38 — Configurar sondas de disponibilidade

- **Descrição:** Monitorar separadamente a disponibilidade da aplicação e do
  provedor de dados.
- **Critérios de aceite:**
  - Sonda externa executada a cada minuto verifica resposta da aplicação e
    renderização dos controles principais.
  - A disponibilidade do Open-Meteo é medida separadamente e não é contada
    como indisponibilidade da aplicação.
  - A configuração permite calcular a meta mensal de 99,9%.
- **Rastreabilidade:** NFR-05.
- **Dependências:** T-16.
- **Arquivos prováveis:** configuração da plataforma de deploy/monitoramento.
- **Tipo:** Infra

### T-39 — Verificar limites e atribuição Open-Meteo

- **Descrição:** Confirmar obrigações operacionais e monitoramento do consumo
  antes do lançamento.
- **Critérios de aceite:**
  - Antes do lançamento, termos, limites vigentes e atribuição são
    reconfirmados e registrados.
  - Consumo é monitorado; há gatilho documentado para reavaliar o plano antes
    de aproximar-se dos limites ou caso o produto passe a ser comercial ou
    exiba anúncios.
- **Rastreabilidade:** NFR-07.
- **Dependências:** T-13, T-30.
- **Arquivos prováveis:** documentação operacional e registro de verificação.
- **Tipo:** Infra
