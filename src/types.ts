export type UserRole = 'super_admin' | 'brand_owner' | 'branch_manager' | 'kitchen_staff' | 'waiter_cashier';

export interface Tenant {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  createdAt: number;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  phone: string;
  createdAt: number;
}

export interface Table {
  id: string;
  tenantId: string;
  branchId: string;
  number: string;
  status: 'empty' | 'ordering' | 'eating' | 'calling_waiter';
  activeSessionToken: string; // Dynamic token to prevent fraud
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  branchId?: string;
  createdAt: number;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  category: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean; // Global status
  branchOverrides?: {
    [branchId: string]: {
      price?: number;
      isAvailable?: boolean;
    };
  };
  createdAt: number;
}

export interface CartItem {
  id: string; // unique item instance ID (for modifiers/remarks)
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  remarks: string;
  addedBy: string; // name of the customer
}

export interface SharedCart {
  id: string; // Table ID
  tenantId: string;
  branchId: string;
  items: CartItem[];
  updatedAt: number;
  lastAction?: {
    type: 'add' | 'remove' | 'update' | 'clear';
    itemName: string;
    userName: string;
    timestamp: number;
  };
}

export interface OrderItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  remarks: string;
}

export type OrderStatus = 'pending' | 'cooking' | 'delivered' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  tenantId: string;
  branchId: string;
  branchName: string;
  tableId: string;
  tableNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  sessionToken: string; // To match table activeSessionToken
  customerId: string; // Identifies customer who placed it
  idempotencyKey: string; // To prevent double orders
  createdAt: number;
  updatedAt: number;
}

export interface WaiterCall {
  id: string;
  tenantId: string;
  branchId: string;
  tableId: string;
  tableNumber: string;
  type: 'Need Tissue' | 'Refill Tea' | 'Request Bill' | 'Assistance';
  status: 'pending' | 'resolved';
  createdAt: number;
}
