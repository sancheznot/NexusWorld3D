-- ES: Tablas Auth.js (NextAuth v5) — usuarios OAuth/email, cuentas enlazadas, magic links.
-- EN: Auth.js tables — OAuth/email users, linked accounts, verification tokens.

CREATE TABLE IF NOT EXISTS auth_user (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NULL,
  email VARCHAR(255) NOT NULL,
  emailVerified DATETIME(3) NULL,
  image VARCHAR(2048) NULL,
  UNIQUE KEY uk_auth_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_account (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  providerAccountId VARCHAR(255) NOT NULL,
  refresh_token TEXT NULL,
  access_token TEXT NULL,
  expires_at INT NULL,
  token_type VARCHAR(255) NULL,
  scope TEXT NULL,
  id_token TEXT NULL,
  session_state VARCHAR(255) NULL,
  UNIQUE KEY uk_auth_account_provider (provider, providerAccountId),
  KEY idx_auth_account_userId (userId),
  CONSTRAINT fk_auth_account_user FOREIGN KEY (userId) REFERENCES auth_user (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_verification_token (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires DATETIME(3) NOT NULL,
  PRIMARY KEY (identifier, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
