# Aula 12 — Comissionamento virtual de um tanque de pressão via ESP-NOW

[Certo] Este documento contém o enunciado, a arquitetura proposta e os critérios de aceitação da atividade. Não inclui firmware, fluxos importáveis ou ambiente 3D implementados e testados.

[Palpite] Planejamento inicial: 4 horas, equipes de quatro alunos, dois computadores e duas ESP32 por equipe. Dividir em duas aulas de duas horas se necessário. Uma sessão de duas horas pressupõe programas e ambiente previamente preparados pelo professor.

## Situação-problema e missão

[Palpite] Uma usina precisa validar o sistema de supervisão de seu reservatório de ar comprimido antes de instalar os instrumentos. Sua equipe deverá simular o transmissor PT-101, transportar as leituras por ESP-NOW e verificar a resposta de uma planta virtual no segundo computador.

**Missão dos alunos:** montar a comunicação, tratar os dados no Node-RED, representar a pressão do tanque TK-101 e executar um protocolo de testes de operação normal, pressão alta, pressão muito alta e falha de comunicação.

[Certo] A pressão será sintética. Nenhum sensor físico de pressão é necessário. Uma representação que apenas recebe e mostra valores valida telemetria e supervisão; o intertravamento proposto amplia o exercício para testar lógica de automação em ambiente virtual. Uma malha fechada com dinâmica do processo fica como extensão.

## Objetivos

- Identificar as funções de simulador, meio de comunicação, tratamento e supervisão.
- Configurar duas ESP32 para comunicação ESP-NOW.
- Capturar linhas JSON pela USB serial no Node-RED.
- Validar unidade, faixa, identidade e sequência das amostras.
- Diferenciar pressão instantânea, pressão filtrada e qualidade da comunicação.
- Verificar alarmes e intertravamentos virtuais usando resultados esperados.
- Registrar evidências de comissionamento e diagnosticar falhas.

## Arquitetura proposta

```text
PC1 — estação de simulação                 PC2 — estação de supervisão

ESP32 A                                   ESP32 B
gera pressão ───────── ESP-NOW ──────────► recebe a mesma amostra
    │ USB serial                              │ USB serial
    ▼                                         ▼
Node-RED 1                                Node-RED 2
valida, filtra e registra                  valida, filtra, verifica timeout
    │                                         │
painel local / evidência                   alarmes + intertravamento virtual
                                              │ WebSocket local
                                              ▼
                                          navegador: planta industrial 3D
```

[Certo] ESP-NOW opera entre dispositivos compatíveis, sem exigir um ponto de acesso. O Node-RED acessa a placa local pela serial; não recebe ESP-NOW diretamente pela placa Wi-Fi convencional do computador. Referência: [Espressif — ESP-NOW](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/network/esp_now.html).

[Palpite] Adotar Node-RED nos dois PCs para tornar a captura e o tratamento explícitos. Não usar MQTT ou conexão entre os PCs na etapa básica: o enlace de dados entre as estações será o ESP-NOW. O navegador do PC2 acessará o Node-RED local.

[Certo] Nesta arquitetura, o tratamento no PC1 serve à supervisão local; os dados transmitidos pelo rádio são os originais gerados na ESP32 A. Se for requisito transmitir dados já tratados pelo PC1, será necessário outro caminho: ESP32 A → USB → Node-RED 1 → USB → ESP32 A → ESP-NOW → ESP32 B. Essa variante exige distinguir mensagens de amostra e mensagens de transmissão para evitar ciclos de reenvio.

## Recursos e preparação do professor

- Separar duas ESP32 DevKit e dois cabos USB de dados por equipe.
- Instalar Arduino IDE com pacote ESP32 da Espressif, Node.js e Node-RED nos dois PCs.
- Instalar `node-red-node-serialport` pelo gerenciador de paleta do Node-RED.
- Reservar Chrome ou Edge no PC2 para a visualização.
- Preparar previamente os dois firmwares, os fluxos Node-RED e a aplicação virtual descritos neste roteiro.
- Registrar as versões efetivamente usadas; compilar ambos os firmwares com a mesma versão do pacote ESP32.
- Configurar as duas placas no mesmo canal de rádio permitido no local; proposta inicial: canal 6.
- Usar endereçamento unicast para o MAC da placa parceira e um identificador de equipe. Filtrar o MAC de origem no receptor, evitando mistura de dados da turma.
- Prever instalação prévia das dependências e arquivos locais da cena, para não depender de CDN durante a aula.

