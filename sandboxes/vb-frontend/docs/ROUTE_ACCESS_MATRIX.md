# Route Access Matrix

_Auto-generated skeleton: 2026-09-02 22:27 UTC_

Canonical backend catalog. Synced copy: `react-frontend/docs/ROUTE_ACCESS_MATRIX.md`.

See also: [SUBSCRIPTION_ACCESS_TODO.md](./SUBSCRIPTION_ACCESS_TODO.md).

## Legend

| Column | Meaning |
|--------|---------|
| Access class | **R** = read (lapsed OK for authorized TD/SA); **W** = write (active billing when gating on); **W-setup** = setup writes (free today, billable later) |
| scoped | Allowed when user has role + organizer/delegate/master relationship to resource |
| Billing hook | Function to call when `TD_ACCESS_GATING_ENABLED` expands to full write paywall |

## Changelog

- **2026-09-02** — Initial matrix with SA role (`side_action_only`) and subscription read/write tiers.

## abuse-reports

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/account/abuse-reports/reportable-events` | GET | `list_reportable_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/account/abuse-reports` | POST | `create_abuse_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## account

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/account/2fa/disable` | POST | `disable_2fa` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/2fa/setup` | POST | `setup_2fa` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/2fa/verify-login` | POST | `verify_2fa_login` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/2fa/verify` | POST | `verify_2fa` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/change-password` | POST | `change_password` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/me/security` | GET | `get_security_info` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/account/notification-preferences` | PUT | `update_notification_preferences` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/preferences` | PUT | `update_user_preferences` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/request-email-verification` | POST | `request_email_verification` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/request-password-reset` | POST | `request_password_reset` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/reset-password` | POST | `reset_password` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/sessions/{session_id}` | DELETE | `delete_session` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/sessions` | DELETE | `delete_all_sessions` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/sessions` | GET | `get_user_sessions` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/account/td-notification-preferences` | PUT | `update_td_notification_preferences` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/usbc-identities/active` | PUT | `set_active_usbc_identity` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/usbc-identities/claim-additional` | POST | `claim_additional_usbc_identity` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/account/usbc-identities` | GET | `get_usbc_identity_management` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/account/verify-email` | POST | `verify_email` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## admin

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/admin/abuse-reports/{report_id}` | GET | `get_abuse_report` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/admin/abuse-reports/{report_id}` | PATCH | `update_abuse_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/admin/abuse-reports` | GET | `list_abuse_reports` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/admin/activity` | GET | `get_activity_logs` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/admin/alerts/{alert_id}/dismiss` | POST | `dismiss_alert` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/admin/alerts` | GET | `get_alerts` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/admin/logs-viewer` | GET | `logs_viewer` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/admin/system/event-windows` | GET | `get_admin_event_windows` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/admin/system/health` | GET | `get_system_health` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/admin/system/stats` | GET | `get_system_stats` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |

