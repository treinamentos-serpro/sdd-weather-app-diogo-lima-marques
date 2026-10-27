<div align="center">

# SDD Weather App

### Treinamento hands-on de **Spec-Driven Development** com **GitHub Copilot**

**Brief → Spec → Plan → Tasks → Code → Test → Review → Ship**

</div>

---

Este repositório é um **laboratório de treinamento de 8 horas** que ensina a
construir software guiado por especificação (**Spec-Driven Development**) usando
o **GitHub Copilot** em todas as etapas. O projeto final é um **Weather App** em
React + TypeScript que consome a API Open-Meteo.

> ## Princípio central
> **NÃO COMECE PELO CÓDIGO.** Sempre: **Spec → Plan → Tasks → Code.**

---

## O workshop

Comece pelo **[Guia do Workshop](workshop/GUIDE.md)** e siga os módulos em ordem.

| # | Módulo | Fase | Duração |
| --- | --- | --- | --- |
| 01 | [Setup](workshop/module-01-setup/README.md) | Preparação | 30 min |
| 02 | [Understanding the Problem](workshop/module-02-discovery/README.md) | Discovery | 45 min |
| 03 | [Writing the Specification](workshop/module-03-spec/README.md) | Spec | 50 min |
| 04 | [Creating the Technical Plan](workshop/module-04-plan/README.md) | Plan | 45 min |
| 05 | [Breaking Down Tasks](workshop/module-05-tasks/README.md) | Tasks | 40 min |
| 06 | [Building the UI](workshop/module-06-ui/README.md) | Code | 60 min |
| 07 | [Integrating APIs](workshop/module-07-api/README.md) | Code | 60 min |
| 08 | [Testing](workshop/module-08-testing/README.md) | Test | 55 min |
| 09 | [Hardening](workshop/module-09-hardening/README.md) | Test | 50 min |
| 10 | [Pull Request Review](workshop/module-10-review/README.md) | Review | 45 min |
| 11 | [Delivery (GitHub Pages)](workshop/module-11-delivery/README.md) | Ship | 30 min |

Cada módulo tem **README.md**, **challenge.md**, **prompts.md** e
**solution.md**.

---

## Começando

### Pré-requisitos

- **Node.js**
- **pnpm** (único gerenciador de pacotes suportado — habilite com `corepack enable`)
- **GitHub Copilot** habilitado no VS Code
- Git e uma conta no GitHub (para PR e deploy)

> O repositório inclui um **DevContainer** com tudo pré-configurado. Abra em um
> Codespace ou em "Reopen in Container" e pule a instalação manual.

### Instalação

```bash
pnpm install
pnpm exec playwright install   # navegadores para os testes E2E
```

### Scripts

```bash
pnpm dev             # servidor de desenvolvimento (Vite)
pnpm build           # build de produção
pnpm preview         # serve o build localmente
pnpm lint            # Biome (lint)
pnpm format          # Biome (formatação)
pnpm check           # Biome (lint + formatação)
pnpm test            # testes unitários (Vitest)
pnpm test:coverage   # cobertura
pnpm test:e2e        # testes E2E (Playwright)
```

---

## Arquitetura do app

```text
src/
├── components/      # apresentação (um componente por arquivo)
│   └── states/      # loading, erro, vazio
├── hooks/           # orquestração (useWeather)
├── services/        # acesso a dados (Open-Meteo) isolado
├── lib/             # funções puras (conversão, formatação, códigos WMO)
├── types/           # contratos compartilhados
├── styles/          # Tailwind + estilos globais
├── App.tsx          # composição da tela
└── main.tsx         # bootstrap React
```

Decisões-chave:

- **Temperaturas em Celsius** internamente; conversão só na apresentação (o
  toggle °C/°F **não** faz nova requisição).
- **Rede isolada** em `services/` — componentes e hooks não conhecem URLs.
- Sempre tratar **loading**, **erro** e **vazio**.

---

## Dados mock para desenvolver a UI

Os contratos de domínio estão em [src/types/weather.ts](src/types/weather.ts).
Para desenvolver componentes sem consultar a API, importe o objeto tipado:

```ts
import { mockWeatherData } from './mocks/weather';
```

O caminho acima é relativo a um arquivo diretamente em `src/`. O
[mock](src/mocks/weather.ts) contém São Paulo, condições atuais e cinco dias
consecutivos de previsão, com temperaturas em Celsius e descrições pt-BR.
Os dados são fictícios e as datas são fixas (27 a 31/10/2026), no fuso
`America/Sao_Paulo`, para manter o exemplo determinístico. Não representam
uma consulta atual e não devem passar pela validação de atualidade da API.

## Busca de cidades

O componente [SearchBar](src/components/SearchBar.tsx) recebe `onSearch(city: string)`
e `disabled` (opcional, `false` por padrão). O formulário tem `role="search"` e
label visível; permite enviar por Enter ou pelo botão Buscar. Remove espaços
externos antes de chamar `onSearch` e, para entrada vazia, mostra
“Informe o nome de uma cidade.” sem disparar a busca. Quando desabilitado,
bloqueia o campo e o envio. Não faz chamadas à API.

## Controle de unidade

O componente [UnitToggle](src/components/UnitToggle.tsx) recebe `unit`
(`'celsius' | 'fahrenheit'`) e `onChange(unit)`. É controlado pelo componente
pai, que deve iniciar a unidade em Celsius e atualizar a prop após a escolha.
Os botões °C/°F usam `aria-pressed` dentro de um grupo com nome acessível.
Navegue com Tab/Shift+Tab e ative com Enter ou Espaço. O controle não converte
temperaturas nem faz chamadas à API.

## Clima atual