[Certo] O nó serial permite receber mensagens delimitadas por nova linha. A porta deve ser liberada pelo Node-RED antes da gravação do firmware; o Monitor Serial também deve estar fechado quando o Node-RED assumir a porta. Referência: [Node-RED — serialport](https://flows.nodered.org/node/node-red-node-serialport).

[Certo] As duas placas precisam operar no mesmo canal. Uma confirmação de envio ESP-NOW na camada MAC não prova que o Node-RED ou a tela processaram a amostra; a evidência de ponta a ponta é a identificação da amostra no PC2. Referência: [Espressif — envio e recepção](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/network/esp_now.html).

## Contrato dos dados

[Palpite] Adotar os seguintes parâmetros didáticos: faixa de 0 a 10 bar(g), uma amostra a cada 500 ms, serial de 115200 baud, 8N1 e uma mensagem JSON por linha, terminada por `\n`. Bar(g) representa pressão relativa à atmosférica.

```json
{"v":1,"equipe":1,"tanque":"TK-101","boot":38172,"seq":125,"t_ms":62500,"p_bar":5.42,"modo":"AUTO"}
```

| Campo | Regra proposta |
|---|---|
| `v` | Versão do protocolo, inicialmente 1 |
| `equipe` | Identificador exclusivo da equipe |
| `tanque` | Identificador TK-101 |
| `boot` | Identificador novo a cada inicialização do emissor |
| `seq` | Contador crescente por inicialização |
| `t_ms` | Tempo desde a inicialização da ESP32 A; não é horário do PC |
| `p_bar` | Número finito, entre 0 e 10, em bar(g) |
| `modo` | AUTO ou TESTE |

- Serializar a mesma amostra para USB e rádio; não sortear valores diferentes para cada destino.
- Manter o JSON transmitido por rádio abaixo de 250 bytes para esta atividade.
- Transportar somente o comprimento efetivo da mensagem e limitar o tamanho recebido antes de interpretar o JSON.
- Encaminhar o conteúdo recebido pela ESP32 B à serial, preservando os campos do emissor.
- Separar mensagens de diagnóstico das mensagens de pressão; rejeitar linhas que não cumpram o contrato.
- Usar `boot` e `seq` para descartar duplicatas e amostras antigas; reinicializar o histórico de sequência quando mudar `boot`.
- Contabilizar lacunas de sequência como amostras ausentes no caminho observado; não atribuir automaticamente a perda ao rádio.
- Medir a idade do dado pelo relógio local de recepção no PC2. Não subtrair relógios dos dois PCs para afirmar latência sem sincronização.

## Simulação da pressão

[Palpite] Usar uma caminhada aleatória limitada em vez de sortear toda a faixa a cada amostra. Isso produz uma evolução visual mais coerente e mantém a aleatoriedade solicitada, sem pretender reproduzir a termodinâmica do tanque.

```text
Pressão inicial = 5,0 bar(g)
A cada 500 ms:
    variação = número aleatório entre -0,15 e +0,15 bar
    pressão = limitar(pressão anterior + variação, 0, 10)
    incrementar sequência
    montar uma única amostra
    enviar a amostra pela USB e por ESP-NOW
```

- Disponibilizar modo TESTE para fixar valores e produzir rampas determinísticas.
- Disponibilizar comando para suspender a emissão sem desligar o equipamento.
- Voltar ao modo AUTO ao concluir os ensaios.

[Certo] Depender exclusivamente de sorteios não garante que os limites de alarme apareçam durante a aula. O modo TESTE é necessário para repetir os ensaios.

## Tratamento no Node-RED

### PC1 — referência local

```text
serial in → interpretar JSON → validar contrato → guardar amostra
                                              ├→ Debug / registro
                                              └→ média móvel / painel local
```

### PC2 — supervisão e lógica virtual

```text
serial in → interpretar JSON → validar origem e contrato → verificar boot/seq
          → registrar instante local → pressão bruta e média móvel de 5 amostras
          → alarmes e intertravamento → websocket out → planta virtual

inject periódico (250 ms) → verificar idade da última amostra válida
                         → atualizar qualidade → websocket out
```

- Validar se a pressão é um número finito antes de aceitar a faixa; rejeitar strings numéricas, `null`, campos ausentes e JSON inválido.
- Atualizar o instante da última amostra somente quando chegar uma amostra nova e válida.
- Limpar a média móvel depois de reinício do emissor ou perda de comunicação.
- Usar a média para tendência e leitura suavizada; avaliar alarmes pela pressão bruta para não retardar sua detecção.
- Ao abrir ou reconectar a página, fornecer o estado atual com sua idade, sem tratar dado antigo como novo.
- Na página, manter também um temporizador local: conexão WebSocket aberta, sozinha, não prova chegada de leituras novas.

## Alarmes e intertravamento virtual

[Palpite] Os limites abaixo são exclusivamente didáticos. Referem-se à pressão bruta válida recebida pelo PC2.

| Condição | Indicação e ação virtual |
|---|---|
| Sem amostra válida desde o início | DESCONHECIDO; partida do compressor bloqueada |
| Pressão menor que 7,0 bar | Operação normal, se não houver bloqueio retido |
| Pressão maior ou igual a 7,0 bar | Alarme de pressão alta, amarelo |
| Pressão maior ou igual a 8,5 bar | Alarme muito alto, vermelho; reter bloqueio do compressor C-101 |
| Mais de 3 s sem amostra nova válida | SEM COMUNICAÇÃO; pressão atual indisponível; reter bloqueio |
| Alarme alto ativo e pressão menor ou igual a 6,7 bar | Encerrar alarme alto |
| Alarme muito alto ativo e pressão menor ou igual a 8,2 bar | Encerrar condição muito alta; manter bloqueio retido |
| Comunicação válida e pressão menor ou igual a 6,7 bar | Permitir rearme manual do bloqueio |

- Exibir o último valor conhecido somente com a identificação “histórico / desatualizado”.
- Não converter ausência de dados em pressão zero.
- Separar reconhecimento do alarme, rearme do bloqueio e comando de partida.
- Exigir novo comando de partida após rearme; não religar automaticamente o compressor.
- Ao iniciar o sistema, manter o compressor parado até haver dado válido e comando de partida autorizado.

[Certo] No exercício básico, parar o compressor virtual não altera a pressão gerada na ESP32 A. O ensaio valida a lógica e a indicação do intertravamento; não valida uma malha de controle do processo.

## Ambiente industrial virtual proposto

[Palpite] Representar uma área de utilidades de usina: reservatório pressurizado TK-101 como elemento central, compressor C-101, tubulação, válvula XV-101, transmissor PT-101, plataforma metálica, guarda-corpos e galpão. Dois tanques de fundo ajudam a contextualizar a cena, identificados como elementos cenográficos sem instrumentação.

- Usar Babylon.js para uma cena 3D no navegador, aproveitando a tecnologia da Aula 11.
- Criar câmera orbital com posição inicial que mostre tanque, compressor e instrumentos.
- Mostrar junto ao tanque a pressão recebida, unidade, qualidade e identificação PT-101.
- Manter o corpo metálico do tanque; destacar o instrumento e a sinalização em verde, amarelo, vermelho ou cinza conforme estado.
- Exibir uma escala de pressão de 0 a 10 bar, tendência temporal, pressão bruta, média, sequência e idade da amostra.
- Mostrar estado do compressor, condição de bloqueio, botão de reconhecimento, rearme e partida/parada virtuais.
- Destacar permanentemente “PROCESSO SIMULADO — SEM SENSOR FÍSICO”.
- Identificar animações de compressor ou tubulação como estados virtuais; não apresentar vazão ou posição de válvula como medidas recebidas.
- Não usar altura de líquido para representar pressão: a atividade não mede nível.

## Sequência da aula — 240 minutos

| Tempo | Trabalho da equipe | Evidência |
|---|---|---|
| 0–20 min | Identificar arquitetura, funções e variáveis | Diagrama anotado |
| 20–60 min | Gravar firmwares, registrar MACs e canal | Amostras nas duas seriais |
| 60–100 min | Configurar portas e validar fluxos | JSON aceito e inválido rejeitado |
| 100–140 min | Integrar cena e acompanhar dados | Captura da planta com sequência |
| 140–200 min | Executar matriz de comissionamento | Tabela preenchida com resultados |
| 200–225 min | Corrigir falha e repetir ensaio | Evidência antes/depois |
| 225–240 min | Apresentar conclusões | Relatório e respostas |

## Matriz de comissionamento

[Palpite] Adotar os resultados abaixo como critérios de aceitação do protótipo didático. A verificação visual deve ocorrer em até 2 s após a amostra de teste, salvo os ensaios com temporização própria.

| ID | Estímulo | Resultado esperado |
|---|---|---|
| T01 | Iniciar PC2 sem emissor | DESCONHECIDO; sem pressão atual; compressor sem permissão de partida |
| T02 | Fixar 5,0 bar | PC1 e PC2 mostram a mesma pressão bruta para o mesmo boot/seq |
| T03 | Enviar 7,0 bar | Alarme alto ativo, sinal amarelo |
| T04 | Enviar 6,8 e depois 6,7 bar | Alarme alto permanece em 6,8 e encerra em 6,7 |
| T05 | Enviar 8,5 bar com compressor virtual ligado | Alarme muito alto e parada/bloqueio do compressor |
| T06 | Reduzir para 8,2 e depois 6,7 bar | Condição muito alta encerra em 8,2; bloqueio permanece; rearme liberado apenas em 6,7 |
| T07 | Reconhecer alarme e tentar partir sem rearme | Reconhecimento não libera partida; após rearme, exigir novo comando de partida |
| T08 | Suspender emissão | Após mais de 3 s, indicar SEM COMUNICAÇÃO e bloquear; até 3,5 s na avaliação do Node-RED |
| T09 | Restaurar dados a 5,0 bar | Recuperar leitura, sem partida automática; exigir rearme e partida |
| T10 | Injetar JSON inválido, pressão -1, 11, null e texto | Rejeitar sem renovar validade do dado |
| T11 | Repetir seq e enviar sequência anterior | Não atualizar leitura nem validade; registrar descarte |
| T12 | Reiniciar ESP32 A | Aceitar novo boot, reiniciar histórico e média |
| T13 | Receber mensagem de outra equipe | Descartar sem alterar tanque local |
| T14 | Parar Node-RED 2 ou interromper conexão da página | A página identifica conexão perdida/dado vencido, sem manter aparência de leitura atual |

[Certo] T10 e T11 podem ser executados com nós Inject em uma ramificação de teste do PC2. Isso testa o tratamento de software, não o transporte por rádio. Desabilitar essa ramificação ao validar a comunicação real e identificar a origem das evidências.

## Entregas e avaliação

- Entregar diagrama de arquitetura, versões, MACs e canal utilizados.
- Entregar os dois firmwares e os dois fluxos exportados, com identificação da equipe.
- Entregar matriz com estímulo, resultado esperado, observado, aprovação/reprovação e evidência.
- Apresentar a planta em operação normal, alarme muito alto e perda de comunicação.
- Registrar uma falha encontrada, sua causa e o teste de regressão após a correção.

| Critério | Pontos |
|---|---:|
| Comunicação ESP-NOW e correspondência das amostras | 2,0 |
| Tratamento, validação e qualidade no Node-RED | 2,0 |
| Planta virtual industrial e identificação correta das variáveis | 2,0 |
| Alarmes, histerese e intertravamento virtual | 2,0 |
| Evidências, diagnóstico e explicações | 2,0 |

## Questões para discussão

1. Por que os computadores não recebem ESP-NOW diretamente neste arranjo?
2. Que evidência demonstra que uma mesma amostra chegou ao PC2?
3. Por que pressão zero é diferente de ausência de dados?
4. Por que a média móvel não deve esconder a passagem pelo limite de pressão muito alta?
5. Qual é a diferença entre reconhecer, rearmar e partir?
6. O compressor virtual parado reduz a pressão neste protótipo? O que falta para isso acontecer?
7. Por que pressão não pode ser representada automaticamente como nível do tanque?

## Extensão — malha fechada virtual

[Palpite] Em uma segunda etapa, enviar comandos do PC2 à ESP32 B pela USB e devolvê-los à ESP32 A por ESP-NOW. A ESP32 A passa a calcular uma dinâmica simplificada: pressão aumenta com compressor habilitado e diminui com consumo/descarga, com pequena perturbação aleatória.

- Incluir identificador de comando, confirmação de aplicação e timeout.
- Separar estado solicitado de estado confirmado.
- Aplicar limites e estado seguro no simulador, não apenas na tela.
- Testar perda do caminho de comando independentemente do caminho de telemetria.

[Certo] Essa extensão permite verificar a resposta da lógica sobre o processo simulado. Ainda será um modelo didático, sem validação para comandar equipamentos pressurizados reais.

## Orientação ao professor

[Certo] Antes de aplicar a aula, ainda é necessário implementar e validar o pacote executável: firmware A, firmware B, fluxos Node-RED 1 e 2, cena 3D e testes com duas placas físicas. Este roteiro estabelece o que construir e como aceitar o resultado; não comprova operação do sistema.

[Provável] Para uma turma que ainda não trabalhou com Node-RED ou ESP-NOW, fornecer o código-base pronto e concentrar a avaliação em configuração, interpretação e comissionamento torna a duração proposta mais viável.
