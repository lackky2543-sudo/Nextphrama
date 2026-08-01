/* =========================================================
   ระบบคลังยาและเวชภัณฑ์ — client-side demo (localStorage)
   ========================================================= */

const STORAGE_KEY = 'pharma_stock_v1';
const NEAR_EXPIRY_DAYS = 90;
const CURRENT_USER = { name: 'เภสัชกร สมชาย', role: 'Admin' };

/* ---------- utils ---------- */
const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,9);
const todayStr = () => new Date().toISOString().slice(0,10);
const fmtDate = (d) => { if(!d) return '-'; const dt=new Date(d+'T00:00:00'); return dt.toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'2-digit'}); };
const fmtNum = (n) => Number(n||0).toLocaleString('th-TH');
const daysUntil = (dateStr) => {
  const today = new Date(todayStr()+'T00:00:00');
  const target = new Date(dateStr+'T00:00:00');
  return Math.round((target - today) / 86400000);
};
const escapeHtml = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- seed data ---------- */
function seedData(){
  const drugs = [
    { id:'d1', code:'PARA500', name:'Paracetamol 500mg', unit:'เม็ด', min:500, max:5000, category:'ยาแก้ปวดลดไข้' },
    { id:'d2', code:'AMOX500', name:'Amoxicillin 500mg', unit:'แคปซูล', min:300, max:3000, category:'ยาปฏิชีวนะ' },
    { id:'d3', code:'ORS-01', name:'ORS ผงเกลือแร่', unit:'ซอง', min:200, max:2000, category:'เวชภัณฑ์ทั่วไป' },
    { id:'d4', code:'NACL09', name:'NSS 0.9% 1000ml', unit:'ถุง', min:50, max:400, category:'สารน้ำ' },
    { id:'d5', code:'INSUL-R', name:'Insulin Regular', unit:'ขวด', min:20, max:150, category:'ยาฮอร์โมน' },
  ];
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
  const lots = [
    { id:'l1', drugId:'d1', lotNo:'LOT-24A11', expiry:addDays(420), qty:3200, received:addDays(-60), supplier:'บ.เมดฟาร์ม จำกัด' },
    { id:'l2', drugId:'d1', lotNo:'LOT-24B02', expiry:addDays(45),  qty:180,  received:addDays(-200),supplier:'บ.เมดฟาร์ม จำกัด' },
    { id:'l3', drugId:'d2', lotNo:'LOT-AX901', expiry:addDays(260), qty:1100, received:addDays(-30), supplier:'บ.ไบโอเฮลท์' },
    { id:'l4', drugId:'d2', lotNo:'LOT-AX744', expiry:addDays(20),  qty:60,   received:addDays(-150),supplier:'บ.ไบโอเฮลท์' },
    { id:'l5', drugId:'d3', lotNo:'LOT-OR551', expiry:addDays(600), qty:900,  received:addDays(-10), supplier:'อภ.' },
    { id:'l6', drugId:'d4', lotNo:'LOT-NS220', expiry:addDays(300), qty:70,   received:addDays(-45), supplier:'อภ.' },
    { id:'l7', drugId:'d5', lotNo:'LOT-IN087', expiry:addDays(-5),  qty:12,   received:addDays(-300),supplier:'บ.เมดฟาร์ม จำกัด' },
    { id:'l8', drugId:'d5', lotNo:'LOT-IN140', expiry:addDays(150), qty:34,   received:addDays(-20), supplier:'บ.เมดฟาร์ม จำกัด' },
  ];
  const users = [
    { id:'u1', name:'เภสัชกร สมชาย', role:'Admin', perms:['จัดการยา','อนุมัติเบิก','ดูรายงาน','จัดการผู้ใช้'] },
    { id:'u2', name:'ผู้ช่วยฯ วันเพ็ญ', role:'เจ้าหน้าที่คลัง', perms:['รับยาเข้า','จ่ายยาออก','ตรวจนับสต็อก'] },
    { id:'u3', name:'พยาบาล อรทัย', role:'ผู้เบิกใช้', perms:['จ่ายยาออก (จำกัดแผนก)'] },
  ];
  const tx = [
    { id:uid('tx'), type:'receive', drugId:'d1', lotId:'l1', qty:3200, date:addDays(-60), user:'วันเพ็ญ', ref:'PO-2024-118' },
    { id:uid('tx'), type:'dispense', drugId:'d2', lotId:'l4', qty:40, date:addDays(-2), user:'อรทัย', ref:'OPD-9931' },
  ];
  return { drugs, lots, users, tx, counts:[], audit:[ logEntry('เริ่มต้นระบบ', 'สร้างข้อมูลตัวอย่างเริ่มต้น') ] };
}

function logEntry(action, detail){
  return { id:uid('log'), ts:new Date().toISOString(), user:CURRENT_USER.name, action, detail };
}

/* ---------- state ---------- */
let state = load();
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const s = seedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function pushAudit(action, detail){ state.audit.unshift(logEntry(action, detail)); if(state.audit.length>300) state.audit.length=300; save(); }

/* ---------- derived data ---------- */
function lotsForDrug(drugId){ return state.lots.filter(l => l.drugId===drugId); }
function stockOf(drugId){ return lotsForDrug(drugId).reduce((s,l)=>s+Number(l.qty||0),0); }
function drugById(id){ return state.drugs.find(d=>d.id===id); }
function stockValueTotal(){ return state.drugs.reduce((sum,d)=>sum+stockOf(d.id),0); }
function lowStockDrugs(){ return state.drugs.filter(d => stockOf(d.id) < d.min); }
function nearExpiryLots(days=NEAR_EXPIRY_DAYS){ return state.lots.filter(l => { const du=daysUntil(l.expiry); return du>=0 && du<=days; }); }
function expiredLots(){ return state.lots.filter(l => daysUntil(l.expiry) < 0 && l.qty>0); }
function fefoSortedLots(drugId){ return lotsForDrug(drugId).filter(l=>l.qty>0).sort((a,b)=> new Date(a.expiry)-new Date(b.expiry)); }

function expiryStatus(dateStr){
  const d = daysUntil(dateStr);
  if(d < 0) return {level:'danger', label:`หมดอายุแล้ว ${Math.abs(d)} วัน`};
  if(d <= 30) return {level:'danger', label:`เหลือ ${d} วัน`};
  if(d <= NEAR_EXPIRY_DAYS) return {level:'warn', label:`เหลือ ${d} วัน`};
  return {level:'ok', label:`เหลือ ${d} วัน`};
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('is-show'), 2600);
}

