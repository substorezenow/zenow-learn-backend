# CockroachDB Operations Documentation

This document provides code examples and explanations for basic and advanced database operations using the `pg` client in Node.js (compatible with CockroachDB).

## Table of Contents
- [Connecting to CockroachDB](#connecting-to-cockroachdb)
- [Create (Insert)](#create-insert)
- [Read (Select)](#read-select)
- [Update (Basic)](#update-basic)
- [Update (Advanced)](#update-advanced)
- [Delete](#delete)
- [Transactions](#transactions)
- [Upsert (Insert or Update)](#upsert-insert-or-update)
- [Bulk Operations](#bulk-operations)

---

## Connecting to CockroachDB
```js
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.COCKROACH_URL });
await client.connect();
```

## Create (Insert)
```js
const text = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *';
const values = ['alice', 'hashedpassword'];
const res = await client.query(text, values);
console.log(res.rows[0]);
```

## Read (Select)
```js
const text = 'SELECT * FROM users WHERE username = $1';
const values = ['alice'];
const res = await client.query(text, values);
console.log(res.rows[0]);
```

## Update (Basic)
```js
const text = 'UPDATE users SET password = $1 WHERE username = $2 RETURNING *';
const values = ['newhashedpassword', 'alice'];
const res = await client.query(text, values);
console.log(res.rows[0]);
```

## Update (Advanced)
- Update multiple fields:
```js
const text = 'UPDATE users SET password = $1, last_login = NOW() WHERE username = $2 RETURNING *';
const values = ['newhashedpassword', 'alice'];
const res = await client.query(text, values);
console.log(res.rows[0]);
```
- Conditional update:
```js
const text = 'UPDATE users SET password = $1 WHERE username = $2 AND active = true RETURNING *';
const values = ['newhashedpassword', 'alice'];
const res = await client.query(text, values);
console.log(res.rows[0]);
```

## Delete
```js
const text = 'DELETE FROM users WHERE username = $1 RETURNING *';
const values = ['alice'];
const res = await client.query(text, values);
console.log(res.rows[0]);
```

## Transactions
```js
try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - 100 WHERE id = $1', [1]);
  await client.query('UPDATE accounts SET balance = balance + 100 WHERE id = $2', [2]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
}
```

## Upsert (Insert or Update)
```js
const text = `INSERT INTO users (username, password) VALUES ($1, $2)
  ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password RETURNING *`;
const values = ['alice', 'newhashedpassword'];
const res = await client.query(text, values);
console.log(res.rows[0]);
```

## Bulk Operations
- Insert multiple rows:
```js
const text = 'INSERT INTO users (username, password) VALUES ($1, $2), ($3, $4) RETURNING *';
const values = ['alice', 'pass1', 'bob', 'pass2'];
const res = await client.query(text, values);
console.log(res.rows);
```

---

For more advanced queries, refer to the CockroachDB SQL documentation or ask for a specific use case!