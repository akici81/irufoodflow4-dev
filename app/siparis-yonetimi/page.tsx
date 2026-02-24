"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";

type SiparisUrun = { urunId: string; urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type Siparis = { id: string; ogretmenId: number; ogretmenAdi: string; dersId: string; dersAdi: string; hafta: string; urunler: SiparisUrun[]; genelToplam: number; tarih: string; durum: string };

export default function SiparisYonetimiPage() {
 const [siparisler, setSiparisler] = useState<Siparis[]>([]);
 const [sekme, setSekme] = useState<"hepsi" | "filtre">("hepsi");
 const [filtreOgretmen, setFiltreOgretmen] = useState("tumu");
 const [filtreDers, setFiltreDers] = useState("tumu");
 const [detaySiparis, setDetaySiparis] = useState<Siparis | null>(null);

 useEffect(() => { fetchSiparisler(); }, []);

 const fetchSiparisler = async () => {
 const { data } = await supabase.from("siparisler").select("*").order("tarih", { ascending: false });
 setSiparisler((data || []).map((s: any) => ({
 id: s.id, ogretmenId: s.ogretmen_id, ogretmenAdi: s.ogretmen_adi,
 dersId: s.ders_id, dersAdi: s.ders_adi, hafta: s.hafta,
 urunler: s.urunler || [], genelToplam: s.genel_toplam, tarih: s.tarih, durum: s.durum,
 })));
 };

 const handleSil = async (id: string) => {
 if (!confirm("Bu siparişi silmek istediğinizden emin misiniz?")) return;
 await supabase.from("siparisler").delete().eq("id", id);
 setSiparisler((prev) => prev.filter((s) => s.id !== id));
 if (detaySiparis?.id === id) setDetaySiparis(null);
 };

 const handleDurumGuncelle = async (id: string, durum: string) => {
 await supabase.from("siparisler").update({ durum }).eq("id", id);
 setSiparisler((prev) => prev.map((s) => s.id === id ? { ...s, durum } : s));
 if (detaySiparis?.id === id) setDetaySiparis((prev) => prev ? { ...prev, durum } : null);
 };

 const ogretmenler = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.ogretmenAdi)))];
 const dersler = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.dersAdi)))];

 const filtrelenmis = siparisler.filter((s) => {
 const oUygun = filtreOgretmen === "tumu" || s.ogretmenAdi === filtreOgretmen;
 const dUygun = filtreDers === "tumu" || s.dersAdi === filtreDers;
 return oUygun && dUygun;
 });

 const gosterilen = sekme === "hepsi" ? siparisler : filtrelenmis;

 return (
 <DashboardLayout title="Sipariş Yönetimi" subtitle="Tüm siparişleri görüntüleyin ve yönetin">
 <div className="max-w-6xl space-y-5">
 <div className="flex gap-3">
 <button onClick={() => setSekme("hepsi")}
 className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition ${sekme === "hepsi" ? "bg-red-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
 Tüm Siparişler ({siparisler.length})
 </button>
 <button onClick={() => setSekme("filtre")}
 className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition ${sekme === "filtre" ? "bg-red-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
 Öğretmen/Ders Seçimi
 </button>
 </div>

 {sekme === "filtre" && (
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-wrap gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-xs font-medium text-gray-500">Öğretmen</label>
 <select value={filtreOgretmen} onChange={(e) => setFiltreOgretmen(e.target.value)}
 className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[200px]">
 {ogretmenler.map((o) => <option key={o} value={o}>{o === "tumu" ? "Tüm Öğretmenler" : o}</option>)}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs font-medium text-gray-500">Ders</label>
 <select value={filtreDers} onChange={(e) => setFiltreDers(e.target.value)}
 className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[240px]">
 {dersler.map((d) => <option key={d} value={d}>{d === "tumu" ? "Tüm Dersler" : d}</option>)}
 </select>
 </div>
 </div>
 )}

 <div className="flex gap-5">
 <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
 <h2 className="font-semibold text-gray-800">{sekme === "hepsi" ? "Tüm Siparişler" : "Filtrelenmiş Siparişler"}</h2>
 <span className="text-xs text-gray-400">Toplam {gosterilen.length} sipariş</span>
 </div>
 {gosterilen.length === 0 ? (
 <div className="py-16 text-center text-gray-400 text-sm">Sipariş bulunamadı.</div>
 ) : (
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100 text-left">
 {["ÖĞRETMEN", "DERS", "HAFTA", "ÜRÜN SAYISI", "TOPLAM TUTAR", "İŞLEM"].map((h) => (
 <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {gosterilen.map((s) => (
 <tr key={s.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-5 py-4 font-semibold text-gray-800">{s.ogretmenAdi}</td>
 <td className="px-5 py-4 text-gray-600 max-w-xs truncate">{s.dersAdi}</td>
 <td className="px-5 py-4 text-gray-600">{s.hafta}</td>
 <td className="px-5 py-4 text-gray-600">{s.urunler.length} ürün</td>
 <td className="px-5 py-4 font-semibold text-red-700">₺{s.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
 <td className="px-5 py-4">
 <div className="flex gap-2">
 <button onClick={() => setDetaySiparis(s)}
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

 {detaySiparis && (
 <div className="w-80 flex-shrink-0">
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-4">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold text-gray-800 text-sm">Sipariş Detayı</h3>
 <button onClick={() => setDetaySiparis(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
 </div>
 <div className="space-y-2 mb-4 text-sm">
 <div className="flex justify-between"><span className="text-gray-400">Öğretmen:</span><span className="font-medium text-gray-800">{detaySiparis.ogretmenAdi}</span></div>
 <div className="flex justify-between"><span className="text-gray-400">Ders:</span><span className="font-medium text-gray-800 text-right max-w-[160px]">{detaySiparis.dersAdi}</span></div>
 <div className="flex justify-between"><span className="text-gray-400">Hafta:</span><span className="font-medium text-gray-800">{detaySiparis.hafta}</span></div>
 <div className="flex justify-between"><span className="text-gray-400">Tarih:</span><span className="font-medium text-gray-800">{detaySiparis.tarih}</span></div>
 <div className="flex justify-between items-center">
 <span className="text-gray-400">Durum:</span>
 <select value={detaySiparis.durum} onChange={(e) => handleDurumGuncelle(detaySiparis.id, e.target.value)}
 className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 <option value="bekliyor">Bekliyor</option>
 <option value="onaylandi">Onaylandı</option>
 <option value="teslim_alindi">Teslim Alındı</option>
 </select>
 </div>
 </div>
 <div className="border-t border-gray-100 pt-4">
 <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ürünler</h4>
 <div className="space-y-2 max-h-64 overflow-y-auto">
 {detaySiparis.urunler.map((u, i) => (
 <div key={i} className="flex justify-between items-start text-xs py-2 border-b border-gray-50">
 <div><p className="font-medium text-gray-800">{u.urunAdi}</p><p className="text-gray-400">{u.marka} · {u.miktar} {u.olcu}</p></div>
 <span className="font-semibold text-gray-700 ml-2">₺{u.toplam.toFixed(2)}</span>
 </div>
 ))}
 </div>
 <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
 <span className="text-sm font-semibold text-gray-800">Toplam</span>
 <span className="text-base font-bold text-red-700">₺{detaySiparis.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
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