/* ---------- nav / routing ---------- */
const VIEWS = {
  dashboard: { title:'Dashboard', eyebrow:'01 · ภาพรวมคลังยา', render: renderDashboard },
  drugs:     { title:'ข้อมูลยา', eyebrow:'02 · ทะเบียนรายการยา', render: renderDrugs },
  receive:   { title:'รับยาเข้า', eyebrow:'03 · บันทึกการรับเข้า', render: renderReceive },
  dispense:  { title:'จ่ายยาออก', eyebrow:'04 · เบิกจ่ายแบบ FEFO', render: renderDispense },
  lots:      { title:'Lot & Expire', eyebrow:'05 · ควบคุมล็อตและวันหมดอายุ', render: renderLots },
  count:     { title:'ตรวจนับสต็อก', eyebrow:'06 · นับจริงเทียบยอดระบบ', render: renderCount },
  reports:   { title:'รายงาน', eyebrow:'07 · Stock Card และรายงานรับ-จ่าย', render: renderReports },
  alerts:    { title:'แจ้งเตือน', eyebrow:'08 · ศูนย์การแจ้งเตือน', render: renderAlerts },
  users:     { title:'ผู้ใช้งานและสิทธิ์', eyebrow:'09 · การจัดการผู้ใช้', render: renderUsers },
  security:  { title:'ความปลอดภัย', eyebrow:'10 · Audit Log และสำรองข้อมูล', render: renderSecurity },
};

function go(view){
  document.querySelectorAll('.navitem').forEach(b => b.classList.toggle('is-active', b.dataset.view===view));
  const v = VIEWS[view];
  document.getElementById('viewTitle').textContent = v.title;
  document.getElementById('viewEyebrow').textContent = v.eyebrow;
  document.getElementById('viewport').innerHTML = v.render();
  window.scrollTo({top:0, behavior:'instant'});
  bindViewEvents(view);
  updateAlertBadge();
}

document.getElementById('navList').addEventListener('click', (e)=>{
  const btn = e.target.closest('.navitem');
  if(btn) go(btn.dataset.view);
});

function updateAlertBadge(){
  const n = lowStockDrugs().length + nearExpiryLots().length + expiredLots().length;
  const b = document.getElementById('alertBadge');
  b.textContent = n;
  b.dataset.zero = n===0 ? '1':'0';
}

/* =========================================================
   01 · DASHBOARD
   ========================================================= */
function renderDashboard(){
  const low = lowStockDrugs();
  const near = nearExpiryLots();
  const expired = expiredLots();
  const totalUnits = stockValueTotal();

  const recentTx = [...state.tx].sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,6);

  return `
  <div class="grid grid--kpi">
    <div class="card kpi kpi--primary">
      <div class="kpi__top"><span class="kpi__label">จำนวนคงเหลือรวม</span><span class="kpi__icon">📦</span></div>
      <div class="kpi__value">${fmtNum(totalUnits)}</div>
      <div class="kpi__foot">หน่วยรวมทุกรายการยา / ${state.drugs.length} รายการ</div>
    </div>
    <div class="card kpi kpi--accent">
      <div class="kpi__top"><span class="kpi__label">จำนวน Lot ที่ใช้งาน</span><span class="kpi__icon">🏷️</span></div>
      <div class="kpi__value">${state.lots.filter(l=>l.qty>0).length}</div>
      <div class="kpi__foot">ควบคุมด้วยระบบ FEFO</div>
    </div>
    <div class="card kpi kpi--warn">
      <div class="kpi__top"><span class="kpi__label">ต่ำกว่า Min Stock</span><span class="kpi__icon">⚠️</span></div>
      <div class="kpi__value">${low.length}</div>
      <div class="kpi__foot">รายการที่ต้องสั่งซื้อเพิ่ม</div>
    </div>
    <div class="card kpi kpi--danger">
      <div class="kpi__top"><span class="kpi__label">ใกล้ / หมดอายุ</span><span class="kpi__icon">⏳</span></div>
      <div class="kpi__value">${near.length + expired.length}</div>
      <div class="kpi__foot">ภายใน ${NEAR_EXPIRY_DAYS} วัน หรือหมดอายุแล้ว</div>
    </div>
  </div>

  <div class="grid grid--2" style="margin-top:16px;">
    <div class="card">
      <div class="card__head">
        <div><div class="card__title">ยาใกล้หมดอายุเร่งด่วน (FEFO)</div><div class="card__hint">เรียงตามวันหมดอายุที่ใกล้ที่สุดก่อน</div></div>
      </div>
      ${renderFefoRunway([...expired, ...near].sort((a,b)=>new Date(a.expiry)-new Date(b.expiry)).slice(0,5))}
    </div>

    <div class="card">
      <div class="card__head"><div class="card__title">ความเคลื่อนไหวล่าสุด</div></div>
      ${recentTx.length ? recentTx.map(t=>{
        const d = drugById(t.drugId);
        const isRecv = t.type==='receive';
        return `<div class="audit-item">
          <div class="audit-dot" style="background:${isRecv?'var(--accent)':'var(--primary)'}"></div>
          <div class="audit-txt">
            <b>${isRecv?'รับเข้า':'จ่ายออก'} ${fmtNum(t.qty)} ${escapeHtml(d? d.unit:'')} — ${escapeHtml(d? d.name:'ไม่ทราบชื่อยา')}</b>
            <div>${fmtDate(t.date)} · โดย ${escapeHtml(t.user)} · อ้างอิง ${escapeHtml(t.ref||'-')}</div>
          </div>
        </div>`;
      }).join('') : `<div class="empty"><div class="empty__title">ยังไม่มีความเคลื่อนไหว</div></div>`}
    </div>
  </div>

  <div class="section-title">รายการต่ำกว่า Min Stock</div>
  <div class="card tbl-wrap">
    <table>
      <thead><tr><th>รหัสยา</th><th>ชื่อยา</th><th>คงเหลือ</th><th>Min</th><th>Max</th><th>สถานะ</th></tr></thead>
      <tbody>
      ${low.length ? low.map(d=>`
        <tr>
          <td>${escapeHtml(d.code)}</td>
          <td>${escapeHtml(d.name)}</td>
          <td>${fmtNum(stockOf(d.id))} ${escapeHtml(d.unit)}</td>
          <td>${fmtNum(d.min)}</td>
          <td>${fmtNum(d.max)}</td>
          <td><span class="tag tag--danger">ต่ำกว่ากำหนด</span></td>
        </tr>`).join('') : `<tr><td colspan="6"><div class="empty">ทุกรายการอยู่ในระดับปกติ ✅</div></td></tr>`}
      </tbody>
    </table>
  </div>
  `;
}

