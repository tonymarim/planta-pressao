# Aula 12 — PC2 receptor e planta industrial 3D

[Certo] Sistema receptor para Windows: ESP32-C3 recebe o broadcast ESP-NOW do PC1 no canal 6, encaminha o pacote pela USB e o Node-RED valida os dados e atualiza uma planta industrial no navegador.

```text
PC1 / ESP32 emissora → ESP-NOW canal 6 → ESP32-C3 receptora
                                             │ USB / 115200
                                             ▼
                                     Node-RED / PC2
                                  validação, média, alarmes
                                             │ HTTP local / 500 ms
                                             ▼
                                    planta 3D / navegador
```

## Usar neste computador

[Certo] A placa identificada fisicamente foi uma ESP32-C3 (QFN32), revisão 0.4, flash de 4 MB, USB Serial/JTAG, na **COM5**, MAC **94:A9:90:7B:AE:2C**. O firmware receptor foi gravado e verificado nesta preparação.

1. Mantenha o emissor PC1 gerando dados na equipe 1 e no canal 6.
2. Execute `Iniciar_PC2.cmd` se o servidor ainda não estiver aberto.
3. Abra **http://127.0.0.1:1882/** neste PC.
4. Confirme **COM5** e clique em **Conectar**. Aguarde a identificação USB e as amostras.
5. Confira pressão, média, origem, sequência e idade. A pressão do tanque corresponde à mensagem recebida, sem gerar valores aleatórios no modo LIVE.
6. Para liberar a porta antes de gravar novamente ou usar o Monitor Serial, clique em **Liberar USB**.

[Certo] O fluxo fica em **http://127.0.0.1:1882/red/**. O servidor aceita apenas acesso local; 1882 é a porta deste receptor, enquanto o pacote do PC1 usa 1881. Não abra duas instâncias do PC2 ao mesmo tempo.

## Planta e indicações

- TK-101: reservatório pressurizado de ar comprimido, com instrumento PT-101.
- C-101: compressor virtual, com partida, parada e bloqueio.
- Tubulações, válvula, passarela, guarda-corpos, escada e galpão industrial.
- TK-102 e TK-103: tanques de fundo identificados como cenário, sem leituras simuladas adicionais.
- Câmera orbital: arrastar para orbitar, roda para aproximar, botão Restaurar vista.
- Pressão recebida em bar(g), média móvel das últimas cinco amostras e tendência das últimas 120.
- Estado da USB separado da qualidade da telemetria de rádio.

[Certo] Pressão não é representada como altura de líquido. O compressor é apenas virtual: sua partida/parada não modifica a pressão no PC1. Não existe ainda um caminho de comandos de retorno nem um modelo de processo em malha fechada.

## Filtro da origem

[Certo] O filtro padrão aceita equipe 1 e vincula o MAC da primeira mensagem que passar na validação. Depois disso, outros MACs são descartados. O emissor observado nesta preparação foi **14:08:08:A5:98:D0**.

- Para restringir explicitamente, informe equipe e MAC do emissor e clique em Aplicar filtro.
- Campo MAC vazio permite vinculação automática novamente.
- Alterar o filtro limpa histórico e contadores e bloqueia a partida virtual até novo rearme.
- Identificador de equipe e MAC evitam mistura acidental na turma; não constituem autenticação criptográfica.

## Tratamento e qualidade

- Validar versão 1, tanque TK-101, equipe, MAC, pressão numérica finita entre 0 e 10, modo AUTO/TESTE, sequência e sessão.
- Descartar mensagens inválidas, duplicadas, antigas ou de outra origem, sem renovar a validade.
- Preservar `boot`, `seq`, `t_ms`, `p_bar` e `modo` produzidos pelo emissor.
- Reiniciar a média ao mudar de sessão ou após perda de dados.
- Manter até 32 sessões anteriores na lista de rejeição para evitar retorno de pacotes atrasados.
- Após mais de 3 segundos sem amostra válida, ocultar a pressão atual e bloquear o compressor. A detecção no Node-RED ocorre no próximo ciclo, de até 500 ms.
- A página também invalida a apresentação se perder a conexão com o servidor.
- Lacunas representam sequências ausentes no caminho observado, não uma medição isolada de perda pelo rádio. O PC1 pode gerar uma sequência sem conseguir transmiti-la.

[Certo] O firmware usa uma fila para tirar a escrita serial do callback de rádio. O contador de descartes na fila é acumulado desde o boot e pode aumentar enquanto a USB não está sendo lida. Mensagens retidas por mais de 1500 ms na fila da placa são descartadas. A idade indicada combina o tempo de retenção informado pela placa e o tempo local após chegada ao PC2; não é latência de ponta a ponta entre os computadores.

## Alarmes e intertravamento

