"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type SiparisUrun = { urunId: string; urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type Siparis = { id: string; ogretmenId: number; ogretmenAdi: string; dersId: string; dersAdi: string; hafta: string; urunler: SiparisUrun[]; genelToplam: number; tarih: string; durum: "bekliyor" | "onaylandi" | "teslim_alindi" };

const DURUM_STIL: Record<string, string> = {
 bekliyor: "bg-amber-100 text-amber-700 border-amber-200",
 onaylandi: "bg-blue-100 text-blue-700 border-blue-200",
 teslim_alindi: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const DURUM_LABEL: Record<string, string> = {
 bekliyor: "⏳ Bekliyor", onaylandi: " Onaylandı", teslim_alindi: " Teslim Alındı",
};

export default function SiparislerPage() {
 const [siparisler, setSiparisler] = useState<Siparis[]>([]);
 const [detay, setDetay] = useState<Siparis | null>(null);
 const [filtreHafta, setFiltreHafta] = useState("tumu");
 const [filtreOgretmen, setFiltreOgretmen] = useState("tumu");
 const [filtreDurum, setFiltreDurum] = useState("tumu");
 const [aramaMetni, setAramaMetni] = useState("");

 useEffect(() => { fetchSiparisler(); }, []);

 const fetchSiparisler = async () => {
 const { data } = await supabase.from("siparisler").select("*").order("tarih", { ascending: false });
 setSiparisler((data || []).map((s: any) => ({
 id: s.id, ogretmenId: s.ogretmen_id, ogretmenAdi: s.ogretmen_adi,
 dersId: s.ders_id, dersAdi: s.ders_adi, hafta: s.hafta,
 urunler: s.urunler || [], genelToplam: s.genel_toplam, tarih: s.tarih, durum: s.durum,
 })));
 };

 const handleDurumGuncelle = async (id: string, durum: string) => {
 await supabase.from("siparisler").update({ durum }).eq("id", id);
 setSiparisler((prev) => prev.map((s) => s.id === id ? { ...s, durum: durum as Siparis["durum"] } : s));
 if (detay?.id === id) setDetay((prev) => prev ? { ...prev, durum: durum as Siparis["durum"] } : null);
 };

 const handleSil = async (id: string) => {
 if (!confirm("Bu alışveriş listesini silmek istediğinizden emin misiniz?")) return;
 await supabase.from("siparisler").delete().eq("id", id);
 setSiparisler((prev) => prev.filter((s) => s.id !== id));
 if (detay?.id === id) setDetay(null);
 };

 const handleTumunuOnayla = async () => {
 if (!confirm("Görüntülenen tüm bekleyen listeler onaylanacak. Emin misiniz?")) return;
 const bekleyenIds = filtrelenmis.filter((s) => s.durum === "bekliyor").map((s) => s.id);
 for (const id of bekleyenIds) await supabase.from("siparisler").update({ durum: "onaylandi" }).eq("id", id);
 fetchSiparisler();
 };

 const haftalar = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.hafta))).sort()];
 const ogretmenler = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.ogretmenAdi))).sort()];

 const filtrelenmis = siparisler.filter((s) => {
 const hUygun = filtreHafta === "tumu" || s.hafta === filtreHafta;
 const oUygun = filtreOgretmen === "tumu" || s.ogretmenAdi === filtreOgretmen;
 const dUygun = filtreDurum === "tumu" || s.durum === filtreDurum;
 const aUygun = !aramaMetni || s.ogretmenAdi.toLowerCase().includes(aramaMetni.toLowerCase()) || s.dersAdi.toLowerCase().includes(aramaMetni.toLowerCase());
 return hUygun && oUygun && dUygun && aUygun;
 });

 const genelToplam = filtrelenmis.reduce((acc, s) => acc + s.genelToplam, 0);
 const bekleyenSayisi = siparisler.filter((s) => s.durum === "bekliyor").length;
 const onaylananSayisi = siparisler.filter((s) => s.durum === "onaylandi").length;
 const teslimSayisi = siparisler.filter((s) => s.durum === "teslim_alindi").length;

 const handleExcel = () => {
 if (filtrelenmis.length === 0) return;
 const rows = filtrelenmis.flatMap((s) => s.urunler.map((u) => ({
 "Öğretmen": s.ogretmenAdi, "Ders": s.dersAdi, "Hafta": s.hafta, "Tarih": s.tarih,
 "Durum": DURUM_LABEL[s.durum] ?? s.durum, "Ürün Adı": u.urunAdi, "Marka": u.marka || "-",
 "Miktar": u.miktar, "Ölçü": u.olcu, "Birim Fiyat": u.birimFiyat || 0, "Toplam": u.toplam || 0,
 })));
 const ws = XLSX.utils.json_to_sheet(rows);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Alışveriş Listeleri");
 XLSX.writeFile(wb, `Alisveris_Listeleri_${new Date().toLocaleDateString("tr-TR").replace(/\./g, "-")}.xlsx`);
 };

 return (
 <DashboardLayout title="Alışveriş Listeleri" subtitle="Tüm öğretmen taleplerini görüntüleyin ve yönetin">
 <div className="max-w-7xl space-y-5">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: "Toplam Liste", deger: siparisler.length, renk: "text-gray-800" },
 { label: "Bekliyor", deger: bekleyenSayisi, renk: "text-amber-600" },
 { label: "Onaylandı", deger: onaylananSayisi, renk: "text-blue-600" },
 { label: "Teslim Alındı", deger: teslimSayisi, renk: "text-emerald-600" },
 ].map((k) => (
 <div key={k.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
 <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{k.label}</p>
 <p className={`text-3xl font-bold ${k.renk}`}>{k.deger}</p>
 </div>
 ))}
 </div>

 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
 <div className="flex flex-wrap gap-3 items-end">
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Arama</label>
 <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} placeholder="Öğretmen veya ders ara..."
 className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 w-52" />
 </div>
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Hafta</label>
 <select value={filtreHafta} onChange={(e) => setFiltreHafta(e.target.value)}
 className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 {haftalar.map((h) => <option key={h} value={h}>{h === "tumu" ? "Tüm Haftalar" : h}</option>)}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Öğretmen</label>
 <select value={filtreOgretmen} onChange={(e) => setFiltreOgretmen(e.target.value)}
 className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[180px]">
 {ogretmenler.map((o) => <option key={o} value={o}>{o === "tumu" ? "Tüm Öğretmenler" : o}</option>)}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Durum</label>
 <select value={filtreDurum} onChange={(e) => setFiltreDurum(e.target.value)}
 className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 <option value="tumu">Tüm Durumlar</option>
 <option value="bekliyor">Bekliyor</option>
 <option value="onaylandi">Onaylandı</option>
 <option value="teslim_alindi">Teslim Alındı</option>
 </select>
 </div>
 <div className="ml-auto flex items-end gap-3">
 {bekleyenSayisi > 0 && (
 <button type="button" onClick={handleTumunuOnayla}
 className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
 Tümünü Onayla
 </button>
 )}
 <button type="button" onClick={handleExcel} disabled={filtrelenmis.length === 0}
 className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-40">
 Excel'e Aktar
 </button>
 </div>
 </div>
 </div>

 <div className="flex gap-5">
 <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
 {filtrelenmis.length === 0 ? (
 <div className="py-20 text-center text-gray-400 text-sm">
 {siparisler.length === 0 ? "Henüz alışveriş listesi oluşturulmamış." : "Bu filtreye uygun liste bulunamadı."}
 </div>
 ) : (
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100 text-left">
 {["ÖĞRETMEN", "DERS", "HAFTA", "ÜRÜN", "TUTAR", "DURUM", "İŞLEM"].map((h) => (
 <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {filtrelenmis.map((s) => (
 <tr key={s.id} onClick={() => setDetay(detay?.id === s.id ? null : s)}
 className={`cursor-pointer transition-colors ${detay?.id === s.id ? "bg-red-50" : "hover:bg-gray-50"}`}>
 <td className="px-5 py-4 font-semibold text-gray-800">{s.ogretmenAdi}</td>
 <td className="px-5 py-4 text-gray-600 max-w-[200px] truncate">{s.dersAdi}</td>
 <td className="px-5 py-4 text-gray-600">{s.hafta}</td>
 <td className="px-5 py-4 text-gray-500">{s.urunler.length} ürün</td>
 <td className="px-5 py-4 font-semibold text-red-700">
 {s.genelToplam > 0 ? `₺${s.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
 </td>
 <td className="px-5 py-4">
 <select value={s.durum}
 onChange={(e) => { e.stopPropagation(); handleDurumGuncelle(s.id, e.target.value); }}
 onClick={(e) => e.stopPropagation()}
 className={`text-xs font-medium px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none ${DURUM_STIL[s.durum] ?? ""}`}>
 <option value="bekliyor">⏳ Bekliyor</option>
 <option value="onaylandi">Onaylandı</option>
 <option value="teslim_alindi">Teslim Alındı</option>
 </select>
 </td>
 <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
 <div className="flex gap-2">
 <button onClick={() => setDetay(detay?.id === s.id ? null : s)}
 className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded-lg transition">Detay</button>
 <button onClick={() => handleSil(s.id)}
 className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded-lg transition">Sil</button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 {detay && (
 <div className="w-80 flex-shrink-0">
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-4">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold text-gray-800 text-sm">Liste Detayı</h3>
 <button type="button" onClick={() => setDetay(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
 </div>
 <div className="space-y-2 mb-4 text-sm">
 <div className="flex justify-between"><span className="text-gray-400">Öğretmen</span><span className="font-medium text-gray-800">{detay.ogretmenAdi}</span></div>
 <div className="flex justify-between"><span className="text-gray-400">Ders</span><span className="font-medium text-gray-800 text-right max-w-[160px]">{detay.dersAdi}</span></div>
 <div className="flex justify-between"><span className="text-gray-400">Hafta</span><span className="font-medium text-gray-800">{detay.hafta}</span></div>
 <div className="flex justify-between"><span className="text-gray-400">Tarih</span><span className="font-medium text-gray-800">{detay.tarih}</span></div>
 </div>
 <div className="border-t border-gray-100 pt-4">
 <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ürünler ({detay.urunler.length})</h4>
 <div className="space-y-2 max-h-64 overflow-y-auto">
 {detay.urunler.map((u, i) => (
 <div key={i} className="flex justify-between items-start text-xs py-2 border-b border-gray-50 last:border-0">
 <div><p className="font-medium text-gray-800">{u.urunAdi}</p><p className="text-gray-400">{u.marka && `${u.marka} · `}{u.miktar} {u.olcu}</p></div>
 <span className="font-semibold text-gray-700 ml-3">{u.toplam > 0 ? `₺${u.toplam.toFixed(2)}` : "—"}</span>
 </div>
 ))}
 </div>
 <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
 <span className="text-sm font-semibold text-gray-800">Genel Toplam</span>
 <span className="text-base font-bold text-red-700">
 {detay.genelToplam > 0 ? `₺${detay.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
 </span>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </DashboardLayout>
 );
}