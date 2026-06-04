import { useState, useEffect, useCallback } from "react";

const EVENTOS = [
  { id: "teta", label: "Teta", emoji: "🤱", color: "#f9a8d4", bg: "#fdf2f8" },
  { id: "biberon", label: "Biberón", emoji: "🍼", color: "#93c5fd", bg: "#eff6ff" },
  { id: "pañal_mojado", label: "Pañal mojado", emoji: "💧", color: "#6ee7b7", bg: "#f0fdf4" },
  { id: "pañal_caca", label: "Pañal caca", emoji: "💩", color: "#fcd34d", bg: "#fefce8" },
  { id: "siesta_inicio", label: "Siesta inicio", emoji: "😴", color: "#c4b5fd", bg: "#faf5ff" },
  { id: "siesta_fin", label: "Siesta fin", emoji: "🌤️", color: "#a5b4fc", bg: "#eef2ff" },
  { id: "llanto", label: "Llanto", emoji: "😢", color: "#fca5a5", bg: "#fef2f2" },
  { id: "nota", label: "Nota", emoji: "📝", color: "#d1d5db", bg: "#f9fafb" },
];

const pad = (n) => String(n).padStart(2, "0");
const getNow = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const getToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const formatFecha = (iso) => { const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; };
const formatFechaCorta = (iso) => { const [,m,d] = iso.split("-"); return `${d}/${m}`; };

const STORAGE_KEY = "beba-registros-v1";

