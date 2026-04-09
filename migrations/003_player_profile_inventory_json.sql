-- ES: Inventario serializado (sobrevive reinicio del servidor si usas MariaDB).
-- EN: Serialized inventory snapshot on player_profile.

ALTER TABLE player_profile
  ADD COLUMN inventory_json JSON NULL AFTER stats_json;
