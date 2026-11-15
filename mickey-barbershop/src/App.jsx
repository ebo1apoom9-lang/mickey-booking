```jsx
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './styles.css'

function App() {
  const [user, setUser] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
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
        setMessage(error.message)
        setCustomer(null)
      } else {
        setCustomer(data)

        if (!data) {
          setFullName(
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ''
          )
        }
      }

      setProfileLoading(false)
    }

    loadCustomer()

    return () => {
      active = false
    }
  }, [user])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
            },
          },
        })

        if (error) throw error

        if (data.session) {
          setMessage('สมัครสมาชิกสำเร็จ')
        } else {
          setMessage('สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        setMessage('เข้าสู่ระบบสำเร็จ')
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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  async function handleCompleteProfile(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const normalizedPhone = phone.replace(/[^0-9]/g, '')

    if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
      setMessage('กรุณากรอกเบอร์โทรศัพท์ 9–15 หลัก')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        auth_user_id: user.id,
        full_name: fullName.trim(),
        phone: normalizedPhone,
        email: user.email,
      })
      .select('id, full_name, phone, email')
      .single()

    if (error) {
      setMessage(error.message)
    } else {
      setCustomer(data)
      setMessage('บันทึกข้อมูลสมาชิกเรียบร้อยแล้ว')
    }

    setLoading(false)
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setCustomer(null)
      setMessage('ออกจากระบบแล้ว')
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setMessage('กรุณากรอกอีเมลก่อน')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    setMessage(
      error
        ? error.message
        : 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลแล้ว'
    )

    setLoading(false)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>MICKEY BARBERSHOP</h1>
        <p>PREMIUM BARBER EXPERIENCE</p>
      </header>

      <main className="main">
        {user ? (
          profileLoading ? (
            <section className="hero">
              <p>กำลังตรวจสอบข้อมูลสมาชิก...</p>
            </section>
          ) : !customer ? (
            <section className="auth-card">
              <span className="gold-text">MICKEY MEMBERSHIP</span>
              <h2>กรอกข้อมูลสมาชิก</h2>

              <p className="auth-description">
                กรุณากรอกชื่อและเบอร์โทรศัพท์ก่อนเริ่มจองคิว
              </p>

              <form onSubmit={handleCompleteProfile}>
                <label>ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <label>เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  placeholder="กรอกเบอร์โทรศัพท์"
                  value={phone}
                  onChange={(e
