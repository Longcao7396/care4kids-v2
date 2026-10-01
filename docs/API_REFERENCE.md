# API Reference — GiveAID v2.0

Base URL: `http://localhost:5231/api/v1`
OpenAPI spec: `http://localhost:5231/scalar/v1` (Development only)
Auth: `Authorization: Bearer <jwt>` (except where noted)
Content-Type: `application/json; charset=utf-8`

## Envelope Contract

Every response uses the same envelope:

**Success**
```json
{ "success": true, "message": "OK", "data": <payload> }
```

**Failure**
```json
{ "success": false, "message": "Validation failed", "errors": { "field": ["msg"] } }
```

`errors` is only present when validation fails. Status codes follow REST conventions
(200/201/204 for success, 400/401/403/404/409/422/500 for errors).

---

## 1. Authentication (`/api/v1/auth`)

### `POST /auth/register`
Create a new user account (default role: `User`).
```json
// Request
{ "email": "newuser@example.com", "password": "P@ssword1", "fullName": "Jane Doe" }
// 201 Created
{ "success": true, "data": { "userId": 12, "email": "newuser@example.com" } }
```

### `POST /auth/login`
Authenticate, returns JWT. Users sign in with **username only** (email is no
longer accepted as a login identifier).

```json
// Request
{ "username": "admin", "password": "Admin@123" }

// 200 OK
{ "success": true, "data": { "token": "eyJhbGciOi...", "userId": 1, "email": "...", "username": "admin", "role": "Admin", "expiresAt": "2026-09-20T03:40:56Z" } }
```

Username lookup is case-insensitive.

### `POST /auth/refresh`
Exchange a valid (but expiring) token for a new one.
Auth required.

### `GET /auth/me`
Returns the current user profile.
Auth required.

### `POST /auth/logout`
Invalidates the token server-side (logged in `EmailLogs`).
Auth required.

---

## 2. Users (`/api/v1/users`)

| Method | Path                | Auth | Description              |
|--------|---------------------|------|--------------------------|
| GET    | `/users/me`         | ✅    | Current user profile     |
| PUT    | `/users/me`         | ✅    | Update own profile       |
| POST   | `/users/me/avatar`  | ✅    | Upload avatar (multipart)|

Admin-only (`Admin` policy):

| Method | Path                        | Description                  |
|--------|-----------------------------|------------------------------|
| GET    | `/admin/users`              | List all users (paged)       |
| GET    | `/admin/users/{id}`         | Get user by id               |
| POST   | `/admin/users`              | Create user (any role)       |
| PUT    | `/admin/users/{id}`         | Update user                  |
| DELETE | `/admin/users/{id}`         | Soft-delete user             |
| POST   | `/admin/users/{id}/lock`    | Lock account                 |
| POST   | `/admin/users/{id}/unlock`  | Unlock account               |

---

## 3. Causes (`/api/v1/causes`)

| Method | Path                    | Auth       | Description                |
|--------|-------------------------|------------|----------------------------|
| GET    | `/causes`               | Public     | List all causes (paged)    |
| GET    | `/causes/tree`          | Public     | Hierarchical tree          |
| GET    | `/causes/{id}`          | Public     | Cause by id                |
| POST   | `/causes`               | Admin      | Create cause               |
| PUT    | `/causes/{id}`          | Admin      | Update cause               |
| DELETE | `/causes/{id}`          | Admin      | Soft-delete cause          |
| GET    | `/causes/stats`         | Admin      | Aggregate statistics       |

---

## 4. Campaigns (`/api/v1/campaigns`)

| Method | Path                                  | Auth       | Description                |
|--------|---------------------------------------|------------|----------------------------|
| GET    | `/campaigns`                          | Public     | List campaigns (paged, filter by cause/status) |
| GET    | `/campaigns/featured`                 | Public     | Featured campaigns         |
| GET    | `/campaigns/{id}`                     | Public     | Campaign detail            |
| POST   | `/campaigns`                          | Admin      | Create campaign            |
| PUT    | `/campaigns/{id}`                     | Admin      | Update campaign            |
| DELETE | `/campaigns/{id}`                     | Admin      | Soft-delete campaign       |
| POST   | `/campaigns/{id}/register`            | ✅          | Register (non-donation)    |
| GET    | `/campaigns/{id}/registrations`       | Admin      | List registrations         |
| GET    | `/campaigns/my-registrations`         | ✅          | User's own registrations   |

### `Campaign` shape

