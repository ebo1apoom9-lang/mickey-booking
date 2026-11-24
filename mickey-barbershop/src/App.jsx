import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './styles.css'
import './staff-redesign.css'
import ProductsPage from './ProductsPage'
import CustomerShopPage from './CustomerShopPage'
const money = (value) =>
  new Intl.NumberFormat('th-TH').format(Number(value) || 0) + ' เธเธฒเธ—'

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
    Confirmed: ['เธขเธทเธเธขเธฑเธเนเธฅเนเธง', 'Confirmed'],
    'Checked In': ['เน€เธเนเธเธญเธดเธเนเธฅเนเธง', 'Checked In'],
    'In Progress': ['เธเธณเธฅเธฑเธเนเธซเนเธเธฃเธดเธเธฒเธฃ', 'In Progress'],
    Completed: ['เน€เธชเธฃเนเธเธชเธดเนเธ', 'Completed'],
    Cancelled: ['เธขเธเน€เธฅเธดเธเนเธฅเนเธง', 'Cancelled'],
    'No Show': ['เนเธกเนเธกเธฒเธ•เธฒเธกเธเธฑเธ”', 'No Show'],
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

const [activeStaffPage, setActiveStaffPage] = useState('schedule')
const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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
const [staffTimeBlocks, setStaffTimeBlocks] = useState([])
const [weeklyDaysOff, setWeeklyDaysOff] = useState([])
const [selectedDayOffBarberId, setSelectedDayOffBarberId] = useState('')
const [customerSearch, setCustomerSearch] = useState('')
const [selectedCustomer, setSelectedCustomer] = useState(null)

  const [editingCustomerId, setEditingCustomerId] = useState('')
  const [customerEditName, setCustomerEditName] = useState('')
  const [customerEditPhone, setCustomerEditPhone] = useState('')
  const [customerEditNotes, setCustomerEditNotes] = useState('')
  const [customerEditSaving, setCustomerEditSaving] = useState(false)
const [accountEditing, setAccountEditing] = useState(false)
const [accountEditName, setAccountEditName] = useState('')
const [accountEditPhone, setAccountEditPhone] = useState('')
const [accountSaving, setAccountSaving] = useState(false)

  const [selectedService, setSelectedService] = useState('')
  const [selectedBarber, setSelectedBarber] = useState('')
  const [selectedDate, setSelectedDate] = useState(bangkokDate())
  const [scheduleDate, setScheduleDate] = useState(bangkokDate())
  const [selectedTime, setSelectedTime] = useState('')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedStaffBooking, setSelectedStaffBooking] = useState(null)
  const [bookingResult, setBookingResult] = useState(null)
  const [publicAvailability, setPublicAvailability] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')

 const isOwner = staffProfile?.role === 'owner'
const isBarber = ['barber', 'baber'].includes(staffProfile?.role)
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
        setMessage('เธ•เธฃเธงเธเธชเธญเธเธ•เธณเนเธซเธเนเธเธเธฑเธเธเธตเนเธกเนเธชเธณเน€เธฃเนเธ: ' + profileError.message)
        setProfileLoading(false)
        return
      }

      setStaffProfile(profile)

     // Owner and barber accounts do not need a customer record.
