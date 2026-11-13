# Central AM dossier numbering — isolated prototype

This directory is a **test-only implementation** on branch
`feature/central-dossier-numbering`. It is NOT connected to the live Outlook
add-in, Microsoft Graph, Attio, or a database. Existing production files are
unchanged.

## Agreed rules

- Existing Attio `aanvraagnummer` values like `AM2608-020` stay unchanged.
- Only an explicit user action to create a new dossier requests a number.
- New number format: `AMYYNNNN` (e.g. `AM260159`).
- Organization-wide annual counter, resetting on the agreed year boundary.
- Preserve assigned number across replies and later years.
- Store a mapping from the new dossier number to the relevant Attio deal.
- New dossier creation will create the Outlook folder tree in the shared mailbox.
- Mail from personal and shared mailboxes will be centrally filed, with
  personal Sent Items retained; incoming mail will also be filed.
- Attio email-follow-up status is separate from the commercial deal stage.

## Critical deployment prerequisites

1. Choose a central transactional persistence backend (e.g. Azure SQL with
   a serializable transaction and unique constraints). Implement the store's
   `allocate({year,requestId,maxSequence})` contract atomically.
2. Confirm the initial 2026 sequence: `AM260158` was a diagnostic/test
   value, **not evidence that 158 real dossiers were allocated**. Do not
   initialize the counter to 158 or 0 without reconciling existing real
   Outlook dossier identifiers.
3. Confirm the year boundary timezone (Belgium/Europe-Brussels vs UTC).
   The prototype uses UTC only to make tests deterministic.
4. Create a separate Attio field `AM Dossiernummer` and email follow-up
   fields through an authorized Attio schema administration workflow.
   Do not overwrite the existing `aanvraagnummer` field.
5. Confirm Microsoft Graph application permissions, mailbox scope,
   delegated access and sent-items behavior for shared mailboxes.
6. Implement Graph event handling with idempotency and reconciliation:
   webhook notifications can be repeated, delayed, or missed.
7. Test end-to-end with a separate test mailbox before any production rollout.

## Run tests

`node --test numbering/tests/dossier-numbering.test.cjs`

The in-memory fake store in the tests is not safe for concurrent production use.
