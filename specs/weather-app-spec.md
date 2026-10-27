# Especificação de Produto — Weather App

## Overview

O Weather App é uma aplicação web para buscar cidades e consultar condições meteorológicas atuais e uma previsão de cinco dias. A persona prioritária do MVP é a pessoa que planeja a rotina: ela deve encontrar sua cidade e consultar, em uma única tela, o clima atual e a previsão para os próximos dias, com resultados claros e consistentes. As demais personas do discovery são secundárias; todas ainda são hipóteses comportamentais, não segmentos validados por pesquisa.

Decisões confirmadas para esta especificação:

- Fonte de dados: Open-Meteo, sem API key.
- Período da previsão: hoje e os quatro dias seguintes.
- Unidade padrão de temperatura: Celsius; o usuário pode alternar para Fahrenheit.
- Idioma da interface: português do Brasil (pt-BR).
- Não haverá autenticação nem persistência de dados do usuário no servidor.

O objetivo é permitir que a pessoa encontre a cidade correta e consulte as condições meteorológicas sem ambiguidades de localidade, período ou unidade.

## Functional Requirements

- **FR-01 — Buscar e selecionar cidades:** o sistema deve permitir pesquisar nomes de cidades nas localidades disponíveis globalmente no serviço de geocodificação do Open-Meteo e escolher uma localidade entre os resultados. A cobertura não é garantida para toda cidade existente.
  - **AC-01.1 — Entrada vazia:** **Given** que o campo de busca está vazio ou contém apenas espaços, **When** a pessoa envia a busca, **Then** o sistema não chama o serviço de geocodificação, não exibe mensagem de “cidade não encontrada” e solicita a entrada com “Informe o nome de uma cidade.”
  - **AC-01.2 — Texto da busca:** **Given** que a pessoa informa um nome de cidade com acentos, espaços, hífen ou apóstrofo, **When** a busca é enviada, **Then** o sistema remove apenas espaços externos, preserva os caracteres do nome e envia o texto como dado de busca, sem interpretá-lo como marcação ou código.
  - **AC-01.3 — Resultados:** **Given** que o serviço retorna uma ou mais localidades, **When** a busca termina, **Then** cada resultado é apresentado como opção selecionável com nome da cidade e com região e país quando fornecidos pelo serviço.
  - **AC-01.4 — Seleção:** **Given** que há opções de localidades, **When** a pessoa seleciona uma delas, **Then** as consultas meteorológicas usam a identidade geográfica daquela opção, e a interface associa os dados ao nome exibido para ela.
- **FR-02 — Consultar clima atual:** após a seleção de uma cidade, o sistema deve exibir as condições meteorológicas atuais dessa localidade usando dados do Open-Meteo.
  - **AC-02.1 — Dados exibidos:** **Given** que uma localidade foi selecionada e a resposta contém uma temperatura numérica finita e um código WMO reconhecido, **When** o carregamento termina, **Then** a seção de clima atual mostra a cidade selecionada, a temperatura com unidade e a descrição da condição em pt-BR.
  - **AC-02.2 — Temperatura ausente ou inválida:** **Given** que a resposta atual não contém temperatura numérica finita, **When** o carregamento termina, **Then** a seção informa “Clima atual indisponível para esta cidade.” e não inventa nem reutiliza dados de outra localidade.
  - **AC-02.3 — Condição ausente ou não reconhecida:** **Given** que a temperatura atual é válida, mas o código WMO está ausente ou não reconhecido, **When** o carregamento termina, **Then** a temperatura é exibida e a descrição da condição é “Condição indisponível”.
  - **AC-02.4 — Atualidade:** **Given** que a resposta contém um horário de observação, **When** o sistema valida o clima atual, **Then** aceita o dado somente se o horário puder ser interpretado como um instante, não for anterior à solicitação em mais de 60 minutos e não for posterior ao horário atual; se o horário estiver ausente, inválido ou fora desse intervalo, informa “Clima atual indisponível para esta cidade.”
  - **AC-02.5 — Localidade alterada:** **Given** que há dados exibidos para uma cidade e a pessoa seleciona outra, **When** começa a consulta da nova localidade, **Then** os dados da cidade anterior não são apresentados como dados da nova seleção.