```json
{
  "campaignId": 1,
  "name": "Build a School in Vietnam",
  "causeId": 2,
  "goal": 50000,
  "raised": 12300,
  "description": "...",
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-12-31T00:00:00Z",
  "status": "Active",
  "featured": true,
  "registrationRequired": false,
  "imageUrl": "https://..."
}
```

---

## 5. Campaign Reports (`/api/v1/campaign-reports`)

| Method | Path                                  | Auth       | Description                |
|--------|---------------------------------------|------------|----------------------------|
| GET    | `/campaign-reports`                   | Public     | List all reports           |
| GET    | `/campaign-reports/campaign/{id}`     | Public     | Reports for a campaign     |
| GET    | `/campaign-reports/{id}`              | Public     | Single report              |
| GET    | `/campaign-reports/stats`             | Public     | Aggregate stats            |
| POST   | `/campaign-reports`                   | Admin      | Create report              |
| PUT    | `/campaign-reports/{id}`              | Admin      | Update report              |
| DELETE | `/campaign-reports/{id}`              | Admin      | Delete report              |

---

## 6. Donations (`/api/v1/donations`)

| Method | Path                       | Auth       | Description                  |
|--------|----------------------------|------------|------------------------------|
| GET    | `/donations`               | Admin      | List donations (paged)       |
| GET    | `/donations/me`            | ✅          | My donations                 |
| GET    | `/donations/{id}`          | ✅ (own)   | Donation detail              |
| POST   | `/donations`               | ✅          | Create donation (creates Stripe PaymentIntent if card) |
| GET    | `/donations/stats`         | Admin      | Aggregate stats              |

### `POST /donations`
```json
// Request
{ "campaignId": 1, "amount": 100, "currency": "USD", "paymentMethod": "CreditCard", "anonymous": false }
// 201 Created
{ "success": true, "data": { "donationId": 99, "transactionId": "TXN-...", "status": "Pending", "clientSecret": "pi_..." } }
```

---

## 7. Gallery (`/api/v1/gallery`)

| Method | Path                          | Auth       | Description           |
|--------|-------------------------------|------------|-----------------------|
| GET    | `/gallery`                    | Public     | List gallery items    |
| GET    | `/gallery/categories`         | Public     | Distinct categories   |
| GET    | `/gallery/programmes`         | Public     | Grouped by programme  |
| GET    | `/gallery/{id}`               | Public     | Single item           |
| POST   | `/gallery`                    | Admin      | Upload image (multipart) |
| PUT    | `/gallery/{id}`               | Admin      | Update metadata       |
| DELETE | `/gallery/{id}`               | Admin      | Delete image          |

---

## 8. About-Us — Team / Achievements / Organizations / Careers

### Team (`/api/v1/team`)

| Method | Path                  | Auth   |
|--------|-----------------------|--------|
| GET    | `/team`               | Public |
| GET    | `/team/{id}`          | Public |
| POST   | `/team`               | Admin  |
| PUT    | `/team/{id}`          | Admin  |
| DELETE | `/team/{id}`          | Admin  |

### Achievements (`/api/v1/achievements`)

| Method | Path                          | Auth   |
|--------|-------------------------------|--------|
| GET    | `/achievements`               | Public |
| GET    | `/achievements/stats`         | Public |
| GET    | `/achievements/{id}`          | Public |
| POST   | `/achievements`               | Admin  |
| PUT    | `/achievements/{id}`          | Admin  |
| DELETE | `/achievements/{id}`          | Admin  |

### Organizations (`/api/v1/supporters`)

| Method | Path                          | Auth   |
|--------|-------------------------------|--------|
| GET    | `/supporters`                 | Public |
| GET    | `/supporters/stats`           | Public |
| GET    | `/supporters/{id}`            | Public |
| POST   | `/supporters`                 | Admin  |
| PUT    | `/supporters/{id}`            | Admin  |
| DELETE | `/supporters/{id}`            | Admin  |

### Careers (`/api/v1/careers`)

| Method | Path                                       | Auth       |
|--------|--------------------------------------------|------------|
| GET    | `/careers`                                 | Public     |
| GET    | `/careers/{id}`                            | Public     |
| POST   | `/careers`                                 | Admin      |
| PUT    | `/careers/{id}`                            | Admin      |
| DELETE | `/careers/{id}`                            | Admin      |
| POST   | `/careers/{id}/apply`                      | ✅          |
| GET    | `/careers/{id}/applications`               | Admin      |

---

## 9. Help Centre — FAQs (`/api/v1/faqs`)

