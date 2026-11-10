# Verificação do transmissor PC1 — 09/11/2026

[Certo] Testes realizados nesta preparação:

- Oito testes automatizados de lógica aprovados: início pausado, simulação sem hardware, validação de configuração, pressão fixa, espera de confirmação, timeout de identificação, retorno incorreto, pausa/liberação, limites da simulação e descarte de mensagens inválidas.
- Node-RED 4.0.9 iniciou com os nós `node-red-node-serialport` 2.0.3, no Windows e Node.js 22.22.3.
- O painel foi aberto no navegador e mostrou 8,50 bar em modo TESTE, com amostras geradas e zero envios USB/radio sem placa.
- O modo AUTO e os controles de iniciar, pausar e aplicar configuração foram exercitados no painel.
- Firmware compilado com Arduino-ESP32 3.3.11 para `esp32:esp32:esp32doit-devkit-v1`: 895260 bytes de programa (68%) e 45744 bytes de memória global (13%).

[Certo] A gravação na COM3 deste computador não ocorreu: nenhuma porta serial estava disponível. O usuário esclareceu que a ESP32 está conectada em outro computador. Portanto, upload, comunicação USB física e emissão ESP-NOW real precisam ser validados no PC1 onde a placa está conectada.

[Certo] Nenhum resultado comprova recepção pelo PC2. O receptor pertence à próxima etapa. Os binários compilados são artefatos de referência e não são evidência de gravação na placa.

## Aceitação no computador de destino

1. Gravar o sketch pela Arduino IDE e observar mensagens `ready` a 115200 baud.
2. Fechar o Monitor Serial, executar o painel e conectar à COM real.
3. Conferir o MAC, canal 6 e identificação de ESP32 disponível.
4. Gerar 20 amostras em TESTE a 5,00 bar. Verificar retorno `type: tx`, `ok: true` e `p_bar: 5`.
5. Fixar 8,50 bar e verificar o novo valor nos retornos.
6. Pausar: não devem surgir novos comandos, exceto a conclusão de um já pendente.
7. Desconectar a placa: após 2,5 s sem identificação válida, bloquear novos envios USB. A simulação local pode continuar, identificada como sem rádio.
8. Reconectar, aguardar identificação e observar apenas amostras novas, sem despejo de fila antiga.
