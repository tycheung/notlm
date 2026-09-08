import { useMemo } from 'react';

type HouseCutType = 'percentage' | 'dollars_per_entry' | 'amount';
type ExpenseType = 'per_entry' | 'flat';

export interface OpenPotFinancialBindings {
  expenseType: ExpenseType;
  expenseAmount: number;
  placeAmounts: number[];
  onExpenseTypeChange: (type: ExpenseType) => void;
  onExpenseAmountChange: (amount: number) => void;
  onPlaceAmountsChange: (amounts: number[]) => void;
}

export function useOpenPotFinancialBindings(options: {
  houseCutType: HouseCutType;
  setHouseCutType: (value: HouseCutType) => void;
  houseCutPercentage: number;
  setHouseCutPercentage: (value: number) => void;
  houseCutAmount: number;
  setHouseCutAmount: (value: number) => void;
  prizeDistribution: Record<string, number>;
  onPlaceAmountsChange: (amounts: number[]) => void;
}): OpenPotFinancialBindings {
  const {
    houseCutType,
    setHouseCutType,
    houseCutPercentage,
    setHouseCutPercentage,
    houseCutAmount,
    setHouseCutAmount,
    prizeDistribution,
    onPlaceAmountsChange,
  } = options;

  const placeAmounts = useMemo(
    () =>
      Object.keys(prizeDistribution || {})
        .filter((key) => /^\d+$/.test(key))
        .sort((left, right) => Number(left) - Number(right))
        .map((key) => Number(prizeDistribution[key]) || 0),
    [prizeDistribution]
  );

  const expenseType: ExpenseType =
    houseCutType === 'dollars_per_entry' ? 'per_entry' : 'flat';
  const expenseAmount =
    houseCutType === 'dollars_per_entry'
      ? houseCutPercentage || houseCutAmount || 0
      : houseCutAmount ?? 0;

  return {
    expenseType,
    expenseAmount,
    placeAmounts,
    onExpenseTypeChange: (type) => {
      if (type === 'per_entry') {
        const amount = houseCutAmount ?? houseCutPercentage ?? 0;
        setHouseCutType('dollars_per_entry');
        setHouseCutPercentage(amount);
        setHouseCutAmount(0);
        return;
      }
      const amount = houseCutPercentage || houseCutAmount || 0;
      setHouseCutType('amount');
      setHouseCutAmount(amount);
      setHouseCutPercentage(0);
    },
    onExpenseAmountChange: (amount) => {
      if (houseCutType === 'dollars_per_entry') {
        setHouseCutPercentage(amount);
        setHouseCutAmount(0);
        return;
      }
      setHouseCutAmount(amount);
      setHouseCutPercentage(0);
    },
    onPlaceAmountsChange,
  };
}
