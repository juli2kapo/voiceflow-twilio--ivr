// src/menu/schema.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../.cache/nix/binary-cache-v6.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    seats INTEGER NOT NULL,
    status TEXT NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER NOT NULL,
    amountOfPeople INTEGER NOT NULL,
    fromHour DATETIME NOT NULL,
    toHour DATETIME NOT NULL,
    responsibleName TEXT NOT NULL,
    FOREIGN KEY(table_id) REFERENCES tables(id)
  )`);
});

module.exports = db;