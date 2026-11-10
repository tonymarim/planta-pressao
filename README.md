# Planta de pressão — Comissionamento Virtual / Aula 12

Sistema didático de telemetria de pressão entre dois computadores com ESP32, ESP-NOW, Node-RED e uma planta industrial 3D.

**PC1 gera pressão sintética; PC2 recebe e apresenta as mesmas amostras.** O processo é simulado e não utiliza sensor físico nem comanda equipamentos pressurizados reais.

```text
PC1 / Node-RED → USB → ESP32 DevKit V1
                              │
                      ESP-NOW broadcast
                          canal 6
                              │
PC2 / planta 3D ← Node-RED ← USB ← ESP32-C3
```

## Conteúdo

| Pasta | Conteúdo |
|---|---|
| [PC1](PC1/README.md) | Firmware transmissor, painel, fluxo Node-RED e testes |
| [PC2](PC2/README.md) | Firmware receptor, planta 3D, alarmes, intertravamento e testes |
| [docs](docs/Roteiro_Aula_12.md) | Roteiro pedagógico e critérios de comissionamento |
| [pacotes](pacotes/) | ZIPs entregues para instalação em outros computadores |
| [third-party](third-party/README.md) | Referências e licença da biblioteca 3D distribuída |

As pastas `firmware_compilado` contêm binários dos alvos usados nos testes. Os fontes `.ino` são a referência para recompilar para outro modelo. A pasta `PC2/public` já contém a cena compilada, com bibliotecas locais.

## Início rápido

Ambiente utilizado: Windows 11, Node.js 22.22.3, Node-RED 4.0.9, pacote Arduino-ESP32 3.3.11. Instale Node.js com npm e Arduino IDE antes de começar. A instalação inicial das dependências precisa de Internet.

### PC1 — emissor

1. Grave [ESP32_Transmissor.ino](PC1/ESP32_Transmissor/ESP32_Transmissor.ino) em uma **DOIT ESP32 DEVKIT V1**.
2. Feche o Monitor Serial.
3. Execute `PC1/Iniciar_PC1.cmd`.
4. Abra **http://127.0.0.1:1881/** no PC1.
5. Informe a COM local, clique Conectar e aguarde ESP32 disponível.
6. Selecione equipe 1 e modo AUTO, aplique a configuração e clique Iniciar.

### PC2 — receptor

1. Grave [ESP32_Receptor.ino](PC2/ESP32_Receptor/ESP32_Receptor.ino) na **ESP32-C3**, selecionando **ESP32C3 Dev Module** e **USB CDC On Boot: Enabled**.
2. Feche o Monitor Serial.
3. Execute `PC2/Iniciar_PC2.cmd`.
4. Abra **http://127.0.0.1:1882/** no PC2.
5. Informe a COM local, clique Conectar e aguarde a identificação USB e as amostras.
6. Confira pressão, contador, sequência e origem. Use a mesma equipe configurada no PC1.

As COM3/COM5 dos guias são exemplos do ambiente utilizado: confira a porta real em cada máquina. `127.0.0.1` sempre aponta para o computador em que o navegador está aberto. O sistema não depende de rede IP entre os PCs: o enlace entre eles é ESP-NOW.

## Funcionalidades

- Pressão de 0 a 10 bar(g), a cada 500 ms, com caminhada aleatória limitada ou valor fixo para ensaios.
- Transporte em broadcast no canal 6, com identificação de equipe, tanque, sessão e sequência.
- Filtragem de origem, rejeição de duplicatas e dados inválidos, média móvel de cinco amostras e indicação de qualidade.
- Tanque TK-101, compressor C-101, instrumentos, tubulações, passarelas e galpão em Babylon.js.
- Alarme alto em 7,0 bar e muito alto em 8,5 bar, com histerese e bloqueio virtual retido.
- Após mais de 3 s sem dados válidos, ocultar pressão atual e bloquear o compressor virtual.
- DEMO local explícito no PC2, separado da recepção real.

O compressor do PC2 é virtual e não altera a pressão gerada pelo PC1. O projeto atual é uma validação de telemetria, supervisão e lógica; não implementa controle em malha fechada nem confirmação de aplicação de retorno ao emissor.

## Teste de ponta a ponta

| Ação no PC1 | Resultado esperado no PC2 |
|---|---|
| Iniciar modo AUTO | Pressão varia e contador aumenta |
| TESTE a 5,00 bar | Leitura de 5,00 bar |
| TESTE a 8,50 bar | Alarme HH e compressor virtual bloqueado |
| Voltar a 5,00 bar | Rearme permitido; partida requer comando separado |
| Pausar por mais de 3 s | Pressão indisponível e bloqueio |
| Reiniciar emissão | Leitura retorna, sem partida automática |

No PC1, o contador **Geradas** sozinho não prova transmissão. Confira também **Enviadas à USB** e **Rádio: concluídas**. No PC2, use o modo de rádio, não DEMO, para comprovar recepção física.

## Estado de validação

Preparação de 09/11/2026:

- Firmware transmissor compilado para DevKit V1; o usuário confirmou seu funcionamento no PC1.
- Receptor ESP32-C3 identificado, gravado na COM5 e verificado por hash.
- Recepção física e visualização confirmadas com dados do emissor; o usuário também confirmou o funcionamento.
- 20 testes automatizados aprovados: oito do PC1 e doze do PC2.
- Cena 3D compilada e inspecionada; alarme HH e parada do compressor exercitados em DEMO.

Os relatórios [PC1/VERIFICACAO.md](PC1/VERIFICACAO.md) e [PC2/VERIFICACAO.md](PC2/VERIFICACAO.md) preservam o histórico de cada etapa, inclusive momentos em que a placa estava em outro computador ou temporariamente desconectada. Uma indicação histórica de COM ausente não significa que o firmware deixou de funcionar.

O [roteiro original](docs/Roteiro_Aula_12.md) é uma proposta pedagógica anterior à implementação. Na implementação entregue, a geração está no Node-RED do PC1 e a tela consulta o Node-RED local por HTTP; consulte os READMEs dos projetos para o comportamento efetivo.

## Desenvolvimento

Em cada pasta PC1/PC2:

```powershell
npm ci
npm test
npm run build
npm start
```

Os fluxos importáveis são `PC1/Fluxo_PC1.json` e `PC2/Fluxo_PC2.json`. Para importar em outra instalação Node-RED, instale `node-red-node-serialport`. No PC2, configure também `public` como pasta estática; importar somente o fluxo não instala a cena.

Os scripts de build geram fluxos a partir dos fontes em `src`: exporte alterações feitas diretamente no editor antes de regenerar. Os contextos e contadores ficam em memória. Logs, configurações locais, credenciais do runtime, caches e dependências instaladas não são versionados.

## Mais receptores e substituição de placa

Como o envio é broadcast, outros receptores podem usar o mesmo canal e equipe sem alterar o transmissor. A confiabilidade depende do ambiente e deve ser verificada em cada estação; o transmissor não recebe confirmação individual do PC2.

Para usar uma DevKit V1 como receptora, recompile o **fonte receptor** selecionando DOIT ESP32 DEVKIT V1 e ajuste a COM no painel. Não grave o binário da ESP32-C3 na ESP32 clássica. A opção USB CDC On Boot não se aplica à DevKit V1 com conversor USB–serial. Essa variante deve passar pelos mesmos testes de recepção após a troca.
