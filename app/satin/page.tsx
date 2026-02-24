"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import * as XLSX from "xlsx";
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
 const [siparisler, setSiparisler] = useState<Siparis[]>([]);
 const [stokMap, setStokMap] = useState<Record<string, { id: string; stok: number; kategori: string }>>({});
 const [satirlar, setSatirlar] = useState<OzetSatir[]>([]);
 const [secilenHafta, setSecilenHafta] = useState("tumu");
 const [secilenDers, setSecilenDers] = useState("tumu");
 const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
 const [{ data: sipData }, { data: urunData }] = await Promise.all([
 supabase.from("siparisler").select("*"),
 supabase.from("urunler").select("id, urun_adi, marka, stok, kategori"),
 ]);
 setSiparisler((sipData || []).map((s: any) => ({
 id: s.id, ogretmenAdi: s.ogretmen_adi, dersAdi: s.ders_adi,
 hafta: s.hafta, urunler: s.urunler || [], genelToplam: s.genel_toplam,
 })));
 // stok map: "urunAdi__marka" -> { id, stok }
 const map: Record<string, { id: string; stok: number; kategori: string }> = {};
 (urunData || []).forEach((u: any) => {
 const key = `${u.urun_adi}__${u.marka || ""}`;
 map[key] = { id: u.id, stok: u.stok ?? 0, kategori: u.kategori || "Diger" };
 });
 setStokMap(map);
 };

 const bildir = (tip: "basari" | "hata", metin: string) => {
 setBildirim({ tip, metin });
 setTimeout(() => setBildirim(null), 3500);
 };

 const haftalar = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.hafta))).sort()];
 const dersler = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.dersAdi))).sort()];

 const filtrelenmis = siparisler.filter((s) =>
 (secilenHafta === "tumu" || s.hafta === secilenHafta) &&
 (secilenDers === "tumu" || s.dersAdi === secilenDers)
 );

 // Özet hesapla (stokMap değişince de yeniden hesaplansın)
 useEffect(() => {
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
 // satinAlinacak = listeMiktar - depodaMiktar (min 0)
 Object.values(ozet).forEach((s) => {
 s.satinAlinacak = Math.max(0, s.listeMiktar - s.depodaMiktar);
 });
 setSatirlar(Object.values(ozet).sort((a, b) => { const kCmp = (a.kategori || "").localeCompare(b.kategori || "", "tr"); return kCmp !== 0 ? kCmp : a.urunAdi.localeCompare(b.urunAdi, "tr"); }));
 }, [siparisler, stokMap, secilenHafta, secilenDers]);

  const handleStokDus = async (satir: OzetSatir, idx: number) => {
    if (!satir.urunId) { bildir("hata", `"${satir.urunAdi}" ürünü veritabanında bulunamadı.`); return; }
    if (satir.depodaMiktar <= 0) { bildir("hata", "Depoda bu ürünün stoğu zaten sıfır."); return; }

    // Stoktan düş: depodaki mevcut stok kullanıldı olarak işaretle (0'a çek)
    const yeniStok = 0;

    const { error } = await supabase.from("urunler").update({ stok: yeniStok }).eq("id", satir.urunId);
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
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#222}h1{font-size:14px;color:#8B0000;border-bottom:2px solid #8B0000;padding-bottom:6px;margin-bottom:4px}.meta{font-size:10px;color:#666;margin-bottom:16px}.kat{background:#f3f4f6;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#555;padding:6px 8px;margin-top:14px;border-left:3px solid #8B0000}table{width:100%;border-collapse:collapse;margin-top:4px}th{background:#8B0000;color:white;padding:5px 8px;font-size:10px;text-align:left}td{padding:5px 8px;border-bottom:1px solid #eee;font-size:10px}tr:nth-child(even) td{background:#fafafa}.s{color:#059669;font-weight:bold}.d{color:#d97706}.y{color:#aaa}.footer{margin-top:20px;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:6px}@media print{body{margin:10px}}</style></head><body>`;
    html += `<h1>Satin Alma Listesi — ${baslik}</h1><div class="meta">${ders} | ${tarih}</div>`;
    Object.entries(gruplar).forEach(([kategori, urunler]) => {
      html += `<div class="kat">${kategori} (${urunler.length} urun)</div><table><thead><tr><th>Urun</th><th>Marka</th><th>Satin Alinacak</th><th>B.Fiyat</th></tr></thead><tbody>`;
      urunler.forEach((u) => {
        const satin = u.satinAlinacak > 0 ? `<span class="s">${u.satinAlinacak} ${u.olcu}</span>` : `<span class="y">Depoda yeterli</span>`;
        const depoda = u.depodaMiktar > 0 ? `<span class="d">${u.depodaMiktar} ${u.olcu}</span>` : `<span class="y">—</span>`;
        html += `<tr><td>${u.urunAdi}</td><td>${u.marka || "—"}</td><td>${satin}</td><td>${u.birimFiyat > 0 ? "₺" + u.birimFiyat.toFixed(2) : "—"}</td></tr>`;
      });
      html += `</tbody></table>`;
    });
    const toplamTutar = satirlar.reduce((acc, u) => acc + (u.birimFiyat * u.satinAlinacak), 0);
    html += `<div style="margin-top:16px;text-align:right;font-size:12px;font-weight:bold;border-top:2px solid #8B0000;padding-top:8px;color:#8B0000;">TOPLAM: ₺${toplamTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>`;
    html += `<div class="footer">IRUFoodFlow | ${tarih}</div></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };


 const handleExcel = () => {
 if (satirlar.length === 0) return;
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
 <div className={`text-sm rounded-xl px-4 py-3 border font-medium ${bildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
 {bildirim.metin}
 </div>
 )}

 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-wrap gap-4 items-end">
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Hafta</label>
 <select value={secilenHafta} onChange={(e) => setSecilenHafta(e.target.value)}
 className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 {haftalar.map((h) => <option key={h} value={h}>{h === "tumu" ? "Tüm Haftalar" : h}</option>)}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Ders</label>
 <select value={secilenDers} onChange={(e) => setSecilenDers(e.target.value)}
 className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[220px]">
 {dersler.map((d) => <option key={d} value={d}>{d === "tumu" ? "Tüm Dersler" : d}</option>)}
 </select>
 </div>
 <div className="ml-auto flex items-end gap-3">
 <button type="button" onClick={handlePdf} disabled={satirlar.length === 0}
 className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-40">
 PDF
 </button>
 <button type="button" onClick={handleExcel} disabled={satirlar.length === 0}
 className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-40">
 Excel
 </button>
 </div>
 </div>

 {/* Özet kartlar */}
 {satirlar.length > 0 && (
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
 <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Liste Toplamı</p>
 <p className="text-2xl font-bold text-gray-800">{genelToplam > 0 ? `₺${genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</p>
 </div>
 <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 text-center">
 <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Satın Alınacak Tutar</p>
 <p className="text-2xl font-bold text-emerald-700">{satinAlinacakToplam > 0 ? `₺${satinAlinacakToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</p>
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
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ÜRÜN</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MARKA</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">LİSTE MİKT.</th>
 <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider">DEPODA</th>
 <th className="px-4 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wider">SATIN ALINACAK</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">B.FİYAT</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">İŞLEM</th>
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
                <tr key={`kat-${kategori}`} className="bg-gray-100 border-t-2 border-gray-200">
                  <td colSpan={7} className="px-4 py-2">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{kategori}</span>
                    <span className="ml-2 text-xs text-gray-400">({satirGrubu.length} ürün)</span>
                  </td>
                </tr>,
                ...satirGrubu.map(({ satir: u, idx: i }) => (
                  <tr key={i} className={`hover:bg-gray-50 transition-colors ${u.dususYapildi ? "bg-emerald-50" : ""}`}>
                    <td className="px-4 py-3.5 font-medium text-gray-800">{u.urunAdi}</td>
                    <td className="px-4 py-3.5 text-gray-500">{u.marka || "—"}</td>
                    <td className="px-4 py-3.5 text-gray-700 font-medium">{u.listeMiktar} {u.olcu}</td>
                    <td className="px-4 py-3.5">
                      <span className={`font-semibold ${u.depodaMiktar > 0 ? "text-amber-600" : "text-gray-400"}`}>
                        {u.depodaMiktar > 0 ? `${u.depodaMiktar} ${u.olcu}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`font-bold text-base ${u.satinAlinacak > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                        {u.satinAlinacak > 0 ? `${u.satinAlinacak} ${u.olcu}` : "Depoda yeterli"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {u.birimFiyat > 0 ? `₺${u.birimFiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {u.dususYapildi ? (
                        <span className="text-xs text-emerald-600 font-medium">Düşüldü</span>
                      ) : u.depodaMiktar > 0 ? (
                        <button onClick={() => handleStokDus(u, i)}
                          className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap">
                          Stoktan Düş
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Stok yok</span>
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