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

const formatDateTime = (value, language = 'th') => {
  if (!value) return '-'

  return new Date(value).toLocaleString(
    language === 'th' ? 'th-TH' : 'en-GB',
    {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  )
}

const statusLabel = (status, language = 'th') => {
  const labels = {
    Confirmed: ['ยืนยันแล้ว', 'Confirmed'],
    'Checked In': ['เช็กอินแล้ว', 'Checked In'],
    'In Progress': ['กำลังให้บริการ', 'In Progress'],
    Completed: ['เสร็จสิ้น', 'Completed'],
    Cancelled: ['ยกเลิกแล้ว', 'Cancelled'],
    'No Show': ['ไม่มาตามนัด', 'No Show'],
  }

  return labels[status]
    ? labels[status][language === 'en' ? 1 : 0]
    : status || '-'
}
function App() {
  const [user, setUser] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [authInitialized, setAuthInitialized] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)

  const [route, setRoute] = useState(window.location.pathname || '/login')
  const [language, setLanguage] = useState(() => {
  return localStorage.getItem('mickey-language') || 'th'
})

useEffect(() => {
  localStorage.setItem('mickey-language', language)
}, [language])
  
  const tr = (thai, english) => {
  return language === 'en' ? english : thai
}
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
  const [publicAvailability, setPublicAvailability] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')

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
  setMessage(tr('โหลดบริการไม่สำเร็จ: ', 'Failed to load services: ') + serviceResult.error.message)
} else {
  setServices(serviceResult.data || [])
}

if (barberResult.error) {
  setMessage(tr('โหลดรายชื่อช่างไม่สำเร็จ: ', 'Failed to load barbers: ') + barberResult.error.message)
} else {
  setBarbers(barberResult.data || [])
}
}, [language])

// Customer-safe availability: the RPC returns only barber IDs and occupied time ranges.
const loadPublicAvailability = useCallback(async () => {
  if (!user || !selectedDate) return
  setAvailabilityLoading(true)
  setAvailabilityError('')
  const { data, error } = await supabase.rpc('get_public_booking_availability', {
    p_date: selectedDate,
  })
  if (error) {
    setAvailabilityError(tr('โหลดตารางคิวไม่สำเร็จ: ', 'Could not load the schedule: ') + error.message)
    setPublicAvailability([])
  } else {
    setPublicAvailability(data || [])
  }
  setAvailabilityLoading(false)
}, [user, selectedDate, language])

useEffect(() => {
  if (user && customer && route === '/booking') loadPublicAvailability()
}, [user, customer, route, selectedDate, loadPublicAvailability])
  
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
          throw new Error(tr('กรุณากรอกชื่อ-นามสกุล', 'Please enter your full name.'))
        }
        if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
          throw new Error(   tr('กรุณากรอกเบอร์โทรศัพท์ 9–15 หลัก', 'Please enter a phone number with 9–15 digits.') )
        }
        if (password.length < 6) {
          throw new Error(   tr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'Password must be at least 6 characters.') )
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
    ? tr('สมัครสมาชิกสำเร็จ', 'Registration successful')
    : tr(
        'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี',
        'Registration successful. Please check your email to confirm your account.'
      )
)
} else {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  setMessage(tr('เข้าสู่ระบบสำเร็จ', 'Login successful'))
}
} catch (error) {
  setMessage(
    error.message || tr('เกิดข้อผิดพลาด กรุณาลองใหม่', 'Something went wrong. Please try again.')
  )
}finally {
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
  setMessage(
    tr(
      `เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ${error.message}`,
      `Google sign-in failed: ${error.message}`
    )
  )
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

      if (!normalizedName) throw new Error(tr('กรุณากรอกชื่อ-นามสกุล', 'Please enter your full name.'))
      if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
        throw new Error(   tr('กรุณากรอกเบอร์โทรศัพท์ 9–15 หลัก', 'Please enter a phone number with 9–15 digits.') )
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
  setMessage(tr('พบข้อมูลสมาชิกเดิมแล้ว', 'Existing member information found.'))
  return
}
}
throw error
}

