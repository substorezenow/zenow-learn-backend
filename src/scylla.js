const { Client } = require('@scylladb/nodejs-driver');

let scyllaClient;

function connectScylla() {
  scyllaClient = new Client({
    contactPoints: [process.env.SCYLLA_HOST || '127.0.0.1'],
    localDataCenter: process.env.SCYLLA_DATACENTER || 'datacenter1',
    keyspace: process.env.SCYLLA_KEYSPACE || 'test_keyspace',
    credentials: {
      username: process.env.SCYLLA_USER || '',
      password: process.env.SCYLLA_PASS || ''
    }
  });
  scyllaClient.connect()
    .then(() => console.log('Connected to ScyllaDB'))
    .catch(err => console.error('ScyllaDB connection error:', err));
}

module.exports = { connectScylla, scyllaClient };
