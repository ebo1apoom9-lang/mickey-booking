import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './styles.css'

const money = (value) =>
  new Intl.NumberFormat('th-TH').format(Number(value) || 0) + ' บาท'

const bangkokDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const statusLabel = (status) => {
  const labels = {
    Confirmed: 'ยืนยันแล้ว',
    'Checked In': 'เช็กอินแล้ว',
    'In Progress': 'กำลังให้บริการ',
    Completed: 'เสร็จสิ้น',
    Cancelled: 'ยกเลิกแล้ว',
    'No Show': 'ไม่มาตามนัด',
  }
  return labels[status] || status || '-'
}

function App() {
  const [user, setUser] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [authInitialized, setAuthInitialized] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)

  const [route, setRoute] = useState(window.location.pathname || '/login')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const [recoveryReady, setRecoveryReady] = useState(false)

  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [bookings, setBookings] = useState([])
  const [ownerBookings, setOwnerBookings] = useState([])
const [ownerCustomers, setOwnerCustomers] = useState([])
const [customerSearch, setCustomerSearch] = useState('')
const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedService, setSelectedService] = useState('')
  const [selectedBarber, setSelectedBarber] = useState('')
  const [selectedDate, setSelectedDate] = useState(bangkokDate())
  const [scheduleDate, setScheduleDate] = useState(bangkokDate())
  const [selectedTime, setSelectedTime] = useState('10:00')
  const [bookingResult, setBookingResult] = useState(null)

 const isOwner = staffProfile?.role === 'owner'
const isBarber = staffProfile?.role === 'baber'
const isStaffDashboard = isOwner || isBarber

  const navigate = useCallback((path, replace = false) => {
    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState({}, '', path)
      } else {
        window.history.pushState({}, '', path)
      }
    }
    setRoute(path)
  }, [])

  // Keep the route in sync with browser Back / Forward.
  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname || '/login')
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Initialize Supabase authentication.
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error) setMessage(error.message)
      setUser(data?.session?.user ?? null)
      setAuthInitialized(true)
    }

    initialize()

    const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((event, session) => {
  setUser(session?.user ?? null)

  if (event === 'PASSWORD_RECOVERY') {
    setRecoveryReady(true)
    navigate('/reset-password', true)
  }

  setAuthInitialized(true)
})

return () => {
  mounted = false
  subscription.unsubscribe()
}
}, [])

  // Load the signed-in user's staff profile first, then customer profile if needed.
  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      if (!authInitialized) return

      if (!user) {
        setCustomer(null)
        setStaffProfile(null)
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)
      setCustomer(null)
      setStaffProfile(null)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (profileError) {
        setMessage('ตรวจสอบตำแหน่งบัญชีไม่สำเร็จ: ' + profileError.message)
        setProfileLoading(false)
        return
      }

      setStaffProfile(profile)

     // Owner and barber accounts do not need a customer record.
if (profile?.role === 'owner' || profile?.role === 'baber') {
  setProfileLoading(false)
  return
}

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, full_name, phone, email')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!active) return

      if (customerError) {
        setMessage('ตรวจสอบข้อมูลสมาชิกไม่สำเร็จ: ' + customerError.message)
        setCustomer(null)
      } else {
        setCustomer(customerData)

        if (!customerData) {
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

    loadProfile()

    return () => {
      active = false
    }
  }, [user, authInitialized])

// Route users according to their authenticated role.
useEffect(() => {
  if (!authInitialized || profileLoading) return

  // Keep the password recovery page open.
  if (recoveryReady && route === '/reset-password') {
    return
  }

  if (!user) {
    if (route !== '/login') navigate('/login', true)
    return
  }

  if (isOwner) {
    if (route !== '/owner') navigate('/owner', true)
    return
  }

  if (isBarber) {
    if (route !== '/barber') navigate('/barber', true)
    return
  }

  if (route !== '/booking') {
    navigate('/booking', true)
  }
}, [
  authInitialized,
  profileLoading,
  user,
  isOwner,
  isBarber,
  route,
  navigate,
  recoveryReady,
])

// Load services and active barbers.
const loadBookingData = useCallback(async () => {
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
}, [])

