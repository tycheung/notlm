import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  hasBillingEntitlement,
  shouldHideShowAllPlans,
  StubPurchaseSku,
  TdAccessAPI,
  TdBillingCatalog,
  TdBillingSummary,
  YEAR1_CATALOG_FALLBACK,
} from '../../api/tdAccess';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import PageTitle from '../../components/common/PageTitle';
import { useAuth } from '../../contexts/AuthContext';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import AddToCartDrawer from '../../components/billing/AddToCartDrawer';
import BillingHistoryModal from '../../components/billing/BillingHistoryModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

type Frequency = 'once' | 'more' | null;
type ProductLine = 'full' | 'sa' | null;

function cents(n: number): string {
  return `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}`;
}

function subscriptionLabel(plan: string): string {
  switch (plan) {
    case 'monthly':
      return 'Tournament Director';
    case 'annual':
      return 'Tournament Director Annual';
    case 'side_action_monthly':
      return 'Side Action';
    case 'side_action_annual':
      return 'Side Action Annual';
    default:
      return plan;
  }
}

const ManageSubscriptionPage: React.FC = () => {
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const [catalog, setCatalog] = useState<TdBillingCatalog>(YEAR1_CATALOG_FALLBACK);
  const [billing, setBilling] = useState<TdBillingSummary | null>(
    user?.billing ?? null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>(null);
  const [productLine, setProductLine] = useState<ProductLine>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartItems, setCartItems] = useState<
    { sku: StubPurchaseSku; quantity: number }[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const SUB_SKUS: StubPurchaseSku[] = [
    'monthly',
    'annual',
    'side_action_monthly',
    'side_action_annual',
  ];

  const addToCart = (sku: StubPurchaseSku, quantity = 1) => {
    setCartItems((prev) => {
      if (SUB_SKUS.includes(sku)) {
        const withoutSubs = prev.filter((i) => !SUB_SKUS.includes(i.sku));
        return [...withoutSubs, { sku, quantity: 1 }];
      }
      const existing = prev.find((i) => i.sku === sku);
      if (existing) {
        return prev.map((i) =>
          i.sku === sku
            ? { ...i, quantity: Math.min(50, i.quantity + quantity) }
            : i
        );
      }
      return [...prev, { sku, quantity }];
    });
    setDrawerOpen(true);
  };

  const checkoutCart = async () => {
    if (cartItems.length === 0) return;
    setPurchasing(true);
    setError(null);
    try {
      if (catalog.stripe_configured) {
        // Stripe Checkout handles one line SKU per session; take first cart item.
        const first = cartItems[0];
        const origin = window.location.origin;
        const session = await TdAccessAPI.createCheckoutSession({
          sku: first.sku,
          quantity: first.quantity,
          success_url: `${origin}${location.pathname}?checkout=success`,
          cancel_url: `${origin}${location.pathname}?checkout=cancel`,
        });
        if (session?.url) {
          window.location.assign(session.url);
          return;
        }
        setError('Checkout session could not be started.');
        return;
      }
      const summary = await TdAccessAPI.stubPurchaseBatch({ items: cartItems });
      setBilling(summary);
      if (user) updateUser({ ...user, billing: summary });
      setCartItems([]);
      setDrawerOpen(false);
    } catch (err) {
      console.error(err);
      setError('Checkout failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const updateCartQuantity = (sku: StubPurchaseSku, quantity: number) => {
    setCartItems((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, quantity } : i))
    );
  };

  const removeFromCart = (sku: StubPurchaseSku) => {
    setCartItems((prev) => prev.filter((i) => i.sku !== sku));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cat, summary] = await Promise.all([
          TdAccessAPI.getCatalog().catch(() => YEAR1_CATALOG_FALLBACK),
          TdAccessAPI.getBillingMe(),
        ]);
        if (cancelled) return;
        setCatalog(cat);
        setBilling(summary);
        if (user) {
          updateUser({ ...user, billing: summary });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Could not load subscription data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh once on mount
  }, []);

  const hasEntitlement = hasBillingEntitlement(billing);
  const hideShowAllPlans = shouldHideShowAllPlans(billing);
  const showManagementView =
    (hasEntitlement || hideShowAllPlans) && !(showAllPlans && !hideShowAllPlans);
  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);
  const activeSub = billing?.subscription;
  const periodEnd = activeSub?.current_period_end
    ? new Date(activeSub.current_period_end)
    : null;
  const periodEndLabel = periodEnd
    ? periodEnd.toLocaleDateString()
    : null;

  const recommended = useMemo(() => {
    if (!frequency || !productLine) return null;
    if (frequency === 'once' && productLine === 'full') {
      return {
        primary: {
          sku: 'tournament_pass' as StubPurchaseSku,
          title: 'Tournament pass',
          price: catalog.tournament_pass_cents,
          blurb: 'Unlock one full tournament.',
        },
        secondary: null,
      };
    }
    if (frequency === 'once' && productLine === 'sa') {
      return {
        primary: {
          sku: 'side_action_pass' as StubPurchaseSku,
          title: 'Side Action pass',
          price: catalog.side_action_pass_cents,
          blurb: 'Unlock one side-action-only event.',
        },
        secondary: null,
      };
    }
    if (frequency === 'more' && productLine === 'full') {
      return {
        primary: {
          sku: 'monthly' as StubPurchaseSku,
          title: 'Tournament Director',
          price: catalog.monthly_cents,
          blurb: 'Billed monthly. Unlimited full tournaments while active.',
        },
        secondary: {
          sku: 'annual' as StubPurchaseSku,
          title: 'Tournament Director Annual',
          price: catalog.annual_cents,
          blurb: 'Billed annually. Best value if you run year-round.',
        },
      };
    }
    return {
      primary: {
        sku: 'side_action_monthly' as StubPurchaseSku,
        title: 'Side Action',
        price: catalog.side_action_monthly_cents,
        blurb: 'Billed monthly. Unlimited SA-only events while active.',
      },
      secondary: {
        sku: 'side_action_annual' as StubPurchaseSku,
        title: 'Side Action Annual',
        price: catalog.side_action_annual_cents,
        blurb: 'Billed annually. Best for weekly walk-in pots.',
      },
    };
  }, [catalog, frequency, productLine]);

  const subscriptionCards: {
    sku: StubPurchaseSku;
    title: string;
    price: number;
    cadence: string;
    blurb: string;
  }[] = [
    {
      sku: 'monthly',
      title: 'Tournament Director',
      price: catalog.monthly_cents,
      cadence: '/ mo',
      blurb: 'Billed monthly. Unlimited full tournaments while active.',
    },
    {
      sku: 'annual',
      title: 'Tournament Director Annual',
      price: catalog.annual_cents,
      cadence: '/ yr',
      blurb: 'Billed annually. Unlimited full tournaments while active.',
    },
    {
      sku: 'side_action_monthly',
      title: 'Side Action',
      price: catalog.side_action_monthly_cents,
      cadence: '/ mo',
      blurb: 'Billed monthly. Unlimited SA-only events while active.',
    },
    {
      sku: 'side_action_annual',
      title: 'Side Action Annual',
      price: catalog.side_action_annual_cents,
      cadence: '/ yr',
      blurb: 'Billed annually. Unlimited SA-only events while active.',
    },
  ];

  // Large cap lift lives under Upgrade passes only (not the Passes grid).
  const passCards: {
    sku: StubPurchaseSku;
    title: string;
    price: number;
    countKey: keyof NonNullable<TdBillingSummary['passes']>;
    blurb: string;
  }[] = [
    {
      sku: 'tournament_pass',
      title: 'Tournament pass',
      price: catalog.tournament_pass_cents,
      countKey: 'tournament',
      blurb: 'One full tournament unlock.',
    },
    {
      sku: 'side_action_pass',
      title: 'Side Action pass',
      price: catalog.side_action_pass_cents,
      countKey: 'side_action',
      blurb: 'One SA-only event unlock.',
    },
  ];

  const renderUpgradePasses = () => (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-text mb-2">Upgrade passes</h2>
      <p className="text-sm text-text-muted mb-4">
        Need more than 500 unique bowlers on a tournament? Add a large-cap lift.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-border rounded-lg p-4 bg-surface">
          <h3 className="font-semibold text-primary">Large cap lift</h3>
          <p className="text-2xl font-bold mt-2">{cents(catalog.large_cap_lift_cents)}</p>
          <p className="text-sm text-text-muted mt-2">
            One tournament, 500 → 2,000 unique participants.
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={purchasing}
            onClick={() => addToCart('large_cap_lift')}
          >
            Add to cart
          </Button>
        </div>
        <div className="border border-border rounded-lg p-4 bg-surface">
          <h3 className="font-semibold text-primary">Above 2,000</h3>
          <p className="text-2xl font-bold mt-2">Custom</p>
          <p className="text-sm text-text-muted mt-2">
            Larger weekends need extra capacity. Contact us for a quote.
          </p>
          <a
            href="mailto:support@victorybowling.com?subject=Custom%20tournament%20cap"
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Contact us
          </a>
        </div>
      </div>
    </section>
  );

  const renderPlanCard = (opts: {
    sku: StubPurchaseSku;
    title: string;
    price: number;
    cadence?: string;
    blurb: string;
    active?: boolean;
  }) => (
    <div
      key={opts.sku}
      className={`border rounded-lg p-4 bg-surface transition-shadow duration-200 hover:shadow-md ${
        opts.active ? 'border-primary ring-1 ring-primary/40' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-primary">{opts.title}</h3>
        {opts.active && (
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Active
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-text mt-2">
        {cents(opts.price)}
        {opts.cadence ? (
          <span className="text-sm font-normal text-text-muted"> {opts.cadence}</span>
        ) : null}
      </p>
      <p className="text-sm text-text-muted mt-2">{opts.blurb}</p>
      <Button
        type="button"
        className="mt-4 w-full"
        disabled={purchasing || opts.active}
        onClick={() => addToCart(opts.sku)}
      >
        {opts.active ? 'Current plan' : 'Select'}
      </Button>
    </div>
  );

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8 max-w-5xl">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: 'Manage Subscription' },
          ]}
          className="mb-4"
        />
        <PageTitle>Manage Subscription</PageTitle>
        <p className="text-sm text-text-muted mt-2 mb-4">
          Choose a plan or pass to run tournaments and side actions. Add items to your
          cart, then confirm checkout (stubbed until Stripe is live).
        </p>

        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-3 bg-bg/95 backdrop-blur border-b border-border mb-6 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {!hideShowAllPlans && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <span className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={showAllPlans}
                    onChange={(e) => setShowAllPlans(e.target.checked)}
                  />
                  <span className="h-6 w-11 rounded-full bg-border peer-checked:bg-primary transition-colors" />
                  <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
                <span className="text-sm font-medium text-text">Show All Plans</span>
              </label>
            )}
            {hideShowAllPlans && (
              <button
                type="button"
                className="text-sm text-primary underline font-medium"
                onClick={() => setHistoryOpen(true)}
              >
                View Billing/Usage History
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {activeSub && (
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => setCancelOpen(true)}
                disabled={!!activeSub.cancel_at_period_end}
              >
                {activeSub.cancel_at_period_end
                  ? 'Cancellation scheduled'
                  : 'Cancel Subscription'}
              </Button>
            )}
            <button
              type="button"
              aria-label="Shopping cart"
              className={`relative rounded-md p-2 ${
                cartCount > 0
                  ? 'text-primary animate-pulse'
                  : 'text-text-muted opacity-60'
              }`}
              onClick={() => setDrawerOpen(true)}
              disabled={cartCount === 0 && !drawerOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 22a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {error && <Alert variant="error" message={error} className="mb-4" />}
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loading />
          </div>
        ) : showManagementView ? (
          <>
            <section>
              <h2 className="text-lg font-semibold text-text mb-3">Passes</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {passCards.map((card) => (
                  <div
                    key={card.sku}
                    className="border border-border rounded-lg p-4 bg-surface relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-primary">{card.title}</h3>
                      <button
                        type="button"
                        aria-label={`Add ${card.title} to cart`}
                        className="rounded-md p-2 text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => addToCart(card.sku)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 22a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="text-3xl font-bold text-text mt-3">
                      {billing?.passes?.[card.countKey] ?? 0}
                    </p>
                    <p className="text-xs text-text-muted mt-1">available</p>
                    <p className="text-sm text-text-muted mt-3">
                      {cents(card.price)} · {card.blurb}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-text mb-3">Subscriptions</h2>
              {billing?.subscription && (
                <p className="text-sm text-text-muted mb-4">
                  Current plan:{' '}
                  <span className="font-medium text-text">
                    {subscriptionLabel(billing.subscription.plan)}
                  </span>
                  {periodEndLabel && (
                    <>
                      {' · '}
                      <span
                        className={
                          billing.subscription.cancel_at_period_end
                            ? 'text-danger font-medium'
                            : 'text-success font-medium'
                        }
                      >
                        {billing.subscription.cancel_at_period_end
                          ? `Expires on ${periodEndLabel}`
                          : `Renews on ${periodEndLabel}`}
                      </span>
                    </>
                  )}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {subscriptionCards.map((card) =>
                  renderPlanCard({
                    ...card,
                    active: billing?.subscription?.plan === card.sku,
                  })
                )}
              </div>
            </section>
            {renderUpgradePasses()}
          </>
        ) : showAllPlans ? (
          <>
            <section>
              <h2 className="text-lg font-semibold text-text mb-3">Subscriptions</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {subscriptionCards.map((card) =>
                  renderPlanCard({
                    ...card,
                    active: billing?.subscription?.plan === card.sku,
                  })
                )}
              </div>
            </section>
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-text mb-3">Passes</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {passCards.map((card) =>
                  renderPlanCard({
                    sku: card.sku,
                    title: card.title,
                    price: card.price,
                    blurb: card.blurb,
                  })
                )}
              </div>
            </section>
            {renderUpgradePasses()}
          </>
        ) : (
          <>
            <section className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-text mb-3">
                  1) How often are you running this month?
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFrequency('once')}
                    className={`text-left border rounded-lg p-4 transition-colors ${
                      frequency === 'once'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-surface hover:border-primary/40'
                    }`}
                  >
                    <div className="font-medium text-text">Just once</div>
                    <div className="text-sm text-text-muted mt-1">
                      One event this month
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('more')}
                    className={`text-left border rounded-lg p-4 transition-colors ${
                      frequency === 'more'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-surface hover:border-primary/40'
                    }`}
                  >
                    <div className="font-medium text-text">More than one</div>
                    <div className="text-sm text-text-muted mt-1">
                      Multiple events this month
                    </div>
                  </button>
                </div>
              </div>

              {frequency && (
                <div className="animate-[fadeIn_200ms_ease-out]">
                  <h2 className="text-lg font-semibold text-text mb-3">
                    2) Full tournament or side actions?
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setProductLine('full')}
                      className={`text-left border rounded-lg p-4 transition-colors ${
                        productLine === 'full'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-surface hover:border-primary/40'
                      }`}
                    >
                      <div className="font-medium text-text">Full tournament</div>
                      <div className="text-sm text-text-muted mt-1">
                        Scored Victory tournament with standings
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductLine('sa')}
                      className={`text-left border rounded-lg p-4 transition-colors ${
                        productLine === 'sa'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-surface hover:border-primary/40'
                      }`}
                    >
                      <div className="font-medium text-text">Side actions only</div>
                      <div className="text-sm text-text-muted mt-1">
                        Pots / brackets without a full tournament shell
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {recommended && (
                <div className="animate-[fadeIn_250ms_ease-out]">
                  <h2 className="text-lg font-semibold text-text mb-3">
                    Recommended for you
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderPlanCard({
                      sku: recommended.primary.sku,
                      title: recommended.primary.title,
                      price: recommended.primary.price,
                      blurb: recommended.primary.blurb,
                      cadence:
                        recommended.primary.sku === 'monthly' ||
                        recommended.primary.sku === 'side_action_monthly'
                          ? '/ mo'
                          : recommended.primary.sku === 'annual' ||
                              recommended.primary.sku === 'side_action_annual'
                            ? '/ yr'
                            : undefined,
                    })}
                    {recommended.secondary &&
                      renderPlanCard({
                        sku: recommended.secondary.sku,
                        title: recommended.secondary.title,
                        price: recommended.secondary.price,
                        blurb: recommended.secondary.blurb,
                        cadence: '/ yr',
                      })}
                  </div>
                  {renderUpgradePasses()}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <AddToCartDrawer
        open={drawerOpen}
        items={cartItems}
        catalog={catalog}
        purchasing={purchasing}
        onClose={() => setDrawerOpen(false)}
        onUpdateQuantity={updateCartQuantity}
        onRemove={removeFromCart}
        onConfirm={() => {
          void checkoutCart();
        }}
      />
      <BillingHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <ConfirmDialog
        isOpen={cancelOpen}
        title="Cancel subscription"
        message="Turn off auto-renew? You keep access until the current period ends."
        confirmText="Cancel renew"
        confirmVariant="danger"
        onClose={() => setCancelOpen(false)}
        onConfirm={async () => {
          try {
            const summary = await TdAccessAPI.cancelSubscription();
            setBilling(summary);
            if (user) updateUser({ ...user, billing: summary });
          } catch (err) {
            console.error(err);
            setError('Could not cancel subscription.');
          } finally {
            setCancelOpen(false);
          }
        }}
      />
    </div>
  );
};

export default ManageSubscriptionPage;
