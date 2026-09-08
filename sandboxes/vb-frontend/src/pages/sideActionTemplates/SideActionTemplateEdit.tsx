import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageTitle from '../../components/common/PageTitle';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import Input from '../../components/common/Input';
import Label from '../../components/common/Label';
import { sideActionTemplatesApi } from '../../api/sideActionTemplates';
import { getErrorMessage } from '../../api/apiErrors';
import type { SideActionTemplatePayload } from '../../types/sideActionTemplate';
import { formatSideActionType } from '../../utils/sideActionDisplay';

type PrizeRow = { place: string; amount: string };

function prizeRowsFromPayload(
  distribution: Record<string, number> | undefined
): PrizeRow[] {
  const entries = Object.entries(distribution || {}).sort(
    ([a], [b]) => Number(a) - Number(b)
  );
  if (!entries.length) return [{ place: '1', amount: '' }];
  return entries.map(([place, amount]) => ({
    place: String(place),
    amount: String(amount),
  }));
}

function distributionFromRows(rows: PrizeRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const place = row.place.trim();
    if (!place) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    out[place] = amount;
  }
  return out;
}

const SideActionTemplateEdit: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const id = Number(templateId);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prefix = location.pathname.startsWith('/admin') ? '/admin' : '/director';

  const { data: templatesRaw, isLoading, error } = useQuery({
    queryKey: ['sideActionTemplates', 'all'],
    queryFn: () => sideActionTemplatesApi.list(),
  });

  const template = useMemo(() => {
    const list = Array.isArray(templatesRaw) ? templatesRaw : [];
    return list.find((t) => t.id === id) ?? null;
  }, [templatesRaw, id]);

  const [name, setName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [description, setDescription] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [maxParticipants, setMaxParticipants] = useState('0');
  const [houseCutType, setHouseCutType] = useState<
    'percentage' | 'dollars_per_entry' | 'amount'
  >('amount');
  const [houseCutPercentage, setHouseCutPercentage] = useState('0');
  const [houseCutAmount, setHouseCutAmount] = useState('');
  const [prizeType, setPrizeType] = useState<
    'percentage' | 'amount' | 'dollars_per_entry'
  >('amount');
  const [prizeRows, setPrizeRows] = useState<PrizeRow[]>([
    { place: '1', amount: '' },
  ]);
  const [gameNumbersText, setGameNumbersText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [hydratedId, setHydratedId] = useState<number | null>(null);

  useEffect(() => {
    if (!template || hydratedId === template.id) return;
    const p = template.payload || {};
    setName(template.name);
    setIsFavorite(Boolean(template.is_favorite));
    setDescription(p.description != null ? String(p.description) : '');
    setEntryFee(String(p.entry_fee ?? 0));
    setMaxParticipants(String(p.max_participants ?? 0));
    setHouseCutType(
      p.house_cut_type === 'percentage' ||
        p.house_cut_type === 'dollars_per_entry' ||
        p.house_cut_type === 'amount'
        ? p.house_cut_type
        : 'amount'
    );
    setHouseCutPercentage(String(p.house_cut_percentage ?? 0));
    setHouseCutAmount(
      p.house_cut_amount == null ? '' : String(p.house_cut_amount)
    );
    setPrizeType(
      p.prize_type === 'percentage' ||
        p.prize_type === 'dollars_per_entry' ||
        p.prize_type === 'amount'
        ? p.prize_type
        : 'amount'
    );
    setPrizeRows(prizeRowsFromPayload(p.prize_distribution));
    setGameNumbersText(
      Array.isArray(p.game_numbers) ? p.game_numbers.join(', ') : ''
    );
    setHydratedId(template.id);
  }, [template, hydratedId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!template) throw new Error('Template not found');
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Template name is required');

      const games = gameNumbersText
        .split(/[,\s]+/)
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1);

      const payload: SideActionTemplatePayload = {
        ...(template.payload || {}),
        version: template.payload?.version ?? 1,
        suggested_name: trimmed,
        description: description.trim() || null,
        entry_fee: Number(entryFee) || 0,
        max_participants: Number(maxParticipants) || 0,
        house_cut_type: houseCutType,
        house_cut_percentage: Number(houseCutPercentage) || 0,
        house_cut_amount:
          houseCutAmount.trim() === '' ? null : Number(houseCutAmount),
        prize_type: prizeType,
        prize_distribution: distributionFromRows(prizeRows),
        game_numbers: games,
        type_config: { ...(template.payload?.type_config || {}) },
      };

      return sideActionTemplatesApi.update(template.id, {
        name: trimmed,
        is_favorite: isFavorite,
        payload,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sideActionTemplates'] });
      navigate(`${prefix}/side-action-templates`);
    },
    onError: (err) => {
      setFormError(getErrorMessage(err, 'Failed to save template'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" message="Failed to load side action templates." />
    );
  }

  if (!Number.isFinite(id) || id < 1 || !template) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <Alert variant="error" message="Template not found." />
        <Button
          className="mt-4"
          variant="lightbackground"
          onClick={() => navigate(`${prefix}/side-action-templates`)}
        >
          Back to templates
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Breadcrumb
        items={[
          { label: 'Home', path: '/' },
          { label: 'Dashboard', path: `${prefix}` },
          {
            label: 'Side action templates',
            path: `${prefix}/side-action-templates`,
          },
          { label: template.name },
        ]}
      />
      <PageTitle className="mt-4 mb-1">Edit template</PageTitle>
      <p className="text-sm text-text-muted mb-6">
        {formatSideActionType(template.side_action_type)} · Type-specific settings
        (bracket size, cut schedule, etc.) are kept as saved; change those by
        applying the template on a side action and saving again.
      </p>

      {formError ? (
        <Alert
          variant="error"
          message={formError}
          onDismiss={() => setFormError(null)}
          className="mb-4"
        />
      ) : null}

      <div className="space-y-4">
        <Input
          label="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
        />

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
          />
          Favorite (sorts to top)
        </label>

        <div>
          <Label htmlFor="sa-tpl-description">Description</Label>
          <textarea
            id="sa-tpl-description"
            className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Entry fee"
            type="number"
            min={0}
            step="0.01"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
            fullWidth
          />
          <Input
            label="Max participants"
            type="number"
            min={0}
            step="1"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            fullWidth
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="sa-tpl-house-type">House cut type</Label>
            <select
              id="sa-tpl-house-type"
              className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              value={houseCutType}
              onChange={(e) =>
                setHouseCutType(
                  e.target.value as 'percentage' | 'dollars_per_entry' | 'amount'
                )
              }
            >
              <option value="amount">Fixed amount</option>
              <option value="percentage">Percentage</option>
              <option value="dollars_per_entry">Per entry</option>
            </select>
          </div>
          <Input
            label="House cut %"
            type="number"
            min={0}
            step="0.01"
            value={houseCutPercentage}
            onChange={(e) => setHouseCutPercentage(e.target.value)}
            fullWidth
          />
          <Input
            label="House cut amount"
            type="number"
            min={0}
            step="0.01"
            value={houseCutAmount}
            onChange={(e) => setHouseCutAmount(e.target.value)}
            fullWidth
          />
        </div>

        <div>
          <Label htmlFor="sa-tpl-prize-type">Prize type</Label>
          <select
            id="sa-tpl-prize-type"
            className="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            value={prizeType}
            onChange={(e) =>
              setPrizeType(
                e.target.value as 'percentage' | 'amount' | 'dollars_per_entry'
              )
            }
          >
            <option value="amount">Fixed amount</option>
            <option value="percentage">Percentage</option>
            <option value="dollars_per_entry">Per entry</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Prize distribution</Label>
            <Button
              type="button"
              size="small"
              variant="secondary"
              onClick={() =>
                setPrizeRows((rows) => [
                  ...rows,
                  { place: String(rows.length + 1), amount: '' },
                ])
              }
            >
              Add place
            </Button>
          </div>
          <div className="space-y-2">
            {prizeRows.map((row, index) => (
              <div key={index} className="flex flex-wrap gap-2 items-end">
                <Input
                  label={index === 0 ? 'Place' : undefined}
                  value={row.place}
                  onChange={(e) => {
                    const next = [...prizeRows];
                    next[index] = { ...row, place: e.target.value };
                    setPrizeRows(next);
                  }}
                  className="w-24"
                />
                <Input
                  label={index === 0 ? 'Amount' : undefined}
                  type="number"
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => {
                    const next = [...prizeRows];
                    next[index] = { ...row, amount: e.target.value };
                    setPrizeRows(next);
                  }}
                  className="w-32"
                />
                {prizeRows.length > 1 ? (
                  <Button
                    type="button"
                    size="small"
                    variant="outline"
                    onClick={() =>
                      setPrizeRows((rows) => rows.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <Input
          label="Game numbers (comma-separated)"
          value={gameNumbersText}
          onChange={(e) => setGameNumbersText(e.target.value)}
          placeholder="e.g. 1, 2, 3"
          fullWidth
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          type="button"
          isLoading={saveMutation.isPending}
          disabled={saveMutation.isPending}
          onClick={() => {
            setFormError(null);
            saveMutation.mutate();
          }}
        >
          Save changes
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(`${prefix}/side-action-templates`)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default SideActionTemplateEdit;
