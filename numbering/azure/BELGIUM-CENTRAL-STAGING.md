# AM Dossier Assistant — Belgium Central staging preflight

## Confirmed by project owner

- Azure subscription display name: **Verhoestraete-MSSentinel-sub** (user-provided). **EXCLUDED: dedicated exclusively to Microsoft Sentinel; do not deploy AM Dossier Assistant resources here.**\n- Azure subscription is available.
- User has **Contributor** access.
- Preferred region: **Belgium Central** (`belgiumcentral`).

## What Contributor permits and does not permit

Contributor generally allows resource creation and management within its
assigned scope, but **does not** grant permission to assign Azure RBAC roles.
It also does not automatically grant Microsoft Entra app-registration rights
or tenant-wide admin consent. Those must be verified with the tenant admin.

## Run read-only checks

From an authenticated workstation with Azure CLI:

```sh
az login
az account set --subscription "<your subscription ID>"
sh numbering/azure/preflight.sh
```

The script only reads Azure context, region availability, resource groups and
resource-provider registration state. Do not paste credentials, access tokens
or database passwords into GitHub or ChatGPT.

## Subscription scope warning\n\n**Confirmed by the user:** `Verhoestraete-MSSentinel-sub` is exclusively for Microsoft Sentinel. **Never deploy** the AM Dossier Assistant API, PostgreSQL, App Service, networking, Key Vault, or monitoring resources to this subscription. A separate approved application subscription is required before provisioning.\n\n## Decisions before provisioning

1. Identify a DIFFERENT approved application subscription, then confirm its subscription ID and tenant ID, or supply only the subscription
   **display name** if IDs should remain internal.
2. Confirm a staging resource-group name, e.g. `rg-am-dossier-test-bec`.
3. Confirm `belgiumcentral` supports required App Service and PostgreSQL
   Flexible Server SKUs for this subscription. Region presence alone is
   not proof of SKU availability or quota.
4. Confirm network architecture for private database access and outbound
   App Service VNet integration.
5. Ask Entra admin to approve app registration, API permissions, identity
   model, and least-privilege access. Contributor alone is insufficient.
6. Confirm budget and alerting, backup retention and monitoring.
7. Reconcile actual existing dossier numbers before initializing counters.

## Explicit non-actions

No Azure resources, resource groups, Entra registrations, secrets, or
database rows have been created. No production add-in or Attio data changed.

## Deployment gate

Do not expose the development API publicly. Implement Entra JWT validation,
authorization, audit logs, and trusted user-action workflow first. The
development bearer token and client-supplied `explicitUserAction` flag
are not production security controls.
