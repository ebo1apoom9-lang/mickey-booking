import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

export default function StockPage({ tr }) {
  const [products, setProducts] = useState([])
  const [drafts, setDrafts] = useState({})
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadStock = async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('products')
      .select('id,name,stock,category,brand,updated_at')
      .eq('is_active', true)
      .order('name')
    if (loadError) {
      setError(tr('โหลดสต๊อกไม่สำเร็จ: ', 'Could not load stock: ') + loadError.message)
    } else {
      setProducts(data || [])
      setDrafts(Object.fromEntries((data || []).map(item => [item.id, String(item.stock)])))
      setError('')
    }
    setLoading(false)
  }

  useEffect(() => { loadStock() }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter(item =>
      !term || [item.name, item.brand, item.category]
        .some(value => String(value || '').toLowerCase().includes(term))
    )
  }, [products, query])

  const totalUnits = products.reduce((sum, item) => sum + Number(item.stock || 0), 0)
  const lowCount = products.filter(item => item.stock > 0 && item.stock <= 3).length
  const outCount = products.filter(item => item.stock === 0).length

  const saveStock = async (item) => {
    const nextStock = Number(drafts[item.id])
    if (!Number.isInteger(nextStock) || nextStock < 0) {
      setError(tr('จำนวนสต๊อกต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป', 'Stock must be a whole number of 0 or more.'))
      return
    }
    if (nextStock === Number(item.stock)) return
    setSavingId(item.id)
    setNotice('')
    setError('')
    const { error: saveError } = await supabase.rpc('barber_update_product_stock', {
      p_product_id: item.id,
      p_stock: nextStock,
    })
    if (saveError) {
      setError(tr('บันทึกสต๊อกไม่สำเร็จ: ', 'Could not save stock: ') + saveError.message)
    } else {
      setProducts(current => current.map(product =>
        product.id === item.id
          ? { ...product, stock: nextStock, updated_at: new Date().toISOString() }
          : product
      ))
      setDrafts(current => ({ ...current, [item.id]: String(nextStock) }))
      setNotice(tr('บันทึกจำนวนสต๊อกลงฐานข้อมูลแล้ว', 'Stock quantity saved to the shared database.'))
    }
    setSavingId('')
  }

  return (
    <section className="auth-card barber-stock-page">
      <div className="barber-stock-heading">
        <div>
          <span className="gold-text">MICKEY BARBERSHOP · INVENTORY</span>
          <h2>{tr('สต๊อกสินค้า', 'Stock Inventory')}</h2>
          <p>{tr('ตรวจสอบจำนวนคงเหลือและอัปเดตสต๊อกสินค้า ข้อมูลจะบันทึกไว้ในฐานข้อมูลกลางของร้าน', 'View current stock and update quantities. Changes are saved to the shop’s shared database.')}</p>
        </div>
        <button type="button" className="barber-stock-refresh" onClick={loadStock} disabled={loading || !!savingId}>
          {tr('รีเฟรชข้อมูล', 'Refresh')}
        </button>
      </div>

      <div className="barber-stock-summary">
        <article><span>{tr('สินค้าทั้งหมด', 'Active Products')}</span><strong>{products.length}</strong></article>
        <article><span>{tr('จำนวนคงเหลือรวม', 'Total Units')}</span><strong>{totalUnits.toLocaleString('th-TH')}</strong></article>
        <article><span>{tr('ใกล้หมด (≤ 3)', 'Low Stock (≤ 3)')}</span><strong>{lowCount}</strong></article>
        <article><span>{tr('สินค้าหมด', 'Out of Stock')}</span><strong>{outCount}</strong></article>
      </div>

      <div className="barber-stock-toolbar">
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder={tr('ค้นหาชื่อสินค้า / แบรนด์...', 'Search product or brand...')} />
        <span>{filtered.length} {tr('รายการ', 'items')}</span>
      </div>

      {notice && <p className="barber-stock-notice" role="status">{notice}</p>}
      {error && <p className="barber-stock-error" role="alert">{error}</p>}

      {loading ? (
        <p className="barber-stock-empty">{tr('กำลังโหลดข้อมูลสต๊อก...', 'Loading inventory...')}</p>
      ) : filtered.length ? (
        <div className="barber-stock-table-wrap">
          <table className="barber-stock-table">
            <thead><tr>
              <th>{tr('สินค้า', 'Product')}</th>
              <th>{tr('หมวดหมู่', 'Category')}</th>
              <th>{tr('คงเหลือปัจจุบัน', 'Current Stock')}</th>
              <th>{tr('ปรับจำนวน', 'Update Quantity')}</th>
              <th>{tr('บันทึก', 'Save')}</th>
            </tr></thead>
            <tbody>{filtered.map(item => {
              const draft = drafts[item.id] ?? String(item.stock)
              const changed = draft !== String(item.stock)
              return <tr key={item.id}>
                <td><strong>{item.name}</strong>{item.brand && <small>{item.brand}</small>}</td>
                <td>{item.category || '—'}</td>
                <td><span className={'barber-stock-count ' + (item.stock === 0 ? 'is-out' : item.stock <= 3 ? 'is-low' : '')}>{item.stock} {tr('ชิ้น', 'units')}</span></td>
                <td><input aria-label={tr('จำนวนสต๊อกใหม่', 'New stock quantity')} type="number" min="0" step="1"
                  value={draft} onChange={event => setDrafts(current => ({ ...current, [item.id]: event.target.value }))} /></td>
                <td><button type="button" className="barber-stock-save" disabled={!changed || !!savingId}
                  onClick={() => saveStock(item)}>
                  {savingId === item.id ? tr('กำลังบันทึก...', 'Saving...') : tr('บันทึก', 'Save')}
                </button></td>
              </tr>
            })}</tbody>
          </table>
        </div>
      ) : (
        <p className="barber-stock-empty">{tr('ไม่พบสินค้าในสต๊อก', 'No active products found.')}</p>
      )}
      <p className="barber-stock-footnote">{tr('ทุกครั้งที่บันทึก ระบบจะเก็บผู้แก้ไข จำนวนเดิม จำนวนใหม่ และเวลาไว้ในประวัติการทำรายการของระบบ', 'Each save records the staff member, previous quantity, new quantity, and timestamp in the system audit log.')}</p>
    </section>
  )
}
