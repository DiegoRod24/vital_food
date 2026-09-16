import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Home, Mic, Package, ShoppingCart, Beef, Trash2, BarChart3, History,
  Plus, Minus, Search, Check, X, Download, Settings, Wifi, WifiOff,
  ChevronRight, ArrowLeft, Save, RotateCcw, Sparkles
} from 'lucide-react'
import { MARKET_CATEGORIES, PROTEINS, ALL_PRODUCTS } from './data/catalog'
import { addHistory, exportState, loadState, saveState } from './lib/store'
import { listenSpanish, parseVoiceEntries } from './lib/voice'

const fmtDate = () => new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long'}).format(new Date())
const fmtTime = d => new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit'}).format(new Date(d))
const pretty = n => Number(n || 0).toLocaleString('es-PE',{maximumFractionDigits:2})

function App(){
  const [page,setPage] = useState('home')
  const [state,setState] = useState(loadState)
  const [online,setOnline] = useState(navigator.onLine)
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
  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(''),2200); return()=>clearTimeout(t)},[toast])

  const navigate = p => { setPage(p); scrollTo({top:0,behavior:'smooth'}) }
  const updateQty = (bucket,id,val) => setState(s=>({...s,[bucket]:{...s[bucket],[id]:Math.max(0,Number(val)||0)}}))
  const bump = (bucket,id,delta)=>updateQty(bucket,id,(state[bucket]?.[id]||0)+delta)

  const saveSnapshot = (type,bucket,label) => {
    const filled = Object.entries(state[bucket]||{}).filter(([,v])=>Number(v)>0)
    if(!filled.length) return setToast('Aún no hay cantidades para guardar')
    setState(s=>addHistory(s,type,`${label}: ${filled.length} producto${filled.length===1?'':'s'}`))
    setToast('Guardado correctamente ✓')
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

  const navItems=[
    ['home',Home,'Inicio'],['inventory',Package,'Inventario'],['market',ShoppingCart,'Mercado'],['waste',Trash2,'Mermas'],['reports',BarChart3,'Reportes']
  ]

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand" onClick={()=>navigate('home')}>
        <div className="brand-mark">V</div>
        <div><strong>Vital Foods</strong><span>Control diario</span></div>
      </div>
      <div className={`online-pill ${online?'ok':'off'}`}>{online?<Wifi size={14}/>:<WifiOff size={14}/>} {online?'En línea':'Sin conexión'}</div>
    </header>

    <main>
      {page==='home' && <HomePage state={state} navigate={navigate} startVoice={startVoice}/>} 
      {page==='inventory' && <InventoryPage state={state} updateQty={updateQty} bump={bump} startVoice={startVoice} saveSnapshot={saveSnapshot}/>} 
      {page==='market' && <MarketPage state={state} updateQty={updateQty} bump={bump} startVoice={startVoice} saveSnapshot={saveSnapshot}/>} 
      {page==='protein' && <ProteinOrderPage state={state} updateQty={updateQty} bump={bump} startVoice={startVoice} saveSnapshot={saveSnapshot}/>} 
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
  const order = Object.values(state.marketOrder||{}).filter(v=>v>0).length + Object.values(state.proteinOrder||{}).filter(v=>v>0).length
  const wastes = state.wastes.filter(w=>new Date(w.at).toDateString()===new Date().toDateString()).length
  return <div className="page home-page">
    <section className="hero">
      <div>
        <p className="eyebrow">{fmtDate()}</p>
        <h1>Buenos días 👋</h1>
        <p>Registra todo rápido, sin papeles y sin complicarte.</p>
      </div>
      <button className="settings-btn" onClick={()=>navigate('settings')}><Settings size={22}/></button>
    </section>

    <button className="voice-main" onClick={()=>startVoice('inventory')}>
      <span className="voice-orb"><Mic size={32}/></span>
      <span><b>¿Qué quieres registrar?</b><small>Toca y háblame como lo haces normalmente</small></span>
      <Sparkles size={22}/>
    </button>

    <section className="stats-row">
      <Stat value={inv} label="Inventario hoy" icon="📦"/>
      <Stat value={order} label="En pedidos" icon="🛒"/>
      <Stat value={wastes} label="Mermas hoy" icon="🗑️"/>
    </section>

    <h2 className="section-title">Acciones rápidas</h2>
    <section className="action-grid">
      <Action icon="📦" title="Inventario de hoy" sub="Cuenta rápida por voz o teclado" onClick={()=>navigate('inventory')}/>
      <Action icon="🥩" title="Pedido de proteínas" sub="Tu lista semanal lista para completar" onClick={()=>navigate('protein')}/>
      <Action icon="🥬" title="Pedido de mercado" sub="Frutas, verduras, hierbas y más" onClick={()=>navigate('market')}/>
      <Action icon="🗑️" title="Registrar merma" sub="Fecha, motivo, acción y responsable" onClick={()=>navigate('waste')}/>
    </section>

    <section className="home-card history-card" onClick={()=>navigate('history')}>
      <div><History size={22}/><div><b>Historial reciente</b><span>{state.history.length?state.history[0].summary:'Aún no hay movimientos'}</span></div></div><ChevronRight/>
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
    <div className="list-card">
      {items.map(p=><QtyRow key={p.id} item={p} value={state.inventory[p.id]||0} onChange={v=>updateQty('inventory',p.id,v)} bump={d=>bump('inventory',p.id,d)}/>) }
    </div>
    <StickySave label="Guardar inventario" onClick={()=>saveSnapshot('inventory','inventory','Inventario diario')}/>
  </div>
}

