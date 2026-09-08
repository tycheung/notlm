import React, { useEffect, useRef, useState } from 'react';
import { SideActionType } from '../../types/side_action';
import Input from '../common/Input';
import Card from '../common/Card';
import Label from '../common/Label';
import SectionTitle from '../common/SectionTitle';
import {
  amountsFromDistribution,
  BRACKET_POT_SEATS,
  distributionFromAmounts,
  feeFromDistribution,
  getDefaultBracketPrizeAmounts,
  getMaxBracketPayoutSpots,
  ordinalPlace,
  withFeeInDistribution,
} from '../../utils/sideActionPayouts';

interface FeesAndPrizesFormProps {
  entryFee: number;
  onEntryFeeChange: (value: number) => void;
  houseCutPercentage: number;
  onHouseCutPercentageChange: (value: number) => void;
  houseCutAmount: number;
  onHouseCutAmountChange: (value: number) => void;
  houseCutType: 'percentage' | 'dollars_per_entry' | 'amount';
  onHouseCutTypeChange: (type: 'percentage' | 'dollars_per_entry' | 'amount') => void;
  prizeDistribution: Record<string, number>;
  prizeType: 'percentage' | 'amount' | 'dollars_per_entry';
  onPrizeTypeChange: (type: 'percentage' | 'amount' | 'dollars_per_entry') => void;
  onPrizeDistributionChange: (distribution: Record<string, number>) => void;
  /** Bye-pot (n-1 seats) place prizes + fee — brackets only */
  byePrizeDistribution?: Record<string, number>;
  onByePrizeDistributionChange?: (distribution: Record<string, number>) => void;
  maxParticipants: number;
  sideActionType: SideActionType;
}

