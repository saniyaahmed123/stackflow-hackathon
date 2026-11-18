# StockFlow — Inventory & Warehouse Management (MERN)

Role-based inventory system with stock in/out, atomic order processing, ImageKit uploads, and low-stock alerts.

## Stack
MongoDB/Mongoose · Express · React (Vite) · Node · JWT + bcrypt · ImageKit

## Setup

1. Install dependencies (npm workspaces):

   ```bash
   npm install
   ```

2. Create `backend/.env` from `backend/.env.example` and fill in:

   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/stockflow
   JWT_SECRET=<long random string>
   JWT_EXPIRES=7d
   IMAGEKIT_PUBLIC_KEY=<public key>
   IMAGEKIT_PRIVATE_KEY=<private key>
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your-id>
   CLIENT_URL=http://localhost:5173
   ```

   Create `frontend/.env` from `frontend/.env.example` (only `VITE_API_URL`). Never commit either `.env` file.

3. Seed sample data (users, warehouses, products, stock, transactions, orders, requests):

   ```bash
   npm run seed
   ```

4. Run both apps:

   ```bash
   npm run dev
   ```

   API: `http://localhost:5000/api` · Frontend: `http://localhost:5173`

   Build/serve production frontend with `npm run build`; the backend serves `frontend/dist` automatically.

## Test credentials

| Role | Email | Password |
| --- | --- | --- |
| admin | admin@stockflow.pk | admin123 |
| warehouseManager (Main Warehouse) | manager@stockflow.pk | manager123 |
| warehouseManager (Lahore Branch) | manager2@stockflow.pk | manager2123 |
| supplier | supplier@stockflow.pk | supplier123 |
| supplier | supplier2@stockflow.pk | supplier2123 |
| salesRepresentative | sales@stockflow.pk | sales123 |

Public registration can create supplier, warehouseManager, or salesRepresentative accounts — **never admin**. Only an admin can create/promote admins.

## Roles & permissions

- **admin** — full stats, user CRUD + role assignment, product/warehouse CRUD, all transactions, all orders, low stock, supply-request review.
- **warehouseManager** — assigned warehouses only, inventory, stock in/out, transaction history, low stock, product image uploads, order status updates for assigned warehouses.
- **supplier** — own profile + logo, own products, supply requests and their history.
- **salesRepresentative** — product search with available stock, multi-product order creation, own orders only, cancel only while Pending.

All protected APIs verify JWT and enforce roles server-side; frontend guards are only a convenience.

## Key endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/api/auth/me` | authenticated |
| GET / PUT / DELETE | `/api/users`, `/api/users/:id` | admin (GET `/:id` also self) |
| GET / POST / PUT / DELETE | `/api/products` | GET all; POST/PUT admin+manager; DELETE admin |
| GET / POST / PUT / DELETE | `/api/warehouses` | GET all; writes admin |
| POST | `/api/stock/in`, `/api/stock/out` | admin+manager |
| GET | `/api/stock`, `/api/stock/low` | authenticated / admin+manager |
| GET | `/api/transactions` | admin+manager |
| POST / GET | `/api/orders` | salesRep+admin / scoped |
| PUT | `/api/orders/:id/status`, `/api/orders/:id/cancel` | admin+manager / admin+salesRep(own) |
| GET | `/api/upload/auth` | authenticated |
| POST | `/api/supply-requests` | supplier |
| PUT | `/api/supply-requests/:id/status` | admin |

`GET /api/upload/auth` returns ImageKit signature params; the React `ImageUpload` component validates file type/size via `POST /api/upload/validate`, uploads directly to ImageKit, then saves the returned URL + fileId through the product/user API. Old files are deleted by fileId on replace/delete. Private key never leaves the server.

## Business logic notes

- One `Stock` document per product+warehouse (`unique` compound index). Stock in uses an atomic `$inc` upsert; stock out uses a conditional `$inc` with `quantity >= requested`, so stock can never go negative.
- Every stock in/out (and approved supply request) writes a `StockTransaction`.
- Orders are created as **Pending** after validating stock for every line. Moving Pending → Processing deducts stock once and writes stock-out transactions; repeated processing and changes to Completed/Cancelled orders are rejected. Suppliers' approved requests add stock atomically.
- Multi-document updates use MongoDB transactions when the server is a replica set/Atlas; on a standalone mongod the code uses conditional atomic updates plus compensating rollbacks.
- Low stock = `Stock.quantity < Product.lowStockLimit`.

## Deploy to Vercel (frontend + API together)

The repo includes `vercel.json`: Vite builds `frontend/dist`, and `/api/*` rewrites to the Node serverless function in `api/index.js` (which reuses the Express app). MongoDB Atlas is required — a local `mongod` is not reachable from Vercel.

1. Push the repo to GitHub, then **Import Project** in Vercel. No framework preset is needed; `vercel.json` supplies the build command and output directory. In Atlas **Network Access**, allow `0.0.0.0/0` (or Vercel's egress IPs), otherwise serverless calls cannot reach MongoDB.
2. Add these Environment Variables in the Vercel project (Production and Preview):
   - `MONGO_URI` — your Atlas connection string (with a database name, e.g. `.../stockflow`)
   - `JWT_SECRET` — a long random secret
   - `JWT_EXPIRES` — e.g. `7d`
   - `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`
   - `CLIENT_URL` — `https://<your-project>.vercel.app` (preview `*.vercel.app` origins are also allowed)
   - `VITE_API_URL` — `/api` (the frontend calls the same Vercel origin)
3. Deploy. The API is available at `https://<your-project>.vercel.app/api/health`.
4. Seed the deployed Atlas database once from your machine with the same `MONGO_URI` (`npm run seed`), then log in with the seeded credentials. **Seeding clears all users in that database.**

The frontend uses a relative `/api` base URL by default, so no separate backend URL is needed. For a traditional host instead, run `npm run build`, serve `frontend/dist` statically, and run `npm start --workspace backend` with the same env vars.

## Postman / demo flow

1. Login as admin, create a manager and assign a warehouse, create a product (upload an image).
2. Login as that manager, stock in 20, stock out 3 → quantity 17 and two transactions.
3. Login as sales rep, order 2 units → total = 2 × price, status Pending. Admin/manager sets Processing → quantity 15.
4. Try to order more than available → rejected. Try another manager's warehouse or another user's order → 403.
