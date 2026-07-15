/**
 * Translation Dictionary and Localization Helper for SaaS Table Ordering System.
 * Default Language: Myanmar (my)
 * Supporting Language: English (en)
 */

export type Language = 'my' | 'en';

export const translations = {
  my: {
    // Top Control Rail & Common Buttons
    'app_title': 'ရွှေဖက်ရွက်',
    'app_subtitle': 'SaaS ဆိုင်ခွဲအစုံ စားပွဲတင်စမတ်အော်ဒါစနစ်',
    'nav_hub': 'စနစ်အစမ်းသုံးရန်',
    'nav_customer': 'ဝယ်ယူသူမျက်နှာပြင်',
    'nav_staff': 'ဝန်ထမ်းပိုင်းထိန်းချုပ်မှု',
    'nav_admin': 'အဆင့်မြင့်စီမံခန့်ခွဲသူ',
    'nav_split': 'မျက်နှာပြင်ခွဲစမ်းသပ်ရန်',
    'select_language': 'ဘာသာစကားပြောင်းရန်',

    // Demo Hub Panel
    'sme_saas_platform': 'SME စားသောက်ဆိုင် SAAS စနစ်',
    'qr_smart_table_ordering': 'QR-Code စမတ်စားပွဲတင်အော်ဒါစနစ်',
    'saas_desc': 'SME လက်ဖက်ရည်ဆိုင်များနှင့် စားသောက်ဆိုင်များအတွက် အထူးသင့်လျော်သော လုံခြုံစိတ်ချရသည့် multi-tenant SaaS စနစ်ဖြစ်ပါသည်။ တပြိုင်နက်တည်းအော်ဒါတင်ခြင်း၊ မီးဖိုချောင်ပြေစာအလိုအလျောက်ထုတ်ခြင်းနှင့် QR လိမ်လည်မှုကာကွယ်ရေးစနစ်များ ပါဝင်ပါသည်။',
    'realtime_cart': 'တပြိုင်နက်သုံးခြင်းတောင်း',
    'realtime_cart_desc': 'စားပွဲတစ်ခုတည်းရှိ ဝယ်ယူသူများအားလုံး တပြိုင်နက်တည်း ခြင်းတောင်းတစ်ခုတည်းသို့ ပစ္စည်းများထည့်သွင်း မျှဝေအသုံးပြုနိုင်ပါသည်။',
    'antifraud_qr': 'လိမ်လည်မှုကာကွယ်ရေး QR',
    'antifraud_qr_desc': 'စားပွဲရှင်းလင်းပြီးသည်နှင့် QR တိုကင်အား အလိုအလျောက်ပြောင်းလဲပေးသဖြင့် ပြင်ပမှ လိမ်လည်အော်ဒါတင်ခြင်းများကို ကာကွယ်ပေးပါသည်။',
    'offline_resilience': 'အော့ဖ်လိုင်းသုံးနိုင်စွမ်း',
    'offline_resilience_desc': 'အင်တာနက်ပြတ်တောက်သွားသော်လည်း စက်တွင်းမှတ်တမ်းဖြင့် အော်ဒါများကို ထိန်းသိမ်းပေးပြီး ပြန်ချိတ်မိပါက အော်ဒါများကို ပြန်လည်ပေးပို့ပေးပါသည်။',
    'quick_launchers': 'အမြန်စမ်းသပ်ရန် စနစ်များ',
    'launcher_customer_desc': 'စားပွဲ QR ကုဒ်ကို စကန်ဖတ်ပြီး အော်ဒါတင်ခြင်းကို ဝယ်ယူသူဖုန်းဖြင့် စမ်းသပ်ရန်',
    'launcher_staff_desc': 'မီးဖိုချောင်အော်ဒါလက်ခံခြင်း၊ ပြေစာထုတ်ယူခြင်းနှင့် ငွေရှင်းခြင်းများ စမ်းသပ်ရန်',
    'launcher_admin_desc': 'လုပ်ငန်းခွဲများ၊ စားပွဲများနှင့် စာရင်းသွင်းမှုအခြေအနေများ စီမံခန့်ခွဲရန်',
    'recommended_split': 'အထူးအကြံပြုချက် - မျက်နှာပြင်ခွဲစမ်းသပ်မှုမုဒ်ကို စမ်းသုံးကြည့်ပါ!',
    'split_desc': 'ဘယ်ဘက်တွင် ဝယ်ယူသူဖုန်းမျက်နှာပြင်နှင့် ညာဘက်တွင် ဝန်ထမ်းထိန်းချုပ်ခွက်ကို တပြိုင်နက်ဖော်ပြပေးပြီး အော်ဒါတင်ခြင်း၊ ဝန်ထမ်းခေါ်ခြင်းများကို ချက်ချင်းစမ်းသပ်နိုင်ပါသည်။',
    'btn_launch_split': 'မျက်နှာပြင်ခွဲစမ်းသပ်မှု ဖွင့်ရန်',
    'demo_tenant_title': 'ရွှေဖက်ရွက် လက်ဖက်ရည်ဆိုင်နှင့် စားသောက်ဆိုင် (နမူနာလုပ်ငန်း)',
    'demo_tenant_desc': 'ရန်ကုန်မြို့လယ်ပင်မဆိုင်ခွဲနှင့် အလုံပန်းခြံဆိုင်ခွဲများအပါအဝင် မီနူးဒေတာများ ကြိုတင်ထည့်သွင်းပေးထားပြီး ဖြစ်ပါသည်။',

    // Customer View - Scanner & Join
    'scan_to_order': 'အော်ဒါတင်ရန် စကန်ဖတ်ပါ',
    'scan_desc': 'ဤစနစ်ကို စမ်းသပ်ရန် အောက်ပါနမူနာစားပွဲတစ်ခုခုကို ရွေးချယ်ပြီး ဝင်ရောက်နိုင်ပါသည်။',
    'btn_scan_table': 'စားပွဲရွေးချယ်ပြီးဝင်မည်',
    'joining_table_session': 'စားပွဲသို့ ဝင်ရောက်နေပါသည်...',
    'enter_name_to_join': 'ခြင်းတောင်းမျှဝေသုံးရန် နာမည်ထည့်ပါ',
    'name_placeholder': 'သင့်နာမည် (ဥပမာ - မောင်မောင်)',
    'btn_join_cart': 'ခြင်းတောင်းသို့ ဝင်မည်',
    'invalid_qr': 'QR ကုဒ် မမှန်ကန်ပါ သို့မဟုတ် သက်တမ်းကုန်ဆုံးသွားပါပြီ။ ဆိုင်ဝန်ထမ်းအား ကူညီရန် တောင်းဆိုပါ။',
    'customer_name': 'ဝယ်ယူသူအမည်',
    'table': 'စားပွဲ',
    'branch': 'ဆိုင်ခွဲ',
    'edit_name': 'အမည်ပြင်ရန်',
    'save': 'သိမ်းမည်',

    // Customer Menu & Food
    'all_categories': 'အားလုံး',
    'add_to_cart': 'ခြင်းတောင်းထဲထည့်မည်',
    'item_added': 'ခြင်းတောင်းထဲသို့ ထည့်ပြီးပါပြီ',
    'remarks_placeholder': 'မှတ်ချက်ထည့်ရန် (ဥပမာ - အချိုလျှော့၊ အစပ်မပါ)',
    'price': 'စျေးနှုန်း',
    'ks': 'ကျပ်',

    // Shared Cart Modal
    'shared_cart_title': 'ဝိုင်းတော်သားများ၏ စုပေါင်းခြင်းတောင်း',
    'cart_members': 'လက်ရှိဝိုင်းဝင်နေသူများ',
    'empty_cart': 'ခြင်းတောင်းထဲတွင် မည်သည့်ပစ္စည်းမှ မရှိသေးပါ။ မီနူးမှ ပစ္စည်းများ ထည့်သွင်းနိုင်ပါသည်။',
    'added_by': 'ထည့်သွင်းသူ -',
    'subtotal': 'ပစ္စည်းဖိုးစုစုပေါင်း',
    'tax_service': 'အခွန်နှင့် ဝန်ဆောင်ခ (၅%)',
    'grand_total': 'ကျသင့်ငွေစုစုပေါင်း',
    'btn_submit_order': 'အော်ဒါတင်သွင်းမည်',
    'submitting_order': 'အော်ဒါတင်နေပါသည်...',
    'order_success_alert': 'အော်ဒါတင်သွင်းခြင်း အောင်မြင်ပါသည်။ မီးဖိုချောင်သို့ ပေးပို့ပြီးပါပြီ။',
    'btn_call_waiter': 'ဝန်ထမ်းခေါ်ဆိုမည်',
    'calling_waiter': 'ဝန်ထမ်းအား ခေါ်ယူနေပါသည်...',
    'waiter_called': 'ဝန်ထမ်းအား ခေါ်ယူပြီးပါပြီ။ ခေတ္တစောင့်ဆိုင်းပေးပါ။',

    // Live Order Status Tracker
    'live_tracker_title': 'လက်ရှိအော်ဒါ ခြေရာခံစနစ်',
    'realtime_kitchen_status': 'မီးဖိုချောင်ပြင်ဆင်မှုအခြေအနေ',
    'order_ref': 'အော်ဒါနံပါတ် -',
    'status_pending': 'မီးဖိုချောင်သို့ ရောက်ရှိ',
    'status_preparing': 'မီးဖိုချောင်တွင် ပြင်ဆင်နေဆဲ',
    'status_delivered': 'စားပွဲသို့ ပို့ဆောင်ပြီး',
    'status_completed': 'ငွေချေပြီးပါပြီ',
    'status_cancelled': 'ပယ်ဖျက်လိုက်သည်',
    'cancelled_by_staff': 'ဤအော်ဒါကို ဝန်ထမ်းမှ ပယ်ဖျက်လိုက်ပါသည်။ ဝန်ထမ်းအား မေးမြန်းစုံစမ်းပါ။',
    'btn_dismiss_order': 'သိပါပြီ၊ ဖယ်ရှားမည်',

    // Customer History
    'device_order_history': 'ဤဖုန်းရှိ အော်ဒါမှတ်တမ်း',
    'clear_order_prompt': 'ဤအော်ဒါကို မှတ်တမ်းမှ ဖယ်ရှားမလား?',
    'clear_line_prompt': 'ဖျက်မလား?',
    'no_history': 'ဤဖုန်းတွင် ယခင်က အော်ဒါတင်ထားဖူးခြင်း မရှိသေးပါ။',
    'add_item_back': 'ပြန်ထည့်မည်',
    'yes': 'ဟုတ်ကဲ့',
    'no': 'မဟုတ်ပါ',

    // Staff Dashboard
    'staff_panel': 'ဝန်ထမ်းအော်ဒါထိန်းချုပ်ခွက်',
    'role': 'တာဝန်',
    'kitchen_staff': 'မီးဖိုချောင်ဝန်ထမ်း',
    'waiter': 'စားပွဲထိုး / စားပွဲပြင်',
    'cashier': 'ငွေကိုင် / မန်နေဂျာ',
    'tab_active_orders': 'လက်ရှိအော်ဒါများ',
    'tab_order_history': 'အော်ဒါမှတ်တမ်းဟောင်းများ',
    'tab_tables_status': 'စားပွဲများအခြေအနေ',
    'tab_waiter_calls': 'ဝန်ထမ်းခေါ်ဆိုမှုများ',
    'tab_menu_mgmt': 'မီနူးစီမံခန့်ခွဲမှု',
    
    // Staff Actions
    'btn_accept': 'လက်ခံမည်',
    'btn_deliver': 'ပစ္စည်းပို့မည်',
    'btn_cancel_order': 'ပယ်ဖျက်မည်',
    'btn_complete': 'ပြီးဆုံးပါပြီ',
    'btn_settle_clear': 'စားပွဲရှင်းလင်းမည်',
    'print_receipt': 'ပြေစာရွက်ထုတ်ရန်',
    'print_option_slip': 'ပြေစာစာရွက် ထုတ်ယူမည်',
    'print_consolidated_bill': 'စုစုပေါင်းပြေစာစာရွက်ထုတ်ရန်',
    'settle_warning': 'သေချာပါသလား? ၎င်းသည် စားပွဲအခြေအနေကို ပြန်လည်သတ်မှတ်ပြီး QR ကုဒ်လုံခြုံရေးတိုကင်ကို ပြောင်းလဲပါလိမ့်မည်။',
    'kitchen_sound': 'မီးဖိုချောင်အချက်ပေးသံ',
    'waiter_sound': 'ဝန်ထမ်းခေါ်ဆိုသံ',
    'active_calls_count': 'လက်ရှိခေါ်ဆိုမှုများ',
    'btn_resolve_call': 'ဆောင်ရွက်ပြီး',
    
    // Staff Printer Config
    'bluetooth_printer': 'ဘလူးတုသ် ပရင်တာ ချိတ်ဆက်မှု',
    'printer_connected': 'ပရင်တာ ချိတ်ဆက်ပြီးပါပြီ',
    'printer_not_connected': 'ပရင်တာ ချိတ်ဆက်ထားခြင်းမရှိပါ',
    'btn_connect_printer': 'ပရင်တာ ချိတ်ဆက်မည်',
    
    // Super Admin
    'super_admin_portal': 'SaaS အဆင့်မြင့် စီမံခန့်ခွဲသူ ပေါ်တယ်',
    'tenants_list': 'လုပ်ငန်းရှင်များ စာရင်း',
    'branches_list': 'ဆိုင်ခွဲများ စာရင်း',
    'add_tenant': 'လုပ်ငန်းသစ်ထည့်မည်',
    'add_branch': 'ဆိုင်ခွဲသစ်ထည့်မည်',
    'subscription_status': 'စာရင်းသွင်းမှုအခြေအနေ',
    'database_seed': 'ဒေတာဘေ့စ်ကို နမူနာဒေတာများ ပြန်လည်ထည့်သွင်းရန်',
    'total_sales_saas': 'SaaS စုစုပေါင်းရောင်းရငွေ',
    'active_stores': 'လည်ပတ်နေသော လုပ်ငန်းများ',
    'active_tables_all': 'စားပွဲစုစုပေါင်း',

    // New additions
    'no_active_orders_descr': 'လောလောဆယ် မီးဖိုချောင်တွင် ပြင်ဆင်နေသည့် အော်ဒါမရှိသေးပါ။',
    'confirm_delete_from_history': 'ဤအော်ဒါကို သင့်ဖုန်းမှတ်တမ်းမှ အပြီးဖျက်လိုပါသလား?'
  },
  en: {
    // Top Control Rail & Common Buttons
    'app_title': 'Golden Leaf',
    'app_subtitle': 'SaaS Multi-Outlet Table Ordering',
    'nav_hub': 'Demo Hub',
    'nav_customer': 'Customer View',
    'nav_staff': 'Staff Dashboard',
    'nav_admin': 'Super Admin',
    'nav_split': 'Split Screen Play',
    'select_language': 'Language',

    // Demo Hub Panel
    'sme_saas_platform': 'SME RESTAURANT SAAS PLATFORM',
    'qr_smart_table_ordering': 'QR-Code Smart Table Ordering System',
    'saas_desc': 'A highly secure, multi-tenant SaaS platform optimized for SME tea houses and dining outlets. Built with real-time multi-user cart synchronization, kitchen auto-printing receipts, and dynamic tokenized URL protection against fraud.',
    'realtime_cart': 'Real-time Shared Cart',
    'realtime_cart_desc': 'Multiple customers at the same table can add items to a shared cart simultaneously and watch changes live.',
    'antifraud_qr': 'Anti-Fraud QR Protection',
    'antifraud_qr_desc': 'QR tokens rotate automatically upon table settlement, blocking off-site mock orders instantly.',
    'offline_resilience': 'Offline Resilience',
    'offline_resilience_desc': 'Even if connections drop, local caching keeps cart orders safe, auto-syncing when back online.',
    'quick_launchers': 'Quick Experience Launchers',
    'launcher_customer_desc': 'Simulate scanning a table QR and placing an order using client-side session logic',
    'launcher_staff_desc': 'Kitchen chimes, Bluetooth receipt previews, and cashier checkout flow simulations',
    'launcher_admin_desc': 'Manage registered merchant brands, outlet branches, table nodes, and cloud subscriptions',
    'recommended_split': 'Highly Recommended: Try Split Screen Simulation Mode!',
    'split_desc': 'Loads the Customer Mobile Ordering app on the left and the Kitchen/Waiter Dashboard on the right. Add items, call the waiter, or place order tickets and see real-time updates!',
    'btn_launch_split': 'Launch Split Screen Mode',
    'demo_tenant_title': 'Golden Leaf Tea House & Bistro (Demo Tenant)',
    'demo_tenant_desc': 'Fully pre-registered and seeded on first boot! Includes Downtown Flagship & Ahlone Garden branches.',

    // Customer View - Scanner & Join
    'scan_to_order': 'Scan QR Code to Order',
    'scan_desc': 'To simulate scanning, choose one of the active dine-in tables below to start your dining session.',
    'btn_scan_table': 'Select & Join Table',
    'joining_table_session': 'Joining table session...',
    'enter_name_to_join': 'Enter your name to join the shared cart',
    'name_placeholder': 'Your Name (e.g. John Doe)',
    'btn_join_cart': 'Join Shared Cart',
    'invalid_qr': 'Invalid or expired QR code session. Please ask our staff for assistance.',
    'customer_name': 'Guest Name',
    'table': 'Table',
    'branch': 'Branch',
    'edit_name': 'Edit Name',
    'save': 'Save',

    // Customer Menu & Food
    'all_categories': 'All',
    'add_to_cart': 'Add to Cart',
    'item_added': 'Added to cart!',
    'remarks_placeholder': 'Add remarks (e.g., less sugar, no ice, extra spicy)',
    'price': 'Price',
    'ks': 'MMK',

    // Shared Cart Modal
    'shared_cart_title': 'Table Shared Cart',
    'cart_members': 'Active Dining Guests',
    'empty_cart': 'Your table cart is empty. Add delicious items from our digital menu above.',
    'added_by': 'Added by',
    'subtotal': 'Subtotal',
    'tax_service': 'Tax & Service Charge (5%)',
    'grand_total': 'Grand Total',
    'btn_submit_order': 'Send Order to Kitchen',
    'submitting_order': 'Sending order to kitchen...',
    'order_success_alert': 'Your order has been successfully placed and sent to the kitchen!',
    'btn_call_waiter': 'Summon Waiter',
    'calling_waiter': 'Calling waiter...',
    'waiter_called': 'Waiter has been summoned. They will arrive shortly!',

    // Live Order Status Tracker
    'live_tracker_title': 'Live Order Tracker',
    'realtime_kitchen_status': 'Real-time Kitchen Status',
    'order_ref': 'Order Ref:',
    'status_pending': 'Sent to Kitchen',
    'status_preparing': 'Being Cooked',
    'status_delivered': 'Delivered to Table',
    'status_completed': 'Paid & Settled',
    'status_cancelled': 'Cancelled',
    'cancelled_by_staff': 'This order was cancelled by the staff. Please contact the waiter for assistance.',
    'btn_dismiss_order': 'Got it, clear',

    // Customer History
    'device_order_history': 'Device Order History',
    'clear_order_prompt': 'Remove this order from your local history?',
    'clear_line_prompt': 'Delete?',
    'no_history': 'No order history found on this device yet.',
    'add_item_back': 'Add Back',
    'yes': 'Yes',
    'no': 'No',

    // Staff Dashboard
    'staff_panel': 'Staff Operations Console',
    'role': 'Role',
    'kitchen_staff': 'Kitchen Staff',
    'waiter': 'Waiter / Server',
    'cashier': 'Cashier / Manager',
    'tab_active_orders': 'Active Orders',
    'tab_order_history': 'Completed History',
    'tab_tables_status': 'Tables Status',
    'tab_waiter_calls': 'Waiter Calls',
    'tab_menu_mgmt': 'Menu Management',
    
    // Staff Actions
    'btn_accept': 'Accept & Cook',
    'btn_deliver': 'Mark Delivered',
    'btn_cancel_order': 'Cancel Order',
    'btn_complete': 'Settle Order',
    'btn_settle_clear': 'Settle Table & Clear',
    'print_receipt': 'Print Slip',
    'print_option_slip': 'Print Consolidated Bill Slip',
    'print_consolidated_bill': 'Print Consolidated Slip',
    'settle_warning': 'Are you sure? This resets table status, rotating the QR code dynamic token!',
    'kitchen_sound': 'Kitchen Alert Bell',
    'waiter_sound': 'Waiter Summon Chime',
    'active_calls_count': 'Active Summon Calls',
    'btn_resolve_call': 'Resolve Call',
    
    // Staff Printer Config
    'bluetooth_printer': 'Bluetooth Thermal Printer Link',
    'printer_connected': 'Printer Connected',
    'printer_not_connected': 'Printer Offline',
    'btn_connect_printer': 'Connect Printer',
    
    // Super Admin
    'super_admin_portal': 'SaaS Enterprise Admin Control',
    'tenants_list': 'Registered Tenants',
    'branches_list': 'Registered Outlet Branches',
    'add_tenant': 'Register New Tenant',
    'add_branch': 'Register New Branch',
    'subscription_status': 'Subscription Tier',
    'database_seed': 'Reset & Reseed All Database Nodes',
    'total_sales_saas': 'Platform Gross Merchandise Value',
    'active_stores': 'Subscribed Brands',
    'active_tables_all': 'Total Table Nodes',

    // New additions
    'no_active_orders_descr': 'No orders currently active in the kitchen stream.',
    'confirm_delete_from_history': 'Do you want to permanently clear this order from your history?'
  }
};

export function getTranslation(key: keyof typeof translations['en'], lang: Language): string {
  return translations[lang][key] || translations['my'][key] || key;
}
