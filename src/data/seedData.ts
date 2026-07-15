import { collection, doc, writeBatch, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Tenant, Branch, Table, MenuItem, UserProfile } from '../types';

export const SEED_TENANT: Tenant = {
  id: 'golden_leaf',
  name: 'Golden Leaf Tea House & Bistro',
  description: 'Premium traditional Myanmar tea & contemporary SME kitchen',
  logoUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=150&auto=format&fit=crop&q=60',
  createdAt: Date.now()
};

export const SEED_BRANCHES: Branch[] = [
  {
    id: 'branch_downtown',
    tenantId: 'golden_leaf',
    name: 'Downtown Flagship (Yangon)',
    address: 'No. 124, Merchant Road, Kyauktada Township, Yangon',
    phone: '+95 9 777 123 456',
    createdAt: Date.now()
  },
  {
    id: 'branch_ahlone',
    tenantId: 'golden_leaf',
    name: 'Ahlone Garden Branch',
    address: 'No. 45, Pyay Road, Ahlone Township, Yangon',
    phone: '+95 9 777 654 321',
    createdAt: Date.now()
  }
];

export const SEED_TABLES: Table[] = [
  { id: 'table_dt_01', tenantId: 'golden_leaf', branchId: 'branch_downtown', number: '01', status: 'empty', activeSessionToken: 'SESSION_DT_01', updatedAt: Date.now() },
  { id: 'table_dt_02', tenantId: 'golden_leaf', branchId: 'branch_downtown', number: '02', status: 'empty', activeSessionToken: 'SESSION_DT_02', updatedAt: Date.now() },
  { id: 'table_dt_03', tenantId: 'golden_leaf', branchId: 'branch_downtown', number: '03', status: 'empty', activeSessionToken: 'SESSION_DT_03', updatedAt: Date.now() },
  { id: 'table_dt_04', tenantId: 'golden_leaf', branchId: 'branch_downtown', number: '04', status: 'empty', activeSessionToken: 'SESSION_DT_04', updatedAt: Date.now() },
  { id: 'table_dt_05', tenantId: 'golden_leaf', branchId: 'branch_downtown', number: '05', status: 'empty', activeSessionToken: 'SESSION_DT_05', updatedAt: Date.now() },
  { id: 'table_ah_11', tenantId: 'golden_leaf', branchId: 'branch_ahlone', number: '11', status: 'empty', activeSessionToken: 'SESSION_AH_11', updatedAt: Date.now() },
  { id: 'table_ah_12', tenantId: 'golden_leaf', branchId: 'branch_ahlone', number: '12', status: 'empty', activeSessionToken: 'SESSION_AH_12', updatedAt: Date.now() },
  { id: 'table_ah_13', tenantId: 'golden_leaf', branchId: 'branch_ahlone', number: '13', status: 'empty', activeSessionToken: 'SESSION_AH_13', updatedAt: Date.now() }
];

export const SEED_USERS: UserProfile[] = [
  { uid: 'user_owner', email: 'owner@goldenleaf.com', name: 'U Maung Maung', role: 'brand_owner', tenantId: 'golden_leaf', createdAt: Date.now() },
  { uid: 'user_manager_dt', email: 'downtown.mgr@goldenleaf.com', name: 'Daw Ni Ni', role: 'branch_manager', tenantId: 'golden_leaf', branchId: 'branch_downtown', createdAt: Date.now() },
  { uid: 'user_kitchen_dt', email: 'downtown.kitchen@goldenleaf.com', name: 'Ko Htun', role: 'kitchen_staff', tenantId: 'golden_leaf', branchId: 'branch_downtown', createdAt: Date.now() },
  { uid: 'user_waiter_dt', email: 'downtown.waiter@goldenleaf.com', name: 'Ma Thaw Thaw', role: 'waiter_cashier', tenantId: 'golden_leaf', branchId: 'branch_downtown', createdAt: Date.now() },
  { uid: 'user_manager_ah', email: 'ahlone.mgr@goldenleaf.com', name: 'U Kyaw Swar', role: 'branch_manager', tenantId: 'golden_leaf', branchId: 'branch_ahlone', createdAt: Date.now() }
];

