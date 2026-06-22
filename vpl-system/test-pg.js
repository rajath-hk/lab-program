const { Client } = require('pg');
const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'vpl'
});
client.connect()
 .then(() => console.log('Connected'))
 .catch(err => console.error('Connect error', err))
 .finally(() => client.end());
