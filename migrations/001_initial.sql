-- ES: Esquema inicial MariaDB — perfiles, auditoría admin, settings del sitio.
-- EN: Initial MariaDB schema — profiles, admin audit, site settings.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(191) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_profile (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  username_norm VARCHAR(100) NOT NULL,
  world_id VARCHAR(64) NOT NULL DEFAULT 'main-world',
  health INT NOT NULL DEFAULT 100,
  max_health INT NOT NULL DEFAULT 100,
  stamina INT NOT NULL DEFAULT 100,
  max_stamina INT NOT NULL DEFAULT 100,
  hunger INT NOT NULL DEFAULT 100,
  max_hunger INT NOT NULL DEFAULT 100,
  level INT NOT NULL DEFAULT 1,
  experience BIGINT NOT NULL DEFAULT 0,
  pos_x DOUBLE NOT NULL DEFAULT 0,
  pos_y DOUBLE NOT NULL DEFAULT 0,
  pos_z DOUBLE NOT NULL DEFAULT 0,
  rot_x DOUBLE NOT NULL DEFAULT 0,
  rot_y DOUBLE NOT NULL DEFAULT 0,
  rot_z DOUBLE NOT NULL DEFAULT 0,
  map_id VARCHAR(64) NOT NULL DEFAULT 'exterior',
  role_id VARCHAR(64) NULL,
  stats_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_player_profile_username_norm (username_norm),
  KEY idx_player_profile_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_username VARCHAR(100) NOT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id VARCHAR(255) NULL,
  payload JSON NULL,
  ip VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_admin_audit_created (created_at),
  KEY idx_admin_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(191) NOT NULL PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
