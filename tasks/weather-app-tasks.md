# Backlog de Tarefas — Weather App

Backlog revisado a partir do [plano técnico](../plans/weather-app-plan.md).
As tarefas estão agrupadas por entrega e em ordem topológica; cada dependência
precisa estar concluída antes do início da tarefa. Os critérios são
verificáveis e mapeados aos critérios de aceite (AC) e requisitos não
funcionais (NFR) da especificação.

## Entrega 1 — Fundamentos e contratos

### T-01 — Configurar testes unitários e de componentes

- **Descrição:** Preparar a configuração comum de Vitest para testes unitários
  e de componentes em ambiente DOM.
- **Critérios de aceite:**
  - Vitest carrega o ambiente DOM e o setup comum de testes.
  - `pnpm test` executa os testes unitários e de componentes.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `vite.config.ts`, `tests/setup.ts`.
- **Tipo:** Infra

### T-02 — Configurar a infraestrutura E2E

- **Descrição:** Preparar Playwright para executar fluxos reproduzíveis no
  navegador com respostas de API interceptadas.
- **Critérios de aceite:**
  - `pnpm test:e2e` inicia a suíte Playwright.
  - Os testes podem interceptar os endpoints Open-Meteo sem acessar a API
    pública.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `playwright.config.ts`, `tests/e2e/fixtures/`.
- **Tipo:** Infra

### T-03 — Definir os tipos de domínio meteorológico

- **Descrição:** Criar contratos TypeScript para localidade, unidade,
  condições atuais, dias de previsão e estados assíncronos.
- **Critérios de aceite:**
  - Os tipos representam os campos definidos no plano, incluindo medições
    opcionais, unidade Celsius/Fahrenheit e resultado parcial da previsão.
  - Busca, clima atual e previsão distinguem `idle`, `loading`, `success`,
    `empty` e `error`, com a causa do erro tipada.
  - Os dados meteorológicos não dependem de tipos DTO da API nem de React.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `src/types/weather.ts`.
- **Tipo:** Data

### T-04 — Mapear códigos meteorológicos WMO

- **Descrição:** Implementar o mapeamento puro de códigos WMO para descrições
  em português do Brasil.
- **Critérios de aceite:**
  - Cada código reconhecido retorna sua descrição pt-BR.
  - Código ausente ou não reconhecido pode ser identificado sem inventar
    condição; a UI poderá exibir “Condição indisponível” para clima atual.
  - A função não importa React nem faz chamadas de rede.
- **Dependências:** T-03.
- **Arquivos prováveis:** `src/lib/weatherCode.ts`.
- **Tipo:** Data

### T-05 — Implementar conversão de temperatura

- **Descrição:** Criar funções puras para converter temperaturas entre Celsius
  e Fahrenheit.
- **Critérios de aceite:**
  - Fahrenheit usa `°F = °C × 9/5 + 32`.
  - Celsius retorna o valor original sem alteração.
  - A conversão não modifica os dados de entrada.
- **Dependências:** T-03.
- **Arquivos prováveis:** `src/lib/temperature.ts`.
- **Tipo:** Data

### T-06 — Implementar formatação pt-BR

- **Descrição:** Criar função pura para formatar valores meteorológicos para
  exibição em pt-BR.
- **Critérios de aceite:**
  - Temperaturas são arredondadas a uma casa decimal, formatadas com vírgula e
    identificadas pelo símbolo da unidade.
  - Datas meteorológicas são formatadas como `dd/MM/yyyy`.
  - Valores de domínio não são alterados pela formatação.
- **Dependências:** T-03.
- **Arquivos prováveis:** `src/lib/format.ts`.
- **Tipo:** Data

### T-07 — Validar instantes, fusos e datas locais

- **Descrição:** Implementar utilitários puros para validar instante de
  observação, fuso IANA e datas locais do período de previsão.
