const { createServer } = require('./scripts/server.cjs');

createServer().listen(Number(process.env.PORT || 3000));
