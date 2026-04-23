#!/usr/bin/env node
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

if (!TOKEN || !REF) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env')
  process.exit(1)
}

const QUERIES = {
  total: {
    label: '総アクセス数',
    sql: 'select count(*)::int as total, count(distinct country)::int as countries, count(distinct city)::int as cities from access_logs',
  },
  today: {
    label: '今日のアクセス（JST基準）',
    sql: "select count(*)::int as visits from access_logs where (created_at at time zone 'Asia/Tokyo')::date = (now() at time zone 'Asia/Tokyo')::date",
  },
  daily: {
    label: '日別推移（直近30日・JST）',
    sql: "select to_char((created_at at time zone 'Asia/Tokyo')::date, 'YYYY-MM-DD') as day_jst, count(*)::int as visits, count(distinct country)::int as unique_countries, count(distinct city)::int as unique_cities from access_logs group by 1 order by 1 desc limit 30",
  },
  hourly: {
    label: '時間別推移（直近48時間・JST）',
    sql: "select to_char(date_trunc('hour', created_at at time zone 'Asia/Tokyo'), 'MM-DD HH24:00') as hour_jst, count(*)::int as visits from access_logs where created_at > now() - interval '48 hours' group by 1 order by 1 desc",
  },
  countries: {
    label: '国別ランキング（JST）',
    sql: "select country, count(*)::int as visits, to_char(min(created_at) at time zone 'Asia/Tokyo', 'MM-DD HH24:MI') as first_seen_jst from access_logs group by country order by visits desc limit 20",
  },
  spread: {
    label: '広がりの推移（JST）',
    sql: "with country_first as (select country, min(created_at) as first_seen from access_logs group by country), daily as (select (first_seen at time zone 'Asia/Tokyo')::date as day_jst, count(*) as new_countries from country_first group by 1), visits_daily as (select (created_at at time zone 'Asia/Tokyo')::date as day_jst, count(*) as visits from access_logs group by 1) select to_char(d.day_jst, 'YYYY-MM-DD') as day_jst, coalesce(d.new_countries, 0)::int as new_countries, coalesce(v.visits, 0)::int as visits, sum(coalesce(d.new_countries, 0)) over (order by d.day_jst)::int as total_countries, sum(coalesce(v.visits, 0)) over (order by d.day_jst)::int as total_visits from daily d full outer join visits_daily v using (day_jst) order by day_jst",
  },
  cities: {
    label: '都市別TOP20',
    sql: "select city, country, count(*)::int as visits from access_logs where city != 'UNKNOWN' group by city, country order by visits desc limit 20",
  },
  recent: {
    label: '最近のアクセス（直近30件・JST）',
    sql: "select to_char(created_at at time zone 'Asia/Tokyo', 'MM-DD HH24:MI') as time_jst, city, country from access_logs order by created_at desc limit 30",
  },
}

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

function formatTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '(no data)'
  const cols = Object.keys(rows[0])
  const widths = cols.map(c =>
    Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length))
  )
  const sep = widths.map(w => '─'.repeat(w)).join('─┼─')
  const header = cols.map((c, i) => c.padEnd(widths[i])).join(' │ ')
  const body = rows
    .map(r => cols.map((c, i) => String(r[c] ?? '').padEnd(widths[i])).join(' │ '))
    .join('\n')
  return `${header}\n${sep}\n${body}`
}

const target = process.argv[2]

if (target === 'list') {
  console.log('利用可能なクエリ:')
  for (const [key, q] of Object.entries(QUERIES)) {
    console.log(`  ${key.padEnd(12)} — ${q.label}`)
  }
  console.log(`\n使い方: node scripts/stats.mjs <key>`)
  console.log('        node scripts/stats.mjs all  (全部実行)')
  process.exit(0)
}

const keys = target === 'all' || !target
  ? Object.keys(QUERIES)
  : [target]

for (const key of keys) {
  const q = QUERIES[key]
  if (!q) {
    console.error(`Unknown query: ${key}`)
    process.exit(1)
  }
  console.log(`\n=== ${q.label} ===`)
  const result = await runQuery(q.sql)
  if (result.message) {
    console.log(`ERROR: ${result.message}`)
  } else {
    console.log(formatTable(result))
  }
}