| Method | Path                          | Auth   |
|--------|-------------------------------|--------|
| GET    | `/faqs`                       | Public |
| GET    | `/faqs/categories`            | Public |
| GET    | `/faqs/{id}`                  | Public |
| POST   | `/faqs`                       | Admin  |
| PUT    | `/faqs/{id}`                  | Admin  |
| DELETE | `/faqs/{id}`                  | Admin  |

---

## 10. Contact (`/api/v1/contacts`)

| Method | Path                       | Auth   |
|--------|----------------------------|--------|
| POST   | `/contacts`                | Public |
| GET    | `/contacts`                | Admin  |
| GET    | `/contacts/{id}`           | Admin  |
| POST   | `/contacts/{id}/reply`     | Admin  |
| POST   | `/contacts/{id}/read`      | Admin  |
| DELETE | `/contacts/{id}`           | Admin  |
| GET    | `/contacts/stats`          | Admin  |

---

## 11. Invitations (`/api/v1/invitations`)

| Method | Path                                | Auth   |
|--------|-------------------------------------|--------|
| POST   | `/invitations`                      | ✅      |
| GET    | `/invitations/mine`                 | ✅      |
| GET    | `/invitations`                      | Admin  |
| GET    | `/invitations/stats`                | Admin  |
| POST   | `/invitations/{id}/cancel`          | ✅      |
| POST   | `/invitations/accept/{token}`       | Public |

---

## 12. Conversations (`/api/v1/conversations`)

User-to-admin threaded messaging.

| Method | Path                                 | Auth       |
|--------|--------------------------------------|------------|
| POST   | `/conversations`                     | ✅          |
| GET    | `/conversations/mine`                | ✅          |
| GET    | `/conversations`                     | Admin      |
| GET    | `/conversations/stats`               | Admin      |
| GET    | `/conversations/{id}`                | ✅ (participant) |
| GET    | `/conversations/{id}/messages`       | ✅ (participant) |
| POST   | `/conversations/{id}/close`          | ✅/Admin    |
| POST   | `/conversations/{id}/assign`         | Admin      |

---

## 13. CMS (`/api/v1/cms/pages`)

| Method | Path                          | Auth   |
|--------|-------------------------------|--------|
| GET    | `/cms/pages`                  | Public |
| GET    | `/cms/pages/{key}`            | Public |
| PUT    | `/cms/pages/{id}`             | Admin  |

Keys are stable identifiers like `about`, `terms`, `privacy`.

---

## 14. Statistics (`/api/v1/statistics`)

| Method | Path                                       | Auth   |
|--------|--------------------------------------------|--------|
| GET    | `/statistics/dashboard`                    | Admin  |
| GET    | `/statistics/campaigns/performance`        | Admin  |
| GET    | `/statistics/donations/monthly`            | Admin  |
| GET    | `/statistics/top-donors`                   | Admin  |

---

## 15. Admin Tools

### `AdminDashboard` (`/api/v1/admin/dashboard`)
Single endpoint returning counts + recent activity.

### `AdminPayments` (`/api/v1/admin/payments`)
Stripe reconciliation, refunds.

### `AdminEmailLogs` (`/api/v1/admin/emails`)
| Method | Path                                | Auth       |
|--------|-------------------------------------|------------|
| GET    | `/admin/emails`                     | Admin      |
| GET    | `/admin/emails/stats`               | Admin      |
| POST   | `/admin/emails/retry-all`           | Admin      |
| POST   | `/admin/emails/{id}/resend`         | Admin      |

---

## 16. Health

| Method | Path        | Auth | Description                          |
|--------|-------------|------|--------------------------------------|
| GET    | `/healthz`  | No   | Liveness (no body, 200 OK)           |
| GET    | `/api/v1/health` | No | Versioned liveness + version string |

---

## 17. Rate Limiting

- **Default**: 100 requests / 60 seconds / IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **429**: returned with `Retry-After` header

## 18. Error Codes

| Code | Meaning                                                  |
|------|----------------------------------------------------------|
| 400  | Bad request (malformed JSON, missing fields)             |
| 401  | Unauthenticated (missing/expired JWT)                    |
| 403  | Forbidden (role/scope mismatch)                          |
| 404  | Resource not found                                       |
| 409  | Conflict (duplicate email, already-registered, etc.)     |
| 422  | Validation failed (envelope carries `errors`)            |
| 429  | Rate limited                                             |
| 500  | Unexpected server error                                  |

## 19. Versioning

Currently `/api/v1/`. Breaking changes will introduce `/api/v2/`; old version will be
maintained for at least one minor release.
