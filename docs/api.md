# API reference

Every route requires `Authorization: Bearer <access token>` (`401` otherwise) except `GET /health` and `/auth/*`. The acting user is always the token's subject; it is never read from a payload or query string. Contracts live in `packages/shared-types`.

## Auth (public)

### `POST /auth/login`

- Body: `{ email, password }` → `{ profile }`.
- `401` for any bad credential, with the same message for unknown email, wrong password and no password set.

### `POST /auth/register`

- Body: `{ email, password, fullName, city, industry, graduationYear, diplomaNumber?, headline?, bio?, skills? }` → `201 { accessToken, profile }`.
- Password is strong: ≥ 8 characters with an uppercase letter, a lowercase letter, a number and a special character.
- Creates a `PENDING_VERIFICATION` profile (`ACTIVE` when the API runs with `AUTH_AUTO_VERIFY=true`) with an embedding.
- `409` if the email exists. `400` on validation errors (a weak password lists each failed criterion, e.g. `password: One number (0-9)`). `502` (nothing saved) if embedding fails.
- `diplomaNumber` is stored but never returned.

### `GET /auth/dev/profiles` and `POST /auth/dev/login`

- Dev login only: `404` in production unless `AUTH_DEV_LOGIN=true`.
- The first returns the quick-login list, the second takes `{ profileId }` → `{ profile }`.

## Profiles

### `GET /profiles`

Alumni directory. Filters: `city`, `cohort`, `industry`. `REJECTED` profiles are hidden.

### `GET /profiles/me`

The authenticated user's full profile (never the private `diplomaNumber` or the password hash).

### `PATCH /profiles/me`

- Edits any of `fullName`, `headline`, `bio`, `city`, `industry`, `skills` (list of strings).
- Immutable fields (`id`, `email`, `role`, `status`, `diplomaNumber`, `graduationYear`, `cohort`) are rejected with `400`, as is an empty patch.
- When a searchable field actually changes, the embedding is regenerated (OpenAI; a brief bio is padded with descriptive fallback text) and saved with the attributes in one transaction.
- An embedding failure answers `502` and saves nothing.
- Returns the updated `Profile`.

## Matchmaking

### `POST /matchmaking`

- Body: `{ query, targetCity?, travelContext?: { city, dates? } }` → top 3 `MatchResult` for the authenticated user.
- Verified alumni only: `403` while the requester is not `ACTIVE`.
- `query` may be empty only with `travelContext`.

### `POST /matchmaker/feedback`

- Body: `{ candidateId, query, rating: 'POSITIVE' | 'NEGATIVE', reason?, comment? }` → `201 { id, candidateId, rating, createdAt }`.
- `reason` is `GREAT_MATCH` (positive only), `DIFFERENT_INDUSTRY` / `SKILL_MISMATCH` (negative only) or `OTHER`. `comment` ≤ 500 chars.
- The reviewer is the authenticated user (a `userId` in the payload is a `400`).
- `400` for invalid input or self-review, `404` for an unknown candidate, `403` while the reviewer is not `ACTIVE`.

## Intros

### `POST /intros`

- Body: `{ targetId, query, icebreaker }` → intro request from the authenticated user (`PENDING`).
- `400` for self-requests, `409` for a duplicate pending request, `403` while the requester is not `ACTIVE`.

### `GET /intros`

The authenticated user's sent and received intros: `PaginatedIntros` per direction (`receivedPage`, `sentPage`, `limit`) plus `pendingIncoming`.

### `PATCH /intros/:id/status`

- Body: `{ status }`.
- Only the intro's target (the authenticated user) may accept or decline: `403` otherwise, `409` if already answered.

## Admin (admins only, `403` for members)

### `GET /admin/verifications`

- Pending applicants (`status = PENDING_VERIFICATION`), oldest first: `{ data: [{ id, fullName, email, graduationYear, diplomaNumber, createdAt }] }`.
- `diplomaNumber` is only exposed here.

### `PATCH /admin/verifications/:id`

- Body: `{ decision: 'APPROVE' | 'REJECT' }` → `{ id, status }`.
- `APPROVE` sets `ACTIVE`, `REJECT` sets `REJECTED`.
- `404` for an unknown id, `409` if the application was already reviewed, `400` for an invalid decision.

### `GET /admin/feedback`

- Returns `{ summary: { total, positive, negative, satisfactionRate }, data: [{ id, query, rating, reason, comment, createdAt, user, candidate }] }`, where `user` and `candidate` are `{ id, fullName, email }`.
- `data` is newest first (latest 200).
- `summary` covers every review. `satisfactionRate` is the rounded percentage of positive reviews (`0` without reviews).
