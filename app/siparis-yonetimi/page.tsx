"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type SiparisUrun = { urunId: string; urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type Siparis = { id: string; ogretmenId: number; ogretmenAdi: string; dersId: string; dersAdi: string; hafta: string; urunler: SiparisUrun[]; genelToplam: number; tarih: string; durum: string };

export default function SiparisYonetimiPage() {
  const { yetkili, yukleniyor } = useAuth("/siparis-yonetimi");

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

  const getDurumStil = (durum: string) => {
    switch (durum) {
      case "onaylandi": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "teslim_alindi": return "bg-blue-50 text-blue-700 border-blue-100";
      default: return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  const getDurumMetin = (durum: string) => {
    switch (durum) {
      case "onaylandi": return "Onaylandı";
      case "teslim_alindi": return "Teslim Alındı";
      default: return "Bekliyor";
    }
  };

  if (yukleniyor) return (
    <DashboardLayout title="Sipariş Yönetimi">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
      </div>
    </DashboardLayout>
  );
  if (!yetkili) return null;

  const ogretmenler = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.ogretmenAdi)))];
  const dersler = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.dersAdi)))];

  const filtrelenmis = siparisler.filter((s) => {
    const oUygun = filtreOgretmen === "tumu" || s.ogretmenAdi === filtreOgretmen;
    const dUygun = filtreDers === "tumu" || s.dersAdi === filtreDers;
    return oUygun && dUygun;
  });

  const gosterilen = sekme === "hepsi" ? siparisler : filtrelenmis;

  return (
    <DashboardLayout title="Sipariş Yönetimi" subtitle="Mutfak Taleplerini Onaylayın">
      <div className="max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Üst Sekmeler */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-200 flex gap-1 shadow-sm">
            <button 
              onClick={() => setSekme("hepsi")}
              className={`px-6 py-2.5 rounded-xl text-[13px] font-black transition-all ${sekme === "hepsi" ? "bg-primary-900 text-white shadow-lg shadow-red-900/20" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Tüm Siparişler ({siparisler.length})
            </button>
            <button 
              onClick={() => setSekme("filtre")}
              className={`px-6 py-2.5 rounded-xl text-[13px] font-black transition-all ${sekme === "filtre" ? "bg-primary-900 text-white shadow-lg shadow-red-900/20" : "text-gray-500 hover:bg-gray-50"}`}
            >
              Filtrele
            </button>
          </div>
        </div>

        {/* Filtreleme Alanı */}
        {sekme === "filtre" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm flex flex-wrap gap-6 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Öğretim Görevlisi</label>
              <select value={filtreOgretmen} onChange={(e) => setFiltreOgretmen(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/10">
                {ogretmenler.map((o) => <option key={o} value={o}>{o === "tumu" ? "Herkes" : o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ders Adı</label>
              <select value={filtreDers} onChange={(e) => setFiltreDers(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/10">
                {dersler.map((d) => <option key={d} value={d}>{d === "tumu" ? "Tüm Dersler" : d}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sipariş Tablosu */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h2 className="font-black text-gray-800 tracking-tight italic">
                {sekme === "hepsi" ? "Sipariş Arşivi" : "Arama Sonuçları"}
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    <th className="px-8 py-5">Sorumlu</th>
                    <th className="px-8 py-5">Ders & Hafta</th>
                    <th className="px-8 py-5">Durum</th>
                    <th className="px-8 py-5 text-right">Tutar</th>
                    <th className="px-8 py-5 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {gosterilen.map((s) => (
                    <tr key={s.id} className="group hover:bg-gray-50 transition-all">
                      <td className="px-8 py-5">
                        <p className="font-bold text-gray-800 text-sm tracking-tight">{s.ogretmenAdi}</p>
                        <p className="text-[10px] text-gray-400 font-medium italic">{s.tarih}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-bold text-gray-600 truncate max-w-[180px]">{s.dersAdi}</p>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-black">{s.hafta}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${getDurumStil(s.durum)}`}>
                          {getDurumMetin(s.durum)}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="font-black text-primary-900 text-sm leading-none">
                          ₺{s.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[9px] text-gray-400 font-bold">{s.urunler.length} Kalem</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDetaySiparis(s)} className="p-2 bg-gray-900 text-white rounded-xl hover:bg-primary-900 transition-colors shadow-sm">
                            👁️‍🗨️
                          </button>
                          <button onClick={() => handleSil(s.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {gosterilen.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                  <span className="text-4xl mb-4 grayscale opacity-20">📦</span>
                  <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Kayıtlı sipariş bulunamadı</p>
                </div>
              )}
            </div>
          </div>

          {/* Yan Detay Paneli - Premium Tasarım */}
          {detaySiparis && (
            <div className="w-full lg:w-96 flex-shrink-0 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 sticky top-8">
                <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-6">
                  <div>
                    <h3 className="font-black text-gray-800 text-lg tracking-tight">Sipariş Detayı</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">#S-{detaySiparis.id.slice(0,5)}</p>
                  </div>
                  <button onClick={() => setDetaySiparis(null)} className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-red-600 rounded-full transition-colors text-xl font-light">×</button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Yönetim Onayı</span>
                    <select 
                      value={detaySiparis.durum} 
                      onChange={(e) => handleDurumGuncelle(detaySiparis.id, e.target.value)}
                      className={`w-full text-xs font-black border rounded-2xl px-4 py-3 focus:outline-none transition-all ${getDurumStil(detaySiparis.durum)}`}
                    >
                      <option value="bekliyor">⏳ Beklemede</option>
                      <option value="onaylandi">✅ Onaylandı</option>
                      <option value="teslim_alindi">📦 Teslim Alındı</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                   <div className="flex justify-between text-[11px] font-bold"><span className="text-gray-400 uppercase">Öğretmen:</span><span className="text-gray-700">{detaySiparis.ogretmenAdi}</span></div>
                   <div className="flex justify-between text-[11px] font-bold"><span className="text-gray-400 uppercase">Hafta:</span><span className="text-gray-700">{detaySiparis.hafta}</span></div>
                </div>

                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Ürün Listesi</h4>
                  {detaySiparis.urunler.map((u, i) => (
                    <div key={i} className="group flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-800 truncate tracking-tight">{u.urunAdi}</p>
                        <p className="text-[10px] text-gray-400 font-medium italic">{u.miktar} {u.olcu} · {u.marka}</p>
                      </div>
                      <span className="text-xs font-black text-gray-600 ml-4 group-hover:text-primary-900 transition-colors">₺{u.toplam.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-widest">Genel Toplam</span>
                  <span className="text-2xl font-black text-primary-900 tracking-tighter">₺{detaySiparis.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}