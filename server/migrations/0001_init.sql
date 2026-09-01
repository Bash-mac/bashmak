-- Users table (Telegram Identity & Profile Metadata)
CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    language_code TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL
);

-- Player Profiles (Canonical Single Source of Truth)
CREATE TABLE IF NOT EXISTS player_profiles (
    telegram_id INTEGER PRIMARY KEY,
    goo_balance INTEGER NOT NULL DEFAULT 0,
    selected_hero_id TEXT NOT NULL DEFAULT 'hero_vypolzok',
    unlocked_hero_ids TEXT NOT NULL DEFAULT '["hero_vypolzok","hero_markovka","hero_baklazhan"]',
    power_ups TEXT NOT NULL DEFAULT '{}',
    stats TEXT NOT NULL DEFAULT '{"totalRuns":0,"totalKills":0,"totalGooEarned":0,"bestSurvivalTimeSec":0,"bestKills":0,"bestScore":0}',
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- Idempotent Transactions Log (Prevents duplicate charges/rewards and double actions)
CREATE TABLE IF NOT EXISTS transactions (
    idempotency_key TEXT PRIMARY KEY,
    telegram_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- Run Sessions for Anti-Cheat & Timing validation
CREATE TABLE IF NOT EXISTS run_sessions (
    run_id TEXT PRIMARY KEY,
    telegram_id INTEGER NOT NULL,
    hero_id TEXT NOT NULL,
    seed INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'abandoned'
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_run_sessions_user_status ON run_sessions(telegram_id, status);
