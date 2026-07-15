import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum, serial, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// ENUMS
// ==========================================
export const tableStatusEnum = pgEnum("table_status", [
  "empty", 
  "ordering", 
  "eating", 
  "calling_waiter"
]);

export const userRoleEnum = pgEnum("user_role", [
  "super_admin", 
  "brand_owner", 
  "branch_manager", 
  "kitchen_staff", 
  "waiter_cashier"
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending", 
  "cooking", 
  "delivered", 
  "completed", 
  "cancelled"
]);

export const waiterCallTypeEnum = pgEnum("waiter_call_type", [
  "Need Tissue", 
  "Refill Tea", 
  "Request Bill", 
  "Assistance"
]);

export const waiterCallStatusEnum = pgEnum("waiter_call_status", [
  "pending", 
  "resolved"
]);

// ==========================================
// TABLES
// ==========================================

// 1. Tenants (SME Brands)
export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(), // e.g. "tenant-uid"
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Physical Branches (Outlets)
export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("branches_tenant_idx").on(table.tenantId)
]);

// 3. QR Tables
export const tables = pgTable("tables", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  status: tableStatusEnum("status").default("empty").notNull(),
  activeSessionToken: text("active_session_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("tables_branch_idx").on(table.branchId),
  uniqueIndex("table_unique_num_per_branch_idx").on(table.branchId, table.number)
]);

// 4. Staff User Profiles
export const userProfiles = pgTable("user_profiles", {
  uid: text("uid").primaryKey(), // Firebase Auth UID or custom SQL Auth UID
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("users_tenant_idx").on(table.tenantId),
  index("users_branch_idx").on(table.branchId)
]);

// 5. Menu Items
export const menuItems = pgTable("menu_items", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Amount in Burmese Kyats (Ks)
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("menu_items_tenant_category_idx").on(table.tenantId, table.category)
]);

// 6. Realtime Synchronized Carts (Persistent in DB, synchronized via WebSockets)
// Represents active dining carts on each active Table Session.
export const sharedCarts = pgTable("shared_carts", {
  id: text("id").primaryKey(), // Corresponds to tables.id
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  // items structure: Array<{ menuId: string, name: string, price: number, quantity: number, remarks: string, addedBy: string }>
  items: jsonb("items").default([]).notNull(), 
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Orders (Consolidated Order Headers)
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // order-uuid
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  branchName: text("branch_name").notNull(),
  tableId: text("table_id").notNull().references(() => tables.id, { onDelete: "cascade" }),
  tableNumber: text("table_number").notNull(),
  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").notNull(),
  total: integer("total").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  sessionToken: text("session_token").notNull(),
  customerId: text("customer_id").notNull(), // Unique client session ID for direct tracker
  idempotencyKey: text("idempotency_key").notNull(), // Multi-click submit safety
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("orders_tenant_idx").on(table.tenantId),
  index("orders_branch_idx").on(table.branchId),
  index("orders_table_idx").on(table.tableId),
  uniqueIndex("orders_idempotency_idx").on(table.idempotencyKey)
]);

// 8. Order Line Items (Relational Normalization)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: text("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
  remarks: text("remarks").default("").notNull(),
}, (table) => [
  index("order_items_order_idx").on(table.orderId)
]);

// 9. Real-time Waiter Service Calls
export const waiterCalls = pgTable("waiter_calls", {
  id: text("id").primaryKey(), // call-uuid
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  tableId: text("table_id").notNull().references(() => tables.id, { onDelete: "cascade" }),
  tableNumber: text("table_number").notNull(),
  type: waiterCallTypeEnum("type").notNull(),
  status: waiterCallStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("waiter_calls_branch_status_idx").on(table.branchId, table.status)
]);


// ==========================================
// RELATIONSHIPS
// ==========================================
export const tenantsRelations = relations(tenants, ({ many }) => ({
  branches: many(branches),
  users: many(userProfiles),
  menuItems: many(menuItems),
  tables: many(tables)
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [branches.tenantId], references: [tenants.id] }),
  tables: many(tables),
  orders: many(orders),
  waiterCalls: many(waiterCalls)
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  branch: one(branches, { fields: [tables.branchId], references: [branches.id] }),
  orders: many(orders),
  waiterCalls: many(waiterCalls)
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(tables, { fields: [orders.tableId], references: [tables.id] }),
  items: many(orderItems)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] })
}));
