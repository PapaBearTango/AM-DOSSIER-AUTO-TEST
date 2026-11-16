#!/bin/sh
# Read-only Azure preflight. No resources are created or changed.
set -eu
if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI (az) is required. Install it, then run: az login" >&2
  exit 1
fi
echo "=== Signed-in Azure context (read-only) ==="
az account show --query "{subscriptionName:name,subscriptionId:id,tenantId:tenantId,state:state}" -o json
echo ""
echo "=== Belgium Central region availability for subscription ==="
az account list-locations --query "[?name=='belgiumcentral'].{name:name,displayName:displayName}" -o json
echo ""
echo "=== Existing resource groups in Belgium Central (read-only) ==="
az group list --query "[?location=='belgiumcentral'].{name:name,location:location}" -o json
echo ""
echo "=== Resource provider registration status (read-only) ==="
for provider in Microsoft.Web Microsoft.DBforPostgreSQL Microsoft.KeyVault Microsoft.Insights Microsoft.Network; do
  az provider show --namespace "$provider" --query "{namespace:namespace,registrationState:registrationState}" -o json
done
echo ""
echo "No resources were created or changed."
echo "Contributor does not by itself grant Entra app-registration or Azure RBAC role-assignment permissions."
