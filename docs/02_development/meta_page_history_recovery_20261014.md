# Meta Page historical recovery — October 14, 2026

Prepared, not deployed. The owner approved Facebook reconnection and October 4–13 recovery for four studios. OAuth reconnection completed through existing SASHA settings, retaining the mapped assets. The ten-day Ads recovery loaded 87 records, all 40 studio/date combinations, $394.33 spend, and no duplicate studio/date/ad keys. The normal Page workflow refreshed October 12–13 for all four studios (24 records across the existing three period dimensions).

The remaining Page history cannot be requested through the deployed collector: it ignores date options. This patch validates an optional paired `since`/`until` date range (valid calendar dates, ordered, at most 90 days) and forwards it to the Page Insights API. Requests without dates keep their current behavior. Credential resolution, source timestamps, metrics, warehouse loading, and schedules are unchanged.

Validation: three focused offline tests pass for default behavior, historical parameters/source-date retention, and invalid ranges rejected before source access. Syntax check also passes. Live historical collection is pending deployment approval.

Rollout: deploy only this change to the current Railway collector branch `codex/auth-onboarding` (base PR84 / 65cbc976). Use an unpublished manual copy of the existing Page workflow with accountId 1, since October 3, until October 14, then retain only October 4–13 source insight dates for the four existing mapped Pages. Validate per-studio/date coverage, source metric errors, daily metric values, and duplicate studio/Page/metric/period/date keys. Finally run the unchanged published import and verify its latest data.

Rollback: redeploy the previous collector commit. No schema migration or schedule change is needed; preserve successfully recovered historical facts.
