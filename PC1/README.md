# Aula 12 — PC1 transmissor / Windows 11 / ESP32 DevKit V1

[Certo] Este pacote implementa o lado transmissor: geração de pressão no Node-RED, painel local, controle USB e firmware ESP-NOW. O receptor PC2 não faz parte desta entrega.

```text
Node-RED no PC1 → comando USB serial → ESP32 DevKit V1 → ESP-NOW broadcast
      ↑                                  │
      └──── identificação / resultado ────┘
```

[Certo] A geração nesta implementação fica no PC1, conforme a etapa atual do projeto, substituindo a geração autônoma na placa descrita inicialmente no roteiro. Se o PC1 parar de enviar comandos, a ESP32 deixa de transmitir amostras. Nenhum sensor físico é usado.

## Iniciar no Windows

0. No computador onde a placa está conectada, instale Node.js com npm e Arduino IDE. A preparação foi validada com Node.js 22.22.3. Extraia o ZIP para uma pasta local; não execute dentro do arquivo compactado.
1. Execute `Iniciar_PC1.cmd` nesta pasta. A primeira execução instala dependências se necessário e exige Internet.
2. Mantenha a janela aberta e acesse **http://127.0.0.1:1881/**.
3. Para visualizar o fluxo, acesse **http://127.0.0.1:1881/red/**.
4. Sem placa, clique em **Iniciar**: a simulação local gera pressão e gráfico; os contadores USB e rádio permanecem zerados.
5. Para parar, clique em **Pausar**. Para encerrar o servidor, pressione Ctrl+C na janela do terminal.

[Certo] A instalação e o runtime desta aula ficam nesta pasta. A porta 1881 evita o endereço padrão 1880 de outras instalações do Node-RED. O servidor aceita acesso apenas pelo próprio PC. Não execute duas instâncias deste pacote ao mesmo tempo.

[Certo] `127.0.0.1` sempre se refere ao computador em que o navegador está aberto. Se a ESP32 estiver em outro PC, copie e execute este pacote lá. Uma COM3 existente no outro PC não fica acessível automaticamente a partir desta sessão.

## Gravar a ESP32 DevKit V1

1. Conecte a placa usando um cabo USB de dados.
2. Se o painel estiver conectado, clique em **Liberar USB** antes de gravar.
3. Na Arduino IDE, instale/selecione o pacote **esp32 by Espressif Systems**, versão **3.3.11** usada na preparação.
4. Abra `ESP32_Transmissor/ESP32_Transmissor.ino`.
5. Selecione **DOIT ESP32 DEVKIT V1** e a porta COM correspondente. Para uma placa clássica compatível, o alvo de CLI é `esp32:esp32:esp32doit-devkit-v1`.
6. Compile e grave. Se a placa exigir, mantenha BOOT pressionado durante a tentativa inicial de conexão do gravador e solte quando iniciar a gravação.
7. No Monitor Serial, configure **115200 baud**. A placa deve imprimir `type: ready`, seu MAC e `channel: 6` a cada segundo.
8. Feche o Monitor Serial antes de conectar pelo painel.

[Certo] O firmware usa a biblioteca ESP-NOW incluída no pacote ESP32; não precisa de ArduinoJson nem bibliotecas adicionais. O código é direcionado ao pacote 3.x, não ao antigo pacote 2.x.

## Conectar e enviar

1. No painel, informe a porta real, por exemplo COM3, e clique em **Conectar**.
2. Aguarde **ESP32 disponível** e confira o MAC apresentado.
3. Defina a equipe e o modo; clique em **Aplicar configuração**.
4. Clique em **Iniciar**.
5. Compare os contadores e o retorno da ESP32. Em modo TESTE, fixe 5,00 ou 8,50 bar para verificar a correspondência.
6. Clique em **Pausar** para interromper novas amostras. Uma transmissão já em andamento pode concluir depois do clique.

| Modo | Comportamento |
|---|---|
| AUTO | Caminhada aleatória de até ±0,15 bar a cada 500 ms; limitada a 0–10 bar |
| TESTE | Envia a pressão fixa selecionada, na mesma frequência |
| Pausado | Não gera nem envia novas amostras |
| Sem ESP32 | Permite simulação local, mas não encaminha dados à USB |

[Certo] O painel altera a configuração apenas depois de **Aplicar configuração**. Cada amostra tem uma sequência; algumas podem ser geradas sem serem transmitidas se a placa estiver ocupada ou indisponível. Não há recuperação de amostras antigas após reconexão.

## O que os contadores comprovam

