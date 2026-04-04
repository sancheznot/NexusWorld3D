-- ES: Perfil de cuenta (nombre en juego, bio, prefs) enlazado a auth_user — tienda / lobby futuros.
-- EN: Account profile (in-game name, bio, prefs) linked to auth_user — future shop / lobby.

CREATE TABLE IF NOT EXISTS game_account_profile (
  user_id VARCHAR(36) NOT NULL PRIMARY KEY,
  display_name VARCHAR(48) NOT NULL,
  bio VARCHAR(500) NULL,
  prefs_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_game_account_profile_user FOREIGN KEY (user_id) REFERENCES auth_user (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
