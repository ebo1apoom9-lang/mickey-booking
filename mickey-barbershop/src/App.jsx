import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './styles.css'

const money = (value) =>
  new Intl.NumberFormat('th-TH').format(value || 0) + ' บาท'

const bangkokDate = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type) => parts.find((p) => p.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

const today = () => bangkokDate(new Date())

function App() {
  const [user, setUser] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)
const [route, setRoute] = useState(window.location.pathname)

function navigate(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path)
  }
  setRoute(path)
}

useEffect(() => {
  const handlePopState = () => {
    setRoute(window.location.pathname)
  }

  window.addEventListener('popstate', handlePopState)

  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}, [])

  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [bookings, setBookings] = useState([])

  const [selectedService, setSelectedService] = useState('')
  const [selectedBarber, setSelectedBarber] = useState('')
  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedTime, setSelectedTime] = useState('10:00')

  const [bookingResult, setBookingResult] = useState(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setMessage(error.message)
      setUser(data?.session?.user ?? null)
      setAuthInitialized(true)
    })

    const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null)
  setAuthInitialized(true)
})

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadCustomer() {
      if (!user) {
        setCustomer(null)
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)

      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone, email')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        setMessage('ตรวจสอบสมาชิกไม่สำเร็จ: ' + error.message)
        setCustomer(null)
      } else {
        setCustomer(data)

        if (!data) {
          setFullName(
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ''
          )
          setPhone(user.user_metadata?.phone || '')
        }
      }

      setProfileLoading(false)
    }

    loadCustomer()

    return () => {
      active = false
    }
  }, [user])
  useEffect(() => {
  if (!authInitialized || profileLoading) return

  if (!user && route !== '/login') {
    navigate('/login')
  }

  if (user && route === '/login') {
    navigate('/booking')
  }
}, [authInitialized, profileLoading, user, customer, route])

  async function loadBookingData() {
    const [serviceResult, barberResult] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, price_thb, duration_minutes')
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('active_barbers')
        .select('id, full_name')
        
        
        .order('full_name'),
    ])

    if (serviceResult.error) {
      setMessage('โหลดบริการไม่สำเร็จ: ' + serviceResult.error.message)
    } else {
      setServices(serviceResult.data || [])
    }

    if (barberResult.error) {
      setMessage('โหลดรายชื่อช่างไม่สำเร็จ: ' + barberResult.error.message)
    } else {
      setBarbers(barberResult.data || [])
    }
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_code,
        service_name_snapshot,
        price_thb_snapshot,
        duration_minutes_snapshot,
        starts_at,
        ends_at,
        status,
        payment_status
      `)
      .order('starts_at', { ascending: false })
      .limit(50)

    if (error) {
      setMessage('โหลดประวัติการจองไม่สำเร็จ: ' + error.message)
      return
    }

    setBookings(data || [])
  }

  useEffect(() => {
    if (user && customer) {
      loadBookingData()
      loadBookings()
    } else {
      setServices([])
      setBarbers([])
      setBookings([])
    }
  }, [user, customer])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'register') {
        const normalizedPhone = phone.replace(/[^0-9]/g, '')

        if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
          throw new Error('กรุณากรอกเบอร์โทรศัพท์ 9–15 หลัก')
        }

        if (password.length < 6) {
          throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: normalizedPhone,
            },
          },
        })

        if (error) throw error

        setMessage(
          data.session
            ? 'สมัครสมาชิกสำเร็จ'
            : 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี'
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error
setMessage('เข้าสู่ระบบสำเร็จ')
navigate('/booking')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/booking`,
        },
      })

      if (error) throw error
    } catch (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  async function handleCompleteProfile(e) {
    e.preventDefault()

    if (!user) return

    setLoading(true)
    setMessage('')

    try {
      const normalizedPhone = phone.replace(/[^0-9]/g, '')
      const normalizedName = fullName.trim()

      if (!normalizedName) {
        throw new Error('กรุณากรอกชื่อ-นามสกุล')
      }

      if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
        throw new Error('กรุณากรอกเบอร์โทรศัพท์ 9–15 หลัก')
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({
          auth_user_id: user.id,
          full_name: normalizedName,
          phone: normalizedPhone,
          email: user.email,
          marketing_consent: false,
        })
        .select('id, full_name, phone, email')
        .single()

      if (error) {
        if (error.code === '23505') {
          const { data: existing, error: readError } = await supabase
            .from('customers')
            .select('id, full_name, phone, email')
            .eq('auth_user_id', user.id)
            .maybeSingle()

          if (readError) throw readError
          if (existing) {
            setCustomer(existing)
            setMessage('พบข้อมูลสมาชิกเดิมแล้ว')
            return
          }
        }

        throw error
      }

      setCustomer(data)
      setMessage('บันทึกข้อมูลสมาชิกเรียบร้อยแล้ว')
      navigate('/booking')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBooking(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setBookingResult(null)

    try {
      if (!user || !customer) {
        throw new Error('กรุณาเข้าสู่ระบบก่อนจองคิว')
      }

      if (!selectedService) {
        throw new Error('กรุณาเลือกบริการ')
      }

      if (!selectedDate || !selectedTime) {
        throw new Error('กรุณาเลือกวันที่และเวลา')
      }

      const startsAt = new Date(
        `${selectedDate}T${selectedTime}:00+07:00`
      )

      if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
        throw new Error('กรุณาเลือกเวลาในอนาคต')
      }

      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 14)

      if (startsAt > maxDate) {
        throw new Error('จองล่วงหน้าได้ไม่เกิน 14 วัน')
      }

      const { data, error } = await supabase.rpc(
        'create_customer_booking',
        {
          p_service_id: selectedService,
          p_starts_at: startsAt.toISOString(),
          p_barber_id: selectedBarber || null,
        }
      )

      if (error) throw error

      const result = Array.isArray(data) ? data[0] : data

      if (!result) {
        throw new Error('ระบบไม่ได้ส่งข้อมูลยืนยันการจองกลับมา')
      }

      setBookingResult(result)
      setMessage('จองคิวสำเร็จแล้ว!')
      await loadBookings()
    } catch (error) {
      setMessage(error.message || 'จองคิวไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelBooking(bookingId) {
    const confirmed = window.confirm(
      'ต้องการยกเลิกการจองคิวนี้ใช่หรือไม่?'
    )

    if (!confirmed) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.rpc('cancel_customer_booking', {
        p_booking_id: bookingId,
      })

      if (error) throw error

      setMessage('ยกเลิกการจองเรียบร้อยแล้ว')
      await loadBookings()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setCustomer(null)
      setBookingResult(null)
      setMessage('ออกจากระบบเรียบร้อยแล้ว')
      navigate('/login')
    }

    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessage('กรุณากรอกอีเมลก่อน')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/login` }
    )

    setMessage(
      error
        ? error.message
        : 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลแล้ว'
    )

    setLoading(false)
  }

  const chosenService = useMemo(
    () => services.find((service) => service.id === selectedService),
    [services, selectedService]
  )

  const availableTimes = useMemo(() => {
    const times = []

    for (let hour = 10; hour <= 20; hour++) {
      const time = `${String(hour).padStart(2, '0')}:00`

      if (chosenService && hour * 60 + chosenService.duration_minutes > 20 * 60) {
        continue
      }

      const slot = new Date(`${selectedDate}T${time}:00+07:00`)

      if (slot > new Date()) {
        times.push(time)
      }
    }

    return times
  }, [selectedDate, chosenService])

  useEffect(() => {
    if (availableTimes.length && !availableTimes.includes(selectedTime)) {
      setSelectedTime(availableTimes[0])
    }
  }, [availableTimes, selectedTime])

  const formatDateTime = (value) =>
    new Date(value).toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const statusLabel = (status) => {
    const labels = {
      Confirmed: 'ยืนยันแล้ว',
      'Checked In': 'เช็กอินแล้ว',
      'In Progress': 'กำลังให้บริการ',
      Completed: 'เสร็จสิ้น',
      Cancelled: 'ยกเลิกแล้ว',
      'No Show': 'ไม่มาตามนัด',
    }

    return labels[status] || status
  }

  return (
  <div className="app-shell">
    <header>
      <p>MICKEY BARBERSHOP EXPERIENCE</p>
    </header>

    <main className="main">
        {user && route === '/booking' && profileLoading && (
          <section className="hero">
            <p>กำลังตรวจสอบข้อมูลสมาชิก...</p>
          </section>
        )}

        {user && route === '/booking' && !profileLoading && !customer && (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>
            <h2>กรอกข้อมูลสมาชิก</h2>
            <p className="auth-description">
              กรุณากรอกชื่อและเบอร์โทรศัพท์ก่อนเริ่มใช้งาน
            </p>

            <form onSubmit={handleCompleteProfile}>
              <label>ชื่อ-นามสกุล</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <label>เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <label>อีเมล</label>
              <input value={user.email || ''} disabled />

              <button type="submit" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสมาชิก'}
              </button>
            </form>

            <button className="text-button" onClick={handleLogout}>
              ออกจากระบบ
            </button>
          </section>
        )}

        {!user && route === '/login' && (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>

            <h2>
              {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </h2>

            <p className="auth-description">
              เข้าสู่ระบบเพื่อจองคิวร้านตัดผม
            </p>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <>
                  <label>ชื่อ-นามสกุล</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <label>เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </>
              )}

              <label>อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label>รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button type="submit" disabled={loading}>
                {loading
                  ? 'กำลังดำเนินการ...'
                  : mode === 'login'
                    ? 'เข้าสู่ระบบ'
                    : 'สมัครสมาชิก'}
              </button>
            </form>

            {mode === 'login' && (
              <button className="text-button" onClick={handleForgotPassword}>
                ลืมรหัสผ่าน?
              </button>
            )}

            <button
              className="text-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              เข้าสู่ระบบด้วย Google
            </button>

            <div className="auth-switch">
              {mode === 'login'
                ? 'ยังไม่มีบัญชีสมาชิก?'
                : 'มีบัญชีสมาชิกแล้ว?'}

              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setMessage('')
                }}
              >
                {mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </section>
        )}

        {user && route === '/booking' && !profileLoading && customer && (
  <>
    <section className="hero">
      <span className="gold-text">MICKEY MEMBERSHIP</span>
      <h2>ยินดีต้อนรับ</h2>
      <p>{customer.full_name}</p>
      <p>เบอร์โทรศัพท์: {customer.phone}</p>
      <p>{customer.email}</p>
      <p>เข้าสู่ระบบเรียบร้อยแล้ว</p>
      <button onClick={handleLogout} disabled={loading}>
                {loading ? 'กำลังดำเนินการ...' : 'ออกจากระบบ'}
              </button>
            </section>

            <section className="auth-card booking-card">
              <span className="gold-text">ONLINE BOOKING</span>
              <h2>จองคิวตัดผม</h2>
              <p className="auth-description">
                เลือกบริการ วันที่ และเวลาที่ต้องการ
              </p>

              <form onSubmit={handleBooking}>
                <label>เลือกบริการ</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  required
                >
                  <option value="">-- เลือกบริการ --</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {money(service.price_thb)} (
                      {service.duration_minutes} นาที)
                    </option>
                  ))}
                </select>

                {chosenService && (
                  <div className="booking-summary">
                    <p>บริการ: {chosenService.name}</p>
                    <p>ราคา: {money(chosenService.price_thb)}</p>
                    <p>ระยะเวลา: {chosenService.duration_minutes} นาที</p>
                  </div>
                )}

                <label>เลือกช่าง</label>
                <select
                  value={selectedBarber}
                  onChange={(e) => setSelectedBarber(e.target.value)}
                >
                  <option value="">ให้ระบบจัดสรรช่างอัตโนมัติ</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.full_name}
                    </option>
                  ))}
                </select>

                {barbers.length === 0 && (
                  <p className="booking-note">
                    ขณะนี้ยังไม่พบช่างที่เปิดใช้งานในระบบ
                  </p>
                )}

                <label>เลือกวันที่</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={today()}
                  max={bangkokDate(
                    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                  )}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />

                <label>เลือกเวลา</label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  required
                >
                  {availableTimes.length === 0 && (
                    <option value="">ไม่มีเวลาที่เลือกได้</option>
                  )}
                  {availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {time} น.
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedService ||
                    !selectedTime ||
                    barbers.length === 0
                  }
                >
                  {loading ? 'กำลังจองคิว...' : 'ยืนยันการจอง'}
                </button>
              </form>

              {bookingResult && (
                <div className="booking-success">
                  <h3>จองคิวสำเร็จ!</h3>
                  <p>รหัสจอง: {bookingResult.booking_code || '-'}</p>
                  <p>
                    เวลา: {formatDateTime(bookingResult.starts_at)}
                  </p>
                  <p>
                    ระบบจัดสรรช่างให้เรียบร้อยแล้ว
                  </p>
                </div>
              )}
            </section>

            <section className="auth-card booking-history">
              <span className="gold-text">MY BOOKINGS</span>
              <h2>ประวัติการจอง</h2>

              <button
                type="button"
                className="refresh-button"
                onClick={loadBookings}
                disabled={loading}
              >
                รีเฟรชรายการ
              </button>

              {bookings.length === 0 && (
                <p className="booking-note">ยังไม่มีประวัติการจอง</p>
              )}

              {bookings.map((booking) => (
                <article className="booking-item" key={booking.id}>
                  <h3>
                    {booking.service_name_snapshot}
                  </h3>

                  <p>รหัสจอง: {booking.booking_code || '-'}</p>
                  <p>วันที่: {formatDateTime(booking.starts_at)}</p>
                  <p>ราคา: {money(booking.price_thb_snapshot)}</p>
                  <p>สถานะ: {statusLabel(booking.status)}</p>
                  <p>การชำระเงิน: {booking.payment_status}</p>

                  {booking.status === 'Confirmed' &&
                    new Date(booking.starts_at).getTime() >
                      Date.now() + 2 * 60 * 60 * 1000 && (
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={loading}
                      >
                        ยกเลิกการจอง
                      </button>
                    )}
                </article>
              ))}
            </section>
          </>
        )}

        {message && <div className="auth-message">{message}</div>}
      </main>

      <footer>MICKEY BARBERSHOP © 2026</footer>
    </div>
  )
}

export default App