/* FEFO runway — signature visual, reused in dashboard + lots view */
function renderFefoRunway(lots){
  if(!lots.length) return `<div class="empty"><div class="empty__title">ไม่มีล็อตที่ใกล้หมดอายุ</div><div>สถานะคลังยาปลอดภัยดี</div></div>`;
  const maxDays = NEAR_EXPIRY_DAYS;
  const rows = lots.map(l=>{
    const d = drugById(l.drugId);
    const du = daysUntil(l.expiry);
    const st = expiryStatus(l.expiry);
    const pct = Math.max(3, Math.min(100, ((maxDays - Math.max(du,0)) / maxDays) * 100));
    const color = st.level==='danger' ? 'var(--danger)' : st.level==='warn' ? 'var(--warn)' : 'var(--primary)';
    return `<div class="runway__row">
      <div class="runway__label"><b>${escapeHtml(d?d.name:'-')}</b><span>${escapeHtml(l.lotNo)} · ${fmtNum(l.qty)} ${escapeHtml(d?d.unit:'')}</span></div>
      <div class="runway__track"><div class="runway__fill" style="width:${pct}%; background:${color};"></div></div>
      <div class="runway__days" style="color:${color};">${st.label}</div>
    </div>`;
  }).join('');
  return `<div class="runway">${rows}
    <div class="runway__scale"><div></div><div class="runway__scale-track"><span>หมดอายุ / วันนี้</span><span>ปลอดภัย (${maxDays}+ วัน)</span></div><div></div></div>
  </div>`;
}

/* =========================================================
   02 · ข้อมูลยา (Drug master)
   ========================================================= */
