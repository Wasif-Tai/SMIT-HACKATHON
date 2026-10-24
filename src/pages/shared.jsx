import React from 'react'

export function PageHead({ eyebrow, title, description, action }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>
}
export function Empty({ title = 'Nothing here yet', text = 'Records will appear here when you add them.' }) {
  return <div className="empty"><div className="empty-icon">□</div><b>{title}</b><p>{text}</p></div>
}
export function Badge({ children }) {
  const name = String(children || '').toLowerCase().replaceAll(' ', '-')
  return <span className={`badge ${name}`}>{children}</span>
}
export function Table({ headers, rows }) {
  return <div className="table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j}>{value}</td>)}</tr>)}</tbody></table></div>
}
