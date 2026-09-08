import React, { useEffect, useState } from 'react';
import Button from '../common/Button';
import type { StubPurchaseSku, TdBillingCatalog } from '../../api/tdAccess';

function cents(n: number): string {
  return `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}`;
}

function skuMeta(
  sku: StubPurchaseSku,
  catalog: TdBillingCatalog
): { title: string; price: number; isPass: boolean; cadence?: string } {
  switch (sku) {
    case 'monthly':
      return {
        title: 'Tournament Director',
        price: catalog.monthly_cents,
        isPass: false,
        cadence: '/ mo',
      };
    case 'annual':
      return {
        title: 'Tournament Director Annual',
        price: catalog.annual_cents,
        isPass: false,
        cadence: '/ yr',
      };
    case 'side_action_monthly':
      return {
        title: 'Side Action',
        price: catalog.side_action_monthly_cents,
        isPass: false,
        cadence: '/ mo',
      };
    case 'side_action_annual':
      return {
        title: 'Side Action Annual',
        price: catalog.side_action_annual_cents,
        isPass: false,
        cadence: '/ yr',
      };
    case 'tournament_pass':
      return {
        title: 'Tournament pass',
        price: catalog.tournament_pass_cents,
        isPass: true,
      };
    case 'side_action_pass':
      return {
        title: 'Side Action pass',
        price: catalog.side_action_pass_cents,
        isPass: true,
      };
    case 'large_cap_lift':
      return {
        title: 'Large cap lift',
        price: catalog.large_cap_lift_cents,
        isPass: true,
      };
  }
}

export type CartLine = { sku: StubPurchaseSku; quantity: number };

interface AddToCartDrawerProps {
  open: boolean;
  items: CartLine[];
  catalog: TdBillingCatalog;
  purchasing: boolean;
  onClose: () => void;
  onUpdateQuantity: (sku: StubPurchaseSku, quantity: number) => void;
  onRemove: (sku: StubPurchaseSku) => void;
  onConfirm: () => void;
}

const AddToCartDrawer: React.FC<AddToCartDrawerProps> = ({
  open,
  items,
  catalog,
  purchasing,
  onClose,
  onUpdateQuantity,
  onRemove,
  onConfirm,
}) => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
    setEntered(false);
  }, [open]);

  if (!open) return null;

  const total = items.reduce((sum, line) => {
    const meta = skuMeta(line.sku, catalog);
    return sum + meta.price * line.quantity;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close cart"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`relative h-full w-full max-w-md bg-bg border-l border-border shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Cart</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-text-muted">Your cart is empty.</p>
          ) : (
            items.map((line) => {
              const meta = skuMeta(line.sku, catalog);
              return (
                <div
                  key={line.sku}
                  className="border border-border rounded-md p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-medium text-text">{meta.title}</div>
                      <div className="text-sm text-text-muted mt-0.5">
                        {cents(meta.price)}
                        {meta.cadence ? ` ${meta.cadence}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-danger hover:underline"
                      onClick={() => onRemove(line.sku)}
                    >
                      Remove
                    </button>
                  </div>
                  {meta.isPass ? (
                    <label className="block text-sm text-text">
                      Quantity
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={line.quantity}
                        onChange={(e) =>
                          onUpdateQuantity(
                            line.sku,
                            Math.max(1, Math.min(50, Number(e.target.value) || 1))
                          )
                        }
                        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
                      />
                    </label>
                  ) : (
                    <p className="text-xs text-text-muted">
                      Only one subscription can be in the cart at a time.
                    </p>
                  )}
                  <div className="text-sm text-text-muted text-right">
                    Line: {cents(meta.price * line.quantity)}
                  </div>
                </div>
              );
            })
          )}
          {items.length > 0 && (
            <>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-text-muted">Total</span>
                <span className="text-lg font-semibold text-text">{cents(total)}</span>
              </div>
              <p className="text-xs text-text-muted">
                Stripe is stubbed. Confirming applies all cart items to your account
                immediately.
              </p>
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <Button variant="lightbackground" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            className="flex-1"
            disabled={purchasing || items.length === 0}
            isLoading={purchasing}
            onClick={onConfirm}
          >
            Confirm
          </Button>
        </div>
      </aside>
    </div>
  );
};

export default AddToCartDrawer;
