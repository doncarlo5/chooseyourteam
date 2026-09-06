import { DESERT_LAGOON_TEAM_ENCODINGS } from "@/src/game-themes/desert-lagoon-team-encoding";
import { createShapedResultArtwork } from "@/src/game-themes/shaped-result-artwork";

const desertResults = createShapedResultArtwork(
  DESERT_LAGOON_TEAM_ENCODINGS,
  "satin",
);
export const TeamResultArtwork = desertResults.RevealedDot;
export const SharedTeamResultArtwork = desertResults.SharedRevealedDot;
