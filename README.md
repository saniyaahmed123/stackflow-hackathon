# Parcel Point — Inventory & Warehouse Management (MERN)

Role-based inventory system with stock in/out, atomic order processing, ImageKit uploads, role dashboards, and low-stock alerts.

## Stack

MongoDB/Mongoose · Express · React (Vite) · Node · JWT + bcrypt · ImageKit

## Setup

1. Install dependencies (npm workspaces):

   ```bash
   npm install
   ```

2. Create `backend/.env` from `backend/.env.example` and fill in these variables:

   | Variable | Purpose |
   | --- | --- |
   | `PORT` | API port (default `5000`) |
   | `MONGO_URI` | MongoDB connection string with a database name |
   | `JWT_SECRET` | Signing secret; required in **every** environment |
   | `JWT_EXPIRES` | Token lifetime (default `7d`) |
   | `IMAGEKIT_PUBLIC_KEY` | ImageKit public key |
   | `IMAGEKIT_PRIVATE_KEY` | ImageKit private key, server-only |
   | `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint |
   | `CLIENT_URL` | Allowed browser origin (default `http://127.0.0.1:5173`; `localhost:5173` is also allowed) |

   The server refuses to start if `JWT_SECRET` is missing or blank. Never commit `.env` files.

3. Create `frontend/.env` from `frontend/.env.example` if you want to change the API base URL:

   | Variable | Purpose |
   | --- | --- |
   | `VITE_API_URL` | `/api` by default; set an absolute URL only for a separate API host |

   With no `frontend/.env`, the frontend calls `/api`. Vite binds `127.0.0.1:5173` and proxies `/api` to `http://127.0.0.1:5000`, so `GET http://127.0.0.1:5173/api/health` returns JSON. If `VITE_API_URL` is an absolute URL, the browser calls that URL directly and the Vite proxy is bypassed.

4. Seed sample data (users, warehouses, products, stock, transactions, orders, requests):

   ```bash
   npm run seed
   ```

   Seeding clears all users, products, warehouses, stock, transactions, orders, and supply requests in the configured database. Seeded images are synthetic URLs under `IMAGEKIT_URL_ENDPOINT` with matching `fileId` values, so editing seeded products/users does not fail image validation.

5. Run both apps. Either use one command:

   ```bash
   npm run dev
   ```

   Or use two terminals:

   ```bash
   # Terminal 1 — API
   npm run dev --workspace backend

   # Terminal 2 — Frontend (Vite proxy)
   npm run dev --workspace frontend
   ```

   API: `http://127.0.0.1:5000/api` · Frontend: `http://127.0.0.1:5173`

   Build/serve the production frontend with `npm run build`; the backend serves `frontend/dist` automatically.

## Demo accounts

Seeded passwords are demo-only:

| Role | Email | Password |
| --- | --- | --- |
| admin | admin@parcelpoint.pk | admin123 |
| warehouseManager (Main Warehouse) | manager@parcelpoint.pk | manager123 |
| warehouseManager (Lahore Branch) | manager2@parcelpoint.pk | manager2123 |
| supplier | supplier@parcelpoint.pk | supplier123 |
| supplier | supplier2@parcelpoint.pk | supplier2123 |
| salesRepresentative | sales@parcelpoint.pk | sales123 |

Public registration can create supplier, warehouseManager, or salesRepresentative accounts — **never admin**. Only an admin can create/promote admins.

## Roles & permissions

- **admin** — full stats, user CRUD + role assignment, product/warehouse CRUD, all transactions, all orders, low stock, supply-request review.
- **warehouseManager** — assigned warehouses only, inventory, stock in/out, transaction history, low stock, product image uploads, order status updates for assigned warehouses.
- **supplier** — own profile + logo, own products, supply requests and their history.
- **salesRepresentative** — product search with available stock, multi-product order creation, own orders only, cancel only while Pending.

All protected APIs verify JWT and enforce roles server-side; frontend guards are only a convenience. Each dashboard endpoint is role-scoped and returns `403` for other roles.

## API endpoints

All responses use `{ success: true, data, message? }` on success and `{ success: false, message }` on failure. List endpoints return an array in `data` with pagination in `X-Total-Count`, `X-Page`, and `X-Limit` headers.

### Health

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/health` | public |

### Auth

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | authenticated |

### Users

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/users` | admin |
| GET | `/api/users/suppliers` | authenticated |
| GET | `/api/users/suppliers/summary` | admin |
| GET | `/api/users/:id` | authenticated, own user or admin |
| PUT | `/api/users/me` | authenticated, own user |
| PUT | `/api/users/:id` | admin |
| DELETE | `/api/users/:id` | admin |

### Dashboards

| Method | Endpoint | Access | Returns |
| --- | --- | --- | --- |
| GET | `/api/dashboard/admin` | admin | User/product/warehouse/supplier/order totals, orders by status, low/out counts, today's transactions, recent activity |
| GET | `/api/dashboard/manager` | warehouseManager | Assigned warehouses with capacity usage, assigned low/out stock, recent stock movements |
| GET | `/api/dashboard/supplier` | supplier | Own products with stock, own request counts by Pending/Approved/Rejected, recent requests |
| GET | `/api/dashboard/sales` | salesRepresentative | Own order counts by status, own total sales value, recent own orders |

