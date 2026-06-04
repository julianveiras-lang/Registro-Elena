import { useState, useEffect, useCallback } from "react";

const EVENTOS = [
  { id: "teta", label: "Teta", emoji: "🤱", color: "#f9a8d4", bg: "#fdf2f8" },
  { id: "biberon", label: "Biberón", emoji: "🍼", color: "#93c5fd", bg: "#eff6ff" },
  { id: "panal_mojado", label: "Pañal mojado", emoji: "💧", color: "#6ee7b7", bg: "#f0fdf4" },
  { id: "panal_caca", label: "Pañal caca", emoji: "💩", color: "#fcd34d", bg: "#fefce8" },
  { id: "siesta_inicio", label: "Siesta inicio", emoji: "😴", color: "#c4b5fd", bg: "#faf5ff" },
  { id: "siesta_fin", label: "Siesta fin", emoji: "🌤️", color: "#a5b4fc", bg: "#eef2ff" },
  { id: "llanto", label: "Llanto", emoji: "😢", color: "#fca5a5", bg: "#fef2f2" },
  { id: "nota", label: "Nota", emoji: "📝", color: "#d1d5db", bg: "#f9fafb" },
];

const STORAGE_KEY = "registro-beba-v1";
const SYNC_URL = "https://kvdb.io/PutYourBucketHere/registros";

const pad = (n) => String(n).padStart(2, "0");
const getNow = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const getToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const formatFechaCorta = (iso) => { const [,m,d] = iso.split("-"); return `${d}/${m}`; };
const formatFecha = (iso) => { const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; };