- **Critérios de aceite:**
  - O horário atual é interpretado com o deslocamento UTC retornado pela API e
    só é válido entre o início da solicitação menos 60 minutos e o momento
    atual.
  - Fuso ausente ou inválido é detectado antes de calcular a data local.
  - O intervalo da previsão é hoje até hoje + 4 no fuso da localidade, sem
    depender implicitamente do fuso do navegador.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `src/lib/date.ts`.
- **Tipo:** Data

## Entrega 2 — Testes das funções puras

### T-08 — Testar o mapeamento WMO

- **Descrição:** Verificar códigos reconhecidos e não reconhecidos com testes
  unitários determinísticos.
- **Critérios de aceite:**
  - Cada código WMO suportado tem sua descrição pt-BR verificada.
  - Código ausente ou desconhecido não produz descrição inventada.
  - Os testes não usam rede.
- **Dependências:** T-01, T-04.
- **Arquivos prováveis:** `tests/unit/weatherCode.test.ts`.
- **Tipo:** Test

### T-09 — Testar conversão e formatação

- **Descrição:** Cobrir conversão de unidades e formatação pt-BR de
  temperatura/data.
- **Critérios de aceite:**
  - Testes cobrem fórmula Fahrenheit, preservação Celsius, precisão de uma
    casa decimal, vírgula decimal, símbolos e formatação de data.
  - Casos de borda e valores inválidos têm comportamento verificado.
  - Os testes não usam rede nem modificam os valores de entrada.
- **Dependências:** T-01, T-05, T-06.
- **Arquivos prováveis:** `tests/unit/temperature.test.ts`,
  `tests/unit/format.test.ts`.
- **Tipo:** Test

### T-10 — Testar validação de datas e fusos

- **Descrição:** Cobrir validação de instante, fuso e período local com tempo
  de referência controlado.
- **Critérios de aceite:**
  - Testes cobrem horário ausente, inválido, antigo ou futuro e offset UTC.
  - Testes cobrem fuso IANA inválido e os limites de hoje a hoje + 4 em fusos
    locais distintos.
  - Os testes não dependem do relógio real nem da rede.
- **Dependências:** T-01, T-07.
- **Arquivos prováveis:** `tests/unit/date.test.ts`.
- **Tipo:** Test

## Entrega 3 — Integração com Open-Meteo

### T-11 — Implementar serviço de geocodificação

- **Descrição:** Consultar o endpoint de geocoding e converter respostas
  válidas em localidades do domínio.
- **Critérios de aceite:**
  - A consulta usa HTTPS, `URLSearchParams`, texto aparado, `count=10`,
    `language=pt` e `format=json`.
  - Resultados válidos são mapeados para `City`, preservando coordenadas e
    incluindo região e país somente quando fornecidos.
  - Lista ausente ou vazia em resposta válida resulta em busca sem resultados;
    falha HTTP, erro explícito da API, JSON inválido, estrutura incompatível,
    rede ou timeout não são tratados como lista vazia.
  - A requisição tem timeout de 10 segundos e pode ser cancelada.
- **Dependências:** T-03.
- **Arquivos prováveis:** `src/services/geocodingService.ts`.
- **Tipo:** Data

### T-12 — Testar serviço de geocodificação

- **Descrição:** Verificar parâmetros, mapeamento e falhas do geocoding com
  `fetch` mockado.
- **Critérios de aceite:**
  - Testes verificam caracteres especiais e acentos enviados como dado,
    parâmetros da URL e mapeamento dos campos opcionais.
  - São cobertos resultados válidos, lista vazia, rede, HTTP, erro da API, JSON
    inválido, resposta incompatível, timeout e cancelamento.
  - Nenhum teste acessa a API pública.
- **Dependências:** T-01, T-11.
- **Arquivos prováveis:** `tests/unit/geocodingService.test.ts`.
- **Tipo:** Test

### T-13 — Implementar serviço meteorológico combinado

- **Descrição:** Consultar clima atual e previsão em uma chamada e validar cada
  seção independentemente.