O hero [CurrentWeather](src/components/CurrentWeather.tsx) recebe `city`, `current`
e `unit`. Mostra temperatura, condição pt-BR e métricas com unidades explícitas;
medições ausentes aparecem como “Indisponível”, sem inventar valores. Código
WMO ausente ou desconhecido mostra “Condição indisponível” sem ícone.

Os ícones decorativos e descrições WMO ficam em
[weatherCodes](src/lib/weatherCodes.ts). A conversão pura em
[temperature](src/lib/temperature.ts) preserva Celsius como valor canônico;
[format](src/lib/format.ts) aplica a unidade e uma casa decimal em pt-BR
somente na apresentação. O componente não consulta a API nem valida a atualidade
da observação; essa validação pertence ao serviço.

## Previsão e estados reutilizáveis

[ForecastList](src/components/ForecastList.tsx) recebe `forecast`, `unit` e
`isIncomplete` opcional. Ordena os dias recebidos sem modificar a entrada,
mostra aviso de previsão parcial e usa grid de 2/3/5 colunas. Datas únicas e
dados válidos são responsabilidade do serviço. Cada
[ForecastCard](src/components/ForecastCard.tsx) recebe `day` e `unit` e mostra
dia/data local, condição, ícone, máxima/mínima e probabilidade de chuva.
`precipitationProbabilityPercent` é opcional, de 0 a 100; ausente ou inválido
aparece como “Indisponível”. Não é calculado a partir de `precipitationMm`.
O mock contém porcentagens fictícias para desenvolver a UI.

Estados disponíveis em [src/components/states/](src/components/states/):
- `LoadingState`: `message` opcional e `role="status"`.
- `ErrorState`: `message` e `onRetry`; botão “Tentar novamente”, sem retry automático.
- `EmptyState`: `title` e `hint`.

## Executando a UI com mock

Execute `pnpm dev` e abra a URL indicada pelo Vite. A tela
[App](src/App.tsx) inicia em `success`, com header, busca, seletor de unidade,
hero, cinco cards e atribuição. O bootstrap está em [main](src/main.tsx) e
o Tailwind global em [styles/index.css](src/styles/index.css).

Para inspecionar outros estados, altere temporariamente a montagem em
`main.tsx`, por exemplo: `<App initialStatus="loading" />`. Valores disponíveis:
`idle`, `loading`, `empty`, `error` e `success`. No erro, “Tentar novamente”
reapresenta o mock. Loading desabilita a busca, sem usar temporizadores.

A busca é uma simulação local: `São Paulo` (sem distinguir maiúsculas ou
acentos) mostra o mock; outros nomes mostram vazio. O aviso na tela identifica
os dados fictícios e suas datas fixas. Não há rede meteorológica, persistência
ou hook de API nesta etapa. A unidade é estado da UI, inicia em Celsius e
permanece selecionada ao alternar entre vazio e sucesso, sem alterar o mock.

Os testes de layout em navegador estão em
[app-layout.spec.ts](tests/e2e/app-layout.spec.ts). Execute
`pnpm exec playwright test tests/e2e/app-layout.spec.ts --project=chromium`
para verificar 320/768/1440 px, o grid 2/3/5, ausência de rolagem horizontal
e troca de unidade com busca local. O Chromium e suas dependências de sistema
devem estar instalados (`pnpm exec playwright install --with-deps chromium`).

## Acessibilidade e responsividade

- Busca com label visível, descrição do erro e foco no campo inválido.
- Resultados de busca anunciados por uma região `status` persistente, sem
  tirar o foco da busca. Loading não fica dentro de uma região `aria-busy`
  que possa adiar o anúncio. Retry devolve foco ao conteúdo após remover o botão.
- Skip link no início da ordem de Tab, com foco visível também no destino.
- Borda do input com contraste mínimo de 3:1; textos com mínimo de 4,5:1
  nos fundos do tema. Ícones são decorativos e têm descrição textual adjacente.
- Reflow de 320 a 1440 px, incluindo texto a 200%, nomes longos e métricas
  indisponíveis. As métricas usam uma coluna em telas muito estreitas; o grid
  da previsão mantém 2/3/5 colunas, com quebra de palavras e cards de altura uniforme.

Os testes em [accessibility.spec.ts](tests/e2e/accessibility.spec.ts) verificam
teclado, foco, regiões de anúncio, contraste calculado e reflow. Execute
`pnpm exec playwright test --project=chromium --workers=1`. Esses testes não
substituem validação manual com leitores de tela nem certificam conformidade
WCAG completa; essa validação deve acompanhar a integração dos estados reais.

## Stack

- **TypeScript** (strict) · **React** · **Vite**
- **Tailwind CSS** (tema dark glassmorphism)
- **Vitest** + **Testing Library** (unit) · **Playwright** (E2E)
- **Biome** (lint + formatação)
- **pnpm** (gerenciador de pacotes)
- **Open-Meteo** (geocoding + forecast, sem API key)

---

## Copilot no fluxo SDD

A pasta `.github/` traz a inteligência do laboratório:

- **`agents/`** — personas especializadas: Spec, Plan, Task, Code, Test, Review.
- **`prompts/`** — prompts de produção para cada etapa.
- **`instructions/`** — convenções (React, Tailwind, Testing) aplicadas
  automaticamente.
- **`workflows/`** — CI (lint/build/test/e2e), deploy no Pages e validações que
  **impõem a ordem Spec → Plan → Tasks**.

Veja [AGENTS.md](AGENTS.md) para a descrição de cada agente.

---

## Idioma

- Narrativa, comentários e documentação: **pt-BR**.
- Identificadores de código, nomes de arquivos e termos técnicos: **en-US**.

---

<div align="center">

Construído com ❤️ para capacitar times em **Spec-Driven Development** usando o poder do GitHub Copilot.

</div>
