import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, LayoutGrid, List, FolderInput, Eye, EyeOff, X, UtensilsCrossed, FolderOpen } from 'lucide-react'
import Header from '../components/layout/Header'
import Button, { IconButton } from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Switch from '../components/ui/Switch'
import SegmentedControl from '../components/ui/SegmentedControl'
import EmptyState from '../components/ui/EmptyState'
import { Select, SearchInput } from '../components/ui/Input'
import { cn } from '../components/ui/cn'
import CategoryModal from '../components/menu/CategoryModal'
import ItemModal from '../components/menu/ItemModal'
import { itemTint } from '../components/pos/MenuItemCard'
import { useSettingsStore } from '../store/settingsStore'
import { useToast } from '../components/ui/Toast'

function BulkCategoryModal({ open, onClose, categories, count, onAssign }) {
  const [catId, setCatId] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setCatId(categories[0]?.id || '') }, [open, categories])

  const assign = async () => {
    if (!catId) return
    setSaving(true)
    try { await onAssign(Number(catId)) } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open} onClose={onClose} width="max-w-sm"
      title="Move to category"
      description={`${count} item${count !== 1 ? 's' : ''} selected`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!catId} onClick={assign}>Move items</Button></>}
    >
      <Select label="Category" value={catId} onChange={e => setCatId(e.target.value)}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
      </Select>
    </Modal>
  )
}

function Thumb({ item, className }) {
  return item.image_path
    ? <img src={`file://${item.image_path}`} alt="" loading="lazy" className={cn('object-cover', className)} />
    : <div className={cn('flex items-center justify-center text-sm font-semibold', itemTint(item.name_en), className)}>{(item.name_en || ' ')[0].toUpperCase()}</div>
}

function Checkbox({ checked, onChange, label, className }) {
  return (
    <input
      type="checkbox" checked={checked} onChange={onChange} aria-label={label}
      className={cn('h-4 w-4 cursor-pointer rounded border-line-strong accent-[#18181b]', className)}
    />
  )
}

function DiscountLabel({ item, currency }) {
  if (!(item.discount_pct > 0 || item.discount_fixed > 0)) return null
  const parts = []
  if (item.discount_pct > 0) parts.push(`${item.discount_pct}% off`)
  if (item.discount_fixed > 0) parts.push(`${Number(item.discount_fixed).toFixed(2)} ${currency} off`)
  return <Badge tone="green">{parts.join(' + ')}</Badge>
}

