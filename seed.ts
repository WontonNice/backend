import { pool } from './db';

async function seed() {
  await pool.query(`
    INSERT INTO teachers (name, password, role)
    VALUES ('adminlol', 'acfn', 'admin')
  `);

  console.log('Seed complete');
  process.exit();
}

seed();
