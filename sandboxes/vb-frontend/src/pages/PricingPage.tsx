import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TdAccessAPI, TdBillingCatalog, YEAR1_CATALOG_FALLBACK } from '../api/tdAccess';
import PageTitle from '../components/common/PageTitle';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loading from '../components/common/Loading';
import CenterOrgContactForm from '../components/pricing/CenterOrgContactForm';

function cents(n: number): string {
  return `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}`;
}

/**
 * Public / director pricing for TD access SKUs (Annual, Monthly, Tournament pass).
 */
const PricingPage: React.FC = () => {
  const [catalog, setCatalog] = useState<TdBillingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await TdAccessAPI.getCatalog();
        if (!cancelled) setCatalog(data);
      } catch {
        if (!cancelled) {
          setCatalog(YEAR1_CATALOG_FALLBACK);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = async (
    sku: 'annual' | 'monthly' | 'tournament_credit' | 'tournament_pass'
  ) => {
    setCheckoutError(null);
    if (!catalog?.stripe_configured) {
      setCheckoutError(
        'Stripe Checkout is not configured yet. Use Manage Subscription for the stub flow, or ask an admin to set STRIPE_* env vars.'
      );
      return;
    }
    try {
      const origin = window.location.origin;
      const session = await TdAccessAPI.createCheckoutSession({
        sku,
        success_url: `${origin}/pricing?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancel`,
      });
      window.location.href = session.url;
    } catch (err) {
      console.error(err);
      setCheckoutError('Could not start Checkout. Try again or contact support.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <PageTitle>Tournament director pricing</PageTitle>
      <p className="text-sm text-text-muted mt-2 mb-6">
        Create tournaments free. Unlock bowlers, scoring, and public live with Annual,
        Monthly, or a one-time tournament pass. Prefer the in-app{' '}
        <Link to="/account/subscription" className="text-primary underline">
          Manage Subscription
        </Link>{' '}
        flow when signed in.
      </p>
      {loading && <Loading />}
      {checkoutError && (
        <Alert variant="warning" message={checkoutError} className="mb-4" />
      )}
      {catalog && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-border rounded-lg p-4 bg-surface">
              <h2 className="font-semibold text-primary">Annual</h2>
              <p className="text-2xl font-bold text-text mt-2">
                {cents(catalog.annual_cents)}
                <span className="text-sm font-normal text-text-muted"> / yr</span>
              </p>
              <p className="text-sm text-text-muted mt-2">Unlimited tournaments while active.</p>
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => startCheckout('annual')}
              >
                Subscribe
              </Button>
            </div>
            <div className="border border-border rounded-lg p-4 bg-surface">
              <h2 className="font-semibold text-primary">Monthly</h2>
              <p className="text-2xl font-bold text-text mt-2">
                {cents(catalog.monthly_cents)}
                <span className="text-sm font-normal text-text-muted"> / mo</span>
              </p>
              <p className="text-sm text-text-muted mt-2">
                Unlimited tournaments while active.
              </p>
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => startCheckout('monthly')}
              >
                Subscribe
              </Button>
            </div>
            <div className="border border-border rounded-lg p-4 bg-surface">
              <h2 className="font-semibold text-primary">Tournament pass</h2>
              <p className="text-2xl font-bold text-text mt-2">
                {cents(catalog.tournament_pass_cents ?? catalog.tournament_credit_cents)}
              </p>
              <p className="text-sm text-text-muted mt-2">One tournament unlock.</p>
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => startCheckout('tournament_pass')}
              >
                Buy pass
              </Button>
            </div>
          </div>
          <div className="border border-border rounded-lg p-4 bg-surface">
            <h2 className="font-semibold text-primary">Center / Organization</h2>
            <p className="text-sm text-text-muted mt-2">
              Contact us about center / organization pricing. Bowling centers,
              associations, and multi-TD orgs can get a custom multi-user package.
            </p>
            <CenterOrgContactForm />
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
