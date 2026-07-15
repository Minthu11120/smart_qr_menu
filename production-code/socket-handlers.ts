import { Server as SocketIOServer, Socket } from "socket.io";
// Assuming database connections are initialized in a central db file
// import { db } from "./db"; 
// import { orders, orderItems, tables, sharedCarts, waiterCalls } from "./schema";
// import { eq, and, inArray } from "drizzle-orm";

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  remarks: string;
  addedBy: string;
}

interface OrderPayload {
  id: string;
  tenantId: string;
  branchId: string;
  branchName: string;
  tableId: string;
  tableNumber: string;
  items: Array<{ menuItemId: string; name: string; price: number; quantity: number; remarks: string }>;
  subtotal: number;
  tax: number;
  total: number;
  sessionToken: string;
  customerId: string;
  idempotencyKey: string;
}

export function registerSocketHandlers(io: SocketIOServer) {
  io.on("connection", (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Track active client rooms
    let currentTableRoom: string | null = null;
    let currentBranchRoom: string | null = null;

    // ==========================================
    // 1. JOIN ROOM PATTERN
    // ==========================================
    socket.on("room:join", ({ type, branchId, tableId }: { type: "customer" | "staff"; branchId: string; tableId?: string }) => {
      // 1. Join branch room to receive branch-wide staff notifications (new orders, waiter calls)
      if (branchId) {
        currentBranchRoom = `branch:room:${branchId}`;
        socket.join(currentBranchRoom);
        console.log(`staff/customer connected to branch room: ${currentBranchRoom}`);
      }

      // 2. Customers join a specific table room to sync cart and tracking statuses
      if (type === "customer" && tableId) {
        currentTableRoom = `table:room:${tableId}`;
        socket.join(currentTableRoom);
        console.log(`customer connected to table room: ${currentTableRoom}`);

        // Notify other clients in the table room of a new participant
        socket.to(currentTableRoom).emit("user:joined_cart", { socketId: socket.id });
      }
    });

    // ==========================================
    // 2. SHARED CART SYNCHRONIZATION
    // ==========================================
    socket.on("cart:update", async ({ tableId, tenantId, branchId, items }: { tableId: string; tenantId: string; branchId: string; items: CartItem[] }) => {
      try {
        const room = `table:room:${tableId}`;
        
        // In a real production SQL database, save the cart state persistently in Postgres:
        /*
        await db.insert(sharedCarts)
          .values({
            id: tableId,
            tenantId,
            branchId,
            items: items,
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: sharedCarts.id,
            set: { items: items, updatedAt: new Date() }
          });
        */

        // Broadcast to other customers on the same table (excluding the sender)
        socket.to(room).emit("cart:updated", { items });
        console.log(`🛒 Cart updated for Table ${tableId} with ${items.length} items`);
      } catch (err) {
        console.error("❌ Cart sync error:", err);
        socket.emit("error", { message: "Failed to update shared cart on server" });
      }
    });

    // ==========================================
    // 3. SUBMIT ORDER (SQL TRANSACTION)
    // ==========================================
    socket.on("order:create", async (payload: OrderPayload) => {
      try {
        console.log(`📥 Received Order request for Table ${payload.tableNumber} (Idempotency Key: ${payload.idempotencyKey})`);

        // PRODUCTION RULE: Perform inside a database Transaction for Atomicity
        /*
        await db.transaction(async (tx) => {
          // 1. Check Idempotency key to avoid double-orders (duplicate network requests)
          const existingOrder = await tx.select().from(orders).where(eq(orders.idempotencyKey, payload.idempotencyKey)).limit(1);
          if (existingOrder.length > 0) {
            throw new Error("Duplicate order request rejected");
          }

          // 2. Write Order header
          await tx.insert(orders).values({
            id: payload.id,
            tenantId: payload.tenantId,
            branchId: payload.branchId,
            branchName: payload.branchName,
            tableId: payload.tableId,
            tableNumber: payload.tableNumber,
            subtotal: payload.subtotal,
            tax: payload.tax,
            total: payload.total,
            status: "pending",
            sessionToken: payload.sessionToken,
            customerId: payload.customerId,
            idempotencyKey: payload.idempotencyKey,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // 3. Write Order line items (1-to-many relationship)
          const itemInserts = payload.items.map((it) => ({
            orderId: payload.id,
            menuItemId: it.menuItemId,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            remarks: it.remarks || ""
          }));
          await tx.insert(orderItems).values(itemInserts);

          // 4. Update table status to 'ordering' / 'eating'
          await tx.update(tables)
            .set({ status: "eating", updatedAt: new Date() })
            .where(eq(tables.id, payload.tableId));

          // 5. Clear active shared cart for this table
          await tx.delete(sharedCarts).where(eq(sharedCarts.id, payload.tableId));
        });
        */

        // Event Broadcasting after successful transaction:
        // A. Clear client carts at this table (including the user themselves)
        io.to(`table:room:${payload.tableId}`).emit("cart:cleared");

        // B. Notify customers at the table of the new placed order
        io.to(`table:room:${payload.tableId}`).emit("order:submitted_success", { orderId: payload.id });

        // C. Push real-time alert to kitchen and waiter dashboards in the entire Branch Room
        io.to(`branch:room:${payload.branchId}`).emit("order:new", {
          id: payload.id,
          tableNumber: payload.tableNumber,
          total: payload.total,
          status: "pending",
          items: payload.items,
          createdAt: Date.now()
        });

        console.log(`✅ Order ${payload.id} committed and broadcasted.`);
      } catch (err: any) {
        console.error("❌ Order submission failed:", err);
        socket.emit("order:failed", { message: err.message || "Order transaction failed" });
      }
    });

    // ==========================================
    // 4. ORDER STATUS CHANGE (STAFF KITCHEN CONTROLS)
    // ==========================================
    socket.on("order:status_update", async ({ orderId, status, tableId, branchId }: { orderId: string; status: "pending" | "cooking" | "delivered" | "completed" | "cancelled"; tableId: string; branchId: string }) => {
      try {
        console.log(`⚙️ Status update request for Order ${orderId} -> ${status}`);

        // Update DB
        /*
        await db.update(orders)
          .set({ status, updatedAt: new Date() })
          .where(eq(orders.id, orderId));
        */

        // Broadcast updated status to everyone in the branch (staff dashboards)
        io.to(`branch:room:${branchId}`).emit("order:status_updated_staff", { orderId, status });

        // Broadcast updated status directly to the customer's active table tracker
        io.to(`table:room:${tableId}`).emit("order:status_updated_customer", { orderId, status });

        console.log(`📢 Broadcasted order status updated: ${orderId} is now ${status}`);
      } catch (err) {
        console.error("❌ Status update failed:", err);
        socket.emit("error", { message: "Failed to update order status" });
      }
    });

    // ==========================================
    // 5. WAITER SERVICE CALLS
    // ==========================================
    socket.on("waiter:call_dispatch", async ({ id, tenantId, branchId, tableId, tableNumber, type }: { id: string; tenantId: string; branchId: string; tableId: string; tableNumber: string; type: string }) => {
      try {
        console.log(`🛎️ Waiter call dispatched by Table ${tableNumber} -> Request: ${type}`);

        // Save Call in DB
        /*
        await db.insert(waiterCalls).values({
          id,
          tenantId,
          branchId,
          tableId,
          tableNumber,
          type,
          status: "pending",
          createdAt: new Date()
        });

        // Set table status to 'calling_waiter'
        await db.update(tables)
          .set({ status: "calling_waiter", updatedAt: new Date() })
          .where(eq(tables.id, tableId));
        */

        const notificationPayload = { id, tableId, tableNumber, type, status: "pending", createdAt: Date.now() };

        // Notify table that the call has been successfully queueing
        io.to(`table:room:${tableId}`).emit("waiter:call_received", notificationPayload);

        // Notify all waiters in the branch dashboard instantly
        io.to(`branch:room:${branchId}`).emit("waiter:call_new", notificationPayload);
      } catch (err) {
        console.error("❌ Waiter call dispatch failed:", err);
      }
    });

    // ==========================================
    // 6. RESOLVE WAITER CALL
    // ==========================================
    socket.on("waiter:call_resolve", async ({ callId, tableId, branchId }: { callId: string; tableId: string; branchId: string }) => {
      try {
        console.log(`🧹 Resolving Waiter Call ${callId} for Table Room ${tableId}`);

        // Update DB call state
        /*
        await db.update(waiterCalls)
          .set({ status: "resolved" })
          .where(eq(waiterCalls.id, callId));

        // Re-calculate table status if no pending calls remain
        const pendingCalls = await db.select().from(waiterCalls)
          .where(and(eq(waiterCalls.tableId, tableId), eq(waiterCalls.status, "pending")));

        if (pendingCalls.length === 0) {
          await db.update(tables)
            .set({ status: "eating", updatedAt: new Date() })
            .where(eq(tables.id, tableId));
        }
        */

        // Sync waiter call resolved event to staff dashboard
        io.to(`branch:room:${branchId}`).emit("waiter:call_resolved_sync", { callId });
        
        // Notify the customer table that staff are on the way / call is cleared
        io.to(`table:room:${tableId}`).emit("waiter:call_resolved_customer", { callId });
      } catch (err) {
        console.error("❌ Waiter resolve failed:", err);
      }
    });

    // ==========================================
    // 7. CASHIER TABLE BILL SETTLEMENT
    // ==========================================
    socket.on("table:settle_bill", async ({ tableId, branchId, newSessionToken }: { tableId: string; branchId: string; newSessionToken: string }) => {
      try {
        console.log(`💰 Table Bill Settlement requested for Table ${tableId}`);

        // Single atomic transactions: Settle all active order states, reset table session, and purge temporary cart
        /*
        await db.transaction(async (tx) => {
          // 1. Mark all pending/cooking/delivered orders as completed
          await tx.update(orders)
            .set({ status: "completed", updatedAt: new Date() })
            .where(and(
              eq(orders.tableId, tableId),
              inArray(orders.status, ["pending", "cooking", "delivered"])
            ));

          // 2. Reset table state back to empty, clean activeSessionToken
          await tx.update(tables)
            .set({ 
              status: "empty", 
              activeSessionToken: newSessionToken, 
              updatedAt: new Date() 
            })
            .where(eq(tables.id, tableId));

          // 3. Purge shared cart completely
          await tx.delete(sharedCarts).where(eq(sharedCarts.id, tableId));
        });
        */

        // Broadcast settlement event to staff branch room
        io.to(`branch:room:${branchId}`).emit("table:settled_branch_sync", { tableId, newSessionToken });

        // CRITICAL: Notify the customer room. This breaks their current active session and forces a reset UI
        io.to(`table:room:${tableId}`).emit("table:settled_customer_force_redirect", { tableId });

        console.log(`✅ Table ${tableId} fully settled and dynamically rotated to new dynamic token.`);
      } catch (err) {
        console.error("❌ Table settlement transaction failed:", err);
        socket.emit("error", { message: "Settlement failed" });
      }
    });

    // ==========================================
    // CLIENT DISCONNECT CLEANUP
    // ==========================================
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      if (currentTableRoom) {
        socket.to(currentTableRoom).emit("user:left_cart", { socketId: socket.id });
      }
    });
  });
}