export default function App() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [hora, setHora] = useState(getNow());
  const [detalle, setDetalle] = useState("");
  const [vista, setVista] = useState("registrar");
  const [fechaFiltro, setFechaFiltro] = useState(getToday());
  const [saving, setSaving] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Cargar desde storage compartido
  const cargarRegistros = useCallback(async () => {
    try {
      const result = await window.storage.get(STORAGE_KEY, true);
      if (result && result.value) {
        setRegistros(JSON.parse(result.value));
      }
      setLastSync(new Date());
    } catch {
      // No hay datos aún, empezamos vacíos
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarRegistros();
    // Sincronizar cada 30 segundos automáticamente
    const interval = setInterval(cargarRegistros, 30000);
    return () => clearInterval(interval);
  }, [cargarRegistros]);

  const guardarEnStorage = async (nuevosRegistros) => {
    setSaving(true);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(nuevosRegistros), true);
      setLastSync(new Date());
    } catch (e) {
      console.error("Error guardando:", e);
    } finally {
      setSaving(false);
    }
  };

  const abrirModal = (tipo) => {
    setHora(getNow());
    setDetalle("");
    setModal(tipo);
  };

  const guardar = async () => {
    if (!modal) return;
    const nuevo = {
      id: Date.now(),
      tipo: modal,
      hora,
      detalle: detalle.trim(),
      fecha: getToday(),
    };
    const actualizados = [nuevo, ...registros];
    setRegistros(actualizados);
    await guardarEnStorage(actualizados);
    setModal(null);
  };

  const eliminar = async (id) => {
    const actualizados = registros.filter((r) => r.id !== id);
    setRegistros(actualizados);
    await guardarEnStorage(actualizados);
  };

  const exportarCSV = () => {
    const deHoy = registros.filter((r) => r.fecha === fechaFiltro);
    const header = "Fecha,Hora,Evento,Detalle\n";
    const rows = deHoy.map((r) => {
      const ev = EVENTOS.find(e => e.id === r.tipo);
      return `${formatFecha(r.fecha)},${r.hora},"${ev?.label || r.tipo}","${r.detalle || ""}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registro-beba-${fechaFiltro}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarTexto = () => {
    const deHoy = registros.filter((r) => r.fecha === fechaFiltro);
    const lineas = deHoy.map((r) => {
      const ev = EVENTOS.find(e => e.id === r.tipo);
      return `${r.hora} - ${ev?.emoji} ${ev?.label}${r.detalle ? `: ${r.detalle}` : ""}`;
    }).join("\n");
    const texto = `Registro bebé - ${formatFecha(fechaFiltro)}\n${"─".repeat(30)}\n${lineas}`;
    navigator.clipboard?.writeText(texto).catch(() => {});
    alert("📋 Copiado al portapapeles");
  };

  const evento = (id) => EVENTOS.find((e) => e.id === id);

  const registrosDelDia = registros.filter((r) => r.fecha === fechaFiltro);

  const resumen = () => {
    const d = registrosDelDia;
    return {
      teta: d.filter(r => r.tipo === "teta").length,
      biberon: d.filter(r => r.tipo === "biberon").length,
      pañal_mojado: d.filter(r => r.tipo === "pañal_mojado").length,
      pañal_caca: d.filter(r => r.tipo === "pañal_caca").length,
      siestas: d.filter(r => r.tipo === "siesta_inicio").length,
    };
  };

  // Fechas únicas disponibles
  const fechasDisponibles = [...new Set(registros.map(r => r.fecha))].sort().reverse();
  if (!fechasDisponibles.includes(getToday())) fechasDisponibles.unshift(getToday());

  const res = resumen();

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#fdf6f0", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize: 40 }}>👶</div>
      <div style={{ fontFamily:"Georgia,serif", color:"#9ca3af", fontSize:14 }}>Cargando registros...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#fdf6f0", fontFamily:"Georgia,serif", maxWidth:440, margin:"0 auto", paddingBottom:80 }}>

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"2px solid #f9a8d4", padding:"16px 20px 12px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, color:"#9ca3af", letterSpacing:2, textTransform:"uppercase" }}>Registro compartido</div>
            <div style={{ fontSize:22, fontWeight:"bold", color:"#1f2937", marginTop:2 }}>👶 Bebé</div>
          </div>
          <div style={{ textAlign:"right" }}>
            {saving
              ? <div style={{ fontSize:11, color:"#db2777" }}>⏳ Guardando...</div>
              : lastSync
                ? <div style={{ fontSize:11, color:"#6ee7b7" }}>✓ Sincronizado</div>
                : null
            }
            <button onClick={cargarRegistros} style={{ marginTop:4, background:"none", border:"1px solid #fbcfe8", borderRadius:8, padding:"4px 10px", fontSize:11, color:"#db2777", cursor:"pointer", fontFamily:"Georgia,serif" }}>
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
          {[
            { label:"Tetas", val: res.teta, emoji:"🤱" },
            { label:"Pañales", val: res.pañal_mojado, emoji:"💧" },
            { label:"Cacas", val: res.pañal_caca, emoji:"💩" },
            { label:"Siestas", val: res.siestas, emoji:"😴" },
          ].map(s => (
            <div key={s.label} style={{ background:"#fdf2f8", border:"1px solid #fbcfe8", borderRadius:10, padding:"4px 10px", fontSize:13, color:"#6b7280" }}>
              {s.emoji} <strong style={{ color:"#db2777" }}>{s.val}</strong> {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid #e5e7eb", background:"#fff" }}>
        {[
          { id:"registrar", label:"➕ Registrar" },
          { id:"historial", label:"📋 Historial" },
          { id:"exportar", label:"📤 Exportar" },
        ].map(v => (
          <button key={v.id} onClick={() => setVista(v.id)} style={{
            flex:1, padding:"12px 0", border:"none", background:"none",
            fontFamily:"Georgia,serif", fontSize:12, cursor:"pointer",
            color: vista===v.id ? "#db2777" : "#9ca3af",
            borderBottom: vista===v.id ? "2px solid #db2777" : "2px solid transparent",
            fontWeight: vista===v.id ? "bold" : "normal",
          }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Vista: Registrar */}
      {vista === "registrar" && (
        <div style={{ padding:20 }}>
          <div style={{ fontSize:12, color:"#9ca3af", marginBottom:14, letterSpacing:1, textTransform:"uppercase" }}>¿Qué pasó?</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {EVENTOS.map(ev => (
              <button key={ev.id} onClick={() => abrirModal(ev.id)} style={{
                background:"#fff", border:`2px solid ${ev.color}`, borderRadius:16,
                padding:"18px 12px", cursor:"pointer", display:"flex", flexDirection:"column",
                alignItems:"center", gap:6, boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
                transition:"transform 0.1s",
              }}
              onMouseDown={e => e.currentTarget.style.transform="scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform="scale(1)"}
              onTouchStart={e => e.currentTarget.style.transform="scale(0.95)"}
              onTouchEnd={e => e.currentTarget.style.transform="scale(1)"}
              >
                <span style={{ fontSize:28 }}>{ev.emoji}</span>
                <span style={{ fontSize:13, color:"#374151", fontWeight:"bold", textAlign:"center" }}>{ev.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vista: Historial */}
      {vista === "historial" && (
        <div style={{ padding:20 }}>
          {/* Selector de fecha */}
          <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
            {fechasDisponibles.slice(0,7).map(f => (
              <button key={f} onClick={() => setFechaFiltro(f)} style={{
                flexShrink:0, padding:"6px 14px",
                background: fechaFiltro===f ? "#db2777" : "#fff",
                color: fechaFiltro===f ? "#fff" : "#6b7280",
                border: `1.5px solid ${fechaFiltro===f ? "#db2777" : "#e5e7eb"}`,
                borderRadius:20, fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif",
                fontWeight: fechaFiltro===f ? "bold" : "normal",
              }}>
                {f === getToday() ? "Hoy" : formatFechaCorta(f)}
              </button>
            ))}
          </div>

          {registrosDelDia.length === 0 ? (
            <div style={{ textAlign:"center", color:"#9ca3af", padding:"50px 20px", fontSize:15 }}>
              Sin registros para este día.<br /><span style={{ fontSize:30 }}>📒</span>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {registrosDelDia.map(r => {
                const ev = evento(r.tipo);
                return (
                  <div key={r.id} style={{
                    background:"#fff", border:`1.5px solid ${ev?.color || "#e5e7eb"}`,
                    borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:12,
                  }}>
                    <span style={{ fontSize:24 }}>{ev?.emoji}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:"bold", color:"#1f2937", fontSize:14 }}>{ev?.label}</div>
                      {r.detalle ? <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{r.detalle}</div> : null}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:"bold", color:"#db2777" }}>{r.hora}</div>
                    </div>
                    <button onClick={() => eliminar(r.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#d1d5db", fontSize:16, padding:"0 2px" }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vista: Exportar */}
      {vista === "exportar" && (
        <div style={{ padding:20 }}>
          <div style={{ fontSize:12, color:"#9ca3af", marginBottom:16, letterSpacing:1, textTransform:"uppercase" }}>Seleccioná el día a exportar</div>

          <div style={{ display:"flex", gap:8, marginBottom:24, overflowX:"auto", paddingBottom:4 }}>
            {fechasDisponibles.slice(0,7).map(f => (
              <button key={f} onClick={() => setFechaFiltro(f)} style={{
                flexShrink:0, padding:"6px 14px",
                background: fechaFiltro===f ? "#db2777" : "#fff",
                color: fechaFiltro===f ? "#fff" : "#6b7280",
                border:`1.5px solid ${fechaFiltro===f ? "#db2777" : "#e5e7eb"}`,
                borderRadius:20, fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif",
                fontWeight: fechaFiltro===f ? "bold" : "normal",
              }}>
                {f === getToday() ? "Hoy" : formatFechaCorta(f)}
              </button>
            ))}
          </div>

          <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:20, marginBottom:14 }}>
            <div style={{ fontSize:14, color:"#374151", fontWeight:"bold", marginBottom:4 }}>
              📋 Copiar como texto
            </div>
            <div style={{ fontSize:13, color:"#9ca3af", marginBottom:14 }}>
              Ideal para pegar en WhatsApp o compartir por mensaje.
            </div>
            <button onClick={exportarTexto} style={{
              width:"100%", padding:"14px", background:"#fdf2f8",
              color:"#db2777", border:"2px solid #fbcfe8", borderRadius:12,
              fontSize:15, fontFamily:"Georgia,serif", fontWeight:"bold", cursor:"pointer",
            }}>
              Copiar al portapapeles
            </button>
          </div>

          <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:20 }}>
            <div style={{ fontSize:14, color:"#374151", fontWeight:"bold", marginBottom:4 }}>
              📊 Exportar como CSV
            </div>
            <div style={{ fontSize:13, color:"#9ca3af", marginBottom:14 }}>
              Para abrir en Excel o Google Sheets y llevar al pediatra.
            </div>
            <button onClick={exportarCSV} style={{
              width:"100%", padding:"14px", background:"#f0fdf4",
              color:"#16a34a", border:"2px solid #86efac", borderRadius:12,
              fontSize:15, fontFamily:"Georgia,serif", fontWeight:"bold", cursor:"pointer",
            }}>
              Descargar CSV
            </button>
          </div>

          <div style={{ marginTop:20, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"12px 16px", fontSize:13, color:"#92400e" }}>
            ℹ️ Los registros se guardan automáticamente y se comparten entre todos los dispositivos que usen esta app.
          </div>
        </div>
      )}

      {/* Modal de registro */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"flex-end", zIndex:50 }}
          onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:"24px 24px 0 0", padding:"28px 24px 44px", width:"100%", maxWidth:440, margin:"0 auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width:36, height:4, background:"#e5e7eb", borderRadius:2, margin:"0 auto 20px" }} />
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <span style={{ fontSize:38 }}>{evento(modal)?.emoji}</span>
              <div style={{ fontSize:18, fontWeight:"bold", color:"#1f2937", marginTop:6 }}>{evento(modal)?.label}</div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:"#9ca3af", letterSpacing:1, textTransform:"uppercase" }}>Hora</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{
                display:"block", width:"100%", marginTop:6, padding:"12px 14px",
                border:"2px solid #fbcfe8", borderRadius:12, fontSize:20,
                fontFamily:"Georgia,serif", color:"#1f2937", background:"#fdf2f8", boxSizing:"border-box",
              }} />
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:11, color:"#9ca3af", letterSpacing:1, textTransform:"uppercase" }}>Detalle (opcional)</label>
              <textarea value={detalle} onChange={e => setDetalle(e.target.value)}
                placeholder="Ej: pañal muy cargado, lloró antes..."
                rows={2} style={{
                  display:"block", width:"100%", marginTop:6, padding:"12px 14px",
                  border:"2px solid #e5e7eb", borderRadius:12, fontSize:14,
                  fontFamily:"Georgia,serif", resize:"none", color:"#374151", boxSizing:"border-box",
                }} />
            </div>

            <button onClick={guardar} disabled={saving} style={{
              width:"100%", padding:"16px", background: saving ? "#f9a8d4" : "#db2777",
              color:"#fff", border:"none", borderRadius:16, fontSize:16,
              fontFamily:"Georgia,serif", fontWeight:"bold", cursor: saving ? "default" : "pointer",
            }}>
              {saving ? "Guardando..." : "Guardar registro"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