setCustomer(data)
setMessage(tr('บันทึกข้อมูลสมาชิกเรียบร้อยแล้ว', 'Member information saved successfully.'))
} catch (error) {
  setMessage(
    error.message || tr('บันทึกข้อมูลไม่สำเร็จ', 'Failed to save member information.')
  )
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
    if (!user || !customer) {
      throw new Error(tr('กรุณาเข้าสู่ระบบก่อนจองคิว', 'Please log in before booking.'))
    }

    if (!selectedService) {
      throw new Error(tr('กรุณาเลือกบริการ', 'Please select a service.'))
    }

    if (!selectedDate || !selectedTime) {
      throw new Error(tr('กรุณาเลือกวันที่และเวลา', 'Please select a date and time.'))
    }

    const startsAt = new Date(`${selectedDate}T${selectedTime}:00+07:00`)

    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      throw new Error(tr('กรุณาเลือกเวลาในอนาคต', 'Please select a future time.'))
    }

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)

    if (startsAt > maxDate) {
      throw new Error(tr('จองล่วงหน้าได้ไม่เกิน 14 วัน', 'Bookings can be made up to 14 days in advance.'))
    }

    const { data, error } = await supabase.rpc('create_customer_booking', {
      p_service_id: selectedService,
      p_starts_at: startsAt.toISOString(),
      p_barber_id: selectedBarber || null,
    })

    if (error) throw error

    const result = Array.isArray(data) ? data[0] : data

    if (!result) {
      throw new Error(tr('ระบบไม่ได้ส่งข้อมูลยืนยันการจองกลับมา', 'The booking system did not return confirmation details.'))
    }

    setBookingResult(result)
    setMessage(tr('จองคิวสำเร็จแล้ว!', 'Booking successful!'))

    await loadBookings()
  } catch (error) {
    setMessage(error.message || tr('จองคิวไม่สำเร็จ', 'Booking failed.'))
  } finally {
    setLoading(false)
  }
}

  async function handleCancelBooking(bookingId) {
    if (!window.confirm(tr('ต้องการยกเลิกการจองคิวนี้ใช่หรือไม่?', 'Are you sure you want to cancel this booking?'))) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.rpc('cancel_customer_booking', {
        p_booking_id: bookingId,
      })
      if (error) throw error

      setMessage(tr('ยกเลิกการจองเรียบร้อยแล้ว', 'Booking cancelled successfully.'))
      await loadBookings()
    } catch (error) {
      setMessage(error.message || tr('ยกเลิกการจองไม่สำเร็จ', 'Failed to cancel booking.'))
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
    setMessage(tr('กรุณากรอกอีเมลก่อน', 'Please enter your email address first.'))
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
      : tr(
          'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลแล้ว',
          'A password reset link has been sent to your email.'
        )
  )

  setLoading(false)
}

async function handleUpdatePassword() {
  setMessage('')

  if (newPassword.length < 6) {
    setMessage(tr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'Password must be at least 6 characters.'))
    return
  }

  if (newPassword !== confirmPassword) {
    setMessage(tr('รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'The passwords do not match.'))
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
    setMessage(tr('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่', 'Password changed successfully. Please sign in again.'))
    setLoading(false)
    return
  }

  setNewPassword('')
  setConfirmPassword('')
  setRecoveryReady(false)
  setMessage(tr('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่', 'Password changed successfully. Please sign in with your new password.'))

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
      const duration = Number(chosenService?.duration_minutes || 60)
      const slotEnd = new Date(slot.getTime() + duration * 60 * 1000)
      const closing = new Date(`${selectedDate}T20:00:00+07:00`)
      if (slot <= new Date() || slotEnd > closing) continue

      const eligibleBarbers = selectedBarber
        ? barbers.filter((barber) => barber.id === selectedBarber)
        : barbers
      const hasAvailableBarber = eligibleBarbers.some((barber) => {
        return !publicAvailability.some((item) => {
          if (item.barber_id !== barber.id) return false
          return slot < new Date(item.ends_at) && slotEnd > new Date(item.starts_at)
        })
      })
      if (hasAvailableBarber) times.push(time)
    }

    return times
  }, [selectedDate, chosenService, selectedBarber, barbers, publicAvailability])

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

