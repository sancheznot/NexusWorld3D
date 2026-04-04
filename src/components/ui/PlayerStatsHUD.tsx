/**
 * ES: Alias del HUD principal (`GameHUD`) por compatibilidad con imports antiguos.
 * EN: Alias for main `GameHUD` for backward-compatible imports.
 */
import GameHUD, { type GameHUDProps } from "@/components/ui/GameHUD";

export type PlayerStatsHUDProps = GameHUDProps;

export default function PlayerStatsHUD(props: PlayerStatsHUDProps) {
  return <GameHUD {...props} />;
}
