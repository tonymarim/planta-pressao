# Dependências de terceiros

As versões e integridades das dependências estão nos arquivos `package-lock.json` de PC1 e PC2. Instale-as com `npm ci`.

O build distribuído em `PC2/public` inclui código Babylon.js (`@babylonjs/core` 9.32.0), cuja licença Apache 2.0 está em [BabylonJS-license.md](BabylonJS-license.md). Os fontes da cena deste projeto ficam em `PC2/web`.

Os firmwares são compilados com Arduino-ESP32 3.3.11 e seu SDK Espressif. Licenças e avisos dos componentes são fornecidos pelos respectivos pacotes oficiais. Os arquivos `.bin` são específicos de cada alvo; use os fontes para recompilar.

- [Babylon.js](https://github.com/BabylonJS/Babylon.js)
- [Node-RED](https://github.com/node-red/node-red)
- [Nós seriais Node-RED](https://github.com/node-red/node-red-nodes/tree/master/io/serialport)
- [Arduino-ESP32](https://github.com/espressif/arduino-esp32)
