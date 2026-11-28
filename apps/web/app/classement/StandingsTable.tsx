import type { Standing } from "@repo/core";

import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { classNames } from "../components/class-names";
import { getTeamColors } from "../games/team-colors";
import { formatGamesBehind, formatWinPercentage, shortTeamName } from "./format";
import styles from "./StandingsTable.module.css";

// Les 6 premiers vont en playoffs, les 7e à 10e jouent le play-in.
const PLAYOFF_SPOTS = 6;
const PLAY_IN_LAST_SPOT = 10;

interface StandingsTableProps {
  // Sert à relier le titre de la section au tableau.
  id: string;
  title: string;
  // Couleur de la conférence : pastille du titre et liseré de la carte.
  color: string;
  standings: Standing[];
  // Traits et légende des places en playoffs et en play-in (classements par conférence).
  showZones?: boolean;
}

export function StandingsTable({
  id,
  title,
  color,
  standings,
  showZones = true,
}: StandingsTableProps) {
  const titleId = `${id}-titre`;

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        <span className={styles.marker} style={{ background: color }} aria-hidden="true" />
        {title}
      </h2>
      <Card accent={color}>
        {standings.length > 0 ? (
          <>
            <table className={styles.table} aria-labelledby={titleId}>
              <thead>
                <tr>
                  <th scope="col" className={styles.number}>
                    Rang
                  </th>
                  <th scope="col" className={styles.team}>
                    Équipe
                  </th>
                  <th scope="col" className={styles.number}>
                    <span title="Victoires" aria-hidden="true">
                      V
                    </span>
                    <span className="visually-hidden">Victoires</span>
                  </th>
                  <th scope="col" className={styles.number}>
                    <span title="Défaites" aria-hidden="true">
                      D
                    </span>
                    <span className="visually-hidden">Défaites</span>
                  </th>
                  <th scope="col" className={styles.number}>
                    <span title="Pourcentage de victoires" aria-hidden="true">
                      %
                    </span>
                    <span className="visually-hidden">Pourcentage de victoires</span>
                  </th>
                  <th scope="col" className={styles.number}>
                    <span title="Écart avec le n°1" aria-hidden="true">
                      Écart
                    </span>
                    <span className="visually-hidden">Écart avec le n°1</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => {
                  const { team } = standing;
                  const colors = getTeamColors(team.abbreviation);
                  return (
                    <tr
                      key={team.id}
                      className={classNames(
                        showZones &&
                          (index + 1 === PLAYOFF_SPOTS || index + 1 === PLAY_IN_LAST_SPOT) &&
                          styles.zoneEnd,
                      )}
                    >
                      <td className={styles.number}>{index + 1}</td>
                      <th scope="row" className={styles.team}>
                        <span className={styles.teamContent}>
                          <Badge
                            label={team.abbreviation}
                            background={colors.primary}
                            color={colors.text}
                            borderColor={colors.secondary}
                            decorative
                          />
                          <span className={styles.name} aria-hidden="true">
                            {team.name}
                          </span>
                          <span className={styles.shortName} aria-hidden="true">
                            {shortTeamName(team.name)}
                          </span>
                          <span className="visually-hidden">{team.name}</span>
                        </span>
                      </th>
                      <td className={classNames(styles.number, styles.wins)}>{standing.wins}</td>
                      <td className={classNames(styles.number, styles.losses)}>
                        {standing.losses}
                      </td>
                      <td className={styles.number}>
                        {formatWinPercentage(standing.winPercentage)}
                      </td>
                      <td className={classNames(styles.number, styles.gamesBehind)}>
                        {formatGamesBehind(standing.gamesBehind)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {showZones && (
              <p className={styles.legend}>
                1 à {PLAYOFF_SPOTS} : playoffs · {PLAYOFF_SPOTS + 1} à {PLAY_IN_LAST_SPOT} : play-in
              </p>
            )}
          </>
        ) : (
          <p className={styles.empty}>Aucun match terminé pour l’instant</p>
        )}
      </Card>
    </section>
  );
}
