# Discovery — Aplicação de Previsão do Tempo

## Contexto

A empresa solicitou uma aplicação de previsão do tempo para que usuários possam buscar cidades, consultar o clima atual e visualizar a previsão para cinco dias. A aplicação também deve permitir alternar entre Celsius e Fahrenheit. O uso em dispositivos móveis é um requisito de qualidade da interface, detalhado em Requisitos Não-Funcionais.

Este documento registra os requisitos de negócio conhecidos, as decisões tomadas e os pontos que precisam ser esclarecidos antes da especificação detalhada. A fonte de dados foi escolhida; detalhes de cobertura, atualização e interface ainda precisam ser definidos.

## Personas

As personas abaixo são hipóteses comportamentais derivadas do briefing. Devem ser validadas com usuários antes de orientar decisões definitivas de produto.

### 1. Pessoa que planeja a rotina

- **Objetivo principal:** consultar as condições atuais e a previsão para decidir como se preparar para o dia e os próximos compromissos.
- **Contexto de uso:** principalmente no celular, antes de sair ou durante deslocamentos; pode usar desktop para planejar a semana.
- **Métrica de sucesso:** consegue consultar a cidade correta e identificar as condições relevantes para sua rotina sem repetir a busca.

### 2. Pessoa que está planejando uma viagem

- **Objetivo principal:** verificar o clima de uma cidade de destino antes e durante a viagem.
- **Contexto de uso:** desktop ou celular ao planejar; principalmente celular quando já está viajando ou fora de casa.
- **Métrica de sucesso:** encontra o destino correto e consulta o clima atual ou a previsão de cinco dias sem confundir cidades homônimas ou unidades.

### 3. Pessoa que planeja uma atividade ao ar livre

- **Objetivo principal:** comparar a previsão dos próximos dias para escolher quando realizar uma atividade externa.
- **Contexto de uso:** desktop ao comparar datas com antecedência; celular para conferir as condições perto do dia planejado.
- **Métrica de sucesso:** consegue identificar em uma consulta qual dos dias exibidos melhor atende às condições que considera importantes.

## Decisões

- **Fonte de dados: Open-Meteo, sem API key.** A escolha evita a necessidade de provisionar e gerenciar uma chave de API. Resolve a pergunta sobre qual provedor usar e se é necessária uma chave; cobertura, limites de uso, termos, atribuição e disponibilidade do serviço ainda precisam ser verificados.
- **Período da previsão: hoje mais os quatro dias seguintes.** Define um intervalo consistente de cinco dias e resolve se o dia atual está incluído. O fuso horário e os dados exibidos em cada dia continuam em aberto.
- **Unidade padrão: Celsius.** Define o valor inicial apresentado ao usuário e resolve qual será a unidade padrão. O escopo da alternância para Fahrenheit e a persistência da preferência continuam em aberto.
- **Sem autenticação e sem persistência de dados no servidor.** Mantém contas e armazenamento de dados do usuário no servidor fora do escopo. Resolve se haverá autenticação ou persistência no servidor; não determina se preferências ou cidades poderão ser guardadas localmente no dispositivo.
- **Idioma da interface: pt-BR.** Define o idioma dos textos da interface e resolve a escolha de idioma. Formatos regionais de data, hora e outras medidas ainda precisam ser definidos.

## Requisitos Funcionais

- **RF-01 — Buscar cidades:** permitir que o usuário pesquise cidades.
- **RF-02 — Consultar clima atual:** exibir as condições atuais para a cidade escolhida.
- **RF-03 — Consultar previsão:** exibir para a cidade escolhida a previsão de hoje e dos quatro dias seguintes.
- **RF-04 — Alternar unidade de temperatura:** permitir alternar entre Celsius e Fahrenheit; Celsius é a unidade padrão.
- **RF-05 — Informar falhas e ausência de resultados:** informar quando a busca não encontrar cidades ou quando não for possível carregar os dados meteorológicos. A necessidade de permitir nova tentativa ou exibir dados anteriores ainda precisa ser definida.

## Requisitos Não-Funcionais

- **RNF-01 — Responsividade e compatibilidade móvel:** os fluxos principais devem funcionar em dispositivos móveis e em telas maiores. **Proposta a validar:** suportar larguras de 320 px a 1440 px sem rolagem horizontal nos fluxos principais.
- **RNF-02 — Acessibilidade:** busca e controles devem ser operáveis por teclado e ter nomes acessíveis para tecnologias assistivas. **Proposta a validar:** conformidade WCAG 2.2 nível AA nos fluxos principais.
- **RNF-03 — Desempenho:** busca e carregamento dos dados meteorológicos devem atender a metas de tempo de resposta. **Proposta a validar:** até 2 segundos para busca e até 3 segundos para carregar os dados meteorológicos, no percentil 95 e sob condições de teste acordadas.
- **RNF-04 — Disponibilidade:** definir e monitorar a disponibilidade da aplicação. **Proposta a validar:** meta mensal de 99,9% para a aplicação; a disponibilidade do provedor de dados deve ser medida separadamente.
- **RNF-05 — Idioma da interface:** apresentar os textos da interface em português do Brasil (pt-BR).

## Riscos

As probabilidades são estimativas iniciais com base no briefing e devem ser revistas quando público, fornecedor e metas operacionais forem definidos.