function renderDrugs(){
  return `
  <div class="card__head" style="margin-bottom:16px;">
    <div>
      <div class="card__title">ทะเบียนรายการยา (${state.drugs.length})</div>
      <div class="card__hint">รหัสยา · ชื่อยา · หน่วยนับ · Min-Max Stock</div>
    </div>
    <button class="btn" id="btnAddDrug">+ เพิ่มรายการยา</button>
  </div>

  <div class="card tbl-wrap">
    <table>
      <thead><tr><th>รหัสยา</th><th>ชื่อยา</th><th>หมวดหมู่</th><th>หน่วยนับ</th><th>คงเหลือ</th><th>Min / Max</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>
      ${state.drugs.map(d=>{
        const stock = stockOf(d.id);
        const tag = stock < d.min ? '<span class="tag tag--danger">ต่ำกว่า Min</span>'
          : stock > d.max ? '<span class="tag tag--warn">เกิน Max</span>'
          : '<span class="tag tag--ok">ปกติ</span>';
        return `<tr>
          <td><b>${escapeHtml(d.code)}</b></td>
          <td>${escapeHtml(d.name)}</td>
          <td>${escapeHtml(d.category||'-')}</td>
          <td>${escapeHtml(d.unit)}</td>
          <td>${fmtNum(stock)}</td>
          <td>${fmtNum(d.min)} / ${fmtNum(d.max)}</td>
          <td>${tag}</td>
          <td><button class="btn btn--outline btn--sm" style="width:auto;" data-edit-drug="${d.id}">แก้ไข</button></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>

  <dialog id="drugDialog" class="dlg">
    ${drugFormHtml()}
  </dialog>
  `;
}

function drugFormHtml(drug){
  const isEdit = !!drug;
  return `
  <form method="dialog" id="drugForm" class="card" style="width:min(480px,92vw); border:none;">
    <h3 style="margin-bottom:16px;">${isEdit? 'แก้ไขรายการยา':'เพิ่มรายการยาใหม่'}</h3>
    <input type="hidden" name="id" value="${drug?drug.id:''}">
    <div class="field--row">
      <div class="field"><label>รหัสยา</label><input name="code" required value="${drug?escapeHtml(drug.code):''}"></div>
      <div class="field"><label>หน่วยนับ</label><input name="unit" required value="${drug?escapeHtml(drug.unit):''}" placeholder="เม็ด / ขวด / ซอง"></div>
    </div>
    <div class="field"><label>ชื่อยา</label><input name="name" required value="${drug?escapeHtml(drug.name):''}"></div>
    <div class="field"><label>หมวดหมู่</label><input name="category" value="${drug?escapeHtml(drug.category||''):''}"></div>
    <div class="field--row">
      <div class="field"><label>Min Stock</label><input name="min" type="number" min="0" required value="${drug?drug.min:0}"></div>
      <div class="field"><label>Max Stock</label><input name="max" type="number" min="0" required value="${drug?drug.max:0}"></div>
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:6px;">
      <button type="button" class="btn btn--outline" data-close-dlg>ยกเลิก</button>
      <button type="submit" class="btn">บันทึก</button>
    </div>
  </form>`;
}

function bindDrugsView(){
  const dlg = document.getElementById('drugDialog');
  document.getElementById('btnAddDrug').addEventListener('click', ()=>{
    dlg.innerHTML = drugFormHtml();
    dlg.showModal();
    bindDrugDialog(dlg);
  });
  document.querySelectorAll('[data-edit-drug]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const d = drugById(btn.dataset.editDrug);
      dlg.innerHTML = drugFormHtml(d);
      dlg.showModal();
      bindDrugDialog(dlg);
    });
  });
}
function bindDrugDialog(dlg){
  dlg.querySelector('[data-close-dlg]').addEventListener('click', ()=>dlg.close());
  dlg.querySelector('#drugForm').addEventListener('submit', (e)=>{
    const fd = new FormData(e.target);
    const id = fd.get('id');
    const payload = {
      code: fd.get('code').trim(), name: fd.get('name').trim(),
      unit: fd.get('unit').trim(), category: fd.get('category').trim(),
      min: Number(fd.get('min')), max: Number(fd.get('max')),
    };
    if(id){
      Object.assign(drugById(id), payload);
      pushAudit('แก้ไขข้อมูลยา', `${payload.code} — ${payload.name}`);
      toast('บันทึกการแก้ไขแล้ว');
    } else {
      const newDrug = { id: uid('d'), ...payload };
      state.drugs.push(newDrug);
      pushAudit('เพิ่มรายการยาใหม่', `${payload.code} — ${payload.name}`);
      toast('เพิ่มรายการยาใหม่แล้ว');
    }
    save();
    go('drugs');
  });
}

/* =========================================================
   03 · รับยาเข้า
   ========================================================= */
function renderReceive(){
  const drugOptions = state.drugs.map(d=>`<option value="${d.id}">${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`).join('');
  const recentReceives = [...state.tx].filter(t=>t.type==='receive').sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);

  return `
  <div class="grid grid--2">
    <div class="card">
      <div class="card__head"><div class="card__title">บันทึกรับยาเข้าคลัง</div><div class="card__hint">ระบุเลขที่เอกสาร ผู้ขาย และข้อมูลล็อต</div></div>
      <form id="receiveForm">
        <div class="field"><label>รายการยา</label><select name="drugId" required><option value="">— เลือกยา —</option>${drugOptions}</select></div>
        <div class="field--row">
          <div class="field"><label>เลขที่ Lot</label><input name="lotNo" required placeholder="เช่น LOT-25A01"></div>
          <div class="field"><label>วันหมดอายุ</label><input name="expiry" type="date" required></div>
        </div>
        <div class="field--row">
          <div class="field"><label>จำนวนรับเข้า</label><input name="qty" type="number" min="1" required></div>
          <div class="field"><label>วันที่รับ</label><input name="received" type="date" value="${todayStr()}" required></div>
        </div>
        <div class="field--row">
          <div class="field"><label>ผู้ขาย / ผู้จัดส่ง</label><input name="supplier" placeholder="ชื่อบริษัท"></div>
          <div class="field"><label>เลขที่เอกสาร (PO/GR)</label><input name="ref" placeholder="PO-2026-xxx"></div>
        </div>
        <button class="btn" type="submit" style="width:100%; justify-content:center; margin-top:6px;">✓ บันทึกรับยาเข้า</button>
      </form>
    </div>

    <div class="card">
      <div class="card__head"><div class="card__title">รายการรับล่าสุด</div></div>
      ${recentReceives.length ? recentReceives.map(t=>{
        const d = drugById(t.drugId);
        const lot = state.lots.find(l=>l.id===t.lotId);
        return `<div class="audit-item">
          <div class="audit-dot" style="background:var(--accent)"></div>
          <div class="audit-txt">
            <b>+${fmtNum(t.qty)} ${escapeHtml(d?d.unit:'')} — ${escapeHtml(d?d.name:'-')}</b>
            <div>Lot ${escapeHtml(lot?lot.lotNo:'-')} · หมดอายุ ${lot?fmtDate(lot.expiry):'-'} · ${fmtDate(t.date)} · ${escapeHtml(t.ref||'-')}</div>
          </div>
        </div>`;
      }).join('') : `<div class="empty"><div class="empty__title">ยังไม่มีการรับยาเข้า</div></div>`}
    </div>
  </div>
  `;
}
function bindReceiveView(){
  document.getElementById('receiveForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const drugId = fd.get('drugId');
    if(!drugId){ toast('กรุณาเลือกรายการยา'); return; }
    const qty = Number(fd.get('qty'));
    const lot = {
      id: uid('l'), drugId, lotNo: fd.get('lotNo').trim(), expiry: fd.get('expiry'),
      qty, received: fd.get('received'), supplier: fd.get('supplier').trim(),
    };
    state.lots.push(lot);
    const tx = { id:uid('tx'), type:'receive', drugId, lotId:lot.id, qty, date:fd.get('received'), user:CURRENT_USER.name, ref: fd.get('ref').trim() };
    state.tx.push(tx);
    const d = drugById(drugId);
    pushAudit('รับยาเข้า', `${d.name} +${qty} ${d.unit} (Lot ${lot.lotNo})`);
    save();
    toast('บันทึกรับยาเข้าเรียบร้อย');
    go('receive');
  });
}

/* =========================================================
   04 · จ่ายยาออก (FEFO)
   ========================================================= */
function renderDispense(){
  const drugOptions = state.drugs.map(d=>`<option value="${d.id}">${escapeHtml(d.code)} — ${escapeHtml(d.name)} (คงเหลือ ${fmtNum(stockOf(d.id))})</option>`).join('');
  const recent = [...state.tx].filter(t=>t.type==='dispense').sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  return `
  <div class="grid grid--2">
    <div class="card">
      <div class="card__head"><div class="card__title">จ่ายยาออก</div><div class="card__hint">ระบบจะตัดสต็อกอัตโนมัติจากล็อตที่หมดอายุก่อน (FEFO)</div></div>
      <form id="dispenseForm">
        <div class="field"><label>รายการยา</label><select name="drugId" id="dispenseDrugSelect" required><option value="">— เลือกยา —</option>${drugOptions}</select></div>
        <div id="fefoPreview"></div>
        <div class="field--row">
          <div class="field"><label>จำนวนที่จ่าย</label><input name="qty" type="number" min="1" required></div>
          <div class="field"><label>วันที่จ่าย</label><input name="date" type="date" value="${todayStr()}" required></div>
        </div>
        <div class="field--row">
          <div class="field"><label>ผู้รับยา / แผนก</label><input name="recipient" placeholder="ชื่อผู้ป่วย หรือแผนก"></div>
          <div class="field"><label>เลขที่เอกสารอ้างอิง</label><input name="ref" placeholder="OPD-xxxx"></div>
        </div>
        <button class="btn" type="submit" style="width:100%; justify-content:center; margin-top:6px;">✓ ยืนยันจ่ายยา (FEFO)</button>
      </form>
    </div>

    <div class="card">
      <div class="card__head"><div class="card__title">รายการจ่ายล่าสุด</div></div>
      ${recent.length ? recent.map(t=>{
        const d = drugById(t.drugId);
        return `<div class="audit-item">
          <div class="audit-dot" style="background:var(--primary)"></div>
          <div class="audit-txt">
            <b>-${fmtNum(t.qty)} ${escapeHtml(d?d.unit:'')} — ${escapeHtml(d?d.name:'-')}</b>
            <div>ผู้รับ: ${escapeHtml(t.recipient||'-')} · ${fmtDate(t.date)} · ${escapeHtml(t.ref||'-')}</div>
          </div>
        </div>`;
      }).join('') : `<div class="empty"><div class="empty__title">ยังไม่มีการจ่ายยา</div></div>`}
    </div>
  </div>
  `;
}
function bindDispenseView(){
  const sel = document.getElementById('dispenseDrugSelect');
  const preview = document.getElementById('fefoPreview');
  function updatePreview(){
    const drugId = sel.value;
    if(!drugId){ preview.innerHTML=''; return; }
    const lots = fefoSortedLots(drugId);
    if(!lots.length){ preview.innerHTML = `<div class="tag tag--danger" style="margin-bottom:14px;">ไม่มีสต็อกคงเหลือสำหรับยานี้</div>`; return; }
    preview.innerHTML = `<div class="field"><label>ลำดับตัดจ่ายตาม FEFO</label>
      <div style="display:flex; flex-direction:column; gap:6px;">
      ${lots.slice(0,4).map(l=>{
        const st = expiryStatus(l.expiry);
        const cls = st.level==='danger'?'tag--danger':st.level==='warn'?'tag--warn':'tag--ok';
        return `<div style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px; background:var(--surface-soft); padding:7px 10px; border-radius:8px;">
          <span>${escapeHtml(l.lotNo)} · คงเหลือ ${fmtNum(l.qty)}</span>
          <span class="tag ${cls}">${st.label}</span>
        </div>`;
      }).join('')}
      </div></div>`;
  }
  sel.addEventListener('change', updatePreview);

  document.getElementById('dispenseForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const drugId = fd.get('drugId');
    let qty = Number(fd.get('qty'));
    if(!drugId){ toast('กรุณาเลือกรายการยา'); return; }
    const available = stockOf(drugId);
    if(qty > available){ toast(`สต็อกไม่พอ (คงเหลือ ${fmtNum(available)})`); return; }

    const lots = fefoSortedLots(drugId);
    const usedLots = [];
    let remain = qty;
    for(const lot of lots){
      if(remain<=0) break;
      const take = Math.min(lot.qty, remain);
      lot.qty -= take;
      remain -= take;
      usedLots.push(`${lot.lotNo} (-${take})`);
    }
    const tx = { id:uid('tx'), type:'dispense', drugId, qty, date:fd.get('date'), user:CURRENT_USER.name, ref: fd.get('ref').trim(), recipient: fd.get('recipient').trim() };
    state.tx.push(tx);
    const d = drugById(drugId);
    pushAudit('จ่ายยาออก (FEFO)', `${d.name} -${qty} ${d.unit} จาก ${usedLots.join(', ')}`);
    save();
    toast('บันทึกจ่ายยาเรียบร้อย — ตัดสต็อกตาม FEFO แล้ว');
    go('dispense');
  });
}

/* =========================================================
   05 · Lot & Expire
   ========================================================= */
function renderLots(){
  const allLots = [...state.lots].sort((a,b)=> new Date(a.expiry)-new Date(b.expiry));
  return `
  <div class="card" style="margin-bottom:16px;">
    <div class="card__head"><div><div class="card__title">FEFO Runway — ล็อตใกล้หมดอายุ</div><div class="card__hint">แสดงล็อตที่ต้องเบิกจ่ายก่อนตามหลัก First-Expired-First-Out</div></div></div>
    ${renderFefoRunway([...expiredLots(), ...nearExpiryLots()].sort((a,b)=>new Date(a.expiry)-new Date(b.expiry)))}
  </div>

  <div class="card__head" style="margin-bottom:12px;">
    <div class="card__title">ทะเบียนล็อตทั้งหมด (${allLots.length})</div>
  </div>
  <div class="card tbl-wrap">
    <table>
      <thead><tr><th>Lot No.</th><th>ชื่อยา</th><th>คงเหลือ</th><th>วันรับเข้า</th><th>วันหมดอายุ</th><th>ผู้ขาย</th><th>สถานะ</th></tr></thead>
      <tbody>
      ${allLots.map(l=>{
        const d = drugById(l.drugId);
        const st = expiryStatus(l.expiry);
        const cls = st.level==='danger'?'tag--danger':st.level==='warn'?'tag--warn':'tag--ok';
        return `<tr>
          <td><b>${escapeHtml(l.lotNo)}</b></td>
          <td>${escapeHtml(d?d.name:'-')}</td>
          <td>${fmtNum(l.qty)} ${escapeHtml(d?d.unit:'')}</td>
          <td>${fmtDate(l.received)}</td>
          <td>${fmtDate(l.expiry)}</td>
          <td>${escapeHtml(l.supplier||'-')}</td>
          <td><span class="tag ${cls}">${st.label}</span></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>
  `;
}

/* =========================================================
   06 · ตรวจนับสต็อก
   ========================================================= */
function renderCount(){
  const drugOptions = state.drugs.map(d=>`<option value="${d.id}">${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`).join('');
  const history = [...state.counts].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10);
  return `
  <div class="grid grid--2">
    <div class="card">
      <div class="card__head"><div class="card__title">บันทึกผลตรวจนับ</div><div class="card__hint">เทียบยอดนับจริงกับยอดในระบบ</div></div>
      <form id="countForm">
        <div class="field"><label>รายการยา</label><select name="drugId" id="countDrugSelect" required><option value="">— เลือกยา —</option>${drugOptions}</select></div>
        <div class="field"><label>ยอดตามระบบ</label><input name="systemQty" id="systemQtyField" readonly></div>
        <div class="field"><label>ยอดนับจริง</label><input name="countedQty" type="number" min="0" required></div>
        <div class="field"><label>หมายเหตุ</label><textarea name="note" rows="2" placeholder="เช่น สาเหตุของผลต่าง"></textarea></div>
        <button class="btn" type="submit" style="width:100%; justify-content:center; margin-top:6px;">✓ บันทึกผลตรวจนับ</button>
      </form>
    </div>

    <div class="card">
      <div class="card__head"><div class="card__title">ประวัติการตรวจนับ</div></div>
      ${history.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>วันที่</th><th>ยา</th><th>ระบบ</th><th>นับจริง</th><th>ผลต่าง</th></tr></thead>
        <tbody>${history.map(c=>{
          const d = drugById(c.drugId);
          const diff = c.countedQty - c.systemQty;
          return `<tr>
            <td>${fmtDate(c.date)}</td>
            <td>${escapeHtml(d?d.name:'-')}</td>
            <td>${fmtNum(c.systemQty)}</td>
            <td>${fmtNum(c.countedQty)}</td>
            <td><span class="tag ${diff===0?'tag--ok':diff<0?'tag--danger':'tag--warn'}">${diff>0?'+':''}${fmtNum(diff)}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : `<div class="empty"><div class="empty__title">ยังไม่มีประวัติการตรวจนับ</div></div>`}
    </div>
  </div>
  `;
}
function bindCountView(){
  const sel = document.getElementById('countDrugSelect');
  const sysField = document.getElementById('systemQtyField');
  sel.addEventListener('change', ()=>{ sysField.value = sel.value ? stockOf(sel.value) : ''; });
  document.getElementById('countForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const drugId = fd.get('drugId');
    if(!drugId){ toast('กรุณาเลือกรายการยา'); return; }
    const systemQty = stockOf(drugId);
    const countedQty = Number(fd.get('countedQty'));
    const record = { id: uid('cnt'), drugId, date: todayStr(), systemQty, countedQty, note: fd.get('note').trim() };
    state.counts.push(record);
    const d = drugById(drugId);
    pushAudit('ตรวจนับสต็อก', `${d.name} ระบบ ${systemQty} / นับจริง ${countedQty}`);
    save();
    toast('บันทึกผลตรวจนับแล้ว');
    go('count');
  });
}

/* =========================================================
   07 · รายงาน
   ========================================================= */
function renderReports(){
  const drugOptions = state.drugs.map(d=>`<option value="${d.id}">${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`).join('');
  return `
  <div class="card" style="margin-bottom:16px;">
    <div class="card__head">
      <div><div class="card__title">Stock Card รายตัวยา</div><div class="card__hint">ประวัติการรับ-จ่าย-คงเหลือของยาแต่ละรายการ</div></div>
      <select id="reportDrugSelect" style="border:1px solid var(--line); border-radius:9px; padding:9px 11px; font-size:13.5px;">${drugOptions}</select>
    </div>
    <div id="stockCardWrap"></div>
  </div>

  <div class="card">
    <div class="card__head">
      <div><div class="card__title">ส่งออกรายงาน</div><div class="card__hint">ดาวน์โหลดข้อมูลเป็นไฟล์ CSV เปิดได้ด้วย Excel</div></div>
    </div>
    <div class="pill-btns">
      <button class="btn btn--outline" id="exportStock">Export คงเหลือ (XLS/CSV)</button>
      <button class="btn btn--outline" id="exportTx">Export รับ-จ่าย (CSV)</button>
      <button class="btn btn--outline" id="exportLots">Export Lot &amp; หมดอายุ (CSV)</button>
    </div>
  </div>
  `;
}
function stockCardHtml(drugId){
  const d = drugById(drugId);
  if(!d) return '';
  const rows = state.tx.filter(t=>t.drugId===drugId).sort((a,b)=>new Date(a.date)-new Date(b.date));
  let running = 0;
  const built = rows.map(t=>{
    running += (t.type==='receive'? t.qty : -t.qty);
    return { ...t, balance: running };
  });
  return `
  <div class="tbl-wrap" style="margin-top:14px;">
    <table>
      <thead><tr><th>วันที่</th><th>รายการ</th><th>รับเข้า</th><th>จ่ายออก</th><th>คงเหลือสะสม</th><th>อ้างอิง</th></tr></thead>
      <tbody>
      ${built.length ? built.map(t=>`
        <tr>
          <td>${fmtDate(t.date)}</td>
          <td>${t.type==='receive'?'รับเข้า':'จ่ายออก'}</td>
          <td>${t.type==='receive'?fmtNum(t.qty):'-'}</td>
          <td>${t.type==='dispense'?fmtNum(t.qty):'-'}</td>
          <td>${fmtNum(t.balance)}</td>
          <td>${escapeHtml(t.ref||'-')}</td>
        </tr>`).join('') : `<tr><td colspan="6"><div class="empty">ยังไม่มีความเคลื่อนไหวของยานี้</div></td></tr>`}
      </tbody>
    </table>
  </div>`;
}
function csvDownload(filename, rows){
  const csv = rows.map(r => r.map(cell => `"${String(cell??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function bindReportsView(){
  const sel = document.getElementById('reportDrugSelect');
  const wrap = document.getElementById('stockCardWrap');
  const refresh = ()=>{ wrap.innerHTML = stockCardHtml(sel.value); };
  sel.addEventListener('change', refresh);
  refresh();

  document.getElementById('exportStock').addEventListener('click', ()=>{
    const rows = [['รหัสยา','ชื่อยา','หมวดหมู่','หน่วยนับ','คงเหลือ','Min','Max']];
    state.drugs.forEach(d=> rows.push([d.code,d.name,d.category,d.unit,stockOf(d.id),d.min,d.max]));
    csvDownload('stock-summary.csv', rows);
    pushAudit('ส่งออกรายงาน', 'Export รายงานคงเหลือ (CSV)');
    toast('ดาวน์โหลดไฟล์ CSV แล้ว');
  });
  document.getElementById('exportTx').addEventListener('click', ()=>{
    const rows = [['วันที่','ประเภท','ยา','จำนวน','ผู้ทำรายการ','อ้างอิง']];
    state.tx.forEach(t=>{ const d=drugById(t.drugId); rows.push([t.date, t.type==='receive'?'รับเข้า':'จ่ายออก', d?d.name:'', t.qty, t.user, t.ref||'']); });
    csvDownload('transactions.csv', rows);
    pushAudit('ส่งออกรายงาน', 'Export รายงานรับ-จ่าย (CSV)');
    toast('ดาวน์โหลดไฟล์ CSV แล้ว');
  });
  document.getElementById('exportLots').addEventListener('click', ()=>{
    const rows = [['Lot No.','ยา','คงเหลือ','วันรับเข้า','วันหมดอายุ','ผู้ขาย']];
    state.lots.forEach(l=>{ const d=drugById(l.drugId); rows.push([l.lotNo, d?d.name:'', l.qty, l.received, l.expiry, l.supplier||'']); });
    csvDownload('lots-expiry.csv', rows);
    pushAudit('ส่งออกรายงาน', 'Export รายงาน Lot และวันหมดอายุ (CSV)');
    toast('ดาวน์โหลดไฟล์ CSV แล้ว');
  });
}

/* =========================================================
   08 · แจ้งเตือน
   ========================================================= */
function renderAlerts(){
  const low = lowStockDrugs();
  const near = nearExpiryLots();
  const expired = expiredLots();
  const section = (title, hint, items) => `
    <div class="section-title">${title}</div>
    <div class="card__hint" style="margin:-8px 0 12px;">${hint}</div>
    ${items}
  `;
  const lowHtml = low.length ? `<div class="card tbl-wrap"><table>
    <thead><tr><th>รหัสยา</th><th>ชื่อยา</th><th>คงเหลือ</th><th>Min Stock</th></tr></thead>
    <tbody>${low.map(d=>`<tr><td>${escapeHtml(d.code)}</td><td>${escapeHtml(d.name)}</td><td>${fmtNum(stockOf(d.id))} ${escapeHtml(d.unit)}</td><td>${fmtNum(d.min)}</td></tr>`).join('')}</tbody>
  </table></div>` : `<div class="card"><div class="empty">ไม่มีรายการต่ำกว่า Min Stock ✅</div></div>`;

  const expList = [...expired, ...near].sort((a,b)=>new Date(a.expiry)-new Date(b.expiry));
  const expHtml = expList.length ? `<div class="card tbl-wrap"><table>
    <thead><tr><th>Lot No.</th><th>ชื่อยา</th><th>คงเหลือ</th><th>วันหมดอายุ</th><th>สถานะ</th></tr></thead>
    <tbody>${expList.map(l=>{ const d=drugById(l.drugId); const st=expiryStatus(l.expiry); const cls= st.level==='danger'?'tag--danger':'tag--warn';
      return `<tr><td>${escapeHtml(l.lotNo)}</td><td>${escapeHtml(d?d.name:'-')}</td><td>${fmtNum(l.qty)}</td><td>${fmtDate(l.expiry)}</td><td><span class="tag ${cls}">${st.label}</span></td></tr>`;
    }).join('')}</tbody>
  </table></div>` : `<div class="card"><div class="empty">ไม่มีล็อตใกล้หมดอายุ ✅</div></div>`;

  const emptyStockDrugs = state.drugs.filter(d=>stockOf(d.id)===0);
  const emptyHtml = emptyStockDrugs.length ? `<div class="card tbl-wrap"><table>
    <thead><tr><th>รหัสยา</th><th>ชื่อยา</th></tr></thead>
    <tbody>${emptyStockDrugs.map(d=>`<tr><td>${escapeHtml(d.code)}</td><td>${escapeHtml(d.name)}</td></tr>`).join('')}</tbody>
  </table></div>` : `<div class="card"><div class="empty">ไม่มีรายการที่หมดสต็อก ✅</div></div>`;

  return section('ต่ำกว่า Min Stock', 'รายการที่ควรสั่งซื้อเพิ่มด่วน', lowHtml)
    + section('ใกล้หมดอายุ / หมดอายุแล้ว', `ภายใน ${NEAR_EXPIRY_DAYS} วัน เรียงจากใกล้ที่สุด`, expHtml)
    + section('สต็อกหมด (0 คงเหลือ)', 'รายการที่ไม่มีของคงเหลือในคลัง', emptyHtml);
}

/* =========================================================
   09 · ผู้ใช้งานและสิทธิ์
   ========================================================= */
function renderUsers(){
  return `
  <div class="card__head" style="margin-bottom:16px;">
    <div><div class="card__title">ผู้ใช้งานระบบ (${state.users.length})</div><div class="card__hint">กำหนดสิทธิ์การเข้าถึงตามบทบาทหน้าที่</div></div>
    <button class="btn" id="btnAddUser">+ เพิ่มผู้ใช้งาน</button>
  </div>
  <div class="card">
    ${state.users.map(u=>`
      <div class="userrow">
        <div class="userrow__av">${escapeHtml(u.name.slice(0,2))}</div>
        <div class="userrow__meta" style="flex:1;">
          <b>${escapeHtml(u.name)}</b>
          <span>${escapeHtml(u.role)}</span>
          <div class="perm-list">${(u.perms||[]).map(p=>`<span class="perm-chip">${escapeHtml(p)}</span>`).join('')}</div>
        </div>
        <button class="btn btn--outline btn--sm" style="width:auto;" data-remove-user="${u.id}">ลบ</button>
      </div>`).join('')}
  </div>

  <dialog id="userDialog" class="dlg">
    <form method="dialog" id="userForm" class="card" style="width:min(440px,92vw); border:none;">
      <h3 style="margin-bottom:16px;">เพิ่มผู้ใช้งาน</h3>
      <div class="field"><label>ชื่อ-สกุล</label><input name="name" required></div>
      <div class="field"><label>บทบาท</label>
        <select name="role" required>
          <option value="Admin">Admin (สิทธิ์เต็ม)</option>
          <option value="เจ้าหน้าที่คลัง">เจ้าหน้าที่คลัง (รับ/จ่าย/นับสต็อก)</option>
          <option value="ผู้เบิกใช้">ผู้เบิกใช้ (จ่ายยาเฉพาะแผนก)</option>
          <option value="ผู้ดูรายงาน">ผู้ดูรายงาน (อ่านอย่างเดียว)</option>
        </select>
      </div>
      <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:6px;">
        <button type="button" class="btn btn--outline" data-close-dlg>ยกเลิก</button>
        <button type="submit" class="btn">บันทึก</button>
      </div>
    </form>
  </dialog>
  `;
}
const ROLE_PERMS = {
  'Admin': ['จัดการยา','อนุมัติเบิก','ดูรายงาน','จัดการผู้ใช้'],
  'เจ้าหน้าที่คลัง': ['รับยาเข้า','จ่ายยาออก','ตรวจนับสต็อก'],
  'ผู้เบิกใช้': ['จ่ายยาออก (จำกัดแผนก)'],
  'ผู้ดูรายงาน': ['ดูรายงาน (อ่านอย่างเดียว)'],
};
function bindUsersView(){
  const dlg = document.getElementById('userDialog');
  document.getElementById('btnAddUser').addEventListener('click', ()=>{ dlg.showModal(); });
  dlg.querySelector('[data-close-dlg]').addEventListener('click', ()=>dlg.close());
  dlg.querySelector('#userForm').addEventListener('submit', (e)=>{
    const fd = new FormData(e.target);
    const name = fd.get('name').trim();
    const role = fd.get('role');
    if(!name) return;
    state.users.push({ id: uid('u'), name, role, perms: ROLE_PERMS[role]||[] });
    pushAudit('เพิ่มผู้ใช้งาน', `${name} (${role})`);
    save();
    toast('เพิ่มผู้ใช้งานแล้ว');
    go('users');
  });
  document.querySelectorAll('[data-remove-user]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const u = state.users.find(x=>x.id===btn.dataset.removeUser);
      state.users = state.users.filter(x=>x.id!==btn.dataset.removeUser);
      pushAudit('ลบผู้ใช้งาน', u?u.name:'-');
      save();
      toast('ลบผู้ใช้งานแล้ว');
      go('users');
    });
  });
}