### Products

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/products` | authenticated |
| GET | `/api/products/:id` | authenticated |
| GET | `/api/products/:id/availability` | admin, salesRepresentative, warehouseManager |
| POST | `/api/products` | admin, warehouseManager |
| PUT | `/api/products/:id` | admin, warehouseManager |
| DELETE | `/api/products/:id` | admin |

### Warehouses

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/warehouses` | authenticated |
| GET | `/api/warehouses/:id` | authenticated |
| POST | `/api/warehouses` | admin |
| PUT | `/api/warehouses/:id` | admin |
| DELETE | `/api/warehouses/:id` | admin |

### Uploads

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/upload/status` | authenticated |
| GET | `/api/upload/auth` | authenticated |
| POST | `/api/upload/validate` | authenticated |
| POST | `/api/upload/verify` | authenticated |
| DELETE | `/api/upload/:fileId` | authenticated |

`GET /api/upload/auth` returns ImageKit signature params; the React `ImageUpload` component validates file type/size via `POST /api/upload/validate`, uploads directly to ImageKit, then saves the returned URL + fileId through the product/user API. Old files are deleted by fileId on replace/delete. The private key never leaves the server.

### Stock

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/stock` | authenticated |
| GET | `/api/stock/low` | admin, warehouseManager |
| POST | `/api/stock/in` | admin, warehouseManager |
| POST | `/api/stock/out` | admin, warehouseManager |

### Transactions

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/transactions` | admin, warehouseManager |

### Orders

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/orders/summary` | admin |
| POST | `/api/orders/precheck` | admin, salesRepresentative |
| POST | `/api/orders` | admin, salesRepresentative |
| GET | `/api/orders` | authenticated, scoped by role |
| GET | `/api/orders/:id` | authenticated, scoped by role |
| PUT | `/api/orders/:id/status` | admin, warehouseManager |
| PUT | `/api/orders/:id/cancel` | admin, salesRepresentative (own order) |

`GET /api/orders/summary` always returns an object with numeric zero defaults on an empty database, plus `ordersByStatus`.

### Supply requests

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/supply-requests` | supplier |
| GET | `/api/supply-requests` | authenticated, scoped by role |
| GET | `/api/supply-requests/:id` | authenticated, scoped by role |
| PUT | `/api/supply-requests/:id/status` | admin |

## Business logic notes

- `JWT_SECRET` is mandatory in development, test, and production; there is no fallback secret.
- Login/register rate limits count failed attempts only. Lockout messages include the remaining wait time. Switching demo roles is not blocked.
- An admin cannot deactivate or delete the last active admin, or deactivate themselves.
- One `Stock` document per product+warehouse (`unique` compound index). Stock in uses an atomic `$inc` upsert; stock out uses a conditional `$inc` with `quantity >= requested`, so stock can never go negative.
- Every stock in/out (and approved supply request) writes a `StockTransaction`.
- Orders are created as **Pending** after validating stock for every line. Moving Pending → Processing deducts stock once and writes stock-out transactions; repeated processing and changes to Completed/Cancelled orders are rejected. Suppliers' approved requests add stock atomically.
- Multi-document updates use MongoDB transactions when the server is a replica set/Atlas; on a standalone mongod the code uses conditional atomic updates plus compensating rollbacks.
- Low stock = `Stock.quantity < Product.lowStockLimit`; out of stock = `Stock.quantity === 0`.
- Product/user images must be ImageKit URLs with a matching `fileId`; data URLs are rejected on update.
- Dashboard data is scoped: managers see assigned warehouses only, suppliers see own products/requests only, sales reps see own orders only, and admin sees the full picture.

## Deploy to Vercel (frontend + API together)

The repo includes `vercel.json`: Vite builds `frontend/dist`, and `/api/*` rewrites to the Node serverless function in `api/index.js` (which reuses the Express app). MongoDB Atlas is required — a local `mongod` is not reachable from Vercel.

1. Push the repo to GitHub, then **Import Project** in Vercel. No framework preset is needed; `vercel.json` supplies the build command and output directory. In Atlas **Network Access**, allow `0.0.0.0/0` (or Vercel's egress IPs), otherwise serverless calls cannot reach MongoDB.
2. Add these Environment Variables in the Vercel project (Production and Preview): `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `CLIENT_URL`, and `VITE_API_URL=/api`.
3. Deploy. The API is available at `https://<your-project>.vercel.app/api/health`.
4. Seed the deployed Atlas database once from your machine with the same `MONGO_URI` (`npm run seed`), then log in with the seeded credentials. **Seeding clears all users in that database.**

## Postman / demo flow

1. Login as admin, create a manager and assign a warehouse, create a product (upload an image).
2. Login as that manager, stock in 20, stock out 3 → quantity 17 and two transactions.
3. Login as sales rep, order 2 units → total = 2 × price, status Pending. Admin/manager sets Processing → quantity 15.
4. Try to order more than available → rejected. Try another manager's warehouse or another user's order → `403`.
5. Call each dashboard endpoint as its allowed role, then call it with a different role to confirm `403`.
