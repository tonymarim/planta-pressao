# Verificação do PC2 — 09/11/2026

[Certo] A placa na COM5 foi identificada como ESP32-C3 QFN32, revisão 0.4, flash de 4 MB e USB Serial/JTAG. MAC: 94:A9:90:7B:AE:2C.

[Certo] Firmware compilado com Arduino-ESP32 3.3.11, alvo `esp32:esp32:esp32c3:CDCOnBoot=cdc`: 951277 bytes de programa (72%) e 36048 bytes de memória global (11%). A gravação na COM5 terminou com verificação de hash e reinicialização da placa.

[Certo] Doze testes de software passaram: validação, média móvel, duplicatas, origem/equipe, histerese, bloqueio retido, timeout, troca de sessão, lacunas, backlog, separação DEMO/LIVE, desconexão e conexão idempotente.

[Certo] A aplicação 3D foi compilada pelo Vite e aberta no navegador. A recepção física foi observada: emissor 14:08:08:A5:98:D0, equipe 1, pressão 6,88 bar, sequência 2166, RSSI -76 dBm. Essa evidência confirma o caminho emissor → rádio → receptor → USB → Node-RED → painel naquele teste.

[Certo] No DEMO, 5 bar permitiu rearme e partida virtual. Ao aplicar 8,5 bar, o painel registrou alarme muito alto e parada/bloqueio do compressor. Timeout e histerese também foram verificados nos testes automatizados; o teste físico de pausar o PC1 deve integrar o roteiro do usuário.

[Certo] Na retomada posterior desta sessão, o servidor temporário estava encerrado. Foi iniciado novamente em segundo plano, mas a COM5 não estava disponível no Windows naquele momento (`File not found`). A recepção física anterior não comprova conexão atual: conferir cabo e porta antes de repetir os testes.

## Teste rápido no PC2

1. Abrir http://127.0.0.1:1882/.
2. Manter a ESP32-C3 conectada; selecionar a COM atual e clicar Conectar.
3. No PC1, manter equipe 1 e iniciar emissão.
4. Verificar ESP32-C3 identificada, estado VALIDO e contador de amostras aumentando.
5. No PC1, usar TESTE a 5,00 bar: conferir a pressão recebida no PC2.
6. Usar TESTE a 8,50 bar: conferir HH e bloqueio virtual.
7. Voltar a 5,00 bar: rearmar e partir o compressor virtual separadamente.
8. Pausar o PC1 por mais de 3 s: pressão atual deve ficar indisponível e compressor bloqueado.
9. Reiniciar PC1: leitura retorna sem partida automática do compressor.
