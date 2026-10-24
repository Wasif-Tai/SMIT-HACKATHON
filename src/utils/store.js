export const keys = { company:'hcm_company', users:'hcm_users', attendance:'hcm_attendance', leaves:'hcm_leaves', session:'hcm_session', announcements:'hcm_announcements' }
export function read(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value) } catch { return fallback } }
export function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event('hcm-change')) }
export const list = (key) => read(keys[key], [])
export const setList = (key, value) => write(keys[key], value)
export const id = (prefix='id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`
export const dayKey = (date=new Date()) => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export const prettyDate = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '—'
export const money = (n) => new Intl.NumberFormat(undefined,{style:'currency',currency:'PKR',currencyDisplay:'code',maximumFractionDigits:0}).format(Number(n)||0)
export const isWorkday = (date, company=read(keys.company,{})) => (company.workingDays || [1,2,3,4,5]).includes(new Date(`${date}T12:00:00`).getDay())
export const workdays = (start,end,company) => { let count=0; for(let d=new Date(`${start}T12:00:00`); d<=new Date(`${end}T12:00:00`); d.setDate(d.getDate()+1)) if(isWorkday(dayKey(d),company)) count++; return count }
export const leaveUsed = (userId, year=new Date().getFullYear()) => list('leaves').filter(x=>x.userId===userId&&x.status==='approved'&&x.start.startsWith(String(year))).reduce((n,x)=>n+(x.days||0),0)
export const leaveRemaining = (userId, company=read(keys.company,{}), year=new Date().getFullYear()) => Math.max(0,Number(company.leaveQuota||0)-leaveUsed(userId,year))
export const attendanceStatus = (checkIn, checkOut, company=read(keys.company,{})) => { if(!checkIn) return 'Absent'; const [h,m]=(company.officeStart||'09:00').split(':').map(Number); const start=new Date(checkIn); start.setHours(h,m+(Number(company.grace)||0),0,0); const late=new Date(checkIn)>start; if(!checkOut) return late?'Late':'In progress'; const hours=Math.max(0,(new Date(checkOut)-new Date(checkIn))/36e5); if(hours<5) return 'Half day'; return late?'Late':'Present' }
export const duration = (a,b) => b ? Math.max(0,(new Date(b)-new Date(a))/36e5) : 0
export const workingDaysInMonth = (year, month, company) => { let n=0; const d=new Date(year,month,1); while(d.getMonth()===month){ if(isWorkday(dayKey(d),company)) n++; d.setDate(d.getDate()+1) } return n }
