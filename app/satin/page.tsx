"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type SiparisUrun = { urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type Siparis = { id: string; ogretmenAdi: string; dersAdi: string; hafta: string; urunler: SiparisUrun[]; genelToplam: number };
type OzetSatir = {
  urunAdi: string; marka: string; olcu: string;
  listeMiktar: number; depodaMiktar: number; satinAlinacak: number;
  toplamTutar: number; birimFiyat: number;
  urunId: string | null; dususYapildi: boolean; kategori: string;
};

export default function SatinAlmaPage() {
  const { yetkili, yukleniyor } = useAuth("/satin");

  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [stokMap, setStokMap] = useState<Record<string, { id: string; stok: number; kategori: string }>>({});
  const [satirlar, setSatirlar] = useState<OzetSatir[]>([]);
  const [secilenHafta, setSecilenHafta] = useState("tumu");
  const [secilenDers, setSecilenDers] = useState("tumu");
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);

  const fetchData = async () => {
    const [{ data: sipData }, { data: urunData }] = await Promise.all([
      supabase.from("siparisler").select("*"),
      supabase.from("urunler").select("id, urun_adi, marka, stok, kategori"),
    ]);
    setSiparisler((sipData || []).map((s: any) => ({
      id: s.id, ogretmenAdi: s.ogretmen_adi, dersAdi: s.ders_adi,
      hafta: s.hafta, urunler: s.urunler || [], genelToplam: s.genel_toplam,
    })));
    const map: Record<string, { id: string; stok: number; kategori: string }> = {};
    (urunData || []).forEach((u: any) => {
      const key = `${u.urun_adi}__${u.marka || ""}`;
      map[key] = { id: u.id, stok: u.stok ?? 0, kategori: u.kategori || "Diger" };
    });
    setStokMap(map);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const filtrelenmis = siparisler.filter((s) =>
      (secilenHafta === "tumu" || s.hafta === secilenHafta) &&
      (secilenDers === "tumu" || s.dersAdi === secilenDers)
    );
    const ozet: Record<string, OzetSatir> = {};
    filtrelenmis.forEach((s) => {
      s.urunler.forEach((u) => {
        const key = `${u.urunAdi}__${u.marka || ""}__${u.olcu}`;
        const stokKey = `${u.urunAdi}__${u.marka || ""}`;
        const stokBilgi = stokMap[stokKey];
        if (!ozet[key]) {
          ozet[key] = {
            urunAdi: u.urunAdi, marka: u.marka, olcu: u.olcu,
            birimFiyat: u.birimFiyat, listeMiktar: 0, toplamTutar: 0,
            depodaMiktar: stokBilgi?.stok ?? 0,
            satinAlinacak: 0,
            urunId: stokBilgi?.id || null,
            dususYapildi: false,
            kategori: stokBilgi?.kategori || "Diger",
          };
        }
        ozet[key].listeMiktar += Number(u.miktar);
        ozet[key].toplamTutar += Number(u.toplam);
      });
    });
    Object.values(ozet).forEach((s) => {
      s.satinAlinacak = Math.max(0, s.listeMiktar - s.depodaMiktar);
    });
    setSatirlar(Object.values(ozet).sort((a, b) => {
      const kCmp = (a.kategori || "").localeCompare(b.kategori || "", "tr");
      return kCmp !== 0 ? kCmp : a.urunAdi.localeCompare(b.urunAdi, "tr");
    }));
  }, [siparisler, stokMap, secilenHafta, secilenDers]);

  if (yukleniyor) return (
    <DashboardLayout title="Satın Alma Paneli">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
      </div>
    </DashboardLayout>
  );
  if (!yetkili) return null;

  const bildir = (tip: "basari" | "hata", metin: string) => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 3500);
  };

  const haftalar = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.hafta))).sort()];
  const dersler = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.dersAdi))).sort()];

  const handleStokDus = async (satir: OzetSatir, idx: number) => {
    if (!satir.urunId) { bildir("hata", `"${satir.urunAdi}" ürünü veritabanında bulunamadı.`); return; }
    if (satir.depodaMiktar <= 0) { bildir("hata", "Depoda bu ürünün stoğu zaten sıfır."); return; }
    const { error } = await supabase.from("urunler").update({ stok: 0 }).eq("id", satir.urunId);
    if (error) { bildir("hata", "Stok güncellenemedi: " + error.message); return; }
    bildir("basari", `"${satir.urunAdi}": depodaki ${satir.depodaMiktar} ${satir.olcu} stoktan düşüldü.`);
    setStokMap((prev) => {
      const key = `${satir.urunAdi}__${satir.marka || ""}`;
      return { ...prev, [key]: { id: satir.urunId!, stok: 0, kategori: satir.kategori } };
    });
    setSatirlar((prev) => prev.map((s, i) =>
      i === idx ? { ...s, dususYapildi: true, depodaMiktar: 0, satinAlinacak: s.listeMiktar } : s
    ));
  };

  const genelToplam = satirlar.reduce((acc, u) => acc + u.toplamTutar, 0);
  const satinAlinacakToplam = satirlar.reduce((acc, u) => acc + (u.birimFiyat * u.satinAlinacak), 0);

  const handlePdf = () => {
    if (satirlar.length === 0) return;
    const gruplar: Record<string, OzetSatir[]> = {};
    satirlar.forEach((u) => {
      const kat = u.kategori || "Diger";
      if (!gruplar[kat]) gruplar[kat] = [];
      gruplar[kat].push(u);
    });
    const baslik = secilenHafta === "tumu" ? "Tum Haftalar" : secilenHafta;
    const ders = secilenDers === "tumu" ? "Tum Dersler" : secilenDers;
    const tarih = new Date().toLocaleDateString("tr-TR");
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h1{font-size:14px;color:#8B0000;border-bottom:2px solid #8B0000;padding-bottom:6px}.meta{font-size:10px;color:#666;margin-bottom:16px}.kat{background:#f3f4f6;font-size:10px;font-weight:bold;padding:6px 8px;margin-top:14px;border-left:3px solid #8B0000}table{width:100%;border-collapse:collapse}th{background:#8B0000;color:white;padding:5px 8px;font-size:10px;text-align:left}td{padding:5px 8px;border-bottom:1px solid #eee;font-size:10px}.footer{margin-top:20px;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:6px}</style></head><body>`;
    html += `<h1>Satin Alma Listesi — ${baslik}</h1><div class="meta">${ders} | ${tarih}</div>`;
    Object.entries(gruplar).forEach(([kategori, urunler]) => {
      html += `<div class="kat">${kategori} (${urunler.length} urun)</div><table><thead><tr><th>Urun</th><th>Marka</th><th>Satin Alinacak</th><th>B.Fiyat</th></tr></thead><tbody>`;
      urunler.forEach((u) => {
        const satin = u.satinAlinacak > 0 ? `${u.satinAlinacak} ${u.olcu}` : "Depoda yeterli";
        html += `<tr><td>${u.urunAdi}</td><td>${u.marka || "—"}</td><td>${satin}</td><td>${u.birimFiyat > 0 ? "₺" + u.birimFiyat.toFixed(2) : "—"}</td></tr>`;
      });
      html += `</tbody></table>`;
    });
    const toplamTutar = satirlar.reduce((acc, u) => acc + (u.birimFiyat * u.satinAlinacak), 0);
    html += `<div style="margin-top:16px;text-align:right;font-weight:bold;color:#8B0000;">TOPLAM: ₺${toplamTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>`;
    html += `<div class="footer">IRUFoodFlow | ${tarih}</div></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const handleExcel = async () => {
    if (satirlar.length === 0) return;
    const XLSX = await import("xlsx");
    const rows = satirlar.map((u) => ({
      "Ürün Adı": u.urunAdi, "Marka": u.marka || "-", "Ölçü": u.olcu,
      "Liste Miktarı": u.listeMiktar, "Depoda": u.depodaMiktar,
      "Satın Alınacak": u.satinAlinacak,
      "Birim Fiyat": u.birimFiyat || 0,
      "Satın Alma Tutarı": (u.birimFiyat || 0) * u.satinAlinacak,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Satın Alma");
    const ad = secilenHafta === "tumu" ? "Satinalma_Tum" : `Satinalma_${secilenHafta.replace(/\s/g, "_")}`;
    XLSX.writeFile(wb, `${ad}.xlsx`);
  };

  return (
    <DashboardLayout title="Satın Alma Paneli" subtitle="Haftalık ürün özetleri ve stok karşılaştırması">
      <div className="max-w-6xl space-y-5">
        {bildirim && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${bildirim.tip === "basari" ? "bg-white border-emerald-100 text-emerald-700" : "bg-white border-red-100 text-red-600"}`}>
            <div className={`w-2 h-2 rounded-full ${bildirim.tip === "basari" ? "bg-emerald-500" : "bg-red-500"}`} />
            <p className="font-bold text-xs uppercase tracking-widest">{bildirim.metin}</p>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 block">Hafta</label>
            <select value={secilenHafta} onChange={(e) => setSecilenHafta(e.target.value)}
              className="bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[primary-900]/20">
              {haftalar.map((h) => <option key={h} value={h}>{h === "tumu" ? "Tüm Haftalar" : h}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 block">Ders</label>
            <select value={secilenDers} onChange={(e) => setSecilenDers(e.target.value)}
              className="bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[primary-900]/20 min-w-[220px]">
              {dersler.map((d) => <option key={d} value={d}>{d === "tumu" ? "Tüm Dersler" : d}</option>)}
            </select>
          </div>
          <div className="ml-auto flex items-end gap-3">
            <button type="button" onClick={handlePdf} disabled={satirlar.length === 0}
              className="bg-red-700 hover:bg-red-800 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition disabled:opacity-40 shadow-lg shadow-red-900/20">PDF</button>
            <button type="button" onClick={handleExcel} disabled={satirlar.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition disabled:opacity-40 shadow-sm">Excel</button>
          </div>
        </div>

        {satirlar.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-2">Liste Toplamı</p>
              <p className="text-2xl font-black text-gray-800">{genelToplam > 0 ? `₺${genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</p>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 text-center">
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-2">Satın Alınacak Tutar</p>
              <p className="text-2xl font-black text-emerald-700">{satinAlinacakToplam > 0 ? `₺${satinAlinacakToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {satirlar.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">
              {siparisler.length === 0 ? "Henüz sipariş bulunmuyor." : "Bu filtreye uygun veri yok."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">ÜRÜN</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">MARKA</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">LİSTE MİKT.</th>
                  <th className="px-5 py-4 text-[10px] font-black text-amber-600 uppercase tracking-widest">DEPODA</th>
                  <th className="px-5 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">SATIN ALINACAK</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">B.FİYAT</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">İŞLEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const gruplar: Record<string, { satir: OzetSatir; idx: number }[]> = {};
                  satirlar.forEach((u, i) => {
                    const kat = u.kategori || "Diger";
                    if (!gruplar[kat]) gruplar[kat] = [];
                    gruplar[kat].push({ satir: u, idx: i });
                  });
                  return Object.entries(gruplar).flatMap(([kategori, satirGrubu]) => [
                    <tr key={`kat-${kategori}`} className="bg-gray-50/80 border-t border-gray-100">
                      <td colSpan={7} className="px-5 py-2.5">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{kategori}</span>
                        <span className="ml-2 text-[10px] font-black text-gray-400">({satirGrubu.length} ürün)</span>
                      </td>
                    </tr>,
                    ...satirGrubu.map(({ satir: u, idx: i }) => (
                      <tr key={i} className={`hover:bg-gray-50 transition-colors ${u.dususYapildi ? "bg-emerald-50/50" : ""}`}>
                        <td className="px-5 py-4 font-bold text-gray-800">{u.urunAdi}</td>
                        <td className="px-5 py-4 text-gray-500">{u.marka || "—"}</td>
                        <td className="px-5 py-4 font-bold text-gray-700">{u.listeMiktar} {u.olcu}</td>
                        <td className="px-5 py-4">
                          <span className={`font-black text-sm ${u.depodaMiktar > 0 ? "text-amber-600" : "text-gray-300"}`}>
                            {u.depodaMiktar > 0 ? `${u.depodaMiktar} ${u.olcu}` : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-black text-sm ${u.satinAlinacak > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                            {u.satinAlinacak > 0 ? `${u.satinAlinacak} ${u.olcu}` : "Depoda yeterli"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-500 italic">
                          {u.birimFiyat > 0 ? `₺${u.birimFiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-5 py-4">
                          {u.dususYapildi ? (
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">✓ Düşüldü</span>
                          ) : u.depodaMiktar > 0 ? (
                            <button onClick={() => handleStokDus(u, i)}
                              className="text-[10px] font-black bg-orange-50 hover:bg-orange-100 text-orange-700 uppercase tracking-widest px-3 py-1.5 rounded-xl transition whitespace-nowrap">
                              Stoktan Düş
                            </button>
                          ) : (
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Stok yok</span>
                          )}
                        </td>
                      </tr>
                    )),
                  ]);
                })()}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}