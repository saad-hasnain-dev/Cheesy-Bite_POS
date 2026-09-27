const { db } = require('./db')
const crypto = require('crypto')

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

const TABLES = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name_en TEXT NOT NULL, name_ar TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL,
    name_en TEXT NOT NULL, name_ar TEXT NOT NULL,
    description_en TEXT, description_ar TEXT,
    price REAL NOT NULL DEFAULT 0, image_path TEXT,
    is_available INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    phone TEXT, email TEXT, notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'dine-in',
    table_number TEXT, delivery_address TEXT, customer_id INTEGER,
    customer_name TEXT, customer_phone TEXT,
    subtotal REAL NOT NULL DEFAULT 0, discount_pct REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0, vat_rate REAL NOT NULL DEFAULT 0.15,
    vat_amount REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    amount_tendered REAL, change_due REAL,
    status TEXT NOT NULL DEFAULT 'completed', notes TEXT, cashier_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL,
    menu_item_id INTEGER, name_en TEXT NOT NULL, name_ar TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0,
    discount_pct REAL NOT NULL DEFAULT 0, total_price REAL NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL,
    phone TEXT, email TEXT, guest_count INTEGER NOT NULL DEFAULT 1,
    reserved_at TEXT NOT NULL, table_number TEXT, notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`
]

const DEFAULT_SETTINGS = [
  ['restaurant_name_en', 'Cheesy Bite Restaurant'],
  ['restaurant_name_ar', 'مطعم تشيزي بايت'],
  ['vat_number', ''],
  ['phone', ''],
  ['email', ''],
  ['address_en', 'Riyadh, KSA'],
  ['address_ar', 'الرياض، المملكة العربية السعودية'],
  ['receipt_footer_en', 'Thank you for visiting Cheesy Bite!'],
  ['receipt_footer_ar', 'شكراً لزيارتكم مطعم تشيزي بايت!'],
  ['currency', 'SAR'],
  ['logo_path', ''],
  ['default_language', 'en'],
  ['admin_password_hash', sha256('cheesy2024')],
  ['print_copies', '1'],
  ['default_printer', ''],
  // Bank / payment details (v2)
  ['bank_name', ''],
  ['bank_iban', ''],
  ['bank_account', ''],
  ['bank_qr_url', ''],
  // Branding (v3)
  ['app_logo_path', ''],
  ['receipt_logo_path', ''],
  ['accent_color', '#c1fbd4'],
  ['sidebar_color', '#000000'],
  // Logo container style (v4)
  ['logo_bg_color', '#000000'],
  ['logo_border_radius', '8'],
  ['logo_bg_opacity', '1'],
  // VAT / tax (v5)
  ['vat_enabled', '1'],
  ['vat_rate', '0.15'],
]

const SAMPLE_CATS = [
  { name_en: 'Burgers', name_ar: 'برجر', sort_order: 1 },
  { name_en: 'Sandwiches', name_ar: 'سندويشات', sort_order: 2 },
  { name_en: 'Sides', name_ar: 'مقبلات', sort_order: 3 },
  { name_en: 'Beverages', name_ar: 'مشروبات', sort_order: 4 },
  { name_en: 'Desserts', name_ar: 'حلويات', sort_order: 5 }
]

const SAMPLE_ITEMS = [
  { category_id: 1, name_en: 'Classic Cheesy Burger', name_ar: 'برجر تشيزي كلاسيك', price: 29.99 },
  { category_id: 1, name_en: 'Double Smash Burger', name_ar: 'دابل سماش برجر', price: 39.99 },
  { category_id: 1, name_en: 'BBQ Bacon Burger', name_ar: 'برجر بي بي كيو', price: 35.99 },
  { category_id: 2, name_en: 'Crispy Chicken Sandwich', name_ar: 'ساندوتش دجاج كريسبي', price: 24.99 },
  { category_id: 2, name_en: 'Grilled Chicken Wrap', name_ar: 'راب دجاج مشوي', price: 22.99 },
  { category_id: 3, name_en: 'Loaded Fries', name_ar: 'بطاطس محملة', price: 14.99 },
  { category_id: 3, name_en: 'Onion Rings', name_ar: 'حلقات بصل', price: 12.99 },
  { category_id: 3, name_en: 'Coleslaw', name_ar: 'كول سلو', price: 9.99 },
  { category_id: 4, name_en: 'Fresh Lemonade', name_ar: 'ليمون طازج', price: 12.99 },
  { category_id: 4, name_en: 'Soft Drink', name_ar: 'مشروب غازي', price: 8.99 },
  { category_id: 4, name_en: 'Water', name_ar: 'ماء', price: 4.99 },
  { category_id: 5, name_en: 'Cheesecake Slice', name_ar: 'شريحة تشيز كيك', price: 19.99 },
  { category_id: 5, name_en: 'Chocolate Brownie', name_ar: 'براوني شوكولاتة', price: 15.99 }
]

function runSchema() {
  for (const t of TABLES) {
    db.exec(t)
  }

  // v1: initial seed
  const meta = db.prepare('SELECT value FROM meta WHERE key = @key').get({ key: 'schema_version' })
  if (!meta) {
    db.prepare('INSERT INTO meta (key, value) VALUES (@key, @value)').run({ key: 'schema_version', value: '1' })
    for (const [key, value] of DEFAULT_SETTINGS) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)').run({ key, value })
    }
    for (const cat of SAMPLE_CATS) {
      db.prepare('INSERT INTO categories (name_en, name_ar, sort_order) VALUES (@name_en, @name_ar, @sort_order)').run(cat)
    }
    for (const item of SAMPLE_ITEMS) {
      db.prepare('INSERT INTO menu_items (category_id, name_en, name_ar, price) VALUES (@category_id, @name_en, @name_ar, @price)').run(item)
    }
  }

  const schemaVersion = db.prepare('SELECT value FROM meta WHERE key=@key').get({ key: 'schema_version' })

  // v2 migration
  if (schemaVersion && schemaVersion.value === '1') {
    try { db.exec('ALTER TABLE orders ADD COLUMN customer_name TEXT') } catch (_) {}
    try { db.exec('ALTER TABLE orders ADD COLUMN customer_phone TEXT') } catch (_) {}
    for (const [key, value] of [['bank_name',''],['bank_iban',''],['bank_account',''],['bank_qr_url','']]) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)').run({ key, value })
    }
    db.prepare('UPDATE meta SET value=@v WHERE key=@k').run({ k: 'schema_version', v: '2' })
  }

  // v3 migration: branding settings
  const sv = db.prepare('SELECT value FROM meta WHERE key=@key').get({ key: 'schema_version' })
  if (sv && sv.value === '2') {
    for (const [key, value] of [['app_logo_path',''],['receipt_logo_path',''],['accent_color','#c1fbd4'],['sidebar_color','#000000']]) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)').run({ key, value })
    }
    db.prepare('UPDATE meta SET value=@v WHERE key=@k').run({ k: 'schema_version', v: '3' })
  }

  // v4 migration: logo container style
  const sv4 = db.prepare('SELECT value FROM meta WHERE key=@key').get({ key: 'schema_version' })
  if (sv4 && sv4.value === '3') {
    for (const [key, value] of [['logo_bg_color','#000000'],['logo_border_radius','8'],['logo_bg_opacity','1']]) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)').run({ key, value })
    }
    db.prepare('UPDATE meta SET value=@v WHERE key=@k').run({ k: 'schema_version', v: '4' })
  }

  // v5 migration: per-item discount + vat_exempt; global vat settings
  const sv5 = db.prepare('SELECT value FROM meta WHERE key=@key').get({ key: 'schema_version' })
  if (sv5 && sv5.value === '4') {
    try { db.exec('ALTER TABLE menu_items ADD COLUMN discount_pct REAL NOT NULL DEFAULT 0') } catch (_) {}
    try { db.exec('ALTER TABLE menu_items ADD COLUMN discount_fixed REAL NOT NULL DEFAULT 0') } catch (_) {}
    try { db.exec('ALTER TABLE menu_items ADD COLUMN vat_exempt INTEGER NOT NULL DEFAULT 0') } catch (_) {}
    for (const [key, value] of [['vat_enabled','1'],['vat_rate','0.15']]) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)').run({ key, value })
    }
    db.prepare('UPDATE meta SET value=@v WHERE key=@k').run({ k: 'schema_version', v: '5' })
  }

  // v6 migration: category icon/description + comprehensive menu seed
  const sv6 = db.prepare('SELECT value FROM meta WHERE key=@key').get({ key: 'schema_version' })
  if (sv6 && sv6.value === '5') {
    try { db.exec('ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT ""') } catch (_) {}
    try { db.exec('ALTER TABLE categories ADD COLUMN description_en TEXT DEFAULT ""') } catch (_) {}
    try { db.exec('ALTER TABLE categories ADD COLUMN description_ar TEXT DEFAULT ""') } catch (_) {}

    for (const [key, value] of [
      ['receipt_paper_width','80'], ['auto_print_receipt','1'],
      ['default_order_type','dine-in'], ['cashier_name',''],
    ]) {
      db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (@key,@value)').run({ key, value })
    }

    seedMenu()
    db.prepare('UPDATE meta SET value=@v WHERE key=@k').run({ k: 'schema_version', v: '6' })
  }

  // v7 migration: new categories + additional items + clear all emoji icons
  const sv7 = db.prepare('SELECT value FROM meta WHERE key=@key').get({ key: 'schema_version' })
  if (sv7 && sv7.value === '6') {
    // Remove all emoji icons (user preference: plain text only)
    try { db.exec("UPDATE categories SET icon=''") } catch (_) {}

    seedMenuV7()
    db.prepare('UPDATE meta SET value=@v WHERE key=@k').run({ k: 'schema_version', v: '7' })
  }

  // v8 migration: settings keys added to UI but never seeded in the database
  const sv8 = db.prepare('SELECT value FROM meta WHERE key=@key').get({ key: 'schema_version' })
  if (sv8 && sv8.value === '7') {
    const newSettings = [
      // POS Behavior
      ['auto_clear_cart',        '1'],
      ['quick_discounts',        '5,10,15,20'],
      ['total_rounding',         '0'],
      // Service Charge
      ['service_charge_enabled', '0'],
      ['service_charge_rate',    '0.00'],
      ['service_charge_label',   'Service Charge'],
      // Receipt Options
      ['receipt_show_cashier',   '1'],
      ['receipt_show_phone',     '1'],
      ['receipt_show_qr',        '1'],
      // Security
      ['idle_lock_minutes',      '0'],
      ['require_pin_void',       '0'],
      ['hide_prices_locked',     '0'],
    ]
    for (const [key, value] of newSettings) {
      db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)').run({ key, value })
    }
    db.prepare('UPDATE meta SET value=@v WHERE key=@k').run({ k: 'schema_version', v: '8' })
  }

  // v9 migration: track WhatsApp receipt delivery per order
  const sv9 = db.prepare('SELECT value FROM meta WHERE key=@key').get({ key: 'schema_version' })
  if (sv9 && sv9.value === '8') {
    try { db.exec('ALTER TABLE orders ADD COLUMN whatsapp_status TEXT') } catch (_) {}
    try { db.exec('ALTER TABLE orders ADD COLUMN whatsapp_sent_at TEXT') } catch (_) {}
    db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)').run({ key: 'whatsapp_auto_send', value: '1' })
    db.prepare('UPDATE meta SET value=@v WHERE key=@k').run({ k: 'schema_version', v: '9' })
  }
}

function catId(name_en) {
  const r = db.prepare('SELECT id FROM categories WHERE name_en=@n').get({ n: name_en })
  return r ? r.id : null
}

function upsertCat(name_en, name_ar, icon, sort_order, desc_en = '', desc_ar = '') {
  const exists = db.prepare('SELECT id FROM categories WHERE name_en=@n').get({ n: name_en })
  if (exists) {
    db.prepare('UPDATE categories SET name_ar=@a,icon=@i,sort_order=@s WHERE name_en=@n')
      .run({ n: name_en, a: name_ar, i: icon, s: sort_order })
    return exists.id
  }
  db.prepare('INSERT INTO categories (name_en,name_ar,icon,sort_order,description_en,description_ar) VALUES (@e,@a,@i,@s,@de,@da)')
    .run({ e: name_en, a: name_ar, i: icon, s: sort_order, de: desc_en, da: desc_ar })
  return catId(name_en)
}

function addItems(categoryId, items) {
  const ins = db.prepare('INSERT INTO menu_items (category_id,name_en,name_ar,description_en,description_ar,price) VALUES (@c,@e,@a,@de,@da,@p)')
  for (const it of items) {
    const exists = db.prepare('SELECT id FROM menu_items WHERE name_en=@n AND category_id=@c').get({ n: it.name_en, c: categoryId })
    if (!exists) ins.run({ c: categoryId, e: it.name_en, a: it.name_ar, de: it.de||'', da: it.da||'', p: it.price })
  }
}

function seedMenu() {
  // ── Pizza ────────────────────────────────────────────────────────────
  const pizza = upsertCat('Pizza','بيتزا','🍕',10,'Classic and specialty pizzas','بيتزا كلاسيكية ومتخصصة')
  addItems(pizza, [
    { name_en:'Margherita',          name_ar:'مارغريتا',             price:32 },
    { name_en:'Cheese Pizza',        name_ar:'بيتزا بالجبن',          price:35 },
    { name_en:'Pepperoni Pizza',     name_ar:'بيتزا البيبروني',       price:42 },
    { name_en:'Chicken Pizza',       name_ar:'بيتزا الدجاج',          price:40 },
    { name_en:'Chicken BBQ Pizza',   name_ar:'بيتزا دجاج بي بي كيو', price:45 },
    { name_en:'Chicken Ranch Pizza', name_ar:'بيتزا دجاج رانش',       price:45 },
    { name_en:'Veggie Pizza',        name_ar:'بيتزا خضراء',           price:38 },
    { name_en:'Supreme Pizza',       name_ar:'بيتزا سوبريم',          price:48 },
    { name_en:'Hawaiian Pizza',      name_ar:'بيتزا هاوايان',         price:44 },
    { name_en:'Meat Lovers Pizza',   name_ar:'بيتزا عشاق اللحم',     price:52 },
    { name_en:'Tandoori Chicken Pizza',name_ar:'بيتزا دجاج تندوري',  price:46 },
    { name_en:'Mexican Pizza',       name_ar:'بيتزا مكسيكية',         price:44 },
    { name_en:'Garlic Chicken Pizza',name_ar:'بيتزا الدجاج بالثوم',  price:44 },
    { name_en:'Four Cheese Pizza',   name_ar:'بيتزا أربعة أجبان',    price:50 },
    { name_en:'Spicy Chicken Pizza', name_ar:'بيتزا الدجاج الحار',    price:44 },
    { name_en:'Dynamite Chicken Pizza',name_ar:'بيتزا دجاج ديناميت', price:46 },
  ])

  // ── Burgers ──────────────────────────────────────────────────────────
  const burgers = upsertCat('Burgers','برجر','🍔',20,'Beef & chicken burgers','برجر لحم ودجاج')
  addItems(burgers, [
    { name_en:'Classic Beef Burger',    name_ar:'برجر لحم كلاسيك',      price:28 },
    { name_en:'Double Beef Burger',     name_ar:'دابل برجر لحم',         price:38 },
    { name_en:'Cheese Burger',          name_ar:'تشيز برجر',             price:30 },
    { name_en:'Double Cheese Burger',   name_ar:'دابل تشيز برجر',        price:40 },
    { name_en:'Mushroom Swiss Burger',  name_ar:'برجر مشروم سويسري',     price:36 },
    { name_en:'BBQ Beef Burger',        name_ar:'برجر لحم بي بي كيو',    price:35 },
    { name_en:'Spicy Beef Burger',      name_ar:'برجر لحم حار',          price:32 },
    { name_en:'Angus Burger',           name_ar:'برجر أنغوس',            price:45 },
    { name_en:'Crispy Chicken Burger',  name_ar:'برجر دجاج كريسبي',      price:28 },
    { name_en:'Grilled Chicken Burger', name_ar:'برجر دجاج مشوي',        price:28 },
    { name_en:'Zinger Burger',          name_ar:'زينغر برجر',            price:26 },
    { name_en:'Spicy Chicken Burger',   name_ar:'برجر دجاج حار',         price:28 },
    { name_en:'BBQ Chicken Burger',     name_ar:'برجر دجاج بي بي كيو',   price:30 },
    { name_en:'Dynamite Chicken Burger',name_ar:'برجر دجاج ديناميت',     price:32 },
    { name_en:'Wagyu Burger',           name_ar:'برجر واغيو',            price:65 },
    { name_en:'Smoky Burger',           name_ar:'برجر سموكي',            price:38 },
    { name_en:'Monster Burger',         name_ar:'مونستر برجر',           price:55 },
    { name_en:'Signature Burger',       name_ar:'برجر سيغنتشر',          price:48 },
  ])

  // ── Fried Chicken ────────────────────────────────────────────────────
  const fc = upsertCat('Fried Chicken','دجاج مقلي','🍗',30,'Crispy fried chicken meals','وجبات الدجاج المقلي الكريسبي')
  addItems(fc, [
    { name_en:'2 Pieces Meal',       name_ar:'وجبة قطعتين',         price:22 },
    { name_en:'4 Pieces Meal',       name_ar:'وجبة 4 قطع',          price:38 },
    { name_en:'8 Pieces Bucket',     name_ar:'دلو 8 قطع',           price:62 },
    { name_en:'12 Pieces Bucket',    name_ar:'دلو 12 قطعة',         price:85 },
    { name_en:'16 Pieces Bucket',    name_ar:'دلو 16 قطعة',         price:110 },
    { name_en:'Crispy Chicken Strips',name_ar:'شرائح دجاج كريسبي',  price:28 },
    { name_en:'Chicken Popcorn',     name_ar:'دجاج بوبكورن',         price:18 },
    { name_en:'Chicken Wings',       name_ar:'أجنحة دجاج',           price:30 },
    { name_en:'Hot Wings',           name_ar:'أجنحة حارة',           price:32 },
    { name_en:'BBQ Wings',           name_ar:'أجنحة بي بي كيو',      price:32 },
  ])

  // ── BBQ & Grill ──────────────────────────────────────────────────────
  const bbq = upsertCat('BBQ & Grill','شواء ومشويات','🍢',40,'Tikka, kebabs & grilled meats','تكا وكباب ومشويات')
  addItems(bbq, [
    { name_en:'Chicken Tikka',      name_ar:'دجاج تكا',          price:35 },
    { name_en:'Beef Tikka',         name_ar:'لحم تكا',           price:42 },
    { name_en:'Mutton Tikka',       name_ar:'خروف تكا',          price:48 },
    { name_en:'Chicken Kebab',      name_ar:'كباب دجاج',         price:32 },
    { name_en:'Beef Kebab',         name_ar:'كباب لحم',          price:40 },
    { name_en:'Seekh Kebab',        name_ar:'سيخ كباب',          price:38 },
    { name_en:'Turkish Kebab',      name_ar:'كباب تركي',         price:42 },
    { name_en:'Kofta Kebab',        name_ar:'كفتة كباب',         price:35 },
    { name_en:'Half Grilled Chicken',name_ar:'نص دجاج مشوي',     price:38 },
    { name_en:'Full Grilled Chicken',name_ar:'دجاج مشوي كامل',   price:65 },
    { name_en:'Mixed Grill',        name_ar:'مشكل مشاوي',        price:75 },
    { name_en:'BBQ Chicken',        name_ar:'دجاج بي بي كيو',    price:42 },
    { name_en:'BBQ Beef',           name_ar:'لحم بي بي كيو',     price:55 },
  ])

  // ── Shawarma & Wraps ─────────────────────────────────────────────────
  const shawarma = upsertCat('Shawarma','شاورما','🌮',50,'Shawarma & wraps','شاورما ولفات')
  addItems(shawarma, [
    { name_en:'Chicken Shawarma',     name_ar:'شاورما دجاج',       price:18 },
    { name_en:'Beef Shawarma',        name_ar:'شاورما لحم',        price:22 },
    { name_en:'Arabic Shawarma',      name_ar:'شاورما عربية',      price:20 },
    { name_en:'Shawarma Plate',       name_ar:'طبق شاورما',        price:38 },
    { name_en:'Mixed Shawarma',       name_ar:'شاورما مشكل',       price:42 },
    { name_en:'Chicken Wrap',         name_ar:'لفة دجاج',          price:20 },
    { name_en:'BBQ Chicken Wrap',     name_ar:'لفة دجاج بي بي كيو',price:22 },
    { name_en:'Crispy Chicken Wrap',  name_ar:'لفة دجاج كريسبي',   price:22 },
    { name_en:'Beef Wrap',            name_ar:'لفة لحم',           price:24 },
    { name_en:'Tikka Wrap',           name_ar:'لفة تكا',           price:24 },
    { name_en:'Shawarma Wrap',        name_ar:'لفة شاورما',        price:20 },
    { name_en:'Falafel Wrap',         name_ar:'لفة فلافل',         price:15 },
  ])

  // ── Sandwiches ───────────────────────────────────────────────────────
  const sand = upsertCat('Sandwiches','سندويشات','🥙',60,'Hot & cold sandwiches','سندويشات ساخنة وباردة')
  addItems(sand, [
    { name_en:'Club Sandwich',    name_ar:'كلوب سندويش',      price:26 },
    { name_en:'Chicken Sandwich', name_ar:'سندويش دجاج',      price:22 },
    { name_en:'Beef Sandwich',    name_ar:'سندويش لحم',       price:26 },
    { name_en:'Grilled Sandwich', name_ar:'سندويش مشوي',      price:22 },
    { name_en:'Tuna Sandwich',    name_ar:'سندويش تونة',      price:20 },
    { name_en:'Egg Sandwich',     name_ar:'سندويش بيض',       price:15 },
    { name_en:'Hot Dog',          name_ar:'هوت دوج',          price:18 },
    { name_en:'Cheese Hot Dog',   name_ar:'هوت دوج بالجبن',   price:20 },
  ])

  // ── Rice ─────────────────────────────────────────────────────────────
  const rice = upsertCat('Rice','أرز','🍚',70,'Kabsa, mandi & biryani','كبسة ومندي وبرياني')
  addItems(rice, [
    { name_en:'Chicken Biryani',   name_ar:'برياني دجاج',      price:35 },
    { name_en:'Beef Biryani',      name_ar:'برياني لحم',       price:42 },
    { name_en:'Kabsa Chicken',     name_ar:'كبسة دجاج',        price:38 },
    { name_en:'Kabsa Lamb',        name_ar:'كبسة لحم',         price:55 },
    { name_en:'Mandi Chicken',     name_ar:'مندي دجاج',        price:40 },
    { name_en:'Mandi Lamb',        name_ar:'مندي لحم',         price:58 },
    { name_en:'Madghout Chicken',  name_ar:'مدغوط دجاج',       price:42 },
    { name_en:'Madfoon Lamb',      name_ar:'مدفون لحم',        price:65 },
    { name_en:'Saleeg',            name_ar:'سليق',             price:35 },
    { name_en:'White Rice',        name_ar:'أرز أبيض',         price:8 },
    { name_en:'Fried Rice',        name_ar:'أرز مقلي',         price:22 },
  ])

  // ── Pasta ────────────────────────────────────────────────────────────
  const pasta = upsertCat('Pasta','باستا','🍝',80,'Italian pasta dishes','أطباق الباستا الإيطالية')
  addItems(pasta, [
    { name_en:'Alfredo Pasta',        name_ar:'باستا ألفريدو',    price:28 },
    { name_en:'Chicken Alfredo',      name_ar:'دجاج ألفريدو',     price:35 },
    { name_en:'Penne Arrabbiata',     name_ar:'بيني أرابياتا',    price:28 },
    { name_en:'Spaghetti Bolognese',  name_ar:'سباغيتي بولونييز', price:32 },
    { name_en:'Lasagna',              name_ar:'لازانيا',          price:38 },
    { name_en:'Mac & Cheese',         name_ar:'ماك اند تشيز',     price:25 },
  ])

  // ── Sides ────────────────────────────────────────────────────────────
  const sides = upsertCat('Sides','مقبلات وجانبيات','🍟',90,'Fries, rings & sides','بطاطس وحلقات ومقبلات')
  addItems(sides, [
    { name_en:'French Fries',        name_ar:'بطاطس مقلية',       price:12 },
    { name_en:'Curly Fries',         name_ar:'بطاطس كيرلي',       price:14 },
    { name_en:'Loaded Fries',        name_ar:'بطاطس محملة',        price:18 },
    { name_en:'Cheese Fries',        name_ar:'بطاطس بالجبن',       price:16 },
    { name_en:'Potato Wedges',       name_ar:'ودجز',              price:14 },
    { name_en:'Onion Rings',         name_ar:'حلقات البصل',        price:14 },
    { name_en:'Mozzarella Sticks',   name_ar:'موزاريلا ستيكس',    price:18 },
    { name_en:'Chicken Nuggets 6',   name_ar:'ناجتس دجاج 6 قطع',  price:16 },
    { name_en:'Chicken Nuggets 9',   name_ar:'ناجتس دجاج 9 قطع',  price:22 },
    { name_en:'Chicken Nuggets 20',  name_ar:'ناجتس دجاج 20 قطعة',price:42 },
    { name_en:'Jalapeno Poppers',    name_ar:'جلابينو بوبرز',      price:16 },
    { name_en:'Garlic Bread',        name_ar:'خبز بالثوم',         price:10 },
    { name_en:'Garlic Bread Cheese', name_ar:'خبز ثوم بالجبن',     price:14 },
    { name_en:'Coleslaw',            name_ar:'كول سلو',            price:10 },
    { name_en:'Corn Cup',            name_ar:'كوب ذرة',            price:8 },
    { name_en:'Spring Rolls',        name_ar:'سبرينج رولز',        price:16 },
    { name_en:'Samosa',              name_ar:'سمبوسة',            price:12 },
    { name_en:'Cheese Balls',        name_ar:'كرات الجبن',         price:16 },
    { name_en:'Hummus',              name_ar:'حمص',               price:12 },
    { name_en:'Mutabbal',            name_ar:'متبل',              price:12 },
    { name_en:'Fattoush',            name_ar:'فتوش',              price:14 },
  ])

  // ── Salads ───────────────────────────────────────────────────────────
  const salads = upsertCat('Salads','سلطات','🥗',100,'Fresh salads','سلطات طازجة')
  addItems(salads, [
    { name_en:'Caesar Salad',         name_ar:'سلطة سيزر',          price:18 },
    { name_en:'Greek Salad',          name_ar:'سلطة يونانية',        price:18 },
    { name_en:'Garden Salad',         name_ar:'سلطة الحديقة',        price:14 },
    { name_en:'Chicken Caesar Salad', name_ar:'سلطة سيزر بالدجاج',  price:24 },
    { name_en:'Tabbouleh',            name_ar:'تبولة',              price:14 },
    { name_en:'Fattoush Salad',       name_ar:'فتوش',              price:14 },
  ])

  // ── Desserts ─────────────────────────────────────────────────────────
  const desserts = upsertCat('Desserts','حلويات','🍰',110,'Cakes, ice cream & sweets','كيك وآيس كريم وحلويات')
  addItems(desserts, [
    { name_en:'Chocolate Cake',    name_ar:'كيك الشوكولاتة',    price:22 },
    { name_en:'Cheesecake',        name_ar:'تشيز كيك',          price:24 },
    { name_en:'Brownie',           name_ar:'براوني',            price:16 },
    { name_en:'Ice Cream',         name_ar:'آيس كريم',          price:12 },
    { name_en:'Cookie',            name_ar:'كوكيز',             price:10 },
    { name_en:'Donut',             name_ar:'دونات',             price:8 },
    { name_en:'Kunafa',            name_ar:'كنافة',             price:22 },
    { name_en:'Baklava',           name_ar:'بقلاوة',            price:18 },
    { name_en:'Churros',           name_ar:'تشوروس',            price:18 },
    { name_en:'Molten Lava Cake',  name_ar:'كيك اللافا',        price:22 },
  ])

  // ── Soft Drinks ──────────────────────────────────────────────────────
  const soda = upsertCat('Soft Drinks','مشروبات غازية','🥤',120,'Colas, sodas & fizzy drinks','كولا ومشروبات غازية')
  addItems(soda, [
    { name_en:'Coca-Cola Can',     name_ar:'كوكا كولا علبة',    price:6 },
    { name_en:'Coca-Cola 330ml',   name_ar:'كوكا كولا 330ml',   price:5 },
    { name_en:'Coca-Cola 500ml',   name_ar:'كوكا كولا 500ml',   price:7 },
    { name_en:'Coca-Cola 1.5L',    name_ar:'كوكا كولا 1.5 لتر', price:12 },
    { name_en:'Coca-Cola Zero',    name_ar:'كوكا كولا زيرو',    price:6 },
    { name_en:'Pepsi Can',         name_ar:'بيبسي علبة',        price:6 },
    { name_en:'Pepsi 330ml',       name_ar:'بيبسي 330ml',       price:5 },
    { name_en:'Pepsi 500ml',       name_ar:'بيبسي 500ml',       price:7 },
    { name_en:'Pepsi 1.5L',        name_ar:'بيبسي 1.5 لتر',     price:12 },
    { name_en:'Pepsi Diet',        name_ar:'بيبسي دايت',        price:6 },
    { name_en:'7UP Can',           name_ar:'سفن أب علبة',       price:6 },
    { name_en:'Sprite Can',        name_ar:'سبرايت علبة',       price:6 },
    { name_en:'Mirinda Orange',    name_ar:'ميرندا برتقال',      price:6 },
    { name_en:'Mountain Dew',      name_ar:'ماونتن ديو',        price:6 },
    { name_en:'Fanta Orange',      name_ar:'فانتا برتقال',       price:6 },
    { name_en:'Fanta Grape',       name_ar:'فانتا عنب',         price:6 },
  ])

  // ── Water ────────────────────────────────────────────────────────────
  const water = upsertCat('Water','مياه','💧',130,'Bottled water','مياه معبأة')
  addItems(water, [
    { name_en:'Berain 330ml',   name_ar:'بريين 330ml',   price:2 },
    { name_en:'Berain 600ml',   name_ar:'بريين 600ml',   price:3 },
    { name_en:'Berain 1.5L',    name_ar:'بريين 1.5 لتر', price:5 },
    { name_en:'Arwa 330ml',     name_ar:'أروى 330ml',    price:2 },
    { name_en:'Arwa 600ml',     name_ar:'أروى 600ml',    price:3 },
    { name_en:'Aquafina 500ml', name_ar:'أكوافينا 500ml',price:4 },
    { name_en:'Nestlé Water',   name_ar:'نستله',         price:4 },
  ])

  // ── Juices ───────────────────────────────────────────────────────────
  const juices = upsertCat('Juices','عصائر','🧃',140,'Fresh & packaged juices','عصائر طازجة ومعبأة')
  addItems(juices, [
    { name_en:'Orange Juice',       name_ar:'عصير برتقال',     price:14 },
    { name_en:'Apple Juice',        name_ar:'عصير تفاح',       price:10 },
    { name_en:'Mango Juice',        name_ar:'عصير مانجو',      price:12 },
    { name_en:'Pineapple Juice',    name_ar:'عصير أناناس',     price:12 },
    { name_en:'Lemon Mint',         name_ar:'ليمون بالنعناع',  price:14 },
    { name_en:'Cocktail Juice',     name_ar:'عصير كوكتيل',    price:16 },
    { name_en:'Strawberry Juice',   name_ar:'عصير فراولة',    price:16 },
    { name_en:'Pomegranate Juice',  name_ar:'عصير رمان',      price:18 },
    { name_en:'Avocado Juice',      name_ar:'عصير أفوكادو',   price:18 },
  ])

  // ── Coffee & Tea ─────────────────────────────────────────────────────
  const coffee = upsertCat('Coffee & Tea','قهوة وشاي','☕',150,'Hot beverages','مشروبات ساخنة')
  addItems(coffee, [
    { name_en:'Espresso',        name_ar:'إسبريسو',       price:10 },
    { name_en:'Americano',       name_ar:'أمريكانو',      price:12 },
    { name_en:'Cappuccino',      name_ar:'كابتشينو',      price:14 },
    { name_en:'Latte',           name_ar:'لاتيه',         price:16 },
    { name_en:'Flat White',      name_ar:'فلات وايت',     price:16 },
    { name_en:'Mocha',           name_ar:'موكا',          price:16 },
    { name_en:'Turkish Coffee',  name_ar:'قهوة تركية',    price:10 },
    { name_en:'Arabic Coffee',   name_ar:'قهوة عربية',    price:8 },
    { name_en:'Tea',             name_ar:'شاي',           price:8 },
    { name_en:'Green Tea',       name_ar:'شاي أخضر',     price:10 },
    { name_en:'Karak Tea',       name_ar:'شاي كرك',      price:10 },
    { name_en:'Hot Chocolate',   name_ar:'شوكولاتة ساخنة',price:14 },
  ])

  // ── Milkshakes ───────────────────────────────────────────────────────
  const shakes = upsertCat('Milkshakes','ميلك شيك','🥛',160,'Thick & creamy milkshakes','ميلك شيك كريمي')
  addItems(shakes, [
    { name_en:'Chocolate Milkshake',  name_ar:'شيك الشوكولاتة', price:16 },
    { name_en:'Vanilla Milkshake',    name_ar:'شيك الفانيليا',   price:15 },
    { name_en:'Strawberry Milkshake', name_ar:'شيك الفراولة',    price:16 },
    { name_en:'Oreo Milkshake',       name_ar:'شيك أوريو',       price:18 },
    { name_en:'Lotus Milkshake',      name_ar:'شيك لوتس',        price:20 },
    { name_en:'Nutella Milkshake',    name_ar:'شيك نوتيلا',      price:20 },
    { name_en:'Mango Milkshake',      name_ar:'شيك المانجو',     price:16 },
  ])

  // ── Smoothies ────────────────────────────────────────────────────────
  const smoothies = upsertCat('Smoothies','سموذي','🥤',170,'Fresh fruit smoothies','سموذي الفاكهة الطازجة')
  addItems(smoothies, [
    { name_en:'Mango Smoothie',       name_ar:'سموذي مانجو',       price:18 },
    { name_en:'Strawberry Smoothie',  name_ar:'سموذي فراولة',      price:18 },
    { name_en:'Mixed Berry Smoothie', name_ar:'سموذي توت مشكل',    price:20 },
    { name_en:'Banana Smoothie',      name_ar:'سموذي موز',         price:16 },
    { name_en:'Avocado Smoothie',     name_ar:'سموذي أفوكادو',     price:20 },
    { name_en:'Kiwi Smoothie',        name_ar:'سموذي كيوي',        price:18 },
  ])

  // ── Sauces ───────────────────────────────────────────────────────────
  const sauces = upsertCat('Sauces','صوصات','🥫',180,'Dips & sauces','صوصات ومقبلات')
  addItems(sauces, [
    { name_en:'Garlic Sauce',    name_ar:'صوص ثوم',         price:4 },
    { name_en:'Cheese Sauce',    name_ar:'صوص جبن',         price:5 },
    { name_en:'BBQ Sauce',       name_ar:'صوص بي بي كيو',   price:4 },
    { name_en:'Ranch',           name_ar:'رانش',            price:4 },
    { name_en:'Mayo',            name_ar:'مايونيز',         price:3 },
    { name_en:'Spicy Mayo',      name_ar:'مايونيز حار',     price:4 },
    { name_en:'Ketchup',         name_ar:'كاتشب',           price:3 },
    { name_en:'Mustard',         name_ar:'مسطردة',          price:3 },
    { name_en:'Honey Mustard',   name_ar:'مسطردة بالعسل',   price:4 },
    { name_en:'Dynamite Sauce',  name_ar:'صوص ديناميت',     price:5 },
    { name_en:'Buffalo Sauce',   name_ar:'صوص بافالو',      price:5 },
    { name_en:'Chili Garlic',    name_ar:'ثوم وفلفل',       price:4 },
  ])

  // ── Add-ons ──────────────────────────────────────────────────────────
  const addons = upsertCat('Add-ons','إضافات','➕',190,'Extra toppings & add-ons','إضافات وطبقات إضافية')
  addItems(addons, [
    { name_en:'Extra Cheese',     name_ar:'جبن إضافي',      price:5 },
    { name_en:'Extra Chicken',    name_ar:'دجاج إضافي',     price:8 },
    { name_en:'Extra Beef',       name_ar:'لحم إضافي',      price:10 },
    { name_en:'Extra Pepperoni',  name_ar:'بيبروني إضافي',  price:7 },
    { name_en:'Extra Mushroom',   name_ar:'مشروم إضافي',    price:6 },
    { name_en:'Jalapeno',         name_ar:'جلابينو',        price:4 },
    { name_en:'Black Olives',     name_ar:'زيتون أسود',     price:4 },
    { name_en:'Green Olives',     name_ar:'زيتون أخضر',     price:4 },
    { name_en:'Sweet Corn',       name_ar:'ذرة حلوة',       price:4 },
    { name_en:'Pineapple',        name_ar:'أناناس',         price:4 },
    { name_en:'Onion',            name_ar:'بصل',            price:3 },
    { name_en:'Tomato',           name_ar:'طماطم',          price:3 },
    { name_en:'Capsicum',         name_ar:'فلفل',           price:3 },
    { name_en:'Lettuce',          name_ar:'خس',             price:3 },
    { name_en:'Pickles',          name_ar:'مخلل',           price:3 },
  ])

  // ── Combo Meals ──────────────────────────────────────────────────────
  const combo = upsertCat('Combo Meals','وجبات كومبو','📦',200,'Value combo meals','وجبات كومبو بسعر مميز')
  addItems(combo, [
    { name_en:'Burger Combo',    name_ar:'كومبو برجر',    price:38 },
    { name_en:'Chicken Combo',   name_ar:'كومبو دجاج',    price:35 },
    { name_en:'Pizza Combo',     name_ar:'كومبو بيتزا',   price:55 },
    { name_en:'Shawarma Combo',  name_ar:'كومبو شاورما',  price:30 },
    { name_en:'BBQ Combo',       name_ar:'كومبو شواء',    price:65 },
    { name_en:'Value Meal',      name_ar:'وجبة اقتصادية', price:28 },
    { name_en:'Lunch Special',   name_ar:'عرض الغداء',    price:35 },
    { name_en:'Dinner Special',  name_ar:'عرض العشاء',    price:45 },
  ])

  // ── Family Meals ─────────────────────────────────────────────────────
  const family = upsertCat('Family Meals','وجبات عائلية','🥡',210,'Sharing family packs','وجبات عائلية للمشاركة')
  addItems(family, [
    { name_en:'Family Pizza Meal',         name_ar:'وجبة بيتزا عائلية',      price:120 },
    { name_en:'Family Burger Meal',        name_ar:'وجبة برجر عائلية',       price:130 },
    { name_en:'Family Fried Chicken',      name_ar:'دلو دجاج مقلي عائلي',   price:110 },
    { name_en:'Mixed Grill Family Pack',   name_ar:'مشكل مشاوي عائلي',      price:150 },
    { name_en:'Shawarma Family Box',       name_ar:'صندوق شاورما عائلي',    price:100 },
    { name_en:'Rice Family Meal',          name_ar:'وجبة أرز عائلية',        price:90 },
  ])

  // ── Kids Meals ───────────────────────────────────────────────────────
  const kids = upsertCat('Kids Meals','وجبات أطفال','👶',220,'Fun meals for kids','وجبات ممتعة للأطفال')
  addItems(kids, [
    { name_en:'Kids Burger',   name_ar:'برجر أطفال',  price:22 },
    { name_en:'Kids Pizza',    name_ar:'بيتزا أطفال', price:28 },
    { name_en:'Kids Nuggets',  name_ar:'ناجتس أطفال', price:18 },
    { name_en:'Kids Fries',    name_ar:'بطاطس أطفال', price:12 },
    { name_en:'Kids Juice',    name_ar:'عصير أطفال',  price:8 },
  ])
}

function seedMenuV7() {
  // ── Pizza: sizes + crust options ────────────────────────────────────
  const pizza = catId('Pizza')
  if (pizza) {
    addItems(pizza, [
      { name_en:'Small Pizza',        name_ar:'بيتزا صغيرة',         price:22 },
      { name_en:'Medium Pizza',       name_ar:'بيتزا وسط',            price:35 },
      { name_en:'Large Pizza',        name_ar:'بيتزا كبيرة',          price:48 },
      { name_en:'Family Pizza',       name_ar:'بيتزا عائلية',         price:68 },
      { name_en:'XL Pizza',           name_ar:'بيتزا إكس لارج',       price:85 },
      { name_en:'Thin Crust',         name_ar:'عجينة رفيعة',          price:0  },
      { name_en:'Thick Crust',        name_ar:'عجينة سميكة',          price:0  },
      { name_en:'Stuffed Crust',      name_ar:'حواف محشوة',           price:10 },
      { name_en:'Cheese Burst Crust', name_ar:'حواف جبن',             price:12 },
      { name_en:'Pan Pizza',          name_ar:'بيتزا بان',            price:0  },
    ])
  }

  // ── BBQ & Grill: BBQ Wings (also listed here by user) ───────────────
  const bbq = catId('BBQ & Grill')
  if (bbq) {
    addItems(bbq, [
      { name_en:'BBQ Wings', name_ar:'أجنحة بي بي كيو مشوية', price:32 },
    ])
  }

  // ── Salads: Coleslaw (also listed under Salads) ──────────────────────
  const salads = catId('Salads')
  if (salads) {
    addItems(salads, [
      { name_en:'Coleslaw', name_ar:'كول سلو', price:10 },
    ])
  }

  // ── Soft Drinks: additional variants ────────────────────────────────
  const soda = catId('Soft Drinks')
  if (soda) {
    addItems(soda, [
      { name_en:'Pepsi Max',      name_ar:'بيبسي ماكس',     price:6 },
      { name_en:'Sprite Zero',    name_ar:'سبرايت زيرو',    price:6 },
      { name_en:'Diet 7UP',       name_ar:'سفن أب دايت',    price:6 },
      { name_en:'Mirinda Citrus', name_ar:'ميرندا سيتروس',  price:6 },
    ])
  }

  // ── Water: additional brands + sizes ────────────────────────────────
  const water = catId('Water')
  if (water) {
    addItems(water, [
      { name_en:'Nova Water 330ml',   name_ar:'نوفا 330ml',    price:2 },
      { name_en:'Nova Water 600ml',   name_ar:'نوفا 600ml',    price:3 },
      { name_en:'Nova Water 1.5L',    name_ar:'نوفا 1.5 لتر',  price:5 },
      { name_en:'Hana Water 330ml',   name_ar:'هنا 330ml',     price:2 },
      { name_en:'Hana Water 600ml',   name_ar:'هنا 600ml',     price:3 },
      { name_en:'Hana Water 1.5L',    name_ar:'هنا 1.5 لتر',   price:5 },
      { name_en:'Arwa 1L',            name_ar:'أروى 1 لتر',    price:4 },
      { name_en:'Berain 1L',          name_ar:'بريين 1 لتر',   price:4 },
      { name_en:'Aquafina 330ml',     name_ar:'أكوافينا 330ml',price:3 },
      { name_en:'Aquafina 1.5L',      name_ar:'أكوافينا 1.5 لتر',price:6 },
    ])
  }

  // ── Sauces: extra sauces from list ──────────────────────────────────
  const sauces = catId('Sauces')
  if (sauces) {
    addItems(sauces, [
      { name_en:'Salsa',     name_ar:'صوص سالسا',  price:4 },
      { name_en:'Garlic Dip',name_ar:'غموس ثوم',   price:4 },
    ])
  }

  // ── Add-ons: Bacon ──────────────────────────────────────────────────
  const addons = catId('Add-ons')
  if (addons) {
    addItems(addons, [
      { name_en:'Bacon (Turkey/Beef)', name_ar:'لحم مدخن (حلال)', price:8 },
    ])
  }

  // ── NEW: Wraps (separate category from Shawarma) ─────────────────────
  const wraps = upsertCat('Wraps','لفات','',55)
  addItems(wraps, [
    { name_en:'Chicken Wrap',        name_ar:'لفة دجاج',             price:20 },
    { name_en:'BBQ Chicken Wrap',    name_ar:'لفة دجاج بي بي كيو',   price:22 },
    { name_en:'Crispy Chicken Wrap', name_ar:'لفة دجاج كريسبي',      price:22 },
    { name_en:'Beef Wrap',           name_ar:'لفة لحم',              price:24 },
    { name_en:'Tikka Wrap',          name_ar:'لفة تكا',              price:24 },
    { name_en:'Shawarma Wrap',       name_ar:'لفة شاورما',           price:20 },
    { name_en:'Falafel Wrap',        name_ar:'لفة فلافل',            price:15 },
  ])

  // ── NEW: Hot Dogs ────────────────────────────────────────────────────
  const hotdogs = upsertCat('Hot Dogs','هوت دوج','',67)
  addItems(hotdogs, [
    { name_en:'Classic Hot Dog', name_ar:'هوت دوج كلاسيك',      price:15 },
    { name_en:'Cheese Hot Dog',  name_ar:'هوت دوج بالجبن',      price:18 },
    { name_en:'Chili Hot Dog',   name_ar:'هوت دوج بالتشيلي',    price:18 },
    { name_en:'Jumbo Hot Dog',   name_ar:'هوت دوج جامبو',       price:22 },
  ])

  // ── NEW: Appetizers ──────────────────────────────────────────────────
  const apps = upsertCat('Appetizers','مقبلات','',93)
  addItems(apps, [
    { name_en:'Hummus',       name_ar:'حمص',           price:12 },
    { name_en:'Mutabbal',     name_ar:'متبل',          price:12 },
    { name_en:'Garlic Dip',   name_ar:'غموس ثوم',      price:10 },
    { name_en:'Salsa',        name_ar:'سالسا',         price:10 },
    { name_en:'Nachos',       name_ar:'ناتشوز',        price:18 },
    { name_en:'Cheese Balls', name_ar:'كرات الجبن',   price:16 },
    { name_en:'Spring Rolls', name_ar:'سبرينج رولز',  price:16 },
    { name_en:'Samosa',       name_ar:'سمبوسة',       price:12 },
  ])

  // ── NEW: Ice Cream ───────────────────────────────────────────────────
  const icecream = upsertCat('Ice Cream','آيس كريم','',113)
  addItems(icecream, [
    { name_en:'Vanilla Ice Cream',    name_ar:'آيس كريم فانيليا',   price:10 },
    { name_en:'Chocolate Ice Cream',  name_ar:'آيس كريم شوكولاتة',  price:10 },
    { name_en:'Strawberry Ice Cream', name_ar:'آيس كريم فراولة',    price:10 },
    { name_en:'Mango Ice Cream',      name_ar:'آيس كريم مانجو',     price:12 },
    { name_en:'Pistachio Ice Cream',  name_ar:'آيس كريم فستق',      price:14 },
    { name_en:'Mixed Scoop',          name_ar:'سكوبة مشكلة',        price:15 },
  ])

  // ── NEW: Arabic & Saudi Favorites ───────────────────────────────────
  const arabic = upsertCat('Arabic & Saudi Favorites','المفضلة السعودية','',73)
  addItems(arabic, [
    { name_en:'Chicken Kabsa',  name_ar:'كبسة دجاج',    price:38 },
    { name_en:'Lamb Kabsa',     name_ar:'كبسة لحم',     price:55 },
    { name_en:'Chicken Mandi',  name_ar:'مندي دجاج',    price:40 },
    { name_en:'Lamb Mandi',     name_ar:'مندي لحم',     price:58 },
    { name_en:'Madghout Chicken',name_ar:'مدغوط دجاج',  price:42 },
    { name_en:'Madfoon Lamb',   name_ar:'مدفون لحم',    price:65 },
    { name_en:'Saleeg',         name_ar:'سليق',         price:35 },
    { name_en:'Jareesh',        name_ar:'جريش',         price:28 },
    { name_en:'Mutabbaq',       name_ar:'مطبق',         price:22 },
    { name_en:'Falafel Plate',  name_ar:'طبق فلافل',    price:18 },
    { name_en:'Hummus Plate',   name_ar:'طبق حمص',      price:18 },
    { name_en:'Foul Medames',   name_ar:'فول مدمس',     price:15 },
  ])

  // ── NEW: Meal Deals ──────────────────────────────────────────────────
  const deals = upsertCat('Meal Deals','عروض الوجبات','',216)
  addItems(deals, [
    { name_en:'Lunch Special',    name_ar:'عرض الغداء',           price:35 },
    { name_en:'Dinner Special',   name_ar:'عرض العشاء',           price:45 },
    { name_en:'Student Meal',     name_ar:'وجبة الطلاب',          price:25 },
    { name_en:'Value Meal',       name_ar:'وجبة اقتصادية',        price:28 },
    { name_en:'Happy Hour Deal',  name_ar:'عرض الساعة السعيدة',   price:32 },
  ])
}

module.exports = { runSchema }