- **FR-03 — Consultar previsão de cinco dias:** o sistema deve exibir a previsão para hoje e os quatro dias seguintes da cidade selecionada.
  - **AC-03.1 — Previsão completa:** **Given** que a resposta contém cinco datas locais consecutivas, começando hoje, e dados válidos para cada data, **When** a previsão é carregada, **Then** o sistema mostra exatamente cinco entradas na ordem das datas, cada uma com data, condição meteorológica e temperaturas mínima e máxima; temperaturas são numéricas finitas, mínima não excede máxima e o código WMO é reconhecido.
  - **AC-03.2 — Fuso e datas:** **Given** que o serviço informa o fuso horário da localidade selecionada, **When** o sistema determina hoje e formata as datas, **Then** usa a data local nesse fuso e apresenta as datas no formato pt-BR `dd/MM/yyyy`.
  - **AC-03.3 — Resposta parcial:** **Given** que a resposta não contém cinco datas válidas consecutivas ou que uma data não contém todos os campos diários obrigatórios, **When** a previsão é exibida, **Then** o sistema mostra somente entradas válidas e únicas dentro do intervalo de hoje a hoje mais quatro dias, em ordem cronológica, exibe “Previsão incompleta. Alguns dias estão indisponíveis.” e não cria nem substitui dados ausentes; para cada data, as temperaturas devem ser numéricas finitas, a mínima não pode exceder a máxima e o código WMO deve ser reconhecido; se houver datas duplicadas, omite as entradas daquela data.
  - **AC-03.4 — Fuso ausente ou inválido:** **Given** que a resposta não fornece um fuso horário válido para a localidade, **When** o sistema valida a previsão, **Then** não a apresenta como previsão de hoje e dos quatro dias seguintes e informa “Previsão indisponível para esta cidade.”
- **FR-04 — Alternar unidade de temperatura:** o sistema deve iniciar em Celsius e permitir alternar os valores de temperatura exibidos para Fahrenheit.
  - **AC-04.1 — Unidade inicial:** **Given** que uma página é aberta, **When** temperaturas são exibidas, **Then** são apresentadas em Celsius com o símbolo `°C`.
  - **AC-04.2 — Conversão para Fahrenheit:** **Given** que temperaturas atuais e/ou previsão estão visíveis, **When** a pessoa seleciona Fahrenheit, **Then** todas as temperaturas visíveis e subsequentes são convertidas pela fórmula `°F = °C × 9/5 + 32`, arredondadas ao décimo mais próximo e identificadas com `°F` (por exemplo, `18,0 °C` é exibido como `64,4 °F`).
  - **AC-04.3 — Retorno a Celsius:** **Given** que Fahrenheit está selecionado, **When** a pessoa seleciona Celsius, **Then** todas as temperaturas visíveis e subsequentes voltam ao valor Celsius original, arredondadas ao décimo mais próximo e identificadas com `°C`.
  - **AC-04.4 — Escopo da preferência:** **Given** que a pessoa selecionou uma unidade, **When** alterna entre localidades na mesma página, **Then** a unidade permanece selecionada; **When** recarrega ou abre uma nova página, **Then** a unidade inicial é Celsius.
- **FR-05 — Comunicar ausência de resultados e falhas:** o sistema deve informar quando a busca não encontrar cidades ou quando não conseguir carregar dados meteorológicos.
  - **AC-05.1 — Geocoding sem resultados:** **Given** que o serviço de geocodificação conclui a busca sem localidades, **When** a resposta é apresentada, **Then** o sistema informa “Nenhuma cidade encontrada. Verifique o nome e tente novamente.” e não inicia consulta meteorológica.
  - **AC-05.2 — Falha de geocoding:** **Given** que o serviço de geocodificação retorna erro, resposta inválida ou não responde em até 10 segundos, **When** a busca termina, **Then** o sistema informa “Não foi possível buscar cidades. Tente novamente.”, oferece a ação “Tentar novamente” e não trata a falha como busca sem resultados.
  - **AC-05.3 — Falha meteorológica:** **Given** que a consulta meteorológica falha, retorna dados inválidos ou não responde em até 10 segundos, **When** o carregamento termina, **Then** o sistema informa “Não foi possível carregar os dados meteorológicos. Tente novamente.”, oferece a ação “Tentar novamente” e não apresenta a falha como resposta válida.
  - **AC-05.4 — Falha parcial:** **Given** que os dados atuais ou a previsão falham, **When** a outra seção contém dados válidos, **Then** o sistema mantém a seção válida visível e sinaliza a indisponibilidade somente na seção com falha.
  - **AC-05.5 — Nova tentativa:** **Given** que uma busca ou consulta meteorológica falhou, **When** a pessoa aciona “Tentar novamente”, **Then** o sistema repete a operação correspondente; não há repetição automática.

