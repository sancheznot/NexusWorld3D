-- ES: Estado de vivienda / parcela (Fase 1 roadmap).
-- EN: Housing / plot state (Phase 1 roadmap).

ALTER TABLE player_profile
  ADD COLUMN housing_json JSON NULL AFTER inventory_json;
