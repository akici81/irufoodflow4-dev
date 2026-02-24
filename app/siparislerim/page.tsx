"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type SiparisUrun = { urunId: string; urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type Siparis = { id: string; ogretmenId: number; ogretmenAdi: string; dersId: string; dersAdi: string; hafta: string; urunler: SiparisUrun[]; genelToplam: number; tarih: string; durum: string };

export default function SiparislerimPage() {
  const { yetkili, yukleniyor } = useAuth("/siparislerim");
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [yukleniyorVeri, setYukleniyorVeri] = useState(true);

  // Veri çekme fonksiyonunu useCallback ile sarmalayarak render döngüsünü engelliyoruz
  const fetchData = useCallback(async () => {
    const id = localStorage.getItem("aktifKullaniciId");
    if (!id) return;

    const { data, error } = await supabase
      .from("siparisler")
      .select("*")
      .eq("ogretmen_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSiparisler(data.map((s: any) => ({
        id: s.id,
        ogretmenId: s.ogretmen_id,
        ogretmenAdi: s.ogretmen_adi,
        dersId: s.ders_id,
        dersAdi: s.ders_adi,
        hafta: s.hafta,
        urunler: s.urunler || [],
        genelToplam: s.genel_toplam,
        tarih: s.tarih,
        durum: s.durum,
      })));
    }
    setYukleniyorVeri(false);
  }, []);

  useEffect(() => {
    if (yetkili) {
      fetchData();
    }
  }, [yetkili, fetchData]);

  const getDurumStil = (durum: string) => {
    switch (durum) {
      case "onaylandi": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "teslim_alindi": return "bg-blue-50 text-blue-700 border-blue-100";
      case "iptal": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  if (yukleniyor || yukleniyorVeri) {
    return (
      <DashboardLayout title="Siparişlerim" subtitle="Yükleniyor...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!yetkili) return null;

  return (
    <DashboardLayout title="Siparişlerim" subtitle="Geçmiş ve aktif malzeme talepleriniz">
      <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {siparisler.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-20 text-center shadow-sm">
            <span className="text-5xl mb-6 block grayscale opacity-30">📋</span>
            <h3 className="text-xl font-black text-gray-800 mb-2 tracking-tight">Henüz bir siparişiniz yok</h3>
            <p className="text-gray-400 text-sm font-medium mb-8">Haftalık malzeme talebi oluşturarak başlayabilirsiniz.</p>
            <a href="/talep" className="inline-flex items-center px-8 py-3 bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-800 transition-all shadow-lg shadow-red-900/20">
              Yeni Talep Oluştur
            </a>
          </div>
        ) : (
          <div className="grid gap-6">
            {siparisler.map((siparis) => (
              <div key={siparis.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                <div className="p-6 md:p-8 flex flex-wrap items-center justify-between gap-6">
                  {/* Sol Kısım: Ders Bilgisi */}
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getDurumStil(siparis.durum)}`}>
                        {siparis.durum === "onaylandi" ? "Onaylandı" : siparis.durum === "teslim_alindi" ? "Teslim Edildi" : "Beklemede"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{siparis.tarih}</span>
                    </div>
                    <h3 className="text-lg font-black text-gray-800 tracking-tight leading-tight mb-1">
                      {siparis.dersAdi}
                    </h3>
                    <p className="text-sm font-bold text-red-700 italic">{siparis.hafta}</p>
                  </div>

                  {/* Orta Kısım: Ürün Sayısı */}
                  <div className="hidden md:block px-8 border-x border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Malzeme Sayısı</p>
                    <p className="text-sm font-black text-gray-700">{siparis.urunler.length} Kalem Ürün</p>
                  </div>

                  {/* Sağ Kısım: Tutar ve Detay */}
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tahmini Tutar</p>
                      <p className="text-xl font-black text-gray-900 tracking-tighter">
                        ₺{siparis.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button className="w-12 h-12 flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-red-700 group-hover:text-white rounded-2xl transition-all">
                      <span className="text-xl">→</span>
                    </button>
                  </div>
                </div>

                {/* Alt Kısım: Ürünlerin Mini Listesi (Opsiyonel) */}
                <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50 flex gap-3 overflow-x-auto no-scrollbar">
                  {siparis.urunler.slice(0, 5).map((u, i) => (
                    <span key={i} className="whitespace-nowrap bg-white border border-gray-100 text-[10px] font-bold text-gray-500 px-3 py-1 rounded-full">
                      {u.urunAdi}
                    </span>
                  ))}
                  {siparis.urunler.length > 5 && (
                    <span className="text-[10px] font-black text-gray-300 py-1">+{siparis.urunler.length - 5} daha</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}