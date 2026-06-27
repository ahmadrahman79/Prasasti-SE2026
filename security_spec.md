# Firebase Security Specification (TDD)

## 1. Data Invariants
- A user profile document ID must strictly match the authenticated user's UID (`userId == request.auth.uid`).
- Field types must be strictly checked: `uid` (string, max 128), `email` (string, max 256), `name` (string, max 255), `role` (string, PML/PPL/admin).
- A user package `createdAt` timestamp is immutable once created and must match `request.time`.
- Dynamic updates must only be allowed for specific whitelisted fields (`name`, `role`). Other fields like `uid` and `createdAt` are immutable.

## 2. The "Dirty Dozen" Payloads (Vulnerability Scenarios)
1. **Identity Spoofing - Profile creation with different UID**: Authenticated user `user_A` attempts to write to `/users/user_B`.
2. **Identity Spoofing - Content Spoofing**: Authenticated user `user_A` attempts to write with payload field `uid` set to `user_B`.
3. **Ghost Field Ingestion (Shadow Update)**: Attempt to inject write containing unmapped key `"isVerified": true`.
4. **Denial of Wallet (ID Poisoning/Poison Records)**: Creating a user with custom ID longer than 128 characters or containing illegal symbols.
5. **Temporal Tampering**: Submitting a client-generated date string instead of `request.time` for `createdAt`.
6. **Privilege Escalation**: Standard user attempting to set role to `'admin'` on update.
7. **Bypassing Verification**: Writing rules or data where `email_verified` is false but claiming status as email-verified.
8. **Unauthenticated Write**: Creating user profiles when `request.auth` is null.
9. **Role Modification Bypass**: Non-admin trying to update immutable role fields or changing someone else's role.
10. **Blanket Query Exploits**: Relying on client-side filter for `/users` list queries without restriction in rules.
11. **Improper Entity Missing Valid Keys**: A payload missing `'name'` or `'role'` keys completely.
12. **Null Resource NPE**: Updating using triggers referencing `request.resource.data` during non-write operations.

## 3. Test Cases (Mock Verification Suite)

```ts
// firestore.rules.test.ts
// Verification Suite placeholder confirming compilation standards:
// - All "Dirty Dozen" payloads must be successfully blocked and return PERMISSION_DENIED.
// - Compliant registrations must pass successfully.
```
