# Web routes and data model

## Web routes

The web app uses the Next.js App Router with real URLs (history, deep links, per-page titles) and server rendering.

| Route             | Access      | Page                                                                        |
| ----------------- | ----------- | --------------------------------------------------------------------------- |
| `/`               | Public      | Marketing landing page for guests. Signed-in users go to `/matchmaker`.     |
| `/login`          | Signed out  | Email + password form (and dev quick login when enabled).                   |
| `/register`       | Signed out  | Sign-up form with the live password checklist.                              |
| `/matchmaker`     | Signed in   | AI Matchmaker (the app home).                                               |
| `/directory`      | Signed in   | Alumni Directory.                                                           |
| `/intros`         | Signed in   | My Intros (Sent / Received).                                                |
| `/admin`          | Admins only | Verification panel. Members get "Access denied"; the API enforces the role. |
| `/admin/feedback` | Admins only | Feedback Analytics: summary metrics and a table of every match review.      |

- **Route groups:** `app/(marketing)` (public landing page: Server Components, only the canvas hero visual `network-background.tsx` is client; copy in `constants/landing.ts`), `app/(auth)` (centered auth layout) and `app/(app)` (persistent header + providers).
- **Server session:** the `(app)` layout reads the NextAuth session on the server, redirects to `/login` without one, and loads the directory with the signed access token so the first paint needs no client round trip (`lib/api-server.ts`; on failure the browser fetches it instead).
- **`middleware.ts`:** guests may open `/`, `/login` and `/register`. Any other page redirects them to `/login?callbackUrl=<requested page>`. Signed-in users are moved off those three into the app (`/matchmaker`, or the validated `callbackUrl`). The callback is validated and same-origin. Rules live in `utils/routes.ts`.
- **Auth pages:** `/login` and `/register` link back to the landing page through a "Back to home" link and the clickable brand logo (`auth-heading.tsx`).
- **Header:** brand on the left, section links in the centre, and a single circular avatar menu (`user-menu.tsx`) on the right holding the account actions.
- **Admin area:** `/admin` and `/admin/feedback` are separate pages joined by a link bar (`aria-label="Admin sections"`). Both render inside `AdminGate`, which shows "Access denied" to members before anything is fetched.
- **Navigation:** header sections are `<Link>`s (`aria-current="page"` on the active one). Providers live in the layout, so the intros and verification badges survive navigation.

## Data model

```
Profile 1 ──< IntroRequest >── 1 Profile
 (requester: SentIntros)         (target: ReceivedIntros)

Profile { ..., cohort, graduationYear, status: ProfileStatus(ACTIVE | PENDING_VERIFICATION | REJECTED, default PENDING_VERIFICATION),
          role: Role(MEMBER | ADMIN, default MEMBER),
          diplomaNumber? (private), passwordHash?, embedding }

IntroRequest { id, requesterId, targetId, query, icebreaker,
               status: IntroStatus(PENDING | ACCEPTED | DECLINED),
               createdAt, updatedAt }
indexes: (requesterId), (targetId, status)

Profile 1 ──< MatchFeedback >── 1 Profile
 (reviewer: GivenFeedback)       (candidate: ReceivedFeedback)

MatchFeedback { id, userId, candidateId, query,
                rating: FeedbackRating(POSITIVE | NEGATIVE),
                reason?: FeedbackReason(GREAT_MATCH | DIFFERENT_INDUSTRY | SKILL_MISMATCH | OTHER),
                comment?, createdAt }
indexes: (createdAt), (userId), (candidateId)
```

`Profile` also carries a pgvector `embedding` column (`vector(1536)`) used for retrieval, and an optional `passwordHash` (scrypt). Neither is ever returned by the API.
