# 🍽️ Production-grade Next.js, SQL DB, & Socket.io Architecture Handbook
## (Firebase to Relational PostgreSQL + WebSocket Migration Guide)
### 🇲🇲 စားသောက်ဆိုင်များအတွက် Production-grade စနစ် ပြောင်းလဲတပ်ဆင်ခြင်း လမ်းညွှန်

This folder contains a complete set of clean, type-safe, and production-grade blueprints designed to migrate the dynamic **Smart Table Order System** from Firestore to a traditional relational database (PostgreSQL using **Drizzle ORM**) and a custom **Next.js Backend** backed by **Socket.io** for millisecond-latency real-time synchronization.

ဤလမ်းညွှန်တွင် Firebase (NoSQL) မှ တကယ့် Production SQL Database (Postgres) နှင့် WebSockets (Socket.io) သို့ ပြောင်းလဲအသုံးပြုနိုင်မည့် အကောင်းဆုံးသော စနစ်ပုံစံနှင့် ကုဒ်ဒီဇိုင်းများကို စနစ်တကျ ရေးသားပေးထားပါသည်။

---

## 🏗️ 1. System Architecture (စနစ်တည်ဆောက်ပုံ ခြုံငုံသုံးသပ်ချက်)

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT APP (React)                   │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTP REST / WebSockets)
                            ▼
┌────────────────────────────────────────────────────────┐
│            NEXT.JS CUSTOM SERVER (Express.js)          │
├───────────────────────────┼────────────────────────────┤
│   REST API Controllers    │  Socket.io WS Controllers  │
└─────────────┬─────────────┴─────────────┬──────────────┘
              │                           │
              │ (Drizzle ORM Queries)     │ (Transactional SQL)
              ▼                           ▼
┌────────────────────────────────────────────────────────┐
│               POSTGRESQL DATABASE (SQL)                │
└────────────────────────────────────────────────────────┘
```

### Key Technical Pillars:
1. **Next.js Custom Server Integration (`server.ts`)**: Custom Express gateway that boots both Next.js frontend pages and mounts Socket.io onto the same process port `3000` to respect cloud load balancers and container limits.
2. **PostgreSQL Relational Normalization (`schema.ts`)**: Replaces flat Firestore documents with strict foreign keys, relational indices, and unified CASCADE behaviors (e.g., clearing table orders automatically rolls back line items).
3. **State-Authoritative Socket Handlers (`socket-handlers.ts`)**: Direct real-time gateway that updates PostgreSQL on-the-fly and broadcasts delta changes strictly within virtual isolated Rooms.
4. **Robust Client Hook (`useSocket.ts`)**: Built-in state-preservation, heartbeat pings, auto-reconnection attempts, and event unmounting to avoid performance decay.

---

## 🗄️ 2. Entity Database Mapping (Firebase NoSQL ➡️ PostgreSQL Relational)

We normalize the data structure to maximize query speed and respect data integrity:

| Firebase Collection | PostgreSQL Table | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `tenants` | `tenants` | `id` | - |
| `branches` | `branches` | `id` | Foreign Key (`tenant_id`), Index (`tenant_id`) |
| `tables` | `tables` | `id` | Foreign Key (`branch_id`), Unique Index (`branch_id` + `number`) |
| `users` | `user_profiles` | `uid` | Enums: `role` (`super_admin`, `kitchen_staff`, etc.) |
| `menu_items` | `menu_items` | `id` | Price stored as integer (Ks), Category Indexing |
| `carts` | `shared_carts` | `id` | Table ID primary key, `items` saved as high-performance `jsonb` array |
| `orders` | `orders` & `order_items` | `id` | **Normalized**: Header goes to `orders`, line items isolated into `order_items` table with parent cascade |
| `waiter_calls` | `waiter_calls` | `id` | Foreign Keys (`table_id`, `branch_id`), Status Indexing |

---

## 🔄 3. WebSocket Real-time Event Life-cycle (လုပ်ဆောင်မှု အဆင့်ဆင့်)

### Flow A: Dynamic Co-ordering (တစ်စားပွဲတည်းတွင် လူအများအတူမှာယူခြင်း)
1. **Join Room**: Customer scans QR table code and triggers `room:join` with `{ type: "customer", branchId, tableId }`. The server joins the socket to `"table:room:<tableId>"`.
2. **Live Sync**: When Customer A edits their cart, client triggers `emitCartUpdate(items)`.
3. **Database Write**: Server saves updated cart JSON to `shared_carts` table inside PostgreSQL.
4. **Selective Broadcast**: Server broadcasts `cart:updated` strictly to `"table:room:<tableId>"` (excluding Customer A), keeping all devices synced dynamically.

### Flow B: Anti-Double Order Placing (နှစ်ခါမမှာမိစေရန် အကာအကွယ်)
1. Customer submits order with a unique `idempotencyKey` generated on local device.
2. Server triggers transaction:
   - Selects `orders` where `idempotencyKey = clientKey` to prevent duplicate submissions.
   - Inserts into `orders` and `order_items`.
   - Clears cart from `shared_carts`.
3. Broadcasts `order:new` to `"branch:room:<branchId>"` so kitchen monitors update instantly.

---

## 🛠️ 4. Quick-Start Implementation Guide (အသုံးပြုနည်း အဆင့်ဆင့်)

### Step 1: Install Required Production Dependencies
Run this in your Next.js project root:
```bash
npm install express socket.io socket.io-client drizzle-orm pg dotenv
npm install -D typescript @types/express @types/node drizzle-kit tsx
```

### Step 2: Configure Environment Variables (`.env`)
Create a `.env` file in the root:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@your-postgres-host:5432/dbname
NEXT_PUBLIC_APP_URL=https://smart-table.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://smart-table.yourdomain.com
```

