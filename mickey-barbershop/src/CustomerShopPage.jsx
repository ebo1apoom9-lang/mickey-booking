import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './customer-shop.css'

const CART_KEY = 'mickey-customer-cart-v1'
const money = (value) => '฿' + new Intl.NumberFormat('th-TH').format(Number(value) || 0)

export default function CustomerShopPage({ tr, navigate, route, onLogout }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailQty, setDetailQty] = useState(1)
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }, [cart])

  useEffect(() => {
    if (!cartOpen && !detail) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { setCartOpen(false); setDetail(null) }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('shop-overlay-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('shop-overlay-open')
    }
  }, [cartOpen, detail])

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true); setError('')
      const { data, error: queryError } = await supabase
        .from('products')
        .select('id,name,price,stock,category,brand,description,image_path,is_active')
        .eq('is_active', true).gt('stock', 0).order('created_at', { ascending: false })
      if (!alive) return
      if (queryError) setError(queryError.message)
      else setProducts(data || [])
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products])
  const visibleProducts = useMemo(() => products.filter(p => {
    const text = [p.name, p.brand, p.category, p.description].join(' ').toLowerCase()
    return (!category || p.category === category) && text.includes(search.trim().toLowerCase())
  }), [products, category, search])
  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
  const imageUrl = (path) => path ? supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl : ''

  const addToCart = (product, quantity = 1) => {
    setCart(current => {
      const found = current.find(item => item.id === product.id)
      if (found) return current.map(item => item.id === product.id
        ? { ...item, quantity: Math.min(Number(product.stock), Number(item.quantity || 0) + quantity) } : item)
      return [...current, { id: product.id, name: product.name, price: product.price, stock: product.stock, image_path: product.image_path, quantity: Math.min(Number(product.stock), quantity) }]
    })
    setCartOpen(true)
  }
  const updateQuantity = (id, next) => setCart(current => current.map(item =>
    item.id === id ? { ...item, quantity: Math.max(1, Math.min(Number(item.stock) || 1, next)) } : item))
  const removeItem = (id) => setCart(current => current.filter(item => item.id !== id))
  const openDetail = (product) => { setDetail(product); setDetailQty(1) }

  return <div className="customer-shop bbr-shop-layout">
    <nav className="customer-main-nav shop-customer-nav" aria-label={tr('เมนูหลัก', 'Main navigation')}>
      <button type="button" className={route === '/booking' ? 'active' : ''} onClick={() => navigate('/booking')}>{tr('จองคิว', 'Book Appointment')}</button>
      <button type="button" className={route === '/products' ? 'active' : ''} onClick={() => navigate('/products')}>{tr('สินค้า', 'Products')}</button>
      <button type="button" className={route === '/cart' ? 'active' : ''} onClick={() => navigate('/cart')}>
        {tr('ตะกร้าสินค้า', 'Shopping Cart')}{cartCount > 0 && <b className="shop-nav-cart-count">{cartCount}</b>}
      </button>
      <button type="button" className={route === '/account' ? 'active' : ''} onClick={() => navigate('/account')}>{tr('จัดการบัญชี', 'Account Management')}</button>
      {onLogout && <button type="button" className="customer-sidebar-logout" onClick={onLogout}>{tr('ออกจากระบบ', 'Sign Out')}</button>}
    </nav>

    <section className="shop-main-area">
      <header className="shop-toolbar">
        <label className="shop-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr('ค้นหาสินค้า...', 'Search products...')}/>{search && <button onClick={() => setSearch('')} aria-label={tr('ล้างคำค้น', 'Clear search')}>×</button>}</label>
        <button className="shop-toolbar-cart" onClick={() => setCartOpen(true)} aria-label={tr('เปิดตะกร้าสินค้า', 'Open cart')}><span>🛒</span><i>{cartCount}</i></button>
      </header>

      {route === '/cart' ? <section className="shop-full-cart">
        <div className="shop-page-heading"><div><small>FADE BARBER STUDIO · SHOPPING</small><h1>{tr('ตะกร้าสินค้า', 'Shopping Cart')}</h1><p>{tr('ตรวจสอบรายการสินค้าของคุณ', 'Review the items you selected.')}</p></div><button onClick={() => navigate('/products')}>＋ {tr('เลือกซื้อสินค้าต่อ', 'Continue Shopping')}</button></div>
        {!cart.length ? <div className="shop-empty-state"><span>🛒</span><h2>{tr('ตะกร้าว่างเปล่า', 'Your cart is empty')}</h2><p>{tr('เลือกสินค้าที่คุณสนใจแล้วเพิ่มลงในตะกร้า', 'Browse products and add your favorites to the cart.')}</p></div> :
          <div className="shop-full-cart-grid"><div className="shop-full-cart-items">{cart.map(item => <article className="shop-full-cart-item" key={item.id}>
            {item.image_path ? <img src={imageUrl(item.image_path)} alt={item.name}/> : <div className="shop-image-placeholder">F</div>}
            <div className="shop-full-item-copy"><small>{tr('ผลิตภัณฑ์ดูแลเส้นผม', 'GROOMING')}</small><h3>{item.name}</h3><strong>{money(item.price)}</strong><div className="shop-qty"><button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>＋</button></div></div>
            <button className="shop-delete-item" onClick={() => removeItem(item.id)}>{tr('ลบ', 'Remove')}</button>
          </article>)}</div><aside className="shop-order-summary"><h2>{tr('สรุปคำสั่งซื้อ', 'Order Summary')}</h2><div><span>{tr('จำนวนสินค้า', 'Items')}</span><b>{cartCount}</b></div><div className="shop-order-total"><span>{tr('ยอดรวมทั้งหมด', 'Total')}</span><strong>{money(total)}</strong></div><button disabled>{tr('ดำเนินการสั่งซื้อ — เร็ว ๆ นี้', 'Checkout — Coming Soon')}</button><p>{tr('ยังไม่เปิดระบบสั่งซื้อและชำระเงินออนไลน์ กรุณาชำระเงินที่ร้าน', 'Online checkout is not available yet. Payment is at the shop.')}</p></aside></div>}
      </section> : <section className="shop-catalog bbr-catalog">
        <div className="shop-page-heading"><div><small>FADE BARBER STUDIO · GROOMING STORE</small><h1>{tr('สินค้า', 'Products')}</h1><p>{tr('เลือกผลิตภัณฑ์ดูแลเส้นผมและจัดแต่งทรงที่คัดสรรมาเพื่อคุณ', 'Professional grooming products, selected for you.')}</p></div><div className="shop-product-count">{tr('สินค้าทั้งหมด', 'PRODUCTS')} <b>{visibleProducts.length}</b></div></div>
        <section className="shop-products-panel">
          <div className="shop-products-panel-head"><div><h2>{tr('รายการสินค้า', 'Product Collection')}</h2><span>{visibleProducts.length} {tr('รายการ', 'items')}</span></div><select value={category} onChange={e => setCategory(e.target.value)}><option value="">{tr('ทุกหมวดหมู่', 'All Categories')}</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          {error && <div className="shop-error">{tr('โหลดสินค้าไม่สำเร็จ: ', 'Unable to load products: ')}{error}</div>}
          {loading ? <div className="shop-empty-state"><span className="shop-loader"/> {tr('กำลังโหลดสินค้า...', 'Loading products...')}</div> :
            !visibleProducts.length ? <div className="shop-empty-state"><span>▦</span><h2>{tr('ไม่พบสินค้า', 'No products found')}</h2><p>{tr('ลองเปลี่ยนคำค้นหาหรือหมวดหมู่', 'Try another search or category.')}</p></div> :
            <div className="shop-product-grid">{visibleProducts.map(product => <article className="shop-product-card" key={product.id}>
              <button className="shop-product-image" onClick={() => openDetail(product)} aria-label={tr('ดูรายละเอียด ', 'View details ')+product.name}>
                {product.image_path ? <img src={imageUrl(product.image_path)} alt={product.name}/> : <span className="shop-product-placeholder">FADE<br/>BARBER STUDIO</span>}
                {product.category && <i>{product.category}</i>}
                <span className="shop-quick-view">{tr('ดูรายละเอียด', 'Quick View')}</span>
              </button>
              <div className="shop-product-copy"><small>{product.brand || product.category || 'FADE BARBER STUDIO'}</small><h3>{product.name}</h3><div className="shop-product-card-bottom"><strong>{money(product.price)}</strong><button onClick={() => addToCart(product)} aria-label={tr('เพิ่มลงตะกร้า ', 'Add to cart ')+product.name}>＋</button></div></div>
            </article>)}</div>}
        </section>
      </section>}
      <footer className="shop-footer">FADE BARBER STUDIO <span>·</span> {tr('ชำระเงินที่ร้าน', 'PAY AT SHOP')}</footer>
    </section>

    {cartOpen && <div className="shop-drawer-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setCartOpen(false) }}>
      <aside className="shop-cart-drawer" role="dialog" aria-modal="true" aria-label={tr('ตะกร้าสินค้า', 'Shopping Cart')}>
        <div className="shop-drawer-header"><div><small>FADE BARBER STUDIO</small><h2>{tr('ตะกร้าสินค้า', 'Shopping Cart')} <span>({cartCount})</span></h2></div><button onClick={() => setCartOpen(false)} aria-label={tr('ปิด', 'Close')}>×</button></div>
        {!cart.length ? <div className="shop-drawer-empty"><span>🛒</span><h3>{tr('ตะกร้าว่างเปล่า', 'Your cart is empty')}</h3><p>{tr('ยังไม่มีสินค้าในตะกร้า', 'No items have been added yet.')}</p><button onClick={() => { setCartOpen(false); navigate('/products') }}>{tr('เลือกซื้อสินค้า', 'Browse Products')}</button></div> :
          <><div className="shop-drawer-items">{cart.map(item => <article className="shop-drawer-item" key={item.id}>
            {item.image_path ? <img src={imageUrl(item.image_path)} alt={item.name}/> : <div className="shop-image-placeholder">F</div>}
            <div className="shop-drawer-item-info"><small>{tr('สินค้า', 'PRODUCT')}</small><h3>{item.name}</h3><strong>{money(item.price)}</strong><div className="shop-qty"><button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>＋</button></div></div>
            <button className="shop-delete-item" onClick={() => removeItem(item.id)} aria-label={tr('ลบสินค้า', 'Remove item')}>×</button>
          </article>)}</div><div className="shop-drawer-bottom"><div className="shop-drawer-total"><span>{tr('รวมทั้งหมด', 'Total')}</span><strong>{money(total)}</strong></div><p>{tr('ชำระเงินที่ร้าน · ยังไม่เปิดชำระเงินออนไลน์', 'Pay at shop · Online checkout coming soon')}</p><button disabled>{tr('ดำเนินการสั่งซื้อ — เร็ว ๆ นี้', 'Checkout — Coming Soon')}</button><button className="shop-view-cart" onClick={() => { setCartOpen(false); navigate('/cart') }}>{tr('ดูตะกร้าสินค้าทั้งหมด', 'View Shopping Cart')}</button></div></>}
      </aside>
    </div>}

    {detail && <div className="shop-detail-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null) }}><section className="shop-detail-modal" role="dialog" aria-modal="true">
      <button className="shop-detail-close" onClick={() => setDetail(null)}>×</button>
      <div className="shop-detail-image">{detail.image_path ? <img src={imageUrl(detail.image_path)} alt={detail.name}/> : <span>FADE<br/>BARBER STUDIO</span>}</div>
      <div className="shop-detail-copy"><small>{detail.category || 'FADE BARBER STUDIO'}{detail.brand ? ' · '+detail.brand : ''}</small><h2>{detail.name}</h2><strong>{money(detail.price)}</strong><p>{detail.description || tr('ไม่มีรายละเอียดสินค้าเพิ่มเติม', 'No additional product details.')}</p><div className="shop-detail-stock">{tr('คงเหลือ', 'In stock')} {detail.stock} {tr('ชิ้น', 'items')}</div><div className="shop-qty shop-detail-qty"><button onClick={() => setDetailQty(q => Math.max(1,q-1))}>−</button><span>{detailQty}</span><button onClick={() => setDetailQty(q => Math.min(Number(detail.stock),q+1))} disabled={detailQty >= detail.stock}>＋</button></div><button className="shop-detail-add" onClick={() => { addToCart(detail,detailQty); setDetail(null) }}>{tr('เพิ่มลงตะกร้า', 'Add to Cart')}</button></div>
    </section></div>}
  </div>
}
