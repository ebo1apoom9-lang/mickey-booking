import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './styles.css'

function App() {
  const [user, setUser] = useState(null)
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
          setMessage('สมัครสมาชิกสำเร็จ ยินดีต้อนรับครับ')
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

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
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
          <section className="hero">
            <span className="gold-text">MEMBER ACCOUNT</span>

            <h2>ยินดีต้อนรับ</h2>

            <p>
              {user.user_metadata?.full_name || user.email}
            </p>

            <p>{user.email}</p>

            <button onClick={handleLogout}>
              ออกจากระบบ
            </button>

            <p>{message}</p>
          </section>
        ) : (
          <section className="auth-card">
            <span className="gold-text">MICKEY MEMBERSHIP</span>

            <h2>
              {mode === 'register'
                ? 'สมัครสมาชิก'
                : 'เข้าสู่ระบบ'}
            </h2>

            <p className="auth-description">
              สมาชิกสามารถเข้าสู่ระบบเพื่อจองคิวตัดผมออนไลน์
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
                placeholder="กรอกรหัสผ่านอย่างน้อย 6 ตัว"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />

              <button type="submit" disabled={loading}>
                {loading
                  ? 'กำลังดำเนินการ...'
                  : mode === 'register'
                    ? 'สมัครสมาชิก'
                    : 'เข้าสู่ระบบ'}
              </button>
            </form>

            {mode === 'login' && (
              <button
                className="text-button"
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                ลืมรหัสผ่าน?
              </button>
            )}

            <div className="auth-switch">
              {mode === 'login' ? (
                <>
                  ยังไม่มีบัญชีสมาชิก?
                  <button
                    onClick={() => {
                      setMode('register')
                      setMessage('')
                    }}
                  >
                    สมัครสมาชิก
                  </button>
                </>
              ) : (
                <>
                  มีบัญชีอยู่แล้ว?
                  <button
                    onClick={() => {
                      setMode('login')
                      setMessage('')
                    }}
                  >
                    เข้าสู่ระบบ
                  </button>
                </>
              )}
            </div>

            {message && (
              <p className="auth-message">{message}</p>
            )}
          </section>
        )}
      </main>

      <footer>
        <p>© 2026 MICKEY BARBERSHOP</p>
      </footer>
    </div>
  )
}

export default App
