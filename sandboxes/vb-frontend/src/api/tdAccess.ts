import { devError } from './devLog';
import axiosInstance from './axios';

export type TdAccessPlan =
  | 'monthly'
  | 'annual'
  | 'side_action_monthly'
  | 'side_action_annual';

export type StubPurchaseSku =
  | TdAccessPlan
  | 'tournament_pass'
  | 'side_action_pass'
  | 'large_cap_lift';

export interface TournamentAccessStatus {
  tournament_id: number;
  gating_enabled: boolean;
  runnable: boolean;
  has_tournament_license: boolean;
  has_active_subscription: boolean;
  has_standard_subscription?: boolean;
  has_sa_subscription?: boolean;
  unused_credits: number;
  unused_side_action_credits?: number;
  unused_large_cap_lift_credits?: number;
  unique_participant_cap?: number;
  reason: string;
  is_sa_only?: boolean;
  access_expires_at?: string | null;
  license_expired?: boolean;
  can_extend_with_pass?: boolean;
}

export interface TdBillingCatalog {
  annual_cents: number;
  monthly_cents: number;
  tournament_credit_cents: number;
  tournament_pass_cents: number;
  side_action_annual_cents: number;
  side_action_monthly_cents: number;
  side_action_pass_cents: number;
  large_cap_lift_cents: number;
  currency: string;
  stripe_configured: boolean;
  gating_enabled: boolean;
  contact_us_label: string;
  grandfather_lock_deadline?: string;
  grandfather_lock_through?: string;
}

export interface TdBillingPassCounts {
  tournament: number;
  side_action: number;
  large_cap_lift: number;
}

