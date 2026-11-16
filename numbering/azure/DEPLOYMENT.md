# Azure deployment preparation — AM Dossier Assistant

**Status: preparation only. Nothing has been deployed to Azure.**

## Proposed architecture

1. **Microsoft Entra ID** app registration for an internal backend API. Require
   tenant-specific tokens with a dedicated application role/scope; validate
   issuer, audience, expiry, signature and authorization claims. Do not embed
   backend secrets or a shared bearer token in the Outlook add-in.
2. **Azure App Service** (Linux Node.js 22) for the API behind HTTPS. Restrict
   ingress to approved users/clients; add per-user authorization, request
   audit, throttling and monitoring.
3. **Azure Database for PostgreSQL Flexible Server** for atomic dossier
   allocation. Enforce private networking, TLS, backups, minimal privileges.
4. **Azure Key Vault** for database credentials and any service secrets.
   Prefer managed identity for Azure resource access.
5. **Application Insights** for health/error metrics without message bodies
   or customer email contents.

## Preflight information required

- Azure **subscription ID** and tenant ID (not a secret).
- Resource group and Azure region, or approval to create a new group.
- Whether Azure admin can register an Entra application and grant permissions.
- Whether networking policy permits App Service to reach a private PostgreSQL
  Flexible Server.
- A test Microsoft 365 account and test mailbox, not production initially.

## Safe order of operations

1. Confirm Azure subscription, tenant, region and owner of app registration.
2. Provision test resources using company-approved Azure deployment tooling.
3. Apply `numbering/sql/001_create_numbering.sql` in a dedicated database.
4. Reconcile all real existing new-format `AMYYNNNN` identifiers before
   initializing any counter. Diagnostic `AM260158` is not evidence of
   allocated production numbers.
5. Replace development shared-token authentication with Entra-issued
   identity-based access tokens and server-side permission checks.
6. Deploy and smoke-test the API using test identities and test mailboxes.
7. Add Attio mapping and Graph folder/email handling, with reconciliation.
8. Only then plan a reviewed production rollout.

## Security and functionality gates

The current `api-server.js` and `start-server.js` are **development-only**.
They must not be internet-facing. The `explicitUserAction` request property
is not sufficient proof of a user click: authorization and a trusted workflow
must be enforced server-side. An Outlook add-in must never store a database
connection string or service API token. Do not run database migrations
against existing CRM databases. Do not change the production add-in.

## Operational notes

- Year rollover currently uses UTC. Decide whether Europe/Brussels is required.
- Define the idempotency key at the trusted workflow boundary; reuse it on
  network retries and retain the original allocated year across rollover.
- Rate-limit requests, log audit events and set an incident procedure for
  partial folder/Attio creation failures.
- Set database backups, retention and restore tests before go-live.