- **Critérios de aceite:**
  - A URL usa coordenadas da localidade, `forecast_days=5`, campos `current` e
    `daily` do plano, Celsius, km/h, mm e `timezone=auto`; parâmetros são
    serializados com `URLSearchParams`.
  - Clima atual exige temperatura finita e horário válido; código WMO ausente
    ou desconhecido não invalida a temperatura.
  - Previsão valida fuso IANA, arrays e cada dia separadamente; inclui somente
    datas completas, únicas e dentro de hoje até hoje + 4, em ordem
    cronológica. Mínima não pode exceder máxima e o código WMO deve ser
    reconhecido. Precipitação ausente não invalida um dia.
  - Cinco dias consecutivos válidos formam previsão completa; os dias válidos
    em resposta parcial são mantidos sem inventar valores. Fuso inválido torna
    a previsão indisponível sem invalidar clima atual válido.
  - A chamada tem timeout de 10 segundos, suporta cancelamento e não converte
    falhas HTTP ou de transporte em dados válidos.
- **Dependências:** T-03, T-04, T-07.
- **Arquivos prováveis:** `src/services/weatherService.ts`.
- **Tipo:** Data

### T-14 — Testar serviço meteorológico

- **Descrição:** Verificar URL, mapeamento, validação parcial e falhas da
  resposta combinada com `fetch` mockado.
- **Critérios de aceite:**
  - Testes verificam parâmetros e modelos normalizados de clima atual e
    previsão.
  - São cobertos dados inválidos, códigos desconhecidos, fuso inválido,
    campos diários ausentes, mínima maior que máxima, duplicatas, datas fora
    do período, previsão parcial e completa.
  - São cobertos rede, HTTP, erro da API, JSON inválido, estrutura
    incompatível, timeout e cancelamento.
  - Casos com apenas uma seção válida comprovam a validação independente.
  - Nenhum teste acessa a API pública.
- **Dependências:** T-01, T-13.
- **Arquivos prováveis:** `tests/unit/weatherService.test.ts`.
- **Tipo:** Test

## Entrega 4 — Estado e orquestração

### T-15 — Implementar a orquestração da página

- **Descrição:** Criar o hook que coordena busca, seleção, consulta combinada,
  unidade e estados independentes.
- **Critérios de aceite:**
  - Busca remove apenas espaços externos; entrada vazia não chama serviço e
    solicita o nome da cidade.
  - Busca, clima atual e previsão têm estados assíncronos independentes;
    busca vazia e falhas mantêm estados distintos.
  - Selecionar cidade inicia uma consulta combinada, limpa os dados da cidade
    anterior e mantém a unidade escolhida.
  - Respostas tardias não substituem o estado mais recente; operações podem
    ser canceladas ou ignoradas com segurança.
  - Retry meteorológico só ocorre por ação explícita e repete a consulta da
    localidade selecionada.
- **Dependências:** T-03, T-11, T-13.
- **Arquivos prováveis:** `src/hooks/useWeatherApp.ts`.
- **Tipo:** Data

### T-16 — Testar estados e concorrência do hook

- **Descrição:** Testar transições do hook isolando os serviços.
- **Critérios de aceite:**
  - São cobertos entrada vazia, carregamento, resultados, ausência de
    resultados, erro de busca, seleção e estados meteorológicos válidos ou
    inválidos independentes.
  - Retry só ocorre após ação explícita e repete a consulta da cidade
    selecionada.
  - Troca de cidade limpa dados anteriores, preserva a unidade e impede que
    uma resposta antiga sobrescreva a seleção atual.
- **Dependências:** T-01, T-15.
- **Arquivos prováveis:** `tests/unit/useWeatherApp.test.ts`.
- **Tipo:** Test

## Entrega 5 — Componentes de interface

### T-17 — Implementar busca e seleção de cidades

- **Descrição:** Criar o formulário e a lista de resultados de geocoding com
  estados acessíveis.