| Categoria | Risco | Probabilidade | Impacto | Estratégia de mitigação |
|---|---|---|---|---|
| Técnico | Indisponibilidade ou lentidão do provedor meteorológico impede carregar condições atuais e previsões. | Média | Alto: o app pode ficar sem dados mesmo estando operacional. | Avaliar SLA e histórico do provedor; definir timeout e estados de falha conforme RF-05; decidir se haverá nova tentativa ou exibição de dados anteriores com data de atualização. |
| Técnico | Cotas, custos, cobertura, termos ou atribuição do Open-Meteo são incompatíveis com o produto. | Média | Alto: pode limitar o uso, gerar custos imprevistos ou exigir mudança de integração. | Verificar limites, cobertura, termos e atribuição do Open-Meteo antes da implementação; monitorar consumo e disponibilidade. |
| Produto | Cidades homônimas ou cobertura geográfica insuficiente levam a resultados incorretos ou ausentes. | Média | Alto: usuários podem consultar a localidade errada ou não encontrar a cidade desejada. | Validar a cobertura nos mercados prioritários e desambiguar resultados com estado/região e país. |
| Produto | O fuso horário ou o conteúdo diário da previsão é interpretado de formas diferentes. | Média | Médio: datas ou informações diárias podem não corresponder à expectativa do usuário. | Definir quais métricas aparecem por dia e qual fuso horário determina cada data; apresentar datas explícitas. |
| Técnico | Dados antigos são apresentados como atuais ou sem indicação de atualização. | Média | Alto: usuários podem tomar decisões com informação desatualizada e perder confiança no app. | Definir frequência de atualização e idade máxima aceitável; exibir o horário da última atualização e sinalizar dados expirados. |
| Técnico | Celsius/Fahrenheit é aplicado de forma inconsistente entre clima atual e previsão ou sofre erro de conversão/arredondamento. | Média | Médio: valores confusos ou incorretos reduzem a confiança nos dados. | Definir o escopo da preferência, centralizar a regra de conversão e testar valores de referência em todas as telas. |
| Produto | Fluxos principais são difíceis de usar em dispositivos móveis ou por pessoas com deficiência. | Média | Alto: parte dos usuários pode não conseguir completar tarefas essenciais. | Validar fluxos em dispositivos e larguras acordados; adotar critérios mensuráveis de responsividade e acessibilidade, como as propostas em RNF-01 e RNF-02, após aprovação. |
| Produto | Geolocalização ou histórico de localidades é usado sem consentimento ou regras de retenção claras. | Média | Alto: pode afetar privacidade, conformidade e confiança do usuário. | Confirmar se localização está no escopo; solicitar permissão explícita, oferecer busca manual e definir dados coletados, retenção e exclusão. |
| Produto | Público-alvo e critérios de sucesso não estão definidos. | Alta | Médio: prioridades podem não resolver a necessidade principal e o resultado não poderá ser avaliado. | Identificar usuários e casos prioritários; acordar métricas de sucesso antes de fechar escopo e critérios de aceite. |
| Técnico | Metas não definidas de desempenho e disponibilidade permitem degradação sem detecção. | Média | Alto: lentidão ou interrupções podem prejudicar os fluxos centrais sem um critério operacional claro. | Validar as metas propostas em RNF-03 e RNF-04, definir condições e método de medição e monitorar aplicação e provedor separadamente. |

## Perguntas em Aberto (Open Questions)

- Quem é o público-alvo e qual problema prioritário o app deve resolver?
- Quais métricas determinarão o sucesso do produto, como buscas concluídas ou consultas recorrentes?
- O app deve emitir alertas de tempo severo ou seu escopo é apenas consulta de condições e previsão?
- A busca deve aceitar apenas nomes de cidades ou também códigos postais e regiões? Quais países/regiões precisam ser cobertos pela busca e pelo Open-Meteo?
- Como diferenciar cidades com nomes iguais ou semelhantes nos resultados?
- Qual cidade deve aparecer ao abrir o app: nenhuma, uma padrão, a última consultada ou a localização do usuário?
- Geolocalização está no escopo? Se estiver, como será solicitada a permissão e qual será o comportamento se ela for negada?
- O usuário poderá salvar, favoritar ou alternar entre várias cidades? Se sim, os dados podem ficar apenas no dispositivo, já que não haverá persistência no servidor?
- Quais condições e métricas devem aparecer no clima atual e em cada dia da previsão?
- Qual fuso horário define as datas da previsão de hoje mais os quatro dias seguintes?
- Com que frequência os dados serão atualizados e qual idade máxima será aceitável para considerá-los atuais?
- Celsius/Fahrenheit se aplica apenas à temperatura ou também a outras medidas? A preferência deve persistir entre visitas ou dispositivos?
- Quais são os limites de uso, a cobertura necessária, os termos e as exigências de atribuição do Open-Meteo para este produto?
- Após uma falha, haverá nova tentativa? Dados anteriores poderão ser exibidos e por quanto tempo serão considerados válidos?
- Como datas, horas e outras medidas devem ser formatadas para o idioma pt-BR?
- As metas propostas de responsividade, acessibilidade, desempenho e disponibilidade são adequadas? Em quais dispositivos, condições e ferramentas serão medidas?
- A meta de disponibilidade se aplica somente ao app ou também ao provedor? Como falhas externas serão monitoradas e comunicadas?
- O app deve funcionar sem conexão ou apenas informar a indisponibilidade?
- Quais dados pessoais serão coletados ou armazenados, especialmente localização e histórico de cidades, e por quanto tempo?
- Notificações, histórico, mapas e widgets fazem parte do escopo inicial ou ficam fora dele? Se houver histórico ou preferências, serão mantidos apenas localmente?

## Suposições (Assumptions)

- O usuário escolhe uma cidade nos resultados da busca antes de consultar as informações meteorológicas.
- A alternância entre Celsius e Fahrenheit se refere à temperatura; se ela afeta tanto o clima atual quanto a previsão, isso precisa ser confirmado.
- As metas numéricas e de conformidade listadas nos requisitos não funcionais são propostas para validação, não compromissos aprovados.
- Não há requisito confirmado para geolocalização, funcionamento offline ou armazenamento local de preferências e cidades pesquisadas.