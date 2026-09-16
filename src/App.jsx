import React, { useEffect, useMemo, useState } from 'react'
import {
  Home, Mic, Package, ShoppingCart, Trash2, BarChart3, History,
  Plus, Minus, Search, Check, X, Download, Settings, Wifi, WifiOff,
  ChevronRight, ArrowLeft, Save, RotateCcw, Sparkles, ClipboardList,
  Send, Smartphone, CheckCircle2, Clock3, RefreshCw, Share2, Truck,
  CircleDot, LayoutDashboard
} from 'lucide-react'
import { MARKET_CATEGORIES, PROTEINS, ALL_PRODUCTS } from './data/catalog'
import { addHistory, exportState, loadState, saveState, startSync, forceSync } from './lib/store'
import { listenSpanish, parseVoiceEntries } from './lib/voice'

const fmtDate = () => new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long'}).format(new Date())
const fmtTime = d => new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit'}).format(new Date(d))
const pretty = n => Number(n || 0).toLocaleString('es-PE',{maximumFractionDigits:2})
const STATUS = {
  pending: {label:'Pendiente', icon:Clock3},
  sent: {label:'Enviado', icon:Send},
  received: {label:'Recibido', icon:Truck},
  completed: {label:'Completado', icon:CheckCircle2}
}
const STATUS_ORDER = ['pending','sent','received','completed']

const productName = id => {
  const found = ALL_PRODUCTS.find(p=>p.id===id)
  if(found) return found.name
  for(const cat of MARKET_CATEGORIES){
    const m = cat.items.find(([raw])=>`market_${raw}`===id)
    if(m) return m[1]
  }
  return id
}

