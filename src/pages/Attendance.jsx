import React, { useState } from 'react'
import { Badge, Empty, PageHead, Table } from './shared.jsx'
import { attendanceStatus, dayKey, duration, id, isWorkday, prettyDate, setList } from '../utils/store.js'

export default function Attendance({ data }) {
  const { session, users, attendance, company, leaves } = data
  const admin = session.role === 'admin'
  const me = users.find(user => user.id === session.id)
  const [date, setDate] = useState(admin ? dayKey() : '')
  const [person, setPerson] = useState('all')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('all')
  const today = dayKey()

  const checkIn = () => {
    const existing = attendance.find(row => row.userId === me.id && row.date === today)
    if (!isWorkday(today, company)) return alert('Today is not a configured workday.')
    if (existing) return alert('You have already checked in today.')
    const at = new Date().toISOString()
    setList('attendance', [...attendance, { id: id('att'), userId: me.id, date: today, checkIn: at, checkOut: null, status: attendanceStatus(at, null, company) }])
  }

  const checkOut = () => {
    const existing = attendance.find(row => row.userId === me.id && row.date === today)
    if (!existing) return alert('Check in before checking out.')
    if (existing.checkOut) return alert('You have already checked out today.')
    const at = new Date().toISOString()
    setList('attendance', attendance.map(row => row.id === existing.id
      ? { ...row, checkOut: at, hours: duration(row.checkIn, at), status: attendanceStatus(row.checkIn, at, company) }
      : row))
  }

  const activeEmployees = users.filter(user => user.role === 'employee' && user.status === 'active')
  const visible = (admin ? attendance : attendance.filter(row => row.userId === me.id))
    .filter(row => (!date || row.date === date)
      && (person === 'all' || row.userId === person)
      && (department === 'all' || users.find(user => user.id === row.userId)?.department === department)
      && (status === 'all' || row.status === status))
    .map(row => ({ ...row, user: users.find(user => user.id === row.userId) }))

  // For a selected working day, show active employees without a record as absent.
  const approvedToday = leaves.filter(leave => leave.status === 'approved' && leave.start <= date && leave.end >= date)
  const absentRows = admin && date && isWorkday(date, company) && (status === 'all' || status === 'Absent')
    ? activeEmployees
      .filter(user => (person === 'all' || user.id === person)
        && (department === 'all' || user.department === department)
        && !attendance.some(row => row.userId === user.id && row.date === date)
        && !approvedToday.some(leave => leave.userId === user.id))
      .map(user => ({ id: `absent-${user.id}`, date, user, status: 'Absent' }))
    : []
  const rows = [...visible, ...absentRows].sort((a, b) => b.date.localeCompare(a.date))

  return <>
    <PageHead
      eyebrow="TIME & ATTENDANCE"
      title={admin ? 'Attendance' : 'My attendance'}
      description={admin ? 'Review daily attendance, late arrivals, absences and hours.' : 'Track your daily attendance and working hours.'}
      action={!admin && <div className="punch-actions"><button className="button primary" onClick={checkIn}>+ Check in</button><button className="button outline" onClick={checkOut}>Check out</button></div>}
    />
    {!admin && <div className="notice"><b>Attendance rule</b><span>Workdays follow your company schedule. Check-in after {company.officeStart} plus {company.grace} minutes is late. Less than five hours is a half day.</span></div>}
    <section className="panel">
      <div className="filters">
        <label className="field inline-field"><span>Date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
        {admin && <>
          <select value={person} onChange={event => setPerson(event.target.value)}><option value="all">All employees</option>{activeEmployees.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
          <select value={department} onChange={event => setDepartment(event.target.value)}><option value="all">All departments</option>{[...new Set(activeEmployees.map(user => user.department).filter(Boolean))].map(name => <option key={name} value={name}>{name}</option>)}</select>
        </>}
        <select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{['Present', 'Late', 'Half day', 'In progress', 'Absent'].map(value => <option key={value}>{value}</option>)}</select>
      </div>
      {rows.length
        ? <Table headers={admin ? ['Date', 'Employee', 'Department', 'Check in', 'Check out', 'Hours', 'Status'] : ['Date', 'Day', 'Check in', 'Check out', 'Hours', 'Status']} rows={rows.map(row => admin
          ? [prettyDate(row.date), row.user?.name || 'Former employee', row.user?.department || '—', row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', row.hours ? `${row.hours.toFixed(1)} h` : '—', <Badge key={row.id}>{row.status}</Badge>]
          : [prettyDate(row.date), new Date(`${row.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' }), row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', row.hours ? `${row.hours.toFixed(1)} h` : '—', <Badge key={row.id}>{row.status}</Badge>])} />
        : <Empty title="No attendance records" text={admin ? 'No check-ins or absences match these filters.' : 'Check in on your next configured workday to begin your history.'} />}
    </section>
  </>
}
