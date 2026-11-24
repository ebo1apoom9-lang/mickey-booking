import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const BUCKET = 'product-images'
const baht = (value) => '฿' + Number(value || 0).toLocaleString('th-TH')
const emptyForm = { name: '', price: '', stock: '0', category: '', brand: '', description: '', image_path: '', image_url: '' }

const publicImageUrl = (path) => {
  if (!path) return ''
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export default function ProductsPage({ tr }) {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [modal, setModal] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const categories = useMemo(
    () => [...new Set(products.map((item) => item.category).filter(Boolean))].sort(),
    [products]
  )
  const filtered = useMemo(() => products.filter((item) => {
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || [item.name, item.brand, item.category].some((value) => String(value || '').toLowerCase().includes(term))
    return matchesQuery && (!category || item.category === category)
  }), [products, query, category])

  const loadProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('id,name,price,stock,category,brand,description,image_path,is_active,created_at,updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
    if (error) {
      setNotice(tr('โหลดสินค้าไม่สำเร็จ: ', 'Could not load products: ') + error.message)
    } else {
      setProducts((data || []).map((item) => ({ ...item, image: publicImageUrl(item.image_path) })))
      setNotice('')
    }
    setLoading(false)
  }

  useEffect(() => { loadProducts() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModal('form')
  }
  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({ ...emptyForm, ...item, price: String(item.price), stock: String(item.stock), image_url: item.image || '' })
    setModal('form')
  }
  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const resizeImage = (file) => new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error(tr('กรุณาเลือกไฟล์รูปภาพ', 'Please choose an image file.')))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error(tr('รูปภาพต้องมีขนาดไม่เกิน 8 MB', 'Image must be smaller than 8 MB.')))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Invalid image file.'))
      image.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not process image.')), 'image/jpeg', 0.82)
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })

  const handleImage = async (file) => {
    if (!file) return
    try {
      const blob = await resizeImage(file)
      const path = `products/${crypto.randomUUID()}.jpg`
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })
      if (error) throw error
      updateField('image_path', path)
      updateField('image_url', publicImageUrl(path))
      setNotice(tr('อัปโหลดรูปภาพแล้ว กรุณาบันทึกสินค้าเพื่อยืนยัน', 'Image uploaded. Save the product to finish.'))
    } catch (error) {
      setNotice(error.message || tr('อัปโหลดรูปภาพไม่สำเร็จ', 'Image upload failed.'))
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const price = Number(form.price)
    const stock = Number.parseInt(form.stock, 10)
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setNotice(tr('กรุณาตรวจสอบชื่อ ราคา และจำนวนสต็อก', 'Check the product name, price, and stock quantity.'))
      return
    }

    setSaving(true)
    setNotice('')
    const payload = {
      name,
      price,
      stock,
      category: form.category.trim() || null,
      brand: form.brand.trim() || null,
      description: form.description.trim() || null,
      image_path: form.image_path || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }
    const previous = products.find((item) => item.id === editingId)
    let result
    if (editingId) {
      result = await supabase.from('products').update(payload).eq('id', editingId).select().single()
    } else {
      result = await supabase.from('products').insert(payload).select().single()
    }

    if (result.error) {
      if (form.image_path && form.image_path !== previous?.image_path) {
        await supabase.storage.from(BUCKET).remove([form.image_path])
      }
      setNotice(tr('บันทึกสินค้าไม่สำเร็จ: ', 'Could not save product: ') + result.error.message)
      setSaving(false)
      return
    }

    if (previous?.image_path && previous.image_path !== form.image_path) {
      await supabase.storage.from(BUCKET).remove([previous.image_path])
    }
    await loadProducts()
    setModal('')
    setForm(emptyForm)
    setEditingId(null)
    setNotice(tr('บันทึกข้อมูลสินค้าในฐานข้อมูลกลางแล้ว', 'Product saved to shared cloud inventory.'))
    setSaving(false)
  }

  const remove = async (item) => {
    if (!window.confirm(tr('ยืนยันลบสินค้านี้หรือไม่?', 'Delete this product?'))) return
    setSaving(true)
    const { error } = await supabase.from('products').delete().eq('id', item.id)
    if (error) {
      setNotice(tr('ลบสินค้าไม่สำเร็จ: ', 'Could not delete product: ') + error.message)
    } else {
      if (item.image_path) await supabase.storage.from(BUCKET).remove([item.image_path])
      setProducts((current) => current.filter((product) => product.id !== item.id))
      if (selected?.id === item.id) { setSelected(null); setModal('') }
      setNotice(tr('ลบสินค้าเรียบร้อยแล้ว', 'Product deleted.'))
    }
    setSaving(false)
  }

  return (
    <section className="auth-card mickey-products-page">
      <div className="mickey-products-heading">
        <div>
          <span className="gold-text">MICKEY BARBERSHOP · PRODUCT INVENTORY</span>
          <h2>{tr('จัดการสินค้า', 'Product Management')}</h2>
          <p>{tr('จัดการรายการสินค้า ราคา หมวดหมู่ และจำนวนคงเหลือของร้าน', 'Manage the shop product catalogue, prices, categories, and stock.')}</p>
        </div>
        <button type="button" className="mickey-product-primary" onClick={openCreate} disabled={loading || saving}>＋ {tr('เพิ่มสินค้า', 'Add Product')}</button>
      </div>

      <div className="mickey-product-toolbar">
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr('ค้นหาชื่อสินค้า / แบรนด์...', 'Search product or brand...')} />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">{tr('ทุกหมวดหมู่', 'All Categories')}</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <span>{filtered.length} {tr('รายการ', 'products')}</span>
        <button type="button" onClick={loadProducts} disabled={loading || saving}>{tr('รีเฟรช', 'Refresh')}</button>
      </div>

      {notice && <p className="mickey-product-notice" role="status">{notice}</p>}

      {loading ? (
        <div className="mickey-products-empty"><p>{tr('กำลังโหลดข้อมูลสินค้า...', 'Loading products...')}</p></div>
      ) : (
        <div className="mickey-product-grid">
          {filtered.map((item) => (
            <article className="mickey-product-card" key={item.id}>
              <button type="button" className="mickey-product-image" onClick={() => { setSelected(item); setModal('detail') }} aria-label={tr('ดูรายละเอียดสินค้า', 'View product details')}>
                {item.image ? <img src={item.image} alt={item.name} /> : <span>✦</span>}
                {item.stock <= 3 && <b className="mickey-stock-badge">{item.stock === 0 ? tr('สินค้าหมด', 'Out of stock') : tr('ใกล้หมด', 'Low stock')}</b>}
              </button>
              <div className="mickey-product-meta">{item.category || tr('ไม่ระบุหมวดหมู่', 'Uncategorized')}{item.brand ? ' · ' + item.brand : ''}</div>
              <h3>{item.name}</h3>
              <div className="mickey-product-card-bottom">
                <strong>{baht(item.price)}</strong>
                <span>{tr('คงเหลือ', 'Stock')}: {item.stock}</span>
              </div>
              <div className="mickey-product-actions">
                <button type="button" onClick={() => openEdit(item)} disabled={saving}>{tr('แก้ไข', 'Edit')}</button>
                <button type="button" className="danger" onClick={() => remove(item)} disabled={saving}>{tr('ลบ', 'Delete')}</button>
              </div>
            </article>
          ))}
          {!filtered.length && (
            <div className="mickey-products-empty">
              <span>✦</span>
              <h3>{products.length ? tr('ไม่พบสินค้าที่ค้นหา', 'No matching products') : tr('ยังไม่มีสินค้าในระบบ', 'No products yet')}</h3>
              <p>{tr('เริ่มต้นด้วยการเพิ่มสินค้าและกรอกราคา จำนวนคงเหลือ และรายละเอียด', 'Add your first product with its price, stock quantity, and details.')}</p>
              {!products.length && <button type="button" className="mickey-product-primary" onClick={openCreate}>＋ {tr('เพิ่มสินค้าแรก', 'Add First Product')}</button>}
            </div>
          )}
        </div>
      )}

      <p className="mickey-products-storage-note">
        {tr('ข้อมูลสินค้าและรูปภาพจัดเก็บบน Supabase กลาง ทุกอุปกรณ์ที่เข้าสู่ระบบเจ้าของร้านจะเห็นข้อมูลชุดเดียวกัน', 'Products and images are stored in shared Supabase cloud storage. Owner accounts see the same inventory across devices.')}
      </p>

      {modal === 'form' && (
        <div className="mickey-product-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal('') }}>
          <form className="mickey-product-modal" onSubmit={submit}>
            <button type="button" className="mickey-product-close" onClick={() => !saving && setModal('')} aria-label="Close">×</button>
            <span className="gold-text">PRODUCT DETAILS</span>
            <h3>{editingId ? tr('แก้ไขสินค้า', 'Edit Product') : tr('เพิ่มสินค้าใหม่', 'Add New Product')}</h3>
            <label>{tr('รูปสินค้า', 'Product Image')}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleImage(event.target.files?.[0])} disabled={saving} />
            </label>
            {form.image_url && <img className="mickey-product-preview" src={form.image_url} alt={tr('ตัวอย่างรูปสินค้า', 'Product preview')} />}
            <label>{tr('ชื่อสินค้า *', 'Product Name *')}<input value={form.name} onChange={(event) => updateField('name', event.target.value)} required maxLength={120} disabled={saving} /></label>
            <div className="mickey-product-form-row">
              <label>{tr('ราคา (บาท) *', 'Price (THB) *')}<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateField('price', event.target.value)} required disabled={saving} /></label>
              <label>{tr('สต็อก', 'Stock')}<input type="number" min="0" step="1" value={form.stock} onChange={(event) => updateField('stock', event.target.value)} required disabled={saving} /></label>
            </div>
            <div className="mickey-product-form-row">
              <label>{tr('หมวดหมู่', 'Category')}<input value={form.category} onChange={(event) => updateField('category', event.target.value)} placeholder="Haircare" disabled={saving} /></label>
              <label>{tr('แบรนด์', 'Brand')}<input value={form.brand} onChange={(event) => updateField('brand', event.target.value)} disabled={saving} /></label>
            </div>
            <label>{tr('รายละเอียดสินค้า', 'Description')}<textarea rows="4" value={form.description} onChange={(event) => updateField('description', event.target.value)} disabled={saving} /></label>
            <div className="mickey-product-modal-actions">
              <button type="button" className="secondary" onClick={() => setModal('')} disabled={saving}>{tr('ยกเลิก', 'Cancel')}</button>
              <button type="submit" className="mickey-product-primary" disabled={saving}>{saving ? tr('กำลังบันทึก...', 'Saving...') : tr('บันทึกสินค้า', 'Save Product')}</button>
            </div>
          </form>
        </div>
      )}

      {modal === 'detail' && selected && (
        <div className="mickey-product-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal('') }}>
          <div className="mickey-product-modal mickey-product-detail">
            <button type="button" className="mickey-product-close" onClick={() => setModal('')} aria-label="Close">×</button>
            {selected.image ? <img className="mickey-product-detail-image" src={selected.image} alt={selected.name} /> : <div className="mickey-product-detail-placeholder">✦</div>}
            <span className="gold-text">{selected.category || 'PRODUCT'}</span>
            <h3>{selected.name}</h3>
            <strong className="mickey-product-detail-price">{baht(selected.price)}</strong>
            <p>{selected.description || tr('ไม่มีรายละเอียดสินค้า', 'No product description.')}</p>
            <p>{tr('คงเหลือ', 'Stock')}: {selected.stock} {tr('ชิ้น', 'units')}</p>
            <div className="mickey-product-modal-actions">
              <button type="button" className="secondary" onClick={() => setModal('')}>{tr('ปิด', 'Close')}</button>
              <button type="button" className="mickey-product-primary" onClick={() => openEdit(selected)}>{tr('แก้ไขสินค้า', 'Edit Product')}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