function ProteinOrderPage({state,updateQty,bump,startVoice,saveSnapshot}){
  return <div className="page">
    <PageHead icon="🥩" title="Pedido de proteínas" sub="Completa solo lo que necesitas esta semana" voice onVoice={()=>startVoice('protein')}/>
    <div className="list-card">{PROTEINS.map(p=><QtyRow key={p.id} item={p} value={state.proteinOrder[p.id]||0} onChange={v=>updateQty('proteinOrder',p.id,v)} bump={d=>bump('proteinOrder',p.id,d)}/>)}</div>
    <StickySave label="Guardar pedido semanal" onClick={()=>saveSnapshot('protein-order','proteinOrder','Pedido de proteínas')}/>
  </div>
}

function MarketPage({state,updateQty,bump,startVoice,saveSnapshot}){
  const [cat,setCat]=useState('frutas')
  const category=MARKET_CATEGORIES.find(c=>c.id===cat)
  return <div className="page">
    <PageHead icon="🥬" title="Pedido de mercado" sub="Stock y pedido, todo en una sola pantalla" voice onVoice={()=>startVoice('market')}/>
    <div className="chip-row">{MARKET_CATEGORIES.map(c=><button className={cat===c.id?'active':''} key={c.id} onClick={()=>setCat(c.id)}>{c.icon} {c.name}</button>)}</div>
    <div className="market-head"><span>Producto</span><span>Stock</span><span>Pedido</span></div>
    <div className="market-list">
      {category.items.map(([id,name,unit])=>{
        const pid=`market_${id}`
        return <div className="market-row" key={id}><div><b>{name}</b><small>{unit}</small></div><input inputMode="decimal" value={state.inventory[pid]||''} placeholder="0" onChange={e=>updateQty('inventory',pid,e.target.value)}/><input inputMode="decimal" value={state.marketOrder[pid]||''} placeholder="0" onChange={e=>updateQty('marketOrder',pid,e.target.value)}/></div>
      })}
    </div>
    <StickySave label="Guardar pedido de mercado" onClick={()=>saveSnapshot('market-order','marketOrder','Pedido de mercado')}/>
  </div>
}

function QtyRow({item,value,onChange,bump}){return <div className="qty-row"><div><b>{item.name}</b><small>{item.unit||'UND'}</small></div><div className="stepper"><button onClick={()=>bump(-1)}><Minus size={18}/></button><input inputMode="decimal" value={value||''} placeholder="0" onChange={e=>onChange(e.target.value)}/><button onClick={()=>bump(1)}><Plus size={18}/></button></div></div>}
const SearchBox=({value,onChange})=><label className="search"><Search size={18}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Buscar producto..."/></label>
const StickySave=({label,onClick})=><div className="sticky-save"><button onClick={onClick}><Save size={19}/>{label}</button></div>

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
  const totalOrder=Object.values({...state.marketOrder,...state.proteinOrder}).reduce((a,b)=>a+Number(b||0),0)
  const totalWastes=state.wastes.reduce((a,w)=>a+Number(w.qty||0),0)
  return <div className="page"><PageHead icon="📊" title="Reportes" sub="Resumen rápido para decidir mejor"/>
    <div className="report-grid"><Stat value={invCount} label="Productos con stock" icon="📦"/><Stat value={pretty(totalOrder)} label="Unidades pedidas" icon="🛒"/><Stat value={pretty(totalWastes)} label="Cantidad en mermas" icon="🗑️"/></div>
    <div className="report-card"><h3>Actividad reciente</h3>{state.history.slice(0,8).map(h=><div className="report-line" key={h.id}><span>{h.summary}</span><small>{fmtTime(h.at)}</small></div>)}{!state.history.length&&<p className="muted">Los movimientos aparecerán aquí.</p>}</div>
  </div>
}

function HistoryPage({state}){return <div className="page"><PageHead icon="🕘" title="Historial" sub="Todo lo registrado queda trazable"/><div className="timeline">{state.history.map(h=><div key={h.id}><span className="dot"/><div><b>{h.summary}</b><small>{new Date(h.at).toLocaleString('es-PE')}</small></div></div>)}</div></div>}

function SettingsPage({state,setState,setToast}){
  const set=(k,v)=>setState(s=>({...s,settings:{...s.settings,[k]:v}}))
  return <div className="page"><PageHead icon="⚙️" title="Configuración" sub="Personaliza la operación"/><div className="form-card"><label>Responsable por defecto<input value={state.settings.responsible} onChange={e=>set('responsible',e.target.value)}/></label><label>Sede / nombre<input value={state.settings.branch} onChange={e=>set('branch',e.target.value)}/></label><button className="secondary" onClick={()=>exportState(state)}><Download size={18}/> Descargar respaldo</button><button className="danger-lite" onClick={()=>{if(confirm('¿Vaciar cantidades actuales?')){setState(s=>({...s,inventory:{},marketOrder:{},proteinOrder:{}}));setToast('Cantidades reiniciadas')}}}><RotateCcw size={18}/> Reiniciar cantidades actuales</button></div></div>
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