const isCustomerSlotAvailable = (barberId, hour) => {
  const duration = Number(chosenService?.duration_minutes || 60)
  const start = new Date(`${selectedDate}T${String(hour).padStart(2, '0')}:00:00+07:00`)
  const end = new Date(start.getTime() + duration * 60 * 1000)
  const closing = new Date(`${selectedDate}T20:00:00+07:00`)
  if (end > closing || start <= new Date()) return false
  return !publicAvailability.some((item) => {
    if (item.barber_id !== barberId) return false
    const occupiedStart = new Date(item.starts_at)
    const occupiedEnd = new Date(item.ends_at)
    return start < occupiedEnd && end > occupiedStart
  })
}

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
<header className="app-header">
  <p>MICKEY BARBERSHOP EXPERIENCE</p>

  {(route === '/booking' || route === '/login' || route === '/reset-password') && (
    <div className="language-switch">
      <button
        type="button"
        className={language === 'th' ? 'active' : ''}
        onClick={() => setLanguage('th')}
      >
        TH
      </button>

      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  )}
</header>
      <main className="main">
        {route === '/reset-password' && recoveryReady && (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>
            <h2>{tr('ตั้งรหัสผ่านใหม่', 'Reset Password')}</h2>
<p className="auth-description">
  {tr('กรุณากรอกรหัสผ่านใหม่ของคุณ', 'Please enter your new password.')}
</p>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleUpdatePassword()
              }}
            >
              <label>{tr('รหัสผ่านใหม่', 'New Password')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />

              <label>{tr('ยืนยันรหัสผ่านใหม่', 'Confirm New Password')}</label>
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
              {loading
  ? tr('กำลังบันทึก...', 'Saving...')
  : tr('บันทึกรหัสผ่านใหม่', 'Save New Password')}
              </button>
            </form>
          </section>
        )}

        {!user && route === '/login' && (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>
           <h2>
  {mode === 'login'
    ? tr('เข้าสู่ระบบ', 'Sign In')
    : tr('สมัครสมาชิก', 'Create Account')}
</h2>

<p className="auth-description">
  {tr('เข้าสู่ระบบเพื่อจองคิวร้านตัดผม', 'Sign in to book your appointment.')}
</p>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <>
                  <label>{tr('ชื่อ-นามสกุล', 'Full Name')}</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                  <label>{tr('เบอร์โทรศัพท์', 'Phone Number')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    required
                  />
                </>
              )}

              <label>{tr('อีเมล', 'Email')}</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            <label>{tr('รหัสผ่าน', 'Password')}</label>
<input
  type="password"
  value={password}
  onChange={(event) => setPassword(event.target.value)}
  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
  required
/>

<button type="submit" disabled={loading}>
  {loading
    ? tr('กำลังดำเนินการ...', 'Please wait...')
    : mode === 'login'
      ? tr('เข้าสู่ระบบ', 'Sign In')
      : tr('สมัครสมาชิก', 'Create Account')}
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
                  {tr('ลืมรหัสผ่าน?', 'Forgot Password?')}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  {tr('เข้าสู่ระบบด้วย Google', 'Sign in with Google')}
                </button>
              </>
            )}

           <div className="auth-switch">
  {mode === 'login'
    ? tr('ยังไม่มีบัญชีสมาชิก?', "Don't have an account?")
    : tr('มีบัญชีสมาชิกแล้ว?', 'Already have an account?')}

  <button
    type="button"
    onClick={() => {
      setMode(mode === 'login' ? 'register' : 'login')
      setMessage('')
    }}
  >
    {mode === 'login'
      ? tr('สมัครสมาชิก', 'Sign Up')
      : tr('เข้าสู่ระบบ', 'Sign In')}
  </button>
