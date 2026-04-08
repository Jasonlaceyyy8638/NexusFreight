/**
 * First N profiles get the 45-day founding trial (Stripe-first checkout).
 * Must stay in sync with `set_profile_trial_on_insert` in Supabase migrations.
 */
export const FOUNDING_MEMBER_CAP = 4;