- **Critérios de aceite:**
  - A pessoa envia a busca por teclado ou controle visível; resultados
    apresentam nome e, quando disponíveis, região e país.
  - Cada resultado é selecionável por teclado e identifica corretamente a
    localidade escolhida.
  - Loading, entrada necessária, busca vazia, erro e retry têm mensagens e
    controles distintos e acessíveis.
- **Dependências:** T-03, T-15.
- **Arquivos prováveis:** `src/components/CitySearch.tsx`.
- **Tipo:** UI

### T-18 — Implementar apresentação do clima atual

- **Descrição:** Exibir condições atuais e comunicar carregamento, dados
  indisponíveis e retry.
- **Critérios de aceite:**
  - A seção apresenta localidade, temperatura na unidade selecionada e
    condição em pt-BR.
  - Código WMO ausente ou desconhecido exibe “Condição indisponível” sem
    ocultar temperatura válida.
  - Erro ou dado indisponível não apresenta valores da cidade anterior e
    permite retry manual.
- **Dependências:** T-03, T-05, T-06, T-15.
- **Arquivos prováveis:** `src/components/CurrentWeather.tsx`.
- **Tipo:** UI

### T-19 — Implementar apresentação da previsão diária

- **Descrição:** Exibir dias válidos da previsão e diferenciar sucesso completo,
  parcial e indisponível.
- **Critérios de aceite:**
  - Cada dia apresenta data `dd/MM/yyyy`, condição e mínima/máxima na unidade
    ativa, em ordem cronológica.
  - Previsão parcial mostra somente dias válidos e informa “Previsão
    incompleta. Alguns dias estão indisponíveis.”.
  - Previsão indisponível mostra “Previsão indisponível para esta cidade.” e
    retry é manual.
- **Dependências:** T-03, T-05, T-06, T-15.
- **Arquivos prováveis:** `src/components/DailyForecast.tsx`.
- **Tipo:** UI

### T-20 — Implementar controle de unidade

- **Descrição:** Criar controle acessível para alternar Celsius e Fahrenheit.
- **Critérios de aceite:**
  - A unidade inicial é Celsius e a seleção atual é comunicada
    semanticamente.
  - Alternar unidade atualiza temperaturas sem alterar dados canônicos nem
    disparar nova consulta.
  - A unidade permanece selecionada ao trocar cidade na mesma página.
- **Dependências:** T-03, T-05.
- **Arquivos prováveis:** `src/components/TemperatureUnitToggle.tsx`.
- **Tipo:** UI

### T-21 — Adicionar atribuição do provedor

- **Descrição:** Exibir atribuição próxima aos dados meteorológicos
  disponíveis.
- **Critérios de aceite:**
  - Quando há dados meteorológicos, aparece o link “Weather data by
    Open-Meteo.com” para `https://open-meteo.com/`.
  - O link tem nome acessível e funciona por teclado.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `src/components/WeatherAttribution.tsx`.
- **Tipo:** UI

### T-22 — Compor a página Weather App

- **Descrição:** Integrar o hook e os componentes em uma página única.
- **Critérios de aceite:**
  - Busca, seleção, estados meteorológicos, unidade e retry estão conectados
    ao hook.
  - Dados antigos não são associados à nova cidade; uma seção válida continua
    visível quando a outra falha.
  - A página apresenta conteúdo em pt-BR.
- **Dependências:** T-15, T-17, T-18, T-19, T-20, T-21.
- **Arquivos prováveis:** `src/App.tsx`.
- **Tipo:** UI

### T-23 — Implementar estilos globais e responsivos

- **Descrição:** Definir a base visual dark glassmorphism e os estilos globais
  responsivos.
- **Critérios de aceite:**
  - Estilos globais aplicam o tema e não causam rolagem horizontal em viewport
    de 320 px até desktop de 1440 px.
  - A folha de estilos permanece responsável pela apresentação, sem lógica de
    acesso a dados.
- **Dependências:** Nenhuma.
- **Arquivos prováveis:** `src/styles/index.css`.
- **Tipo:** UI

### T-24 — Conectar a página ao ponto de entrada

- **Descrição:** Montar o componente raiz no ponto de entrada React e carregar
  os estilos globais da aplicação.