// Load customer bookings.
const loadBookings = useCallback(async () => {
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
      barber:profiles!bookings_barber_id_fkey(full_name)
    `)
    .order('starts_at', { ascending: false })
    .limit(50)

  if (error) {
    setMessage('โหลดประวัติการจองไม่สำเร็จ: ' + error.message)
    return
  }

  setBookings(data || [])
}, [])
    const loadOwnerBookings = useCallback(async () => {
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
        payment_status,
        customer:customers!bookings_customer_id_fkey(full_name, phone),
        barber:profiles!bookings_barber_id_fkey(full_name)
      `)
      .order('starts_at', { ascending: false })
      .limit(100)

    if (error) {
      setMessage('โหลดรายการจองของร้านไม่สำเร็จ: ' + error.message)
      return
    }

    setOwnerBookings(data || [])
  }, [])
  // Load customer list for owner management.
const loadOwnerCustomers = useCallback(async () => {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id,
      full_name,
      phone,
      email,
      notes,
      favorite_barber_id,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    setMessage('โหลดรายชื่อลูกค้าไม่สำเร็จ: ' + error.message)
    return
  }

  setOwnerCustomers(data || [])
}, [])

  useEffect(() => {
    if (!authInitialized || profileLoading || !user) {
      setServices([])
      setBarbers([])
      setBookings([])
      setOwnerBookings([])
      setOwnerCustomers([])
      return
    }

    if (isStaffDashboard) {
  loadBookingData()
  loadOwnerBookings()
  loadOwnerCustomers()
} else if (customer) {
  loadBookingData()
  loadBookings()
}
  }, [
    authInitialized,
    profileLoading,
    user,
    customer,
    isStaffDashboard,
    loadBookingData,
    loadBookings,
    loadOwnerBookings,
    loadOwnerCustomers,
  ])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

        try {
      if (mode === 'register') {
        const normalizedPhone = phone.replace(/[^0-9]/g, '')

        if (!fullName.trim()) {
          throw new Error('กรุณากรอกชื่อ-นามสกุล')
        }
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
      }
    } catch (error) {
      setMessage(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/booking`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  async function handleCompleteProfile(event) {
    event.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage('')

    try {
      const normalizedPhone = phone.replace(/[^0-9]/g, '')
      const normalizedName = fullName.trim()

      if (!normalizedName) throw new Error('กรุณากรอกชื่อ-นามสกุล')
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
    } catch (error) {
      setMessage(error.message || 'บันทึกข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function handleBooking(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setBookingResult(null)

    try {
      if (!user || !customer) throw new Error('กรุณาเข้าสู่ระบบก่อนจองคิว')
      if (!selectedService) throw new Error('กรุณาเลือกบริการ')
      if (!selectedDate || !selectedTime) {
        throw new Error('กรุณาเลือกวันที่และเวลา')
      }

      const startsAt = new Date(`${selectedDate}T${selectedTime}:00+07:00`)
      if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
        throw new Error('กรุณาเลือกเวลาในอนาคต')
      }

      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 14)
      if (startsAt > maxDate) {
        throw new Error('จองล่วงหน้าได้ไม่เกิน 14 วัน')
      }

      const { data, error } = await supabase.rpc('create_customer_booking', {
        p_service_id: selectedService,
        p_starts_at: startsAt.toISOString(),
        p_barber_id: selectedBarber || null,
      })

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
    if (!window.confirm('ต้องการยกเลิกการจองคิวนี้ใช่หรือไม่?')) return

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
      setMessage(error.message || 'ยกเลิกการจองไม่สำเร็จ')
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
      setLoading(false)
      return
    }

    setCustomer(null)
    setStaffProfile(null)
    setBookingResult(null)
    setOwnerBookings([])
    navigate('/login', true)
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
      { redirectTo: `${window.location.origin}/reset-password` }
    )

    setMessage(
      error
        ? error.message
        : 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลแล้ว'
    )

    setLoading(false)
  }

  async function handleUpdatePassword() {
    setMessage('')

    if (newPassword.length < 6) {
      setMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setMessage('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่')
      setLoading(false)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setRecoveryReady(false)
    setMessage('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่')

    navigate('/login', true)
    setLoading(false)
  }

  const chosenService = useMemo(
    () => services.find((service) => service.id === selectedService),
    [services, selectedService]
  )

  const availableTimes = useMemo(() => {
    const times = []

    for (let hour = 10; hour <= 20; hour += 1) {
      const time = `${String(hour).padStart(2, '0')}:00`

      if (
        chosenService &&
        hour * 60 + Number(chosenService.duration_minutes || 0) > 20 * 60
      ) {
        continue
      }

      const slot = new Date(`${selectedDate}T${time}:00+07:00`)
      if (slot > new Date()) times.push(time)
    }

    return times
  }, [selectedDate, chosenService])

  useEffect(() => {
    if (availableTimes.length && !availableTimes.includes(selectedTime)) {
      setSelectedTime(availableTimes[0])
    } else if (!availableTimes.length) {
      setSelectedTime('')
    }
  }, [availableTimes, selectedTime])

  const today = bangkokDate()
const scheduleBookings = ownerBookings.filter((booking) => {
  return bangkokDate(new Date(booking.starts_at)) === scheduleDate
})

const scheduleHours = Array.from(
  { length: 10 },
  (_, index) => index + 10
)

const getScheduleBooking = (barberName, hour) => {
  return scheduleBookings.find((booking) => {
    if (booking.barber?.full_name !== barberName) return false

    const start = new Date(booking.starts_at)
    const end = new Date(booking.ends_at)

    const slotStart = new Date(
      `${scheduleDate}T${String(hour).padStart(2, '0')}:00:00+07:00`
    )

    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)

    return start < slotEnd && end > slotStart
  })
}
  const maxBookingDate = bangkokDate(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  )

  const todayOwnerBookings = ownerBookings.filter(
    (booking) => bangkokDate(new Date(booking.starts_at)) === today
  )
  const confirmedOwnerBookings = ownerBookings.filter(
    (booking) => booking.status === 'Confirmed'
  )
  const completedOwnerBookings = ownerBookings.filter(
    (booking) => booking.status === 'Completed'
  )
  const todayRevenue = todayOwnerBookings
    .filter((booking) => booking.status === 'Completed')
    .reduce(
      (total, booking) => total + Number(booking.price_thb_snapshot || 0),
      0
    )

  if (!authInitialized || (user && profileLoading)) {
    return (
      <div className="app-shell">
        <header><p>MICKEY BARBERSHOP EXPERIENCE</p></header>
        <main className="main">
          <section className="hero">
            <p>กำลังตรวจสอบบัญชีของคุณ...</p>
          </section>
        </main>
        <footer>MICKEY BARBERSHOP © 2026</footer>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header>
        <p>MICKEY BARBERSHOP EXPERIENCE</p>
      </header>

      <main className="main">
        {route === '/reset-password' && recoveryReady && (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>
            <h2>ตั้งรหัสผ่านใหม่</h2>
            <p className="auth-description">
              กรุณากรอกรหัสผ่านใหม่ของคุณ
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleUpdatePassword()
              }}
            >
              <label>รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />

              <label>ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />

              {message && <p>{message}</p>}

              <button type="submit" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
              </button>
            </form>
          </section>
        )}

        {!user && route === '/login' && (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>
            <h2>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h2>
            <p className="auth-description">
              เข้าสู่ระบบเพื่อจองคิวร้านตัดผม
            </p>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <>
                  <label>ชื่อ-นามสกุล</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                  <label>เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    required
                  />
                </>
              )}

              <label>อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />

              <label>รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
              <>
                <button
                  type="button"
                  className="text-button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  ลืมรหัสผ่าน?
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  เข้าสู่ระบบด้วย Google
                </button>
              </>
            )}

            <div className="auth-switch">
              {mode === 'login'
                ? 'ยังไม่มีบัญชีสมาชิก?'
                : 'มีบัญชีสมาชิกแล้ว?'}
              <button
                type="button"
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

        {user && isOwner && route === '/owner' && (
          <>
            <section className="hero">
              <span className="gold-text">MICKEY MANAGEMENT</span>
              <h2>แดชบอร์ดเจ้าของร้าน</h2>
              <p>{staffProfile?.full_name || user.email}</p>
              <p>บัญชีผู้ดูแลระบบร้าน MICKEY BARBERSHOP</p>
              <button onClick={handleLogout} disabled={loading}>
                {loading ? 'กำลังดำเนินการ...' : 'ออกจากระบบ'}
              </button>
            </section>

            <section className="auth-card">
              <span className="gold-text">TODAY OVERVIEW</span>
              <h2>ภาพรวมวันนี้</h2>
              <div className="booking-summary">
                <p>คิวทั้งหมดที่โหลดมา: {ownerBookings.length} รายการ</p>
                <p>คิววันนี้: {todayOwnerBookings.length} รายการ</p>
                <p>คิวที่ยืนยันแล้ว: {confirmedOwnerBookings.length} รายการ</p>
                <p>คิวที่เสร็จสิ้น: {completedOwnerBookings.length} รายการ</p>
                <p>ยอดบริการที่เสร็จสิ้นวันนี้: {money(todayRevenue)}</p>
              </div>
              <button
                type="button"
                className="refresh-button"
                onClick={loadOwnerBookings}
                disabled={loading}
              >
                รีเฟรชข้อมูล
              </button>
            </section>

            <section className="auth-card booking-history">
              <span className="gold-text">ALL BOOKINGS</span>
              <h2>รายการจองของร้าน</h2>
              {ownerBookings.length === 0 && (
                <p className="booking-note">ยังไม่พบรายการจอง หรือบัญชีไม่มีสิทธิ์อ่านข้อมูล</p>
              )}
              
<div className="owner-table-wrap">
  <table className="owner-booking-table">
    


<thead>
  <tr>
    <th>ชื่อลูกค้า</th>
    <th>การบริการ</th>
    <th>ชื่อช่าง</th>
    <th>วันเวลา</th>
    <th>รหัสจอง</th>
    <th>สถานะ</th>
    <th>การชำระเงิน</th>
    <th>ราคา</th>
  </tr>
</thead>
<tbody>
  {ownerBookings.map((booking) => (
    <tr key={booking.id}>
      <td>{booking.customer?.full_name || '-'}</td>
      <td>{booking.service_name_snapshot || '-'}</td>
      <td>{booking.barber?.full_name || '-'}</td>
      <td>{formatDateTime(booking.starts_at)}</td>
      <td>{booking.booking_code || '-'}</td>
      <td>{statusLabel(booking.status)}</td>
      <td>{booking.payment_status || '-'}</td>
      <td>{money(booking.price_thb_snapshot)}</td>
    </tr>
  ))}
</tbody>
 </table>
</div>

            </section>

                        {/* CUSTOMER MANAGEMENT */}
            <section className="auth-card customer-management">
              <span className="gold-text">CUSTOMER MANAGEMENT</span>
              <h2>จัดการข้อมูลลูกค้า</h2>

              <p>ลูกค้าทั้งหมด {ownerCustomers.length} คน</p>

              <input
                type="search"
                placeholder="ค้นหาชื่อหรือเบอร์โทรศัพท์..."
                value={customerSearch}
                onChange={(event) =>
                  setCustomerSearch(event.target.value)
                }
              />

              <div className="owner-table-wrap">
                <table className="owner-booking-table">
                  <thead>
                    <tr>
                      <th>ชื่อลูกค้า</th>
                      <th>เบอร์โทรศัพท์</th>
                      <th>อีเมล</th>
                      <th>รายละเอียด</th>
                    </tr>
                  </thead>

                  <tbody>
                    {ownerCustomers
                      .filter((item) => {
                        const search = customerSearch.toLowerCase()
                        return (
                          (item.full_name || '').toLowerCase().includes(search) ||
                          (item.phone || '').includes(customerSearch)
                        )
                      })
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{item.full_name || '-'}</td>
                          <td>{item.phone || '-'}</td>
                          <td>{item.email || '-'}</td>
                          <td>
                            <button
                              type="button"
                              className="refresh-button"
                              onClick={() => setSelectedCustomer(item)}
                            >
                              ดูข้อมูล
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {ownerCustomers.length === 0 && (
                <p className="booking-note">
                  ยังไม่พบข้อมูลลูกค้า
                </p>
              )}

              {selectedCustomer && (
  <div className="customer-details-panel">
    <div className="customer-details-header">
      <span className="gold-text">CUSTOMER PROFILE</span>
      <h3>รายละเอียดข้อมูลลูกค้า</h3>
    </div>

    <div className="customer-details-list">
      <div className="customer-detail-item">
        <span className="customer-detail-label">ชื่อลูกค้า</span>
        <span className="customer-detail-value">
          {selectedCustomer.full_name || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">เบอร์โทรศัพท์</span>
        <span className="customer-detail-value">
          {selectedCustomer.phone || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">อีเมล</span>
        <span className="customer-detail-value">
          {selectedCustomer.email || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">บันทึกเพิ่มเติม</span>
        <span className="customer-detail-value">
          {selectedCustomer.notes || '-'}
        </span>
      </div>
    </div>

         <button
        type="button"
        className="customer-close-button"
        onClick={() => setSelectedCustomer(null)}
      >
        ปิดรายละเอียด
      </button>
    </div>
  )}
              </section>
            </>
          )}

        {user && !isOwner && route === '/booking' && !customer && (
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
                onChange={(event) => setFullName(event.target.value)}
                required
              />
              <label>เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
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

        {user && !isOwner && route === '/booking' && customer && (
          <>
            <section className="hero">
              <span className="gold-text">MICKEY MEMBERSHIP</span>
              <h2>ยินดีต้อนรับ</h2>
              <p>{customer.full_name}</p>
              <p>เบอร์โทรศัพท์: {customer.phone}</p>
              <p>{customer.email || user.email}</p>
              <p>เข้าสู่ระบบเรียบร้อยแล้ว</p>
              <button onClick={handleLogout} disabled={loading}>
                {loading ? 'กำลังดำเนินการ...' : 'ออกจากระบบ'}
              </button>
            </section>

            <section className="auth-card booking-card">
              <span className="gold-text">ONLINE BOOKING</span>
              <h2>จองคิวตัดผม</h2>
              <p className="auth-description">
                เลือกบริการ ช่าง วันที่ และเวลาที่ต้องการ
              </p>

              <form onSubmit={handleBooking}>
                <label>เลือกบริการ</label>
                <select
                  value={selectedService}
                  onChange={(event) => setSelectedService(event.target.value)}
                  required
                >
                  <option value="">-- เลือกบริการ --</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {money(service.price_thb)} ({service.duration_minutes} นาที)
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
                  onChange={(event) => setSelectedBarber(event.target.value)}
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
                  min={today}
                  max={maxBookingDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  required
                />

                <label>เลือกเวลา</label>
                <select
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                  required
                >
                  {!availableTimes.length && (
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
                  <p>เวลา: {formatDateTime(bookingResult.starts_at)}</p>
                  <p>ระบบจัดการคำขอจองเรียบร้อยแล้ว</p>
                </div>
              )}
            </section>

            <section className="auth-card booking-history customer-booking-history">
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

             {bookings.length > 0 && (
  <div className="customer-history-wrap">
    <table className="customer-history-table">
    <thead>
      <tr>
        <th>วันที่</th>
        <th>เวลา</th>
        <th>บริการ</th>
        <th>ช่าง</th>
        <th>ราคา</th>
        <th>สถานะ</th>
      </tr>
    </thead>

    <tbody>
      {bookings.map((booking) => (
        <tr key={booking.id}>
          <td>
            {new Date(booking.starts_at).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Bangkok'
            })}
          </td>

          <td>
            {new Date(booking.starts_at).toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Bangkok'
            })}
          </td>

          <td>{booking.service_name_snapshot || 'บริการ'}</td>
          <td>{booking.barber?.full_name || '-'}</td>
          <td>{money(booking.price_thb_snapshot)}</td>

          <td>
            <span className="customer-status">
              {statusLabel(booking.status)}
            </span>

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
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
)}                            
          </section>                 
          </>
        )}

        {message && <div className="auth-message" role="status">{message}</div>}
      </main>

      <footer>MICKEY BARBERSHOP © 2026</footer>
    </div>
  )
}

export default App
