import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './styles.css'
import './staff-redesign.css'
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

const [activeStaffPage, setActiveStaffPage] = useState('overview')

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
        setMessage('ตรวจสอบตำแหน่งบัญชีไม่สำเร็จ: ' + profileError.message)
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
        source,
        barber_id,
        customer:customers!bookings_customer_id_fkey(id, full_name, phone, notes),
        barber:profiles!bookings_barber_id_fkey(full_name)
      `)
      .order('starts_at', { ascending: false })
      .limit(1000)

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
    setMessage(tr('โหลดช่วงเวลาที่ Block ไม่สำเร็จ: ', 'Could not load blocked times: ') + blocksResult.error.message)
  } else {
    setStaffTimeBlocks(blocksResult.data || [])
  }

  if (daysOffResult.error) {
    setMessage(tr('โหลดวันหยุดช่างไม่สำเร็จ: ', 'Could not load barber days off: ') + daysOffResult.error.message)
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
    setShowBookingModal(false)
    await loadPublicAvailability()
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


  function startCustomerEdit(customer) {
    if (!customer?.id) return
    setEditingCustomerId(String(customer.id))
    setCustomerEditName(customer.full_name || '')
    setCustomerEditPhone(customer.phone || '')
    setCustomerEditNotes(customer.notes || '')
  }

  async function saveCustomerDetails(customerId) {
    if (!customerId || !customerEditName.trim() || !customerEditPhone.trim()) {
      alert(tr('กรุณากรอกชื่อลูกค้าและเบอร์โทรศัพท์', 'Please enter the customer name and phone number.'))
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
      alert(tr('บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว', 'Customer details saved successfully.'))
    } catch (error) {
      console.error('saveCustomerDetails:', error)
      alert(error.message || tr('ไม่สามารถบันทึกข้อมูลลูกค้าได้', 'Could not save customer details.'))
    } finally {
      setCustomerEditSaving(false)
    }
  }

  function renderCustomerEditForm(customerId) {
    return (
      <div className="customer-edit-form">
        <label>
          {tr('ชื่อลูกค้า', 'Customer name')}
          <input
            value={customerEditName}
            onChange={event => setCustomerEditName(event.target.value)}
            disabled={customerEditSaving}
          />
        </label>
        <label>
          {tr('เบอร์โทรศัพท์', 'Phone number')}
          <input
            value={customerEditPhone}
            onChange={event => setCustomerEditPhone(event.target.value)}
            disabled={customerEditSaving}
          />
        </label>
        <label>
          {customerEditNotes.trim()
            ? tr('✏️ แก้ไขบันทึก', '✏️ Edit notes')
            : tr('+ เพิ่มบันทึกเพิ่มเติม', '+ Add notes')}
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
            {customerEditSaving ? tr('กำลังบันทึก...', 'Saving...') : tr('บันทึก', 'Save')}
          </button>
          <button
            type="button"
            onClick={() => setEditingCustomerId('')}
            disabled={customerEditSaving}
          >
            {tr('ยกเลิก', 'Cancel')}
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
      setMessage(tr('อัปเดตคิวเรียบร้อยแล้ว', 'Booking updated.'))
      await loadOwnerBookings()
    } catch (error) {
      setMessage(error.message || tr('ไม่สามารถอัปเดตคิวได้', 'Could not update booking.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleScheduleBlock(barberId, hour) {
    const existingBlock = getScheduleBlock(barberId, hour)

    if (existingBlock) {
      if (!window.confirm(tr('ต้องการปลด Block ช่วงเวลานี้ใช่หรือไม่?', 'Unblock this time slot?'))) return
      setLoading(true)
      const { error } = await supabase
        .from('barber_time_blocks')
        .delete()
        .eq('id', existingBlock.id)
      if (error) {
        setMessage(error.message)
      } else {
        setMessage(tr('เปิดช่วงเวลากลับมาแล้ว', 'Time slot is open again.'))
      }
      await loadStaffAvailability()
      setLoading(false)
      return
    }

    if (getScheduleBooking(barberId, hour) || isScheduleDayOff(barberId)) {
      setMessage(tr('ช่วงเวลานี้มีคิวหรือเป็นวันหยุดอยู่แล้ว', 'This slot is already booked or is a day off.'))
      return
    }

    const startsAt = new Date(
      `${scheduleDate}T${String(hour).padStart(2, '0')}:00:00+07:00`
    )
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
    if (startsAt <= new Date()) {
      setMessage(tr('ไม่สามารถ Block เวลาในอดีตได้', 'Past time slots cannot be blocked.'))
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
      setMessage(tr('Block ช่วงเวลาเรียบร้อยแล้ว', 'Time slot blocked.'))
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
      setMessage(tr('บันทึกวันหยุดประจำสัปดาห์แล้ว', 'Weekly day off saved.'))
    }
    await loadStaffAvailability()
    setLoading(false)
  }

  async function handleMoveStaffBooking(booking) {
    const current = new Date(booking.starts_at)
    const currentLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(current)
    const currentTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(current)
    const nextDate = window.prompt(tr('วันที่ใหม่ (YYYY-MM-DD)', 'New date (YYYY-MM-DD)'), currentLocal)
    if (!nextDate) return
    const nextTime = window.prompt(tr('เวลาใหม่ (HH:MM)', 'New time (HH:MM)'), currentTime)
    if (!nextTime) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || !/^([01]\d|2[0-3]):00$/.test(nextTime)) {
      setMessage(tr('รูปแบบวันที่หรือเวลาไม่ถูกต้อง', 'Invalid date or time format.'))
      return
    }
    const starts = new Date(`${nextDate}T${nextTime}:00+07:00`)
    const duration = Number(booking.duration_minutes_snapshot || 60)
    const ends = new Date(starts.getTime() + duration * 60000)
    const closing = new Date(`${nextDate}T20:00:00+07:00`)
    const opening = new Date(`${nextDate}T10:00:00+07:00`)
    if (starts < opening || starts <= new Date() || ends > closing) {
      setMessage(tr('เวลาใหม่ต้องอยู่ในเวลาทำการ 10:00–20:00 และเป็นเวลาในอนาคต', 'New time must be in the future and within business hours (10:00–20:00).'))
      return
    }
    const conflict = ownerBookings.some((other) => {
      if (other.id === booking.id || other.barber_id !== booking.barber_id || ['Cancelled', 'No Show'].includes(other.status)) return false
      return starts < new Date(other.ends_at) && ends > new Date(other.starts_at)
    })
    if (conflict) {
      setMessage(tr('ช่างมีคิวอื่นในช่วงเวลานี้แล้ว กรุณาเลือกเวลาใหม่', 'This barber already has another booking during that time. Choose another time.'))
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
        <strong>{booking.customer?.full_name || tr('ลูกค้า', 'Customer')}</strong>
        <small>{booking.service_name_snapshot || '-'}</small>
        {booking.source === 'Walk-in' && <small>{tr('Walk-in', 'Walk-in')}</small>}
      </button>
    )
  }

  if (isScheduleDayOff(barber.id)) {
    return <span className="staff-day-off-slot">{tr('วันหยุด', 'DAY OFF')}</span>
  }

  const block = getScheduleBlock(barber.id, hour)
  if (block) {
    return (
      <button
        type="button"
        className="staff-blocked-slot"
        onClick={() => handleToggleScheduleBlock(barber.id, hour)}
        disabled={loading}
        title={tr('กดเพื่อปลด Block', 'Click to unblock this time')}
      >
        {tr('BLOCKED · ปลด', 'BLOCKED · OPEN')}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="staff-open-slot"
      onClick={() => handleToggleScheduleBlock(barber.id, hour)}
      disabled={loading}
      title={tr('กดเพื่อ Block เวลานี้', 'Click to block this time')}
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

        {user && (isOwner || isBarber) && (route === '/owner' || route === '/barber') && (
          <aside className="staff-sidebar">
  <div className="sidebar-brand">
    MICKEY<span>BARBERSHOP</span>
  </div>

  <a
    href="#overview"
    className={activeStaffPage === 'overview' ? 'active' : ''}
    onClick={(e) => {
      e.preventDefault()
      setActiveStaffPage('overview')
    }}
  >
    {tr('ภาพรวม', 'Overview')}
  </a>

  <a
    href="#schedule"
    className={activeStaffPage === 'schedule' ? 'active' : ''}
    onClick={(e) => {
      e.preventDefault()
      setActiveStaffPage('schedule')
    }}
  >
    {tr('ตารางคิวร้าน', 'Shop Schedule')}
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
      {tr('ตารางงานของฉัน', 'My Schedule')}
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
        {tr('รายงานร้าน', 'Reports')}
      </a>

      <a
        href="#customers"
        className={activeStaffPage === 'customers' ? 'active' : ''}
        onClick={(e) => {
          e.preventDefault()
          setActiveStaffPage('customers')
        }}
      >
        {tr('จัดการลูกค้า', 'Customers')}
      </a>

      <a
        href="#barbers"
        className={activeStaffPage === 'barbers' ? 'active' : ''}
        onClick={(e) => {
          e.preventDefault()
          setActiveStaffPage('barbers')
        }}
      >
        {tr('จัดการช่างตัดผม', 'Barbers')}
      </a>

      <a
        href="#settings"
        className={activeStaffPage === 'settings' ? 'active' : ''}
        onClick={(e) => {
          e.preventDefault()
          setActiveStaffPage('settings')
        }}
      >
        {tr('ตั้งค่าร้าน', 'Settings')}
      </a>
    </>
  )}

  <button
    type="button"
    onClick={handleLogout}
    disabled={loading}
  >
    {tr('ออกจากระบบ', 'Sign Out')}
  </button>
</aside>
        )}

        {user && isOwner && route === '/owner' && (
          <>
            {activeStaffPage === 'overview' && (
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
      <span>{tr('คิวที่เสร็จสิ้นวันนี้', 'Completed Today')}</span>
      <strong>{todayCompletedBookings.length} {tr('รายการ', 'bookings')}</strong>
    </div>
    <div className="summary-row">
      <span>{tr('ยกเลิกวันนี้', 'Cancelled Today')}</span>
      <strong>{todayCancelledBookings.length} {tr('รายการ', 'bookings')}</strong>
    </div>
    <div className="summary-row">
      <span>{tr('ไม่มาตามนัดวันนี้', 'No-show Today')}</span>
      <strong>{todayNoShowBookings.length} {tr('รายการ', 'bookings')}</strong>
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

              </>
            )}

            {activeStaffPage === 'schedule' && (
              <>
            <section id="staff-schedule" className="auth-card staff-schedule-section">
              <span className="gold-text">SHOP DAILY SCHEDULE</span>
              <div className="staff-schedule-heading">
                <div>
                  <h2>{tr('ตารางงานช่างทุกคน', 'All Barbers Schedule')}</h2>
                  <p>{tr('ภาพรวมคิวของร้าน แยกตามช่างและช่วงเวลา · ช่อง — คือไม่มีรายการจอง', 'Shop-wide bookings by barber and time. — means no booking is listed.')}</p>
                </div>
                <label>{tr('วันที่', 'Date')}
                  <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
                </label>
              </div>
              <div className="customer-schedule-scroll">
                <table className="staff-schedule-table">
                  <thead><tr><th>{tr('ช่าง', 'Barber')}</th>{scheduleHours.map((hour) => <th key={hour}>{String(hour).padStart(2, '0')}:00</th>)}</tr></thead>
                  <tbody>
                    {barbers.map((barber) => (
                      <tr key={barber.id}>
                        <th>{barber.full_name}</th>
                        {scheduleHours.map((hour) => (
                          <td key={hour}>{renderStaffScheduleCell(barber, hour)}</td>
                        ))}
                      </tr>
                    ))}
                    {!barbers.length && <tr><td colSpan={11}>{tr('ไม่พบรายชื่อช่าง', 'No barbers found.')}</td></tr>}
                  </tbody>
                </table>
              </div>


            </section>
              </>
            )}

            {activeStaffPage === 'reports' && (
              <>
            <section id="owner-reports" className="auth-card owner-reports-section">
              <span className="gold-text">OWNER REPORTS</span>
              <h2>{tr('รายงานยอดขายและบริการ', 'Sales & Service Reports')}</h2>
              <div className="booking-summary">
                <div className="summary-row">
                  <span>{tr('รายได้เดือนนี้ (เฉพาะ Completed)', 'Monthly Revenue (Completed Only)')}</span>
                  <strong>{money(monthRevenue)}</strong>
                </div>
                <div className="summary-row">
                  <span>{tr('จำนวนบริการที่เสร็จสิ้นเดือนนี้', 'Completed Services This Month')}</span>
                  <strong>{monthCompletedBookings.length}</strong>
                </div>
              </div>
              <h3>{tr('บริการยอดนิยมแยกตามช่าง', 'Popular Services by Barber')}</h3>
              <div className="owner-table-wrap">
                <table className="owner-booking-table">
                  <thead><tr><th>{tr('บริการ', 'Service')}</th><th>{tr('ช่าง', 'Barber')}</th><th>{tr('จำนวนที่ให้บริการจริง', 'Completed')}</th><th>{tr('รายได้', 'Revenue')}</th></tr></thead>
                  <tbody>
                    {completedServicePerformance.map((item) => (
                      <tr key={`${item.service}-${item.barber}`}>
                        <td>{item.service}</td><td>{item.barber}</td><td>{item.count}</td><td>{money(item.revenue)}</td>
                      </tr>
                    ))}
                    {!completedServicePerformance.length && <tr><td colSpan={4}>{tr('ยังไม่มีรายการ Completed สำหรับรายงาน', 'No completed bookings available for reports yet.')}</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="booking-note">{tr('รายงานนี้นับเฉพาะคิว Completed และอ้างอิงรายการจองที่โหลดจากระบบ', 'Reports count Completed bookings only and use bookings currently loaded from the system.')}</p>
            </section>

              </>
            )}

            {activeStaffPage === 'schedule' && (
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

                        )}

            {activeStaffPage === 'customers' && (
              <section className="auth-card customer-management">
              <span id="owner-customers" className="gold-text">CUSTOMER MANAGEMENT</span>
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
    {selectedCustomer?.id && (
      <div className="customer-edit-entry">
        {String(editingCustomerId) === String(selectedCustomer.id)
          ? renderCustomerEditForm(selectedCustomer.id)
          : (
            <button type="button" onClick={() => startCustomerEdit(selectedCustomer)}>
              {tr('แก้ไขข้อมูลลูกค้า', 'Edit customer details')}
            </button>
          )}
      </div>
    )}

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
            )}
            {activeStaffPage === 'barbers' && (
              <section className="auth-card">
                <span className="gold-text">BARBER MANAGEMENT</span>
                <h2>{tr('จัดการช่างตัดผม', 'Barber Management')}</h2>
                <p>{tr('จัดการวันหยุดประจำสัปดาห์ของช่างแต่ละคน', 'Manage each barber’s recurring weekly days off.')}</p>
    {isOwner && (<section className="staff-dayoff-manager">
                  <div className="staff-dayoff-heading">
                    <div>
                      <h3>{tr('กำหนดวันหยุดประจำสัปดาห์ของช่าง', 'Set recurring barber days off')}</h3>
                      <p>{tr('เลือกช่างและติ๊กวันที่หยุดประจำ ระบบจะแสดงวันหยุดเป็นช่องสีดำในตาราง', 'Choose a barber and select recurring days off. These appear as black day-off cells.')}</p>
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
                      tr('อาทิตย์', 'Sunday'),
                      tr('จันทร์', 'Monday'),
                      tr('อังคาร', 'Tuesday'),
                      tr('พุธ', 'Wednesday'),
                      tr('พฤหัสบดี', 'Thursday'),
                      tr('ศุกร์', 'Friday'),
                      tr('เสาร์', 'Saturday'),
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
                <h2>{tr('ตั้งค่าร้าน', 'Shop Settings')}</h2>
                <p>{tr('หน้านี้ยังอยู่ระหว่างพัฒนา', 'This page is not implemented yet.')}</p>
              </section>
            )}
            </>
          )}


        {user && isBarber && route === '/barber' && (
          <>
            {activeStaffPage === 'overview' && (
              <section className="hero">
              <span className="gold-text">MICKEY BARBERSHOP · BARBER</span>
              <h2>{tr('ตารางงานช่าง', 'Barber Dashboard')}</h2>
              <p>{staffProfile?.full_name || user.email}</p>
              <button onClick={handleLogout} disabled={loading}>{tr('ออกจากระบบ', 'Sign Out')}</button>
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
            ? tr('ตารางงานของฉัน', 'My Schedule')
            : tr('ตารางงานช่างทุกคน', 'All Barbers Schedule')}
        </h2>
        <p>
          {activeStaffPage === 'my-schedule'
            ? tr('แสดงเฉพาะคิวของคุณ', 'Showing only your bookings.')
            : tr('ภาพรวมคิวของร้าน แยกตามช่างและช่วงเวลา · ช่อง — คือไม่มีรายการจอง', 'Shop-wide bookings by barber and time. — means no booking is listed.')}
        </p>
      </div>

      <label>
        {tr('วันที่', 'Date')}
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
            <th>{tr('ช่าง', 'Barber')}</th>
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
                  ? tr('ไม่พบข้อมูลช่างของบัญชีนี้', 'Your barber profile was not found.')
                  : tr('ไม่พบรายชื่อช่าง', 'No barbers found.')}
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
            <section className="auth-card customer-schedule-card unified-booking-card">
              <span className="gold-text">MICKEY BARBERSHOP · LIVE BOOKING</span>
              <h2>{tr('เลือกบริการและจองคิว', 'Choose Service & Book')}</h2>
              <p className="auth-description">
                {tr(
                  'เลือกวันที่ก่อน แล้วดูตารางเวลาของช่างทุกคนและกด OPEN เพื่อเริ่มจอง',
                  'Choose a date, view every barber’s schedule, and tap OPEN to start booking.'
                )}
              </p>

              <div className="customer-date-first">
                <label>
                  {tr('เลือกวันที่ต้องการจอง', 'Choose Booking Date')}
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
                    <h3>{tr('ตารางเวลาของช่างทุกคน', 'All Barbers Schedule')}</h3>
                    <p>{tr('เลือกวันที่ แล้วกด OPEN ในช่วงเวลาที่ต้องการ จากนั้นเลือกบริการและช่าง', 'Choose a date, tap OPEN, then select your service and preferred barber.')}</p>
                  </div>
                  <button type="button" className="schedule-refresh-button" onClick={loadPublicAvailability} disabled={availabilityLoading}>
                    {availabilityLoading ? tr('กำลังโหลด...', 'Loading...') : tr('รีเฟรช', 'Refresh')}
                  </button>
                </div>
                <div className="schedule-legend">
                  <span><i className="legend-open" />OPEN</span>
                  <span><i className="legend-busy" />{tr('ไม่ว่าง', 'Unavailable')}</span>
                  <span><i className="legend-closed" />{tr('ปิด', 'Closed')}</span>
                </div>
                {availabilityError && <p className="schedule-error">{availabilityError}</p>}
                <div className="customer-schedule-scroll">
                  <table className="customer-schedule-table">
                    <thead>
                      <tr>
                        <th>{tr('ช่าง', 'Barber')}</th>
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
                                  {open && !isPast ? 'OPEN' : '—'}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {!barbers.length && <tr><td colSpan={11}>{tr('ไม่พบรายชื่อช่างที่เปิดใช้งาน', 'No active barbers found.')}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {showBookingModal && (
                <div className="booking-modal-backdrop" role="presentation" onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setShowBookingModal(false)
                }}>
                  <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
                    <button type="button" className="booking-modal-close" onClick={() => setShowBookingModal(false)} aria-label={tr('ปิด', 'Close')}>×</button>
                    <span className="gold-text">BOOK YOUR APPOINTMENT</span>
                    <h3 id="booking-modal-title">{tr('รายละเอียดการจอง', 'Booking Details')}</h3>
                    <p className="booking-modal-time">{selectedDate} · {selectedTime}</p>
                    <form onSubmit={handleBooking}>
                      <label>
                        {tr('เลือกบริการ', 'Choose Service')}
                        <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)} required>
                          <option value="">{tr('-- เลือกบริการ --', '-- Select Service --')}</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} — {money(service.price_thb)} ({service.duration_minutes} {tr('นาที', 'min')})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr('เลือกช่าง', 'Choose Barber')}
                        <select value={selectedBarber} onChange={(event) => setSelectedBarber(event.target.value)}>
                          <option value="">{tr('ช่างคนไหนก็ได้ · ให้ระบบจัดสรร', 'Any Barber · Auto-assign')}</option>
                          {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.full_name}</option>)}
                        </select>
                      </label>
                      {chosenService && (
                        <div className="unified-service-summary">
                          <span>{chosenService.name}</span>
                          <span>{money(chosenService.price_thb)}</span>
                          <span>{chosenService.duration_minutes} {tr('นาที', 'min')}</span>
                        </div>
                      )}
                      {selectedService && selectedBarber && !isCustomerSlotAvailable(selectedBarber, Number(selectedTime.slice(0, 2))) && (
                        <p className="schedule-error">{tr('ช่างคนนี้ไม่ว่างในช่วงเวลานี้ กรุณาเลือกช่างคนอื่นหรือ Any Barber', 'This barber is unavailable for this time. Choose another barber or Any Barber.')}</p>
                      )}
                      <div className="booking-modal-actions">
                        <button type="button" className="text-button" onClick={() => setShowBookingModal(false)}>{tr('กลับไปดูตาราง', 'Back to Schedule')}</button>
                        <button type="submit" disabled={loading || !selectedService || !selectedTime || !availableTimes.includes(selectedTime) || (selectedBarber && !isCustomerSlotAvailable(selectedBarber, Number(selectedTime.slice(0, 2))))}>
                          {loading ? tr('กำลังจอง...', 'Booking...') : tr('ยืนยันการจอง', 'Confirm Booking')}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              )}

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

        {selectedStaffBooking && (
          <div className="staff-booking-overlay" onClick={(event) => { if (event.target === event.currentTarget) setSelectedStaffBooking(null) }}>
            <section className="staff-booking-modal" role="dialog" aria-modal="true" aria-label={tr('จัดการคิว', 'Manage booking')}>
              {selectedStaffBooking?.customer?.id && (
                <div className="customer-edit-entry">
                  {String(editingCustomerId) === String(selectedStaffBooking.customer.id)
                    ? renderCustomerEditForm(selectedStaffBooking.customer.id)
                    : (
                      <button
                        type="button"
                        onClick={() => startCustomerEdit(selectedStaffBooking.customer)}
                      >
                        {tr('แก้ไขข้อมูลลูกค้า', 'Edit customer details')}
                      </button>
                    )}
                </div>
              )}

              <button className="staff-modal-close" type="button" onClick={() => setSelectedStaffBooking(null)}>×</button>
              <span className="gold-text">BOOKING DETAILS</span>
              <h2>{selectedStaffBooking.customer?.full_name || tr('ลูกค้า', 'Customer')}</h2>
              <div className="staff-booking-details">
                <p><b>{tr('บริการ', 'Service')}:</b> {selectedStaffBooking.service_name_snapshot || '-'}</p>
                <p><b>{tr('ช่าง', 'Barber')}:</b> {selectedStaffBooking.barber?.full_name || '-'}</p>
                <p><b>{tr('เวลา', 'Time')}:</b> {formatDateTime(selectedStaffBooking.starts_at, language)}</p>
                <p><b>{tr('สถานะ', 'Status')}:</b> {statusLabel(selectedStaffBooking.status, language)}</p>
                {selectedStaffBooking.customer?.phone && <p><b>{tr('โทรศัพท์', 'Phone')}:</b> {selectedStaffBooking.customer.phone}</p>}
              </div>
              <label>{tr('เปลี่ยนสถานะ', 'Change status')}
                <select value={selectedStaffBooking.status || 'Confirmed'} disabled={loading} onChange={async (event) => {
                  const nextStatus = event.target.value
                  await handleStaffBookingUpdate(selectedStaffBooking.id, { status: nextStatus })
                  setSelectedStaffBooking({ ...selectedStaffBooking, status: nextStatus })
                }}>
                  {['Confirmed', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show'].map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}
                </select>
              </label>
              <div className="staff-modal-actions">
                <button type="button" disabled={loading} onClick={() => handleMoveStaffBooking(selectedStaffBooking)}>{tr('ย้ายคิว', 'Move booking')}</button>
                <button type="button" className="secondary" onClick={() => setSelectedStaffBooking(null)}>{tr('ปิด', 'Close')}</button>
              </div>
            </section>
          </div>
        )}
        {message && <div className="auth-message" role="status">{message}</div>}
      </main>

      <footer>MICKEY BARBERSHOP © 2026</footer>
    </div>
  )
}

export default App