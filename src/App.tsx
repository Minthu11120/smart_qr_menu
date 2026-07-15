/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import CustomerView from './components/CustomerView';
import StaffDashboard from './components/StaffDashboard';
import AdminPortal from './components/AdminPortal';
import { seedDatabase } from './data/seedData';
import { UserRole } from './types';
import { getTranslation, Language } from './utils/i18n';
import { 
  Layers, 
  Smartphone, 
  TrendingUp, 
  Users, 
  HelpCircle, 
  ShieldCheck, 
  Coffee, 
  Zap, 
  Tv2, 
  LayoutGrid, 
  RefreshCw, 
  BookOpen,
  CheckCircle,
  Clock,
  Languages
} from 'lucide-react';

export default function App() {
  // Global Language State (Default: Myanmar 'my')
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('app_language');
      return (stored === 'my' || stored === 'en') ? stored : 'my';
    } catch {
      return 'my';
    }
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem('app_language', lang);
    } catch (err) {
      console.error("Failed to save language choice:", err);
    }
  };

  // Navigation Routing States
  const [activePanel, setActivePanel] = useState<'deck' | 'customer' | 'staff' | 'admin' | 'split'>('deck');
  
  // Staff Role & Branch configurations
  const [currentRole, setCurrentRole] = useState<UserRole>('kitchen_staff');
  const [currentBranchId, setCurrentBranchId] = useState<string>('branch_downtown');

  // Customer QR parameters
  const [customerQrParams, setCustomerQrParams] = useState<{
    tenantId: string | null;
    branchId: string | null;
    tableId: string | null;
    token: string | null;
  }>({
    tenantId: null,
    branchId: null,
    tableId: null,
    token: null
  });

  // 1. One-click URL parser on mount for QR simulation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('r');
    const b = params.get('b');
    const t = params.get('t');
    const token = params.get('token');

    if (r && b && t && token) {
      setCustomerQrParams({ tenantId: r, branchId: b, tableId: t, token });
      setActivePanel('customer');
    }

    // Auto-seed database with premium tea house data so it works immediately
    seedDatabase();
  }, []);

  // Set parameters and navigate to customer view
  const handleSimulateQrScan = (tenantId: string, branchId: string, tableId: string, token: string) => {
    setCustomerQrParams({ tenantId, branchId, tableId, token });
    if (tenantId && branchId && tableId && token) {
      setActivePanel('customer');
    } else {
      setActivePanel('deck');
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 font-sans selection:bg-blue-600 selection:text-white" id="main_app_wrapper">
      
      {/* Top Control Rail */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white font-sans shadow-lg shadow-blue-500/25">
              G
            </div>
            <div>
              <h1 className="font-bold text-xs tracking-wider uppercase text-slate-200">
                {getTranslation('app_title', language)}
              </h1>
              <p className="text-[9px] text-blue-400 font-bold font-mono">
                {getTranslation('app_subtitle', language)}
              </p>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-800 border border-slate-700/80 rounded-lg p-0.5 shadow-inner">
            <button
              id="lang_toggle_my"
              onClick={() => handleLanguageChange('my')}
              className={`px-2.5 py-1 rounded text-[10px] font-black transition-all ${
                language === 'my'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              မြန်မာ
            </button>
            <button
              id="lang_toggle_en"
              onClick={() => handleLanguageChange('en')}
              className={`px-2.5 py-1 rounded text-[10px] font-black transition-all ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Global Hub Navigation Controls */}
        <div className="flex items-center flex-wrap gap-1 sm:gap-2 text-xs" id="global_nav_links">
          <button 
            id="nav_btn_hub"
            onClick={() => setActivePanel('deck')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
              activePanel === 'deck' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{getTranslation('nav_hub', language)}</span>
          </button>

          <button 
            id="nav_btn_customer"
            onClick={() => {
              if (!customerQrParams.tableId) {
                // If not scanned, prompt to scan/choose table
                setCustomerQrParams({ tenantId: null, branchId: null, tableId: null, token: null });
              }
              setActivePanel('customer');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
              activePanel === 'customer' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{getTranslation('nav_customer', language)}</span>
          </button>

          <button 
            id="nav_btn_staff"
            onClick={() => setActivePanel('staff')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
              activePanel === 'staff' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{getTranslation('nav_staff', language)}</span>
          </button>

          <button 
            id="nav_btn_admin"
            onClick={() => setActivePanel('admin')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
              activePanel === 'admin' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{getTranslation('nav_admin', language)}</span>
          </button>

          <button 
            id="nav_btn_split"
            onClick={() => {
              // Ensure customer table parameters are seeded for Split Screen simulation
              if (!customerQrParams.tableId) {
                setCustomerQrParams({ 
                  tenantId: 'golden_leaf', 
                  branchId: 'branch_downtown', 
                  tableId: 'table_dt_01', 
                  token: 'SESSION_DT_01' 
                });
              }
              setActivePanel('split');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
              activePanel === 'split' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-blue-500/20'
            }`}
          >
            <Tv2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">{getTranslation('nav_split', language)}</span>
            <span className="sm:hidden font-extrabold text-blue-400 text-[10px]">SPLIT</span>
          </button>
        </div>
      </div>

      {/* RENDER CONTENT PANEL */}
      <div id="active_view_container">
        
        {/* 1. DEMO HUB CONTROL DECK */}
        {activePanel === 'deck' && (
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-12" id="demo_deck_panel">
            
            {/* Elegant Hero Introduction */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-500/10">
                {getTranslation('sme_saas_platform', language)}
              </span>
              <h2 className="text-3xl sm:text-4xl font-sans font-extrabold tracking-tight text-white leading-tight">
                {getTranslation('qr_smart_table_ordering', language)}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {getTranslation('saas_desc', language)}
              </p>
            </div>

            {/* Core Capabilities Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800/80 space-y-2">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">{getTranslation('realtime_cart', language)}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {getTranslation('realtime_cart_desc', language)}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800/80 space-y-2">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">{getTranslation('antifraud_qr', language)}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {getTranslation('antifraud_qr_desc', language)}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800/80 space-y-2">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <h4 className="font-bold text-white text-sm">{getTranslation('offline_resilience', language)}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {getTranslation('offline_resilience_desc', language)}
                </p>
              </div>
            </div>

            {/* Quick Experience Launcher */}
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base text-center font-sans">{getTranslation('quick_launchers', language)}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Customer Simulation */}
                <button 
                  id="launcher_btn_customer"
                  onClick={() => {
                    setCustomerQrParams({ tenantId: null, branchId: null, tableId: null, token: null });
                    setActivePanel('customer');
                  }}
                  className="bg-slate-800/60 hover:bg-slate-750 border border-slate-800/80 p-6 rounded-2xl text-center space-y-3 transition flex flex-col items-center hover:border-blue-500/40"
                >
                  <Smartphone className="w-8 h-8 text-blue-500" />
                  <div>
                    <h4 className="font-bold text-white text-sm">{getTranslation('nav_customer', language)}</h4>
                    <p className="text-slate-400 text-[11px] mt-1">{getTranslation('launcher_customer_desc', language)}</p>
                  </div>
                </button>

                {/* 2. Staff Simulation */}
                <button 
                  id="launcher_btn_staff"
                  onClick={() => setActivePanel('staff')}
                  className="bg-slate-800/60 hover:bg-slate-750 border border-slate-800/80 p-6 rounded-2xl text-center space-y-3 transition flex flex-col items-center hover:border-blue-500/40"
                >
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <h4 className="font-bold text-white text-sm">{getTranslation('nav_staff', language)}</h4>
                    <p className="text-slate-400 text-[11px] mt-1">{getTranslation('launcher_staff_desc', language)}</p>
                  </div>
                </button>

                {/* 3. Super Admin */}
                <button 
                  id="launcher_btn_admin"
                  onClick={() => setActivePanel('admin')}
                  className="bg-slate-800/60 hover:bg-slate-750 border border-slate-800/80 p-6 rounded-2xl text-center space-y-3 transition flex flex-col items-center hover:border-blue-500/40"
                >
                  <ShieldCheck className="w-8 h-8 text-blue-500" />
                  <div>
                    <h4 className="font-bold text-white text-sm">{getTranslation('super_admin_portal', language)}</h4>
                    <p className="text-slate-400 text-[11px] mt-1">{getTranslation('launcher_admin_desc', language)}</p>
                  </div>
                </button>
              </div>

              {/* SPLIT SCREEN PROMOTION BUTTON */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Tv2 className="w-5 h-5 text-blue-500" />
                    <h4 className="font-bold text-white text-sm">{getTranslation('recommended_split', language)}</h4>
                  </div>
                  <p className="text-slate-400 text-xs max-w-xl">
                    {getTranslation('split_desc', language)}
                  </p>
                </div>
                <button 
                  id="btn_deck_split_trigger"
                  onClick={() => {
                    setCustomerQrParams({ 
                      tenantId: 'golden_leaf', 
                      branchId: 'branch_downtown', 
                      tableId: 'table_dt_01', 
                      token: 'SESSION_DT_01' 
                    });
                    setActivePanel('split');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl text-xs transition whitespace-nowrap shadow-lg shadow-blue-500/20"
                >
                  {getTranslation('btn_launch_split', language)}
                </button>
              </div>
            </div>

            {/* Traditional Golden Leaf Tea Shop Banner Card */}
            <div className="p-6 rounded-2xl border border-slate-800/60 bg-slate-900/40 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
                <Coffee className="w-6 h-6" />
              </div>
              <div className="text-center sm:text-left space-y-0.5">
                <h5 className="font-bold text-sm text-white">{getTranslation('demo_tenant_title', language)}</h5>
                <p className="text-slate-400 text-xs">
                  {getTranslation('demo_tenant_desc', language)}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* 2. CUSTOMER COMPONENT VIEW */}
        {activePanel === 'customer' && (
          <div className="bg-slate-900 py-6 min-h-screen">
            <CustomerView 
              onSimulateQrScan={handleSimulateQrScan}
              currentQrParams={customerQrParams}
              language={language}
            />
          </div>
        )}

        {/* 3. STAFF MERCHANT DASHBOARD VIEW */}
        {activePanel === 'staff' && (
          <div className="bg-slate-50 min-h-screen text-slate-900">
            <StaffDashboard 
              currentRole={currentRole}
              onChangeRole={setCurrentRole}
              currentBranchId={currentBranchId}
              onChangeBranch={setCurrentBranchId}
              language={language}
            />
          </div>
        )}

        {/* 4. SUPER ADMIN CONSOLE VIEW */}
        {activePanel === 'admin' && (
          <div className="bg-slate-50 min-h-screen text-slate-900">
            <AdminPortal language={language} />
          </div>
        )}

        {/* 5. INTERACTIVE REALTIME SPLIT PLAYGROUND */}
        {activePanel === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[90vh] bg-slate-950 border-t border-slate-800" id="split_playground">
            
            {/* Left Mobile Simulator Column (Customer View) */}
            <div className="lg:col-span-5 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col items-center justify-center">
              <div className="text-center pb-2">
                <span className="text-[9px] font-black tracking-widest text-blue-500 uppercase font-mono">Mobile App View (Customer)</span>
              </div>
              
              {/* Virtual Smartphone frame */}
              <div className="w-full max-w-sm rounded-[36px] border-[10px] border-slate-800 shadow-2xl bg-slate-50 overflow-hidden h-[780px] relative overflow-y-auto">
                <CustomerView 
                  onSimulateQrScan={handleSimulateQrScan}
                  currentQrParams={customerQrParams}
                  language={language}
                />
              </div>
            </div>

            {/* Right Tablet/PC Simulator Column (Kitchen & Staff Dashboard) */}
            <div className="lg:col-span-7 bg-slate-50 flex flex-col overflow-y-auto">
              <div className="bg-blue-600 text-white px-5 py-2.5 font-bold text-xs flex justify-between items-center shadow-sm">
                <span className="flex items-center gap-1.5 uppercase font-black">
                  <Tv2 className="w-4 h-4" />
                  Staff Dashboard View (Real-time syncing via Firestore)
                </span>
                <span className="text-[10px] font-black font-mono">SPLIT-CONSOLE</span>
              </div>
              
              <div className="flex-1">
                <StaffDashboard 
                  currentRole={currentRole}
                  onChangeRole={setCurrentRole}
                  currentBranchId={currentBranchId}
                  onChangeBranch={setCurrentBranchId}
                  language={language}
                />
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