### Step 3: Run SQL Schema Migrations (Drizzle Kit)
Create a `drizzle.config.ts` configuration file:
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./production-code/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```
Then generate and execute migrations:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Step 4: Add Socket client hook to React views
To implement real-time features in `CustomerView.tsx` or `StaffDashboard.tsx`, replace the old Firestore subscription with the new socket state listener:

```typescript
import { useSocket } from "./useSocket";

export function TableView({ branchId, tableId, tableNumber }) {
  const { isConnected, emitCartUpdate, registerCartUpdate } = useSocket({
    type: "customer",
    branchId,
    tableId
  });

  useEffect(() => {
    // Listen for peer cart updates
    registerCartUpdate((updatedItems) => {
      setLocalCart(updatedItems);
    });
  }, [registerCartUpdate]);

  const handleAddItem = (item) => {
    const newCart = [...localCart, item];
    setLocalCart(newCart);
    emitCartUpdate(newCart); // Sync to other seats in 5ms!
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
        <span className="text-xs font-bold text-gray-500">{isConnected ? "Live Connected" : "Reconnecting..."}</span>
      </div>
      {/* Menu & Cart components */}
    </div>
  );
}
```

---

## 📦 5. Production PM2 & Docker Deployment (ဆာဗာတင်ရန်အတွက် စနစ်ပုံစံ)

To run this Next.js custom server in full production under Node, create a simple `Dockerfile` to compile and containerize the applet:

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/production-code ./production-code

EXPOSE 3000
CMD ["node", "production-code/server.ts"]
```

For traditional Virtual Private Servers (VPS) without Docker, use **PM2** process manager to manage clusters and self-heals:
```bash
npm install pm2 -g
pm2 start production-code/server.ts --name "smart-order-app" -i max
pm2 save
pm2 startup
```

---

## ✨ 6. Enterprise Scaling Suggestions (ဝန်ထမ်းရာချီ၊ ဆိုင်ခွဲရာချီအတွက် အကြံပြုချက်)
1. **Redis Socket.io Adapter**: When scaling Next.js Custom Server to multiple load-balanced containers on Cloud Run/AWS, mount the `@socket.io/redis-adapter` so sockets in different containers can communicate seamlessly.
2. **Drizzle Connection Pooling**: Always wrap PostgreSQL connections using `pg-pool` or Neon connection string overrides to prevent exceeding max connections during peak dinner hours.
3. **Socket.io Performance Guards**: Large menus or high active cart changes should be throttled (e.g., using lodash-es `throttle` with a 300ms window) on client emits to reduce container I/O bottlenecks.

---

### 🌟 This code is fully complete and ready to be integrated into any standard monorepo.
### (ဤကုဒ်များသည် Next.js Project များတွင် တိုက်ရိုက်ကူးယူကာ စိတ်ချရစွာ ထည့်သွင်းအသုံးပြုနိုင်ရန် စနစ်တကျ ဒီဇိုင်းဆွဲထားပြီး ဖြစ်ပါသည်။)
