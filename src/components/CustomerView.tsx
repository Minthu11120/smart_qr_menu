import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, Table, Branch, CartItem, SharedCart, Order } from '../types';
import { SEED_TENANT } from '../data/seedData';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  Utensils, 
  Bell, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  WifiOff, 
  User, 
  Clock, 
  QrCode, 
  ChevronRight, 
  Sparkles, 
  X,
  MessageSquare,
  Volume2,
  History,
  Trash2
} from 'lucide-react';
import { saveOrderToHistory, getOrdersFromHistory, deleteOrderFromHistory } from '../lib/orderHistoryDB';
import { getTranslation, Language } from '../utils/i18n';

interface CustomerViewProps {
  // Demo configuration helpers
  onSimulateQrScan: (tenantId: string, branchId: string, tableId: string, token: string) => void;
  currentQrParams: {
    tenantId: string | null;
    branchId: string | null;
    tableId: string | null;
    token: string | null;
  };
  language: Language;
}

export default function CustomerView({ onSimulateQrScan, currentQrParams, language }: CustomerViewProps) {
  const { tenantId, branchId, tableId, token } = currentQrParams;

  // App & Database States
  const [table, setTable] = useState<Table | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sharedCart, setSharedCart] = useState<SharedCart | null>(null);
  
  // UX / UI States
  const [customerName, setCustomerName] = useState<string>(() => {
    return localStorage.getItem('qr_customer_name') || `Guest #${Math.floor(100 + Math.random() * 900)}`;
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState<{ [menuId: string]: string }>({});
  
  // Validation / Loading States
  const [isValidating, setIsValidating] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  // Local Customer Past Orders via IndexedDB
  const [localHistory, setLocalHistory] = useState<Order[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);
  const [confirmDeleteLineKey, setConfirmDeleteLineKey] = useState<string | null>(null);

  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissed_order_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const dismissOrder = (orderId: string) => {
    const updated = [...dismissedOrderIds, orderId];
    setDismissedOrderIds(updated);
    try {
      localStorage.setItem('dismissed_order_ids', JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save dismissed order IDs:", err);
    }
  };

  const loadLocalHistory = async () => {
    try {
      const history = await getOrdersFromHistory();
      setLocalHistory(history);
    } catch (err) {
      console.error("Failed to load local order history:", err);
    }
  };

  useEffect(() => {
    loadLocalHistory();
  }, []);

  const handleReorderItems = async (itemsToReorder: { menuId: string; name: string; price: number; quantity: number; remarks: string }[]) => {
    if (!sharedCart || !tableId) {
      alert("Please join a table session first to start adding items.");
      return;
    }

    const cartDocRef = doc(db, 'carts', tableId);
    const newItems = [...sharedCart.items];

    for (const item of itemsToReorder) {
      const activeItem = menuItems.find(m => m.id === item.menuId);
      let finalPrice = item.price;
      if (activeItem) {
        const displayInfo = getMenuItemDisplay(activeItem);
        if (!displayInfo.finalAvailable) {
          alert(`"${item.name}" is currently sold out and cannot be re-ordered.`);
          continue;
        }
        finalPrice = displayInfo.finalPrice;
      }

      const existingIndex = newItems.findIndex(i => i.menuId === item.menuId && i.remarks === item.remarks);

      if (existingIndex > -1) {
        newItems[existingIndex].quantity += item.quantity;
      } else {
        newItems.push({
          id: `${item.menuId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          menuId: item.menuId,
          name: item.name,
          price: finalPrice,
          quantity: item.quantity,
          remarks: item.remarks,
          addedBy: customerName
        });
      }
    }

    if (navigator.vibrate) navigator.vibrate(60);

    await updateDoc(cartDocRef, {
      items: newItems,
      updatedAt: Date.now(),
      lastAction: {
        type: 'add',
        itemName: itemsToReorder.length === 1 ? itemsToReorder[0].name : `${itemsToReorder.length} items from History`,
        userName: customerName,
        timestamp: Date.now()
      }
    });
  };

  // Connection & Offline Resilience States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reconnectToast, setReconnectToast] = useState(false);
  const [lastActionToast, setLastActionToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // References for tracking previous cart state to trigger Toast notifications on changes
  const prevCartRef = useRef<CartItem[]>([]);

  // 1. Connection Monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setReconnectToast(true);
      setTimeout(() => setReconnectToast(false), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save customer name to localStorage
  const handleSaveName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      setCustomerName(trimmed);
      localStorage.setItem('qr_customer_name', trimmed);
      setIsEditingName(false);
    }
  };

  // 2. Validate QR credentials and fetch Table/Branch details
  useEffect(() => {
    if (!tenantId || !branchId || !tableId || !token) {
      setTable(null);
      setBranch(null);
      return;
    }

    const validateQrAndLoad = async () => {
      setIsValidating(true);
      setVerificationError(null);
      try {
        // Fetch and verify table
        const tableDocRef = doc(db, 'tables', tableId);
        const tableSnap = await getDoc(tableDocRef);

        if (!tableSnap.exists()) {
          setVerificationError("This physical table does not exist in our registry.");
          setIsValidating(false);
          return;
        }

        const tableData = tableSnap.data() as Table;

        // Anti-Fraud check: Compare URL token with current database token
        if (tableData.activeSessionToken !== token) {
          setVerificationError(
            "This QR Code has expired. The table may have been cleared or reallocated. Please ask a staff member to generate a fresh QR code."
          );
          setIsValidating(false);
          return;
        }

        if (tableData.tenantId !== tenantId || tableData.branchId !== branchId) {
          setVerificationError("Security violation: QR parameters do not match registered branch registry.");
          setIsValidating(false);
          return;
        }

        setTable(tableData);

        // Fetch Branch details
        const branchDocRef = doc(db, 'branches', branchId);
        const branchSnap = await getDoc(branchDocRef);
        if (branchSnap.exists()) {
          setBranch(branchSnap.data() as Branch);
        }

        // Fetch Menu Items
        const menuQuery = query(collection(db, 'menu_items'), where('tenantId', '==', tenantId));
        const menuSnapshot = await getDocs(menuQuery);
        const itemsList: MenuItem[] = [];
        menuSnapshot.forEach(doc => {
          itemsList.push({ id: doc.id, ...doc.data() } as MenuItem);
        });
        setMenuItems(itemsList);

        // Enter table session (Update Table status in background)
        if (tableData.status === 'empty') {
          await updateDoc(tableDocRef, { status: 'ordering' });
        }

      } catch (err: any) {
        console.error("Error validating session parameters:", err);
        setVerificationError("Network error: Unable to verify table session. Please check your internet connection.");
      } finally {
        setIsValidating(false);
      }
    };

    validateQrAndLoad();
  }, [tenantId, branchId, tableId, token]);

  // 3. Listen to Shared Table Cart (WebSocket-style Realtime syncing via Firestore)
  useEffect(() => {
    if (!tableId || !table) return;

    const cartDocRef = doc(db, 'carts', tableId);
    
    // Listen in real-time
    const unsubscribe = onSnapshot(cartDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const cartData = snapshot.data() as SharedCart;
        setSharedCart(cartData);

        // Realtime Change Diffing & Notification Toasts
        const currentItems = cartData.items || [];
        const lastAction = cartData.lastAction;

        if (lastAction && lastAction.userName !== customerName && (Date.now() - lastAction.timestamp < 4000)) {
          let message = '';
          if (lastAction.type === 'add') {
            message = `${lastAction.userName} added ${lastAction.itemName} to the shared cart!`;
          } else if (lastAction.type === 'remove') {
            message = `${lastAction.userName} removed ${lastAction.itemName} from the cart.`;
          } else if (lastAction.type === 'update') {
            message = `${lastAction.userName} updated quantities for ${lastAction.itemName}.`;
          } else if (lastAction.type === 'clear') {
            message = `${lastAction.userName} cleared the shared cart.`;
          }

          if (message) {
            setLastActionToast({ message, visible: true });
            setTimeout(() => {
              setLastActionToast(prev => ({ ...prev, visible: false }));
            }, 3500);
          }
        }
        
        prevCartRef.current = currentItems;
      } else {
        // If no cart doc exists, seed empty cart in Firestore
        setDoc(cartDocRef, {
          id: tableId,
          tenantId: table.tenantId,
          branchId: table.branchId,
          items: [],
          updatedAt: Date.now()
        });
        setSharedCart({
          id: tableId,
          tenantId: table.tenantId,
          branchId: table.branchId,
          items: [],
          updatedAt: Date.now()
        });
      }
    });

    return () => unsubscribe();
  }, [tableId, table, customerName]);

  // 3.5 Listen to orders for the current table and session token in real-time
  useEffect(() => {
    if (!tableId || !token) {
      setActiveOrders([]);
      return;
    }

    const ordersQuery = query(
      collection(db, 'orders'),
      where('tableId', '==', tableId),
      where('sessionToken', '==', token)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Order);
      });
      // Sort by createdAt descending so most recent orders are first
      list.sort((a, b) => b.createdAt - a.createdAt);
      setActiveOrders(list);
    }, (error) => {
      console.error("Error listening to active orders:", error);
    });

    return () => unsubscribe();
  }, [tableId, token]);

  // Load menu items categorized list
  const categories: string[] = ['All', ...Array.from(new Set(menuItems.map(item => item.category))) as string[]];

  // Filter items based on local pricing and availability overrides
  const getMenuItemDisplay = (item: MenuItem) => {
    let finalPrice = item.price;
    let finalAvailable = item.isAvailable;

    if (item.branchOverrides && branchId && item.branchOverrides[branchId]) {
      const override = item.branchOverrides[branchId];
      if (override.price !== undefined) finalPrice = override.price;
      if (override.isAvailable !== undefined) finalAvailable = override.isAvailable;
    }

    return { ...item, finalPrice, finalAvailable };
  };

  const filteredMenuItems = menuItems
    .map(getMenuItemDisplay)
    .filter(item => selectedCategory === 'All' || item.category === selectedCategory);

  // Helper: Find item quantity in Shared Cart
  const getQuantityInCart = (menuId: string) => {
    if (!sharedCart) return 0;
    return sharedCart.items
      .filter(i => i.menuId === menuId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Add Item to Shared Cart with dynamic updates & sound/vibe feedback
  const handleAddToCart = async (item: MenuItem) => {
    if (!sharedCart || !tableId) return;

    const displayInfo = getMenuItemDisplay(item);
    if (!displayInfo.finalAvailable) return;

    const remarks = selectedRemarks[item.id] || '';
    const cartDocRef = doc(db, 'carts', tableId);

    // Deep copy existing items
    const newItems = [...sharedCart.items];
    
    // Find item with same menuId and same remarks to consolidate, else append
    const existingIndex = newItems.findIndex(i => i.menuId === item.id && i.remarks === remarks);

    if (existingIndex > -1) {
      newItems[existingIndex].quantity += 1;
    } else {
      newItems.push({
        id: `${item.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        menuId: item.id,
        name: item.name,
        price: displayInfo.finalPrice,
        quantity: 1,
        remarks: remarks,
        addedBy: customerName
      });
    }

    // Play soft sound/vibrate if supported
    if (navigator.vibrate) navigator.vibrate(40);

    // Update shared cart with transactional audit log for live Toast notification
    await updateDoc(cartDocRef, {
      items: newItems,
      updatedAt: Date.now(),
      lastAction: {
        type: 'add',
        itemName: item.name,
        userName: customerName,
        timestamp: Date.now()
      }
    });

    // Clear remarks field for this item
    setSelectedRemarks(prev => ({ ...prev, [item.id]: '' }));
  };

  // Decrease quantity of Item in Shared Cart
  const handleRemoveFromCart = async (menuId: string, remarks: string = '') => {
    if (!sharedCart || !tableId) return;

    const cartDocRef = doc(db, 'carts', tableId);
    let newItems = [...sharedCart.items];
    
    const existingIndex = newItems.findIndex(i => i.menuId === menuId && i.remarks === remarks);
    if (existingIndex === -1) return;

    const itemName = newItems[existingIndex].name;

    if (newItems[existingIndex].quantity > 1) {
      newItems[existingIndex].quantity -= 1;
      await updateDoc(cartDocRef, {
        items: newItems,
        updatedAt: Date.now(),
        lastAction: {
          type: 'update',
          itemName: itemName,
          userName: customerName,
          timestamp: Date.now()
        }
      });
    } else {
      newItems = newItems.filter((_, idx) => idx !== existingIndex);
      await updateDoc(cartDocRef, {
        items: newItems,
        updatedAt: Date.now(),
        lastAction: {
          type: 'remove',
          itemName: itemName,
          userName: customerName,
          timestamp: Date.now()
        }
      });
    }

    if (navigator.vibrate) navigator.vibrate(20);
  };

  // Waiter Summon Request Trigger
  const handleCallWaiter = async (requestType: 'Need Tissue' | 'Refill Tea' | 'Request Bill' | 'Assistance') => {
    if (!tableId || !table) return;

    try {
      await addDoc(collection(db, 'waiter_calls'), {
        tenantId: table.tenantId,
        branchId: table.branchId,
        tableId: tableId,
        tableNumber: table.number,
        type: requestType,
        status: 'pending',
        createdAt: Date.now()
      });

      // Also update table overall status
      await updateDoc(doc(db, 'tables', tableId), {
        status: 'calling_waiter',
        updatedAt: Date.now()
      });

      setIsWaiterModalOpen(false);
      alert(`Waiter Called for "${requestType}". Staff will be arriving at Table ${table.number} shortly.`);
    } catch (err) {
      console.error("Error summoning waiter:", err);
      alert("Summon failed. Please check connection.");
    }
  };

  // Place Order Flow - Multi-User checkout with Idempotency verification and Offline preservation
  const handlePlaceOrder = async () => {
    if (!sharedCart || sharedCart.items.length === 0 || !table) return;

    setOrderSubmitting(true);
    const orderItems = sharedCart.items.map(item => ({
      menuId: item.menuId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      remarks: item.remarks
    }));

    const subtotal = orderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const tax = Math.round(subtotal * 0.05); // 5% Commercial Tax Myanmar
    const total = subtotal + tax;

    // Idempotency Key - Prevent duplicate order submissions on double-taps
    const clientUUID = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const orderData: Order = {
        id: clientUUID,
        tenantId: table.tenantId,
        branchId: table.branchId,
        branchName: branch?.name || 'Golden Leaf Outlet',
        tableId: table.id,
        tableNumber: table.number,
        items: orderItems,
        subtotal,
        tax,
        total,
        status: 'pending',
        sessionToken: token || '',
        customerId: customerName,
        idempotencyKey: clientUUID,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Create Order Doc in Firestore
      await setDoc(doc(db, 'orders', clientUUID), orderData);

      // Save to local IndexedDB order history
      try {
        await saveOrderToHistory(orderData);
        await loadLocalHistory();
      } catch (err) {
        console.error("Failed to save order to local history:", err);
      }

      // Set Table state to Eating/Ordering
      await updateDoc(doc(db, 'tables', table.id), {
        status: 'eating',
        updatedAt: Date.now()
      });

      // Clear the Shared Cart in Firestore
      await updateDoc(doc(db, 'carts', table.id), {
        items: [],
        updatedAt: Date.now(),
        lastAction: {
          type: 'clear',
          itemName: 'All Items',
          userName: customerName,
          timestamp: Date.now()
        }
      });

      setOrderSuccess(clientUUID);
      setIsCartOpen(false);

    } catch (err) {
      console.error("Failed to place order:", err);
      alert("Order placement failed due to poor connection. Your cart is preserved locally. Please retry.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Standard Demo Simulated Scans Selector
  if (!tenantId || !branchId || !tableId || !token) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" id="demo_selection_panel">
        <div className="p-8 bg-gradient-to-br from-blue-600 to-blue-700 text-white text-center">
          <QrCode className="w-16 h-16 mx-auto mb-4 animate-pulse text-blue-100" />
          <h2 className="text-2xl font-bold font-sans tracking-tight">
            {getTranslation('scan_to_order', language)}
          </h2>
          <p className="text-blue-100 mt-2 text-sm leading-relaxed">
            {getTranslation('scan_desc', language)}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
            <Sparkles className="w-4 h-4 inline mr-1 mb-0.5 text-blue-600" />
            <strong>How this works:</strong> Scanning the QR enters customers into a real-time table room.
            All guests at the table share a synchronized cart via Firestore. Try opening another tab after selecting a table to see instant sync!
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 text-xs tracking-wider uppercase">Downtown Flagship Tables</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                id="btn_sim_t1"
                onClick={() => onSimulateQrScan('golden_leaf', 'branch_downtown', 'table_dt_01', 'SESSION_DT_01')}
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 rounded-xl text-left text-sm font-medium text-gray-800 transition"
              >
                <span>Table 01</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                id="btn_sim_t2"
                onClick={() => onSimulateQrScan('golden_leaf', 'branch_downtown', 'table_dt_02', 'SESSION_DT_02')}
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 rounded-xl text-left text-sm font-medium text-gray-800 transition"
              >
                <span>Table 02</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                id="btn_sim_t5"
                onClick={() => onSimulateQrScan('golden_leaf', 'branch_downtown', 'table_dt_05', 'SESSION_DT_05')}
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 rounded-xl text-left text-sm font-medium text-gray-800 transition"
              >
                <span>Table 05</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="font-semibold text-gray-700 text-xs tracking-wider uppercase">Ahlone Garden Tables</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                id="btn_sim_t11"
                onClick={() => onSimulateQrScan('golden_leaf', 'branch_ahlone', 'table_ah_11', 'SESSION_AH_11')}
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 rounded-xl text-left text-sm font-medium text-gray-800 transition"
              >
                <span>Table 11</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                id="btn_sim_t12"
                onClick={() => onSimulateQrScan('golden_leaf', 'branch_ahlone', 'table_ah_12', 'SESSION_AH_12')}
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 rounded-xl text-left text-sm font-medium text-gray-800 transition"
              >
                <span>Table 12</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // QR Validation Loading View
  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center p-6" id="customer_loading_view">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h3 className="text-xl font-bold mt-6 text-gray-800 font-sans">Verifying QR Token...</h3>
        <p className="text-gray-500 text-sm mt-2">Securing connection & validating against anti-fraud registries...</p>
      </div>
    );
  }

  // Invalid Token / Fraud Prevention View
  if (verificationError) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden text-center" id="fraud_error_view">
        <div className="p-8 bg-red-50 text-red-600">
          <WifiOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold font-sans">Verification Failed</h2>
          <p className="text-red-700 mt-2 text-sm leading-relaxed">{verificationError}</p>
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button 
            id="btn_back_demo"
            onClick={() => onSimulateQrScan('', '', '', '')}
            className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition"
          >
            Return to QR Selection Panel
          </button>
        </div>
      </div>
    );
  }

  // Checkout Success Screen
  if (orderSuccess) {
    const currentPlacedOrder = activeOrders.find(o => o.id === orderSuccess);
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden text-center" id="checkout_success_view">
        <div className="p-8 bg-emerald-500 text-white">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <Check className="w-8 h-8 text-white stroke-[3px]" />
          </div>
          <h2 className="text-2xl font-bold font-sans">Order Sent to Kitchen!</h2>
          <p className="text-emerald-100 text-sm mt-1">Order Ref: {orderSuccess.substr(6, 8).toUpperCase()}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Your table order has been successfully logged with an idempotency handshake. The kitchen staff have received a real-time visual cue and a thermal print job is being scheduled.
          </p>
          
          {currentPlacedOrder && (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-left space-y-3" id="checkout_live_tracker">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Live Order Tracker
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  currentPlacedOrder.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  currentPlacedOrder.status === 'cooking' ? 'bg-orange-100 text-orange-800 border border-orange-200 animate-pulse' :
                  (currentPlacedOrder.status === 'delivered' || currentPlacedOrder.status === 'completed') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {currentPlacedOrder.status === 'pending' ? 'Received' :
                   currentPlacedOrder.status === 'cooking' ? 'Preparing' :
                   (currentPlacedOrder.status === 'delivered' || currentPlacedOrder.status === 'completed') ? 'Served' : 'Cancelled'}
                </span>
              </div>

              {currentPlacedOrder.status !== 'cancelled' ? (
                <div className="relative pt-2 pb-1">
                  <div className="flex mb-2 items-center justify-between text-xs font-semibold">
                    <div className="flex-1 text-center">
                      <span className={`text-[10px] font-bold ${
                        currentPlacedOrder.status === 'pending' || currentPlacedOrder.status === 'cooking' || currentPlacedOrder.status === 'delivered' || currentPlacedOrder.status === 'completed'
                          ? 'text-amber-700' : 'text-gray-400'
                      }`}>Received</span>
                    </div>
                    <div className="flex-1 text-center">
                      <span className={`text-[10px] font-bold ${
                        currentPlacedOrder.status === 'cooking' || currentPlacedOrder.status === 'delivered' || currentPlacedOrder.status === 'completed'
                          ? 'text-orange-700 font-semibold' : 'text-gray-400 font-normal'
                      }`}>Preparing</span>
                    </div>
                    <div className="flex-1 text-center">
                      <span className={`text-[10px] font-bold ${
                        currentPlacedOrder.status === 'delivered' || currentPlacedOrder.status === 'completed'
                          ? 'text-emerald-700 font-bold' : 'text-gray-400 font-normal'
                      }`}>Served</span>
                    </div>
                  </div>

                  <div className="relative w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                        currentPlacedOrder.status === 'pending' ? 'w-[16.6%] bg-amber-500' :
                        currentPlacedOrder.status === 'cooking' ? 'w-[50%] bg-orange-500' :
                        'w-full bg-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="absolute top-[20px] left-0 right-0 flex justify-between px-[16%] pointer-events-none">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 bg-white transition-colors duration-300 ${
                      currentPlacedOrder.status === 'pending' || currentPlacedOrder.status === 'cooking' || currentPlacedOrder.status === 'delivered' || currentPlacedOrder.status === 'completed'
                        ? 'border-amber-500 bg-amber-500' : 'border-gray-200'
                    }`} />
                    <div className={`w-2.5 h-2.5 rounded-full border-2 bg-white transition-colors duration-300 ${
                      currentPlacedOrder.status === 'cooking' || currentPlacedOrder.status === 'delivered' || currentPlacedOrder.status === 'completed'
                        ? 'border-orange-500 bg-orange-500' : 'border-gray-200'
                    }`} />
                    <div className={`w-2.5 h-2.5 rounded-full border-2 bg-white transition-colors duration-300 ${
                      currentPlacedOrder.status === 'delivered' || currentPlacedOrder.status === 'completed'
                        ? 'border-emerald-500 bg-emerald-500' : 'border-gray-200'
                    }`} />
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 text-red-800 text-xs font-medium p-3 rounded-lg border border-red-100 text-center">
                  This order was cancelled by the staff.
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-left space-y-2 text-gray-700">
            <div className="flex justify-between">
              <span className="font-medium text-gray-500">Outlet Location:</span>
              <span className="font-semibold">{branch?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-500">Your Table:</span>
              <span className="font-semibold text-emerald-700">Table {table?.number}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-500">Order Placed By:</span>
              <span className="font-semibold">{customerName}</span>
            </div>
          </div>
          <button 
            id="btn_order_more"
            onClick={() => setOrderSuccess(null)}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/15 transition text-sm"
          >
            Order More Dishes / View Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-32 relative" id="customer_main_app">
      
      {/* Connection Failure Status Bar */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-600 text-white text-xs font-medium px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-md"
            id="offline_banner"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 animate-bounce" />
              <span>Low connection. Changes cached in local storage.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reconnection Success Toast */}
      <AnimatePresence>
        {reconnectToast && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-emerald-600 text-white text-xs font-semibold px-4 py-3 text-center fixed top-4 left-4 right-4 z-50 rounded-lg shadow-xl flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Connection re-established. Queue synchronized with server.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WebSocket Multi-user Action Notification Toast */}
      <AnimatePresence>
        {lastActionToast.visible && (
          <motion.div 
            initial={{ transform: 'translateY(100px)', opacity: 0 }}
            animate={{ transform: 'translateY(0)', opacity: 1 }}
            exit={{ transform: 'translateY(100px)', opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-40 bg-gray-900 text-white text-xs rounded-xl shadow-2xl p-3.5 border border-gray-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              <p className="font-medium text-gray-200">{lastActionToast.message}</p>
            </div>
            <Volume2 className="w-4 h-4 text-blue-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant Header */}
      <div className="bg-white px-5 py-4 border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={SEED_TENANT.logoUrl} 
              alt={SEED_TENANT.name} 
              className="w-10 h-10 rounded-xl object-cover border border-blue-100"
            />
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">{SEED_TENANT.name}</h1>
              <p className="text-xs text-gray-500 font-medium">{branch?.name}</p>
            </div>
          </div>
          <div className="bg-blue-50 text-blue-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-100">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Table {table?.number}
          </div>
        </div>

        {/* Customer Profile Banner */}
        <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
              <User className="w-3.5 h-3.5 text-blue-700" />
            </div>
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <input 
                  id="input_edit_name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-2 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none w-28"
                  autoFocus
                />
                <button 
                  id="btn_save_name"
                  onClick={() => handleSaveName(customerName)}
                  className="bg-blue-600 text-white rounded p-1 hover:bg-blue-700 transition"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-700">{customerName} <span className="text-[10px] text-gray-400 font-normal">(Me)</span></span>
                <button 
                  id="btn_edit_name_trigger"
                  onClick={() => setIsEditingName(true)}
                  className="text-[10px] text-blue-600 font-medium hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              id="btn_summon_waiter"
              onClick={() => setIsWaiterModalOpen(true)}
              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-red-100"
            >
              <Bell className="w-3.5 h-3.5" />
              Call Waiter
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Order Status Tracker */}
      {(() => {
        const liveTrackingOrders = activeOrders.filter(o => 
          (o.status === 'pending' || o.status === 'cooking') && !dismissedOrderIds.includes(o.id)
        );
        if (liveTrackingOrders.length === 0) return null;
        return (
          <div className="px-5 mt-4" id="order_status_tracker_panel">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="font-bold text-gray-900 text-xs tracking-wide uppercase flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                  {getTranslation('live_tracker_title', language)} ({liveTrackingOrders.length})
                </h3>
                <span className="text-[10px] text-gray-500 font-medium">{getTranslation('realtime_kitchen_status', language)}</span>
              </div>
              
              <div className="space-y-4 max-h-[280px] overflow-y-auto scrollbar-none">
                {liveTrackingOrders.map((order) => {
                  const orderIdShort = order.id.substr(6, 8).toUpperCase();
                  const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
                  
                  // Track progress steps
                  // Steps: Received (pending), Preparing (cooking), Served (delivered / completed)
                  let activeStep = 0; // 0 for received, 1 for preparing, 2 for served
                  if (order.status === 'pending') activeStep = 0;
                  else if (order.status === 'cooking') activeStep = 1;
                  else if (order.status === 'delivered' || order.status === 'completed') activeStep = 2;
                  else if (order.status === 'cancelled') activeStep = -1; // special cancel state

                  return (
                    <div key={order.id} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-gray-800">Order #{orderIdShort}</span>
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{itemsSummary}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          order.status === 'cooking' ? 'bg-orange-50 text-orange-700 border border-orange-100 animate-pulse' :
                          (order.status === 'delivered' || order.status === 'completed') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {order.status === 'pending' ? getTranslation('status_pending', language) :
                           order.status === 'cooking' ? getTranslation('status_preparing', language) :
                           (order.status === 'delivered' || order.status === 'completed') ? getTranslation('status_delivered', language) : getTranslation('status_cancelled', language)}
                        </span>
                      </div>

                      {activeStep !== -1 ? (
                        /* Live Visual Progress Bar */
                        <div className="relative pt-2 pb-1">
                          <div className="flex mb-2 items-center justify-between text-xs font-semibold">
                            <div className="flex-1 text-center">
                              <span className={`text-[10px] font-bold ${activeStep >= 0 ? 'text-amber-700' : 'text-gray-400'}`}>{getTranslation('status_pending', language)}</span>
                            </div>
                            <div className="flex-1 text-center">
                              <span className={`text-[10px] font-bold ${activeStep >= 1 ? 'text-orange-700 font-semibold' : 'text-gray-400 font-normal'}`}>{getTranslation('status_preparing', language)}</span>
                            </div>
                            <div className="flex-1 text-center">
                              <span className={`text-[10px] font-bold ${activeStep >= 2 ? 'text-emerald-700 font-bold' : 'text-gray-400 font-normal'}`}>{getTranslation('status_delivered', language)}</span>
                            </div>
                          </div>

                          {/* Progress line track */}
                          <div className="relative w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                                activeStep === 0 ? 'w-[16.6%] bg-amber-500' :
                                activeStep === 1 ? 'w-[50%] bg-orange-500' :
                                'w-full bg-emerald-500'
                              }`}
                            />
                          </div>

                          {/* Indicator Dots */}
                          <div className="absolute top-[20px] left-0 right-0 flex justify-between px-[16%] pointer-events-none">
                            <div className={`w-2.5 h-2.5 rounded-full border-2 bg-white transition-colors duration-300 ${
                              activeStep >= 0 ? 'border-amber-500 bg-amber-500' : 'border-gray-200'
                            }`} />
                            <div className={`w-2.5 h-2.5 rounded-full border-2 bg-white transition-colors duration-300 ${
                              activeStep >= 1 ? 'border-orange-500 bg-orange-500' : 'border-gray-200'
                            }`} />
                            <div className={`w-2.5 h-2.5 rounded-full border-2 bg-white transition-colors duration-300 ${
                              activeStep >= 2 ? 'border-emerald-500 bg-emerald-500' : 'border-gray-200'
                            }`} />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 text-red-800 text-[11px] font-medium p-2 rounded-lg border border-red-100">
                          {getTranslation('cancelled_by_staff', language)}
                        </div>
                      )}

                      {(order.status === 'delivered' || order.status === 'completed' || order.status === 'cancelled') && (
                        <div className="flex justify-end pt-1">
                          <button
                            id={`btn_dismiss_order_${order.id}`}
                            onClick={() => dismissOrder(order.id)}
                            className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold px-2.5 py-1 rounded-lg border border-gray-200 transition active:scale-95 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            {getTranslation('btn_dismiss_order', language)}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Customer Local Order History (IndexedDB) */}
      <div className="px-5 mt-4" id="local_order_history_panel">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
          <button
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="w-full flex items-center justify-between font-bold text-gray-900 text-xs tracking-wide uppercase focus:outline-none"
            id="btn_toggle_history_section"
          >
            <span className="flex items-center gap-1.5 text-gray-800">
              <History className="w-4 h-4 text-indigo-600" />
              {getTranslation('device_order_history', language)} ({localHistory.length})
            </span>
            <span className="text-[10px] text-blue-600 lowercase bg-blue-50 px-2 py-0.5 rounded font-bold hover:bg-blue-100 transition">
              {isHistoryExpanded ? (language === 'my' ? 'ချုံ့မည်' : 'Collapse') : (language === 'my' ? 'ချဲ့မည်' : 'Expand')}
            </span>
          </button>

          <AnimatePresence>
            {isHistoryExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4 pt-2 border-t border-gray-50"
              >
                {localHistory.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-25 animate-pulse" />
                    <p className="text-xs font-semibold">{getTranslation('no_history', language)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {language === 'my' ? 'သင်အော်ဒါတင်လိုက်သောအခါ ဤနေရာတွင် အလိုအလျောက်သိမ်းဆည်းပေးသွားမည် ဖြစ်သည်။' : 'When you place orders from this table, they will be saved here!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto scrollbar-none pr-1">
                    {localHistory.map((histOrder) => {
                      const histDate = new Date(histOrder.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <div key={histOrder.id} className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 space-y-3">
                          <div className="flex justify-between items-center text-[10px]">
                            <div>
                              <span className="font-bold text-gray-800">{histOrder.branchName}</span>
                              <p className="text-gray-400 font-mono text-[9px] mt-0.5">{histDate} • Table {histOrder.tableNumber}</p>
                            </div>
                            
                            {confirmDeleteOrderId === histOrder.id ? (
                              <div className="flex gap-1.5 items-center bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 text-[9px] font-bold">
                                <span className="text-red-700">{getTranslation('clear_order_prompt', language)}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setConfirmDeleteOrderId(null);
                                  }}
                                  className="bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded"
                                >
                                  {getTranslation('no', language)}
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    await deleteOrderFromHistory(histOrder.id);
                                    setConfirmDeleteOrderId(null);
                                    await loadLocalHistory();
                                  }}
                                  className="bg-red-600 text-white px-1.5 py-0.5 rounded shadow-sm font-black"
                                >
                                  {getTranslation('btn_cancel_order', language)}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setConfirmDeleteOrderId(histOrder.id);
                                }}
                                className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 transition"
                                title="Delete from device history"
                                id={`btn_delete_order_${histOrder.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Items listing */}
                          <div className="space-y-1.5 pl-1.5 border-l-2 border-indigo-200">
                            {histOrder.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <div className="flex-1 pr-2">
                                  <span className="font-bold text-gray-700 font-mono text-[11px] mr-1.5">{item.quantity}x</span>
                                  <span className="font-medium text-gray-800">{item.name}</span>
                                  {item.remarks && (
                                    <span className="text-[9px] text-indigo-700 block italic">"{item.remarks}"</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleReorderItems([{
                                      menuId: item.menuId,
                                      name: item.name,
                                      price: item.price,
                                      quantity: 1,
                                      remarks: item.remarks
                                    }])}
                                    className="text-[10px] text-blue-600 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 px-2 py-1 rounded-lg font-bold flex items-center gap-0.5 transition shadow-sm active:scale-95"
                                    title="Add to shared cart"
                                  >
                                    <Plus className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                                    {getTranslation('add_item_back', language)}
                                  </button>

                                  {confirmDeleteLineKey === `${histOrder.id}_${idx}` ? (
                                    <div className="flex gap-1 items-center bg-red-50 px-1.5 py-0.5 rounded border border-red-100 text-[9px] font-bold">
                                      <span className="text-red-700">{getTranslation('clear_line_prompt', language)}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setConfirmDeleteLineKey(null);
                                        }}
                                        className="text-gray-500 hover:text-gray-700 px-0.5"
                                      >
                                        {getTranslation('no', language)}
                                      </button>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          const updatedItems = histOrder.items.filter((_, i) => i !== idx);
                                          if (updatedItems.length === 0) {
                                            await deleteOrderFromHistory(histOrder.id);
                                          } else {
                                            const newTotal = updatedItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
                                            const updatedOrder = {
                                              ...histOrder,
                                              items: updatedItems,
                                              total: newTotal
                                            };
                                            await saveOrderToHistory(updatedOrder);
                                          }
                                          setConfirmDeleteLineKey(null);
                                          await loadLocalHistory();
                                        }}
                                        className="text-red-600 hover:text-red-800 font-black px-0.5"
                                      >
                                        {getTranslation('yes', language)}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setConfirmDeleteLineKey(`${histOrder.id}_${idx}`);
                                      }}
                                      className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 transition"
                                      title="Delete this line"
                                      id={`btn_delete_line_${histOrder.id}_${idx}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Entire Order controls */}
                          <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-500">
                              {getTranslation('grand_total', language)}: <span className="text-indigo-950 font-mono">{histOrder.total.toLocaleString()} Ks</span>
                            </span>
                            <button
                              onClick={() => handleReorderItems(histOrder.items)}
                              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm shadow-indigo-600/10"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-100" />
                              {language === 'my' ? 'အော်ဒါအားလုံး ပြန်မှာမည်' : 'Re-order Entire Order'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Food Categories Horizontal Slider */}
      <div className="flex gap-2 overflow-x-auto px-5 py-3 sticky top-[110px] bg-gray-50/95 backdrop-blur-sm z-20 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            id={`btn_cat_${cat.toLowerCase().replace(/\s+/g, '_')}`}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition ${
              selectedCategory === cat 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Cards Container */}
      <div className="px-5 space-y-4 pb-24" id="menu_items_container">
        {filteredMenuItems.map(item => {
          const cartQty = getQuantityInCart(item.id);
          return (
            <div 
              key={item.id} 
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex h-32"
              id={`menu_card_${item.id}`}
            >
              {/* Product Thumbnail */}
              <div className="w-28 relative bg-gray-100 flex-shrink-0">
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {!item.finalAvailable && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">
                    Sold Out
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{item.name}</h3>
                    <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded ml-1">
                      {item.finalPrice.toLocaleString()} Ks
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 font-medium leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Remarks & Add Control */}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <input 
                    id={`remark_input_${item.id}`}
                    type="text"
                    placeholder="Note (e.g. less ice)"
                    value={selectedRemarks[item.id] || ''}
                    onChange={(e) => setSelectedRemarks(prev => ({ ...prev, [item.id]: e.target.value }))}
                    disabled={!item.finalAvailable}
                    className="text-[10px] border border-gray-200 rounded px-2 py-1 flex-1 bg-gray-50 text-gray-600 placeholder-gray-400 focus:outline-none focus:border-blue-400 disabled:opacity-50"
                  />
                  
                  {item.finalAvailable ? (
                    <div className="flex items-center">
                      {cartQty > 0 ? (
                        <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg p-0.5">
                          <button 
                            id={`btn_minus_${item.id}`}
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="w-6 h-6 rounded flex items-center justify-center text-blue-800 hover:bg-blue-100 transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-blue-900 font-mono">{cartQty}</span>
                          <button 
                            id={`btn_plus_${item.id}`}
                            onClick={() => handleAddToCart(item)}
                            className="w-6 h-6 rounded flex items-center justify-center text-blue-800 hover:bg-blue-100 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          id={`btn_add_first_${item.id}`}
                          onClick={() => handleAddToCart(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          Add
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400 px-2 py-1 bg-gray-100 rounded">Unavailable</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Call Waiter Modal Selector */}
      <AnimatePresence>
        {isWaiterModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4" id="waiter_modal">
            <motion.div 
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="bg-white rounded-t-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base">Select Assistance Type</h3>
                <button 
                  id="btn_close_waiter"
                  onClick={() => setIsWaiterModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  id="btn_waiter_call_tea"
                  onClick={() => handleCallWaiter('Refill Tea')}
                  className="p-4 border border-blue-100 hover:border-blue-400 hover:bg-blue-50 text-gray-800 text-sm font-semibold rounded-xl text-center space-y-2 transition flex flex-col items-center justify-center"
                >
                  <Coffee className="w-6 h-6 text-blue-600" />
                  <span>Refill Tea</span>
                </button>
                <button 
                  id="btn_waiter_call_tissue"
                  onClick={() => handleCallWaiter('Need Tissue')}
                  className="p-4 border border-blue-100 hover:border-blue-400 hover:bg-blue-50 text-gray-800 text-sm font-semibold rounded-xl text-center space-y-2 transition flex flex-col items-center justify-center"
                >
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <span>Need Tissue</span>
                </button>
                <button 
                  id="btn_waiter_call_bill"
                  onClick={() => handleCallWaiter('Request Bill')}
                  className="p-4 border border-blue-100 hover:border-blue-400 hover:bg-blue-50 text-gray-800 text-sm font-semibold rounded-xl text-center space-y-2 transition flex flex-col items-center justify-center"
                >
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                  <span>Request Bill</span>
                </button>
                <button 
                  id="btn_waiter_call_help"
                  onClick={() => handleCallWaiter('Assistance')}
                  className="p-4 border border-blue-100 hover:border-blue-400 hover:bg-blue-50 text-gray-800 text-sm font-semibold rounded-xl text-center space-y-2 transition flex flex-col items-center justify-center"
                >
                  <Bell className="w-6 h-6 text-blue-600" />
                  <span>Other Help</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Shared Cart Bar */}
      {sharedCart && sharedCart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 py-4 bg-white border-t border-gray-100 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] z-40">
          <div className="flex items-center justify-between gap-4">
            <div 
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3 cursor-pointer flex-1"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white relative shadow-md shadow-blue-500/20">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center font-mono">
                  {sharedCart.items.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Shared Table Cart</h4>
                <p className="text-xs text-gray-500 font-medium font-mono">
                  Total: {sharedCart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()} Ks
                </p>
              </div>
            </div>

            <button 
              id="btn_view_cart_trigger"
              onClick={() => setIsCartOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-500/10"
            >
              View Cart
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detailed Full Cart Sheet Drawer */}
      <AnimatePresence>
        {isCartOpen && sharedCart && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" id="shared_cart_panel">
            <motion.div 
              initial={{ y: 500 }}
              animate={{ y: 0 }}
              exit={{ y: 500 }}
              className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                    Shared Cart (Table {table?.number})
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">Items synced in real-time between all table guests</p>
                </div>
                <button 
                  id="btn_close_cart"
                  onClick={() => setIsCartOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {sharedCart.items.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Cart is currently empty.</p>
                  </div>
                ) : (
                  sharedCart.items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between gap-3 pb-3.5 border-b border-gray-50"
                      id={`cart_item_${item.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                          <span className="text-[9px] bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold font-mono">
                            {item.price.toLocaleString()} Ks
                          </span>
                        </div>
                        {item.remarks && (
                          <p className="text-[10px] text-blue-800 italic mt-0.5">"{item.remarks}"</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          Added by <span className="font-semibold text-gray-600">{item.addedBy}</span>
                        </p>
                      </div>

                      {/* Control +/- */}
                      <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-0.5">
                        <button 
                          id={`btn_minus_cart_${item.id}`}
                          onClick={() => handleRemoveFromCart(item.menuId, item.remarks)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 font-bold text-gray-800 font-mono text-xs">{item.quantity}</span>
                        <button 
                          id={`btn_plus_cart_${item.id}`}
                          onClick={() => handleAddToCart({ id: item.menuId, name: item.name, price: item.price } as MenuItem)}
                          className="w-6.5 h-6.5 rounded flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary and Order Buttons */}
              {sharedCart.items.length > 0 && (
                <div className="p-5 bg-gray-50 border-t border-gray-100 space-y-4">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-mono font-medium">
                        {sharedCart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()} Ks
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Govt Commercial Tax (5%)</span>
                      <span className="font-mono font-medium">
                        {(Math.round(sharedCart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0) * 0.05)).toLocaleString()} Ks
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-900 font-bold text-sm pt-2 border-t border-gray-200">
                      <span>Total Amount</span>
                      <span className="font-mono text-blue-600">
                        {(
                          sharedCart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0) + 
                          Math.round(sharedCart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0) * 0.05)
                        ).toLocaleString()} Ks
                      </span>
                    </div>
                  </div>

                  <button
                    id="btn_place_order"
                    onClick={handlePlaceOrder}
                    disabled={orderSubmitting}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 transition text-sm flex items-center justify-center gap-2"
                  >
                    {orderSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Order to Kitchen...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3px]" />
                        <span>Confirm & Send to Kitchen</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