- **Geradas:** amostras produzidas no PC1.
- **Enviadas à USB:** comandos entregues ao nó serial pelo fluxo; isso não comprova recepção na placa.
- **Rádio: concluídas:** callback de envio positivo retornado pela ESP32 e recebido pelo PC1.
- **Falhas / sem resultado:** falha reportada ou ausência do retorno de um comando, com liberação posterior pela identificação da placa ociosa.

[Certo] Em broadcast, sucesso no transmissor não comprova a presença ou a recepção de outra placa. O painel mantém a indicação **recepção no PC2 não verificada**. A documentação da Espressif também distingue confirmação MAC de processamento pela aplicação: [ESP-NOW](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/network/esp_now.html).

## Protocolo para preparar o futuro receptor

| Item | Valor |
|---|---|
| Rádio | ESP-NOW, interface STA, canal 6 |
| Destino atual | Broadcast FF:FF:FF:FF:FF:FF |
| Segurança deste protótipo | Broadcast sem criptografia; identificação de equipe não é autenticação |
| Conteúdo do rádio | JSON UTF-8, comprimento efetivo, sem terminador `\n` nem byte nulo |
| Tamanho máximo produzido | Menor que 230 bytes |
| Serial | 115200 baud, 8N1, delimitador `\n` |
| Pressão | bar(g), de 0 a 10, duas casas decimais |

Comando PC1 → USB:

```text
P,1,125,5.42,AUTO
```

Campos: comando P, equipe, sequência, pressão, modo. O firmware valida campos, faixa e tamanho antes de transmitir.

Pacote de rádio correspondente:

```json
{"v":1,"equipe":1,"tanque":"TK-101","boot":38172,"seq":125,"t_ms":62500,"p_bar":5.42,"modo":"AUTO"}
```

[Certo] `boot` identifica a sessão de telemetria e `t_ms` é o tempo desde a inicialização da placa, sem sincronização com o Windows. `seq` é produzido pelo Node-RED. O firmware gera um novo `boot` ao iniciar e quando recebe uma sequência menor ou igual à anterior, cobrindo reinício do Node-RED e retorno do contador. Durante a operação, use `boot` e `seq` em conjunto.

[Palpite] Na etapa do receptor, configurar o mesmo canal 6, filtrar equipe e MAC do transmissor mostrado no painel. Depois de conhecer o MAC receptor, podemos migrar para unicast e acrescentar confirmação da aplicação.

## Arquivos e manutenção

- `ESP32_Transmissor/ESP32_Transmissor.ino`: firmware da placa.
- `Fluxo_PC1.json`: fluxo importável em outra instalação Node-RED com os nós serial instalados.
- `src/controller.js`: geração, validação, comandos e acompanhamento de resultado.
- `src/panel.html`: painel local.
- `scripts/build-flow.cjs`: monta o fluxo a partir das fontes.
- `settings.cjs`: servidor local, porta 1881 e contexto em memória.
- `runtime/flows.json`: cópia usada pelo servidor isolado.
- `tests/controller.test.cjs`: testes automatizados da lógica.

```powershell
npm install
npm test
npm start
```

[Certo] `npm start` regenera os fluxos a partir de `src`. Edições realizadas somente no editor Node-RED serão substituídas no próximo início. Exporte suas alterações se quiser preservá-las. Contadores e configuração do painel ficam em memória e reiniciam com o fluxo/servidor.

## Diagnóstico

| Sintoma | Ação |
|---|---|
| Nenhuma COM disponível | Conferir cabo USB de dados, alimentação e driver do conversor USB da placa |
| Porta ocupada / erro ao gravar | Clicar Liberar USB e fechar Monitor Serial e outros consumidores da porta |
| Apenas Geradas aumenta | Conferir conexão e aguardar identificação do firmware correto |
| Canal diferente / firmware antigo | Gravar o sketch desta pasta e reiniciar a placa |
| Falha de rádio ou TIMEOUT | Pausar, liberar USB, reiniciar/gravar a ESP32 e reconectar |
| Erro COM0 ao iniciar | Porta de espera intencional, sem placa assumida; selecionar a COM real no painel |
| Página não abre | Conferir terminal e se a porta 1881 já está ocupada |
| ESP32 disponível, mas PC2 não recebe | O receptor ainda não está implementado nesta etapa; broadcast não confirma recepção |

## Referências

- [Espressif — API ESP-NOW Arduino](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/espnow.html).
- [Node-RED — nós serial, delimitador e liberação da porta](https://flows.nodered.org/node/node-red-node-serialport).
