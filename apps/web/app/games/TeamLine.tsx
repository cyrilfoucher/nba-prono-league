import type { Team } from "@repo/core";

import { Badge } from "../components/Badge";
import { classNames } from "../components/class-names";
import { getTeamColors } from "./team-colors";
import styles from "./TeamLine.module.css";

export type TeamResult = "winner" | "loser" | "none";

interface TeamLineProps {
  team: Team;
  sideLabel: string;
  // null : pas de score à afficher (match à venir, reporté ou annulé).
  score: number | null;
  showScore: boolean;
  result: TeamResult;
}

export function TeamLine({ team, sideLabel, score, showScore, result }: TeamLineProps) {
  const colors = getTeamColors(team.abbreviation);

  return (
    <li className={classNames(styles.line, styles[result])}>
      <Badge
        label={team.abbreviation}
        background={colors.primary}
        color={colors.text}
        borderColor={colors.secondary}
        decorative
      />
      <span className={styles.name}>
        {team.name}
        <span className="visually-hidden">
          {` (${sideLabel})`}
          {result === "winner" ? ", vainqueur" : ""}
        </span>
      </span>
      {showScore && <span className={styles.score}>{score ?? "–"}</span>}
    </li>
  );
}
