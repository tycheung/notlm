import React from 'react';
import PositionRoundLockHeaderButton from '../event-scoring/PositionRoundLockHeaderButton';

export function TeamScoringGameHeaders(props: {
  gameNumbers: number[];
  positionRoundGame: number | null | undefined;
  selectedRoundId: number | null | undefined;
  eventId: number | null | undefined;
  positionGameAlreadyScored: boolean;
  gameCountAdjustControls?: React.ReactNode;
  bonusPinsEnabled: boolean;
  handicapEnabled: boolean;
}) {
  const {
    gameNumbers,
    positionRoundGame,
    selectedRoundId,
    eventId,
    positionGameAlreadyScored,
    gameCountAdjustControls,
    bonusPinsEnabled,
    handicapEnabled,
  } = props;

  return (
    <>
      {gameNumbers.map((gameNum) => {
        const isPosition =
          positionRoundGame != null && Number(positionRoundGame) === Number(gameNum);
        return (
          <th
            key={gameNum}
            className="px-4 py-3 text-center text-xs font-semibold text-text uppercase tracking-wider"
          >
            <div className="flex flex-col items-center gap-0.5">
              <span>Game {gameNum}</span>
              {isPosition && selectedRoundId != null ? (
                <PositionRoundLockHeaderButton
                  roundId={selectedRoundId}
                  gameNumber={gameNum}
                  eventId={eventId}
                  alreadyScored={positionGameAlreadyScored}
                />
              ) : null}
            </div>
          </th>
        );
      })}
      {gameCountAdjustControls ? (
        <th className="px-1 py-3 text-center text-xs font-semibold text-text uppercase tracking-wider w-10">
          {gameCountAdjustControls}
        </th>
      ) : null}
      <th className="px-4 py-3 text-center text-xs font-semibold text-text uppercase tracking-wider">
        Total
      </th>
      {bonusPinsEnabled && (
        <th className="px-4 py-3 text-center text-xs font-semibold text-text uppercase tracking-wider">
          Bonus
        </th>
      )}
      {handicapEnabled && (
        <th className="px-4 py-3 text-center text-xs font-semibold text-text uppercase tracking-wider">
          Total (Handicap)
        </th>
      )}
    </>
  );
}
