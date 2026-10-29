-- SmartWallet database schema (PostgreSQL / Neon)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MAD',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- login sessions (express-session + connect-pg-simple): the browser only has the random sid in a cookie
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_expire ON user_sessions (expire);

-- user_id NULL = default category shared by everyone
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_default_unique
  ON categories (name, type) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_unique
  ON categories (user_id, name, type) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  ocr_text TEXT,
  extracted_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description VARCHAR(255),
  merchant VARCHAR(150),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_date ON transactions (user_id, date);

-- month is always the first day of the month
-- category_id NULL = overall monthly budget
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  amount_limit NUMERIC(12, 2) NOT NULL CHECK (amount_limit > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS budgets_overall_unique
  ON budgets (user_id, month) WHERE category_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_category_unique
  ON budgets (user_id, month, category_id) WHERE category_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS savings_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  target_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- contributions are separate from expenses (saving is not spending)
CREATE TABLE IF NOT EXISTS savings_contributions (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  note VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- statistics = numbers calculated by the backend, analysis = AI interpretation
CREATE TABLE IF NOT EXISTS ai_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  statistics JSONB NOT NULL,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month)
);

-- Profile photo (small data URL, resized in the browser)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

-- AI assistant conversation (one thread per user)
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON chat_messages (user_id, id);