## admin-impersonation

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/admin/impersonate` | POST | `impersonate_tournament_director` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## admin-td-access

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/admin/td-access/credits` | GET | `list_td_unused_credits` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/admin/td-access/grant-credits` | POST | `admin_grant_tournament_credits` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## advancement-pool

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/advancement-pool/assign` | POST | `assign_to_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/advancement-pool/bulk-add` | POST | `bulk_add_to_pool` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/advancement-pool/check-duplicates/{target_round_id}` | GET | `check_for_duplicates` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/advancement-pool/clear/relationship/{relationship_id}` | DELETE | `clear_pool_for_relationship` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/advancement-pool/clear/rounds/{source_round_id}/{target_round_id}` | DELETE | `clear_pool_for_round_relationship` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/advancement-pool/relationship/{relationship_id}` | GET | `get_pool_by_relationship` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/advancement-pool/remove-duplicates/{target_round_id}` | POST | `remove_duplicates` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/advancement-pool/round/{round_id}/clear` | DELETE | `clear_pool_for_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/advancement-pool/round/{round_id}/deduplicate` | DELETE | `remove_duplicate_pool_entries` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/advancement-pool/round/{round_id}/ordered-entrants` | GET | `get_ordered_target_round_entrants` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/advancement-pool/round/{round_id}/unassigned` | GET | `get_unassigned_participants` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/advancement-pool/round/{round_id}` | GET | `get_pool_participants` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/advancement-pool/{pool_entry_id}` | DELETE | `remove_from_pool` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## authentication

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/auth/logout` | POST | `logout` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/auth/refresh` | POST | `refresh_token` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/auth/token` | OPTIONS | `token_options` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/auth/token` | POST | `login_for_access_token` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## bowling centers

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/bowling-centers/` | GET | `get_bowling_centers` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/bowling-centers/` | POST | `create_bowling_center` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/bowling-centers/by-address` | POST | `search_centers_by_address` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/bowling-centers/near-me` | POST | `search_centers_by_coordinates` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/bowling-centers/search` | GET | `search_bowling_centers` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/bowling-centers/{center_id}/stats` | GET | `get_bowling_center_stats` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/bowling-centers/{center_id}/tournaments` | GET | `get_center_with_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/bowling-centers/{center_id}/update-coordinates` | POST | `update_center_coordinates` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/bowling-centers/{center_id}` | DELETE | `delete_bowling_center` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/bowling-centers/{center_id}` | GET | `get_bowling_center` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/bowling-centers/{center_id}` | PUT | `update_bowling_center` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## directors

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/directors/bowler-averages/centers` | GET | `list_my_house_average_centers` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/bowler-averages` | GET | `list_my_house_bowler_averages` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/bowlers/search` | GET | `search_bowlers_for_lookup` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/events/{event_id}/bowlers/{user_id}/average-picks` | GET | `get_event_bowler_average_picks` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/events/{event_id}/delegations/{delegate_user_id}` | DELETE | `delete_event_delegation` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/directors/events/{event_id}/delegations` | GET | `list_event_delegations` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/events/{event_id}/delegations` | PUT | `upsert_event_delegation` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/directors/events/{event_id}/director-access` | GET | `get_event_director_access` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/me/home-summary` | GET | `get_my_director_home_summary` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/my-delegated-tournaments/` | GET | `list_my_delegated_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/my-tournaments/` | GET | `list_my_owned_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/td-search` | GET | `search_tournament_directors` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/tournaments/{tournament_id}/director-permissions/{delegate_user_id}` | DELETE | `delete_tournament_director_permission` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/directors/tournaments/{tournament_id}/director-permissions` | GET | `list_tournament_director_permissions` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/directors/tournaments/{tournament_id}/director-permissions` | PUT | `upsert_tournament_director_permission` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/directors/tournaments/{tournament_id}/my-access` | GET | `get_my_tournament_director_access` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |

## event-format-templates

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/users/me/event-format-templates/` | GET | `list_my_event_format_templates` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me/event-format-templates/` | POST | `create_event_format_template` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/me/event-format-templates/apply` | POST | `apply_template_to_event` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/me/event-format-templates/from-event` | POST | `create_template_from_event` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/me/event-format-templates/{template_id}` | DELETE | `delete_event_format_template` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/me/event-format-templates/{template_id}` | PATCH | `update_event_format_template` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## event-participants

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/events/{event_id}/participants/batch-unassign-all` | POST | `batch_unassign_event_participants_from_all` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants/batch` | POST | `batch_create_event_participants` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants/check-in-all` | POST | `check_in_all_event_participants` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants/csv-template` | GET | `download_participants_csv_template` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/participants/csv` | POST | `upload_participants_csv` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants/stats` | GET | `get_event_participant_stats` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/participants/{participant_id}/approve` | POST | `approve_event_participant` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants/{participant_id}/demographics` | PATCH | `update_participant_demographics` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants/{participant_id}/unassign_all` | POST | `unassign_event_participant_from_all` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants/{participant_id}` | DELETE | `delete_event_participant` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants/{participant_id}` | PATCH | `update_event_participant_inline` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/participants` | GET | `get_event_participants` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/participants` | POST | `create_event_participant` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## event-teams

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/events/{event_id}/teams/batch` | POST | `batch_create_event_teams` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/teams/sign-up-public` | POST | `sign_up_event_team_public` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/teams/stats` | GET | `get_event_team_stats` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/teams/{team_id}/captain` | POST | `update_team_captain` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/teams/{team_id}/members/{user_id}` | DELETE | `remove_team_member` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/teams/{team_id}/members` | POST | `add_team_member` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/teams/{team_id}/reenter` | POST | `create_team_reentry` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/teams/{team_id}` | DELETE | `delete_event_team` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/teams/{team_id}` | GET | `get_event_team` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/teams/{team_id}` | PATCH | `update_event_team` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/teams` | GET | `get_event_teams` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/teams` | POST | `create_event_team` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## events

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/events/` | GET | `get_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/` | POST | `create_event` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/pending-signups` | GET | `list_pending_signup_events_for_director` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/register-public` | POST | `register_for_event_public` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/financials` | POST | `generate_event_financials_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/lane-assignment-sheets` | POST | `generate_lane_assignment_sheets_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/prize-fund` | POST | `generate_prize_fund_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/roster` | POST | `generate_event_roster_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/score-sheets` | POST | `generate_score_sheets_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/scores/excel` | POST | `download_event_scores_excel` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/side-action-financials` | POST | `generate_side_action_financials_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/single-game` | POST | `generate_single_game_results_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/reports/standings` | POST | `generate_event_standings_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/championship-results/recompute` | POST | `recompute_event_championship_results` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/championship-results` | GET | `get_event_championship_results` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/complete` | GET | `get_complete_event` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/final-nodes/standings-config` | PUT | `update_final_nodes_standings_config` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/final-nodes/{final_node_id}` | DELETE | `delete_final_node` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/final-nodes/{final_node_id}` | PATCH | `update_final_node` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/final-nodes` | GET | `list_final_nodes` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/final-nodes` | POST | `create_final_node` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/final-payouts` | GET | `get_event_final_payouts` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/format-export` | GET | `get_event_format_export` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/lane-assignment-board` | GET | `get_event_lane_assignment_board` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/lane-engine/assignment-strategy/apply` | POST | `apply_lane_assignment_strategy_persist` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/lane-engine/auto-batch` | POST | `run_auto_batch_lane_assignment` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/lane-engine/copy-from-round` | POST | `copy_lanes_from_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/lane-engine/stamp-games` | POST | `stamp_lane_games` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/lane-management` | GET | `get_event_lane_management` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/lane-management` | PUT | `update_event_lane_management` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/lock-in` | POST | `lock_in_event` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/prize-distribution` | GET | `get_event_prize_distribution` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/registration-settings` | PATCH | `patch_event_registration_settings` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/rounds/{round_id}/lane-engine/inherit-from-matchups` | POST | `inherit_lane_engine_from_matchups` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/rounds/{round_id}/lane-score-sheet` | GET | `get_lane_score_sheet` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/rounds/{round_id}/live-scores/stream` | GET | `stream_round_live_scores` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/rounds/{round_id}/live-scores` | GET | `get_round_live_scores` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/rounds` | GET | `get_event_with_rounds` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/squads/{squad_id}/lanes-in-play` | PUT | `put_squad_lanes_in_play` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}/stats` | GET | `get_event_stats` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/tournament` | GET | `get_event_with_tournament` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}/unlock` | POST | `unlock_event` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}` | DELETE | `delete_event` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}` | GET | `get_event` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/events/{event_id}` | PATCH | `patch_event` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/events/{event_id}` | PUT | `update_event` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## games

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/games/` | GET | `get_games` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/games/` | POST | `create_game` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/batch/round/{target_round_id}` | POST | `create_games_batch_for_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/batch/scores` | PUT | `update_games_batch_scores` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/batch/team-member-scores` | POST | `batch_team_member_scores` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/batch/team-members` | POST | `create_individual_games_for_team_members` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/batch/unified` | POST | `unified_batch_game_operation` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/batch` | POST | `create_games_batch` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/round/{target_round_id}` | GET | `get_games_by_round` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/games/squad/{target_squad_id}/recalculate-member-handicaps` | POST | `recalculate_squad_member_handicaps` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/squad/{target_squad_id}` | GET | `get_games_by_squad` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/games/tournament/{target_tournament_id}` | GET | `get_tournament_games` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/games/trigger-advancement-pools` | POST | `trigger_advancement_pools` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/trigger-status-update` | POST | `trigger_status_update` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/{game_id}/add-frame-data` | PUT | `add_frame_data` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/{game_id}/frames` | GET | `get_game_with_frames` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/games/{game_id}/reject` | POST | `reject_game` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/{game_id}/verify` | POST | `verify_game` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/{game_id}` | DELETE | `delete_game` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/games/{game_id}` | GET | `get_game` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/games/{game_id}` | PUT | `update_game` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## health

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/liveness` | GET | `liveness_check` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/logs` | GET | `view_logs` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/readiness` | GET | `readiness_check` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |

## home-bases

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/home-bases/` | GET | `get_home_bases` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/home-bases/` | POST | `create_home_base` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/home-bases/{home_base_id}/set-default` | POST | `set_default_home_base` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/home-bases/{home_base_id}` | DELETE | `delete_home_base` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/home-bases/{home_base_id}` | GET | `get_home_base` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/home-bases/{home_base_id}` | PUT | `update_home_base` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## notifications

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/notifications/` | GET | `get_notifications` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/notifications/` | POST | `create_notification` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/notifications/batch` | POST | `create_batch_notifications` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/notifications/user/{user_id}/summary` | GET | `get_user_notifications_summary` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/notifications/{notification_id}/mark-read` | PUT | `mark_notification_as_read` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/notifications/{notification_id}` | DELETE | `delete_notification` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/notifications/{notification_id}` | GET | `get_notification` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/notifications/{notification_id}` | PUT | `update_notification` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## root

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/` | GET | `root` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |

## round-match-series

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/rounds/{round_id}/match-series/batch-create` | POST | `batch_create_match_series` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/match-series/generate-single-elim` | POST | `generate_single_elim` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/match-series/generate-stepladder` | POST | `generate_stepladder` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/match-series/position-round` | POST | `apply_position_round_endpoint` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/match-series/swap` | POST | `swap_match_series_slots` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/match-series/{match_series_id}/resolve-winner` | POST | `resolve_match_series_winner` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/match-series` | GET | `list_match_series` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/match-series` | POST | `create_match_series` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/match-structure/readiness` | GET | `get_match_structure_readiness` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/match-structure/sync` | POST | `sync_match_structure` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## round-relationships

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/round-relationships/` | GET | `get_round_relationships` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/round-relationships/` | POST | `create_round_relationship` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/round-relationships/event/{event_id}/flow` | GET | `get_event_flow` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/round-relationships/event/{event_id}/tournament-flow` | GET | `get_tournament_flow` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/round-relationships/{relationship_id}/preview` | GET | `preview_advancement` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/round-relationships/{relationship_id}` | DELETE | `delete_round_relationship` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/round-relationships/{relationship_id}` | GET | `get_round_relationship` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/round-relationships/{relationship_id}` | PUT | `update_round_relationship` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## rounds

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/rounds/` | GET | `get_rounds` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/` | POST | `create_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/formats/{format_id}` | GET | `get_round_format` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/formats/{format_id}` | PUT | `update_round_format` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/formats` | GET | `get_round_formats` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/formats` | POST | `create_round_format` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/advancement-candidates` | GET | `get_round_advancement_candidates` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/carry-over-totals` | GET | `get_carry_over_totals_for_round` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/complete` | POST | `complete_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/editability-status` | GET | `get_round_editability_status` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/flow-status` | GET | `get_round_flow_status` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/game-count-adjust` | POST | `adjust_round_game_count_endpoint` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/lock-in-teams` | POST | `lock_in_round_teams` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/lock-in` | POST | `lock_in_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/participants` | GET | `get_round_participants` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/process-advancement` | POST | `process_round_advancement` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/real-time-status` | GET | `get_round_real_time_status` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/relationships/incoming` | GET | `get_round_incoming_relationships` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/relationships/outgoing` | GET | `get_round_outgoing_relationships` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/reset-advancement-pool` | POST | `reset_round_advancement_pool` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/scores/csv-template` | GET | `download_round_scores_csv_template` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/scores/csv` | POST | `upload_round_scores_csv` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/statistics` | GET | `get_round_statistics` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/summary` | GET | `get_round_summary` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/unlock` | POST | `unlock_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}/with-event` | GET | `get_round_with_event` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/with-format` | GET | `get_round_with_format` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}/with-games` | GET | `get_round_with_games` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}` | DELETE | `delete_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}` | GET | `get_round` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/rounds/{round_id}` | PATCH | `patch_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/rounds/{round_id}` | PUT | `update_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## side-action-templates

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/users/me/side-action-templates/` | GET | `list_my_side_action_templates` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me/side-action-templates/` | POST | `create_side_action_template` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/me/side-action-templates/from-side-action` | POST | `create_template_from_side_action` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/me/side-action-templates/{template_id}` | DELETE | `delete_side_action_template` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/me/side-action-templates/{template_id}` | PATCH | `update_side_action_template` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## side-actions

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/side-actions/` | GET | `get_side_actions` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/` | POST | `create_side_action` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/copy-bulk` | POST | `bulk_copy_side_actions` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/entries/{entry_id}` | DELETE | `remove_side_action_entry` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/entries/{entry_id}` | PUT | `update_side_action_entry` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/entries` | POST | `add_side_action_entry` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/event/{event_id}/lock-all-entries` | POST | `lock_all_event_side_action_entries` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/event/{event_id}/lock-status` | GET | `get_event_side_action_lock_status` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/reports/alibi-doubles-entry-summary` | POST | `generate_alibi_doubles_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/alibi-doubles` | POST | `generate_alibi_doubles_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/alive-list` | POST | `generate_alive_list_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/brackets` | POST | `generate_brackets_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/eliminator-entry-summary` | POST | `generate_eliminator_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/eliminator` | POST | `generate_eliminator_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/entry-summary` | POST | `generate_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/event-entry-summary` | POST | `generate_event_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/high-game-entry-summary` | POST | `generate_high_game_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/high-game` | POST | `generate_high_game_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/high-set-entry-summary` | POST | `generate_high_set_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/high-set` | POST | `generate_high_set_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/individual-bracket` | POST | `generate_individual_bracket_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/love-doubles-entry-summary` | POST | `generate_love_doubles_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/love-doubles` | POST | `generate_love_doubles_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/mystery-doubles-entry-summary` | POST | `generate_mystery_doubles_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/mystery-doubles` | POST | `generate_mystery_doubles_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/mystery-game-entry-summary` | POST | `generate_mystery_game_entry_summary_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/mystery-game` | POST | `generate_mystery_game_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/payout` | POST | `generate_payout_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/reports/signup-sheet` | POST | `generate_signup_sheet_report` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/roster-signups` | GET | `get_roster_side_action_signups` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/roster-signups` | PUT | `update_roster_side_action_signup` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/signup-board` | GET | `get_side_action_signup_board` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/alibi-doubles/eligible-partners` | GET | `list_alibi_doubles_eligible_partners` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/alibi-doubles/pairs` | GET | `list_alibi_doubles_pairs` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/alibi-doubles/pairs` | POST | `create_alibi_doubles_pair` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/alibi-doubles/standings` | GET | `get_alibi_doubles_standings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/assign-prizes` | POST | `assign_prizes` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/bracket-engine/financials` | GET | `get_bracket_engine_financials` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/bracket-engine/generate` | POST | `generate_bracket_pots` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/bracket-engine/preview` | GET | `preview_bracket_engine` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/bracket-engine/sync-scores` | POST | `sync_bracket_engine_scores` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/cancel` | POST | `cancel_side_action` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/complete` | POST | `complete_side_action` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/eliminator/process-cuts` | POST | `process_eliminator_cuts` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/eliminator/standings` | GET | `get_eliminator_standings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/entrants` | GET | `get_side_action_entrants` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/entries` | GET | `get_side_action_entries` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/high-game/calculate-winners` | POST | `calculate_high_game_winners` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/high-game/results` | POST | `add_high_game_result` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/high-game/standings` | GET | `get_high_game_standings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/high-set/calculate-winners` | POST | `calculate_high_set_winners` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/high-set/standings` | GET | `get_high_set_standings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/lock-entries` | POST | `lock_side_action_entry_list` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/love-doubles/standings` | GET | `get_love_doubles_standings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/mystery-doubles/draw-pairs` | POST | `draw_mystery_doubles_pairs` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/mystery-doubles/standings` | GET | `get_mystery_doubles_standings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/mystery-game/spin` | POST | `spin_mystery_game` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/mystery-game/standings` | GET | `get_mystery_game_standings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/pools/{pool_id}/reset-configuration` | POST | `reset_side_action_pool_configuration` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/pools/{pool_id}/unlock-entries` | POST | `unlock_side_action_pool_entries` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/pools` | GET | `get_side_action_pools` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/prize-distribution` | GET | `get_prize_distribution` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}/process` | POST | `process_side_action` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}/signup` | POST | `signup_for_side_action` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}` | DELETE | `delete_side_action` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/side-actions/{side_action_id}` | GET | `get_side_action` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/side-actions/{side_action_id}` | PUT | `update_side_action` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## squads

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/squads/` | GET | `get_squads` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/` | POST | `create_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/assign-team/{team_id}/{squad_id}` | POST | `assign_team_to_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/assign` | POST | `assign_participant_to_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/batch-assign` | POST | `batch_assign_participants` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/batch-reentry` | POST | `batch_register_reentries` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/batch-remove` | POST | `batch_remove_participants` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/batch-team-operations` | POST | `batch_team_squad_operations` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/event/{target_event_id}` | GET | `get_squads_by_event` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/remove-team/{team_id}/{squad_id}` | DELETE | `remove_team_from_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/round/{round_id}/participants` | GET | `get_round_participants` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/round/{round_id}/scoring-roster` | GET | `get_round_scoring_roster` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/round/{round_id}/teams` | GET | `get_round_teams` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/round/{target_round_id}` | GET | `get_squads_for_round` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/round/{target_round_id}` | POST | `create_squad_for_round` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/search` | GET | `search_squads` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/{squad_id}/event` | GET | `get_squad_with_event` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/{squad_id}/games` | GET | `get_squad_with_games` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/{squad_id}/lock-in` | POST | `lock_in_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/{squad_id}/participants/{participant_id}` | DELETE | `remove_participant_from_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/{squad_id}/participants` | GET | `get_squad_with_participants` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/{squad_id}/reentry` | POST | `register_squad_reentry` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/{squad_id}/summary` | GET | `get_squad_summary` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/{squad_id}/teams` | GET | `get_squad_teams` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/{squad_id}/unlock` | POST | `unlock_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/{squad_id}` | DELETE | `delete_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/{squad_id}` | GET | `get_squad` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/squads/{squad_id}` | PATCH | `patch_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/squads/{squad_id}` | PUT | `update_squad` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## subscriptions

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/subscriptions/` | GET | `get_subscriptions` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/subscriptions/` | POST | `create_subscription` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/subscriptions/toggle` | PUT | `toggle_subscriptions` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/subscriptions/with-entity/` | GET | `get_subscriptions_with_entity_details` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/subscriptions/{subscription_id}` | DELETE | `delete_subscription` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/subscriptions/{subscription_id}` | GET | `get_subscription` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/subscriptions/{subscription_id}` | PUT | `update_subscription` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## system-settings

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/system-settings/by-key/{key}` | GET | `read_setting_by_key` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/system-settings/create-defaults` | POST | `create_default_settings` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/system-settings/health` | GET | `system_health_check` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/system-settings/{setting_id}` | DELETE | `delete_system_setting` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/system-settings/{setting_id}` | GET | `read_setting` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/system-settings/{setting_id}` | PUT | `update_system_setting` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/system-settings` | GET | `read_settings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/system-settings` | POST | `create_new_setting` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## td-access

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/billing/catalog` | GET | `get_billing_catalog` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/billing/center-org-inquiry` | POST | `post_center_org_inquiry` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/billing/checkout-session` | POST | `post_checkout_session` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/billing/credits/refund-unused` | POST | `refund_unused_credit` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/billing/portal-session` | POST | `post_billing_portal_session` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/billing/webhooks/stripe` | POST | `stripe_webhook` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/tournaments/{tournament_id}/access/apply-credit` | POST | `apply_tournament_credit` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/tournaments/{tournament_id}/access/upgrade-from-sa-only` | POST | `upgrade_sa_only_tournament` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/tournaments/{tournament_id}/access` | GET | `get_tournament_access` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |

