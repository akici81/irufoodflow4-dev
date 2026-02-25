"use client";

import { useRef, useState } from "react";

type DersSatiri = {
  gun: string;
  saat_baslangic: string;
  saat_bitis: string;
  ders_kodu: string;
  ders_adi: string;
  derslik: string;
  ogretmen_adi: string;
  uzem: boolean;
};

const GUNLER = ["Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma"];
const GUNLER_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

const SAAT_BITIS: Record<string, string> = {
  "08:00": "08:50", "09:00": "09:50", "10:00": "10:50", "11:00": "11:50",
  "12:00": "12:50", "13:00": "13:50", "14:00": "14:50", "15:00": "15:50",
  "16:00": "16:50", "17:00": "17:50", "18:00": "18:50", "19:00": "19:50",
  "20:00": "20:50", "21:00": "21:50",
};

export default function ProgramOlusturPage() {
  const [dersler, setDersler] = useState<DersSatiri[]>([]);
  const [baslik, setBaslik] = useState("");
  const [yuklendi, setYuklendi] = useState(false);
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [indiriliyor, setIndiriliyor] = useState(false);
  const tabloRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tumSaatler = Array.from(new Set(dersler.map((d) => d.saat_baslangic))).sort();

  const getHucre = (saat: string, gun: string) =>
    dersler.filter((d) => d.saat_baslangic === saat && d.gun === gun);

  const handleDosyaYukle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHata("");
    setYukleniyor(true);
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];

      let bulunanBaslik = "";
      for (const row of rows.slice(0, 4)) {
        const val = row.find((c) => String(c).includes("SINIF") || String(c).includes("PROGRAM"));
        if (val) { bulunanBaslik = String(val).trim(); break; }
      }
      setBaslik(bulunanBaslik || file.name.replace(/\.[^/.]+$/, ""));

      const gunCols: Record<string, number> = {};
      for (const row of rows.slice(0, 10)) {
        row.forEach((cell, i) => {
          if (GUNLER_TR.includes(String(cell))) gunCols[String(cell)] = i;
        });
        if (Object.keys(gunCols).length > 0) break;
      }

      if (Object.keys(gunCols).length === 0) {
        setHata("Gun sutunlari bulunamadi.");
        setYukleniyor(false);
        return;
      }

      const sonuc: DersSatiri[] = [];
      for (const row of rows.slice(3)) {
        const saat = String(row[0] || "").trim();
        const m = saat.match(/^(\d{1,2})[.:]\d{2}/);
        if (!m) continue;
        const saat_baslangic = m[1].padStart(2, "0") + ":00";
        const saat_bitis = SAAT_BITIS[saat_baslangic] || "";
        for (const [gun, colIdx] of Object.entries(gunCols)) {
          const metin = String(row[colIdx] || "").trim();
          if (!metin) continue;
          const satirlar = metin.split("\n").map((s) => s.trim()).filter(Boolean);
          let ders_kodu = "";
          let ders_adi = "";
          let derslik = "";
          let ogretmen_adi = "";
          for (const s of satirlar) {
            const t = s.replace(/^["']+|["']+$/g, "").trim();
            const kodMatch = t.match(/^([A-Z]{2,4}\d{3})(.*)/);
            if (kodMatch) {
              ders_kodu = kodMatch[1];
              ders_adi = kodMatch[2].replace(/^[-\s]+/, "").trim();
            } else if (t.toLowerCase().includes("derslik") || /^[BC]\d/.test(t)) {
              derslik = t.replace(/derslik\s*:?\s*/i, "").trim();
            } else if (/ogr|ogretmen|hoca|dr\.|doc|prof/i.test(t) || t.includes("Gör.")) {
              ogretmen_adi = t;
            } else if (!ders_adi) {
              ders_adi = t;
            }
          }
          if (!ders_adi && !ders_kodu) continue;
          sonuc.push({
            gun,
            saat_baslangic,
            saat_bitis,
            ders_kodu,
            ders_adi: ders_adi.replace(/^[-\s]+|[-\s]+$/g, ""),
            derslik,
            ogretmen_adi,
            uzem: metin.toLowerCase().includes("uzem"),
          });
        }
      }

      if (sonuc.length === 0) {
        setHata("Ders bulunamadi. Excel dosyasini kontrol edin.");
        setYukleniyor(false);
        return;
      }
      setDersler(sonuc);
      setYuklendi(true);
    } catch {
      setHata("Dosya okunamadi.");
    }
    setYukleniyor(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleIndir = async (format: "jpeg" | "pdf") => {
    setIndiriliyor(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = tabloRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#f5f0eb", useCORS: true });
      if (format === "jpeg") {
        const link = document.createElement("a");
        link.download = "ders-programi.jpeg";
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
        const x = (pdfW - canvas.width * ratio) / 2;
        const y = (pdfH - canvas.height * ratio) / 2;
        pdf.addImage(imgData, "JPEG", x, y, canvas.width * ratio, canvas.height * ratio);
        pdf.save("ders-programi.pdf");
      }
    } catch {
      alert("Indirme sirasinda hata olustu.");
    }
    setIndiriliyor(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f5f0eb" }}>
      <div style={{ background: "#8B0000" }} className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-black text-sm">IRU</div>
          <div>
            <div className="text-white font-bold text-sm">Ders Programi Olusturucu</div>
            <div className="text-white/60 text-xs">IRU Meslek Yuksekokulu</div>
          </div>
        </div>
        {yuklendi && (
          <div className="flex gap-2">
            <button onClick={() => handleIndir("jpeg")} disabled={indiriliyor}
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50">
              JPEG Indir
            </button>
            <button onClick={() => handleIndir("pdf")} disabled={indiriliyor}
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50">
              PDF Indir
            </button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {!yuklendi ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center">
            <h2 className="text-xl font-bold text-zinc-800 mb-2">Excel Ders Programini Yukle</h2>
            <p className="text-zinc-500 text-sm mb-6">Excel dosyasini yukleyin, JPEG veya PDF olarak indirin.</p>
            <label className="inline-flex items-center gap-2 cursor-pointer text-white text-sm font-semibold px-8 py-3 rounded-xl"
              style={{ background: yukleniyor ? "#999" : "#B71C1C" }}>
              {yukleniyor ? "Yukleniyor..." : "Excel Dosyasi Sec (.xlsx)"}
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleDosyaYukle} />
            </label>
            {hata && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-md mx-auto">{hata}</div>
            )}
            <div className="mt-6 text-xs text-zinc-400">
              <p>Giris yapmaniza gerek yok &bull; Verileriniz kaydedilmez</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-zinc-800">{dersler.length} ders yuklendi</div>
                <div className="text-xs text-zinc-400">{baslik}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setYuklendi(false); setDersler([]); }}
                  className="border border-zinc-300 text-zinc-600 text-sm px-4 py-2 rounded-xl hover:bg-zinc-50">
                  Yeni Dosya
                </button>
                <button onClick={() => handleIndir("jpeg")} disabled={indiriliyor}
                  className="text-white text-sm font-semibold px-5 py-2 rounded-xl disabled:opacity-50"
                  style={{ background: "#B71C1C" }}>
                  JPEG
                </button>
                <button onClick={() => handleIndir("pdf")} disabled={indiriliyor}
                  className="bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-xl disabled:opacity-50">
                  PDF
                </button>
              </div>
            </div>

            <div ref={tabloRef} style={{ background: "#f5f0eb", padding: "24px", borderRadius: "16px" }}>
              <div style={{ background: "#8B0000", borderRadius: "12px 12px 0 0", padding: "18px 24px", textAlign: "center" }}>
                <div style={{ color: "white", fontSize: "16px", fontWeight: 900, textTransform: "uppercase" }}>{baslik}</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "white", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "80px" }} />
                  {GUNLER_TR.map((g) => <col key={g} style={{ width: "18%" }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ background: "#6d0000", color: "white", padding: "10px 6px", fontSize: "11px", textAlign: "center", border: "1px solid #7a0000" }}>Saat</th>
                    {GUNLER_TR.map((g) => (
                      <th key={g} style={{ background: "#8B0000", color: "white", padding: "10px 6px", fontSize: "12px", textAlign: "center", border: "1px solid #7a0000" }}>{g}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tumSaatler.map((saat, idx) => (
                    <tr key={saat} style={{ background: idx % 2 === 0 ? "#fff" : "#fdf8f5" }}>
                      <td style={{ background: "#8B0000", color: "white", fontWeight: 700, fontSize: "11px", textAlign: "center", padding: "8px 4px", border: "1px solid #e8ddd5" }}>
                        {saat}<br />{SAAT_BITIS[saat] || ""}
                      </td>
                      {GUNLER_TR.map((gun) => (
                        <td key={gun} style={{ border: "1px solid #e8ddd5", verticalAlign: "middle", textAlign: "center", padding: "6px 4px" }}>
                          {getHucre(saat, gun).map((d, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "2px 0" }}>
                              {d.ders_kodu && <span style={{ fontSize: "9px", fontWeight: 700, color: "#8B0000" }}>{d.ders_kodu}</span>}
                              <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3 }}>{d.ders_adi}</span>
                              {d.derslik && !d.uzem && <span style={{ fontSize: "9.5px", color: "#6b7280", background: "#f3f4f6", padding: "1px 6px", borderRadius: "10px" }}>{d.derslik}</span>}
                              {d.uzem && <span style={{ fontSize: "9px", fontWeight: 700, color: "#856404", background: "#fff3cd", padding: "1px 6px", borderRadius: "8px" }}>UZEM</span>}
                              {d.ogretmen_adi && <span style={{ fontSize: "9px", color: "#9ca3af", fontStyle: "italic" }}>{d.ogretmen_adi}</span>}
                            </div>
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