</div>
          </section>
        )}

        {user && isOwner && route === '/owner' && (
          <>
            <section className="hero">
              <span className="gold-text">MICKEY MANAGEMENT</span>
              <h2>{tr('แดชบอร์ดเจ้าของร้าน', 'Owner Dashboard')}</h2>
              <p>{staffProfile?.full_name || user.email}</p>
              <p>{tr('บัญชีผู้ดูแลระบบร้าน MICKEY BARBERSHOP', 'MICKEY BARBERSHOP Administrator Account')}</p>
              <button onClick={handleLogout} disabled={loading}>
                {loading
  ? tr('กำลังดำเนินการ...', 'Please wait...')
  : tr('ออกจากระบบ', 'Sign Out')}
              </button>
            </section>

          <section className="auth-card today-overview">
  <span className="gold-text">TODAY OVERVIEW</span>
  <h2>{tr('ภาพรวมวันนี้', 'Today Overview')}</h2>

  <div className="booking-summary">

    <div className="summary-row">
      <span>{tr('คิววันนี้', "Today's Bookings")}</span>
     <strong>
        {todayOwnerBookings.length} {tr('รายการ', 'bookings')}
     </strong>
    </div>

    <div className="summary-row">
      <span>{tr('คิวที่เสร็จสิ้น', 'Completed Bookings')}</span>
      <strong>   {completedOwnerBookings.length} {tr('รายการ', 'bookings')} </strong>
    </div>

    <div className="summary-row summary-revenue">
      <span>{tr('ยอดบริการที่เสร็จสิ้นวันนี้', "Today's Revenue")}</span>
      <strong>{money(todayRevenue)}</strong>
    </div>

  </div>

  <button
    type="button"
    className="refresh-button"
    onClick={loadOwnerBookings}
    disabled={loading}
  >
    {tr('รีเฟรชข้อมูล', 'Refresh Data')}
  </button>
</section>
            <section className="auth-card booking-history">
              <span className="gold-text">ALL BOOKINGS</span>
              <h2>{tr('รายการจองของร้าน', 'All Shop Bookings')}</h2>
              {ownerBookings.length === 0 && (
               <p className="booking-note">
  {tr(
    'ยังไม่พบรายการจอง หรือบัญชีไม่มีสิทธิ์อ่านข้อมูล',
    'No bookings found, or this account does not have permission to view them.'
  )}
</p>
              )}
              
<div className="owner-table-wrap">
  <table className="owner-booking-table">
    


<thead>
  <tr>
    <th>{tr('ชื่อลูกค้า', 'Customer')}</th>
    <th>{tr('การบริการ', 'Service')}</th>
    <th>{tr('ชื่อช่าง', 'Barber')}</th>
    <th>{tr('วันเวลา', 'Date & Time')}</th>
    <th>{tr('รหัสจอง', 'Booking ID')}</th>
    <th>{tr('สถานะ', 'Status')}</th>
    <th>{tr('การชำระเงิน', 'Payment')}</th>
    <th>{tr('ราคา', 'Price')}</th>
  </tr>
</thead>
<tbody>
  {ownerBookings.map((booking) => (
    <tr key={booking.id}>
      <td>{booking.customer?.full_name || '-'}</td>
      <td>{booking.service_name_snapshot || '-'}</td>
      <td>{booking.barber?.full_name || '-'}</td>
      <td>{formatDateTime(booking.starts_at, language)}</td>
      <td>{booking.booking_code || '-'}</td>
      <td>{statusLabel(booking.status, language)}</td>
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
              <h2>{tr('จัดการข้อมูลลูกค้า', 'Customer Management')}</h2>

              <p>   
                {tr('ลูกค้าทั้งหมด', 'Total Customers')} {ownerCustomers.length} {tr('คน', 'customers')}
              </p>

              <input
                type="search"
                placeholder={tr('ค้นหาชื่อหรือเบอร์โทรศัพท์...', 'Search name or phone number...')}
                value={customerSearch}
                onChange={(event) =>
                  setCustomerSearch(event.target.value)
                }
              />

              <div className="owner-table-wrap">
                <table className="owner-booking-table">
                  <thead>
                    <tr>
    <th>{tr('ชื่อลูกค้า', 'Customer Name')}</th>
    <th>{tr('เบอร์โทรศัพท์', 'Phone Number')}</th>
    <th>{tr('อีเมล', 'Email')}</th>
    <th>{tr('รายละเอียด', 'Details')}</th>
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
                              {tr('ดูข้อมูล', 'View Details')}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {ownerCustomers.length === 0 && (
                <p className="booking-note">
                  {tr('ยังไม่พบข้อมูลลูกค้า', 'No customer information found.')}
                </p>
              )}

              {selectedCustomer && (
  <div className="customer-details-panel">
    <div className="customer-details-header">
      <span className="gold-text">CUSTOMER PROFILE</span>
      <h3>{tr('รายละเอียดข้อมูลลูกค้า', 'Customer Details')}</h3>
    </div>

    <div className="customer-details-list">
      <div className="customer-detail-item">
        <span className="customer-detail-label">   {tr('ชื่อลูกค้า', 'Customer Name')} </span>
        <span className="customer-detail-value">
          {selectedCustomer.full_name || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">   
          {tr('เบอร์โทรศัพท์', 'Phone Number')} </span>
        <span className="customer-detail-value">
          {selectedCustomer.phone || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">
         {tr('อีเมล', 'Email')}
        </span>
        <span className="customer-detail-value">
          {selectedCustomer.email || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">
  {tr('บันทึกเพิ่มเติม', 'Additional Notes')}
</span>
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
        {tr('ปิดรายละเอียด', 'Close Details')}
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
              <label>{tr('ชื่อ-นามสกุล', 'Full Name')}</label>
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

            <section className="auth-card customer-schedule-card">
              <span className="gold-text">LIVE BOOKING SCHEDULE</span>
              <h2>{tr('ตารางเวลาว่างของช่าง', 'Barber Availability')}</h2>
              <p className="auth-description">{tr('เลือกวันที่และดูช่วงเวลาว่างของช่างแต่ละคน กดช่องว่างเพื่อเลือกเวลาได้เลย', 'Choose a date, view each barber’s availability, and tap an open slot to select it.')}</p>
              <div className="customer-schedule-toolbar">
                <label htmlFor="customer-schedule-date">{tr('วันที่ต้องการจอง', 'Booking Date')}</label>
                <input
                  id="customer-schedule-date"
                  type="date"
                  value={selectedDate}
                  min={today}
                  max={maxBookingDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
                <button type="button" className="schedule-refresh-button" onClick={loadPublicAvailability} disabled={availabilityLoading}>
                  {availabilityLoading ? tr('กำลังโหลด...', 'Loading...') : tr('รีเฟรชตาราง', 'Refresh Schedule')}
                </button>
              </div>
              <div className="schedule-legend">
                <span><i className="legend-open" />{tr('ว่าง', 'Available')}</span>
                <span><i className="legend-busy" />{tr('ไม่ว่าง', 'Booked')}</span>
              </div>
              {availabilityError && <p className="schedule-error">{availabilityError}</p>}
              <div className="customer-schedule-scroll">
                <table className="customer-schedule-table">
                  <thead><tr>
                    <th>{tr('ช่าง', 'Barber')}</th>
                    {scheduleHours.map((hour) => <th key={hour}>{String(hour).padStart(2, '0')}:00</th>)}
                  </tr></thead>
                  <tbody>
                    {barbers.map((barber) => (
                      <tr key={barber.id}>
                        <th>{barber.full_name}</th>
                        {scheduleHours.map((hour) => {
                          const open = isCustomerSlotAvailable(barber.id, hour)
                          const selected = selectedBarber === barber.id && selectedTime === `${String(hour).padStart(2, '0')}:00`
                          return <td key={hour}>
                            <button
                              type="button"
                              className={`schedule-slot ${open ? 'is-open' : 'is-busy'} ${selected ? 'is-selected' : ''}`}
                              disabled={!open || availabilityLoading || !chosenService}
                              title={!chosenService ? tr('เลือกบริการก่อน', 'Select a service first') : open ? tr('เลือกเวลานี้', 'Select this time') : tr('ไม่ว่าง', 'Unavailable')}
                              onClick={() => { setSelectedBarber(barber.id); setSelectedTime(`${String(hour).padStart(2, '0')}:00`) }}
                            >{open ? tr('ว่าง', 'Open') : '—'}</button>
                          </td>
                        })}
                      </tr>
                    ))}
                    {barbers.length === 0 && <tr><td colSpan={11}>{tr('ไม่พบรายชื่อช่างที่เปิดใช้งาน', 'No active barbers found.')}</td></tr>}
                  </tbody>
                </table>
              </div>
              {!chosenService && <p className="schedule-hint">{tr('เลือกบริการด้านล่างก่อน ตารางจะแสดงเวลาว่างตามระยะเวลาของบริการ', 'Select a service below to calculate availability using its duration.')}</p>}
              {chosenService && <p className="schedule-hint">{tr('บริการที่เลือก:', 'Selected service:')} {chosenService.name} · {chosenService.duration_minutes} {tr('นาที', 'min')}</p>}
            </section>

            <section className="auth-card booking-card">
              <span className="gold-text">ONLINE BOOKING</span>
<h2>{tr('จองคิวตัดผม', 'Book an Appointment')}</h2>
<p className="auth-description">
  {tr(
    'เลือกบริการ ช่าง วันที่ และเวลาที่ต้องการ',
    'Choose your service, barber, date and time.'
  )}
</p>

              <form onSubmit={handleBooking}>
                <label>{tr('เลือกบริการ', 'Select Service')}</label>
                <select
                  value={selectedService}
                  onChange={(event) => setSelectedService(event.target.value)}
                  required
                >
                  <option value="">
                    {tr('-- เลือกบริการ --', '-- Select Service --')}
                  </option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                     {service.name} — {money(service.price_thb)} ({service.duration_minutes} {tr('นาที', 'min')})
                    </option>
                  ))}
                </select>

                {chosenService && (
                  <div className="booking-summary">
  <p>{tr('บริการ:', 'Service:')} {chosenService.name}</p>
  <p>{tr('ราคา:', 'Price:')} {money(chosenService.price_thb)}</p>
  <p>{tr('ระยะเวลา:', 'Duration:')} {chosenService.duration_minutes} {tr('นาที', 'min')}</p>
</div>
                )}

                <label>{tr('เลือกช่าง', 'Select Barber')}</label>
                <select
                  value={selectedBarber}
                  onChange={(event) => setSelectedBarber(event.target.value)}
                >
                 <option value="">
  {tr('ให้ระบบจัดสรรช่างอัตโนมัติ', 'Assign Any Barber')}
</option>
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

                <label>{tr('เลือกวันที่', 'Select Date')}</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={today}
                  max={maxBookingDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  required
                />

                <label>{tr('เลือกเวลา', 'Select Time')}</label>
                <select
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                  required
                >
                  {!availableTimes.length && (
                  <option value="">
  {tr('ไม่มีเวลาที่เลือกได้', 'No available time slots')}
</option>
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
                 {loading
  ? tr('กำลังจองคิว...', 'Booking...')
  : tr('ยืนยันการจอง', 'Confirm Booking')}
                </button>
              </form>

              {bookingResult && (
  <div className="booking-success">
    <h3>{tr('จองคิวสำเร็จ!', 'Booking Successful!')}</h3>
    <p>{tr('รหัสจอง:', 'Booking ID:')} {bookingResult.booking_code || '-'}</p>
    <p>{tr('เวลา:', 'Time:')} {formatDateTime(bookingResult.starts_at, language)}</p>
    <p>{tr('ระบบจัดการคำขอจองเรียบร้อยแล้ว', 'Your booking has been processed successfully.')}</p>
  </div>
)}
            </section>

            <section className="auth-card booking-history customer-booking-history">
              <span className="gold-text">MY BOOKINGS</span>
              <h2>{tr('ประวัติการจอง', 'Booking History')}</h2>
              <button
                type="button"
                className="refresh-button"
                onClick={loadBookings}
                disabled={loading}
              >
                {tr('รีเฟรชรายการ', 'Refresh Bookings')}
              </button>

              {bookings.length === 0 && (
               <p className="booking-note">
  {tr('ยังไม่มีประวัติการจอง', 'No booking history yet.')}
</p>
              )}

             {bookings.length > 0 && (
  <div className="customer-history-wrap">
    <table className="customer-history-table">
    <thead>
      <tr>
       <th>{tr('วันที่', 'Date')}</th>
<th>{tr('เวลา', 'Time')}</th>
<th>{tr('บริการ', 'Service')}</th>
<th>{tr('ช่าง', 'Barber')}</th>
<th>{tr('ราคา', 'Price')}</th>
<th>{tr('สถานะ', 'Status')}</th>
      </tr>
    </thead>

    <tbody>
      {bookings.map((booking) => (
        <tr key={booking.id}>
          <td>
            {new Date(booking.starts_at).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Bangkok'
            })}
          </td>

          <td>
            {new Date(booking.starts_at).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Bangkok'
            })}
          </td>

          <td>{booking.service_name_snapshot || tr('บริการ', 'Service')}</td>
          <td>{booking.barber?.full_name || '-'}</td>
          <td>{money(booking.price_thb_snapshot)}</td>

          <td>
            <span className="customer-status">
              {statusLabel(booking.status, language)}
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
                  {tr('ยกเลิกการจอง', 'Cancel Booking')}
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
