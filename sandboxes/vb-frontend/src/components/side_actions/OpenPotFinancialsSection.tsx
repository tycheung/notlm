import React, { useMemo } from 'react';

import Input from '../common/Input';

import Label from '../common/Label';

import {

  computeOpenPotFundSnapshot,

  getHighGameFundImbalance,

} from '../../utils/highGameFundBalance';



interface OpenPotFinancialsSectionProps {

  entryFee?: number;

  onEntryFeeChange?: (value: number) => void;

  entryCount?: number;

  /** Label for signup count, e.g. "entries" or "pair tickets". */

  entryCountLabel?: string;

  expenseType?: 'per_entry' | 'flat';

  expenseAmount?: number;

  onExpenseTypeChange?: (type: 'per_entry' | 'flat') => void;

  onExpenseAmountChange?: (amount: number) => void;

  places: number[];

  onPlacesChange: (places: number[]) => void;

  /** Optional note shown beside the place prizes header (type-specific). */

  placePrizesNote?: string;

  /** When provided, place total may be multiplied per selected game (high game). */

  payoutMode?: 'per_game' | 'combined';

  gameNumbers?: number[];

}



function placeOrdinal(idx: number): string {

  if (idx === 0) return '1st';

  if (idx === 1) return '2nd';

  if (idx === 2) return '3rd';

  return `${idx + 1}th`;

}



function formatMoney(amount: number): string {

  return `$${amount.toFixed(2)}`;

}



const OpenPotFinancialsSection: React.FC<OpenPotFinancialsSectionProps> = ({

  entryFee = 0,

  onEntryFeeChange,

  entryCount = 0,

  entryCountLabel = 'entries',

  expenseType = 'per_entry',

  expenseAmount = 0,

  onExpenseTypeChange,

  onExpenseAmountChange,

  places,

  onPlacesChange,

  placePrizesNote,

  payoutMode,

  gameNumbers,

}) => {

  const setPlaceCount = (count: number) => {

    const n = Math.max(1, Math.min(20, count));

    if (places.length === n) return;

    if (places.length > n) {

      onPlacesChange(places.slice(0, n));

      return;

    }

    onPlacesChange([

      ...places,

      ...Array.from({ length: n - places.length }, () => 0),

    ]);

  };



  const fundInput = useMemo(() => {

    const prizeDistribution: Record<string, number> = {};

    places.forEach((amt, idx) => {

      prizeDistribution[String(idx + 1)] = amt;

    });

    return {

      entryCount,

      entryFee,

      houseCutType: expenseType === 'per_entry' ? 'dollars_per_entry' : 'amount',

      houseCutAmount: expenseAmount,

      prizeDistribution,

      payoutMode,

      gameNumbers,

    };

  }, [

    entryCount,

    entryFee,

    expenseType,

    expenseAmount,

    places,

    payoutMode,

    gameNumbers,

  ]);



  const fund = useMemo(() => computeOpenPotFundSnapshot(fundInput), [fundInput]);

  const imbalance = useMemo(() => getHighGameFundImbalance(fundInput), [fundInput]);

  const fundBalance = fund.prizeFund - fund.placesCommitted;



  return (

    <div className="rounded-md border border-border bg-surface-light p-4 space-y-3">

      <Label>Financials</Label>

      <Input

        label="Entry fee ($)"

        type="number"

        value={entryFee}

        min={0}

        step={0.01}

        onChange={(e) => onEntryFeeChange?.(Number(e.target.value) || 0)}

      />



      <div className="rounded border border-border/70 bg-surface px-3 py-2.5 text-sm max-w-xl space-y-1.5">

        <p className="font-medium text-text">

          Current {entryCountLabel}: {entryCount}

        </p>

        {entryCount > 0 ? (

          <p className="text-text-muted">

            Collected {formatMoney(fund.collected)} ({entryCount} ×{' '}

            {formatMoney(entryFee)}) · Expenses {formatMoney(fund.expenses)} · Prize

            fund {formatMoney(fund.prizeFund)}

          </p>

        ) : (

          <p className="text-xs text-text-muted">

            No {entryCountLabel} yet — prize fund updates when bowlers sign up.

          </p>

        )}

        {fund.placesCommitted > 0 ? (

          <p className="text-text-muted">

            Place prizes total {formatMoney(fund.placesCommitted)}

            {entryCount > 0 && Math.abs(fundBalance) > 0.009 ? (

              <span className="text-amber-700 dark:text-amber-200/90">

                {' '}

                (

                {fundBalance > 0

                  ? `${formatMoney(fundBalance)} unassigned`

                  : `${formatMoney(Math.abs(fundBalance))} over prize fund`}

                )

              </span>

            ) : null}

          </p>

        ) : null}

        {imbalance ? (

          <p className="text-xs text-amber-700 dark:text-amber-200/90">{imbalance.message}</p>

        ) : entryCount > 0 && fund.placesCommitted > 0 ? (

          <p className="text-xs text-emerald-700 dark:text-emerald-300/90">

            Place prizes match the available prize fund.

          </p>

        ) : null}

      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">

        <div>

          <Label className="text-xs">Expenses</Label>

          <div className="mt-1 space-y-1">

            <label className="flex items-center text-sm">

              <input

                type="radio"

                className="mr-2"

                checked={expenseType === 'per_entry'}

                onChange={() => onExpenseTypeChange?.('per_entry')}

              />

              Per entry

            </label>

            <label className="flex items-center text-sm">

              <input

                type="radio"

                className="mr-2"

                checked={expenseType === 'flat'}

                onChange={() => onExpenseTypeChange?.('flat')}

              />

              Flat amount

            </label>

          </div>

        </div>

        <Input

          label={expenseType === 'per_entry' ? 'Expense $ per entry' : 'Expense $ flat'}

          type="number"

          value={expenseAmount}

          onChange={(e) => onExpenseAmountChange?.(Number(e.target.value) || 0)}

          min={0}

          step={0.01}

        />

      </div>



      <div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 max-w-xl mb-2">

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">

            <Label className="mb-0">Place prizes ($)</Label>

            {placePrizesNote ? (

              <span className="text-xs text-text-muted">{placePrizesNote}</span>

            ) : null}

          </div>

          <select

            className="rounded border border-border bg-surface px-2 py-1 text-sm"

            value={places.length}

            onChange={(e) => setPlaceCount(Number(e.target.value))}

          >

            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (

              <option key={n} value={n}>

                {n} place{n > 1 ? 's' : ''}

              </option>

            ))}

          </select>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">

          {places.map((amt, idx) => (

            <Input

              key={idx}

              label={placeOrdinal(idx)}

              type="number"

              value={amt}

              min={0}

              step={0.01}

              onChange={(e) => {

                const next = [...places];

                next[idx] = Number(e.target.value) || 0;

                onPlacesChange(next);

              }}

            />

          ))}

        </div>

      </div>



      <p className="text-xs text-text-muted max-w-xl">

        Prize fund and payout readiness are also calculated per squad pool on the server

        and shown in standings and reports.

      </p>

    </div>

  );

};



export default OpenPotFinancialsSection;