## User Stories

- **US-01 — Encontrar uma cidade (FR-01):** Como pessoa que está planejando uma viagem, quero pesquisar cidades e selecionar o destino correto para consultar informações meteorológicas sem confundir localidades homônimas.
- **US-02 — Consultar condições atuais (FR-02):** Como pessoa que planeja a rotina, quero ver o clima atual da cidade selecionada para me preparar para o dia e os próximos compromissos.
- **US-03 — Planejar os próximos dias (FR-03):** Como pessoa que planeja uma atividade ao ar livre, quero consultar a previsão de hoje e dos quatro dias seguintes para escolher quando realizar minha atividade.
- **US-04 — Escolher unidade de temperatura (FR-04):** Como pessoa que está planejando uma viagem, quero alternar entre Celsius e Fahrenheit para interpretar as temperaturas na unidade que prefiro.
- **US-05 — Entender problemas de consulta (FR-05):** Como pessoa que planeja a rotina, quero receber uma mensagem quando não houver cidades correspondentes ou os dados não puderem ser carregados para entender por que a informação não está disponível.

## Acceptance Criteria

Os critérios completos estão descritos junto aos requisitos funcionais correspondentes. A tabela abaixo rastreia cada User Story aos critérios aplicáveis e aos requisitos não funcionais que condicionam sua implementação e validação.

| User Story | Acceptance Criteria | Requisitos não funcionais relevantes |
|---|---|---|
| US-01 — Encontrar uma cidade | AC-01.1 a AC-01.4 | NFR-01 (mensagens em pt-BR), NFR-02 (layout responsivo), NFR-03 (busca e seleção acessíveis por teclado), NFR-04 (p95 da busca), NFR-05 (disponibilidade da aplicação), NFR-06 (sem autenticação ou persistência de localidades). |
| US-02 — Consultar condições atuais | AC-02.1 a AC-02.5; AC-05.3 a AC-05.5 | NFR-01 (idioma e formato numérico), NFR-02 (layout responsivo), NFR-03 (acessibilidade), NFR-04 (p95 após seleção), NFR-05 (disponibilidade da aplicação separada da do provedor), NFR-06 (sem autenticação ou persistência de localidades), NFR-07 (limites de uso e atribuição Open-Meteo). |
| US-03 — Planejar os próximos dias | AC-03.1 a AC-03.4; AC-05.3 a AC-05.5 | NFR-01 (idioma, formato numérico e datas), NFR-02 (layout responsivo), NFR-03 (acessibilidade), NFR-04 (p95 após seleção), NFR-05 (disponibilidade da aplicação separada da do provedor), NFR-06 (sem autenticação ou persistência de localidades), NFR-07 (limites de uso e atribuição Open-Meteo). |
| US-04 — Escolher unidade de temperatura | AC-04.1 a AC-04.4 | NFR-01 (vírgula decimal e apresentação em pt-BR), NFR-02 (layout responsivo), NFR-03 (controle acessível), NFR-05 (disponibilidade da aplicação), NFR-06 (unidade não persistida após recarregar), NFR-07 (atribuição junto aos dados meteorológicos exibidos). |
| US-05 — Entender problemas de consulta | AC-05.1 a AC-05.5 | NFR-01 (mensagens em pt-BR), NFR-02 (layout responsivo), NFR-03 (mensagens e ações acessíveis), NFR-04 (limites de tempo e metas de renderização dos fluxos), NFR-05 (distinção entre disponibilidade da aplicação e do provedor), NFR-07 (controle do consumo da API e limites do provedor). |

## Non-Functional Requirements

