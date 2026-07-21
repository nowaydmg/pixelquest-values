-- Pixel Quest Values — Turso (libSQL) schema
-- Run this in Turso dashboard → Shell, or via: turso db shell <your-db> < turso-schema.sql

-- User profiles (includes auth — no separate auth table)
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'beta tester', 'value manager', 'moderator', 'admin', 'owner')),
  ip TEXT DEFAULT 'unknown',
  warnings INTEGER NOT NULL DEFAULT 0,
  banned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Items
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  icon TEXT,
  name TEXT NOT NULL,
  corrupted_pages INTEGER,
  tier TEXT,
  rarity TEXT NOT NULL DEFAULT 'Common',
  type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trade offers
CREATE TABLE IF NOT EXISTS trade_offers (
  id TEXT PRIMARY KEY,
  seller TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price TEXT,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trade requests
CREATE TABLE IF NOT EXISTS trade_requests (
  id TEXT PRIMARY KEY,
  requester TEXT NOT NULL,
  item_name TEXT NOT NULL,
  cp INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Direct messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  text TEXT NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  reason TEXT NOT NULL,
  reporter TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Player ratings
CREATE TABLE IF NOT EXISTS player_ratings (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rater TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  achievement TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (username, achievement)
);

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  item_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (username, item_name)
);

-- Transaction history
CREATE TABLE IF NOT EXISTS transaction_history (
  id TEXT PRIMARY KEY,
  offer_id TEXT,
  buyer TEXT NOT NULL,
  seller TEXT NOT NULL,
  item TEXT NOT NULL,
  price TEXT,
  rating INTEGER,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Banned IPs
CREATE TABLE IF NOT EXISTS banned_ips (
  id TEXT PRIMARY KEY,
  ip TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_trade_offers_seller ON trade_offers(seller);
CREATE INDEX IF NOT EXISTS idx_trade_requests_requester ON trade_requests(requester);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_watchlist_username ON watchlist(username);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transaction_history(buyer);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transaction_history(seller);
