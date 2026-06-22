const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect()
  .then(() => console.log('Connected'))
  .catch(err => console.error('Error', err))
  .finally(() => client.end());