## td-referrals

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/billing/referral/claim` | POST | `post_referral_claim` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/billing/referral` | GET | `get_my_referral_code` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |

## tournaments

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/tournaments/` | GET | `get_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/` | POST | `create_tournament` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/tournaments/near-home-base/{home_base_id}` | GET | `search_tournaments_near_home_base` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/near-me` | POST | `search_tournaments_by_location` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/tournaments/recommended` | POST | `get_recommended_tournaments` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/tournaments/search/nearby` | GET | `search_nearby_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/search` | GET | `search_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/{tournament_id}/copy` | POST | `copy_tournament_route` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/tournaments/{tournament_id}/reports/lane-conflicts` | GET | `get_tournament_lane_conflicts` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/{tournament_id}/stats` | GET | `get_tournament_stats` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/{tournament_id}/with-center` | GET | `get_tournament_with_center` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/{tournament_id}/with-events` | GET | `get_tournament_with_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/{tournament_id}` | DELETE | `delete_tournament` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/tournaments/{tournament_id}` | GET | `get_tournament` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/tournaments/{tournament_id}` | PUT | `update_tournament` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## untagged

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/openapi.json` | GET | `openapi` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/docs/oauth2-redirect` | GET | `swagger_ui_redirect` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/docs` | GET | `swagger_ui_html` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/health` | GET | `health_check` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/redoc` | GET | `redoc_html` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |

