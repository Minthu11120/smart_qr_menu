import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Tenant, Branch, Table, UserProfile } from '../types';
import { seedDatabase } from '../data/seedData';
import { getTranslation, Language } from '../utils/i18n';
import { 
  ShieldCheck, 
  Settings, 
  Database, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Layers, 
  RefreshCw, 
  Plus, 
  Check, 
  Activity,
  X,
  QrCode,
  Printer,
  KeyRound,
  Copy,
  Trash2,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface AdminPortalProps {
  language: Language;
}

export default function AdminPortal({ language }: AdminPortalProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  // New Tenant Form
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantDesc, setNewTenantDesc] = useState('');
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);

  // QR Generator States
  const [selectedTenantId, setSelectedTenantId] = useState<string>('golden_leaf');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('branch_downtown');
  const [newTableNum, setNewTableNum] = useState<string>('');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printSingleTable, setPrintSingleTable] = useState<Table | null>(null);
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);

  useEffect(() => {
    const unsubTenants = onSnapshot(collection(db, 'tenants'), (snap) => {
      const list: Tenant[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Tenant));
      setTenants(list);
    });

    const unsubBranches = onSnapshot(collection(db, 'branches'), (snap) => {
      const list: Branch[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Branch));
      setBranches(list);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(list);
    });

    const unsubTables = onSnapshot(collection(db, 'tables'), (snap) => {
      const list: Table[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Table));
      setTables(list);
    });

    return () => {
      unsubTenants();
      unsubBranches();
      unsubUsers();
      unsubTables();
    };
  }, []);

  // Set default selected branch when tenant or branches load
  useEffect(() => {
    const tenantBranches = branches.filter(b => b.tenantId === selectedTenantId);
    if (tenantBranches.length > 0) {
      // Keep selected branch if it belongs to selected tenant, else pick first
      const exists = tenantBranches.some(b => b.id === selectedBranchId);
      if (!exists) {
        setSelectedBranchId(tenantBranches[0].id);
      }
    } else {
      setSelectedBranchId('');
    }
  }, [selectedTenantId, branches]);

  const handleSeedAction = async () => {
    setIsSeeding(true);
    try {
      await seedDatabase();
      alert("Database successfully seeded with elegant default menu items, tables, branches, and roles!");
    } catch (e) {
      console.error(e);
      alert("Database seeding failed. Please check your Firestore connection.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName) return;

    try {
      const id = newTenantName.toLowerCase().replace(/\s+/g, '_');
      const tenant: Tenant = {
        id,
        name: newTenantName,
        description: newTenantDesc,
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'tenants', id), tenant);
      setIsTenantModalOpen(false);
      setNewTenantName('');
      setNewTenantDesc('');
      alert(`Tenant ${newTenantName} successfully registered in SaaS directory!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum || !selectedBranchId || !selectedTenantId) {
      alert("Please enter a valid table number and select a branch.");
      return;
    }

    const cleanNum = newTableNum.trim().padStart(2, '0');
    if (cleanNum.length === 0) return;

    // Check if table number already exists in this branch
    const branchTables = tables.filter(t => t.branchId === selectedBranchId && t.tenantId === selectedTenantId);
    if (branchTables.some(t => t.number === cleanNum)) {
      alert(`Table ${cleanNum} already exists in this branch.`);
      return;
    }

    try {
      const branchSuffix = selectedBranchId.replace('branch_', '');
      const tableId = `table_${branchSuffix}_${cleanNum}`;
      const sessionToken = `SESS_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const newTable: Table = {
        id: tableId,
        tenantId: selectedTenantId,
        branchId: selectedBranchId,
        number: cleanNum,
        status: 'empty',
        activeSessionToken: sessionToken,
        updatedAt: Date.now()
      };

      await setDoc(doc(db, 'tables', tableId), newTable);
      setNewTableNum('');
    } catch (err) {
      console.error("Error adding secure table:", err);
      alert("Failed to register new secure table. Check Firestore database connection.");
    }
  };

  const handleRotateToken = async (tableId: string) => {
    try {
      const newToken = `SESS_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const tableRef = doc(db, 'tables', tableId);
      await setDoc(tableRef, {
        activeSessionToken: newToken,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (err) {
      console.error("Error rotating secure token:", err);
      alert("Failed to rotate secure token.");
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!window.confirm("Are you sure you want to delete this table? Customers will no longer be able to order using its QR code.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'tables', tableId));
    } catch (err) {
      console.error("Error deleting table:", err);
      alert("Failed to delete table.");
    }
  };

  const getSecureUrl = (table: Table) => {
    return `${window.location.origin}/?r=${table.tenantId}&b=${table.branchId}&t=${table.id}&token=${table.activeSessionToken}`;
  };

  const handleCopyUrl = (table: Table) => {
    const url = getSecureUrl(table);
    navigator.clipboard.writeText(url);
    setCopiedTableId(table.id);
    setTimeout(() => setCopiedTableId(null), 2000);
  };


  return (
    <div className="bg-gray-50 min-h-[70vh] p-6 space-y-6" id="admin_portal_root">
      
      {/* Super Admin Info Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-violet-100" />
            <h2 className="text-xl font-bold font-sans tracking-tight">{getTranslation('super_admin_portal', language)}</h2>
          </div>
          <p className="text-violet-100 text-xs mt-1 leading-relaxed max-w-xl">
            {language === 'my'
              ? 'SaaS စနစ်တစ်ခုလုံးကို ခြုံငုံကြည့်ရှုနိုင်သောနေရာ ဖြစ်ပါသည်။ စားသောက်ဆိုင် လုပ်ငန်းရှင်သစ်များ စာရင်းသွင်းခြင်း၊ ဆိုင်ခွဲများစောင့်ကြည့်ခြင်းနှင့် နမူနာဒေတာများ ပြန်လည်ထည့်သွင်းခြင်းများကို ဆောင်ရွက်နိုင်ပါသည်။'
              : 'System-wide platform overview. Manage SME tenant registrations, track cloud SaaS subscription tiers, and control system initialization states.'}
          </p>
        </div>

        <button
          id="btn_admin_seed_db"
          onClick={handleSeedAction}
          disabled={isSeeding}
          className="bg-white/15 hover:bg-white/25 active:bg-white/10 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition border border-white/15"
        >
          <Database className="w-4 h-4" />
          {isSeeding ? (language === 'my' ? 'နမူနာဒေတာများ ပြန်လည်ထည့်သွင်းနေပါသည်...' : 'Seeding Database...') : getTranslation('database_seed', language)}
        </button>
      </div>

      {/* Grid Analytics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">{getTranslation('tenants_list', language)}</span>
            <span className="text-2xl font-black text-gray-900 font-mono mt-1 block">{tenants.length} {language === 'my' ? 'ဦး' : 'Tenants'}</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">{getTranslation('branches_list', language)}</span>
            <span className="text-2xl font-black text-gray-900 font-mono mt-1 block">{branches.length} {language === 'my' ? 'ဆိုင်ခွဲ' : 'Outlets'}</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">{language === 'my' ? 'ဝန်ထမ်းစာရင်း' : 'Registered Staff'}</span>
            <span className="text-2xl font-black text-gray-900 font-mono mt-1 block">{users.length} {language === 'my' ? 'ဦး' : 'Users'}</span>
          </div>
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">{language === 'my' ? 'အသုံးပြုနေသော စားပွဲများ' : 'Active QR Tables'}</span>
            <span className="text-2xl font-black text-gray-900 font-mono mt-1 block">{tables.length} {language === 'my' ? 'လုံး' : 'Rooms'}</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <QrCode className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Directory Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Registry */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-500" />
              SME Restaurant Registries
            </h3>
            <button 
              id="btn_admin_add_tenant"
              onClick={() => setIsTenantModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Brand
            </button>
          </div>

          <div className="space-y-3">
            {tenants.map(ten => (
              <div key={ten.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{ten.name}</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{ten.description || 'No description provided.'}</p>
                </div>
                <div className="bg-violet-50 text-violet-700 font-mono text-[9px] font-bold px-2 py-1 rounded">
                  {ten.id.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Status Tiers */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-500" />
              SaaS Subscription Billing Tiers
            </h3>
          </div>

          <div className="space-y-3">
            <div className="p-4 border border-gray-100 rounded-xl flex justify-between items-center bg-emerald-50/30 border-emerald-100">
              <div>
                <h4 className="font-bold text-emerald-950 text-xs">Golden Leaf Tea House</h4>
                <p className="text-[10px] text-emerald-700 font-semibold font-mono">Premium Enterprise Tier</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase">Active</span>
            </div>

            <div className="p-4 border border-gray-100 rounded-xl flex justify-between items-center bg-gray-50 opacity-60">
              <div>
                <h4 className="font-bold text-gray-800 text-xs">Mandalay Palace Bistro</h4>
                <p className="text-[10px] text-gray-500 font-mono">Basic Trial Tier</p>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded uppercase">Suspended</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secure Smart-Table QR Generator & Printing Station */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-fade-in" id="qr_generator_station">
        <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-gray-905 text-sm flex items-center gap-2">
              <QrCode className="w-4.5 h-4.5 text-indigo-600" />
              Smart-Table QR Generator & Printing Station
            </h3>
            <p className="text-gray-550 text-[11px] mt-1 font-medium leading-relaxed">
              Configure physical tables, rotating handshake tokens, and download/print vector-scannable dining cards for on-premise diners.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPrintSingleTable(null);
                setIsPrintPreviewOpen(true);
              }}
              disabled={tables.filter(t => t.branchId === selectedBranchId && t.tenantId === selectedTenantId).length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
              id="btn_print_all_qr"
            >
              <Printer className="w-4 h-4" />
              Print Branch QR Sheets ({tables.filter(t => t.branchId === selectedBranchId && t.tenantId === selectedTenantId).length})
            </button>
          </div>
        </div>

        {/* Filters and New Table addition */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select SaaS SME Brand</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full bg-white border border-gray-200 p-2 rounded-lg text-xs font-semibold text-gray-700 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Active Outlet</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full bg-white border border-gray-200 p-2 rounded-lg text-xs font-semibold text-gray-700 focus:ring-1 focus:ring-indigo-500 outline-none"
              disabled={branches.filter(b => b.tenantId === selectedTenantId).length === 0}
            >
              {branches.filter(b => b.tenantId === selectedTenantId).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
              {branches.filter(b => b.tenantId === selectedTenantId).length === 0 && (
                <option value="">No outlets registered</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Register New Table</label>
            <form onSubmit={handleAddTable} className="flex gap-2">
              <input
                type="text"
                maxLength={3}
                placeholder="e.g. 05"
                value={newTableNum}
                onChange={(e) => setNewTableNum(e.target.value.replace(/\D/g, ''))}
                className="w-20 bg-white border border-gray-200 px-3 py-1 rounded-lg text-xs font-bold text-center focus:ring-1 focus:ring-indigo-500 outline-none text-gray-800"
              />
              <button
                type="submit"
                disabled={!newTableNum || !selectedBranchId}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Secure Table
              </button>
            </form>
          </div>
        </div>

        {/* QR List Grid */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Configured Dining Rooms ({tables.filter(t => t.branchId === selectedBranchId && t.tenantId === selectedTenantId).length})
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-indigo-500" />
              Handshake tokens invalidate old scans on table settlement.
            </span>
          </div>

          {tables.filter(t => t.branchId === selectedBranchId && t.tenantId === selectedTenantId).length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
              <QrCode className="w-10 h-10 text-gray-300 mx-auto animate-pulse mb-2" />
              <p className="text-xs font-bold text-gray-500">No tables configured for this branch</p>
              <p className="text-[10px] text-gray-400 mt-1">Use the quick registration form above to create Table Room 01, 02 etc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tables.filter(t => t.branchId === selectedBranchId && t.tenantId === selectedTenantId)
                .sort((a, b) => a.number.localeCompare(b.number))
                .map((table) => {
                  const tableUrl = getSecureUrl(table);
                  const isCopied = copiedTableId === table.id;
                  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(tableUrl)}`;

                  return (
                    <div key={table.id} className="border border-gray-150 rounded-2xl p-4 bg-white shadow-sm hover:shadow-md hover:border-indigo-100 transition space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-extrabold text-gray-900 uppercase">Table {table.number}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                table.status === 'empty' ? 'bg-emerald-500' :
                                table.status === 'ordering' ? 'bg-amber-500 animate-pulse' :
                                table.status === 'eating' ? 'bg-indigo-500' : 'bg-red-500'
                              }`} />
                              <span className="text-[9px] text-gray-500 font-bold uppercase font-mono">{table.status}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="bg-gray-100 text-gray-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-gray-150">
                              <KeyRound className="w-2.5 h-2.5 text-gray-500" />
                              {table.activeSessionToken}
                            </span>
                            <button
                              onClick={() => handleRotateToken(table.id)}
                              title="Rotate Secure Token (Locks out old users)"
                              className="p-1 hover:bg-gray-100 active:bg-gray-200 text-gray-500 hover:text-gray-750 rounded transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                            </button>
                          </div>
                        </div>

                        {/* QR Code Graphic Frame */}
                        <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3 text-center">
                          <img
                            src={qrCodeUrl}
                            alt={`QR Table ${table.number}`}
                            className="w-28 h-28 mx-auto border border-gray-200/80 p-1.5 rounded-lg bg-white shadow-sm"
                          />
                          <p className="text-[9px] font-mono text-gray-400 mt-2 truncate max-w-full" title={tableUrl}>
                            {tableUrl}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCopyUrl(table)}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition ${
                              isCopied 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <Copy className="w-3 h-3" />
                            {isCopied ? 'Copied' : 'Copy Link'}
                          </button>
                          
                          <button
                            onClick={() => {
                              setPrintSingleTable(table);
                              setIsPrintPreviewOpen(true);
                            }}
                            className="px-2 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                          >
                            <Printer className="w-3 h-3 text-indigo-600" />
                            Print
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition border border-transparent hover:border-red-100"
                          title="Delete Table room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Add Tenant Modal */}
      {isTenantModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="admin_tenant_modal">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Register SaaS Tenant</h3>
              <button 
                id="btn_admin_close_modal"
                onClick={() => setIsTenantModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Restaurant/Brand Name *</label>
                <input 
                  id="admin_tenant_name_input"
                  type="text"
                  required
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="e.g. Mandalay Tea Bistro"
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-800 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Brand Description</label>
                <textarea 
                  id="admin_tenant_desc_input"
                  value={newTenantDesc}
                  onChange={(e) => setNewTenantDesc(e.target.value)}
                  placeholder="e.g. Traditional Burmese noodle soups and herbal teas..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-20 text-gray-800 font-medium"
                />
              </div>

              <button 
                id="btn_admin_save_tenant"
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/10 transition"
              >
                Register Tenant Brand
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SaaS Print Studio & physical Card Modal */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" id="print_preview_modal">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              #admin_portal_root, #main_app_wrapper, #active_view_container, #global_nav_links, header, footer {
                display: none !important;
              }
              body {
                background: white !important;
                color: black !important;
              }
              #print_preview_modal {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                z-index: 99999 !important;
                display: block !important;
              }
              #print_preview_panel_header {
                display: none !important;
              }
              #print_preview_content_area {
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                background: white !important;
              }
              .print-card-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}} />

          <div className="bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-800 text-white overflow-hidden">
            
            {/* Header controls */}
            <div className="bg-slate-950 p-5 border-b border-slate-850 flex justify-between items-center" id="print_preview_panel_header">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100">SaaS Print Studio & physical Card Preview</h3>
                  <p className="text-[10px] text-slate-400">Optimized layout for paper printing. Trim along guidelines for physical table placement.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/15"
                >
                  <Printer className="w-4 h-4" />
                  Print cards Now
                </button>
                <button
                  onClick={() => {
                    setIsPrintPreviewOpen(false);
                    setPrintSingleTable(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area previewing sheets of paper */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-950/65 flex justify-center">
              <div 
                id="print_preview_content_area" 
                className="bg-white text-gray-900 p-8 rounded-2xl w-full max-w-3xl shadow-xl space-y-8 min-h-[500px]"
              >
                <div className="border-b border-gray-100 pb-4 text-center print:hidden">
                  <span className="bg-indigo-50 text-indigo-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100">
                    Live Table-Tent Print Sheet Preview
                  </span>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Below is the sheet of physical table-ordering cards. Press <b>Print cards Now</b> above to trigger the standard system browser printer dialog.
                  </p>
                </div>

                {/* Printable Table Cards List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {(printSingleTable 
                    ? [printSingleTable] 
                    : tables.filter(t => t.branchId === selectedBranchId && t.tenantId === selectedTenantId)
                  )
                    .sort((a, b) => a.number.localeCompare(b.number))
                    .map((table) => {
                      const tableUrl = getSecureUrl(table);
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tableUrl)}`;
                      const tenantName = tenants.find(t => t.id === table.tenantId)?.name || 'Golden Leaf Tea House';
                      const branchName = branches.find(b => b.id === table.branchId)?.name || 'Downtown Flagship';

                      return (
                        <div 
                          key={table.id} 
                          className="border-2 border-dashed border-gray-300 rounded-3xl p-6 bg-white text-center space-y-5 print-card-break relative overflow-hidden"
                          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                        >
                          {/* Cut Line Label */}
                          <div className="absolute top-1.5 left-4 right-4 flex justify-between items-center text-[8px] font-black tracking-widest text-gray-400 select-none print:opacity-40">
                            <span>✂️ CUT ALONG DASHED LINE</span>
                            <span>PHYSICAL PLACEMENT TENT CARD</span>
                          </div>

                          {/* Card Content */}
                          <div className="pt-3 space-y-1">
                            <h4 className="font-sans font-extrabold text-[11px] tracking-widest text-indigo-900 uppercase">
                              {tenantName}
                            </h4>
                            <p className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">
                              {branchName}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <div className="inline-block bg-indigo-900 text-white font-black px-5 py-1.5 rounded-2xl text-xs tracking-wider">
                              TABLE {table.number}
                            </div>
                            <p className="text-[10px] text-gray-500 font-semibold tracking-tight mt-1">
                              Scan code to view menu & place your order
                            </p>
                          </div>

                          {/* Print crisp QR */}
                          <div className="flex justify-center py-2">
                            <div className="border-[3px] border-indigo-900 p-2.5 bg-white rounded-2xl shadow-sm">
                              <img 
                                src={qrUrl} 
                                alt={`QR Table ${table.number}`} 
                                className="w-40 h-40" 
                              />
                            </div>
                          </div>

                          {/* Diner instructions */}
                          <div className="space-y-2 px-1">
                            <p className="text-[9px] text-gray-600 leading-normal font-medium">
                              No app download required. Open camera, scan the code, customize your drinks, request hot water refills, or call the wait staff directly from your smartphone!
                            </p>
                            <div className="bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 flex justify-between items-center text-[8px] font-mono font-bold text-gray-500">
                              <span>HANDSHAKE SECURITY ID</span>
                              <span className="text-indigo-900">{table.activeSessionToken}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
