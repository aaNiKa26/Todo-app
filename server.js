'use strict';
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required. Configure it in Coolify Environment Variables.');
  process.exit(1);
}
const pool = new Pool({ connectionString: databaseUrl, max: 10, connectionTimeoutMillis: 5000 });
app.disable('x-powered-by');
app.use(express.json({limit: '16kb'}));
app.use(express.static(path.join(__dirname, 'public')));

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
const parseId = (value) => {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};
const normalize = (input) => ({
  title: typeof input.title === 'string' ? input.title.trim() : '',
  description: typeof input.description === 'string' ? input.description.trim() : ''
});
const view = (result) => result.rows.map(({id, ...todo}) => ({id: String(id), ...todo}));

app.get('/api/health', async (_req,res,next) => {
  try { await pool.query('SELECT 1'); res.json({status:'ok', database:'connected'}); }
  catch (err) { next(err); }
});
app.get('/api/todos', async (_req,res,next) => {
  try { const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC, id DESC'); res.json(view(result)); }
  catch (err) { next(err); }
});
app.post('/api/todos', async (req,res,next) => {
  try {
    const {title, description} = normalize(req.body || {});
    if (!title || title.length > 200 || description.length > 2000) return res.status(400).json({error:'Title is required (max 200 chars); description max 2000 chars.'});
    const result = await pool.query('INSERT INTO todos(title,description) VALUES ($1,$2) RETURNING *',[title,description]);
    res.status(201).json(view(result)[0]);
  } catch (err) { next(err); }
});
app.patch('/api/todos/:id', async (req,res,next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({error:'Invalid task ID'});
    const input = req.body || {};
    if (!Object.prototype.hasOwnProperty.call(input,'title') && !Object.prototype.hasOwnProperty.call(input,'description') && !Object.prototype.hasOwnProperty.call(input,'completed')) return res.status(400).json({error:'Provide at least one field'});
    if (input.title !== undefined && (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200)) return res.status(400).json({error:'Title must be 1-200 characters'});
    if (input.description !== undefined && (typeof input.description !== 'string' || input.description.trim().length > 2000)) return res.status(400).json({error:'Description must be under 2000 characters'});
    if (input.completed !== undefined && typeof input.completed !== 'boolean') return res.status(400).json({error:'Completed must be a boolean'});
    const result = await pool.query(`UPDATE todos SET
       title = COALESCE($1, title), description = COALESCE($2, description),
       completed = COALESCE($3, completed), updated_at = NOW()
       WHERE id = $4 RETURNING *`,[input.title === undefined ? null : input.title.trim(), input.description === undefined ? null : input.description.trim(), input.completed === undefined ? null : input.completed,id]);
    if (!result.rowCount) return res.status(404).json({error:'Task not found'});
    res.json(view(result)[0]);
  } catch(err) { next(err); }
});
app.delete('/api/todos/:id', async (req,res,next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({error:'Invalid task ID'});
    const result = await pool.query('DELETE FROM todos WHERE id=$1 RETURNING id',[id]);
    if (!result.rowCount) return res.status(404).json({error:'Task not found'});
    res.status(204).end();
  } catch(err) { next(err); }
});
app.use('/api', (_req,res) => res.status(404).json({error:'API endpoint not found'}));
app.use((err, _req, res, _next) => {
  console.error('Request failed:', err.message);
  res.status(500).json({error:'Database or server error. Check Coolify logs.'});
});

async function start() {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try { await initializeDatabase(); break; }
    catch (err) {
      if (attempt === 20) { console.error('Could not connect to PostgreSQL:', err.message); process.exit(1); }
      console.log(`Waiting for database (attempt ${attempt}/20)...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  app.listen(port, '0.0.0.0', () => console.log(`Todo app listening on port ${port}`));
}
start();
process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
