import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { RoundsAPI } from '../../api/rounds';
import { getErrorMessage } from '../../api/apiErrors';
import type { TeamScoringMode } from '../../hooks/useScoringTabMode';
import { downloadBlobFromLoader } from '../../utils/downloadBlob';

export interface RoundScoreCsvControlsProps {
  roundId: number;
  roundNumber: number;
  isTeamEvent: boolean;
  teamScoringMode: TeamScoringMode;
  /** Baker: force team aggregate CSV (team names, not bowlers). */
  isBakerRound?: boolean;
  disabled?: boolean;
  onAfterSuccessfulUpload?: () => void;
}

const RoundScoreCsvControls: React.FC<RoundScoreCsvControlsProps> = ({
  roundId,
  roundNumber,
  isTeamEvent,
  teamScoringMode,
  isBakerRound = false,
  disabled = false,
  onAfterSuccessfulUpload,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alertVariant, setAlertVariant] = useState<'success' | 'warning'>('success');

  const effectiveScoringMode: TeamScoringMode | 'individual' = !isTeamEvent
    ? 'individual'
    : isBakerRound
      ? 'team'
      : teamScoringMode;
  const scoringModeLabel = effectiveScoringMode;
  const isTeamAggregateMode = scoringModeLabel === 'team';

  const handleDownload = async () => {
    setError(null);
    setMessage(null);
    try {
      const result = await downloadBlobFromLoader(
        `round_${roundNumber}_scores_${scoringModeLabel}.csv`,
        () => RoundsAPI.downloadRoundScoresCsvTemplate(roundId, effectiveScoringMode)
      );
      if (result.status === 'saved') {
        setMessage(`Scores template saved as ${result.filename}.`);
        setAlertVariant('success');
      }
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, 'Could not download the scores CSV template.'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await RoundsAPI.uploadRoundScoresCsv(roundId, effectiveScoringMode, file);
      const lines: string[] = [res.message];
      if (res.errors?.length) {
        lines.push('', 'Not applied:', ...res.errors.map((err) => `• ${err}`));
      }
      if (res.warnings?.length) {
        lines.push('', 'Notes:', ...res.warnings.map((w) => `• ${w}`));
      }
      const fullText = lines.join('\n');
      const applied = (res.updated_scores ?? 0) > 0;
      const hasIssues = (res.errors?.length ?? 0) > 0 || (res.warnings?.length ?? 0) > 0;

      if (!applied) {
        setError(fullText);
        setMessage(null);
      } else {
        setError(null);
        setMessage(fullText);
        setAlertVariant(hasIssues ? 'warning' : 'success');
        await queryClient.invalidateQueries({ queryKey: ['squadGames'] });
        await queryClient.invalidateQueries({ queryKey: ['roundGames'] });
        await queryClient.invalidateQueries({ queryKey: ['roundMatchSeries'] });
        await queryClient.invalidateQueries({ queryKey: ['roundScoringRoster', roundId] });
        await queryClient.invalidateQueries({ queryKey: ['eventComplete'] });
        onAfterSuccessfulUpload?.();
      }
    } catch (err: unknown) {
      const ax = err as {
        code?: string;
        message?: string;
        response?: { data?: { error?: string; message?: string; detail?: unknown } };
      };
      if (ax.code === 'ECONNABORTED' || /timeout/i.test(ax.message || '')) {
        setError(
          'CSV upload timed out. The file may still be processing — wait a moment, then refresh scores. For large sheets, try again; uploads can take a few minutes.'
        );
        setMessage(null);
        return;
      }
      const d = ax.response?.data;
      let detailText = getErrorMessage(err, 'CSV upload failed.');
      if (typeof d?.error === 'string') {
        detailText = d.error;
      } else if (typeof d?.message === 'string') {
        detailText = d.message;
      } else if (typeof d?.detail === 'string') {
        detailText = d.detail;
      } else if (Array.isArray(d?.detail)) {
        detailText = (d.detail as { msg?: string }[])
          .map((x) => x.msg || JSON.stringify(x))
          .join('; ');
      }
      setError(detailText);
      setMessage(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <p className="max-w-md text-right text-xs text-text-muted">
        {isTeamAggregateMode ? (
          <>
            CSV import uses one row per <span className="font-medium">team</span>. Fill{' '}
            <code className="text-xs">game_*</code> scores; match on{' '}
            <code className="text-xs">team_id</code> or <code className="text-xs">team_name</code>
            {isBakerRound ? ' (Baker: one score 0–300 per team game).' : '.'}{' '}
            <code className="text-xs">scoring_mode</code> must be{' '}
            <span className="font-medium">team</span>.
          </>
        ) : (
          <>
            CSV import updates only <code className="text-xs">game_*</code> score columns for this
            round. Identity columns (<code className="text-xs">usbc_id</code>
            {isTeamEvent ? (
              <>
                , <code className="text-xs">team_id</code>, names
              </>
            ) : (
              <>, names</>
            )}
            ) are for matching. <code className="text-xs">scoring_mode</code> must match the
            current mode (<span className="font-medium">{scoringModeLabel}</span>).
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
        <Button
          variant="lightbackground"
          onClick={() => void handleDownload()}
          disabled={disabled || uploading}
        >
          Download scores CSV
        </Button>
        <Button
          variant="lightbackground"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          isLoading={uploading}
        >
          Upload scores CSV
        </Button>
      </div>
      {message && (
        <Alert variant={alertVariant} message={message} className="max-w-lg whitespace-pre-wrap" />
      )}
      {error && (
        <Alert variant="error" message={error} className="max-w-lg whitespace-pre-wrap" />
      )}
    </div>
  );
};

export default RoundScoreCsvControls;
