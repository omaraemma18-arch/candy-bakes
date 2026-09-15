# Sugarhouse — full-stack cake shop

A cake-selling web app with two halves:

- **Public shop** — a catalog that reads live from MongoDB, product pages with
  size/flavour/icing-message customisation, a basket, and checkout.
- **Admin dashboard** at `/admin` — password-protected. Photograph a cake,
  fill in the details, publish, and it appears on the customer menu
  immediately. Also shows the order queue.

Node + Express + MongoDB on the back, vanilla HTML/CSS/JS on the front (no
build step). Images live in Cloudinary.

---

## Layout

```
server.js               Entry point, middleware order, page routes
config/
  db.js                 Mongo connection + first-run admin seeding
  cloudinary.js         Upload / delete / resize helpers
models/
  User.js               Accounts and roles
  Product.js            Cakes (auto-generates a URL slug)
  Order.js              Orders, with snapshotted item details
middleware/
  auth.js               JWT cookie auth + requireRole() RBAC
  upload.js             Multer memory storage, 8MB cap, image types only
controllers/            Request handling
routes/                 Route definitions
public/                 The whole frontend
  index, menu, product, cart, checkout, confirmation
  admin/                login, dashboard, products, orders
verify.js               Offline test suite (see "Testing")
```

---

## Running it locally

**1. Install**

```bash
npm install
```

**2. Set up your environment**

```bash
cp .env.example .env
```

Then fill in `.env`:

| Variable | Where it comes from |
|---|---|
| `MONGO_URI` | MongoDB Atlas → Connect → Drivers. Replace `<password>`. |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLOUDINARY_*` | cloudinary.com → Dashboard (free tier is fine) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Your first login. Change these. |

**3. Run**

```bash
npm run dev
```

On first run against an empty database it creates the admin account from
your `SEED_ADMIN_*` values and prints the email to the console.

- Shop: `http://localhost:5000`
- Admin: `http://localhost:5000/admin`

---

## Adding a cake

Sign in at `/admin` → **Products** → **Add a cake**.

The photo field accepts a drag-and-drop, a file picker, or — on a phone —
the camera directly (`capture="environment"`, so it opens the rear camera).
Fill in name, description, price, and optionally sizes and flavours, then
**Save and publish**.

What happens: the image streams to Cloudinary (capped at 1600px, auto
quality), Cloudinary returns a URL, that URL is saved on the product in
MongoDB, and the public `/api/products` endpoint starts returning it. The
customer menu shows it on the next page load.

**Sizes** add to the base price. A base of 85,000 with a size modifier of
45,000 sells at 130,000. Modifiers can be negative.

**On the menu** controls whether customers see it. Unticking hides a cake
without deleting it — useful when you're out of an ingredient.

---

## API

### Public

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/products` | Available cakes. Supports `?category=`, `?search=`, `?featured=true` |
| GET | `/api/products/:slug` | One cake |
| POST | `/api/orders` | Place an order |
| GET | `/api/orders/:reference` | Look up an order |

### Authenticated

| Method | Route | Role |
|---|---|---|
| POST | `/api/auth/login` | — |
| POST | `/api/auth/logout` | — |
| GET | `/api/auth/me` | any |
| POST | `/api/auth/change-password` | any |
| GET/POST | `/api/auth/users` | admin |
| GET | `/api/admin/stats` | any staff |
| GET | `/api/admin/products` | any staff |
| POST/PUT/DELETE | `/api/admin/products` | **admin** |
| PATCH | `/api/admin/products/:id/availability` | **admin** |
| GET | `/api/admin/orders` | any staff |
| PATCH | `/api/admin/orders/:id/status` | any staff |

Two roles: `admin` can change the catalog; `staff` can read it and work the
order queue but cannot add, edit or delete products.

---

## Security notes

Worth knowing what's actually in place:

- **Passwords** are bcrypt-hashed at cost 12. The schema marks `passwordHash`
  as `select: false`, so it's never returned unless explicitly asked for.
- **Sessions** use a JWT in an `httpOnly` cookie — JavaScript can't read it,
  so an XSS bug can't lift the session. `secure` is on in production.
- **Every request re-reads the user** from the database rather than trusting
  the token body, so revoking or demoting an account takes effect at once.
- **Order prices are recalculated server-side.** The browser sends product
  IDs and quantities; the server looks up real prices. Tampering with prices
  in devtools does nothing.
- **Login is rate-limited** to 10 attempts per 15 minutes, orders to 20/hour.
- **Uploads** are capped at 8MB, restricted to image MIME types, and held in
  memory rather than written to disk.
- **Helmet** sets a content security policy allowing images only from
  Cloudinary and the site itself.
- Wrong email and wrong password return the same message, so the login form
  can't be used to discover which addresses have accounts.

Before going live: use a long random `JWT_SECRET`, change the seeded admin
password, and restrict your Atlas network access list rather than leaving it
open to `0.0.0.0/0`.

---

## Testing

```bash
node verify.js
```

Runs 27 checks with no database required — schema validation, RBAC
enforcement, JWT signing and tamper rejection, route wiring, and upload
limits. All 27 pass.

This does **not** cover the live round trip (real Mongo writes, a real
Cloudinary upload, a full browser checkout). See the honest limitations note
at the bottom.

---

## Deploying

### Render (simplest)

1. Push to GitHub.
2. Render → **New → Web Service** → connect the repo.
3. Build command `npm install`, start command `npm start`.
4. Add every variable from `.env.example` under **Environment**.
   Set `NODE_ENV=production`.
5. Deploy.

Render's free tier sleeps after inactivity, so the first request after a
quiet spell takes ~30 seconds.

### Railway

Same shape — Railway detects Node automatically. Add the same environment
variables under **Variables**.

### Vercel

Needs restructuring: Vercel runs serverless functions, not a long-lived
Express process. Move the app into `api/index.js` and export the Express app
instead of calling `app.listen()`. Render or Railway is less work.

### MongoDB Atlas

Create a free M0 cluster, add a database user, and under **Network Access**
allow your host's IPs. Atlas docs list Render's and Railway's egress ranges;
`0.0.0.0/0` works but leaves the database open to the internet, protected
only by the password.

---

## What this doesn't do yet

Being straight about the gaps:

- **No card payments.** Checkout records a preference (mobile money or pay on
  collection) and you confirm by phone. That reflects how most custom
  bakeries work, since prices often shift after a design conversation. For
  real payments, add a Stripe Checkout session — don't handle card numbers
  yourself.
- **No email or SMS notifications.** New orders appear in the admin Orders
  tab and are logged to the server console. Wiring up Resend or Africa's
  Talking is a small addition to `orderController.createOrder`.
- **No customer accounts.** Orders are looked up by reference, not tied to a
  login.
- **No stock counts or date blocking.** Lead times are enforced per product,
  but there's no cap on how many cakes can be booked for one day.