export default function App() {
  const [registros, setRegistros] = useState([]);
  const [modal, setModal] = useState(null);
  const [hora, setHora] = useState(getNow());
  const [detalle, setDetalle] = useState("");
  const [vista, setVista] = useState("registrar");
  const [fechaFiltro, setFechaFiltro] = useState(getToday());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Cargar desde localStorage al inicio
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) setRegistros(JSON.parse(guardado));
    } catch {}
  }, []);

  const guardarLocal = useCallback((nuevos) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
    } catch {}
  }, []);

  const abrirModal = (tipo) => {
    setHora(getNow());
    setDetalle("");
    setModal(tipo);
  };

  const guardar = () => {
    if (!modal) return;
    setSaving(true);
    const nuevo = {
      id: Date.now(),
      tipo: modal,
      hora,
      detalle: detalle.trim(),
      fecha: getToday(),
    };
    const actualizados = [nuevo, ...registros];
    setRegistros(actualizados);
    guardarLocal(actualizados);
    setSaving(false);
    setModal(null);
  };

  const eliminar = (id) => {
    const actualizados = registros.filter((r) => r.id !== id);
    setRegistros(actualizados);
    guardarLocal(actualizados);
    setConfirmDelete(null);
  };

  const exportarTexto = () => {
    const deHoy = registros.filter((r) => r.fecha === fechaFiltro);
    const lineas = deHoy.map((r) => {
      const ev = EVENTOS.find(e => e.id === r.tipo);
      return `${r.hora} - ${ev?.emoji} ${ev?.label}${r.detalle ? `: ${r.detalle}` : ""}`;
    }).join("\n");
    const texto = `Registro bebé - ${formatFecha(fechaFiltro)}\n${"─".repeat(30)}\n${lineas}`;
    navigator.clipboard?.writeText(texto).then(() => alert("📋 ¡Copiado! Pegalo en WhatsApp")).catch(() => alert(texto));
  };

  const exportarCSV = () => {
    const deHoy = registros.filter((r) => r.fecha === fechaFiltro);
    const header = "Fecha,Hora,Evento,Detalle\n";
    const rows = deHoy.map((r) => {
      const ev = EVENTOS.find(e => e.id === r.tipo);
      return `${formatFecha(r.fecha)},${r.hora},"${ev?.label || r.tipo}","${r.detalle || ""}"`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registro-beba-${fechaFiltro}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const evento = (id) => EVENTOS.find((e) => e.id === id);
  const registrosDelDia = registros.filter((r) => r.fecha === fechaFiltro);
  const fechasDisponibles = [...new Set(registros.map(r => r.fecha))].sort().reverse();
  if (!fechasDisponibles.includes(getToday())) fechasDisponibles.unshift(getToday());

  const res = {
    teta: registrosDelDia.filter(r => r.tipo === "teta").length,
    biberon: registrosDelDia.filter(r => r.tipo === "biberon").length,
    panal_mojado: registrosDelDia.filter(r => r.tipo === "panal_mojado").length,
    panal_caca: registrosDelDia.filter(r => r.tipo === "panal_caca").length,
    siestas: registrosDelDia.filter(r => r.tipo === "siesta_inicio").length,
  };

  const s = {
    app: { minHeight:"100vh", background:"#fdf6f0", fontFamily:"Georgia,serif", maxWidth:440, margin:"0 auto", paddingBottom:80 },
    header: { background:"#fff", borderBottom:"2px solid #f9a8d4", padding:"16px 20px 12px", position:"sticky", top:0, zIndex:10 },
    tag: { background:"#fdf2f8", border:"1px solid #fbcfe8", borderRadius:10, padding:"4px 10px", fontSize:13, color:"#6b7280" },
    tabBtn: (activo) => ({ flex:1, padding:"12px 0", border:"none", background:"none", fontFamily:"Georgia,serif", fontSize:12, cursor:"pointer", color: activo ? "#db2777" : "#9ca3af", borderBottom: activo ? "2px solid #db2777" : "2px solid transparent", fontWeight: activo ? "bold" : "normal" }),
    eventoBtn: (color) => ({ background:"#fff", border:`2px solid ${color}`, borderRadius:16, padding:"18px 12px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }),
    fechaBtn: (activo) => ({ flexShrink:0, padding:"6px 14px", background: activo ? "#db2777" : "#fff", color: activo ? "#fff" : "#6b7280", border:`1.5px solid ${activo ? "#db2777" : "#e5e7eb"}`, borderRadius:20, fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif", fontWeight: activo ? "bold" : "normal" }),
    registro: (color) => ({ background:"#fff", border:`1.5px solid ${color}`, borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }),
    modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"flex-end", zIndex:50 },
    modalBox: { background:"#fff", borderRadius:"24px 24px 0 0", padding:"28px 24px 44px", width:"100%", maxWidth:440, margin:"0 auto" },
    input: { display:"block", width:"100%", marginTop:6, padding:"12px 14px", border:"2px solid #fbcfe8", borderRadius:12, fontSize:20, fontFamily:"Georgia,serif", color:"#1f2937", background:"#fdf2f8", boxSizing:"border-box" },
    textarea: { display:"block", width:"100%", marginTop:6, padding:"12px 14px", border:"2px solid #e5e7eb", borderRadius:12, fontSize:14, fontFamily:"Georgia,serif", resize:"none", color:"#374151", boxSizing:"border-box" },
    btnPrincipal: (disabled) => ({ width:"100%", padding:"16px", background: disabled ? "#f9a8d4" : "#db2777", color:"#fff", border:"none", borderRadius:16, fontSize:16, fontFamily:"Georgia,serif", fontWeight:"bold", cursor: disabled ? "default" : "pointer" }),
    exportCard: { background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:20, marginBottom:14 },
  };

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, color:"#9ca3af", letterSpacing:2, textTransform:"uppercase" }}>Registro diario</div>
            <div style={{ fontSize:22, fontWeight:"bold", color:"#1f2937", marginTop:2 }}>👶 Elena</div>
          </div>
          <div style={{ fontSize:12, color:"#9ca3af", textAlign:"right", paddingTop:4 }}>
            {formatFecha(getToday())}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
          {[
            { label:"Tetas", val: res.teta, emoji:"🤱" },
            { label:"Pañales", val: res.panal_mojado, emoji:"💧" },
            { label:"Cacas", val: res.panal_caca, emoji:"💩" },
            { label:"Siestas", val: res.siestas, emoji:"😴" },
          ].map(s2 => (
            <div key={s2.label} style={s.tag}>
              {s2.emoji} <strong style={{ color:"#db2777" }}>{s2.val}</strong> {s2.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid #e5e7eb", background:"#fff" }}>
        {[{ id:"registrar", label:"➕ Registrar" }, { id:"historial", label:"📋 Historial" }, { id:"exportar", label:"📤 Exportar" }].map(v => (
          <button key={v.id} onClick={() => setVista(v.id)} style={s.tabBtn(vista===v.id)}>{v.label}</button>
        ))}
      </div>

      {/* Registrar */}
      {vista === "registrar" && (
        <div style={{ padding:20 }}>
          <div style={{ fontSize:12, color:"#9ca3af", marginBottom:14, letterSpacing:1, textTransform:"uppercase" }}>¿Qué pasó?</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {EVENTOS.map(ev => (
              <button key={ev.id} onClick={() => abrirModal(ev.id)} style={s.eventoBtn(ev.color)}>
                <span style={{ fontSize:28 }}>{ev.emoji}</span>
                <span style={{ fontSize:13, color:"#374151", fontWeight:"bold", textAlign:"center" }}>{ev.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {vista === "historial" && (
        <div style={{ padding:20 }}>
          <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
            {fechasDisponibles.slice(0,7).map(f => (
              <button key={f} onClick={() => setFechaFiltro(f)} style={s.fechaBtn(fechaFiltro===f)}>
                {f === getToday() ? "Hoy" : formatFechaCorta(f)}
              </button>
            ))}
          </div>
          {registrosDelDia.length === 0
            ? <div style={{ textAlign:"center", color:"#9ca3af", padding:"50px 20px", fontSize:15 }}>Sin registros.<br /><span style={{ fontSize:30 }}>📒</span></div>
            : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {registrosDelDia.map(r => {
                  const ev = evento(r.tipo);
                  return (
                    <div key={r.id} style={s.registro(ev?.color || "#e5e7eb")}>
                      <span style={{ fontSize:24 }}>{ev?.emoji}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:"bold", color:"#1f2937", fontSize:14 }}>{ev?.label}</div>
                        {r.detalle ? <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{r.detalle}</div> : null}
                      </div>
                      <div style={{ fontSize:16, fontWeight:"bold", color:"#db2777", flexShrink:0 }}>{r.hora}</div>
                      <button onClick={() => setConfirmDelete(r.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#d1d5db", fontSize:16 }}>✕</button>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* Exportar */}
      {vista === "exportar" && (
        <div style={{ padding:20 }}>
          <div style={{ fontSize:12, color:"#9ca3af", marginBottom:16, letterSpacing:1, textTransform:"uppercase" }}>Seleccioná el día</div>
          <div style={{ display:"flex", gap:8, marginBottom:24, overflowX:"auto", paddingBottom:4 }}>
            {fechasDisponibles.slice(0,7).map(f => (
              <button key={f} onClick={() => setFechaFiltro(f)} style={s.fechaBtn(fechaFiltro===f)}>
                {f === getToday() ? "Hoy" : formatFechaCorta(f)}
              </button>
            ))}
          </div>
          <div style={s.exportCard}>
            <div style={{ fontSize:14, color:"#374151", fontWeight:"bold", marginBottom:4 }}>📋 Copiar como texto</div>
            <div style={{ fontSize:13, color:"#9ca3af", marginBottom:14 }}>Para pegar en WhatsApp o mandar por mensaje.</div>
            <button onClick={exportarTexto} style={{ width:"100%", padding:"14px", background:"#fdf2f8", color:"#db2777", border:"2px solid #fbcfe8", borderRadius:12, fontSize:15, fontFamily:"Georgia,serif", fontWeight:"bold", cursor:"pointer" }}>
              Copiar al portapapeles
            </button>
          </div>
          <div style={s.exportCard}>
            <div style={{ fontSize:14, color:"#374151", fontWeight:"bold", marginBottom:4 }}>📊 Exportar CSV</div>
            <div style={{ fontSize:13, color:"#9ca3af", marginBottom:14 }}>Para abrir en Excel y llevar al pediatra.</div>
            <button onClick={exportarCSV} style={{ width:"100%", padding:"14px", background:"#f0fdf4", color:"#16a34a", border:"2px solid #86efac", borderRadius:12, fontSize:15, fontFamily:"Georgia,serif", fontWeight:"bold", cursor:"pointer" }}>
              Descargar CSV
            </button>
          </div>
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"12px 16px", fontSize:13, color:"#92400e" }}>
            ℹ️ Los datos se guardan en el dispositivo. Usá "Copiar texto" para sincronizar con tu pareja por WhatsApp.
          </div>
        </div>
      )}

      {/* Modal registro */}
      {modal && (
        <div style={s.modalOverlay} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ width:36, height:4, background:"#e5e7eb", borderRadius:2, margin:"0 auto 20px" }} />
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <span style={{ fontSize:38 }}>{evento(modal)?.emoji}</span>
              <div style={{ fontSize:18, fontWeight:"bold", color:"#1f2937", marginTop:6 }}>{evento(modal)?.label}</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:"#9ca3af", letterSpacing:1, textTransform:"uppercase" }}>Hora</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={s.input} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:11, color:"#9ca3af", letterSpacing:1, textTransform:"uppercase" }}>Detalle (opcional)</label>
              <textarea value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Ej: pañal muy cargado, lloró antes..." rows={2} style={s.textarea} />
            </div>
            <button onClick={guardar} disabled={saving} style={s.btnPrincipal(saving)}>
              {saving ? "Guardando..." : "Guardar registro"}
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={s.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...s.modalBox, padding:"24px" }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <span style={{ fontSize:32 }}>🗑️</span>
              <div style={{ fontSize:16, fontWeight:"bold", color:"#1f2937", marginTop:8 }}>¿Eliminás este registro?</div>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex:1, padding:"14px", background:"#f3f4f6", color:"#374151", border:"none", borderRadius:12, fontSize:15, fontFamily:"Georgia,serif", cursor:"pointer" }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDelete)} style={{ flex:1, padding:"14px", background:"#ef4444", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontFamily:"Georgia,serif", fontWeight:"bold", cursor:"pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