const FeesAndPrizesForm: React.FC<FeesAndPrizesFormProps> = ({
  entryFee,
  onEntryFeeChange,
  houseCutAmount,
  onHouseCutAmountChange,
  onHouseCutTypeChange,
  prizeDistribution,
  onPrizeTypeChange,
  onPrizeDistributionChange,
  byePrizeDistribution,
  onByePrizeDistributionChange,
  maxParticipants,
  sideActionType,
}) => {
  const isBracket = sideActionType === SideActionType.BRACKET;
  const callbacksRef = useRef({
    onHouseCutAmountChange,
    onHouseCutTypeChange,
    onPrizeTypeChange,
    onPrizeDistributionChange,
    onByePrizeDistributionChange,
  });
  callbacksRef.current = {
    onHouseCutAmountChange,
    onHouseCutTypeChange,
    onPrizeTypeChange,
    onPrizeDistributionChange,
    onByePrizeDistributionChange,
  };
  const maxPayoutSpots = isBracket
    ? getMaxBracketPayoutSpots(maxParticipants)
    : Math.min(6, Math.max(1, Math.floor(maxParticipants / 4)));
  // Engine pots are always 8 seats; 16/32 only unlocks extra prize places.
  const potSeats = isBracket ? BRACKET_POT_SEATS : maxParticipants;
  const byeSlots = Math.max(1, potSeats - 1);

  const [payoutAmounts, setPayoutAmounts] = useState<number[]>(() => {
    const fromDist = amountsFromDistribution(prizeDistribution, maxPayoutSpots);
    if (fromDist.some((v) => v > 0)) return fromDist;
    return getDefaultBracketPrizeAmounts(maxPayoutSpots);
  });

  const [fullFee, setFullFee] = useState(() =>
    feeFromDistribution(prizeDistribution, houseCutAmount)
  );

  const [byePayoutAmounts, setByePayoutAmounts] = useState<number[]>(() => {
    const fromDist = amountsFromDistribution(byePrizeDistribution || {}, maxPayoutSpots);
    if (fromDist.some((v) => v > 0)) return fromDist;
    const full = amountsFromDistribution(prizeDistribution, maxPayoutSpots);
    return full.some((v) => v > 0) ? full : getDefaultBracketPrizeAmounts(maxPayoutSpots);
  });

  const [byeFee, setByeFee] = useState(() =>
    feeFromDistribution(byePrizeDistribution || {}, 0)
  );

  useEffect(() => {
    callbacksRef.current.onHouseCutTypeChange('amount');
    callbacksRef.current.onPrizeTypeChange('amount');
  }, []);

  useEffect(() => {
    const nextCount = maxPayoutSpots;
    setPayoutAmounts((prev) => {
      const trimmed = prev.slice(0, nextCount);
      while (trimmed.length < nextCount) {
        trimmed.push(getDefaultBracketPrizeAmounts(nextCount)[trimmed.length] ?? 0);
      }
      return trimmed;
    });
    setByePayoutAmounts((prev) => {
      const trimmed = prev.slice(0, nextCount);
      while (trimmed.length < nextCount) {
        trimmed.push(0);
      }
      return trimmed;
    });
  }, [maxPayoutSpots]);

  useEffect(() => {
    const dist = withFeeInDistribution(distributionFromAmounts(payoutAmounts), fullFee);
    callbacksRef.current.onPrizeDistributionChange(dist);
    callbacksRef.current.onHouseCutAmountChange(fullFee);
  }, [payoutAmounts, fullFee]);

  useEffect(() => {
    const callback = callbacksRef.current.onByePrizeDistributionChange;
    if (!isBracket || !callback) return;
    callback(
      withFeeInDistribution(distributionFromAmounts(byePayoutAmounts), byeFee)
    );
  }, [byePayoutAmounts, byeFee, isBracket]);

  const updatePayoutAmount = (index: number, value: number) => {
    setPayoutAmounts((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, value);
      return next;
    });
  };

  const updateByePayoutAmount = (index: number, value: number) => {
    setByePayoutAmounts((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, value);
      return next;
    });
  };

  const fullCollected = potSeats * entryFee;
  const byeCollected = byeSlots * entryFee;
  const fullPlacesTotal = payoutAmounts.reduce((sum, n) => sum + n, 0);
  const byePlacesTotal = byePayoutAmounts.reduce((sum, n) => sum + n, 0);
  const fullBalance = fullCollected - (fullPlacesTotal + fullFee);
  const byeBalance = byeCollected - (byePlacesTotal + byeFee);

  const renderPlaceInputs = (
    amounts: number[],
    onChange: (index: number, value: number) => void,
    idPrefix: string
  ) =>
    amounts.map((amount, index) => (
      <div
        key={`${idPrefix}-${index}`}
        className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 items-end"
      >
        <Label htmlFor={`${idPrefix}-${index}`}>{ordinalPlace(index + 1)} place</Label>
        <Input
          id={`${idPrefix}-${index}`}
          name={`${idPrefix}-${index}`}
          aria-label={`${idPrefix === 'bye-payout' ? 'Bye pot' : 'Full pot'} ${ordinalPlace(index + 1)} prize`}
          type="number"
          value={amount}
          onChange={(e) => onChange(index, parseFloat(e.target.value) || 0)}
          min={0}
          step={0.01}
          fullWidth
        />
      </div>
    ));

  return (
    <Card title="Fees & Prizes" className="mb-4">
      <div className="mb-4 max-w-xs">
        <Input
          label="Entry Fee ($)"
          name="entryFee"
          type="number"
          value={entryFee}
          onChange={(e) => onEntryFeeChange(parseFloat(e.target.value) || 0)}
          min={0}
          step={0.01}
          fullWidth
        />
      </div>

      <SectionTitle size="medium" className="mb-2">
        {potSeats} entries
      </SectionTitle>
      <p className="text-sm text-text-muted mb-3">
        Collected ${fullCollected.toFixed(2)} ({potSeats} × ${entryFee.toFixed(2)}).
        Set place prizes and expenses so they add up to the pot
        {isBracket && maxParticipants > BRACKET_POT_SEATS
          ? ` (${maxParticipants} unlocks up to ${maxPayoutSpots} prize places; seating stays ${BRACKET_POT_SEATS})`
          : ''}
        .
      </p>
      <div className="space-y-3 mb-2">
        {renderPlaceInputs(payoutAmounts, updatePayoutAmount, 'payout')}
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 items-end">
          <Label htmlFor="full-fee">Full expenses</Label>
          <Input
            id="full-fee"
            name="full-fee"
            type="number"
            value={fullFee}
            onChange={(e) => setFullFee(Math.max(0, parseFloat(e.target.value) || 0))}
            min={0}
            step={0.01}
            fullWidth
          />
        </div>
      </div>
      {Math.abs(fullBalance) > 0.009 && (
        <p className="text-sm text-amber-200/90 mb-4">
          {fullBalance > 0
            ? `$${fullBalance.toFixed(2)} unassigned (1st + 2nd + expenses is short of collected).`
            : `$${(
                -fullBalance
              ).toFixed(2)} over collected (1st + 2nd + expenses exceeds pot).`}
        </p>
      )}

      {isBracket && onByePrizeDistributionChange && (
        <>
          <SectionTitle size="medium" className="mb-2 mt-4">
            {byeSlots} entries (bye)
          </SectionTitle>
          <p className="text-sm text-text-muted mb-3">
            Collected ${byeCollected.toFixed(2)} ({byeSlots} × ${entryFee.toFixed(2)}).
            Set 1st, 2nd, and expenses for short pots.
          </p>
          <div className="space-y-3 mb-2">
            {renderPlaceInputs(byePayoutAmounts, updateByePayoutAmount, 'bye-payout')}
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 items-end">
              <Label htmlFor="bye-fee">Bye expenses</Label>
              <Input
                id="bye-fee"
                name="bye-fee"
                type="number"
                value={byeFee}
                onChange={(e) => setByeFee(Math.max(0, parseFloat(e.target.value) || 0))}
                min={0}
                step={0.01}
                fullWidth
              />
            </div>
          </div>
          {Math.abs(byeBalance) > 0.009 && (
            <p className="text-sm text-amber-200/90">
              {byeBalance > 0
                ? `$${byeBalance.toFixed(2)} unassigned (1st + 2nd + expenses is short of collected).`
                : `$${(-byeBalance).toFixed(2)} over collected (1st + 2nd + expenses exceeds pot).`}
            </p>
          )}
        </>
      )}
    </Card>
  );
};

export default FeesAndPrizesForm;