## usbc-claims

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/usbc-claims/claims/{claim_id}/review` | PUT | `review_usbc_claim` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/usbc-claims/claims/{claim_id}` | GET | `get_usbc_claim` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/usbc-claims/claims` | GET | `get_usbc_claims` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/usbc-claims/claims` | POST | `create_usbc_claim` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/usbc-claims/merges` | GET | `get_usbc_merges` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/usbc-claims/merges` | POST | `create_usbc_merge` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |

## users

| Route | Method | Handler | Auth / gate | Class | Admin | TD active | TD lapsed | SA active | SA lapsed | Bowler | Public | Billing hook | Notes |
|-------|--------|---------|-------------|-------|-------|-----------|-----------|-----------|-----------|--------|--------|--------------|-------|
| `/api/v1/users/` | GET | `get_users` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/` | OPTIONS | `create_user_options` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/` | POST | `create_user` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/batch-create-minimal` | POST | `batch_create_minimal_users` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/claim-profile` | POST | `claim_user_profile` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/create-by-admin` | POST | `create_user_by_admin` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/create-by-td` | POST | `create_user_by_td` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/login` | OPTIONS | `login_options` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/login` | POST | `login` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/me/bowled-events` | GET | `get_current_user_bowled_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me/earnings` | GET | `get_current_user_earnings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me/financial-events` | GET | `get_current_user_financial_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me/home-events` | GET | `get_current_user_home_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me/performance` | GET | `get_current_user_performance_metrics` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me/total-earnings` | GET | `get_current_user_total_earnings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me/tournaments` | GET | `get_current_user_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me` | GET | `get_current_user_info` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/me` | PUT | `update_current_user` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/minimal` | POST | `create_minimal_user` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/search-usbc-batch` | POST | `batch_search_usbc_ids` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/search-usbc/{usbc_id}` | GET | `search_usbc_id` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/temporary-usbc` | GET | `list_temporary_usbc_users` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/assign-usbc` | PATCH | `assign_usbc_td` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/{user_id}/bowled-events` | GET | `get_user_bowled_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/created-tournaments` | GET | `get_user_created_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/earnings` | GET | `get_user_earnings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/financial-events` | GET | `get_user_financial_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/games` | GET | `get_user_with_games` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/historical-qualifying-averages` | GET | `get_user_historical_qualifying_averages` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/home-events` | GET | `get_user_home_events` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/notifications` | GET | `get_user_with_notifications` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/performance` | GET | `get_user_performance_metrics` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/subscriptions` | GET | `get_user_with_subscriptions` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/total-earnings` | GET | `get_user_total_earnings` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/tournaments` | GET | `get_user_tournaments` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}/verify` | POST | `verify_user` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/{user_id}` | DELETE | `delete_user` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
| `/api/v1/users/{user_id}` | GET | `get_user` | TBD | R | yes | scoped | scoped | scoped | scoped | scoped | no | — | Read — lapsed TD/SA retain when organizer/delegate |
| `/api/v1/users/{user_id}` | PUT | `update_user` | TBD | W | yes | scoped | no | scoped | no | no | no | assert_account_can_write_director_ops (future) | Write — requires active billing when gating on |
