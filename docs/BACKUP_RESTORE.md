# Backup and restore drill (M0)

## Targets

- RPO ≤ 5 minutes (WAL archiving off-host)
- RTO ≤ 4 hours

## Quarterly drill

1. Take a base backup (or use continuous WAL archive restore point).
2. Restore into a scratch Postgres instance (not staging/production).
3. Run migrations if the backup predates HEAD (prefer restore then migrate forward carefully).
4. Boot API against the scratch DB and hit `/api/health/ready`.
5. Record result, duration, and gaps in the ops log.

A backup that has not been restored is untrusted.