function App(){
  const [page,setPage] = useState('home')
  const [state,setState] = useState(loadState)
  const [online,setOnline] = useState(navigator.onLine)
  const [syncStatus,setSyncStatus] = useState('local')
  const [toast,setToast] = useState('')
  const [voice,setVoice] = useState(null)
  const [voiceText,setVoiceText] = useState('')
  const [voiceMode,setVoiceMode] = useState('inventory')
  const [voicePreview,setVoicePreview] = useState(null)

  useEffect(()=>saveState(state),[state])
  useEffect(()=>{
    const on=()=>setOnline(true), off=()=>setOnline(false)
    addEventListener('online',on); addEventListener('offline',off)
    return ()=>{removeEventListener('online',on);removeEventListener('offline',off)}
  },[])
  useEffect(()=>startSync({
    onRemote:remote=>setState(remote),
    onStatus:info=>setSyncStatus(info.status)
  }),[])
  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(''),2400); return()=>clearTimeout(t)},[toast])

  const navigate = p => { setPage(p); scrollTo({top:0,behavior:'smooth'}) }
  const updateQty = (bucket,id,val) => setState(s=>({...s,[bucket]:{...s[bucket],[id]:Math.max(0,Number(val)||0)}}))
  const bump = (bucket,id,delta)=>updateQty(bucket,id,(state[bucket]?.[id]||0)+delta)

  const createBoardOrder = (s,type,bucket,label) => {
    const entries = Object.entries(s[bucket]||{}).filter(([,v])=>Number(v)>0)
    if(!entries.length) return s
    const items = entries.map(([id,qty])=>({id,name:productName(id),qty:Number(qty)}))
    const order = {
      id: crypto.randomUUID(),
      code: `VF-${String(Date.now()).slice(-5)}`,
      type,
      label,
      status:'pending',
      items,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      responsible:s.settings.responsible||'Mamá',
      destination:s.settings.destinationName||'Compras / Proveedor'
    }
    return addHistory({...s,orders:[order,...(s.orders||[])]},type,`${label}: ${items.length} productos · ${order.code}`)
  }

  const saveSnapshot = (type,bucket,label) => {
    const filled = Object.entries(state[bucket]||{}).filter(([,v])=>Number(v)>0)
    if(!filled.length) return setToast('Aún no hay cantidades para guardar')
    if(type==='market-order'||type==='protein-order'){
      setState(s=>createBoardOrder(s,type,bucket,label))
      setToast('Pedido guardado en la pizarra ✓')
      setTimeout(()=>navigate('board'),350)
    }else{
      setState(s=>addHistory(s,type,`${label}: ${filled.length} producto${filled.length===1?'':'s'}`))
      setToast('Inventario guardado ✓')
    }
  }

  const startVoice = mode => {
    setVoiceMode(mode); setVoiceText(''); setVoicePreview(null)
    setVoice({status:'listening'})
    listenSpanish({
      onResult:t=>setVoiceText(t),
      onEnd:t=>{ setVoice({status:'done'}); if(t){ setVoiceText(t); setVoicePreview(parseVoiceEntries(t,mode)) } },
      onError:e=>{setVoice({status:'error',error:e});setToast(e)}
    })
  }
  const applyVoice = () => {
    if(!voicePreview?.found?.length) return
    const bucket = voiceMode==='market'?'marketOrder':voiceMode==='protein'?'proteinOrder':'inventory'
    setState(s=>{
      const copy={...(s[bucket]||{})}
      voicePreview.found.forEach(x=>copy[x.product.id]=x.qty)
      return addHistory({...s,[bucket]:copy},'voice',`Voz: ${voicePreview.found.length} registros`)
    })
    setVoice(null); setVoiceText(''); setVoicePreview(null); setToast('Datos aplicados ✓')
  }

  const updateOrderStatus=(id,status)=>{
    setState(s=>{
      const orders=(s.orders||[]).map(o=>o.id===id?{...o,status,updatedAt:new Date().toISOString()}:o)
      const order=orders.find(o=>o.id===id)
      return addHistory({...s,orders},'order-status',`${order?.code||'Pedido'} → ${STATUS[status].label}`)
    })
    setToast(`Pedido marcado como ${STATUS[status].label.toLowerCase()} ✓`)
  }

  const shareOrder = order => {
    const lines = order.items.map(i=>`• ${i.name}: ${pretty(i.qty)}`)
    const text = [`*VITAL FOODS — ${order.label.toUpperCase()}*`,`Pedido ${order.code}`,`Responsable: ${order.responsible}`,'',...lines,'',`Estado: ${STATUS[order.status].label}`].join('\n')
    const digits=(state.settings.destinationPhone||'').replace(/\D/g,'')
    const url=`https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    window.open(url,'_blank','noopener,noreferrer')
    if(order.status==='pending') updateOrderStatus(order.id,'sent')
  }

  const manualSync=async()=>{
    setSyncStatus('syncing')
    const result=await forceSync(state)
    setToast(result?'Sincronizado con la nube ✓':'Quedó pendiente de sincronizar')
  }

  const navItems=[
    ['home',Home,'Inicio'],['inventory',Package,'Inventario'],['board',LayoutDashboard,'Pizarra'],['waste',Trash2,'Mermas'],['reports',BarChart3,'Reportes']
  ]

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand" onClick={()=>navigate('home')}>
        <div className="brand-mark">V</div>
        <div><strong>Vital Foods</strong><span>Control operativo</span></div>
      </div>
      <button className={`online-pill ${online?'ok':'off'}`} onClick={manualSync} title="Sincronizar ahora">
        {!online?<WifiOff size={14}/>:syncStatus==='syncing'?<RefreshCw className="spin" size={14}/>:<Wifi size={14}/>} 
        {!online?'Sin conexión':syncStatus==='syncing'?'Sincronizando':'En línea'}
      </button>
    </header>

    <main>
      {page==='home' && <HomePage state={state} navigate={navigate} startVoice={startVoice}/>} 
      {page==='inventory' && <InventoryPage state={state} updateQty={updateQty} bump={bump} startVoice={startVoice} saveSnapshot={saveSnapshot}/>} 
      {page==='market' && <MarketPage state={state} updateQty={updateQty} startVoice={startVoice} saveSnapshot={saveSnapshot}/>} 
      {page==='protein' && <ProteinOrderPage state={state} updateQty={updateQty} bump={bump} startVoice={startVoice} saveSnapshot={saveSnapshot}/>} 
      {page==='board' && <OrderBoard state={state} updateOrderStatus={updateOrderStatus} shareOrder={shareOrder} navigate={navigate}/>} 
      {page==='waste' && <WastePage state={state} setState={setState} setToast={setToast}/>} 
      {page==='reports' && <ReportsPage state={state}/>} 
      {page==='history' && <HistoryPage state={state}/>} 
      {page==='settings' && <SettingsPage state={state} setState={setState} setToast={setToast}/>} 
    </main>

    {page!=='home' && <button className="back-fab" onClick={()=>navigate('home')}><ArrowLeft size={20}/> Inicio</button>}

    <nav className="bottom-nav">
      {navItems.map(([id,I,label])=><button key={id} className={page===id?'active':''} onClick={()=>navigate(id)}><I size={21}/><span>{label}</span></button>)}
    </nav>

    {voice && <VoiceModal voice={voice} text={voiceText} preview={voicePreview} onApply={applyVoice} onClose={()=>{setVoice(null);setVoicePreview(null);setVoiceText('')}}/>}
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function HomePage({state,navigate,startVoice}){
  const inv = Object.values(state.inventory||{}).filter(v=>v>0).length
  const active=(state.orders||[]).filter(o=>o.status!=='completed').length
  const sent=(state.orders||[]).filter(o=>o.status==='sent'||o.status==='received').length
  const wastes = (state.wastes||[]).filter(w=>new Date(w.at).toDateString()===new Date().toDateString()).length
  const latest=(state.orders||[])[0]
  return <div className="page home-page">
    <section className="hero hero-dashboard">
      <div>
        <p className="eyebrow">{fmtDate()}</p>
        <h1>Buenos días 👋</h1>
        <p>Habla, guarda el pedido y síguelo hasta que esté atendido.</p>
      </div>
      <button className="settings-btn" onClick={()=>navigate('settings')}><Settings size={22}/></button>
    </section>

    <button className="voice-main" onClick={()=>startVoice('inventory')}>
      <span className="voice-orb"><Mic size={32}/></span>
      <span><b>¿Qué quieres registrar?</b><small>Toca y dicta como si enviaras un audio por WhatsApp</small></span>
      <Sparkles size={22}/>
    </button>

    <section className="stats-row">
      <Stat value={inv} label="Con stock" icon="📦"/>
      <Stat value={active} label="Pedidos activos" icon="🧾"/>
      <Stat value={wastes} label="Mermas hoy" icon="🗑️"/>
    </section>

    <button className="control-board-hero" onClick={()=>navigate('board')}>
      <div className="board-orb"><ClipboardList size={28}/></div>
      <div className="board-hero-copy">
        <span className="board-kicker"><CircleDot size={12}/> PIZARRA EN VIVO</span>
        <b>{active ? `${active} pedido${active===1?'':'s'} por controlar` : 'Todo al día'}</b>
        <small>{latest?`${latest.code} · ${STATUS[latest.status]?.label||'Pendiente'} · ${latest.items.length} productos`:'Los pedidos que guardes aparecerán aquí'}</small>
      </div>
      <div className="board-mini-stats"><strong>{sent}</strong><span>en ruta</span></div>
      <ChevronRight size={22}/>
    </button>

    <h2 className="section-title">¿Qué hacemos ahora?</h2>
    <section className="action-grid">
      <Action icon="📦" title="Inventario de hoy" sub="Cuenta rápida por voz o teclado" onClick={()=>navigate('inventory')}/>
      <Action icon="🥩" title="Pedido de proteínas" sub="Arma, guarda y envía al celular" onClick={()=>navigate('protein')}/>
      <Action icon="🥬" title="Pedido de mercado" sub="Stock + pedido en una sola vista" onClick={()=>navigate('market')}/>
      <Action icon="🗑️" title="Registrar merma" sub="Control mensual sin hojas sueltas" onClick={()=>navigate('waste')}/>
    </section>

    <section className="home-card history-card" onClick={()=>navigate('history')}>
      <div><History size={22}/><div><b>Último movimiento</b><span>{state.history.length?state.history[0].summary:'Aún no hay movimientos'}</span></div></div><ChevronRight/>
    </section>
  </div>
}

const Stat=({value,label,icon})=><div className="stat"><span>{icon}</span><b>{value}</b><small>{label}</small></div>
const Action=({icon,title,sub,onClick})=><button className="action-card" onClick={onClick}><span className="action-icon">{icon}</span><div><b>{title}</b><small>{sub}</small></div><ChevronRight size={20}/></button>

function PageHead({icon,title,sub,voice,onVoice}){return <div className="page-head"><div><span className="page-icon">{icon}</span><div><h1>{title}</h1><p>{sub}</p></div></div>{voice&&<button className="mini-voice" onClick={onVoice}><Mic size={18}/> Dictar</button>}</div>}

function InventoryPage({state,updateQty,bump,startVoice,saveSnapshot}){
  const [q,setQ]=useState('')
  const items=PROTEINS.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()))
  return <div className="page">
    <PageHead icon="📦" title="Inventario de hoy" sub="Toca, escribe o dicta las cantidades" voice onVoice={()=>startVoice('inventory')}/>
    <SearchBox value={q} onChange={setQ}/>
    <div className="list-card">{items.map(p=><QtyRow key={p.id} item={p} value={state.inventory[p.id]||0} onChange={v=>updateQty('inventory',p.id,v)} bump={d=>bump('inventory',p.id,d)}/>)}</div>
    <StickySave label="Guardar inventario" onClick={()=>saveSnapshot('inventory','inventory','Inventario diario')}/>
  </div>
}

function ProteinOrderPage({state,updateQty,bump,startVoice,saveSnapshot}){
  return <div className="page">
    <PageHead icon="🥩" title="Pedido de proteínas" sub="Completa solo lo que necesitas; luego pasa a la pizarra" voice onVoice={()=>startVoice('protein')}/>
    <div className="flow-hint"><span>1</span> Completa <ChevronRight/><span>2</span> Guarda <ChevronRight/><span>3</span> Envía al celular</div>
    <div className="list-card">{PROTEINS.map(p=><QtyRow key={p.id} item={p} value={state.proteinOrder[p.id]||0} onChange={v=>updateQty('proteinOrder',p.id,v)} bump={d=>bump('proteinOrder',p.id,d)}/>)}</div>
    <StickySave label="Guardar en pizarra" onClick={()=>saveSnapshot('protein-order','proteinOrder','Pedido de proteínas')}/>
  </div>
}

function MarketPage({state,updateQty,startVoice,saveSnapshot}){
  const [cat,setCat]=useState('frutas')
  const category=MARKET_CATEGORIES.find(c=>c.id===cat)
  return <div className="page">
    <PageHead icon="🥬" title="Pedido de mercado" sub="Stock y pedido, todo en una sola pantalla" voice onVoice={()=>startVoice('market')}/>
    <div className="flow-hint"><span>1</span> Revisa stock <ChevronRight/><span>2</span> Pide <ChevronRight/><span>3</span> Controla</div>
    <div className="chip-row">{MARKET_CATEGORIES.map(c=><button className={cat===c.id?'active':''} key={c.id} onClick={()=>setCat(c.id)}>{c.icon} {c.name}</button>)}</div>
    <div className="market-head"><span>Producto</span><span>Stock</span><span>Pedido</span></div>
    <div className="market-list">
      {category.items.map(([id,name,unit])=>{
        const pid=`market_${id}`
        return <div className="market-row" key={id}><div><b>{name}</b><small>{unit}</small></div><input inputMode="decimal" value={state.inventory[pid]||''} placeholder="0" onChange={e=>updateQty('inventory',pid,e.target.value)}/><input inputMode="decimal" value={state.marketOrder[pid]||''} placeholder="0" onChange={e=>updateQty('marketOrder',pid,e.target.value)}/></div>
      })}
    </div>
    <StickySave label="Guardar en pizarra" onClick={()=>saveSnapshot('market-order','marketOrder','Pedido de mercado')}/>
  </div>
}

function QtyRow({item,value,onChange,bump}){return <div className="qty-row"><div><b>{item.name}</b><small>{item.unit||'UND'}</small></div><div className="stepper"><button onClick={()=>bump(-1)}><Minus size={18}/></button><input inputMode="decimal" value={value||''} placeholder="0" onChange={e=>onChange(e.target.value)}/><button onClick={()=>bump(1)}><Plus size={18}/></button></div></div>}
const SearchBox=({value,onChange})=><label className="search"><Search size={18}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Buscar producto..."/></label>
const StickySave=({label,onClick})=><div className="sticky-save"><button onClick={onClick}><Save size={19}/>{label}</button></div>

function OrderBoard({state,updateOrderStatus,shareOrder,navigate}){
  const [filter,setFilter]=useState('all')
  const orders=state.orders||[]
  const visible=filter==='all'?orders:orders.filter(o=>o.status===filter)
  const counts=Object.fromEntries(STATUS_ORDER.map(k=>[k,orders.filter(o=>o.status===k).length]))
  return <div className="page board-page">
    <PageHead icon="🧾" title="Pizarra de pedidos" sub="Aquí queda guardado qué se pidió, a quién se envió y qué falta atender"/>
    <div className="board-summary">
      {STATUS_ORDER.map(key=>{const S=STATUS[key];const I=S.icon;return <button key={key} className={filter===key?'active':''} onClick={()=>setFilter(filter===key?'all':key)}><I size={18}/><strong>{counts[key]}</strong><span>{S.label}</span></button>})}
    </div>
    <div className="board-toolbar">
      <div><b>{filter==='all'?'Todos los pedidos':STATUS[filter].label}</b><small>{visible.length} registro{visible.length===1?'':'s'}</small></div>
      <button onClick={()=>navigate('protein')}><Plus size={17}/> Nuevo pedido</button>
    </div>
    {!visible.length&&<div className="empty-board"><ClipboardList size={38}/><h3>No hay pedidos aquí</h3><p>Cuando guardes un pedido de mercado o proteínas aparecerá automáticamente en esta pizarra.</p><button onClick={()=>navigate('protein')}>Crear primer pedido</button></div>}
    <div className="kanban">
      {STATUS_ORDER.map(status=>{
        const list=visible.filter(o=>o.status===status)
        if(filter!=='all'&&filter!==status) return null
        return <section className={`kanban-col status-${status}`} key={status}>
          <header><div><span className="status-dot"/><b>{STATUS[status].label}</b></div><em>{list.length}</em></header>
          <div className="kanban-stack">
            {list.map(order=><OrderCard key={order.id} order={order} shareOrder={shareOrder} updateOrderStatus={updateOrderStatus}/>) }
            {!list.length&&<div className="kanban-empty">Sin pedidos</div>}
          </div>
        </section>
      })}
    </div>
  </div>
}

function OrderCard({order,shareOrder,updateOrderStatus}){
  const [open,setOpen]=useState(false)
  const index=STATUS_ORDER.indexOf(order.status)
  const next=STATUS_ORDER[index+1]
  return <article className="order-card">
    <div className="order-top"><div><span className="order-code">{order.code}</span><b>{order.label}</b></div><span className="order-time">{fmtTime(order.createdAt)}</span></div>
    <div className="order-meta"><span>👤 {order.responsible}</span><span>📦 {order.items.length} productos</span></div>
    <button className="order-preview" onClick={()=>setOpen(!open)}>{order.items.slice(0,3).map(i=><span key={i.id}>{i.name} <b>{pretty(i.qty)}</b></span>)}{order.items.length>3&&<small>+{order.items.length-3} más</small>}<ChevronRight className={open?'rot':''} size={17}/></button>
    {open&&<div className="order-detail">{order.items.map(i=><div key={i.id}><span>{i.name}</span><b>{pretty(i.qty)}</b></div>)}</div>}
    <div className="order-actions">
      <button className="wa-action" onClick={()=>shareOrder(order)}><Share2 size={16}/>{order.status==='pending'?'Enviar al celular':'Reenviar'}</button>
      {next&&<button className="advance-action" onClick={()=>updateOrderStatus(order.id,next)}><Check size={16}/>{next==='sent'?'Marcar enviado':next==='received'?'Confirmar recibido':'Completar'}</button>}
      {!next&&<button className="advance-action soft" onClick={()=>updateOrderStatus(order.id,'pending')}><RefreshCw size={16}/>Reabrir</button>}
    </div>
  </article>
}

function WastePage({state,setState,setToast}){
  const [form,setForm]=useState({product:'',qty:'',unit:'UND',reason:'Deterioro',action:'Desecho',responsible:state.settings.responsible||''})
  const save=()=>{
    if(!form.product||!form.qty) return setToast('Completa producto y cantidad')
    const item={id:crypto.randomUUID(),...form,at:new Date().toISOString()}
    setState(s=>addHistory({...s,wastes:[item,...s.wastes]},'waste',`Merma: ${form.product} (${form.qty} ${form.unit})`))
    setForm(f=>({...f,product:'',qty:''}));setToast('Merma registrada ✓')
  }
  return <div className="page"><PageHead icon="🗑️" title="Registrar merma" sub="En menos de 30 segundos"/>
    <div className="form-card">
      <label>Producto o insumo<input list="products" value={form.product} onChange={e=>setForm({...form,product:e.target.value})} placeholder="Ej. Tomate rojo"/></label>
      <datalist id="products">{ALL_PRODUCTS.map(p=><option key={p.id} value={p.name}/>)}</datalist>
      <div className="two-cols"><label>Cantidad<input inputMode="decimal" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} placeholder="0"/></label><label>Unidad<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}><option>UND</option><option>KG</option><option>GR</option><option>PQT</option><option>ATD</option><option>LT</option></select></label></div>
      <label>Motivo<select value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}><option>Deterioro</option><option>Vencido</option><option>Mala manipulación</option><option>Exceso de producción</option><option>Otro</option></select></label>
      <label>Acción tomada<select value={form.action} onChange={e=>setForm({...form,action:e.target.value})}><option>Desecho</option><option>Reproceso</option><option>Ajuste de compra</option><option>Donación</option><option>Otro</option></select></label>
      <label>Responsable<input value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})}/></label>
      <button className="primary" onClick={save}><Check size={19}/> Registrar merma</button>
    </div>
    <h2 className="section-title">Últimas mermas</h2>
    <div className="simple-list">{state.wastes.slice(0,6).map(w=><div key={w.id}><div><b>{w.product}</b><small>{new Date(w.at).toLocaleDateString('es-PE')} · {w.reason}</small></div><strong>{w.qty} {w.unit}</strong></div>)}</div>
  </div>
}

function ReportsPage({state}){
  const invCount=Object.values(state.inventory).filter(v=>v>0).length
  const active=(state.orders||[]).filter(o=>o.status!=='completed').length
  const completed=(state.orders||[]).filter(o=>o.status==='completed').length
  const totalWastes=state.wastes.reduce((a,w)=>a+Number(w.qty||0),0)
  return <div className="page"><PageHead icon="📊" title="Reportes" sub="Resumen rápido para decidir mejor"/>
    <div className="report-grid"><Stat value={invCount} label="Productos con stock" icon="📦"/><Stat value={active} label="Pedidos activos" icon="🧾"/><Stat value={completed} label="Pedidos completados" icon="✅"/></div>
    <div className="report-card"><h3>Control de mermas</h3><div className="report-big"><b>{pretty(totalWastes)}</b><span>Cantidad total registrada</span></div></div>
    <div className="report-card"><h3>Actividad reciente</h3>{state.history.slice(0,8).map(h=><div className="report-line" key={h.id}><span>{h.summary}</span><small>{fmtTime(h.at)}</small></div>)}{!state.history.length&&<p className="muted">Los movimientos aparecerán aquí.</p>}</div>
  </div>
}

function HistoryPage({state}){return <div className="page"><PageHead icon="🕘" title="Historial" sub="Todo lo registrado queda trazable"/><div className="timeline">{state.history.map(h=><div key={h.id}><span className="dot"/><div><b>{h.summary}</b><small>{new Date(h.at).toLocaleString('es-PE')}</small></div></div>)}</div></div>}

function SettingsPage({state,setState,setToast}){
  const set=(k,v)=>setState(s=>({...s,settings:{...s.settings,[k]:v}}))
  return <div className="page"><PageHead icon="⚙️" title="Configuración" sub="Personaliza la operación y el envío"/>
    <div className="form-card">
      <label>Responsable por defecto<input value={state.settings.responsible} onChange={e=>set('responsible',e.target.value)}/></label>
      <label>Sede / nombre<input value={state.settings.branch} onChange={e=>set('branch',e.target.value)}/></label>
      <label>Nombre del destino del pedido<input value={state.settings.destinationName||''} onChange={e=>set('destinationName',e.target.value)} placeholder="Ej. Compras, proveedor, Juan"/></label>
      <label>Celular para enviar pedido por WhatsApp<input inputMode="tel" value={state.settings.destinationPhone||''} onChange={e=>set('destinationPhone',e.target.value)} placeholder="Ej. 51987654321"/></label>
      <p className="field-help"><Smartphone size={15}/> Usa código de país. Perú: 51 + número, sin espacios.</p>
      <button className="secondary" onClick={()=>exportState(state)}><Download size={18}/> Descargar respaldo</button>
      <button className="danger-lite" onClick={()=>{if(confirm('¿Vaciar cantidades actuales?')){setState(s=>({...s,inventory:{},marketOrder:{},proteinOrder:{}}));setToast('Cantidades reiniciadas')}}}><RotateCcw size={18}/> Reiniciar cantidades actuales</button>
    </div>
  </div>
}

function VoiceModal({voice,text,preview,onApply,onClose}){
  return <div className="modal-backdrop"><div className="voice-modal">
    <button className="modal-close" onClick={onClose}><X/></button>
    <div className={`mic-wave ${voice.status==='listening'?'live':''}`}><Mic size={34}/></div>
    <h2>{voice.status==='listening'?'Te escucho...':'Esto entendí'}</h2>
    <p className="voice-text">{text||'Di los productos y cantidades. Ejemplo: “super pollo 69, regular pollo 65, chaufa 19”.'}</p>
    {preview&&<div className="voice-preview">
      {preview.found.map((x,i)=><div key={i}><Check size={17}/><span>{x.product.name}</span><b>{x.qty}</b></div>)}
      {preview.unmatched.map((x,i)=><div className="warn" key={`u${i}`}><X size={17}/><span>No reconocí: {x}</span></div>)}
    </div>}
    {preview?.found?.length>0&&<button className="primary" onClick={onApply}><Check size={19}/> Confirmar y aplicar</button>}
  </div></div>
}

export default App
