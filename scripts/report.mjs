#!/usr/bin/env node
// Generates a THE WIRED access status report.
// Excludes cities listed in EXCLUDE_CITIES (.env) — typically used to filter out self-access.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = resolve(__dirname, '..', '.env')
const env = Object.fromEntries(
  readFileSync(envFile, 'utf-8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
)

const TOKEN = env.SUPABASE_ACCESS_TOKEN
const REF = env.SUPABASE_PROJECT_REF
const excludeCities = (env.EXCLUDE_CITIES || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

// Build a SQL WHERE fragment that excludes configured cities.
// Uses dollar-quoted literals to avoid escape issues with unicode characters.
const excludeClause = excludeCities.length
  ? `where city not in (${excludeCities.map(c => `$ex$${c}$ex$`).join(', ')})`
  : ''

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  return res.json()
}

function bar(count, max, width = 12) {
  const n = max === 0 ? 0 : Math.round((count / max) * width)
  return '█'.repeat(n) + '─'.repeat(width - n)
}

const [summary, daily, countries, hourly] = await Promise.all([
  runQuery(`
    select
      count(*)::int as total,
      count(distinct country)::int as countries,
      count(distinct city)::int as cities,
      to_char(min(created_at) at time zone 'Asia/Tokyo', 'YYYY-MM-DD HH24:MI') as first,
      to_char(max(created_at) at time zone 'Asia/Tokyo', 'YYYY-MM-DD HH24:MI') as last
    from access_logs ${excludeClause}
  `),
  runQuery(`
    select
      to_char((created_at at time zone 'Asia/Tokyo')::date, 'YYYY-MM-DD') as day_jst,
      count(*)::int as visits
    from access_logs ${excludeClause}
    group by 1 order by 1
  `),
  runQuery(`
    select country, count(*)::int as visits
    from access_logs ${excludeClause}
    group by 1 order by 2 desc
  `),
  runQuery(`
    select extract(hour from created_at at time zone 'Asia/Tokyo')::int as h, count(*)::int as visits
    from access_logs ${excludeClause}
    group by 1 order by 1
  `),
])

const s = summary[0]
const nowJst = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 16)

console.log(`\n# THE WIRED アクセス状況レポート`)
console.log(`取得時刻: ${nowJst} JST${excludeCities.length ? ` (除外: ${excludeCities.join(', ')})` : ''}`)

console.log(`\n## サマリー`)
console.log(`総アクセス数    ${s.total}`)
console.log(`到達国数        ${s.countries}`)
console.log(`到達都市数      ${s.cities}`)
console.log(`期間            ${s.first} 〜 ${s.last}`)

console.log(`\n## 日別推移`)
{
  const max = Math.max(...daily.map(r => r.visits), 1)
  for (const row of daily) {
    console.log(`${row.day_jst}  ${bar(row.visits, max)}  ${String(row.visits).padStart(3)} 件`)
  }
}

console.log(`\n## 国別分布`)
{
  const max = Math.max(...countries.map(r => r.visits), 1)
  const top = countries.slice(0, 10)
  const rest = countries.slice(10)
  for (const row of top) {
    console.log(`${row.country.padEnd(14)} ${bar(row.visits, max)}  ${String(row.visits).padStart(3)} 件`)
  }
  if (rest.length) {
    const restSum = rest.reduce((a, r) => a + r.visits, 0)
    console.log(`その他${rest.length}カ国`.padEnd(15) + ` 計${restSum}件`)
  }
}

console.log(`\n## 時間帯分布 (JST)`)
{
  const max = Math.max(...hourly.map(r => r.visits), 1)
  const byHour = Object.fromEntries(hourly.map(r => [r.h, r.visits]))
  for (let h = 0; h < 24; h++) {
    const v = byHour[h] || 0
    console.log(`${String(h).padStart(2, '0')}時 ${bar(v, max)}  ${String(v).padStart(3)} 件`)
  }
}

console.log('')