export interface TdBillingSubscriptionSummary {
  plan: TdAccessPlan;
  status: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

export interface TdBillingSummary {
  subscription: TdBillingSubscriptionSummary | null;
  passes: TdBillingPassCounts;
  has_ever_subscribed?: boolean;
  has_ever_had_standard?: boolean;
  has_ever_had_sa?: boolean;
  can_write_director_ops?: boolean;
  can_create_full_tournament?: boolean;
  can_create_sa_event?: boolean;
  can_edit_full_tournament?: boolean;
  can_edit_sa_event?: boolean;
  director_read_only?: boolean;
}

export interface CheckoutSessionResponse {
  session_id: string;
  url: string;
  stripe_configured?: boolean;
}

export interface AdminTdCreditHolder {
  user_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  usbc_id?: string | null;
  unused_credits: number;
}

export interface AdminTdCreditHolders {
  items: AdminTdCreditHolder[];
  total_unused: number;
}

export const YEAR1_CATALOG_FALLBACK: TdBillingCatalog = {
  annual_cents: 19900,
  monthly_cents: 2500,
  tournament_credit_cents: 2000,
  tournament_pass_cents: 2000,
  side_action_annual_cents: 9900,
  side_action_monthly_cents: 1500,
  side_action_pass_cents: 1000,
  large_cap_lift_cents: 2500,
  currency: 'usd',
  stripe_configured: false,
  gating_enabled: false,
  contact_us_label: 'Center / Organization — Contact us',
};

export function hasBillingEntitlement(summary: TdBillingSummary | null | undefined): boolean {
  if (!summary) return false;
  const activeSub =
    summary.subscription != null && summary.subscription.status === 'active';
  const passes =
    (summary.passes?.tournament ?? 0) +
    (summary.passes?.side_action ?? 0) +
    (summary.passes?.large_cap_lift ?? 0);
  return activeSub || passes > 0;
}

export function hasEverSubscribed(summary: TdBillingSummary | null | undefined): boolean {
  if (!summary) return false;
  if (summary.has_ever_subscribed) return true;
  return summary.subscription != null;
}

/** Hide guided “Show All Plans” forever after any subscription. */
export function shouldHideShowAllPlans(
  summary: TdBillingSummary | null | undefined
): boolean {
  return hasEverSubscribed(summary);
}

/**
 * Whether the account may create/modify director resources.
 * Defaults open when billing is missing (pre-load / legacy payloads).
 */
export function canWriteDirectorOps(
  summary: TdBillingSummary | null | undefined
): boolean {
  if (!summary) return true;
  if (typeof summary.can_write_director_ops === 'boolean') {
    return summary.can_write_director_ops;
  }
  if (summary.director_read_only) return false;
  return true;
}

export function canCreateFullTournament(
  summary: TdBillingSummary | null | undefined
): boolean {
  if (!summary) return true;
  if (typeof summary.can_create_full_tournament === 'boolean') {
    return summary.can_create_full_tournament;
  }
  return canWriteDirectorOps(summary);
}

export function canCreateSaEvent(
  summary: TdBillingSummary | null | undefined
): boolean {
  if (!summary) return true;
  if (typeof summary.can_create_sa_event === 'boolean') {
    return summary.can_create_sa_event;
  }
  return canWriteDirectorOps(summary);
}

export function canEditFullTournament(
  summary: TdBillingSummary | null | undefined
): boolean {
  if (!summary) return true;
  if (typeof summary.can_edit_full_tournament === 'boolean') {
    return summary.can_edit_full_tournament;
  }
  return canWriteDirectorOps(summary);
}

export function canEditSaEvent(
  summary: TdBillingSummary | null | undefined
): boolean {
  if (!summary) return true;
  if (typeof summary.can_edit_sa_event === 'boolean') {
    return summary.can_edit_sa_event;
  }
  return canWriteDirectorOps(summary);
}

export function hasEverHadStandard(
  summary: TdBillingSummary | null | undefined
): boolean {
  if (!summary) return false;
  if (summary.has_ever_had_standard) return true;
  return hasEverSubscribed(summary) && canCreateFullTournament(summary);
}

export function hasEverHadSa(summary: TdBillingSummary | null | undefined): boolean {
  if (!summary) return false;
  if (summary.has_ever_had_sa) return true;
  const plan = summary.subscription?.plan;
  return (
    plan === 'side_action_monthly' ||
    plan === 'side_action_annual' ||
    (summary.passes?.side_action ?? 0) > 0
  );
}

export function isDirectorReadOnly(
  summary: TdBillingSummary | null | undefined
): boolean {
  if (!summary) return false;
  if (typeof summary.director_read_only === 'boolean') {
    return summary.director_read_only;
  }
  return hasEverSubscribed(summary) && !canWriteDirectorOps(summary);
}

/** Active subscription that covers creating without consuming a pass. */
export function hasElevatingSubscriptionForCreate(
  summary: TdBillingSummary | null | undefined,
  kind: 'full' | 'sa'
): boolean {
  if (!summary?.subscription || summary.subscription.status !== 'active') {
    return false;
  }
  const plan = summary.subscription.plan;
  if (kind === 'full') {
    return plan === 'monthly' || plan === 'annual';
  }
  return (
    plan === 'monthly' ||
    plan === 'annual' ||
    plan === 'side_action_monthly' ||
    plan === 'side_action_annual'
  );
}

/** Whether create should confirm pass consumption (no elevating sub + unused pass). */
export function shouldConfirmPassConsume(
  summary: TdBillingSummary | null | undefined,
  kind: 'full' | 'sa'
): { confirm: boolean; remaining: number } {
  if (hasElevatingSubscriptionForCreate(summary, kind)) {
    return { confirm: false, remaining: 0 };
  }
  const remaining =
    kind === 'full'
      ? summary?.passes?.tournament ?? 0
      : summary?.passes?.side_action ?? 0;
  return { confirm: remaining > 0, remaining };
}

/** Seat band mirror of backend effective_max_assistants. */
export function effectiveMaxAssistants(opts: {
  unique_participant_cap?: number | null;
  max_assistants?: number | null;
}): number {
  if (opts.max_assistants != null && opts.max_assistants >= 0) {
    return opts.max_assistants;
  }
  const cap = opts.unique_participant_cap ?? 500;
  if (cap <= 500) return 2;
  if (cap <= 2000) return 5;
  return 5;
}

export function hasActiveSubscription(
  summary: TdBillingSummary | null | undefined
): boolean {
  return (
    summary?.subscription != null && summary.subscription.status === 'active'
  );
}

export type PassKind = 'tournament' | 'side_action' | 'large_cap_lift';

export interface BillingHistoryItem {
  id: string;
  kind: 'subscription' | 'pass_purchase' | 'proration_credit' | 'proration_charge';
  sku?: string | null;
  label: string;
  amount_cents: number;
  created_at: string;
}

export interface BillingHistoryResponse {
  items: BillingHistoryItem[];
}

export interface BillingUsageItem {
  credit_id: number;
  kind: PassKind;
  applied_at: string;
  tournament_id: number | null;
  tournament_name: string | null;
  applied_by_user_id: number | null;
  applied_by_name: string | null;
  owner_user_id: number;
}

export interface BillingUsageResponse {
  items: BillingUsageItem[];
}

export interface AdminUserBillingResponse {
  user_id: number;
  role: string;
  billing: TdBillingSummary;
}

export const TdAccessAPI = {
  getCatalog: async (): Promise<TdBillingCatalog> => {
    try {
      const response = await axiosInstance.get<TdBillingCatalog>('/billing/catalog');
      return response.data;
    } catch (error) {
      devError('Error fetching billing catalog:', error);
      throw error;
    }
  },

  getBillingMe: async (): Promise<TdBillingSummary> => {
    const response = await axiosInstance.get<TdBillingSummary>('/billing/me');
    return response.data;
  },

  stubPurchase: async (body: {
    sku: StubPurchaseSku;
    quantity?: number;
  }): Promise<TdBillingSummary> => {
    const response = await axiosInstance.post<TdBillingSummary>(
      '/billing/stub-purchase',
      body
    );
    return response.data;
  },

  submitCenterOrgInquiry: async (body: {
    contact_name: string;
    email: string;
    organization_name: string;
    organization_type:
      | 'bowling_center'
      | 'association'
      | 'multi_td_org'
      | 'other';
    director_count?: number | null;
    annual_events?: number | null;
    annual_participants?: number | null;
    phone?: string | null;
    message?: string | null;
    website?: string | null;
  }): Promise<{ ok: boolean }> => {
    const response = await axiosInstance.post<{ ok: boolean }>(
      '/billing/center-org-inquiry',
      body
    );
    return response.data;
  },

  createCheckoutSession: async (body: {
    sku: StubPurchaseSku | 'tournament_credit';
    success_url: string;
    cancel_url: string;
    quantity?: number;
  }): Promise<CheckoutSessionResponse> => {
    try {
      const response = await axiosInstance.post<CheckoutSessionResponse>(
        '/billing/checkout-session',
        body
      );
      return response.data;
    } catch (error) {
      devError('Error creating checkout session:', error);
      throw error;
    }
  },

  getTournamentAccess: async (tournamentId: number): Promise<TournamentAccessStatus> => {
    try {
      const response = await axiosInstance.get<TournamentAccessStatus>(
        `/tournaments/${tournamentId}/access`
      );
      return response.data;
    } catch (error) {
      devError('Error fetching tournament access:', error);
      throw error;
    }
  },

  applyCredit: async (tournamentId: number): Promise<{ runnable: boolean }> => {
    try {
      const response = await axiosInstance.post(
        `/tournaments/${tournamentId}/access/apply-credit`
      );
      return response.data;
    } catch (error) {
      devError('Error applying tournament credit:', error);
      throw error;
    }
  },

  extendCredit: async (
    tournamentId: number
  ): Promise<{ runnable: boolean; access_expires_at?: string }> => {
    const response = await axiosInstance.post(
      `/tournaments/${tournamentId}/access/extend-credit`
    );
    return response.data;
  },

  cancelSubscription: async (): Promise<TdBillingSummary> => {
    const response = await axiosInstance.post<TdBillingSummary>(
      '/billing/cancel-subscription'
    );
    return response.data;
  },

  getBillingHistory: async (): Promise<BillingHistoryResponse> => {
    const response = await axiosInstance.get<BillingHistoryResponse>(
      '/billing/history'
    );
    return response.data;
  },

  getBillingUsage: async (): Promise<BillingUsageResponse> => {
    const response = await axiosInstance.get<BillingUsageResponse>(
      '/billing/usage'
    );
    return response.data;
  },

  stubPurchaseBatch: async (body: {
    items: { sku: StubPurchaseSku; quantity?: number }[];
  }): Promise<TdBillingSummary> => {
    const response = await axiosInstance.post<TdBillingSummary>(
      '/billing/stub-purchase-batch',
      body
    );
    return response.data;
  },

  applyLargeCapLift: async (
    tournamentId: number
  ): Promise<{ tournament_id: number; unique_participant_cap: number }> => {
    const response = await axiosInstance.post(
      `/tournaments/${tournamentId}/access/apply-large-cap-lift`
    );
    return response.data;
  },

  upgradeFromSaOnly: async (
    tournamentId: number
  ): Promise<{ runnable: boolean; is_sa_only: boolean }> => {
    try {
      const response = await axiosInstance.post<{
        runnable: boolean;
        is_sa_only: boolean;
      }>(`/tournaments/${tournamentId}/access/upgrade-from-sa-only`);
      return response.data;
    } catch (error) {
      devError('Error upgrading side action only tournament:', error);
      throw error;
    }
  },

  adminGetUserBilling: async (userId: number): Promise<AdminUserBillingResponse> => {
    const response = await axiosInstance.get<AdminUserBillingResponse>(
      `/admin/td-access/users/${userId}/billing`
    );
    return response.data;
  },

  adminAdjustPasses: async (
    userId: number,
    body: { kind: PassKind; delta?: number; set_to?: number }
  ): Promise<AdminUserBillingResponse & { unused: number; kind: PassKind }> => {
    const response = await axiosInstance.post(
      `/admin/td-access/users/${userId}/passes`,
      body
    );
    return response.data;
  },

  adminUpdateSubscription: async (
    userId: number,
    body: {
      plan?: TdAccessPlan;
      set_period_end?: string;
      add_days?: number;
      clear?: boolean;
    }
  ): Promise<AdminUserBillingResponse> => {
    const response = await axiosInstance.post(
      `/admin/td-access/users/${userId}/subscription`,
      body
    );
    return response.data;
  },

  adminSetAdminFlag: async (
    userId: number,
    isAdmin: boolean
  ): Promise<AdminUserBillingResponse> => {
    const response = await axiosInstance.post(
      `/admin/td-access/users/${userId}/admin-flag`,
      { is_admin: isAdmin }
    );
    return response.data;
  },

  adminGrantCredits: async (
    userId: number,
    count: number,
    kind: PassKind = 'tournament'
  ): Promise<{
    user_id: number;
    granted: number;
    unused_credits: number;
    kind?: PassKind;
    role?: string;
  }> => {
    try {
      const response = await axiosInstance.post(
        '/admin/td-access/grant-credits',
        null,
        { params: { user_id: userId, count, kind } }
      );
      return response.data;
    } catch (error) {
      devError('Error granting tournament credits:', error);
      throw error;
    }
  },

  adminListCreditHolders: async (): Promise<AdminTdCreditHolders> => {
    try {
      const response = await axiosInstance.get<AdminTdCreditHolders>(
        '/admin/td-access/credits'
      );
      return response.data;
    } catch (error) {
      devError('Error listing unused tournament credits:', error);
      throw error;
    }
  },
};
