import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './schema';

let db: Database | null = null;
let SQL: any = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    if (!SQL) {
      SQL = await initSqlJs();
    }

    const dbPath = process.env.DATABASE_PATH || './data/benchmarks.db';
    const dbDir = path.dirname(dbPath);
    
    // Ensure data directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Load existing database or create new one
    let newDb: Database;
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      newDb = new SQL.Database(buffer);
    } else {
      newDb = new SQL.Database();
    }

    initializeDatabase(newDb);
    db = newDb;
  }
  return db;
}

export function saveDatabase(): void {
  if (db) {
    const dbPath = process.env.DATABASE_PATH || './data/benchmarks.db';
    const data = db.export();
    fs.writeFileSync(dbPath, data);
  }
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

