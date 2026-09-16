import { ALL_PRODUCTS } from '../data/catalog'

const normalize = (s='') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\bgr(?:amos?)?\b/g,'gr').replace(/\s+/g,' ').trim()

const numberWords = {
  cero:0, uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10,
  once:11, doce:12, trece:13, catorce:14, quince:15, dieciseis:16, diecisiete:17, dieciocho:18, diecinueve:19, veinte:20,
  treinta:30, cuarenta:40, cincuenta:50, sesenta:60, setenta:70, ochenta:80, noventa:90, cien:100
}

function parseNumber(chunk) {
  const digits = chunk.match(/\b\d+(?:[.,]\d+)?\b/)
  if (digits) return Number(digits[0].replace(',','.'))
  const words = normalize(chunk).split(' ')
  let total = 0
  for (const w of words) if (numberWords[w] != null) total += numberWords[w]
  return total || null
}

function aliasesFor(p) {
  const aliases = [p.name, ...(p.aliases || [])]
  return aliases.map(normalize).sort((a,b)=>b.length-a.length)
}

export function parseVoiceEntries(text, mode='inventory') {
  const raw = normalize(text)
  const chunks = raw.split(/,|\by\b|\bluego\b|\bademas\b/).map(x=>x.trim()).filter(Boolean)
  const found = []
  const unmatched = []

  for (const chunk of chunks) {
    let best = null
    let bestAlias = ''
    for (const p of ALL_PRODUCTS) {
      if (mode === 'market' && p.type !== 'market') continue
      if ((mode === 'inventory' || mode === 'protein') && p.type !== 'protein') continue
      for (const alias of aliasesFor(p)) {
        if (chunk.includes(alias) && alias.length > bestAlias.length) {
          best = p; bestAlias = alias
        }
      }
    }
    const qty = parseNumber(chunk.replace(bestAlias,''))
    if (best && qty != null) found.push({ product: best, qty, source: chunk })
    else unmatched.push(chunk)
  }
  return { found, unmatched }
}

export function listenSpanish({ onResult, onEnd, onError }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    onError?.('Este navegador no ofrece reconocimiento de voz. Prueba Chrome en Android.')
    return null
  }
  const rec = new SpeechRecognition()
  rec.lang = 'es-PE'
  rec.continuous = false
  rec.interimResults = true
  let finalText = ''
  rec.onresult = (event) => {
    let live = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript
      if (event.results[i].isFinal) finalText += ` ${t}`
      else live += ` ${t}`
    }
    onResult?.((finalText + live).trim(), !!finalText)
  }
  rec.onerror = e => onError?.(e.error || 'No pude escuchar')
  rec.onend = () => onEnd?.(finalText.trim())
  rec.start()
  return rec
}
