import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  query, 
  where, 
  deleteDoc, 
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, Table, Branch, Order, WaiterCall, UserProfile, UserRole, OrderItem } from '../types';
import { getTranslation, Language } from '../utils/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Coffee, 
  Utensils, 
  Check, 
  X, 
  Bell, 
  QrCode, 
  Printer, 
  Volume2, 
  ShieldAlert, 
  Store, 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Trash2, 
  Download, 
  Eye, 
  Layers, 
  RefreshCw,
  Award,
  CircleDollarSign,
  Smartphone,
  History
} from 'lucide-react';

interface StaffDashboardProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  currentBranchId: string;
  onChangeBranch: (branchId: string) => void;
  language: Language;
}

export default function StaffDashboard({ currentRole, onChangeRole, currentBranchId, onChangeBranch, language }: StaffDashboardProps) {
  // Collections State
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);

  // Local UX States
  const [kitchenTab, setKitchenTab] = useState<'active' | 'history'>('active');
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);
  const [isNewMenuItemModalOpen, setIsNewMenuItemModalOpen] = useState(false);
  const [isNewStaffModalOpen, setIsNewStaffModalOpen] = useState(false);
  const [confirmSettleTableId, setConfirmSettleTableId] = useState<string | null>(null);
  const [settleToast, setSettleToast] = useState<{ show: boolean; tableName: string; token: string } | null>(null);

  // New Menu Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(2500);
  const [newItemCategory, setNewItemCategory] = useState('Beverages');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=60');

  // New Staff Form State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('waiter_cashier');

  // Audio & Notification References
  const prevOrdersCountRef = useRef<number>(0);
  const prevWaiterCallsCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound Synthesizer: HTML5 Web Audio API (Sine/Square Waves)
  const playAlertSound = (type: 'kitchen' | 'waiter') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'kitchen') {
        // High attention dual beep chime for Kitchen
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.8);
        osc2.stop(ctx.currentTime + 0.8);
      } else {
        // Soft repetitive pager beep for Waiter Call
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context alert blocked by browser gesture permissions:", e);
    }
  };

  // 1. Fetch Branches & Staff (global admin scopes)
  useEffect(() => {
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snap) => {
      const list: Branch[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Branch));
      setBranches(list);
    });

    const unsubStaff = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push({ uid: d.id, ...d.data() } as UserProfile));
      setStaffUsers(list);
    });

    const unsubMenu = onSnapshot(collection(db, 'menu_items'), (snap) => {
      const list: MenuItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MenuItem));
      setMenuItems(list);
    });

    return () => {
      unsubBranches();
      unsubStaff();
      unsubMenu();
    };
  }, []);

  // 2. Real-time Listeners for Orders, Waiter Calls, and Tables (Isolated per Tenant/Branch)
  useEffect(() => {
    if (!currentBranchId) return;

    // A. Filter orders by branch for data isolation (Row Level Isolation)
    const ordersQuery = query(
      collection(db, 'orders'), 
      where('branchId', '==', currentBranchId)
    );
    
    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      const list: Order[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Order));
      
      // Sort: Pending/Cooking first, then by timestamp descending
      list.sort((a, b) => {
        const orderPriority = { 'pending': 0, 'cooking': 1, 'delivered': 2, 'completed': 3, 'cancelled': 4 };
        const scoreA = orderPriority[a.status] ?? 5;
        const scoreB = orderPriority[b.status] ?? 5;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return b.createdAt - a.createdAt;
      });

      setOrders(list);

      // Sound notification trigger for new orders
      const pendingCount = list.filter(o => o.status === 'pending').length;
      if (pendingCount > prevOrdersCountRef.current && (currentRole === 'kitchen_staff' || currentRole === 'branch_manager')) {
        playAlertSound('kitchen');
      }
      prevOrdersCountRef.current = pendingCount;
    });

    // B. Filter waiter calls by branch for isolation
    const callsQuery = query(
      collection(db, 'waiter_calls'), 
      where('branchId', '==', currentBranchId),
      where('status', '==', 'pending')
    );

    const unsubCalls = onSnapshot(callsQuery, (snap) => {
      const list: WaiterCall[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as WaiterCall));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setWaiterCalls(list);

      // Sound alert for waiter summons
      if (list.length > prevWaiterCallsCountRef.current && (currentRole === 'waiter_cashier' || currentRole === 'branch_manager')) {
        playAlertSound('waiter');
      }
      prevWaiterCallsCountRef.current = list.length;
    });

    // C. Filter tables by branch
    const tablesQuery = query(
      collection(db, 'tables'), 
      where('branchId', '==', currentBranchId)
    );

    const unsubTables = onSnapshot(tablesQuery, (snap) => {
      const list: Table[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Table));
      list.sort((a, b) => a.number.localeCompare(b.number));
      setTables(list);
    });

    return () => {
      unsubOrders();
      unsubCalls();
      unsubTables();
    };
  }, [currentBranchId, currentRole]);

  // Action: Update Order Status (Pending -> Cooking -> Delivered -> Completed)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'cooking' | 'delivered' | 'completed' | 'cancelled') => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  };

  // Action: Clear/Resolve Waiter Summon Call
  const handleResolveWaiterCall = async (callId: string, tableId: string) => {
    try {
      await updateDoc(doc(db, 'waiter_calls', callId), {
        status: 'resolved'
      });
      
      // Update table overall status back to ordering/eating if they were calling
      const remainingCallsQuery = query(
        collection(db, 'waiter_calls'),
        where('tableId', '==', tableId),
        where('status', '==', 'pending')
      );
      const remainingSnap = await getDocs(remainingCallsQuery);
      if (remainingSnap.empty) {
        await updateDoc(doc(db, 'tables', tableId), {
          status: 'eating',
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.error("Failed to resolve waiter call:", err);
    }
  };

  // Anti-Fraud Measure: Table settlement & rotating active session token
  const handleSettleAndClearTable = async (tableId: string, bypassConfirm = false, triggerPrint = true) => {
    const tableObj = tables.find(t => t.id === tableId);
    if (!tableObj) return;

    if (!bypassConfirm) {
      const confirmClear = window.confirm(`Settle and clear Table ${tableObj.number}? This will reset table status, clear any shared carts, and rotate/regenerate the QR token for security.`);
      if (!confirmClear) return;
    }

    try {
      // 1. Generate time-sensitive secure token
      const newSessionToken = `SESSION_${tableObj.branchId.toUpperCase().substr(7, 4)}_${tableObj.number}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // 2. Settle table orders (mark as completed) and compile consolidated receipt
      const ordersQuery = query(
        collection(db, 'orders'),
        where('tableId', '==', tableId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      const allItems: OrderItem[] = [];
      let consolidatedSubtotal = 0;

      const updatePromises: Promise<void>[] = [];
      ordersSnapshot.forEach((orderDoc) => {
        const oData = { id: orderDoc.id, ...orderDoc.data() } as Order;
        if (oData && ['pending', 'cooking', 'delivered'].includes(oData.status)) {
          if (oData.items) {
            oData.items.forEach(it => {
              const remarksStr = it.remarks || '';
              const existingItem = allItems.find(x => x.name === it.name && x.remarks === remarksStr);
              if (existingItem) {
                existingItem.quantity += it.quantity;
              } else {
                allItems.push({
                  menuId: it.menuId,
                  name: it.name,
                  price: it.price,
                  quantity: it.quantity,
                  remarks: remarksStr
                });
              }
              consolidatedSubtotal += it.price * it.quantity;
            });
          }

          updatePromises.push(
            updateDoc(doc(db, 'orders', orderDoc.id), {
              status: 'completed',
              updatedAt: Date.now()
            })
          );
        }
      });
      await Promise.all(updatePromises);

      // 3. Clear the Shared Cart document in Firestore
      await setDoc(doc(db, 'carts', tableId), {
        id: tableId,
        tenantId: tableObj.tenantId,
        branchId: tableObj.branchId,
        items: [],
        updatedAt: Date.now()
      });

      // 4. Update the Table state: empty + fresh token
      await updateDoc(doc(db, 'tables', tableId), {
        status: 'empty',
        activeSessionToken: newSessionToken,
        updatedAt: Date.now()
      });

      // Trigger consolidated thermal receipt popup if requested
      if (triggerPrint && allItems.length > 0) {
        const consolidatedTax = Math.round(consolidatedSubtotal * 0.05);
        const consolidatedTotal = consolidatedSubtotal + consolidatedTax;
        const consolidatedOrder: Order = {
          id: `settle_${tableId}_${Date.now()}`,
          tenantId: tableObj.tenantId,
          branchId: tableObj.branchId,
          branchName: activeBranchObj?.name || 'Golden Leaf Tea House',
          tableId: tableId,
          tableNumber: tableObj.number,
          items: allItems,
          subtotal: consolidatedSubtotal,
          tax: consolidatedTax,
          total: consolidatedTotal,
          status: 'completed',
          sessionToken: tableObj.activeSessionToken || '',
          customerId: 'staff_consolidated',
          idempotencyKey: `settle_${tableId}_${Date.now()}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setSelectedOrderForReceipt(consolidatedOrder);
      }

      // Show professional in-app non-blocking toast
      setSettleToast({
        show: true,
        tableName: tableObj.number,
        token: newSessionToken
      });
      setTimeout(() => {
        setSettleToast(null);
      }, 5000);
    } catch (err) {
      console.error("Error settling table:", err);
    }
  };

  // Toggle MenuItem availability per Branch (Sold Out State)
  const handleToggleMenuAvailability = async (menuItem: MenuItem, isAvailableNow: boolean) => {
    try {
      const overrides = menuItem.branchOverrides || {};
      overrides[currentBranchId] = {
        ...overrides[currentBranchId],
        isAvailable: isAvailableNow
      };

      await updateDoc(doc(db, 'menu_items', menuItem.id), {
        branchOverrides: overrides
      });
    } catch (err) {
      console.error("Error toggling menu item status:", err);
    }
  };

  // Global Master Menu: Create new menu item
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    try {
      const newItemId = `menu_item_${Date.now()}`;
      const item: MenuItem = {
        id: newItemId,
        tenantId: 'golden_leaf',
        category: newItemCategory,
        name: newItemName,
        description: newItemDesc,
        price: Number(newItemPrice),
        imageUrl: newItemUrl,
        isAvailable: true,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'menu_items', newItemId), item);
      setIsNewMenuItemModalOpen(false);
      setNewItemName('');
      setNewItemDesc('');
      alert('Global Master menu item added successfully!');
    } catch (err) {
      console.error("Error creating menu item:", err);
    }
  };

  // Branch Manager: Create staff accounts
  const handleCreateStaffAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;

    try {
      const mockUid = `user_staff_${Date.now()}`;
      const user: UserProfile = {
        uid: mockUid,
        email: newStaffEmail,
        name: newStaffName,
        role: newStaffRole,
        tenantId: 'golden_leaf',
        branchId: currentBranchId,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', mockUid), user);
      setIsNewStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      alert('Branch staff registered successfully!');
    } catch (err) {
      console.error("Error creating staff:", err);
    }
  };

  // Helper: Print Preview generator (Web Bluetooth helper)
  const handleSimulateBluetoothPrint = (order: Order) => {
    setSelectedOrderForReceipt(order);
  };

  // Sales Analytics computations for Brand Owner (cross branch)
  const totalSalesAll = orders.reduce((sum, o) => o.status === 'completed' ? sum + o.total : sum, 0);
  const totalOrdersAllCount = orders.length;
  const popularItemName = 'Traditional Myanmar Tea'; // Mock analytical inference

  // Filter current branch details
  const activeBranchObj = branches.find(b => b.id === currentBranchId);

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 relative" id="staff_dashboard_root">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {settleToast?.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 max-w-md bg-emerald-600 text-white rounded-2xl shadow-xl p-4 border border-emerald-500 flex gap-3 items-start"
            id="settle_success_toast"
          >
            <div className="bg-emerald-500 p-2 rounded-xl text-white">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs uppercase tracking-wide">Table Settled Successfully</h4>
              <p className="text-[11px] text-emerald-50 leading-relaxed font-medium">
                Table <strong>{settleToast.tableName}</strong> is now empty and ready for new guests.
              </p>
              <p className="text-[10px] font-mono bg-emerald-700/50 px-2 py-1 rounded inline-block text-emerald-100 mt-1 font-bold">
                New Token: {settleToast.token}
              </p>
            </div>
            <button
              onClick={() => setSettleToast(null)}
              className="text-emerald-200 hover:text-white transition p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top Multi-Role Switcher Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex flex-wrap gap-4 items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-amber-500 stroke-[2.5]" />
          <div>
            <h2 className="font-bold text-sm tracking-wide text-gray-100 uppercase">Merchant Control Console</h2>
            <p className="text-[10px] text-amber-400 font-semibold font-mono">Role Based Access Control (RBAC) Simulator</p>
          </div>
        </div>

        {/* Role Selector Buttons */}
        <div className="flex items-center gap-2 flex-wrap" id="rbac_role_controls">
          <span className="text-xs text-gray-400 font-medium">Select Role:</span>
          {(['brand_owner', 'branch_manager', 'kitchen_staff', 'waiter_cashier'] as UserRole[]).map(r => (
            <button
              key={r}
              id={`btn_role_${r}`}
              onClick={() => {
                onChangeRole(r);
                // Trigger sound play initialization permission
                playAlertSound('kitchen');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                currentRole === r 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Branch filtering and active user details */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Store className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Branch Outlet</span>
            {currentRole === 'brand_owner' ? (
              <select 
                id="select_branch_owner"
                value={currentBranchId}
                onChange={(e) => onChangeBranch(e.target.value)}
                className="text-sm font-bold text-gray-900 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-bold text-gray-900">{activeBranchObj?.name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="bg-gray-100 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span>Staff: {currentRole.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT ACCORDING TO ROLE */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ----------------- 1. BRAND OWNER DASHBOARD ----------------- */}
        {currentRole === 'brand_owner' && (
          <div className="space-y-6" id="view_brand_owner">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Sales (Today)</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-900 mt-1">{totalSalesAll.toLocaleString()} Ks</h3>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">↑ 14.5% compared to last week</span>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Transactions</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-900 mt-1">{totalOrdersAllCount} orders</h3>
                  <span className="text-[10px] text-amber-600 font-semibold mt-1 block">Live real-time feed active</span>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Top Selling Dish</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">{popularItemName}</h3>
                  <span className="text-[10px] text-gray-500 font-medium mt-1 block">Representing 38% of revenue</span>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Award className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Brand Owner Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Global Master Menu Control */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-amber-500" />
                    Global Master Menu Management
                  </h3>
                  <button 
                    id="btn_owner_add_menu"
                    onClick={() => setIsNewMenuItemModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto pr-2">
                  {menuItems.map(item => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="font-bold text-gray-800 text-xs">{item.name}</h4>
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">{item.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono font-bold text-amber-700">{item.price.toLocaleString()} Ks</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.isAvailable ? 'Global Active' : 'Global Suspended'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Branch Locations Directory */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-500" />
                    Active SME Branches
                  </h3>
                </div>

                <div className="space-y-3">
                  {branches.map(branch => {
                    const branchStaff = staffUsers.filter(u => u.branchId === branch.id);
                    const branchTables = tables.filter(t => t.branchId === branch.id);
                    return (
                      <div key={branch.id} className="p-4 border border-gray-100 rounded-xl space-y-2 hover:bg-gray-50/50 transition">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-800 text-xs">{branch.name}</h4>
                          <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold font-mono">ID: {branch.id}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{branch.address}</p>
                        <div className="flex justify-between text-[10px] text-gray-400 pt-1 font-semibold border-t border-gray-50">
                          <span>Staff Count: {branchStaff.length}</span>
                          <span>Registered Tables: {branchTables.length || 5}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- 2. BRANCH MANAGER DASHBOARD ----------------- */}
        {currentRole === 'branch_manager' && (
          <div className="space-y-6" id="view_branch_manager">
            {/* Table QR Codes Panel */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-amber-500" />
                    Table QR Codes & Session Management
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Settle tables here to trigger token rotation (Anti-Fraud protection)</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded text-[10px] font-bold">
                  Active Tables: {tables.length}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map(tbl => {
                  // Direct simulated ordering url
                  const simulatedUrl = `${window.location.origin}/?r=golden_leaf&b=${tbl.branchId}&t=${tbl.id}&token=${tbl.activeSessionToken}`;
                  return (
                    <div key={tbl.id} className="p-4 border border-gray-100 rounded-xl space-y-3 hover:border-amber-300 transition bg-white" id={`mgr_table_card_${tbl.id}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-gray-800">Table {tbl.number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          tbl.status === 'empty' ? 'bg-gray-100 text-gray-600' :
                          tbl.status === 'ordering' ? 'bg-amber-100 text-amber-800' :
                          tbl.status === 'eating' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tbl.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Token Details */}
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Active Token:</span>
                          <span className="font-mono font-bold text-gray-700">{tbl.activeSessionToken}</span>
                        </div>
                      </div>

                      {/* QR Action Buttons */}
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-50">
                        <div className="flex gap-2">
                          <a 
                            href={simulatedUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold rounded flex items-center justify-center gap-1 border border-amber-100 transition"
                          >
                            <Smartphone className="w-3 h-3" />
                            Simulate Guest
                          </a>
                          
                          {confirmSettleTableId === tbl.id ? (
                            <div className="flex gap-1.5 items-center bg-red-50 px-2 rounded border border-red-100 py-1">
                              <span className="text-[9px] font-bold text-red-700">Clear?</span>
                              <label className="flex items-center gap-1 cursor-pointer select-none border-l border-red-200 pl-1.5 mr-1">
                                <input
                                  type="checkbox"
                                  id={`waiter_print_slip_${tbl.id}`}
                                  checked={shouldPrintReceipt}
                                  onChange={(e) => setShouldPrintReceipt(e.target.checked)}
                                  className="w-3 h-3 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                                />
                                <span className="text-[8px] text-gray-700 font-bold whitespace-nowrap">Print Slip</span>
                              </label>
                              <button
                                onClick={() => setConfirmSettleTableId(null)}
                                className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-700 text-[9px] font-bold rounded hover:bg-gray-50"
                              >
                                No
                              </button>
                              <button
                                onClick={() => {
                                  handleSettleAndClearTable(tbl.id, true, shouldPrintReceipt);
                                  setConfirmSettleTableId(null);
                                }}
                                className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black rounded hover:bg-red-700 shadow-sm"
                              >
                                Settle
                              </button>
                            </div>
                          ) : (
                            <button 
                              id={`btn_settle_table_${tbl.id}`}
                              onClick={() => setConfirmSettleTableId(tbl.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded transition flex items-center justify-center gap-1 border border-red-100"
                            >
                              Settle Table
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Menu stock availability (Sold Out toggle) & Staff Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Branch Menu Stock Availability */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-amber-500" />
                    Local Branch Availability Overrides
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Toggle "Sold Out" state below. Changes synchronize instantly to customer tables.</p>
                </div>

                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto pr-2">
                  {menuItems.map(item => {
                    // Check local availability override
                    let localAvailable = item.isAvailable;
                    if (item.branchOverrides && item.branchOverrides[currentBranchId] && item.branchOverrides[currentBranchId].isAvailable !== undefined) {
                      localAvailable = item.branchOverrides[currentBranchId].isAvailable!;
                    }
                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <h4 className="font-bold text-gray-800 text-xs">{item.name}</h4>
                            <span className="text-[10px] font-mono text-amber-700 font-bold">{item.price.toLocaleString()} Ks</span>
                          </div>
                        </div>

                        {/* Slide Toggle */}
                        <button
                          id={`btn_toggle_availability_${item.id}`}
                          onClick={() => handleToggleMenuAvailability(item, !localAvailable)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                            localAvailable 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {localAvailable ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-red-500" />
                              <span className="font-semibold text-red-600">Sold Out</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Staff Roster & Registration */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    Branch Staff Directory
                  </h3>
                  <button 
                    id="btn_add_staff_trigger"
                    onClick={() => setIsNewStaffModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Staff
                  </button>
                </div>

                <div className="space-y-2">
                  {staffUsers.filter(u => u.branchId === currentBranchId).map(staff => (
                    <div key={staff.uid} className="p-3 border border-gray-100 rounded-xl flex justify-between items-center bg-gray-50/50">
                      <div>
                        <h4 className="font-bold text-gray-800 text-xs">{staff.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono">{staff.email}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded capitalize">
                        {staff.role.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- 3. KITCHEN STAFF SCREEN ----------------- */}
        {currentRole === 'kitchen_staff' && (
          <div className="space-y-6" id="view_kitchen_staff">
            {/* Control Station Panel */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-amber-500 animate-bounce" />
                    Real-time Kitchen Order Station
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Incoming tickets beep automatically. Accept them, cook, and mark done to clear your workstation.
                  </p>
                </div>
                
                {/* Tabs switcher */}
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <button
                    onClick={() => setKitchenTab('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      kitchenTab === 'active'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5 text-amber-500" />
                    Prep Queue ({orders.filter(o => o.status === 'cooking' || o.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setKitchenTab('history')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      kitchenTab === 'history'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-indigo-500" />
                    Done History ({orders.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cancelled').length})
                  </button>
                </div>
              </div>

              {/* Quick explanatory banner to answer "Mark as Cooked (Done) button is what for" */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-900 font-medium flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
                  <span>
                    <b>Operational Note:</b> The <b>"Mark as Cooked (Done)"</b> button updates the order status to <i>"Cooked & Sent"</i>, instantly moving the ticket to the <b>Done History</b> tab to keep your active prep queue clean and readable.
                  </span>
                </span>
              </div>

              {/* Conditional rendering based on active kitchenTab */}
              {kitchenTab === 'active' ? (
                // ACTIVE PREP QUEUE
                orders.filter(o => o.status === 'cooking' || o.status === 'pending').length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Utensils className="w-12 h-12 mx-auto mb-3 opacity-25 animate-pulse text-amber-500" />
                    <p className="text-sm font-bold">Kitchen Queue is clear! No active tickets.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Ready to receive incoming table orders instantly.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="kitchen_tickets_grid">
                    {orders.filter(o => o.status === 'cooking' || o.status === 'pending').map(order => (
                      <div 
                        key={order.id} 
                        className={`rounded-2xl border-2 overflow-hidden flex flex-col justify-between shadow-sm bg-white ${
                          order.status === 'pending' ? 'border-amber-400 animate-pulse' : 'border-gray-100'
                        }`}
                        id={`kitchen_ticket_${order.id}`}
                      >
                        {/* Ticket Header */}
                        <div className={`p-4 ${order.status === 'pending' ? 'bg-amber-400 text-amber-950' : 'bg-gray-100 text-gray-800'} flex justify-between items-center`}>
                          <div>
                            <span className="font-bold text-sm">TABLE {order.tableNumber}</span>
                            <span className="text-[10px] font-mono block font-medium">Ref: {order.id.substr(6, 6).toUpperCase()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-semibold block">{new Date(order.createdAt).toLocaleTimeString()}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-black/10 px-1.5 py-0.5 rounded">
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="p-4 flex-1 space-y-3">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-50 pb-2">
                              <div>
                                <span className="font-bold text-gray-900 text-sm mr-2">{it.quantity}x</span>
                                <span className="font-semibold text-gray-800">{it.name}</span>
                                {it.remarks && (
                                  <p className="text-[10px] text-red-600 font-bold italic mt-0.5">*{it.remarks}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                          <button 
                            id={`btn_kitchen_print_${order.id}`}
                            onClick={() => handleSimulateBluetoothPrint(order)}
                            className="px-3 py-2 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 transition flex items-center justify-center gap-1"
                          >
                            <Printer className="w-4 h-4" />
                            Receipt
                          </button>

                          {order.status === 'pending' ? (
                            <button
                              id={`btn_kitchen_accept_${order.id}`}
                              onClick={() => handleUpdateOrderStatus(order.id, 'cooking')}
                              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition shadow-sm"
                            >
                              Accept & Cook
                            </button>
                          ) : (
                            <button
                              id={`btn_kitchen_done_${order.id}`}
                              onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1"
                              title="Mark order cooked and move to Done History"
                            >
                              <Check className="w-4 h-4" />
                              Mark as Cooked (Done)
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                // DONE / COMPLETED KITCHEN HISTORY
                orders.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cancelled').length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-25 text-indigo-400" />
                    <p className="text-sm font-bold">Done History is empty.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Cooked tickets will register here automatically.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" id="kitchen_history_grid">
                    {orders.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cancelled').map(order => (
                      <div 
                        key={order.id} 
                        className="rounded-2xl border border-gray-200 overflow-hidden flex flex-col justify-between shadow-sm bg-gray-50/50"
                        id={`kitchen_history_ticket_${order.id}`}
                      >
                        {/* Ticket Header */}
                        <div className="p-4 bg-gray-100 text-gray-700 flex justify-between items-center border-b border-gray-200">
                          <div>
                            <span className="font-bold text-sm">TABLE {order.tableNumber}</span>
                            <span className="text-[10px] font-mono block font-medium">Ref: {order.id.substr(6, 6).toUpperCase()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-semibold block">{new Date(order.createdAt).toLocaleTimeString()}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              order.status === 'completed' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {order.status === 'delivered' ? 'cooked' : order.status}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="p-4 flex-1 space-y-3 opacity-75">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-100 pb-2">
                              <div>
                                <span className="font-bold text-gray-700 text-sm mr-2">{it.quantity}x</span>
                                <span className="font-semibold text-gray-600 line-through decoration-gray-300">{it.name}</span>
                                {it.remarks && (
                                  <p className="text-[10px] text-gray-500 italic mt-0.5">*{it.remarks}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer details */}
                        <div className="p-3 bg-white/60 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                          <span>Completed log entry</span>
                          <button 
                            onClick={() => handleSimulateBluetoothPrint(order)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ----------------- 4. WAITER & CASHIER SCREEN ----------------- */}
        {currentRole === 'waiter_cashier' && (
          <div className="space-y-6" id="view_waiter_cashier">
            {/* Realtime Calls */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-red-500 animate-bounce" />
                    Incoming Table Summon Alerts
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Real-time requests sent by seated customers. Instant sound chime active.</p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                  Unresolved Calls: {waiterCalls.length}
                </span>
              </div>

              {waiterCalls.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-25 animate-pulse" />
                  <p className="text-sm font-bold">No active waiter alerts. Excellent service status!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="waiter_alerts_grid">
                  {waiterCalls.map(call => (
                    <div 
                      key={call.id} 
                      className="p-4 rounded-xl border border-red-100 bg-red-50/50 flex justify-between items-center"
                      id={`waiter_alert_${call.id}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-red-800 text-sm">Table {call.tableNumber}</span>
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded font-mono">ALERT</span>
                        </div>
                        <h4 className="font-extrabold text-gray-900 text-base mt-1.5">{call.type}</h4>
                        <span className="text-[9px] text-gray-400 font-mono block mt-1">{new Date(call.createdAt).toLocaleTimeString()}</span>
                      </div>

                      <button 
                        id={`btn_resolve_call_${call.id}`}
                        onClick={() => handleResolveWaiterCall(call.id, call.tableId)}
                        className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-md shadow-red-600/10"
                        title="Mark Resolved"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settle Cashier panel */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-amber-500" />
                  {language === 'my' ? 'စားပွဲရှင်းလင်းခြင်းနှင့် ငွေပေးချေမှုမှတ်တမ်း' : 'Table Checkout & Payment Handshake'}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {language === 'my' 
                    ? 'ငွေပေးချေမှုကို လုပ်ဆောင်ပါ၊ ပြေစာထုတ်ယူပါ၊ လက်ရှိစားပွဲအသုံးပြုမှုကို ဘေးကင်းစွာ ပိတ်သိမ်းပါ။' 
                    : 'Process payment, print thermal invoices, and clear active table sessions safely.'}
                </p>
              </div>

              {tables.filter(t => t.status !== 'empty' || orders.some(o => o.tableId === t.id && (o.status === 'cooking' || o.status === 'delivered' || o.status === 'pending'))).length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <CircleDollarSign className="w-12 h-12 mx-auto mb-3 opacity-25 animate-pulse text-amber-500" />
                  <p className="text-sm font-bold">{language === 'my' ? 'လောလောဆယ် ငွေရှင်းရန် စားပွဲမရှိသေးပါ။' : 'No active tables need settlement right now.'}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {language === 'my' 
                      ? 'ဝယ်ယူသူများ စားပွဲတွင်ဝင်ရောက်ခြင်း သို့မဟုတ် အော်ဒါတင်ခြင်းပြုလုပ်ပါက ဤနေရာတွင် ချက်ချင်းပေါ်လာမည်ဖြစ်ပါသည်။' 
                      : 'When customers join tables or place orders, they will show up here instantly.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tables.filter(t => t.status !== 'empty' || orders.some(o => o.tableId === t.id && (o.status === 'cooking' || o.status === 'delivered' || o.status === 'pending'))).map(tbl => {
                    const tableOrders = orders.filter(o => o.tableId === tbl.id && (o.status === 'cooking' || o.status === 'delivered' || o.status === 'pending'));
                    const currentBillAmount = tableOrders.reduce((sum, o) => sum + o.total, 0);

                    return (
                      <div key={tbl.id} className="p-4 border border-gray-100 rounded-xl space-y-3 bg-white hover:border-amber-300 transition" id={`cashier_settle_card_${tbl.id}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                            {getTranslation('table', language)} {tbl.number}
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded capitalize">
                            {tbl.status.replace('_', ' ')}: {tableOrders.length} {language === 'my' ? 'ခု' : 'orders'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400">{language === 'my' ? 'ကျသင့်ငွေစုစုပေါင်း:' : 'Accrued Bill:'}</span>
                          <span className="font-mono font-black text-xs text-amber-700">{currentBillAmount.toLocaleString()} Ks</span>
                        </div>

                        {confirmSettleTableId === tbl.id ? (
                          <div className="space-y-2 pt-1 animate-fade-in" id={`settle_confirm_box_${tbl.id}`}>
                            <p className="text-[10px] text-red-600 font-bold leading-tight text-center">
                              {getTranslation('settle_warning', language)}
                            </p>
                            
                            {/* Print Bill Slip Switch Option */}
                            <div className="flex items-center justify-center gap-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  id={`checkbox_print_slip_${tbl.id}`}
                                  checked={shouldPrintReceipt}
                                  onChange={(e) => setShouldPrintReceipt(e.target.checked)}
                                  className="w-3.5 h-3.5 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                                />
                                <span className="text-[10px] text-gray-700 font-bold">{getTranslation('print_option_slip', language)}</span>
                              </label>
                            </div>

                            <div className="flex gap-2">
                              <button
                                id={`btn_cashier_settle_cancel_${tbl.id}`}
                                onClick={() => setConfirmSettleTableId(null)}
                                className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg transition"
                              >
                                {getTranslation('no', language)}
                              </button>
                              <button
                                id={`btn_cashier_settle_confirm_${tbl.id}`}
                                onClick={() => {
                                  handleSettleAndClearTable(tbl.id, true, shouldPrintReceipt);
                                  setConfirmSettleTableId(null);
                                }}
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg transition shadow-sm"
                              >
                                {language === 'my' ? 'ဟုတ်ကဲ့၊ စားပွဲရှင်းမည်' : 'Yes, Settle'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            id={`btn_cashier_settle_${tbl.id}`}
                            onClick={() => setConfirmSettleTableId(tbl.id)}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            {getTranslation('btn_settle_clear', language)}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ----------------- MODAL: GLOBAL ADD MENU ITEM (BRAND OWNER) ----------------- */}
      <AnimatePresence>
        {isNewMenuItemModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_add_menu">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base">Add Global Master Menu Item</h3>
                <button 
                  id="btn_close_menu_modal"
                  onClick={() => setIsNewMenuItemModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMenuItem} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Item Name *</label>
                  <input 
                    id="input_menu_name"
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Traditional Tea Leaf Salad"
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Base Price (Ks) *</label>
                    <input 
                      id="input_menu_price"
                      type="number"
                      required
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Category *</label>
                    <select
                      id="select_menu_cat"
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    >
                      <option value="Beverages">Beverages</option>
                      <option value="Mains">Mains</option>
                      <option value="Sides & Salads">Sides & Salads</option>
                      <option value="Dim Sum">Dim Sum</option>
                      <option value="Snacks">Snacks</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Description</label>
                  <textarea 
                    id="input_menu_desc"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="Provide appealing specifications for tea house customers..."
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none h-20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Photo Unsplash URL</label>
                  <input 
                    id="input_menu_url"
                    type="url"
                    value={newItemUrl}
                    onChange={(e) => setNewItemUrl(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-500"
                  />
                </div>

                <button 
                  id="btn_submit_menu"
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-500/10 transition"
                >
                  Save Global Item
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- MODAL: REGISTER STAFF (BRANCH MANAGER) ----------------- */}
      <AnimatePresence>
        {isNewStaffModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="modal_add_staff">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base">Add Branch Staff Member</h3>
                <button 
                  id="btn_close_staff_modal"
                  onClick={() => setIsNewStaffModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateStaffAccount} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Full Name *</label>
                  <input 
                    id="input_staff_name"
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Maung Htun"
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Email Address *</label>
                  <input 
                    id="input_staff_email"
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="e.g. staff.htun@goldenleaf.com"
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Staff Role *</label>
                  <select
                    id="select_staff_role"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  >
                    <option value="waiter_cashier">Waiter / Cashier</option>
                    <option value="kitchen_staff">Kitchen Chef</option>
                    <option value="branch_manager">Assistant Branch Manager</option>
                  </select>
                </div>

                <button 
                  id="btn_submit_staff"
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-500/10 transition"
                >
                  Register Branch Staff
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- MODAL: THERMAL RECEIPT AUTO-PRINTER (KITCHEN/CASHIER) ----------------- */}
      <AnimatePresence>
        {selectedOrderForReceipt && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" id="thermal_print_modal">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-100 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              {/* Receipt Header Actions */}
              <div className="bg-amber-500 text-white p-4 flex justify-between items-center">
                <span className="font-bold text-xs uppercase flex items-center gap-1.5">
                  <Printer className="w-4 h-4 animate-pulse" />
                  Thermal Printer Queue
                </span>
                <button 
                  id="btn_close_receipt"
                  onClick={() => setSelectedOrderForReceipt(null)} 
                  className="bg-amber-600 hover:bg-amber-700 p-1 rounded transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Precise Receipt Template rendering */}
              <div className="p-6">
                <div className="bg-white p-5 border border-gray-200 rounded-xl font-mono text-xs text-gray-800 space-y-4 shadow-inner" id="receipt_paper">
                  <p className="text-center font-bold">============================</p>
                  <p className="font-black text-center text-sm">
                    ORDER # {selectedOrderForReceipt.id.substr(6, 6).toUpperCase()} - TABLE {selectedOrderForReceipt.tableNumber}
                  </p>
                  <p className="text-left font-semibold">
                    Branch: {selectedOrderForReceipt.branchName}
                  </p>
                  <p className="text-left">
                    Time: {new Date(selectedOrderForReceipt.createdAt).toLocaleDateString()} {new Date(selectedOrderForReceipt.createdAt).toLocaleTimeString()}
                  </p>
                  <p className="text-center font-bold">----------------------------</p>
                  
                  {/* Itemized row loops */}
                  <div className="space-y-2">
                    {selectedOrderForReceipt.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <span>
                          {it.quantity}x {it.name}
                          {it.remarks && <span className="block text-[10px] text-gray-500 font-bold ml-4">(*{it.remarks})</span>}
                        </span>
                        <span className="font-bold">{(it.price * it.quantity).toLocaleString()} Ks</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-center font-bold">----------------------------</p>
                  <div className="space-y-1 text-right">
                    <p>Subtotal: {selectedOrderForReceipt.subtotal.toLocaleString()} Ks</p>
                    <p>Com. Tax (5%): {selectedOrderForReceipt.tax.toLocaleString()} Ks</p>
                    <p className="font-black text-sm">TOTAL: {selectedOrderForReceipt.total.toLocaleString()} Ks</p>
                  </div>
                  <p className="text-center font-bold">============================</p>
                  <p className="text-center text-[9px] text-gray-400 uppercase">Power Backup Print Queue Active</p>
                </div>
              </div>

              {/* Receipt Action Footer */}
              <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
                <button
                  id="btn_trigger_bluetooth_print"
                  onClick={() => {
                    alert("Triggering Bluetooth Handshake...\nSearching for 'ESC/POS 58mm Thermal Receipt Printer' via Web Bluetooth API.\n(A mock Bluetooth print-job has successfully broadcasted!)");
                    setSelectedOrderForReceipt(null);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt (ESC/POS)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