- **Critérios de aceite:**
  - A entrada renderiza `App` no elemento raiz do documento.
  - A entrada importa os estilos globais; build e renderização inicial não
    produzem erros.
- **Dependências:** T-22, T-23.
- **Arquivos prováveis:** `src/main.tsx`.
- **Tipo:** Infra

## Entrega 6 — Testes de componentes

### T-25 — Testar busca e seleção de cidades

- **Descrição:** Cobrir comportamento e acessibilidade do componente de busca.
- **Critérios de aceite:**
  - Testes verificam envio por teclado, apresentação contextual dos resultados
    e seleção de uma cidade.
  - Loading, entrada necessária, busca sem resultados e erro/retry são
    distinguidos.
  - Os testes usam roles e nomes acessíveis.
- **Dependências:** T-01, T-17.
- **Arquivos prováveis:** `tests/components/CitySearch.test.tsx`.
- **Tipo:** Test

### T-26 — Testar apresentação do clima atual

- **Descrição:** Cobrir estados e valores exibidos pelo componente de clima
  atual.
- **Critérios de aceite:**
  - Testes verificam temperatura/unidade, condição reconhecida e condição
    indisponível com temperatura válida.
  - Estados de loading, erro e retry não exibem dados de outra localidade.
- **Dependências:** T-01, T-18.
- **Arquivos prováveis:** `tests/components/CurrentWeather.test.tsx`.
- **Tipo:** Test

### T-27 — Testar apresentação da previsão diária

- **Descrição:** Cobrir previsão completa, parcial e indisponível no
  componente diário.
- **Critérios de aceite:**
  - Testes verificam ordem, data, condição e temperaturas dos dias válidos.
  - Previsão parcial não preenche dias ausentes e apresenta a mensagem
    correspondente; erro oferece retry manual.
- **Dependências:** T-01, T-19.
- **Arquivos prováveis:** `tests/components/DailyForecast.test.tsx`.
- **Tipo:** Test

### T-28 — Testar controle de unidade

- **Descrição:** Verificar acessibilidade e interação do controle Celsius /
  Fahrenheit.
- **Critérios de aceite:**
  - Testes verificam unidade inicial, mudança e anúncio semântico da seleção.
  - Alterar unidade não dispara consulta meteorológica.
- **Dependências:** T-01, T-20.
- **Arquivos prováveis:** `tests/components/TemperatureUnitToggle.test.tsx`.
- **Tipo:** Test

### T-29 — Testar integração da página

- **Descrição:** Verificar a integração de estados e ações na página composta.
- **Critérios de aceite:**
  - Testes cobrem seleção de cidade, exibição de dados, falha independente
    entre as seções e ação de retry.
  - Alternar unidade atualiza os valores exibidos sem nova chamada aos
    serviços.
- **Dependências:** T-01, T-24.
- **Arquivos prováveis:** `tests/components/App.test.tsx`.
- **Tipo:** Test

## Entrega 7 — Testes ponta a ponta e prontidão

### T-30 — Testar o fluxo meteorológico completo com Playwright

- **Descrição:** Validar busca, seleção, clima atual e previsão completa no
  navegador.
- **Critérios de aceite:**
  - O fluxo seleciona a localidade correta e apresenta clima atual e cinco
    dias em ordem.
  - Os endpoints são interceptados e a suíte não depende da API pública.
- **Dependências:** T-02, T-24.
- **Arquivos prováveis:** `tests/e2e/weather.spec.ts`.
- **Tipo:** Test

### T-31 — Testar falhas e previsão parcial com Playwright

- **Descrição:** Validar ausência de resultados, falhas, retry e resposta
  parcial no navegador.
- **Critérios de aceite:**
  - Cenários verificam busca sem resultados e erro de consulta com retry
    manual.
  - Resposta meteorológica com uma seção inválida preserva a seção válida;
    previsão parcial mostra somente dias válidos e o aviso correspondente.
  - Endpoints são interceptados e nenhuma falha é disfarçada como dado válido.