export const SEED_MENU: MenuItem[] = [
  {
    id: 'menu_tea_traditional',
    tenantId: 'golden_leaf',
    category: 'Beverages',
    name: 'Traditional Myanmar Tea (Laphet Ye)',
    description: 'Brewed black tea leaves mixed with rich condensed milk and evaporated milk. Myanmar style - "Pawt Kyat" (Strong and less sweet).',
    price: 1800,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    createdAt: Date.now()
  },
  {
    id: 'menu_mohinga',
    tenantId: 'golden_leaf',
    category: 'Mains',
    name: 'Royal Mohinga',
    description: 'Traditional Myanmar breakfast dish of rice noodles in a rich, herbal catfish and lemongrass broth, served with crispy gourd fritters and boiled egg.',
    price: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    createdAt: Date.now()
  },
  {
    id: 'menu_laphet_thoke',
    tenantId: 'golden_leaf',
    category: 'Sides & Salads',
    name: 'Assorted Tea Leaf Salad (Laphet Thoke)',
    description: 'Fermented Myanmar tea leaves, crispy mixed beans, fried garlic, roasted sesame, fresh tomatoes, shredded cabbage, green chili, and a squeeze of fresh lime.',
    price: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    createdAt: Date.now()
  },
  {
    id: 'menu_dimsum_pork',
    tenantId: 'golden_leaf',
    category: 'Dim Sum',
    name: 'Steamed Pork Dumplings (Siu Mai)',
    description: 'Juicy minced pork and shrimp wrap in seasoned dumpling wrapper, steamed to order. 4 pieces per serving.',
    price: 2800,
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    createdAt: Date.now()
  },
  {
    id: 'menu_roti_butter',
    tenantId: 'golden_leaf',
    category: 'Snacks',
    name: 'Flaky Roti with Sugar & Butter',
    description: 'Crispy, multi-layered pan-fried roti bread topped with melted premium butter and a sprinkle of organic cane sugar.',
    price: 2200,
    imageUrl: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    createdAt: Date.now()
  },
  {
    id: 'menu_lime_juice',
    tenantId: 'golden_leaf',
    category: 'Beverages',
    name: 'Freshly Squeezed Lime Juice',
    description: 'Zesty organic local lime juice, ice-cold and lightly sweetened. Highly refreshing.',
    price: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60',
    isAvailable: true,
    createdAt: Date.now()
  }
];

export async function seedDatabase() {
  try {
    const testQuery = query(collection(db, 'tenants'), limit(1));
    const querySnapshot = await getDocs(testQuery);
    
    if (!querySnapshot.empty) {
      console.log('Database already has data. Skipping automatic seeding.');
      return;
    }
    
    console.log('Database is empty. Initiating automatic seed procedure...');
    const batch = writeBatch(db);
    
    // Seed Tenant
    const tenantRef = doc(db, 'tenants', SEED_TENANT.id);
    batch.set(tenantRef, SEED_TENANT);
    
    // Seed Branches
    SEED_BRANCHES.forEach(branch => {
      const branchRef = doc(db, 'branches', branch.id);
      batch.set(branchRef, branch);
    });
    
    // Seed Tables
    SEED_TABLES.forEach(table => {
      const tableRef = doc(db, 'tables', table.id);
      batch.set(tableRef, table);
    });
    
    // Seed Users
    SEED_USERS.forEach(user => {
      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, user);
    });
    
    // Seed Menu Items
    SEED_MENU.forEach(menuItem => {
      const menuRef = doc(db, 'menu_items', menuItem.id);
      batch.set(menuRef, menuItem);
    });
    
    await batch.commit();
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database: ', error);
  }
}
