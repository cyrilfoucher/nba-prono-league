import { getWinner, type Game, type GameSide } from "@repo/core";

import { Card } from "../components/Card";
import { formatShortDate, formatTime } from "./format";
import styles from "./GameCard.module.css";
import { GameStatusLabel } from "./GameStatusLabel";
import { getTeamColors } from "./team-colors";
import { TeamLine, type TeamResult } from "./TeamLine";

function resultOf(side: GameSide, winner: GameSide | null): TeamResult {
  if (winner === null) {
    return "none";
  }
  return side === winner ? "winner" : "loser";
}

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const { homeTeam, visitorTeam, status, startsAt } = game;
  const winner = getWinner(game);
  const showScore = status === "in_progress" || status === "final";
  const time = formatTime(startsAt);
  const accent = `linear-gradient(90deg, ${getTeamColors(homeTeam.abbreviation).primary}, ${
    getTeamColors(visitorTeam.abbreviation).primary
  })`;

  return (
    <Card as="article" accent={accent} aria-label={`${homeTeam.name} contre ${visitorTeam.name}`}>
      <div className={styles.meta}>
        <GameStatusLabel status={status} time={time} />
        <time className={styles.date} dateTime={startsAt.toISOString()}>
          {formatShortDate(startsAt)}
          {status === "scheduled" ? "" : ` · ${time}`}
        </time>
      </div>
      <ul className={styles.teams}>
        <TeamLine
          team={homeTeam}
          sideLabel="domicile"
          score={game.homeScore}
          showScore={showScore}
          result={resultOf("home", winner)}
        />
        <TeamLine
          team={visitorTeam}
          sideLabel="extérieur"
          score={game.visitorScore}
          showScore={showScore}
          result={resultOf("visitor", winner)}
        />
      </ul>
    </Card>
  );
}
