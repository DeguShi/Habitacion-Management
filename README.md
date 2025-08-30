# Habitación Familiar — Reservation Manager

A minimalist, single‑purpose app to register **one‑night** reservations for a family guest room — built to be fast, clear, and safe for non‑technical users.

- **Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS  
- **Auth:** NextAuth (Google) — each Google account sees **only its own** data  
- **Storage:** Cloudflare R2 (S3‑compatible, generous free tier) — one JSON file per reservation  
- **Calendar:** Per‑reservation `.ics` download (Google / Apple / Outlook)  
- **Deploy:** Vercel (Hobby)

> UI branding: **“Habitación Familiar de Lisiani y Airton.”**

---

## ✨ Features

- **One‑step reservation:** guest name, party size, **check‑in (always 1 night)**, optional breakfast, contacts, notes.
- **Automatic pricing** *or* **manual lodging total** (when applying discounts):
  - **Automatic:**  
    `total = nights * (nightlyPerPerson * partySize) + (breakfast? nights * partySize * breakfastPerPersonPerNight : 0)`
  - **Manual lodging total:** operator provides the *final lodging total*; breakfast (if any) is **still** added per person.
- **Deposit (50%)** with **paid / pending** status.
- **Calendar with occupancy colors** (max 3 rooms):
  - 1 reservation → pastel yellow; 2 → mellow orange; 3 → dark red (full).
- **Day view** with all reservations and actions (👁 view, ⚙ edit, ✖ delete with confirmation).
- **Upcoming list** from today onward (scroll if long).
- **View / Edit never overlap**: switching prompts to save or discard unsaved changes.
- **.ics event** per reservation (all‑day from check‑in to check‑out).

---

## 🧭 Project Structure

```
.
├─ app/
│  ├─ (ui)/ClientShell.tsx            # client page (calendar + day list + upcoming + modals)
│  ├─ api/
│  │  └─ reservations/
│  │     ├─ route.ts                  # GET / POST (list / create)
│  │     ├─ [id]/route.ts             # PUT / DELETE (update / remove)
│  │     └─ [id]/ics/route.ts         # GET (.ics download)
│  ├─ components/
│  │  ├─ CalendarBoard.tsx            # calendar (colors, selection, navigation)
│  │  ├─ AddReservationModal.tsx      # modal for creating new reservations
│  │  ├─ ReservationEditor.tsx        # modal editor (auto vs manual pricing)
│  │  ├─ ViewReservation.tsx          # read‑only details
│  │  └─ Navbar.tsx
│  ├─ sign-in/page.tsx                # Google Sign‑in + onboarding screen
│  ├─ globals.css                     # Tailwind layers + small tokens
│  ├─ layout.tsx                      # global providers + navbar
│  └─ page.tsx                        # server auth gate + ClientShell
├─ core/
│  ├─ entities.ts                     # domain types (Reservation)
│  └─ usecases.ts                     # create/update/list/delete + pricing orchestration
├─ lib/
│  ├─ auth.config.ts                  # NextAuth options (Google provider, callbacks)
│  ├─ auth.client.tsx                 # <SessionProvider/> for client
│  ├─ pricing.ts                      # pure pricing helpers
│  ├─ schema.ts                       # zod schemas / validation
│  ├─ s3.ts                           # S3/R2 gateway (get/put/list JSON)
│  └─ user.ts                         # user helpers
├─ utils/
│  └─ ics.ts                          # .ics generator
├─ public/
│  └─ logo-hab.png
├─ next.config.js
├─ tailwind.config.ts
├─ postcss.config.js
└─ README.md
```

### Data Model (per JSON file)

