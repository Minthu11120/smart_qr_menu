import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketProps {
  type: "customer" | "staff";
  branchId: string;
  tableId?: string;
}

export function useSocket({ type, branchId, tableId }: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // References to keep event handlers stable without re-binding sockets
  const onCartUpdatedRef = useRef<((items: any[]) => void) | null>(null);
  const onCartClearedRef = useRef<(() => void) | null>(null);
  const onOrderNewRef = useRef<((order: any) => void) | null>(null);
  const onOrderStatusUpdatedCustomerRef = useRef<((data: { orderId: string; status: string }) => void) | null>(null);
  const onWaiterCallNewRef = useRef<((call: any) => void) | null>(null);
  const onWaiterCallResolvedRef = useRef<((data: { callId: string }) => void) | null>(null);
  const onTableSettledRef = useRef<((data: { tableId: string }) => void) | null>(null);

  // Helper setters to allow components to attach callbacks dynamically
  const registerCartUpdate = (cb: (items: any[]) => void) => { onCartUpdatedRef.current = cb; };
  const registerCartCleared = (cb: () => void) => { onCartClearedRef.current = cb; };
  const registerOrderNew = (cb: (order: any) => void) => { onOrderNewRef.current = cb; };
  const registerOrderStatusCustomer = (cb: (data: { orderId: string; status: string }) => void) => { onOrderStatusUpdatedCustomerRef.current = cb; };
  const registerWaiterCall = (cb: (call: any) => void) => { onWaiterCallNewRef.current = cb; };
  const registerWaiterCallResolved = (cb: (data: { callId: string }) => void) => { onWaiterCallResolvedRef.current = cb; };
  const registerTableSettled = (cb: (data: { tableId: string }) => void) => { onTableSettledRef.current = cb; };

  useEffect(() => {
    // 1. Initialize client socket pointing to Next.js / Express URL
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    
    const socketInstance = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    setSocket(socketInstance);

    // ==========================================
    // SOCKET LIFE-CYCLE EVENT LISTENERS
    // ==========================================
    socketInstance.on("connect", () => {
      console.log(`🔌 Connected to WebSocket Server: ${socketInstance.id}`);
      setIsConnected(true);
      setConnectionError(null);

      // Join dynamic branch or table room immediately on connect/reconnect
      socketInstance.emit("room:join", { type, branchId, tableId });
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn(`🔌 Disconnected from WebSocket: ${reason}`);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        // the server has forcefully disconnected the socket, retry manually
        socketInstance.connect();
      }
    });

    socketInstance.on("connect_error", (error) => {
      console.error("🔌 Socket Connection Error:", error);
      setConnectionError(error.message);
    });

    // ==========================================
    // CORE REAL-TIME BUSINESS SYNC LISTENERS
    // ==========================================
    
    // A. Cart synchronization events
    socketInstance.on("cart:updated", ({ items }: { items: any[] }) => {
      if (onCartUpdatedRef.current) {
        onCartUpdatedRef.current(items);
      }
    });

    socketInstance.on("cart:cleared", () => {
      if (onCartClearedRef.current) {
        onCartClearedRef.current();
      }
    });

    // B. Order synchronization events
    socketInstance.on("order:new", (order) => {
      if (onOrderNewRef.current) {
        onOrderNewRef.current(order);
      }
    });

    socketInstance.on("order:status_updated_customer", (data: { orderId: string; status: string }) => {
      if (onOrderStatusUpdatedCustomerRef.current) {
        onOrderStatusUpdatedCustomerRef.current(data);
      }
    });

    // C. Waiter call alerts
    socketInstance.on("waiter:call_new", (call) => {
      if (onWaiterCallNewRef.current) {
        onWaiterCallNewRef.current(call);
      }
    });

    socketInstance.on("waiter:call_resolved_sync", (data: { callId: string }) => {
      if (onWaiterCallResolvedRef.current) {
        onWaiterCallResolvedRef.current(data);
      }
    });

    // D. Table settlements / session clearance
    socketInstance.on("table:settled_customer_force_redirect", (data: { tableId: string }) => {
      if (onTableSettledRef.current) {
        onTableSettledRef.current(data);
      }
    });

    // Cleanup logic on unmount: avoids redundant event registrations and leaks
    return () => {
      console.log("🧹 Tearing down active socket listeners...");
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("connect_error");
      socketInstance.off("cart:updated");
      socketInstance.off("cart:cleared");
      socketInstance.off("order:new");
      socketInstance.off("order:status_updated_customer");
      socketInstance.off("waiter:call_new");
      socketInstance.off("waiter:call_resolved_sync");
      socketInstance.off("table:settled_customer_force_redirect");
      socketInstance.disconnect();
    };
  }, [type, branchId, tableId]);

  // Client emission helpers
  const emitCartUpdate = (items: any[]) => {
    if (socket && isConnected) {
      socket.emit("cart:update", { tableId, tenantId: "tenant-id", branchId, items });
    }
  };

  const emitOrderCreate = (payload: any) => {
    if (socket && isConnected) {
      socket.emit("order:create", payload);
    }
  };

  const emitOrderStatusUpdate = (orderId: string, status: string, tId: string) => {
    if (socket && isConnected) {
      socket.emit("order:status_update", { orderId, status, tableId: tId, branchId });
    }
  };

  const emitWaiterCallDispatch = (payload: { id: string; tableId: string; tableNumber: string; type: string }) => {
    if (socket && isConnected) {
      socket.emit("waiter:call_dispatch", { ...payload, tenantId: "tenant-id", branchId });
    }
  };

  const emitWaiterCallResolve = (callId: string, tId: string) => {
    if (socket && isConnected) {
      socket.emit("waiter:call_resolve", { callId, tableId: tId, branchId });
    }
  };

  const emitTableSettle = (tId: string, newSessionToken: string) => {
    if (socket && isConnected) {
      socket.emit("table:settle_bill", { tableId: tId, branchId, newSessionToken });
    }
  };

  return {
    socket,
    isConnected,
    connectionError,
    // Emitters
    emitCartUpdate,
    emitOrderCreate,
    emitOrderStatusUpdate,
    emitWaiterCallDispatch,
    emitWaiterCallResolve,
    emitTableSettle,
    // Listener Register Functions
    registerCartUpdate,
    registerCartCleared,
    registerOrderNew,
    registerOrderStatusCustomer,
    registerWaiterCall,
    registerWaiterCallResolved,
    registerTableSettled
  };
}
