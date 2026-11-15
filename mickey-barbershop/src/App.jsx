
import React from 'react'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>MICKEY BARBERSHOP</h1>
        <p>PREMIUM BARBER EXPERIENCE</p>
      </header>

      <main className="main">
        <section className="hero">
          <span className="gold-text">WELCOME TO MICKEY</span>
          <h2>LOOK SHARP.<br />FEEL CONFIDENT.</h2>
          <p>จองคิวตัดผมออนไลน์ สะดวก รวดเร็ว เลือกวันและเวลาที่คุณต้องการ</p>
          <button onClick={() => alert('ระบบจองคิวกำลังเตรียมพร้อม')}>
            จองคิวเลย
          </button>
        </section>

        <section className="services">
          <h2>OUR SERVICES</h2>
          <div className="service-card">
            <h3>ตัดผมชาย</h3>
            <p>บริการตัดผมโดยช่างมืออาชีพ</p>
          </div>
          <div className="service-card">
            <h3>ออกแบบทรงผม</h3>
            <p>เลือกสไตล์ที่เหมาะกับคุณ</p>
          </div>
          <div className="service-card">
            <h3>จัดแต่งทรงผม</h3>
            <p>ดูดีและมั่นใจในทุกวัน</p>
          </div>
        </section>
      </main>

      <footer>
        <p>© 2026 MICKEY BARBERSHOP</p>
      </footer>
    </div>
  )
}

export default App