```ts
type Reservation = {
  id: string;
  userId: string;                 // ownership (segregates data by Google account)
  guestName: string;
  partySize: number;
  checkIn: string;                // YYYY-MM-DD
  checkOut: string;               // YYYY-MM-DD (always +1 day)
  breakfastIncluded: boolean;
  nightlyRate: number;            // per-person / per-night
  breakfastPerPersonPerNight: number;
  manualLodgingEnabled?: boolean;
  manualLodgingTotal?: number;    // if enabled, replaces lodging formula
  totalNights: number;            // 1 in v1
  totalPrice: number;
  depositDue: number;             // 50% of total
  depositPaid: boolean;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## 🧮 Pricing Rules

**Automatic**
```text
lodging = nights * (nightlyPerPerson * partySize)
breakfast = breakfastIncluded ? nights * partySize * breakfastPerPersonPerNight : 0
total = lodging + breakfast
deposit = 0.5 * total
```

**Manual lodging enabled**
```text
lodging = manualLodgingTotal
breakfast = breakfastIncluded ? nights * partySize * breakfastPerPersonPerNight : 0
total = lodging + breakfast
deposit = 0.5 * total
```

- `nights = checkOut - checkIn` (days). In this app: **check‑out = check‑in + 1 day**.
- UI currency: **BRL (pt‑BR)**.

---

## 🔐 Authentication & Security

- **Google Sign‑In (NextAuth)**. Data is stored per‑user (`userId` prefix).  
- **ADMIN_KEY** — a passphrase required for **write** operations (sent as `x-admin-key`).  
  The client stores it in `localStorage` after first entry.
- Bucket is private; there is no public listing.

> For a single household, using the same Google account across devices is fine.

---

## ☁️ Storage (Cloudflare R2 recommended)

Cloudflare R2 is S3‑compatible and has a generous free tier with zero egress fees.

**Environment variables (both local & production):**
```env
STORAGE_PROVIDER=R2
BUCKET_NAME=<your-r2-bucket>
CF_R2_ACCOUNT_ID=<account-id>
CF_R2_ACCESS_KEY_ID=<r2-access-key-id>
CF_R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
```

If you ever switch to **AWS S3**, set:
```env
STORAGE_PROVIDER=S3
BUCKET_NAME=<your-s3-bucket>
AWS_REGION=<region>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
```

---

## ⚙️ Environment Variables

### Local (`.env.local`)

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<dev-secret-32+chars>

GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>

# Storage (R2 recommended)
STORAGE_PROVIDER=R2
BUCKET_NAME=<bucket>
CF_R2_ACCOUNT_ID=<id>
CF_R2_ACCESS_KEY_ID=<key>
CF_R2_SECRET_ACCESS_KEY=<secret>

# App
ADMIN_KEY=<your passphrase>
```

### Production (Vercel → Project → Settings → Environment Variables)

```env
NEXTAUTH_URL=https://<your-project>.vercel.app
NEXTAUTH_SECRET=<openssl rand -base64 32>

GOOGLE_CLIENT_ID=<...>
GOOGLE_CLIENT_SECRET=<...>

STORAGE_PROVIDER=R2
BUCKET_NAME=<...>
CF_R2_ACCOUNT_ID=<...>
CF_R2_ACCESS_KEY_ID=<...>
CF_R2_SECRET_ACCESS_KEY=<...>

ADMIN_KEY=<...>
```

### `next.config.js` (avatars from Google)
```js
module.exports = {
  images: {
    domains: ['lh3.googleusercontent.com','lh4.googleusercontent.com','lh5.googleusercontent.com'],
  },
};
```

---

## 🔑 Google OAuth Setup

In **Google Cloud Console → APIs & Services → Credentials**:

- **Authorized JavaScript origins**
  - `http://localhost:3000`
  - `https://<your-project>.vercel.app`

- **Authorized redirect URIs**
  - `http://localhost:3000/api/auth/callback/google`
  - `https://<your-project>.vercel.app/api/auth/callback/google`

---

## 🧪 Run Locally

```bash
# install
npm i

# dev server
npm run dev
# http://localhost:3000

# build & start (prod mode)
npm run build
npm start
```

---

## 🚀 Deploy (Vercel)

1. Import the GitHub repository in Vercel.  
2. Framework preset: **Next.js**.  
3. Add **Environment Variables** (Production) as above.  
4. Deploy.  
5. Add your Vercel domain to Google OAuth (origins + redirect URI).

---

## 🔌 API Endpoints

- `GET /api/reservations?month=YYYY-MM` — list reservations for a month.
- `POST /api/reservations` — create (requires `x-admin-key`).  
- `PUT /api/reservations/:id` — update (requires `x-admin-key`).  
- `DELETE /api/reservations/:id` — delete (requires `x-admin-key`).  
- `GET /api/reservations/:id/ics` — download `.ics` for that reservation.

All responses are JSON unless noted.

---

## 🔁 Git Workflow

- `main` — production‑ready.  
- `develop` — integration branch.  
- `feat/<name>` & `fix/<name>` for features/bugs → PR to `develop` → squash merge → release to `main`.

---

## 🧯 Troubleshooting

- **“Invalid Compact JWE”** → set `NEXTAUTH_SECRET`.  
- **Avatar blocked** → add `lh3.googleusercontent.com` (and friends) to `next.config.js`.  
- **401 on write** → missing or wrong `x-admin-key`.  
- **403 / 404 with storage** → wrong bucket name or insufficient R2 token permissions.  
- **Google OAuth error** → missing production origins/redirects.

---

## 📅 Roadmap

- Multi‑night reservations (date ranges).  
- CSV export & monthly totals.  
- Calendar feed for month (`/calendar.ics`).  
- Share data between Google accounts.  
- PWA (offline / installable).

---

## 📝 License

GNU — see `LICENSE`.
