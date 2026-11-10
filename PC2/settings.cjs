const path = require('node:path');
module.exports = {
  uiPort: 1882, uiHost: '127.0.0.1', httpAdminRoot: '/red', httpNodeRoot: '/',
  httpStatic: path.join(__dirname, 'public'),
  nodesDir: path.join(__dirname, 'node_modules/node-red-node-serialport'),
  flowFilePretty: true, contextStorage: { default: { module: 'memory' } },
  editorTheme: { projects: { enabled: false } },
  logging: { console: { level: 'info', metrics: false, audit: false } }
};
