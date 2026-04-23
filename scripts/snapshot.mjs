#!/usr/bin/env node
// Saves a full dump of access_logs + aggregated stats to logs/snapshots/
// Run periodically (weekly or before milestones) as a backup and history record.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const envFile = resolve(root, '.env')
const env = Object.fromEntries(
  readFileSync(envFile, 'utf-8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
)

const TOKEN = env.SUPABASE_ACCESS_TOKEN
const REF = env.SUPABASE_PROJECT_REF

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

const [raw, totals, daily, countries, cities, spread] = await Promise.all([
  runQuery('select id, created_at, city, country from access_logs order by created_at'),
  runQuery('select count(*)::int as total, count(distinct country)::int as countries, count(distinct city)::int as cities from access_logs'),
  runQuery("select (created_at at time zone 'Asia/Tokyo')::date as day_jst, count(*)::int as visits, count(distinct country)::int as unique_countries, count(distinct city)::int as unique_cities from access_logs group by 1 order by 1"),
  runQuery("select country, count(*)::int as visits, min(created_at) as first_seen from access_logs group by country order by visits desc"),
  runQuery("select city, country, count(*)::int as visits from access_logs where city != 'UNKNOWN' group by city, country order by visits desc"),
  runQuery("with country_first as (select country, min(created_at) as first_seen from access_logs group by country), daily as (select (first_seen at time zone 'Asia/Tokyo')::date as day_jst, count(*) as new_countries from country_first group by 1), visits_daily as (select (created_at at time zone 'Asia/Tokyo')::date as day_jst, count(*) as visits from access_logs group by 1) select d.day_jst, coalesce(d.new_countries, 0)::int as new_countries, coalesce(v.visits, 0)::int as visits, sum(coalesce(d.new_countries, 0)) over (order by d.day_jst)::int as total_countries, sum(coalesce(v.visits, 0)) over (order by d.day_jst)::int as total_visits from daily d full outer join visits_daily v using (day_jst) order by day_jst"),
])

const snapshot = {
  taken_at: new Date().toISOString(),
  totals: totals[0],
  by_day: daily,
  by_country: countries,
  by_city: cities,
  spread,
  raw,
}

const dir = resolve(root, 'logs', 'snapshots')
mkdirSync(dir, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')
const filename = `${stamp[0]}_${stamp[1].slice(0, 8)}.json`
const path = resolve(dir, filename)

writeFileSync(path, JSON.stringify(snapshot, null, 2))

console.log(`saved: ${path}`)
console.log(`  total: ${totals[0].total} visits, ${totals[0].countries} countries, ${totals[0].cities} cities`)
