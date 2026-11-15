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

  // ตรวจสอบสถานะการเข้าสู่ระบบ
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) {
        setMessage(error.message)
      }

      setUser(data?.session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ตรวจสอบข้อมูลสมาชิกในฐานข้อมูล
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
        setMessage('ไม่สามารถตรวจสอบข้อมูลสมาชิกได้: ' + error.message)
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

  // สมัครสมาชิก / เข้าสู่ระบบด้วยอีเมล
  async function handleSubmit(e) {
    e.preventDefault()

    setLoading(true)
    setMessage('')

    try {
      if (mode === 'register') {
        const normalizedPhone = phone.replace(/[^0-9]/g, '')

        if (
          normalizedPhone.length < 9 ||
          normalizedPhone.length > 15
        ) {
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

        if (data.session) {
          setMessage('สมัครสมาชิกสำเร็จ')
        } else {
          setMessage(
            'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี'
          )
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
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

  // เข้าสู่ระบบด้วย Google
  async function handleGoogleLogin() {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (error) throw error
    } catch (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  // บันทึกข้อมูลสมาชิกหลังเข้าสู่ระบบ Google
  async function handleCompleteProfile(e) {
    e.preventDefault()

    if (!user) {
      setMessage('กรุณาเข้าสู่ระบบก่อน')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const normalizedPhone = phone.replace(/[^0-9]/g, '')
      const normalizedName = fullName.trim()

      if (!normalizedName) {
        throw new Error('กรุณากรอกชื่อ-นามสกุล')
      }

      if (
        normalizedPhone.length < 9 ||
        normalizedPhone.length > 15
      ) {
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
        // กรณีมีข้อมูลสมาชิกอยู่แล้ว ให้ลองอ่านข้อมูลเดิม
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
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // ออกจากระบบ
  async function handleLogout() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setCustomer(null)
      setMessage('ออกจากระบบเรียบร้อยแล้ว')
    }

    setLoading(false)
  }

  // ลืมรหัสผ่าน
  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessage('กรุณากรอกอีเมลก่อน')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: window.location.origin,
      }
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลแล้ว')
    }

    setLoading(false)
  }

  return (
    <div className="app">

      <header className="header">
        <h1>MICKEY BARBERSHOP</h1>
        <p>PREMIUM BARBER EXPERIENCE</p>
      </header>

      <main className="main">

        {/* สถานะกำลังตรวจสอบ */}
        {user && profileLoading && (
          <section className="hero">
            <p>กำลังตรวจสอบข้อมูลสมาชิก...</p>
          </section>
        )}

        {/* สมาชิกยังไม่มีข้อมูลใน customers */}
        {user && !profileLoading && !customer && (
          <section className="auth-card">

            <span className="gold-text">
              MICKEY MEMBERSHIP
            </span>

            <h2>กรอกข้อมูลสมาชิก</h2>

            <p className="auth-description">
              กรุณากรอกชื่อและเบอร์โทรศัพท์ก่อนเริ่มใช้งาน
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
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <label>อีเมล</label>

              <input
                type="email"
                value={user.email || ''}
                disabled
              />

              <button type="submit" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสมาชิก'}
              </button>

            </form>

            <button
              className="text-button"
              onClick={handleLogout}
              disabled={loading}
            >
              ออกจากระบบ
            </button>

          </section>
        )}

        {/* สมาชิกเข้าสู่ระบบแล้ว */}
        {user && !profileLoading && customer && (
          <section className="hero">

            <span className="gold-text">
              MICKEY MEMBERSHIP
            </span>

            <h2>ยินดีต้อนรับ</h2>

            <p>
              {customer.full_name}
            </p>

            <p>
              เบอร์โทรศัพท์: {customer.phone}
            </p>

            <p>
              {customer.email}
            </p>

            <p>
              เข้าสู่ระบบเรียบร้อยแล้ว
            </p>

            <button
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
            </button>

          </section>
        )}

        {/* หน้าสมัครสมาชิกและเข้าสู่ระบบ */}
        {!user && (
          <section className="auth-card">

            <span className="gold-text">
              MICKEY MEMBERSHIP
            </span>

            <h2>
              {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </h2>

            <p className="auth-description">
              {mode === 'login'
                ? 'เข้าสู่ระบบเพื่อจองคิวร้านตัดผม'
                : 'สมัครสมาชิกเพื่อเริ่มใช้งาน'}
            </p>

            <form onSubmit={handleSubmit}>

              {mode === 'register' && (
                <>
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
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </>
              )}

              <label>อีเมล</label>

              <input
                type="email"
                placeholder="กรอกอีเมล"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label>รหัสผ่าน</label>

              <input
                type="password"
                placeholder="กรอกรหัสผ่าน"
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
              <button
                className="text-button"
                onClick={handleForgotPassword}
                disabled={loading}
              >
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

        {/* ข้อความแจ้งเตือน */}
        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

      </main>

      <footer>
        MICKEY BARBERSHOP © 2026
      </footer>

    </div>
  )
}

export default App