if (profile?.role === 'owner' || ['barber', 'baber'].includes(profile?.role)) {
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
        setMessage('เธ•เธฃเธงเธเธชเธญเธเธเนเธญเธกเธนเธฅเธชเธกเธฒเธเธดเธเนเธกเนเธชเธณเน€เธฃเนเธ: ' + customerError.message)
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

  if (!['/booking', '/products', '/cart', '/account'].includes(route)) {
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
  setMessage(tr('เนเธซเธฅเธ”เธเธฃเธดเธเธฒเธฃเนเธกเนเธชเธณเน€เธฃเนเธ: ', 'Failed to load services: ') + serviceResult.error.message)
} else {
  setServices(serviceResult.data || [])
}

if (barberResult.error) {
  setMessage(tr('เนเธซเธฅเธ”เธฃเธฒเธขเธเธทเนเธญเธเนเธฒเธเนเธกเนเธชเธณเน€เธฃเนเธ: ', 'Failed to load barbers: ') + barberResult.error.message)
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
    setAvailabilityError(tr('เนเธซเธฅเธ”เธ•เธฒเธฃเธฒเธเธเธดเธงเนเธกเนเธชเธณเน€เธฃเนเธ: ', 'Could not load the schedule: ') + error.message)
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
    setMessage('เนเธซเธฅเธ”เธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธเธญเธเนเธกเนเธชเธณเน€เธฃเนเธ: ' + error.message)
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
        source,
        barber_id,
        customer:customers!bookings_customer_id_fkey(id, full_name, phone, notes),
        barber:profiles!bookings_barber_id_fkey(full_name)
      `)
      .order('starts_at', { ascending: false })
      .limit(1000)

    if (error) {
      setMessage('เนเธซเธฅเธ”เธฃเธฒเธขเธเธฒเธฃเธเธญเธเธเธญเธเธฃเนเธฒเธเนเธกเนเธชเธณเน€เธฃเนเธ: ' + error.message)
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
    setMessage('เนเธซเธฅเธ”เธฃเธฒเธขเธเธทเนเธญเธฅเธนเธเธเนเธฒเนเธกเนเธชเธณเน€เธฃเนเธ: ' + error.message)
    return
  }

  setOwnerCustomers(data || [])
}, [])

const loadStaffAvailability = useCallback(async () => {
  const [blocksResult, daysOffResult] = await Promise.all([
    supabase
      .from('barber_time_blocks')
      .select('id, barber_id, starts_at, ends_at')
      .order('starts_at'),
    supabase
      .from('barber_weekly_days_off')
      .select('id, barber_id, weekday')
      .order('weekday'),
  ])

  if (blocksResult.error) {
    setMessage(tr('เนเธซเธฅเธ”เธเนเธงเธเน€เธงเธฅเธฒเธ—เธตเน Block เนเธกเนเธชเธณเน€เธฃเนเธ: ', 'Could not load blocked times: ') + blocksResult.error.message)
  } else {
    setStaffTimeBlocks(blocksResult.data || [])
  }

  if (daysOffResult.error) {
    setMessage(tr('เนเธซเธฅเธ”เธงเธฑเธเธซเธขเธธเธ”เธเนเธฒเธเนเธกเนเธชเธณเน€เธฃเนเธ: ', 'Could not load barber days off: ') + daysOffResult.error.message)
  } else {
    setWeeklyDaysOff(daysOffResult.data || [])
  }
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
  loadStaffAvailability()
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
    loadStaffAvailability,
  ])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

        try {
      if (mode === 'register') {
        const normalizedPhone = phone.replace(/[^0-9]/g, '')

        if (!fullName.trim()) {
          throw new Error(tr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ', 'Please enter your full name.'))
        }
        if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
          throw new Error(   tr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน 9โ€“15 เธซเธฅเธฑเธ', 'Please enter a phone number with 9โ€“15 digits.') )
        }
        if (password.length < 6) {
          throw new Error(   tr('เธฃเธซเธฑเธชเธเนเธฒเธเธ•เนเธญเธเธกเธตเธญเธขเนเธฒเธเธเนเธญเธข 6 เธ•เธฑเธงเธญเธฑเธเธฉเธฃ', 'Password must be at least 6 characters.') )
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
    ? tr('เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเธชเธณเน€เธฃเนเธ', 'Registration successful')
    : tr(
        'เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเธชเธณเน€เธฃเนเธ เธเธฃเธธเธ“เธฒเธ•เธฃเธงเธเธชเธญเธเธญเธตเน€เธกเธฅเน€เธเธทเนเธญเธขเธทเธเธขเธฑเธเธเธฑเธเธเธต',
        'Registration successful. Please check your email to confirm your account.'
      )
)
} else {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  setMessage(tr('เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธชเธณเน€เธฃเนเธ', 'Login successful'))
}
} catch (error) {
  setMessage(
    error.message || tr('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ” เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเน', 'Something went wrong. Please try again.')
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
      `เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธ”เนเธงเธข Google เนเธกเนเธชเธณเน€เธฃเนเธ: ${error.message}`,
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

      if (!normalizedName) throw new Error(tr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ', 'Please enter your full name.'))
      if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
        throw new Error(   tr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน 9โ€“15 เธซเธฅเธฑเธ', 'Please enter a phone number with 9โ€“15 digits.') )
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
  setMessage(tr('เธเธเธเนเธญเธกเธนเธฅเธชเธกเธฒเธเธดเธเน€เธ”เธดเธกเนเธฅเนเธง', 'Existing member information found.'))
  return
}
}
throw error
}

setCustomer(data)
setMessage(tr('เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธชเธกเธฒเธเธดเธเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง', 'Member information saved successfully.'))
} catch (error) {
  setMessage(
    error.message || tr('เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเนเธกเนเธชเธณเน€เธฃเนเธ', 'Failed to save member information.')
  )
} finally {
  setLoading(false)
}
}

  function startAccountEdit() {
    setAccountEditName(customer?.full_name || '')
    setAccountEditPhone(customer?.phone || '')
    setAccountEditing(true)
    setMessage('')
  }

  async function saveAccountDetails(event) {
    event.preventDefault()
    if (!user || !customer?.id) return
    const normalizedName = accountEditName.trim()
    const normalizedPhone = accountEditPhone.replace(/[^0-9]/g, '')
    if (!normalizedName) {
      setMessage(tr('กรุณากรอกชื่อ-นามสกุล', 'Please enter your full name.'))
      return
    }
    if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
      setMessage(tr('กรุณากรอกเบอร์โทรศัพท์ 9–15 หลัก', 'Please enter a phone number with 9–15 digits.'))
      return
    }
    setAccountSaving(true)
    setMessage('')
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({ full_name: normalizedName, phone: normalizedPhone })
        .eq('id', customer.id)
        .eq('auth_user_id', user.id)
        .select('id, full_name, phone, email')
        .single()
      if (error) throw error
      if (!data) throw new Error(tr('ไม่พบข้อมูลสมาชิกที่ต้องการแก้ไข', 'Member profile could not be found.'))
      setCustomer(data)
      setAccountEditing(false)
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, full_name: normalizedName, phone: normalizedPhone },
      })
      if (metadataError) console.warn('Could not sync account metadata:', metadataError.message)
      setMessage(tr('อัปเดตชื่อและเบอร์โทรศัพท์ในระบบเรียบร้อยแล้ว', 'Your name and phone number have been updated.'))
    } catch (error) {
      console.error('saveAccountDetails:', error)
      setMessage(error.message || tr('ไม่สามารถอัปเดตข้อมูลบัญชีได้', 'Could not update account details.'))
    } finally {
      setAccountSaving(false)
    }
  }

 async function handleBooking(event) {
  event.preventDefault()
  setLoading(true)
  setMessage('')
  setBookingResult(null)

  try {
    if (!user || !customer) {
      throw new Error(tr('เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเธเธญเธเธเธดเธง', 'Please log in before booking.'))
    }

    if (!selectedService) {
      throw new Error(tr('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธเธฃเธดเธเธฒเธฃ', 'Please select a service.'))
    }

    if (!selectedDate || !selectedTime) {
      throw new Error(tr('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธงเธฑเธเธ—เธตเนเนเธฅเธฐเน€เธงเธฅเธฒ', 'Please select a date and time.'))
    }

    const startsAt = new Date(`${selectedDate}T${selectedTime}:00+07:00`)

    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      throw new Error(tr('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเน€เธงเธฅเธฒเนเธเธญเธเธฒเธเธ•', 'Please select a future time.'))
    }

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)

    if (startsAt > maxDate) {
      throw new Error(tr('เธเธญเธเธฅเนเธงเธเธซเธเนเธฒเนเธ”เนเนเธกเนเน€เธเธดเธ 14 เธงเธฑเธ', 'Bookings can be made up to 14 days in advance.'))
    }

    const { data, error } = await supabase.rpc('create_customer_booking', {
      p_service_id: selectedService,
      p_starts_at: startsAt.toISOString(),
      p_barber_id: selectedBarber || null,
    })

    if (error) throw error

    const result = Array.isArray(data) ? data[0] : data

    if (!result) {
      throw new Error(tr('เธฃเธฐเธเธเนเธกเนเนเธ”เนเธชเนเธเธเนเธญเธกเธนเธฅเธขเธทเธเธขเธฑเธเธเธฒเธฃเธเธญเธเธเธฅเธฑเธเธกเธฒ', 'The booking system did not return confirmation details.'))
    }

    setBookingResult(result)
    setShowBookingModal(false)
    await loadPublicAvailability()
    setMessage(tr('เธเธญเธเธเธดเธงเธชเธณเน€เธฃเนเธเนเธฅเนเธง!', 'Booking successful!'))

    await loadBookings()
  } catch (error) {
    setMessage(error.message || tr('เธเธญเธเธเธดเธงเนเธกเนเธชเธณเน€เธฃเนเธ', 'Booking failed.'))
  } finally {
    setLoading(false)
  }
}

  async function handleCancelBooking(bookingId) {
    if (!window.confirm(tr('เธ•เนเธญเธเธเธฒเธฃเธขเธเน€เธฅเธดเธเธเธฒเธฃเธเธญเธเธเธดเธงเธเธตเนเนเธเนเธซเธฃเธทเธญเนเธกเน?', 'Are you sure you want to cancel this booking?'))) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.rpc('cancel_customer_booking', {
        p_booking_id: bookingId,
      })
      if (error) throw error

      setMessage(tr('เธขเธเน€เธฅเธดเธเธเธฒเธฃเธเธญเธเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง', 'Booking cancelled successfully.'))
      await loadBookings()
    } catch (error) {
      setMessage(error.message || tr('เธขเธเน€เธฅเธดเธเธเธฒเธฃเธเธญเธเนเธกเนเธชเธณเน€เธฃเนเธ', 'Failed to cancel booking.'))
    } finally {
      setLoading(false)
    }
  }


  function startCustomerEdit(customer) {
    if (!customer?.id) return
    setEditingCustomerId(String(customer.id))
    setCustomerEditName(customer.full_name || '')
    setCustomerEditPhone(customer.phone || '')
    setCustomerEditNotes(customer.notes || '')
  }

  async function saveCustomerDetails(customerId) {
    if (!customerId || !customerEditName.trim() || !customerEditPhone.trim()) {
      alert(tr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเธทเนเธญเธฅเธนเธเธเนเธฒเนเธฅเธฐเน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน', 'Please enter the customer name and phone number.'))
      return
    }

    setCustomerEditSaving(true)
    try {
      const { data, error } = await supabase.rpc('update_customer_staff_details', {
        p_customer_id: customerId,
        p_full_name: customerEditName.trim(),
        p_phone: customerEditPhone.trim(),
        p_notes: customerEditNotes.trim() || null,
      })
      if (error) throw error

      const updated = data || {
        id: customerId,
        full_name: customerEditName.trim(),
        phone: customerEditPhone.trim(),
        notes: customerEditNotes.trim() || null,
      }

      setSelectedCustomer(prev =>
        prev && String(prev.id) === String(customerId) ? { ...prev, ...updated } : prev
      )
      setOwnerCustomers(prev =>
        prev.map(item => String(item.id) === String(customerId) ? { ...item, ...updated } : item)
      )
      setOwnerBookings(prev =>
        prev.map(item =>
          String(item.customer?.id) === String(customerId)
            ? { ...item, customer: { ...item.customer, ...updated } }
            : item
        )
      )
      setSelectedStaffBooking(prev =>
        prev && String(prev.customer?.id) === String(customerId)
          ? { ...prev, customer: { ...prev.customer, ...updated } }
          : prev
      )

      setEditingCustomerId('')
      alert(tr('เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธฅเธนเธเธเนเธฒเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง', 'Customer details saved successfully.'))
    } catch (error) {
      console.error('saveCustomerDetails:', error)
      alert(error.message || tr('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธฅเธนเธเธเนเธฒเนเธ”เน', 'Could not save customer details.'))
    } finally {
      setCustomerEditSaving(false)
    }
  }

  function renderCustomerEditForm(customerId) {
    return (
      <div className="customer-edit-form">
        <label>
          {tr('เธเธทเนเธญเธฅเธนเธเธเนเธฒ', 'Customer name')}
          <input
            value={customerEditName}
            onChange={event => setCustomerEditName(event.target.value)}
            disabled={customerEditSaving}
          />
        </label>
        <label>
          {tr('เน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน', 'Phone number')}
          <input
            value={customerEditPhone}
            onChange={event => setCustomerEditPhone(event.target.value)}
            disabled={customerEditSaving}
          />
        </label>
        <label>
          {customerEditNotes.trim()
            ? tr('โ๏ธ เนเธเนเนเธเธเธฑเธเธ—เธถเธ', 'โ๏ธ Edit notes')
            : tr('+ เน€เธเธดเนเธกเธเธฑเธเธ—เธถเธเน€เธเธดเนเธกเน€เธ•เธดเธก', '+ Add notes')}
          <textarea
            value={customerEditNotes}
            onChange={event => setCustomerEditNotes(event.target.value)}
            rows={3}
            disabled={customerEditSaving}
          />
        </label>
        <div className="staff-modal-actions">
          <button
            type="button"
            onClick={() => saveCustomerDetails(customerId)}
            disabled={customerEditSaving}
          >
            {customerEditSaving ? tr('เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...', 'Saving...') : tr('เธเธฑเธเธ—เธถเธ', 'Save')}
          </button>
          <button
            type="button"
            onClick={() => setEditingCustomerId('')}
            disabled={customerEditSaving}
          >
            {tr('เธขเธเน€เธฅเธดเธ', 'Cancel')}
          </button>
        </div>
      </div>
    )
  }

  async function handleStaffBookingUpdate(bookingId, updates) {
    setLoading(true)
    setMessage('')
    try {
      const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId)
      if (error) throw error
      setMessage(tr('เธญเธฑเธเน€เธ”เธ•เธเธดเธงเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง', 'Booking updated.'))
      await loadOwnerBookings()
    } catch (error) {
      setMessage(error.message || tr('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธญเธฑเธเน€เธ”เธ•เธเธดเธงเนเธ”เน', 'Could not update booking.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleScheduleBlock(barberId, hour) {
    const existingBlock = getScheduleBlock(barberId, hour)

    if (existingBlock) {
      if (!window.confirm(tr('เธ•เนเธญเธเธเธฒเธฃเธเธฅเธ” Block เธเนเธงเธเน€เธงเธฅเธฒเธเธตเนเนเธเนเธซเธฃเธทเธญเนเธกเน?', 'Unblock this time slot?'))) return
      setLoading(true)
      const { error } = await supabase
        .from('barber_time_blocks')
        .delete()
        .eq('id', existingBlock.id)
      if (error) {
        setMessage(error.message)
      } else {
        setMessage(tr('เน€เธเธดเธ”เธเนเธงเธเน€เธงเธฅเธฒเธเธฅเธฑเธเธกเธฒเนเธฅเนเธง', 'Time slot is open again.'))
      }
      await loadStaffAvailability()
      setLoading(false)
      return
    }

    if (getScheduleBooking(barberId, hour) || isScheduleDayOff(barberId)) {
      setMessage(tr('เธเนเธงเธเน€เธงเธฅเธฒเธเธตเนเธกเธตเธเธดเธงเธซเธฃเธทเธญเน€เธเนเธเธงเธฑเธเธซเธขเธธเธ”เธญเธขเธนเนเนเธฅเนเธง', 'This slot is already booked or is a day off.'))
      return
    }

    const startsAt = new Date(
      `${scheduleDate}T${String(hour).padStart(2, '0')}:00:00+07:00`
    )
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
    if (startsAt <= new Date()) {
      setMessage(tr('เนเธกเนเธชเธฒเธกเธฒเธฃเธ– Block เน€เธงเธฅเธฒเนเธเธญเธ”เธตเธ•เนเธ”เน', 'Past time slots cannot be blocked.'))
      return
    }

    setLoading(true)
    const { error } = await supabase.from('barber_time_blocks').insert({
      barber_id: barberId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage(tr('Block เธเนเธงเธเน€เธงเธฅเธฒเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง', 'Time slot blocked.'))
    }
    await loadStaffAvailability()
    setLoading(false)
  }

  async function handleWeeklyDayOffChange(barberId, weekday, enabled) {
    const existing = weeklyDaysOff.find(
      (item) =>
        String(item.barber_id) === String(barberId) &&
        Number(item.weekday) === Number(weekday)
    )

    setLoading(true)
    let error = null
    if (enabled && !existing) {
      const result = await supabase
        .from('barber_weekly_days_off')
        .insert({ barber_id: barberId, weekday: Number(weekday) })
      error = result.error
    } else if (!enabled && existing) {
      const result = await supabase
        .from('barber_weekly_days_off')
        .delete()
        .eq('barber_id', barberId)
        .eq('weekday', Number(weekday))
      error = result.error
    }

    if (error) {
      setMessage(error.message)
    } else {
      setMessage(tr('เธเธฑเธเธ—เธถเธเธงเธฑเธเธซเธขเธธเธ”เธเธฃเธฐเธเธณเธชเธฑเธเธ”เธฒเธซเนเนเธฅเนเธง', 'Weekly day off saved.'))
    }
    await loadStaffAvailability()
    setLoading(false)
  }

  async function handleMoveStaffBooking(booking) {
    const current = new Date(booking.starts_at)
    const currentLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(current)
    const currentTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(current)
    const nextDate = window.prompt(tr('เธงเธฑเธเธ—เธตเนเนเธซเธกเน (YYYY-MM-DD)', 'New date (YYYY-MM-DD)'), currentLocal)
    if (!nextDate) return
    const nextTime = window.prompt(tr('เน€เธงเธฅเธฒเนเธซเธกเน (HH:MM)', 'New time (HH:MM)'), currentTime)
    if (!nextTime) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || !/^([01]\d|2[0-3]):00$/.test(nextTime)) {
      setMessage(tr('เธฃเธนเธเนเธเธเธงเธฑเธเธ—เธตเนเธซเธฃเธทเธญเน€เธงเธฅเธฒเนเธกเนเธ–เธนเธเธ•เนเธญเธ', 'Invalid date or time format.'))
      return
    }
    const starts = new Date(`${nextDate}T${nextTime}:00+07:00`)
    const duration = Number(booking.duration_minutes_snapshot || 60)
    const ends = new Date(starts.getTime() + duration * 60000)
    const closing = new Date(`${nextDate}T20:00:00+07:00`)
    const opening = new Date(`${nextDate}T10:00:00+07:00`)
    if (starts < opening || starts <= new Date() || ends > closing) {
      setMessage(tr('เน€เธงเธฅเธฒเนเธซเธกเนเธ•เนเธญเธเธญเธขเธนเนเนเธเน€เธงเธฅเธฒเธ—เธณเธเธฒเธฃ 10:00โ€“20:00 เนเธฅเธฐเน€เธเนเธเน€เธงเธฅเธฒเนเธเธญเธเธฒเธเธ•', 'New time must be in the future and within business hours (10:00โ€“20:00).'))
      return
    }
    const conflict = ownerBookings.some((other) => {
      if (other.id === booking.id || other.barber_id !== booking.barber_id || ['Cancelled', 'No Show'].includes(other.status)) return false
      return starts < new Date(other.ends_at) && ends > new Date(other.starts_at)
    })
    if (conflict) {
      setMessage(tr('เธเนเธฒเธเธกเธตเธเธดเธงเธญเธทเนเธเนเธเธเนเธงเธเน€เธงเธฅเธฒเธเธตเนเนเธฅเนเธง เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเน€เธงเธฅเธฒเนเธซเธกเน', 'This barber already has another booking during that time. Choose another time.'))
      return
    }
    await handleStaffBookingUpdate(booking.id, { starts_at: starts.toISOString(), ends_at: ends.toISOString() })
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
    setMessage(tr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธญเธตเน€เธกเธฅเธเนเธญเธ', 'Please enter your email address first.'))
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
          'เธชเนเธเธฅเธดเธเธเนเธ•เธฑเนเธเธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเนเนเธเธขเธฑเธเธญเธตเน€เธกเธฅเนเธฅเนเธง',
          'A password reset link has been sent to your email.'
        )
  )

  setLoading(false)
}

async function handleUpdatePassword() {
  setMessage('')

  if (newPassword.length < 6) {
    setMessage(tr('เธฃเธซเธฑเธชเธเนเธฒเธเธ•เนเธญเธเธกเธตเธญเธขเนเธฒเธเธเนเธญเธข 6 เธ•เธฑเธงเธญเธฑเธเธฉเธฃ', 'Password must be at least 6 characters.'))
    return
  }

  if (newPassword !== confirmPassword) {
    setMessage(tr('เธฃเธซเธฑเธชเธเนเธฒเธเธ—เธฑเนเธเธชเธญเธเธเนเธญเธเนเธกเนเธ•เธฃเธเธเธฑเธ', 'The passwords do not match.'))
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
    setMessage(tr('เน€เธเธฅเธตเนเธขเธเธฃเธซเธฑเธชเธเนเธฒเธเธชเธณเน€เธฃเนเธ เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเนเธซเธกเน', 'Password changed successfully. Please sign in again.'))
    setLoading(false)
    return
  }

  setNewPassword('')
  setConfirmPassword('')
  setRecoveryReady(false)
  setMessage(tr('เน€เธเธฅเธตเนเธขเธเธฃเธซเธฑเธชเธเนเธฒเธเธชเธณเน€เธฃเนเธ เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธ”เนเธงเธขเธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเน', 'Password changed successfully. Please sign in with your new password.'))

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

  const today = bangkokDate()
const scheduleBookings = ownerBookings.filter((booking) => {
  return bangkokDate(new Date(booking.starts_at)) === scheduleDate
})

const scheduleHours = Array.from(
  { length: 10 },
  (_, index) => index + 10
)

const isCustomerSlotAvailable = (barberId, hour) => {
  if (availabilityLoading || availabilityError) return false
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

const getScheduleBooking = (barberId, hour) => {
  return scheduleBookings.find((booking) => {
    if (booking.barber_id !== barberId) return false
    if (['Cancelled', 'No Show'].includes(booking.status)) return false

    const start = new Date(booking.starts_at)
    const end = new Date(booking.ends_at)
    const slotStart = new Date(
      `${scheduleDate}T${String(hour).padStart(2, '0')}:00:00+07:00`
    )
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)
    return start < slotEnd && end > slotStart
  })
}

const scheduleWeekday = new Date(`${scheduleDate}T12:00:00+07:00`).getUTCDay()

const getScheduleBlock = (barberId, hour) => {
  const slotStart = new Date(
    `${scheduleDate}T${String(hour).padStart(2, '0')}:00:00+07:00`
  )
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)
  return staffTimeBlocks.find((block) => {
    if (String(block.barber_id) !== String(barberId)) return false
    return new Date(block.starts_at) < slotEnd && new Date(block.ends_at) > slotStart
  })
}

const isScheduleDayOff = (barberId) => weeklyDaysOff.some(
  (dayOff) =>
    String(dayOff.barber_id) === String(barberId) &&
    Number(dayOff.weekday) === scheduleWeekday
)

const renderStaffScheduleCell = (barber, hour) => {
  const booking = getScheduleBooking(barber.id, hour)
  if (booking) {
    return (
      <button
        type="button"
        className={`staff-booking-cell status-${String(booking.status || '').toLowerCase().replace(/\s+/g, '-')}`}
        onClick={() => setSelectedStaffBooking(booking)}
      >
        <strong>{booking.customer?.full_name || tr('เธฅเธนเธเธเนเธฒ', 'Customer')}</strong>
        <small>{booking.service_name_snapshot || '-'}</small>
        {booking.source === 'Walk-in' && <small>{tr('Walk-in', 'Walk-in')}</small>}
      </button>
    )
  }

  if (isScheduleDayOff(barber.id)) {
    return <span className="staff-day-off-slot">{tr('เธงเธฑเธเธซเธขเธธเธ”', 'DAY OFF')}</span>
  }

  const block = getScheduleBlock(barber.id, hour)
  if (block) {
    return (
      <button
        type="button"
        className="staff-blocked-slot"
        onClick={() => handleToggleScheduleBlock(barber.id, hour)}
        disabled={loading}
        title={tr('เธเธ”เน€เธเธทเนเธญเธเธฅเธ” Block', 'Click to unblock this time')}
      >
        {tr('BLOCKED ยท เธเธฅเธ”', 'BLOCKED ยท OPEN')}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="staff-open-slot"
      onClick={() => handleToggleScheduleBlock(barber.id, hour)}
      disabled={loading}
      title={tr('เธเธ”เน€เธเธทเนเธญ Block เน€เธงเธฅเธฒเธเธตเน', 'Click to block this time')}
    >
      +
    </button>
  )
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
  const todayCompletedBookings = todayOwnerBookings.filter((booking) => booking.status === 'Completed')
  const todayCancelledBookings = todayOwnerBookings.filter((booking) => booking.status === 'Cancelled')
  const todayNoShowBookings = todayOwnerBookings.filter((booking) => booking.status === 'No Show')
  const todayRevenue = todayCompletedBookings.reduce(
    (total, booking) => total + Number(booking.price_thb_snapshot || 0),
    0
  )
  const monthCompletedBookings = completedOwnerBookings.filter((booking) =>
    bangkokDate(new Date(booking.starts_at)).startsWith(today.slice(0, 7))
  )
  const monthRevenue = monthCompletedBookings.reduce(
    (total, booking) => total + Number(booking.price_thb_snapshot || 0),
    0
  )
  const completedServicePerformance = Object.values(
    completedOwnerBookings.reduce((groups, booking) => {
      const key = `${booking.service_name_snapshot || 'Service'}|||${booking.barber?.full_name || 'Unassigned'}`
      if (!groups[key]) groups[key] = {
        service: booking.service_name_snapshot || 'Service',
        barber: booking.barber?.full_name || 'Unassigned',
        count: 0,
        revenue: 0,
      }
      groups[key].count += 1
      groups[key].revenue += Number(booking.price_thb_snapshot || 0)
      return groups
    }, {})
  ).sort((a, b) => b.count - a.count)

  if (!authInitialized || (user && profileLoading)) {
    return (
      <div className="app-shell">
        <header><p>MICKEY BARBERSHOP EXPERIENCE</p></header>
        <main className="main">
          <section className="hero">
            <p>เธเธณเธฅเธฑเธเธ•เธฃเธงเธเธชเธญเธเธเธฑเธเธเธตเธเธญเธเธเธธเธ“...</p>
          </section>
        </main>
        <footer>MICKEY BARBERSHOP ยฉ 2026</footer>
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
            <h2>{tr('เธ•เธฑเนเธเธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเน', 'Reset Password')}</h2>
<p className="auth-description">
  {tr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเนเธเธญเธเธเธธเธ“', 'Please enter your new password.')}
</p>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleUpdatePassword()
              }}
            >
              <label>{tr('เธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเน', 'New Password')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />

              <label>{tr('เธขเธทเธเธขเธฑเธเธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเน', 'Confirm New Password')}</label>
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
  ? tr('เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...', 'Saving...')
  : tr('เธเธฑเธเธ—เธถเธเธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเน', 'Save New Password')}
              </button>
            </form>
          </section>
        )}

        {!user && route === '/login' && (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>
           <h2>
  {mode === 'login'
    ? tr('เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ', 'Sign In')
    : tr('เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ', 'Create Account')}
</h2>

<p className="auth-description">
  {tr('เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเน€เธเธทเนเธญเธเธญเธเธเธดเธงเธฃเนเธฒเธเธ•เธฑเธ”เธเธก', 'Sign in to book your appointment.')}
</p>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <>
                  <label>{tr('เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ', 'Full Name')}</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                  <label>{tr('เน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน', 'Phone Number')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    required
                  />
                </>
              )}

              <label>{tr('เธญเธตเน€เธกเธฅ', 'Email')}</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            <label>{tr('เธฃเธซเธฑเธชเธเนเธฒเธ', 'Password')}</label>
<input
  type="password"
  value={password}
  onChange={(event) => setPassword(event.target.value)}
  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
  required
/>

<button type="submit" disabled={loading}>
  {loading
    ? tr('เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ...', 'Please wait...')
    : mode === 'login'
      ? tr('เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ', 'Sign In')
      : tr('เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ', 'Create Account')}
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
                  {tr('เธฅเธทเธกเธฃเธซเธฑเธชเธเนเธฒเธ?', 'Forgot Password?')}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  {tr('เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธ”เนเธงเธข Google', 'Sign in with Google')}
                </button>
              </>
            )}

           <div className="auth-switch">
  {mode === 'login'
    ? tr('เธขเธฑเธเนเธกเนเธกเธตเธเธฑเธเธเธตเธชเธกเธฒเธเธดเธ?', "Don't have an account?")
    : tr('เธกเธตเธเธฑเธเธเธตเธชเธกเธฒเธเธดเธเนเธฅเนเธง?', 'Already have an account?')}

  <button
    type="button"
    onClick={() => {
      setMode(mode === 'login' ? 'register' : 'login')
      setMessage('')
    }}
  >
    {mode === 'login'
      ? tr('เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ', 'Sign Up')
      : tr('เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ', 'Sign In')}
  </button>
</div>
          </section>
        )}

        {user && (isOwner || isBarber) && (route === '/owner' || route === '/barber') && (
          <>
          <button type="button" className="mobile-sidebar-toggle" aria-label="Open navigation menu" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen(true)}>โฐ</button>
          {mobileSidebarOpen && <button type="button" className="staff-sidebar-backdrop" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} />}
          <aside className={"staff-sidebar " + (mobileSidebarOpen ? "is-open" : "")} onClick={() => setMobileSidebarOpen(false)}>
  <div className="sidebar-brand">
    MICKEY<span>BARBERSHOP</span>
  </div>


  <a
    href="#schedule"
    className={activeStaffPage === 'schedule' ? 'active' : ''}
    onClick={(e) => {
      e.preventDefault()
      setActiveStaffPage('schedule')
    }}
  >
    {tr('เธ•เธฒเธฃเธฒเธเธเธดเธงเธฃเนเธฒเธ', 'Shop Schedule')}
  </a>

  {!isOwner && (
    <a
      href="#my-schedule"
      className={activeStaffPage === 'my-schedule' ? 'active' : ''}
      onClick={(e) => {
        e.preventDefault()
        setActiveStaffPage('my-schedule')
      }}
    >
      {tr('เธ•เธฒเธฃเธฒเธเธเธฒเธเธเธญเธเธเธฑเธ', 'My Schedule')}
    </a>
  )}

  {isOwner && (
    <>
      <a
        href="#reports"
        className={activeStaffPage === 'reports' ? 'active' : ''}
        onClick={(e) => {
          e.preventDefault()
          setActiveStaffPage('reports')
        }}
      >
        {tr('เธฃเธฒเธขเธเธฒเธเธฃเนเธฒเธ', 'Reports')}
      </a>

      <a
        href="#customers"
        className={activeStaffPage === 'customers' ? 'active' : ''}
        onClick={(e) => {
          e.preventDefault()
          setActiveStaffPage('customers')
        }}
      >
        {tr('เธเธฑเธ”เธเธฒเธฃเธฅเธนเธเธเนเธฒ', 'Customers')}
      </a>

      <a
        href="#products"
        className={activeStaffPage === 'products' ? 'active' : ''}
        onClick={(e) => {
          e.preventDefault()
          setActiveStaffPage('products')
        }}
      >
        {tr('\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32', 'Products')}
      </a>

      <a
        href="#barbers"
        className={activeStaffPage === 'barbers' ? 'active' : ''}
        onClick={(e) => {
          e.preventDefault()
          setActiveStaffPage('barbers')
        }}
      >
        {tr('เธเธฑเธ”เธเธฒเธฃเธเนเธฒเธเธ•เธฑเธ”เธเธก', 'Barbers')}
      </a>

      <a
        href="#settings"
        className={activeStaffPage === 'settings' ? 'active' : ''}
        onClick={(e) => {
          e.preventDefault()
          setActiveStaffPage('settings')
        }}
      >
        {tr('เธ•เธฑเนเธเธเนเธฒเธฃเนเธฒเธ', 'Settings')}
      </a>
    </>
  )}

  <button
    type="button"
    onClick={() => setShowLogoutConfirm(true)}
    disabled={loading}
  >
    {tr('เธญเธญเธเธเธฒเธเธฃเธฐเธเธ', 'Sign Out')}
  </button>
</aside>
          </>
        )}

        {user && isOwner && route === '/owner' && (
          <>
            {activeStaffPage === 'schedule' && (
              <>
            <section id="staff-schedule" className="auth-card staff-schedule-section">
              <span className="gold-text">SHOP DAILY SCHEDULE</span>
              <div className="staff-schedule-heading">
                <div>
                  <h2>{tr('เธ•เธฒเธฃเธฒเธเธเธฒเธเธเนเธฒเธเธ—เธธเธเธเธ', 'All Barbers Schedule')}</h2>
                  <p>{tr('เธ เธฒเธเธฃเธงเธกเธเธดเธงเธเธญเธเธฃเนเธฒเธ เนเธขเธเธ•เธฒเธกเธเนเธฒเธเนเธฅเธฐเธเนเธงเธเน€เธงเธฅเธฒ ยท เธเนเธญเธ โ€” เธเธทเธญเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเธเธญเธ', 'Shop-wide bookings by barber and time. โ€” means no booking is listed.')}</p>
                </div>
                <label>{tr('เธงเธฑเธเธ—เธตเน', 'Date')}
                  <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
                </label>
              </div>
              <div className="customer-schedule-scroll">
                <table className="staff-schedule-table">
                  <thead><tr><th>{tr('เธเนเธฒเธ', 'Barber')}</th>{scheduleHours.map((hour) => <th key={hour}>{String(hour).padStart(2, '0')}:00</th>)}</tr></thead>
                  <tbody>
                    {barbers.map((barber) => (
                      <tr key={barber.id}>
                        <th>{barber.full_name}</th>
                        {scheduleHours.map((hour) => (
                          <td key={hour}>{renderStaffScheduleCell(barber, hour)}</td>
                        ))}
                      </tr>
                    ))}
                    {!barbers.length && <tr><td colSpan={11}>{tr('เนเธกเนเธเธเธฃเธฒเธขเธเธทเนเธญเธเนเธฒเธ', 'No barbers found.')}</td></tr>}
                  </tbody>
                </table>
              </div>


            </section>
              </>
            )}

            {activeStaffPage === 'products' && <ProductsPage tr={tr} />}

            {activeStaffPage === 'reports' && (
              <>
            <section id="owner-reports" className="auth-card owner-reports-section">
              <span className="gold-text">OWNER REPORTS</span>
              <h2>{tr('เธฃเธฒเธขเธเธฒเธเธขเธญเธ”เธเธฒเธขเนเธฅเธฐเธเธฃเธดเธเธฒเธฃ', 'Sales & Service Reports')}</h2>
<section className="auth-card today-overview">
  <span className="gold-text">TODAY OVERVIEW</span>
  <h2>{tr('เธ เธฒเธเธฃเธงเธกเธงเธฑเธเธเธตเน', 'Today Overview')}</h2>

  <div className="booking-summary">

    <div className="summary-row">
      <span>{tr('เธเธดเธงเธงเธฑเธเธเธตเน', "Today's Bookings")}</span>
     <strong>
        {todayOwnerBookings.length} {tr('เธฃเธฒเธขเธเธฒเธฃ', 'bookings')}
     </strong>
    </div>

    <div className="summary-row">
      <span>{tr('เธเธดเธงเธ—เธตเนเน€เธชเธฃเนเธเธชเธดเนเธเธงเธฑเธเธเธตเน', 'Completed Today')}</span>
      <strong>{todayCompletedBookings.length} {tr('เธฃเธฒเธขเธเธฒเธฃ', 'bookings')}</strong>
    </div>
    <div className="summary-row">
      <span>{tr('เธขเธเน€เธฅเธดเธเธงเธฑเธเธเธตเน', 'Cancelled Today')}</span>
      <strong>{todayCancelledBookings.length} {tr('เธฃเธฒเธขเธเธฒเธฃ', 'bookings')}</strong>
    </div>
    <div className="summary-row">
      <span>{tr('เนเธกเนเธกเธฒเธ•เธฒเธกเธเธฑเธ”เธงเธฑเธเธเธตเน', 'No-show Today')}</span>
      <strong>{todayNoShowBookings.length} {tr('เธฃเธฒเธขเธเธฒเธฃ', 'bookings')}</strong>
    </div>

    <div className="summary-row summary-revenue">
      <span>{tr('เธขเธญเธ”เธเธฃเธดเธเธฒเธฃเธ—เธตเนเน€เธชเธฃเนเธเธชเธดเนเธเธงเธฑเธเธเธตเน', "Today's Revenue")}</span>
      <strong>{money(todayRevenue)}</strong>
    </div>

  </div>

  <button
    type="button"
    className="refresh-button"
    onClick={loadOwnerBookings}
    disabled={loading}
  >
    {tr('เธฃเธตเน€เธเธฃเธเธเนเธญเธกเธนเธฅ', 'Refresh Data')}
  </button>
</section>
              <div className="booking-summary">
                <div className="summary-row">
                  <span>{tr('เธฃเธฒเธขเนเธ”เนเน€เธ”เธทเธญเธเธเธตเน (เน€เธเธเธฒเธฐ Completed)', 'Monthly Revenue (Completed Only)')}</span>
                  <strong>{money(monthRevenue)}</strong>
                </div>
                <div className="summary-row">
                  <span>{tr('เธเธณเธเธงเธเธเธฃเธดเธเธฒเธฃเธ—เธตเนเน€เธชเธฃเนเธเธชเธดเนเธเน€เธ”เธทเธญเธเธเธตเน', 'Completed Services This Month')}</span>
                  <strong>{monthCompletedBookings.length}</strong>
                </div>
              </div>
              <h3>{tr('เธเธฃเธดเธเธฒเธฃเธขเธญเธ”เธเธดเธขเธกเนเธขเธเธ•เธฒเธกเธเนเธฒเธ', 'Popular Services by Barber')}</h3>
              <div className="owner-table-wrap">
                <table className="owner-booking-table">
                  <thead><tr><th>{tr('เธเธฃเธดเธเธฒเธฃ', 'Service')}</th><th>{tr('เธเนเธฒเธ', 'Barber')}</th><th>{tr('เธเธณเธเธงเธเธ—เธตเนเนเธซเนเธเธฃเธดเธเธฒเธฃเธเธฃเธดเธ', 'Completed')}</th><th>{tr('เธฃเธฒเธขเนเธ”เน', 'Revenue')}</th></tr></thead>
                  <tbody>
                    {completedServicePerformance.map((item) => (
                      <tr key={`${item.service}-${item.barber}`}>
                        <td>{item.service}</td><td>{item.barber}</td><td>{item.count}</td><td>{money(item.revenue)}</td>
                      </tr>
                    ))}
                    {!completedServicePerformance.length && <tr><td colSpan={4}>{tr('เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃ Completed เธชเธณเธซเธฃเธฑเธเธฃเธฒเธขเธเธฒเธ', 'No completed bookings available for reports yet.')}</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="booking-note">{tr('เธฃเธฒเธขเธเธฒเธเธเธตเนเธเธฑเธเน€เธเธเธฒเธฐเธเธดเธง Completed เนเธฅเธฐเธญเนเธฒเธเธญเธดเธเธฃเธฒเธขเธเธฒเธฃเธเธญเธเธ—เธตเนเนเธซเธฅเธ”เธเธฒเธเธฃเธฐเธเธ', 'Reports count Completed bookings only and use bookings currently loaded from the system.')}</p>
            </section>

              </>
            )}

            {activeStaffPage === 'schedule' && (
            <section className="auth-card booking-history">
              <span className="gold-text">ALL BOOKINGS</span>
              <h2>{tr('เธฃเธฒเธขเธเธฒเธฃเธเธญเธเธเธญเธเธฃเนเธฒเธ', 'All Shop Bookings')}</h2>
              {ownerBookings.length === 0 && (
               <p className="booking-note">
  {tr(
    'เธขเธฑเธเนเธกเนเธเธเธฃเธฒเธขเธเธฒเธฃเธเธญเธ เธซเธฃเธทเธญเธเธฑเธเธเธตเนเธกเนเธกเธตเธชเธดเธ—เธเธดเนเธญเนเธฒเธเธเนเธญเธกเธนเธฅ',
    'No bookings found, or this account does not have permission to view them.'
  )}
</p>
              )}

<div className="owner-table-wrap">
  <table className="owner-booking-table">



<thead>
  <tr>
    <th>{tr('เธเธทเนเธญเธฅเธนเธเธเนเธฒ', 'Customer')}</th>
    <th>{tr('เธเธฒเธฃเธเธฃเธดเธเธฒเธฃ', 'Service')}</th>
    <th>{tr('เธเธทเนเธญเธเนเธฒเธ', 'Barber')}</th>
    <th>{tr('เธงเธฑเธเน€เธงเธฅเธฒ', 'Date & Time')}</th>
    <th>{tr('เธฃเธซเธฑเธชเธเธญเธ', 'Booking ID')}</th>
    <th>{tr('เธชเธ–เธฒเธเธฐ', 'Status')}</th>
    <th>{tr('เธเธฒเธฃเธเธณเธฃเธฐเน€เธเธดเธ', 'Payment')}</th>
    <th>{tr('เธฃเธฒเธเธฒ', 'Price')}</th>
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

                        )}

            {activeStaffPage === 'customers' && (
              <section className="auth-card customer-management">
              <span id="owner-customers" className="gold-text">CUSTOMER MANAGEMENT</span>
              <h2>{tr('เธเธฑเธ”เธเธฒเธฃเธเนเธญเธกเธนเธฅเธฅเธนเธเธเนเธฒ', 'Customer Management')}</h2>

              <p>
                {tr('เธฅเธนเธเธเนเธฒเธ—เธฑเนเธเธซเธกเธ”', 'Total Customers')} {ownerCustomers.length} {tr('เธเธ', 'customers')}
              </p>

              <input
                type="search"
                placeholder={tr('เธเนเธเธซเธฒเธเธทเนเธญเธซเธฃเธทเธญเน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน...', 'Search name or phone number...')}
                value={customerSearch}
                onChange={(event) =>
                  setCustomerSearch(event.target.value)
                }
              />

              <div className="owner-table-wrap">
                <table className="owner-booking-table">
                  <thead>
                    <tr>
    <th>{tr('เธเธทเนเธญเธฅเธนเธเธเนเธฒ', 'Customer Name')}</th>
    <th>{tr('เน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน', 'Phone Number')}</th>
    <th>{tr('เธญเธตเน€เธกเธฅ', 'Email')}</th>
    <th>{tr('เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”', 'Details')}</th>
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
                              {tr('เธ”เธนเธเนเธญเธกเธนเธฅ', 'View Details')}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {ownerCustomers.length === 0 && (
                <p className="booking-note">
                  {tr('เธขเธฑเธเนเธกเนเธเธเธเนเธญเธกเธนเธฅเธฅเธนเธเธเนเธฒ', 'No customer information found.')}
                </p>
              )}

              {selectedCustomer && (
  <div className="customer-details-panel">
    {selectedCustomer?.id && (
      <div className="customer-edit-entry">
        {String(editingCustomerId) === String(selectedCustomer.id)
          ? renderCustomerEditForm(selectedCustomer.id)
          : (
            <button type="button" onClick={() => startCustomerEdit(selectedCustomer)}>
              {tr('เนเธเนเนเธเธเนเธญเธกเธนเธฅเธฅเธนเธเธเนเธฒ', 'Edit customer details')}
            </button>
          )}
      </div>
    )}

    <div className="customer-details-header">
      <span className="gold-text">CUSTOMER PROFILE</span>
      <h3>{tr('เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเนเธญเธกเธนเธฅเธฅเธนเธเธเนเธฒ', 'Customer Details')}</h3>
    </div>

    <div className="customer-details-list">
      <div className="customer-detail-item">
        <span className="customer-detail-label">   {tr('เธเธทเนเธญเธฅเธนเธเธเนเธฒ', 'Customer Name')} </span>
        <span className="customer-detail-value">
          {selectedCustomer.full_name || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">
          {tr('เน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน', 'Phone Number')} </span>
        <span className="customer-detail-value">
          {selectedCustomer.phone || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">
         {tr('เธญเธตเน€เธกเธฅ', 'Email')}
        </span>
        <span className="customer-detail-value">
          {selectedCustomer.email || '-'}
        </span>
      </div>

      <div className="customer-detail-item">
        <span className="customer-detail-label">
  {tr('เธเธฑเธเธ—เธถเธเน€เธเธดเนเธกเน€เธ•เธดเธก', 'Additional Notes')}
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
        {tr('เธเธดเธ”เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”', 'Close Details')}
      </button>
    </div>
  )}
              </section>
            )}
            {activeStaffPage === 'barbers' && (
              <section className="auth-card">
                <span className="gold-text">BARBER MANAGEMENT</span>
                <h2>{tr('เธเธฑเธ”เธเธฒเธฃเธเนเธฒเธเธ•เธฑเธ”เธเธก', 'Barber Management')}</h2>
                <p>{tr('เธเธฑเธ”เธเธฒเธฃเธงเธฑเธเธซเธขเธธเธ”เธเธฃเธฐเธเธณเธชเธฑเธเธ”เธฒเธซเนเธเธญเธเธเนเธฒเธเนเธ•เนเธฅเธฐเธเธ', 'Manage each barberโ€s recurring weekly days off.')}</p>
    {isOwner && (<section className="staff-dayoff-manager">
                  <div className="staff-dayoff-heading">
                    <div>
                      <h3>{tr('เธเธณเธซเธเธ”เธงเธฑเธเธซเธขเธธเธ”เธเธฃเธฐเธเธณเธชเธฑเธเธ”เธฒเธซเนเธเธญเธเธเนเธฒเธ', 'Set recurring barber days off')}</h3>
                      <p>{tr('เน€เธฅเธทเธญเธเธเนเธฒเธเนเธฅเธฐเธ•เธดเนเธเธงเธฑเธเธ—เธตเนเธซเธขเธธเธ”เธเธฃเธฐเธเธณ เธฃเธฐเธเธเธเธฐเนเธชเธ”เธเธงเธฑเธเธซเธขเธธเธ”เน€เธเนเธเธเนเธญเธเธชเธตเธ”เธณเนเธเธ•เธฒเธฃเธฒเธ', 'Choose a barber and select recurring days off. These appear as black day-off cells.')}</p>
                    </div>
                    <select
                      value={selectedDayOffBarberId || barbers[0]?.id || ''}
                      onChange={(event) => setSelectedDayOffBarberId(event.target.value)}
                      disabled={!barbers.length}
                    >
                      {barbers.map((barber) => (
                        <option key={barber.id} value={barber.id}>{barber.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="staff-dayoff-days">
                    {[
                      tr('เธญเธฒเธ—เธดเธ•เธขเน', 'Sunday'),
                      tr('เธเธฑเธเธ—เธฃเน', 'Monday'),
                      tr('เธญเธฑเธเธเธฒเธฃ', 'Tuesday'),
                      tr('เธเธธเธ', 'Wednesday'),
                      tr('เธเธคเธซเธฑเธชเธเธ”เธต', 'Thursday'),
                      tr('เธจเธธเธเธฃเน', 'Friday'),
                      tr('เน€เธชเธฒเธฃเน', 'Saturday'),
                    ].map((label, weekday) => (
                      <label key={weekday}>
                        <input
                          type="checkbox"
                          checked={weeklyDaysOff.some(
                            (item) =>
                              String(item.barber_id) === String(selectedDayOffBarberId || barbers[0]?.id) &&
                              Number(item.weekday) === weekday
                          )}
                          onChange={(event) =>
                            handleWeeklyDayOffChange(
                              selectedDayOffBarberId || barbers[0]?.id,
                              weekday,
                              event.target.checked
                            )
                          }
                          disabled={loading || !barbers.length}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </section>)}
              </section>
            )}
            {activeStaffPage === 'settings' && (
              <section className="auth-card">
                <span className="gold-text">SHOP SETTINGS</span>
                <h2>{tr('เธ•เธฑเนเธเธเนเธฒเธฃเนเธฒเธ', 'Shop Settings')}</h2>
                <p>{tr('เธซเธเนเธฒเธเธตเนเธขเธฑเธเธญเธขเธนเนเธฃเธฐเธซเธงเนเธฒเธเธเธฑเธ’เธเธฒ', 'This page is not implemented yet.')}</p>
              </section>
            )}
            </>
          )}


        {user && isBarber && route === '/barber' && (
          <>
            {activeStaffPage === 'overview' && (
              <section className="hero">
              <span className="gold-text">MICKEY BARBERSHOP ยท BARBER</span>
              <h2>{tr('เธ•เธฒเธฃเธฒเธเธเธฒเธเธเนเธฒเธ', 'Barber Dashboard')}</h2>
              <p>{staffProfile?.full_name || user.email}</p>

              </section>
            )}

           {(activeStaffPage === 'schedule' || activeStaffPage === 'my-schedule') && (
  <section id="staff-schedule" className="auth-card staff-schedule-section">
    <span className="gold-text">
      {activeStaffPage === 'my-schedule' ? 'MY DAILY SCHEDULE' : 'SHOP DAILY SCHEDULE'}
    </span>

    <div className="staff-schedule-heading">
      <div>
        <h2>
          {activeStaffPage === 'my-schedule'
            ? tr('เธ•เธฒเธฃเธฒเธเธเธฒเธเธเธญเธเธเธฑเธ', 'My Schedule')
            : tr('เธ•เธฒเธฃเธฒเธเธเธฒเธเธเนเธฒเธเธ—เธธเธเธเธ', 'All Barbers Schedule')}
        </h2>
        <p>
          {activeStaffPage === 'my-schedule'
            ? tr('เนเธชเธ”เธเน€เธเธเธฒเธฐเธเธดเธงเธเธญเธเธเธธเธ“', 'Showing only your bookings.')
            : tr('เธ เธฒเธเธฃเธงเธกเธเธดเธงเธเธญเธเธฃเนเธฒเธ เนเธขเธเธ•เธฒเธกเธเนเธฒเธเนเธฅเธฐเธเนเธงเธเน€เธงเธฅเธฒ ยท เธเนเธญเธ โ€” เธเธทเธญเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเธเธญเธ', 'Shop-wide bookings by barber and time. โ€” means no booking is listed.')}
        </p>
      </div>

      <label>
        {tr('เธงเธฑเธเธ—เธตเน', 'Date')}
        <input
          type="date"
          value={scheduleDate}
          onChange={(event) => setScheduleDate(event.target.value)}
        />
      </label>
    </div>

    <div className="customer-schedule-scroll">
      <table className="staff-schedule-table">
        <thead>
          <tr>
            <th>{tr('เธเนเธฒเธ', 'Barber')}</th>
            {scheduleHours.map((hour) => (
              <th key={hour}>{String(hour).padStart(2, '0')}:00</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {(activeStaffPage === 'my-schedule'
            ? barbers.filter(
                (barber) => String(barber.id) === String(staffProfile?.id)
              )
            : barbers
          ).map((barber) => (
            <tr key={barber.id}>
              <th>{barber.full_name}</th>

              {scheduleHours.map((hour) => (
                <td key={hour}>{renderStaffScheduleCell(barber, hour)}</td>
              ))}
            </tr>
          ))}

          {(activeStaffPage === 'my-schedule'
            ? barbers.filter(
                (barber) => String(barber.id) === String(staffProfile?.id)
              ).length === 0
            : barbers.length === 0
          ) && (
            <tr>
              <td colSpan={scheduleHours.length + 1}>
                {activeStaffPage === 'my-schedule'
                  ? tr('เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธเนเธฒเธเธเธญเธเธเธฑเธเธเธตเธเธตเน', 'Your barber profile was not found.')
                  : tr('เนเธกเนเธเธเธฃเธฒเธขเธเธทเนเธญเธเนเธฒเธ', 'No barbers found.')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
)}
          </>
        )}

        {user && !isOwner && route === '/booking' && !customer && (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>
            <h2>เธเธฃเธญเธเธเนเธญเธกเธนเธฅเธชเธกเธฒเธเธดเธ</h2>
            <p className="auth-description">
              เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเธทเนเธญเนเธฅเธฐเน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เนเธเนเธญเธเน€เธฃเธดเนเธกเนเธเนเธเธฒเธ
            </p>

            <form onSubmit={handleCompleteProfile}>
              <label>{tr('เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ', 'Full Name')}</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
              <label>เน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
              <label>เธญเธตเน€เธกเธฅ</label>
              <input value={user.email || ''} disabled />
              <button type="submit" disabled={loading}>
                {loading ? 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : 'เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธชเธกเธฒเธเธดเธ'}
              </button>
            </form>

            <button className="text-button" onClick={handleLogout}>
              เธญเธญเธเธเธฒเธเธฃเธฐเธเธ
            </button>
          </section>
        )}

        {user && !isOwner && route === '/booking' && customer && (
          <>
            <div className="customer-main-nav" aria-label={tr('\u0e40\u0e21\u0e19\u0e39\u0e2b\u0e25\u0e31\u0e01', 'Main navigation')}>
              <button className={route === '/booking' ? 'active' : ''} onClick={() => navigate('/booking')}>{tr('\u0e08\u0e2d\u0e07\u0e04\u0e34\u0e27', 'Book Appointment')}</button>
              <button className={route === '/products' ? 'active' : ''} onClick={() => navigate('/products')}>{tr('\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32', 'Products')}</button>
              <button className={route === '/cart' ? 'active' : ''} onClick={() => navigate('/cart')}>{tr('\u0e15\u0e30\u0e01\u0e23\u0e49\u0e32\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32', 'Shopping Cart')}</button>
              <button className={route === '/account' ? 'active' : ''} onClick={() => navigate('/account')}>{tr('เธเธฑเธ”เธเธฒเธฃเธเธฑเธเธเธต', 'Account Management')}</button>
              <button className="customer-sidebar-logout" onClick={handleLogout}>{tr('\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a', 'Sign Out')}</button>
            </div><section className="auth-card customer-schedule-card unified-booking-card">
              <span className="gold-text">MICKEY BARBERSHOP ยท LIVE BOOKING</span>
              <h2>{tr('เน€เธฅเธทเธญเธเธเธฃเธดเธเธฒเธฃเนเธฅเธฐเธเธญเธเธเธดเธง', 'Choose Service & Book')}</h2>
              <p className="auth-description">
                {tr(
                  'เน€เธฅเธทเธญเธเธงเธฑเธเธ—เธตเนเธเนเธญเธ เนเธฅเนเธงเธ”เธนเธ•เธฒเธฃเธฒเธเน€เธงเธฅเธฒเธเธญเธเธเนเธฒเธเธ—เธธเธเธเธเนเธฅเธฐเธเธ” OPEN เน€เธเธทเนเธญเน€เธฃเธดเนเธกเธเธญเธ',
                  'Choose a date, view every barberโ€s schedule, and tap OPEN to start booking.'
                )}
              </p>

              <div className="customer-date-first">
                <label>
                  {tr('เน€เธฅเธทเธญเธเธงเธฑเธเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเธเธญเธ', 'Choose Booking Date')}
                  <input
                    type="date"
                    value={selectedDate}
                    min={today}
                    max={maxBookingDate}
                    onChange={(event) => {
                      setAvailabilityLoading(true)
                      setPublicAvailability([])
                      setSelectedDate(event.target.value)
                      setSelectedTime('')
                      setShowBookingModal(false)
                    }}
                    required
                  />
                </label>
                <div className="unified-schedule-heading">
                  <div>
                    <h3>{tr('เธ•เธฒเธฃเธฒเธเน€เธงเธฅเธฒเธเธญเธเธเนเธฒเธเธ—เธธเธเธเธ', 'All Barbers Schedule')}</h3>
                    <p>{tr('เน€เธฅเธทเธญเธเธงเธฑเธเธ—เธตเน เนเธฅเนเธงเธเธ” OPEN เนเธเธเนเธงเธเน€เธงเธฅเธฒเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃ เธเธฒเธเธเธฑเนเธเน€เธฅเธทเธญเธเธเธฃเธดเธเธฒเธฃเนเธฅเธฐเธเนเธฒเธ', 'Choose a date, tap OPEN, then select your service and preferred barber.')}</p>
                  </div>
                  <button type="button" className="schedule-refresh-button" onClick={loadPublicAvailability} disabled={availabilityLoading}>
                    {availabilityLoading ? tr('เธเธณเธฅเธฑเธเนเธซเธฅเธ”...', 'Loading...') : tr('เธฃเธตเน€เธเธฃเธ', 'Refresh')}
                  </button>
                </div>
                <div className="schedule-legend">
                  <span><i className="legend-open" />OPEN</span>
                  <span><i className="legend-busy" />{tr('เนเธกเนเธงเนเธฒเธ', 'Unavailable')}</span>
                  <span><i className="legend-closed" />{tr('เธเธดเธ”', 'Closed')}</span>
                </div>
                {availabilityError && <p className="schedule-error">{availabilityError}</p>}
                <div className="customer-schedule-scroll">
                  <table className="customer-schedule-table">
                    <thead>
                      <tr>
                        <th>{tr('เธเนเธฒเธ', 'Barber')}</th>
                        {scheduleHours.map((hour) => <th key={hour}>{String(hour).padStart(2, '0')}:00</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {barbers.map((barber) => (
                        <tr key={barber.id}>
                          <th>{barber.full_name}</th>
                          {scheduleHours.map((hour) => {
                            const time = `${String(hour).padStart(2, '0')}:00`
                            const open = isCustomerSlotAvailable(barber.id, hour)
                            const isPast = new Date(`${selectedDate}T${time}:00+07:00`) <= new Date()
                            return (
                              <td key={hour}>
                                <button
                                  type="button"
                                  className={`schedule-slot ${open ? 'is-open' : 'is-busy'}`}
                                  disabled={!open || availabilityLoading || isPast}
                                  onClick={() => {
                                    setSelectedTime(time)
                                    setSelectedService('')
                                    setSelectedBarber('')
                                    setMessage('')
                                    setShowBookingModal(true)
                                  }}
                                  aria-label={`${barber.full_name} ${time} ${open ? 'OPEN' : 'Unavailable'}`}
                                >
                                  {open && !isPast ? 'OPEN' : 'โ€”'}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {!barbers.length && <tr><td colSpan={11}>{tr('เนเธกเนเธเธเธฃเธฒเธขเธเธทเนเธญเธเนเธฒเธเธ—เธตเนเน€เธเธดเธ”เนเธเนเธเธฒเธ', 'No active barbers found.')}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {showBookingModal && (
                <div className="booking-modal-backdrop" role="presentation" onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setShowBookingModal(false)
                }}>
                  <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
                    <button type="button" className="booking-modal-close" onClick={() => setShowBookingModal(false)} aria-label={tr('เธเธดเธ”', 'Close')}>ร—</button>
                    <span className="gold-text">BOOK YOUR APPOINTMENT</span>
                    <h3 id="booking-modal-title">{tr('เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธฒเธฃเธเธญเธ', 'Booking Details')}</h3>
                    <p className="booking-modal-time">{selectedDate} ยท {selectedTime}</p>
                    <form onSubmit={handleBooking}>
                      <label>
                        {tr('เน€เธฅเธทเธญเธเธเธฃเธดเธเธฒเธฃ', 'Choose Service')}
                        <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)} required>
                          <option value="">{tr('-- เน€เธฅเธทเธญเธเธเธฃเธดเธเธฒเธฃ --', '-- Select Service --')}</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} โ€” {money(service.price_thb)} ({service.duration_minutes} {tr('เธเธฒเธ—เธต', 'min')})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr('เน€เธฅเธทเธญเธเธเนเธฒเธ', 'Choose Barber')}
                        <select value={selectedBarber} onChange={(event) => setSelectedBarber(event.target.value)}>
                          <option value="">{tr('เธเนเธฒเธเธเธเนเธซเธเธเนเนเธ”เน ยท เนเธซเนเธฃเธฐเธเธเธเธฑเธ”เธชเธฃเธฃ', 'Any Barber ยท Auto-assign')}</option>
                          {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.full_name}</option>)}
                        </select>
                      </label>
                      {chosenService && (
                        <div className="unified-service-summary">
                          <span>{chosenService.name}</span>
                          <span>{money(chosenService.price_thb)}</span>
                          <span>{chosenService.duration_minutes} {tr('เธเธฒเธ—เธต', 'min')}</span>
                        </div>
                      )}
                      {selectedService && selectedBarber && !isCustomerSlotAvailable(selectedBarber, Number(selectedTime.slice(0, 2))) && (
                        <p className="schedule-error">{tr('เธเนเธฒเธเธเธเธเธตเนเนเธกเนเธงเนเธฒเธเนเธเธเนเธงเธเน€เธงเธฅเธฒเธเธตเน เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธเนเธฒเธเธเธเธญเธทเนเธเธซเธฃเธทเธญ Any Barber', 'This barber is unavailable for this time. Choose another barber or Any Barber.')}</p>
                      )}
                      <div className="booking-modal-actions">
                        <button type="button" className="text-button" onClick={() => setShowBookingModal(false)}>{tr('เธเธฅเธฑเธเนเธเธ”เธนเธ•เธฒเธฃเธฒเธ', 'Back to Schedule')}</button>
                        <button type="submit" disabled={loading || !selectedService || !selectedTime || !availableTimes.includes(selectedTime) || (selectedBarber && !isCustomerSlotAvailable(selectedBarber, Number(selectedTime.slice(0, 2))))}>
                          {loading ? tr('เธเธณเธฅเธฑเธเธเธญเธ...', 'Booking...') : tr('เธขเธทเธเธขเธฑเธเธเธฒเธฃเธเธญเธ', 'Confirm Booking')}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              )}

              {bookingResult && (
                <div className="booking-success">
                  <h3>{tr('เธเธญเธเธเธดเธงเธชเธณเน€เธฃเนเธ!', 'Booking Successful!')}</h3>
                  <p>{tr('เธฃเธซเธฑเธชเธเธญเธ:', 'Booking ID:')} {bookingResult.booking_code || '-'}</p>
                  <p>{tr('เน€เธงเธฅเธฒ:', 'Time:')} {formatDateTime(bookingResult.starts_at, language)}</p>
                  <p>{tr('เธฃเธฐเธเธเธเธฑเธ”เธเธฒเธฃเธเธณเธเธญเธเธญเธเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง', 'Your booking has been processed successfully.')}</p>
                </div>
              )}
            </section>


            <section className="auth-card booking-history customer-booking-history">
              <span className="gold-text">MY BOOKINGS</span>
              <h2>{tr('เธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธเธญเธ', 'Booking History')}</h2>
              <button
                type="button"
                className="refresh-button"
                onClick={loadBookings}
                disabled={loading}
              >
                {tr('เธฃเธตเน€เธเธฃเธเธฃเธฒเธขเธเธฒเธฃ', 'Refresh Bookings')}
              </button>

              {bookings.length === 0 && (
               <p className="booking-note">
  {tr('เธขเธฑเธเนเธกเนเธกเธตเธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธเธญเธ', 'No booking history yet.')}
</p>
              )}

             {bookings.length > 0 && (
  <div className="customer-history-wrap">
    <table className="customer-history-table">
    <thead>
      <tr>
       <th>{tr('เธงเธฑเธเธ—เธตเน', 'Date')}</th>
<th>{tr('เน€เธงเธฅเธฒ', 'Time')}</th>
<th>{tr('เธเธฃเธดเธเธฒเธฃ', 'Service')}</th>
<th>{tr('เธเนเธฒเธ', 'Barber')}</th>
<th>{tr('เธฃเธฒเธเธฒ', 'Price')}</th>
<th>{tr('เธชเธ–เธฒเธเธฐ', 'Status')}</th>
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

          <td>{booking.service_name_snapshot || tr('เธเธฃเธดเธเธฒเธฃ', 'Service')}</td>
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
                  {tr('เธขเธเน€เธฅเธดเธเธเธฒเธฃเธเธญเธ', 'Cancel Booking')}
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

        {user && !isOwner && route === '/account' && customer && (
          <>
            <div className="customer-main-nav" aria-label={tr('เน€เธกเธเธนเธซเธฅเธฑเธ', 'Main navigation')}>
              <button onClick={() => navigate('/booking')}>{tr('เธเธญเธเธเธดเธง', 'Book Appointment')}</button>
              <button onClick={() => navigate('/products')}>{tr('เธชเธดเธเธเนเธฒ', 'Products')}</button>
              <button onClick={() => navigate('/cart')}>{tr('เธ•เธฐเธเธฃเนเธฒเธชเธดเธเธเนเธฒ', 'Shopping Cart')}</button>
              <button className="active" onClick={() => navigate('/account')}>{tr('เธเธฑเธ”เธเธฒเธฃเธเธฑเธเธเธต', 'Account Management')}</button>
              <button className="customer-sidebar-logout" onClick={handleLogout}>{tr('เธญเธญเธเธเธฒเธเธฃเธฐเธเธ', 'Sign Out')}</button>
            </div>
            <section className="hero customer-account-dashboard">
              <span className="gold-text">MICKEY MEMBERSHIP · ACCOUNT</span>
              <h2>{tr("จัดการบัญชี", 'Account Management')}</h2>
              <p>{tr("ยินดีต้อนรับ", 'Welcome')}, {customer.full_name}</p>
              {!accountEditing ? (
                <>
                  <div className="customer-account-details">
                    <p><b>{tr("ชื่อ-นามสกุล", 'Full Name')}:</b> {customer.full_name || '-'}</p>
                    <p><b>{tr("เบอร์โทรศัพท์", 'Phone')}:</b> {customer.phone || '-'}</p>
                    <p><b>{tr("อีเมล", 'Email')}:</b> {customer.email || user.email}</p>
                  </div>
                  <button type="button" onClick={startAccountEdit}>{tr("แก้ไขข้อมูลส่วนตัว", 'Edit Personal Information')}</button>
                </>
              ) : (
                <form className="customer-account-details" onSubmit={saveAccountDetails}>
                  <label>{tr("ชื่อ-นามสกุล", 'Full Name')}
                    <input value={accountEditName} onChange={(event) => setAccountEditName(event.target.value)} disabled={accountSaving} required />
                  </label>
                  <label>{tr("เบอร์โทรศัพท์", 'Phone Number')}
                    <input type="tel" value={accountEditPhone} onChange={(event) => setAccountEditPhone(event.target.value)} disabled={accountSaving} required />
                  </label>
                  <p><b>{tr("อีเมล", 'Email')}:</b> {customer.email || user.email}</p>
                  <div className="staff-modal-actions">
                    <button type="submit" disabled={accountSaving}>{accountSaving ? tr("กำลังบันทึก...", 'Saving...') : tr("บันทึกการเปลี่ยนแปลง", 'Save Changes')}</button>
                    <button type="button" className="secondary" onClick={() => setAccountEditing(false)} disabled={accountSaving}>{tr("ยกเลิก", 'Cancel')}</button>
                  </div>
                </form>
              )}
              <p>{tr("คุณเข้าสู่ระบบเรียบร้อยแล้ว", 'You are signed in.')}</p>
            </section>
          </>
        )}
        {user && !isOwner && customer && ['/products', '/cart'].includes(route) && <CustomerShopPage tr={tr} navigate={navigate} route={route} onLogout={handleLogout} />}

        {selectedStaffBooking && (
          <div className="staff-booking-overlay" onClick={(event) => { if (event.target === event.currentTarget) setSelectedStaffBooking(null) }}>
            <section className="staff-booking-modal" role="dialog" aria-modal="true" aria-label={tr('เธเธฑเธ”เธเธฒเธฃเธเธดเธง', 'Manage booking')}>
              {selectedStaffBooking?.customer?.id && (
                <div className="customer-edit-entry">
                  {String(editingCustomerId) === String(selectedStaffBooking.customer.id)
                    ? renderCustomerEditForm(selectedStaffBooking.customer.id)
                    : (
                      <button
                        type="button"
                        onClick={() => startCustomerEdit(selectedStaffBooking.customer)}
                      >
                        {tr('เนเธเนเนเธเธเนเธญเธกเธนเธฅเธฅเธนเธเธเนเธฒ', 'Edit customer details')}
                      </button>
                    )}
                </div>
              )}

              <button className="staff-modal-close" type="button" onClick={() => setSelectedStaffBooking(null)}>ร—</button>
              <span className="gold-text">BOOKING DETAILS</span>
              <h2>{selectedStaffBooking.customer?.full_name || tr('เธฅเธนเธเธเนเธฒ', 'Customer')}</h2>
              <div className="staff-booking-details">
                <p><b>{tr('เธเธฃเธดเธเธฒเธฃ', 'Service')}:</b> {selectedStaffBooking.service_name_snapshot || '-'}</p>
                <p><b>{tr('เธเนเธฒเธ', 'Barber')}:</b> {selectedStaffBooking.barber?.full_name || '-'}</p>
                <p><b>{tr('เน€เธงเธฅเธฒ', 'Time')}:</b> {formatDateTime(selectedStaffBooking.starts_at, language)}</p>
                <p><b>{tr('เธชเธ–เธฒเธเธฐ', 'Status')}:</b> {statusLabel(selectedStaffBooking.status, language)}</p>
                {selectedStaffBooking.customer?.phone && <p><b>{tr('เนเธ—เธฃเธจเธฑเธเธ—เน', 'Phone')}:</b> {selectedStaffBooking.customer.phone}</p>}
              </div>
              <label>{tr('เน€เธเธฅเธตเนเธขเธเธชเธ–เธฒเธเธฐ', 'Change status')}
                <select value={selectedStaffBooking.status || 'Confirmed'} disabled={loading} onChange={async (event) => {
                  const nextStatus = event.target.value
                  await handleStaffBookingUpdate(selectedStaffBooking.id, { status: nextStatus })
                  setSelectedStaffBooking({ ...selectedStaffBooking, status: nextStatus })
                }}>
                  {['Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'].map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}
                </select>
              </label>
              <div className="staff-modal-actions">
                <button type="button" disabled={loading} onClick={() => handleMoveStaffBooking(selectedStaffBooking)}>{tr('เธขเนเธฒเธขเธเธดเธง', 'Move booking')}</button>
                <button type="button" className="secondary" onClick={() => setSelectedStaffBooking(null)}>{tr('เธเธดเธ”', 'Close')}</button>
              </div>
            </section>
          </div>
        )}
        {showLogoutConfirm && isStaffDashboard && (
          <div className="staff-logout-overlay" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogoutConfirm(false)
          }}>
            <section className="staff-logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="staff-logout-title">
              <h2 id="staff-logout-title">{tr('เธขเธทเธเธขเธฑเธเธญเธญเธเธเธฒเธเธฃเธฐเธเธ', 'Confirm Sign Out')}</h2>
              <p>{tr('เธเธธเธ“เธ•เนเธญเธเธเธฒเธฃเธญเธญเธเธเธฒเธเธฃเธฐเธเธเนเธเนเธซเธฃเธทเธญเนเธกเน?', 'Are you sure you want to sign out?')}</p>
              <div className="staff-logout-actions">
                <button type="button" className="secondary" onClick={() => setShowLogoutConfirm(false)} disabled={loading}>{tr('เธขเธเน€เธฅเธดเธ', 'Cancel')}</button>
                <button type="button" onClick={handleLogout} disabled={loading}>{loading ? tr('เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ...', 'Please wait...') : tr('เธขเธทเธเธขเธฑเธเธญเธญเธเธเธฒเธเธฃเธฐเธเธ', 'Sign Out')}</button>
              </div>
            </section>
          </div>
        )}
        {message && <div className="auth-message" role="status">{message}</div>}
      </main>

      <footer>MICKEY BARBERSHOP ยฉ 2026</footer>
    </div>
  )
}

export default App