export default function PricingPage() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const toast = useToast()
  const currency = useSettingsStore(s => s.currency)

  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [activeTab, setActiveTab] = useState('items')
  const [viewMode, setViewMode] = useState('list')
  const [query, setQuery] = useState('')
  const [catModal, setCatModal] = useState(false)
  const [itemModal, setItemModal] = useState(false)
  const [bulkCatModal, setBulkCatModal] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [filterCat, setFilterCat] = useState(null)
  const [selected, setSelected] = useState(new Set())

  const countByCat = useMemo(() => {
    const m = {}
    items.forEach(i => { m[i.category_id] = (m[i.category_id] || 0) + 1 })
    return m
  }, [items])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(i => (!filterCat || i.category_id === filterCat) &&
      (!q || i.name_en.toLowerCase().includes(q) || (i.name_ar || '').includes(query.trim())))
  }, [items, filterCat, query])

  const allSelected = filteredItems.length > 0 && filteredItems.every(i => selected.has(i.id))
  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filteredItems.map(i => i.id)))
  const clearSelection = () => setSelected(new Set())

  useEffect(() => { loadData() }, [])
  useEffect(() => { clearSelection() }, [activeTab, viewMode, filterCat])

  const loadData = async () => {
    const [cRes, iRes] = await Promise.all([
      window.api.invoke('categories:list'),
      window.api.invoke('menu-items:list'),
    ])
    if (cRes.data) setCategories(cRes.data)
    if (iRes.data) setItems(iRes.data)
  }

  const openNewItem = () => { setEditItem(null); setItemModal(true) }
  const openNewCat = () => { setEditCat(null); setCatModal(true) }

  const deleteCat = async (c) => {
    const n = countByCat[c.id] || 0
    if (!confirm(n ? `Delete "${c.name_en}" and its ${n} item${n !== 1 ? 's' : ''}? This cannot be undone.` : `Delete "${c.name_en}"?`)) return
    const res = await window.api.invoke('categories:delete', { id: c.id })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Category deleted', 'success'); loadData()
  }

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name_en}"?`)) return
    const res = await window.api.invoke('menu-items:delete', { id: item.id })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Item deleted', 'success'); loadData()
    setSelected(s => { const n = new Set(s); n.delete(item.id); return n })
  }

  const setAvailability = async (item, available) => {
    setItems(list => list.map(i => i.id === item.id ? { ...i, is_available: available ? 1 : 0 } : i))
    const res = await window.api.invoke('menu-items:update', { ...item, is_available: available ? 1 : 0 })
    if (res?.error) { toast(res.error, 'error'); loadData() }
  }

  const handleBulkAssign = async (categoryId) => {
    const res = await window.api.invoke('menu-items:bulk-assign-category', { ids: [...selected], category_id: categoryId })
    if (res.error) { toast(res.error, 'error'); return }
    toast(`${selected.size} item${selected.size !== 1 ? 's' : ''} moved`, 'success')
    clearSelection(); setBulkCatModal(false); loadData()
  }

  const handleBulkAvailability = async (available) => {
    const ids = [...selected]
    await Promise.all(ids.map(id => {
      const item = items.find(i => i.id === id)
      return item ? window.api.invoke('menu-items:update', { ...item, is_available: available ? 1 : 0 }) : null
    }))
    toast(`${ids.length} item${ids.length !== 1 ? 's' : ''} ${available ? 'shown' : 'hidden'}`, 'success')
    clearSelection(); loadData()
  }

  const handleBulkDelete = async () => {
    const count = selected.size
    if (!confirm(`Delete ${count} item${count !== 1 ? 's' : ''}? This cannot be undone.`)) return
    await Promise.all([...selected].map(id => window.api.invoke('menu-items:delete', { id })))
    toast(`${count} item${count !== 1 ? 's' : ''} deleted`, 'success')
    clearSelection(); loadData()
  }

  const fmt = (n) => `${Number(n).toFixed(2)}`
  const catName = (c) => (isAr && c.name_ar) ? c.name_ar : c.name_en
  const itemName = (i) => (isAr && i.name_ar) ? i.name_ar : i.name_en

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header
        title={t('pricing.title')}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={activeTab === 'items' ? openNewItem : openNewCat}>
            <span className="hidden sm:inline">{activeTab === 'items' ? t('pricing.addItem') : t('pricing.addCategory')}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="shrink-0 space-y-3 border-b border-line bg-surface px-3 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="Section"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'items', label: t('pricing.items'), count: items.length },
              { value: 'categories', label: t('pricing.categories'), count: categories.length },
            ]}
          />
          {activeTab === 'items' && (
            <>
              <SearchInput className="order-last w-full sm:order-none sm:ms-auto sm:w-64" value={query} onChange={setQuery} placeholder="Search items" />
              <SegmentedControl
                className="ms-auto sm:ms-0"
                ariaLabel="Layout"
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'list', icon: <List size={15} />, ariaLabel: 'List' },
                  { value: 'grid', icon: <LayoutGrid size={15} />, ariaLabel: 'Grid' },
                ]}
              />
            </>
          )}
        </div>
        {activeTab === 'items' && (
          <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:-mx-6 sm:px-6" role="tablist" aria-label="Filter by category">
            {[{ id: null, name_en: 'All', name_ar: 'الكل' }, ...categories].map(c => {
              const active = filterCat === c.id
              return (
                <button
                  key={c.id ?? 'all'} type="button" role="tab" aria-selected={active}
                  onClick={() => setFilterCat(c.id)}
                  className={cn('flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors',
                    active ? 'bg-ink text-white' : 'bg-muted text-ink-2 hover:bg-line hover:text-ink')}
                >
                  {catName(c)}
                  <span className={cn('text-xs tabular', active ? 'text-white/70' : 'text-ink-3')}>{c.id ? (countByCat[c.id] || 0) : items.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto', selected.size > 0 && 'pb-20')}>
        <div className="mx-auto max-w-7xl p-3 sm:p-6">
          {/* Categories */}
          {activeTab === 'categories' && (
            <Card className="overflow-hidden">
              {categories.length === 0 ? (
                <EmptyState icon={<FolderOpen size={20} />} title="No categories yet" description="Categories group items on the POS screen."
                  action={<Button leftIcon={<Plus size={16} />} onClick={openNewCat}>Add category</Button>} />
              ) : (
                <ul className="divide-y divide-line">
                  {categories.map(c => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span className="w-6 shrink-0 text-center text-xs text-ink-3 tabular" title="Sort order">{c.sort_order}</span>
                      <button
                        type="button"
                        onClick={() => { setFilterCat(c.id); setActiveTab('items') }}
                        className="min-w-0 flex-1 text-start"
                      >
                        <p className="truncate text-sm font-medium text-ink hover:underline">
                          {c.name_en}{c.name_ar && <span className="ms-2 font-normal text-ink-3" dir="rtl">{c.name_ar}</span>}
                        </p>
                        <p className="truncate text-xs text-ink-3">{countByCat[c.id] || 0} items{c.description_en ? ` · ${c.description_en}` : ''}</p>
                      </button>
                      <Badge tone={c.is_active ? 'green' : 'neutral'} dot>{c.is_active ? 'Visible' : 'Hidden'}</Badge>
                      <div className="flex shrink-0 gap-0.5">
                        <IconButton size="sm" label={`Edit ${c.name_en}`} icon={<Pencil size={15} />} onClick={() => { setEditCat(c); setCatModal(true) }} />
                        <IconButton size="sm" label={`Delete ${c.name_en}`} icon={<Trash2 size={15} />} className="hover:bg-red-50 hover:text-red-600" onClick={() => deleteCat(c)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Items */}
          {activeTab === 'items' && filteredItems.length === 0 && (
            <Card>
              <EmptyState
                icon={<UtensilsCrossed size={20} />}
                title={query ? 'No items match your search' : filterCat ? 'No items in this category' : 'No menu items yet'}
                action={!query && <Button leftIcon={<Plus size={16} />} onClick={openNewItem}>Add item</Button>}
              />
            </Card>
          )}

          {activeTab === 'items' && viewMode === 'list' && filteredItems.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line bg-muted/60 px-4 py-2.5 text-xs font-medium text-ink-3 sm:px-5">
                <Checkbox checked={allSelected} onChange={toggleAll} label="Select all items" />
                <span className="flex-1">Item</span>
                <span className="hidden w-32 md:block">Category</span>
                <span className="w-20 text-end sm:w-24">Price</span>
                <span className="hidden w-24 text-center sm:block">On POS</span>
                <span className="w-8 sm:w-[72px]"><span className="sr-only">Actions</span></span>
              </div>
              <ul className="divide-y divide-line">
                {filteredItems.map(item => {
                  const isSel = selected.has(item.id)
                  return (
                    <li key={item.id} className={cn('flex items-center gap-3 px-4 py-2.5 sm:px-5', isSel && 'bg-muted/70', !item.is_available && 'text-ink-3')}>
                      <Checkbox checked={isSel} onChange={() => toggleSelect(item.id)} label={`Select ${item.name_en}`} />
                      <Thumb item={item} className={cn('hidden h-10 w-10 shrink-0 rounded-md xs:flex', !item.is_available && 'opacity-50')} />
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => { setEditItem(item); setItemModal(true) }} className="line-clamp-2 text-start text-sm font-medium leading-snug text-ink hover:underline">{itemName(item)}</button>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-xs text-ink-3 md:hidden">{item.category_name_en}</span>
                          <DiscountLabel item={item} currency={currency} />
                          {!!item.vat_exempt && <Badge tone="amber">VAT exempt</Badge>}
                          {!item.is_available && <Badge tone="neutral" className="sm:hidden">Hidden</Badge>}
                        </div>
                      </div>
                      <span className="hidden w-32 truncate text-sm text-ink-2 md:block">{item.category_name_en || <span className="text-red-600">No category</span>}</span>
                      <span className="w-20 text-end text-sm font-semibold text-ink tabular sm:w-24">{fmt(item.price)}</span>
                      <span className="hidden w-24 justify-center sm:flex">
                        <Switch checked={!!item.is_available} onChange={v => setAvailability(item, v)} />
                      </span>
                      <div className="flex w-8 shrink-0 justify-end gap-0.5 sm:w-[72px]">
                        <IconButton size="sm" label={`Edit ${item.name_en}`} icon={<Pencil size={15} />} onClick={() => { setEditItem(item); setItemModal(true) }} />
                        <IconButton size="sm" label={`Delete ${item.name_en}`} icon={<Trash2 size={15} />} className="hidden hover:bg-red-50 hover:text-red-600 sm:inline-flex" onClick={() => deleteItem(item)} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {activeTab === 'items' && viewMode === 'grid' && filteredItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredItems.map(item => {
                const isSel = selected.has(item.id)
                return (
                  <div key={item.id} className={cn('relative overflow-hidden rounded-lg border bg-surface shadow-card transition-shadow hover:shadow-pop', isSel ? 'border-ink ring-2 ring-ink/10' : 'border-line')}>
                    <Checkbox checked={isSel} onChange={() => toggleSelect(item.id)} label={`Select ${item.name_en}`} className="absolute start-2 top-2 z-10 bg-surface" />
                    {!item.is_available && <Badge tone="dark" className="absolute end-2 top-2 z-10">Hidden</Badge>}
                    <button type="button" onClick={() => { setEditItem(item); setItemModal(true) }} className="block w-full text-start" aria-label={`Edit ${item.name_en}`}>
                      <Thumb item={item} className={cn('aspect-[4/3] w-full text-2xl', !item.is_available && 'opacity-50')} />
                      <div className="space-y-1 p-3">
                        <p className="truncate text-sm font-medium text-ink">{itemName(item)}</p>
                        <p className="truncate text-xs text-ink-3">{item.category_name_en}</p>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-sm font-semibold text-ink tabular">{fmt(item.price)} <span className="text-xs font-normal text-ink-3">{currency}</span></span>
                          <DiscountLabel item={item} currency={currency} />
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && activeTab === 'items' && (
        <div className="pb-safe fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-xl bg-ink px-3 pt-2.5 text-white shadow-pop animate-fade-in-up sm:inset-x-6 lg:start-[calc(15rem+1.5rem)]">
          <span className="me-auto ps-1 text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" leftIcon={<FolderInput size={15} />} onClick={() => setBulkCatModal(true)}>Move</Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" leftIcon={<Eye size={15} />} onClick={() => handleBulkAvailability(true)}>Show</Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" leftIcon={<EyeOff size={15} />} onClick={() => handleBulkAvailability(false)}>Hide</Button>
          <Button size="sm" variant="ghost" className="text-red-300 hover:bg-red-500/20 hover:text-red-200" leftIcon={<Trash2 size={15} />} onClick={handleBulkDelete}>Delete</Button>
          <IconButton size="sm" label="Clear selection" icon={<X size={16} />} className="text-white/70 hover:bg-white/10 hover:text-white" onClick={clearSelection} />
        </div>
      )}

      <CategoryModal open={catModal} onClose={() => setCatModal(false)} initial={editCat} onSaved={loadData} />
      <ItemModal open={itemModal} onClose={() => setItemModal(false)} initial={editItem} categories={categories} currency={currency} onSaved={loadData} onDelete={(it) => { setItemModal(false); deleteItem(it) }} />
      <BulkCategoryModal open={bulkCatModal} onClose={() => setBulkCatModal(false)} categories={categories} count={selected.size} onAssign={handleBulkAssign} />
    </div>
  )
}