| Condição | Resposta |
|---|---|
| Pressão ≥ 7,0 bar | Alarme alto; encerra quando ≤ 6,7 bar |
| Pressão ≥ 8,5 bar | Alarme muito alto; para compressor e retém bloqueio |
| Pressão ≤ 8,2 bar | Encerra condição muito alta; mantém bloqueio |
| Sem dados válidos por mais de 3 s | Pressão atual indisponível e bloqueio do compressor |
| Reconhecer | Registra reconhecimento; não remove bloqueio |
| Rearmar | Exige dado válido e pressão ≤ 6,7 bar; não liga compressor |
| Partir C-101 | Exige dado válido e bloqueio rearmado |

[Certo] Alarmes usam pressão bruta, não a média. Os limites são didáticos e não são parâmetros de proteção de uma instalação real. Ao iniciar o programa, o compressor permanece bloqueado até leitura válida e rearme.

## DEMO local e ensaios

1. Abra Demonstração sem rádio e clique Ativar DEMO local. Isso libera a USB e limpa o estado de recepção.
2. Com 5 bar, rearmar e partir o compressor virtual.
3. Aplicar 8,5 bar: verificar HH, sinalização vermelha, parada e bloqueio.
4. Aplicar 6,7 bar: a condição de pressão encerra, mas a partida exige rearme.
5. Suspender dados: após mais de 3 s, verificar indicação de dado vencido e pressão indisponível.
6. Restaurar dados: a leitura retorna; o compressor não liga automaticamente.
7. Clique Conectar para retornar ao rádio. Histórico e contadores são reinicializados; os dados DEMO não se misturam com os reais.

[Certo] DEMO é uma fonte explícita de teste de software, não evidência de recepção física. No modo LIVE, o PC2 não gera pressão.

## Regravar ou instalar em outro PC

1. Instalar Node.js com npm e Arduino IDE. Ambiente validado: Node.js 22.22.3, Arduino-ESP32 3.3.11.
2. Abrir `ESP32_Receptor/ESP32_Receptor.ino`.
3. Selecionar **ESP32C3 Dev Module**, **USB CDC On Boot: Enabled**, porta real da placa.
4. Gravar; se a placa não entrar em download, segurar BOOT, pressionar e soltar RESET, depois soltar BOOT.
5. Após gravação, conferir a COM novamente: USB nativa pode reaparecer com outro número.
6. Fechar Monitor Serial. Executar `Iniciar_PC2.cmd` e conectar pelo painel.

CLI de referência:

```powershell
arduino-cli compile --fqbn esp32:esp32:esp32c3:CDCOnBoot=cdc --build-path build/esp32c3 ESP32_Receptor
arduino-cli upload -p COM5 --fqbn esp32:esp32:esp32c3:CDCOnBoot=cdc --input-dir build/esp32c3 ESP32_Receptor
```

## Arquivos e desenvolvimento

- `src/controller.js`: lógica do nó Function.
- `scripts/build-flow.cjs`: gera `Fluxo_PC2.json` e `runtime/flows.json`.
- `web/`: código da visualização 3D e interface.
- `public/`: aplicação compilada, servida pelo Node-RED; sem dependência de CDN.
- `settings.cjs`: porta 1882, arquivos estáticos e runtime local.
- `tests/controller.test.cjs`: testes da lógica.
- `ESP32_Receptor/`: firmware.
- `VERIFICACAO.md`: resultados efetivamente observados.

```powershell
npm install
npm test
npm run build
npm start
```

[Certo] `npm run build` regenera o fluxo a partir de `src` e substitui edições feitas somente no editor Node-RED. `npm start` usa o fluxo já salvo. Exporte edições do editor se quiser preservá-las. Contexto, filtros, contadores e histórico ficam em memória, não em arquivo persistente.

[Certo] Para importar apenas `Fluxo_PC2.json` em outro Node-RED, instalar `node-red-node-serialport` e configurar a pasta `public` como `httpStatic`. Importar o fluxo sozinho não instala a cena 3D.

## Diagnóstico

| Situação | Verificação |
|---|---|
| USB identificada, sem pressão | Emissor ligado; equipe igual; canal 6; origem configurada corretamente |
| Porta ocupada | Fechar Monitor Serial e outras aplicações; Liberar USB antes de gravar |
| COM5 não aparece | Cabo de dados, conexão USB, modo BOOT e enumeração no Windows |
| Sem mensagens mesmo após gravar | Confirmar ESP32-C3 e USB CDC On Boot habilitado |
| Erro COM0 no início | Porta fictícia inicial; clicar Conectar com a COM real |
| Receptor perdeu conexão | Liberar USB, conferir COM e Conectar novamente |
| Muitos intervalos sem dados | Aproximar as placas, verificar alimentação e interferência no canal; comparar contadores no PC1 |
| 3D indisponível | Testar Chrome/Edge com WebGL; painel numérico continua independente da cena |

## Referências técnicas

- [Espressif: ESP-NOW e callbacks de recepção](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c3/api-reference/network/esp_now.html).
- [Espressif: USB CDC para ESP32-C3](https://docs.espressif.com/projects/arduino-esp32/en/latest/tutorials/cdc_dfu_flash.html).
- [Node-RED: nós seriais](https://flows.nodered.org/node/node-red-node-serialport).