- **NFR-01 — Idioma e formatos:** textos e descrições meteorológicas devem estar em pt-BR; números usam vírgula decimal e datas usam `dd/MM/yyyy`.
- **NFR-02 — Responsividade:** os fluxos principais devem funcionar em larguras de 320 px a 1440 px sem rolagem horizontal.
- **NFR-03 — Acessibilidade:** busca e controles devem ser operáveis por teclado e ter nomes acessíveis; os fluxos principais devem atender WCAG 2.2 nível AA.
- **NFR-04 — Desempenho:** em build de produção, navegador atualizado em dispositivo móvel intermediário e perfil de rede 4G simulado, p95 de pelo menos 100 medições por fluxo deve ser de até 2 segundos entre envio da busca e renderização dos resultados, e até 3 segundos entre seleção da cidade e renderização de clima atual e previsão.
- **NFR-05 — Disponibilidade:** a meta da aplicação é 99,9% mensal, medida por sondas externas a cada minuto que confirmam resposta da aplicação e renderização dos controles principais. A disponibilidade do Open-Meteo deve ser medida separadamente; indisponibilidade do provedor não conta como indisponibilidade da aplicação.
- **NFR-06 — Privacidade de dados:** o produto não deve exigir autenticação nem persistir dados do usuário no servidor. Esta versão também não persiste localmente preferências ou localidades.
- **NFR-07 — Uso e atribuição dos dados:** o produto é não comercial, não exibe anúncios e usa a API gratuita do Open-Meteo, considerada suficiente para a baixa demanda prevista, respeitando os limites vigentes do provedor. No momento desta especificação, os limites publicados são 600 chamadas por minuto, 5.000 por hora, menos de 10.000 por dia e 300.000 por mês. Cada localidade com dados meteorológicos exibidos deve ter próximo a eles o link “Weather data by Open-Meteo.com” para `https://open-meteo.com/`, em conformidade com a licença CC BY 4.0. O uso comercial ou com anúncios exige reavaliação do plano e da licença. O consumo deve ser monitorado; se a demanda prevista se aproximar dos limites, o plano deve ser reavaliado antes de excedê-los.

