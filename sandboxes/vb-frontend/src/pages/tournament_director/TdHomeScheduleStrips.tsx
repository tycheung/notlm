import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { formatDateRangeNaive } from '../../utils/dateUtils';
import type { TdHomeEventLike } from './tdHomeEventWindows';
import { TD_HOME_COMING_UP_DAYS } from './tdHomeEventWindows';
import {
  defaultTdHomeLiveStage,
  type TdHomeLiveEventInput,
  type TdHomeLiveStage,
} from './tdHomeEventStage';

type TdHomeScheduleStripsProps = {
  happeningToday: TdHomeLiveEventInput[];
  comingUp: TdHomeEventLike[];
  tournamentNameById: Map<number, string>;
  liveStageByEventId: Map<number, TdHomeLiveStage>;
  pendingCountByEventId: Map<number, number>;
  participantsHref: (eventId: number) => string;
  onOpenEvent: (eventId: number) => void;
  onOpenLiveStage: (eventId: number, stage: TdHomeLiveStage) => void;
};

function tournamentLabel(event: TdHomeEventLike, tournamentNameById: Map<number, string>): string {
  return tournamentNameById.get(event.tournament_id) || 'Tournament';
}

function EventPendingLink({
  eventId,
  pendingCountByEventId,
  participantsHref,
}: {
  eventId: number;
  pendingCountByEventId: Map<number, number>;
  participantsHref: (eventId: number) => string;
}) {
  const count = pendingCountByEventId.get(eventId) ?? 0;
  if (count <= 0) return null;
  return (
    <Link to={participantsHref(eventId)} className="text-xs text-primary hover:underline">
      {count} pending
    </Link>
  );
}

const TdHomeScheduleStrips: React.FC<TdHomeScheduleStripsProps> = ({
  happeningToday,
  comingUp,
  tournamentNameById,
  liveStageByEventId,
  pendingCountByEventId,
  participantsHref,
  onOpenEvent,
  onOpenLiveStage,
}) => {
  if (happeningToday.length === 0 && comingUp.length === 0) {
    return null;
  }

  return (
    <>
      {happeningToday.length > 0 && (
        <div id="td-home-happening-today">
        <Card title="Happening Today / In Progress" className="mb-8 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-primary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Event
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Tournament
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Dates
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Current status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {happeningToday.map((event, rowIdx) => {
                  const stage = liveStageByEventId.get(event.id) || defaultTdHomeLiveStage(event);
                  return (
                    <tr
                      key={event.id}
                      className={rowIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">{event.name}</div>
                        <EventPendingLink
                          eventId={event.id}
                          pendingCountByEventId={pendingCountByEventId}
                          participantsHref={participantsHref}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-muted">{tournamentLabel(event, tournamentNameById)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-muted">
                          {formatDateRangeNaive(event.start_date, event.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-text">{stage.summary || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="darkbackground"
                            size="small"
                            onClick={() => onOpenLiveStage(event.id, stage)}
                          >
                            {stage.label}
                          </Button>
                          <Button
                            variant="lightbackground"
                            size="small"
                            onClick={() => onOpenEvent(event.id)}
                          >
                            Open Event
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </div>
      )}

      {comingUp.length > 0 && (
        <div id="td-home-coming-up">
        <Card title={`Coming Up (next ${TD_HOME_COMING_UP_DAYS} days)`} className="mb-8 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-primary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Event
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Tournament
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Dates
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comingUp.map((event, rowIdx) => (
                  <tr
                    key={event.id}
                    className={rowIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-light'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text">{event.name}</div>
                      <EventPendingLink
                        eventId={event.id}
                        pendingCountByEventId={pendingCountByEventId}
                        participantsHref={participantsHref}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-muted">{tournamentLabel(event, tournamentNameById)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-muted">
                        {formatDateRangeNaive(event.start_date, event.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                      <Button
                        variant="darkbackground"
                        size="small"
                        onClick={() => onOpenEvent(event.id)}
                      >
                        Open Event
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </div>
      )}
    </>
  );
};

export default TdHomeScheduleStrips;
