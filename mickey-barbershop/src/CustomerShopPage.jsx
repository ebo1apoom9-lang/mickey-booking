import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './customer-shop.css'

const CART_KEY = 'mickey-customer-cart-v1'
const money = (value) => new Intl.NumberFormat('th-TH').format(Number(value) || 0) + ' ฿'

export default function CustomerShopPage({ tr, navigate, route }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [detail, setDetail] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }, [cart])

  useEffect(() => {
    if (!cartOpen) return
    const onKeyDown = (event) => { if (event.key === 'Escape') setCartOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('shop-drawer-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('shop-drawer-open')
    }
  }, [cartOpen])

  const loadProducts = async () => {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('products')
      .select('id,name,price,stock,category,brand,description,image_path,is_active')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
    if (queryError) setError(queryError.message)
    else setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { loadProducts() }, [])

  const categories = useMemo(() => ['all', ...new Set(products.map(p => p.category).filter(Boolean))], [products])
  const visibleProducts = useMemo(() => products.filter(p => {
    const text = [p.name, p.brand, p.category, p.description].join(' ').toLowerCase()
    return (category === 'all' || p.category === category) && text.includes(search.toLowerCase())
  }), [products, category, search])
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0)

  const addToCart = (product) => {
    setCart(current => {
      const found = current.find(item => item.id === product.id)
      if (found) return current.map(item => item.id === product.id
        ? { ...item, quantity: Math.min(Number(product.stock), item.quantity + 1) } : item)
      return [...current, { id: product.id, name: product.name, price: product.price, stock: product.stock, image_path: product.image_path, quantity: 1 }]
    })
    setCartOpen(true)
  }
  const updateQuantity = (id, next) => setCart(current => current.map(item =>
    item.id === id ? { ...item, quantity: Math.max(1, Math.min(Number(item.stock) || 1, next)) } : item))
  const removeItem = (id) => setCart(current => current.filter(item => item.id !== id))
  const imageUrl = (path) => path ? supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl : ''

  return <main className="customer-shop">
    <header className="shop-topbar">
      <button className="shop-brand" onClick={() => navigate('/booking')}><span>MICKEY</span><small>BARBERSHOP</small></button>
      <nav className="shop-nav" aria-label={tr('เมนูหลัก', 'Main navigation')}>
        <button className={route === '/booking' ? 'active' : ''} onClick={() => navigate('/booking')}>{tr('จองคิว', 'Book Appointment')}</button>
        <button className={route === '/products' ? 'active' : ''} onClick={() => navigate('/products')}>{tr('สินค้า', 'Shop')}</button>
      </nav>
      <button className="shop-cart-button" onClick={() => setCartOpen(true)} aria-label={tr('เปิดตะกร้าสินค้า', 'Open shopping cart')}>
        <span aria-hidden="true">♧</span> <span>{tr('ตะกร้าสินค้า', 'Cart')}</span><b>{cartCount}</b>
      </button>
    </header>

    {route === '/cart' ? <section className="shop-cart-page">
      <div className="shop-eyebrow">YOUR SELECTION</div>
      <h1>{tr('ตะกร้าสินค้า', 'Shopping Cart')}</h1>
      {!cart.length ? <div className="shop-empty"><p>{tr('ยังไม่มีสินค้าในตะกร้า', 'Your cart is empty.')}</p><button onClick={() => navigate('/products')}>{tr('เลือกซื้อสินค้า', 'Browse Products')}</button></div> :
        <div className="shop-cart-layout">
          <div className="shop-cart-items">{cart.map(item => <article className="shop-cart-item" key={item.id}>
            {item.image_path ? <img src={imageUrl(item.image_path)} alt={item.name}/> : <div className="shop-no-image">MICKEY</div>}
            <div className="shop-cart-info"><h3>{item.name}</h3><strong>{money(item.price)}</strong><div className="shop-quantity"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={tr('ลดจำนวน', 'Decrease quantity')}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label={tr('เพิ่มจำนวน', 'Increase quantity')}>+</button></div></div>
            <button className="shop-remove" onClick={() => removeItem(item.id)}>{tr('ลบ', 'Remove')}</button>
          </article>)}</div>
          <aside className="shop-summary"><h2>{tr('สรุปยอด', 'Order Summary')}</h2><div><span>{tr('จำนวนสินค้า', 'Items')}</span><b>{cartCount}</b></div><div className="shop-total"><span>{tr('ยอดรวม', 'Subtotal')}</span><b>{money(total)}</b></div><button className="shop-checkout-disabled" disabled>{tr('สั่งซื้อ / ชำระเงิน — เร็ว ๆ นี้', 'Checkout — Coming Soon')}</button><p>{tr('ขณะนี้ยังไม่เปิดรับคำสั่งซื้อหรือชำระเงินออนไลน์', 'Online ordering and payment are not available yet.')}</p></aside>
        </div>}
    </section> : <section className="shop-catalog">
      <div className="shop-hero"><div className="shop-eyebrow">MICKEY BARBERSHOP · SHOP</div><h1>{tr('ผลิตภัณฑ์ดูแลเส้นผม', 'Grooming Essentials')}</h1><p>{tr('เลือกผลิตภัณฑ์คุณภาพที่คัดสรรโดย MICKEY BARBERSHOP', 'Discover products selected by MICKEY BARBERSHOP.')}</p></div>
      <div className="shop-tools"><input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr('ค้นหาสินค้า...', 'Search products...')}/><div className="shop-categories">{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c === 'all' ? tr('ทั้งหมด', 'All') : c}</button>)}</div></div>
      {error && <div className="shop-error">{tr('โหลดสินค้าไม่สำเร็จ: ', 'Unable to load products: ')}{error}</div>}
      {loading ? <div className="shop-empty">{tr('กำลังโหลดสินค้า...', 'Loading products...')}</div> : !visibleProducts.length ? <div className="shop-empty">{tr('ยังไม่มีสินค้าในหมวดนี้', 'No products found.')}</div> :
        <div className="shop-product-grid">{visibleProducts.map(product => {
          const image = imageUrl(product.image_path)
          return <article className="shop-product-card" key={product.id}>
            <button className="shop-product-image" onClick={() => setDetail(product)}>{image ? <img src={image} alt={product.name}/> : <span>MICKEY<br/>BARBERSHOP</span>}{product.category && <i>{product.category}</i>}</button>
            <div className="shop-product-copy"><small>{product.brand || 'MICKEY BARBERSHOP'}</small><h3>{product.name}</h3><strong>{money(product.price)}</strong><div className="shop-product-actions"><button className="shop-detail-button" onClick={() => setDetail(product)}>{tr('รายละเอียด', 'Details')}</button><button className="shop-add-button" onClick={() => addToCart(product)}>{tr('เพิ่มลงตะกร้า', 'Add to Cart')}</button></div></div>
          </article>
        })}</div>}
      {detail && <div className="shop-detail-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null) }}><section className="shop-detail-modal" role="dialog" aria-modal="true">
        <button className="shop-detail-close" onClick={() => setDetail(null)} aria-label={tr('ปิด', 'Close')}>×</button>
        {detail.image_path && <img src={imageUrl(detail.image_path)} alt={detail.name}/>}
        <small>{detail.brand || 'MICKEY BARBERSHOP'}</small><h2>{detail.name}</h2><strong>{money(detail.price)}</strong><p>{detail.description || tr('ไม่มีรายละเอียดสินค้าเพิ่มเติม', 'No additional product details.')}</p><button className="shop-add-button" onClick={() => { addToCart(detail); setDetail(null) }}>{tr('เพิ่มลงตะกร้า', 'Add to Cart')}</button>
      </section></div>}
    </section>}

    {cartOpen && <div className="shop-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setCartOpen(false) }}>
      <aside className="shop-cart-drawer" role="dialog" aria-modal="true" aria-label={tr('ตะกร้าสินค้า', 'Shopping cart')}>
        <div className="shop-drawer-header"><div><small>MICKEY BARBERSHOP</small><h2>{tr('ตะกร้าสินค้า', 'Your Cart')} <span>({cartCount})</span></h2></div><button onClick={() => setCartOpen(false)} aria-label={tr('ปิดตะกร้า', 'Close cart')}>×</button></div>
        {!cart.length ? <div className="shop-drawer-empty"><span>♧</span><p>{tr('ยังไม่มีสินค้าในตะกร้า', 'Your cart is empty.')}</p><button onClick={() => { setCartOpen(false); navigate('/products') }}>{tr('เลือกซื้อสินค้า', 'Continue Shopping')}</button></div> :
          <>
            <div className="shop-drawer-items">{cart.map(item => <article className="shop-drawer-item" key={item.id}>
              {item.image_path ? <img src={imageUrl(item.image_path)} alt={item.name}/> : <div className="shop-no-image">MICKEY</div>}
              <div className="shop-drawer-item-info"><h3>{item.name}</h3><strong>{money(item.price)}</strong><div className="shop-quantity"><button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={tr('ลดจำนวน', 'Decrease quantity')}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label={tr('เพิ่มจำนวน', 'Increase quantity')}>+</button></div></div>
              <button className="shop-remove" onClick={() => removeItem(item.id)}>{tr('ลบ', 'Remove')}</button>
            </article>)}</div>
            <div className="shop-drawer-footer"><div><span>{tr('ยอดรวม', 'Subtotal')}</span><strong>{money(total)}</strong></div><p>{tr('ชำระเงินที่ร้าน · ยังไม่เปิดชำระเงินออนไลน์', 'Pay at shop · Online checkout coming soon')}</p><button className="shop-drawer-view-cart" onClick={() => { setCartOpen(false); navigate('/cart') }}>{tr('ดูตะกร้าสินค้าทั้งหมด', 'View Full Cart')}</button></div>
          </>}
      </aside>
    </div>}
    <footer className="shop-footer">MICKEY BARBERSHOP EXPERIENCE · {tr('ชำระเงินที่ร้าน', 'PAY AT SHOP')}</footer>
  </main>
}
