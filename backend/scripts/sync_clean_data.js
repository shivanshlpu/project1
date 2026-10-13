const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function syncCleanData() {
  console.log('--- 1. Purging obsolete stockers from Supabase ---');
  const staleStockerIds = ['stk-shd-01', 'stk-shd-02', 'stk-shd-03', 'stk-shd-04', 'stk-anp-01'];
  const { error: delStkErr } = await supabase.from('stockers').delete().in('id', staleStockerIds);
  console.log('Delete stale stockers:', delStkErr || 'SUCCESS');

  console.log('--- 2. Purging obsolete HQs from Supabase ---');
  const staleHqIds = ['hq-delhi', 'hq-anuppur', 'hq-umaria'];
  const { error: delHqErr } = await supabase.from('headquarters').delete().in('id', staleHqIds);
  console.log('Delete stale HQs:', delHqErr || 'SUCCESS');

  console.log('--- 3. Upserting official 4 HQs in Supabase ---');
  const officialHqs = [
    { id: 'HQ-SHD-001', name: 'Shahdol', state: 'Madhya Pradesh', is_active: true },
    { id: 'HQ-KOT-001', name: 'Kotma', state: 'Madhya Pradesh', is_active: true },
    { id: 'HQ-AMB-001', name: 'Ambikapur', state: 'Chhattisgarh', is_active: true },
    { id: 'HQ-BSP-001', name: 'Bilaspur', state: 'Chhattisgarh', is_active: true },
    // Also keep legacy aliases so any legacy FK referencing hq-shahdol succeeds
    { id: 'hq-shahdol', name: 'Shahdol', state: 'Madhya Pradesh', is_active: true },
    { id: 'hq-kotma', name: 'Kotma', state: 'Madhya Pradesh', is_active: true },
    { id: 'hq-ambikapur', name: 'Ambikapur', state: 'Chhattisgarh', is_active: true },
    { id: 'hq-bilaspur', name: 'Bilaspur', state: 'Chhattisgarh', is_active: true }
  ];
  for (const h of officialHqs) {
    const { error } = await supabase.from('headquarters').upsert(h, { onConflict: 'id' });
    if (error) console.warn('HQ upsert notice for', h.id, error.message);
  }
  console.log('Official HQs upserted.');

  console.log('--- 4. Upserting authentic 4 Stockers in Supabase ---');
  const officialStockers = [
    {
      id: 'stk-shd-01',
      name: 'Tara Pharmacy',
      hq_id: 'HQ-SHD-001',
      address: 'Shahdol, MP',
      phone: '',
      is_active: true
    },
    {
      id: 'stk-shd-02',
      name: 'Parth Medical Agency',
      hq_id: 'HQ-SHD-001',
      address: 'Shahdol, MP',
      phone: '',
      is_active: true
    },
    {
      id: 'stk-ktm-01',
      name: 'Triyash Medical Agency',
      hq_id: 'HQ-KOT-001',
      address: 'Kotma, MP',
      phone: '',
      is_active: true
    },
    {
      id: 'stk-amb-01',
      name: 'Kismira Medical Agency',
      hq_id: 'HQ-AMB-001',
      address: 'Ambikapur, CG',
      phone: '',
      is_active: true
    }
  ];
  for (const s of officialStockers) {
    const { error } = await supabase.from('stockers').upsert(s, { onConflict: 'id' });
    if (error) console.warn('Stocker upsert notice for', s.id, error.message);
  }
  console.log('Official Stockers upserted.');

  console.log('--- 5. Verifying Headquarters in Supabase ---');
  const { data: hqs } = await supabase.from('headquarters').select('*');
  console.log('HQs in Supabase:', hqs.map(h => ({ id: h.id, name: h.name })));

  console.log('--- 6. Verifying Stockers in Supabase ---');
  const { data: stks } = await supabase.from('stockers').select('*');
  console.log('Stockers in Supabase:', stks.map(s => ({ id: s.id, name: s.name, hq_id: s.hq_id })));
}

syncCleanData().catch(console.error);