/* =========================================================
   10 · ความปลอดภัย
   ========================================================= */
function renderSecurity(){
  const log = state.audit.slice(0, 60);
  return `
  <div class="grid grid--2">
    <div class="card">
      <div class="card__head"><div class="card__title">Audit Log</div><div class="card__hint">บันทึกทุกการเปลี่ยนแปลงในระบบ ตรวจสอบย้อนหลังได้</div></div>
      <div style="max-height:520px; overflow-y:auto;">
      ${log.length ? log.map(l=>`
        <div class="audit-item">
          <div class="audit-dot"></div>
          <div class="audit-txt">
            <b>${escapeHtml(l.action)}</b>
            <div>${escapeHtml(l.detail)}</div>
            <div>${new Date(l.ts).toLocaleString('th-TH')} · โดย ${escapeHtml(l.user)}</div>
          </div>
        </div>`).join('') : `<div class="empty">ยังไม่มีบันทึก</div>`}
      </div>
    </div>

    <div class="stack">
      <div class="card">
        <div class="card__head"><div class="card__title">สำรอง / กู้คืนข้อมูล</div></div>
        <p style="font-size:13px; color:var(--ink-soft); margin-bottom:14px; line-height:1.6;">
          ข้อมูลทั้งหมดถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น (localStorage) แนะนำให้สำรองข้อมูลเป็นไฟล์ JSON เป็นประจำ
        </p>
        <div class="pill-btns">
          <button class="btn btn--outline" id="btnBackup">⭳ สำรองข้อมูล (JSON)</button>
          <label class="btn btn--outline" style="cursor:pointer;">⭱ กู้คืนจากไฟล์
            <input type="file" id="restoreFile" accept="application/json" style="display:none;">
          </label>
        </div>
      </div>

      <div class="card">
        <div class="card__head"><div class="card__title">สถานะความปลอดภัย</div></div>
        <div class="audit-item"><div class="audit-dot" style="background:var(--primary)"></div><div class="audit-txt"><b>Audit Log ทำงานอยู่</b><div>บันทึก ${state.audit.length} รายการทั้งหมด</div></div></div>
        <div class="audit-item"><div class="audit-dot" style="background:var(--accent)"></div><div class="audit-txt"><b>ผู้ใช้งานปัจจุบัน</b><div>${escapeHtml(CURRENT_USER.name)} · สิทธิ์ ${escapeHtml(CURRENT_USER.role)}</div></div></div>
        <div class="audit-item"><div class="audit-dot" style="background:var(--warn)"></div><div class="audit-txt"><b>คำแนะนำ</b><div>สำหรับใช้งานจริงในโรงพยาบาล ควรต่อยอดด้วยระบบล็อกอินและฐานข้อมูลฝั่งเซิร์ฟเวอร์ (ดู README)</div></div></div>
      </div>
    </div>
  </div>
  `;
}
function bindSecurityView(){
  document.getElementById('btnBackup').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pharma-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushAudit('สำรองข้อมูล', 'ดาวน์โหลดไฟล์ JSON สำรองข้อมูล');
    toast('สำรองข้อมูลเรียบร้อย');
  });
  document.getElementById('restoreFile').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if(!data.drugs || !data.lots) throw new Error('invalid');
        state = data;
        save();
        pushAudit('กู้คืนข้อมูล', `กู้คืนจากไฟล์ ${file.name}`);
        toast('กู้คืนข้อมูลเรียบร้อย');
        go('security');
      }catch(err){ toast('ไฟล์ไม่ถูกต้อง ไม่สามารถกู้คืนได้'); }
    };
    reader.readAsText(file);
  });
}