As metas de NFR-02 a NFR-05 foram aprovadas para esta especificação. A medição de desempenho usa o ambiente e a amostra definidos em NFR-04; a disponibilidade é calculada sobre todas as sondas programadas no mês, sem exclusão de manutenção planejada. Os termos, limites e requisitos de atribuição do provedor devem ser reconfirmados antes do lançamento e sempre que forem atualizados. Fontes: [Termos de uso do Open-Meteo](https://open-meteo.com/en/terms), [preços e limites](https://open-meteo.com/en/pricing) e [licença e atribuição](https://open-meteo.com/en/licence).

## Métrica de sucesso do produto

- **MS-01 — Conclusão e compreensão do fluxo principal:** em teste moderado com 10 participantes representativos da persona prioritária “Pessoa que planeja a rotina”, pelo menos 8 devem concluir sem ajuda a tarefa de pesquisar uma cidade, selecionar a localidade pretendida, localizar a temperatura e condição atuais e identificar corretamente as cinco datas da previsão, suas temperaturas mínima/máxima e a unidade exibida. Cada participante conta como sucesso somente se cumprir todos esses passos. Este é um critério de usabilidade do fluxo principal, não uma estimativa estatística de todos os usuários.

## Edge Cases

- Entrada vazia, texto com espaços externos ou nome com acentos/pontuação: AC-01.1 e AC-01.2.
- Cidade não encontrada versus falha/timeout no geocoding: AC-05.1 e AC-05.2.
- Localidades homônimas e resposta sem região/país: AC-01.3 e AC-01.4; a interface apresenta apenas os campos de localização fornecidos pelo provedor.
- Dados atuais ausentes ou inválidos: AC-02.2; isso não invalida automaticamente uma previsão válida.
- Previsão com menos de cinco dias, datas repetidas ou campos obrigatórios ausentes: AC-03.3.
- Fuso ausente ou inválido, inclusive em mudança de data: AC-03.2 e AC-03.4.
- Falha isolada em clima atual ou previsão, indisponibilidade de rede, erro do provedor ou timeout: AC-05.3 a AC-05.5.
- Conversão de unidade em resultados carregados ou durante a alternância: AC-04.1 a AC-04.4.

## Assumptions

- O fluxo começa sem cidade selecionada; a pessoa pesquisa pelo nome de uma cidade e seleciona um resultado antes de consultar o clima.
- A busca cobre as localidades disponíveis no serviço de geocodificação do Open-Meteo; não promete cobertura geográfica uniforme nem busca por CEP.
- A demanda esperada é baixa e cabe nos limites vigentes da API gratuita do Open-Meteo; o consumo será monitorado e o plano reavaliado se a previsão de uso mudar ou se aproximar dos limites.
- Os campos obrigatórios do clima atual são temperatura numérica e horário de observação válido com idade máxima de 60 minutos. O código WMO ausente ou não reconhecido não invalida a temperatura: a condição é apresentada como “Condição indisponível”, conforme AC-02.3. Os campos obrigatórios de cada dia são data local, código WMO reconhecido e temperaturas mínima e máxima numéricas, com mínima menor ou igual à máxima.
- O dia da previsão é definido no fuso horário IANA retornado pelo provedor para a localidade selecionada. Se esse fuso estiver ausente ou inválido, a previsão é indisponível.
- Celsius/Fahrenheit afeta somente temperaturas. A unidade escolhida vale durante a página atual e não é persistida após recarregar ou abrir uma nova página.
- Não há geolocalização, cidade padrão, favoritos, histórico, armazenamento local de cidades/unidade, cache offline ou atualização automática nesta versão.
- Falhas de clima atual e de previsão são independentes na interface; uma seção válida continua disponível se a outra falhar.
- As personas são hipóteses ainda não validadas com usuários.
- O limite de 10 segundos por chamada a um serviço externo, a idade máxima de 60 minutos para o dado atual e a ausência de repetição automática são baselines funcionais desta versão; a pessoa pode iniciar uma nova tentativa.

## Risks

Probabilidades e impactos são avaliações iniciais herdadas do discovery e devem ser revistos após validação com usuários e do provedor.

| Categoria | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| Técnico | Indisponibilidade ou lentidão do Open-Meteo impede carregar dados. | Média | Alto: o app pode ficar sem informações apesar de estar operacional. | Aplicar timeout de 10 segundos, mensagens específicas por operação e nova tentativa somente sob ação da pessoa. |
| Técnico | Mudança na demanda ou nos termos do provedor torna insuficiente o uso da API gratuita. | Baixa | Alto: pode interromper consultas ou exigir mudança de plano. | Monitorar consumo, reconfirmar os limites e termos vigentes antes do lançamento e reavaliar o plano antes de atingir os limites ou se o produto se tornar comercial. |
| Produto | Cidades homônimas ou cobertura insuficiente levam a uma localidade errada ou não encontrada. | Média | Alto: a consulta deixa de ser útil para a pessoa. | Exibir nome, região e país quando disponíveis; a busca é global, limitada às localidades disponíveis no serviço, sem garantia de cobertura integral. |
| Produto | Fuso horário ou conteúdo diário não corresponde à expectativa sobre a previsão. | Média | Médio: as datas podem ser interpretadas incorretamente. | Usar o fuso retornado para a localidade, exigir cinco datas locais consecutivas e formatá-las explicitamente. |
| Técnico | Dados antigos são apresentados como atuais. | Média | Alto: pode levar a decisões baseadas em informações desatualizadas e reduzir confiança. | Rejeitar dados atuais com mais de 60 minutos e não usar cache local. |
| Técnico | Conversão ou aplicação de unidade diverge entre clima atual e previsão. | Média | Médio: valores podem parecer incorretos. | Aplicar a fórmula e precisão definidas em AC-04.2 e AC-04.3 a todas as temperaturas. |
| Produto | Experiência móvel ou acessibilidade inadequada impede completar fluxos principais. | Média | Alto: usuários podem não conseguir consultar o clima. | Testar dispositivos e tecnologias assistivas; aprovar e verificar critérios mensuráveis de NFR-02 e NFR-03. |
| Produto | Personas secundárias e critérios de sucesso fora do fluxo prioritário ainda não foram validados com pesquisa ampla. | Média | Médio: prioridades futuras podem não representar todos os usuários. | Usar MS-01 para avaliar o fluxo prioritário e validar segmentos e métricas adicionais antes de expandir o escopo. |

## Out of Scope

- Autenticação, contas de usuário e dados persistidos no servidor.
- Geolocalização, cidade padrão, favoritos, histórico, armazenamento local de preferências ou localidades, cache offline e atualização automática.
- Busca por CEP ou região; a busca inicial é por nome de cidade.
- Alertas/notificações, mapas e widgets.
- A especificação não inclui decisão de implementação nem escolha de arquitetura além das decisões de produto registradas.

## Open Questions

Não há decisões de produto pendentes para iniciar a implementação do MVP definido nesta especificação. A reconfirmação pré-lançamento dos termos, limites e atribuição do Open-Meteo é uma atividade operacional recorrente descrita em NFR-07, não uma decisão em aberto.