- **Dependências:** T-02, T-24.
- **Arquivos prováveis:** `tests/e2e/weather-errors.spec.ts`.
- **Tipo:** Test

### T-32 — Testar unidade, teclado e responsividade com Playwright

- **Descrição:** Validar alternância de unidade e uso da interface em
  diferentes viewports e por teclado.
- **Critérios de aceite:**
  - Alternar Celsius/Fahrenheit atualiza todas as temperaturas e não cria
    request adicional.
  - Fluxos principais são operáveis por teclado.
  - Viewports de 320 px e até 1440 px não apresentam rolagem horizontal.
- **Dependências:** T-02, T-24.
- **Arquivos prováveis:** `tests/e2e/weather-accessibility.spec.ts`.
- **Tipo:** Test

### T-33 — Auditar acessibilidade WCAG 2.2 AA

- **Descrição:** Executar checagens automatizadas e revisão manual dos fluxos
  principais.
- **Critérios de aceite:**
  - Componentes e fluxos principais passam pelas checagens automatizadas
  selecionadas.
  - Teclado e leitor de tela são revisados manualmente conforme WCAG 2.2 AA
    (NFR-03), com problemas encontrados registrados.
- **Dependências:** T-25, T-26, T-27, T-28, T-29, T-32.
- **Arquivos prováveis:** `tests/e2e/weather-accessibility.spec.ts`,
  relatório de auditoria.
- **Tipo:** Test

### T-34 — Medir latência dos fluxos principais

- **Descrição:** Medir o desempenho em build de produção no ambiente definido
  pelo NFR-04.
- **Critérios de aceite:**
  - Medições usam navegador atualizado, dispositivo móvel intermediário e
    perfil 4G; coletam pelo menos 100 amostras por fluxo.
  - p95 é de até 2 s do envio da busca à renderização dos resultados e até
    3 s da seleção à renderização das seções válidas.
  - Resultado e ambiente das medições ficam registrados.
- **Dependências:** T-30.
- **Arquivos prováveis:** `tests/e2e/weather-performance.spec.ts`,
  relatório de medições.
- **Tipo:** Test

### T-35 — Avaliar usabilidade com participantes

- **Descrição:** Conduzir teste moderado da tarefa principal com participantes
  representativos.
- **Critérios de aceite:**
  - Dez participantes tentam concluir sem ajuda busca, seleção, leitura de
    condições atuais, cinco datas, mínimas/máximas e unidade (MS-01).
  - São registrados conclusão, necessidade de ajuda e obstáculos observados.
  - A meta do critério é atingida com pelo menos oito conclusões sem ajuda.
- **Dependências:** T-24.
- **Arquivos prováveis:** roteiro de teste e relatório de usabilidade.
- **Tipo:** Test

### T-36 — Preparar monitoramento operacional

- **Descrição:** Configurar sondas de disponibilidade para aplicação e
  provedor.
- **Critérios de aceite:**
  - Uma sonda externa verifica a cada minuto disponibilidade da aplicação e
    renderização de controles (NFR-05).
  - Disponibilidade do Open-Meteo é acompanhada separadamente da aplicação.
- **Dependências:** T-24.
- **Arquivos prováveis:** configuração da plataforma de deploy/monitoramento.
- **Tipo:** Infra

### T-37 — Verificar conformidade operacional do Open-Meteo

- **Descrição:** Confirmar obrigações, limites e monitoramento de consumo antes
  do lançamento.
- **Critérios de aceite:**
  - Antes do lançamento, termos, limites vigentes e obrigações de atribuição
    do Open-Meteo são verificados e registrados.
  - Consumo é monitorado e há condição documentada para reavaliar o plano ao
    aproximar-se dos limites ou em caso de uso comercial/anúncios (NFR-07).
- **Dependências:** T-21.
- **Arquivos prováveis:** documentação operacional aplicável e registro da
  verificação pré-lançamento.
- **Tipo:** Infra