/* ---------- view event binder ---------- */
function bindViewEvents(view){
  if(view==='drugs') bindDrugsView();
  if(view==='receive') bindReceiveView();
  if(view==='dispense') bindDispenseView();
  if(view==='count') bindCountView();
  if(view==='reports') bindReportsView();
  if(view==='users') bindUsersView();
  if(view==='security') bindSecurityView();
}

/* ---------- header user info ---------- */
document.getElementById('topUserName').textContent = CURRENT_USER.name;
document.getElementById('topUserRole').textContent = CURRENT_USER.role;

/* ---------- reset demo data ---------- */
document.getElementById('resetDataBtn').addEventListener('click', ()=>{
  if(!confirm('ล้างข้อมูลทั้งหมดและเริ่มต้นใหม่ด้วยข้อมูลตัวอย่าง?')) return;
  state = seedData();
  save();
  toast('ล้างข้อมูลและเริ่มต้นใหม่แล้ว');
  go('dashboard');
});

/* small dialog polyfill styling helper */
const style = document.createElement('style');
style.textContent = `dialog.dlg{border:none;border-radius:16px;padding:0;background:transparent;} dialog.dlg::backdrop{background:rgba(10,30,25,.45);}`;
document.head.appendChild(style);

/* ---------- boot ---------- */
go('dashboard');
