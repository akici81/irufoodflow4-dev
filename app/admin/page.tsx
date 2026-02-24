"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../hooks/useAuth";

export default function AdminAnaSayfa() {
  const { yetkili, yukleniyor } = useAuth("/admin");

  const [istatistik, setIstatistik] = useState({
    kullaniciSayisi: 0,
    urunSayisi: 0,
    dersSayisi: 0,
    siparisSayisi: 0,
  });

  useEffect(() => {
    const fetchIstatistik = async () => {
      // Count sorgularını optimize ederek çekiyoruz
      const [kullanicilar, urunler, dersler, siparisler] = await Promise.all([
        supabase.from("kullanicilar").select("id", { count: "exact", head: true }),
        supabase.from("urunler").select("id", { count: "exact", head: true }),
        supabase.from("dersler").select("id", { count: "exact", head: true }),
        supabase.from("siparisler").select("id", { count: "exact", head: true }),
      ]);

      setIstatistik({
        kullaniciSayisi: kullanicilar.count ?? 0,
        urunSayisi: urunler.count ?? 0,
        dersSayisi: dersler.count ?? 0,
        siparisSayisi: siparisler.count ?? 0,
      });
    };

    if (yetkili) fetchIstatistik();
  }, [yetkili]);

  if (yukleniyor) return (
    <DashboardLayout title="Yükleniyor...">
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    </DashboardLayout>
  );

  if (!yetkili) return null;

  const kartlar = [
    { label: "Toplam Kullanıcı", deger: istatistik.kullaniciSayisi, renk: "from-blue-500 to-blue-600", ikon: "👤" },
    { label: "Toplam Ürün", deger: istatistik.urunSayisi, renk: "from-orange-400 to-orange-500", ikon: "📦" },
    { label: "Toplam Ders", deger: istatistik.dersSayisi, renk: "from-emerald-500 to-emerald-600", ikon: "🎓" },
    { label: "Aktif Listeler", deger: istatistik.siparisSayisi, renk: "from-purple-500 to-purple-600", ikon: "📝" },
  ];

  const islemler = [
    {
      baslik: "Kullanıcı Yönetimi",
      aciklama: "Sistem personeli, öğretmenler ve yetki seviyelerini kontrol edin.",
      renk: "hover:border-blue-200 group-hover:bg-blue-50",
      baslikRenk: "text-blue-700",
      ozellikler: ["Rol Atama", "Ders Yetkilendirme", "Şifre Sıfırlama"],
      link: "/kullanicilar",
      ikon: "⚙️"
    },
    {
      baslik: "Ürün & Envanter",
      aciklama: "Ürün havuzunu güncel tutun, fiyat ve stok verilerini yönetin.",
      renk: "hover:border-orange-200 group-hover:bg-orange-50",
      baslikRenk: "text-orange-700",
      ozellikler: ["Excel Aktarımı", "Fiyat Güncelleme", "Kategori Bazlı Takip"],
      link: "/urun-havuzu",
      ikon: "📊"
    },
    {
      baslik: "Alışveriş Talepleri",
      aciklama: "Öğretmenlerden gelen malzeme listelerini inceleyin ve onaylayın.",
      renk: "hover:border-emerald-200 group-hover:bg-emerald-50",
      baslikRenk: "text-emerald-700",
      ozellikler: ["Talep İnceleme", "Miktar Onayı", "Bütçe Kontrolü"],
      link: "/siparisler",
      ikon: "🛒"
    },
    {
      baslik: "Raporlama Merkezi",
      aciklama: "Sipariş geçmişini ve ders bazlı tüketim raporlarını analiz edin.",
      renk: "hover:border-purple-200 group-hover:bg-purple-50",
      baslikRenk: "text-purple-700",
      ozellikler: ["Geçmiş Analizi", "Ders Filtreleme", "PDF Çıktısı"],
      link: "/siparis-yonetimi",
      ikon: "📋"
    },
  ];

  return (
    <DashboardLayout title="Yönetim Merkezi" subtitle="Sistem genelindeki tüm operasyonları buradan izleyebilir ve yönetebilirsiniz.">
      <div className="max-w-7xl space-y-10">

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kartlar.map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-2xl opacity-80">{k.ikon}</span>
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest leading-none pt-1">{k.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black italic bg-gradient-to-br ${k.renk} bg-clip-text text-transparent`}>
                  {k.deger}
                </span>
                <span className="text-gray-600 font-bold text-xs uppercase italic tracking-tighter">Birim</span>
              </div>
            </div>
          ))}
        </div>

        {/* Hızlı Erişim Başlığı */}
        <div className="flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-gray-200"></div>
          <h2 className="text-[11px] font-black text-gray-700 uppercase tracking-[0.3em] italic">Hızlı Erişim Menüsü</h2>
          <div className="h-[1px] flex-1 bg-gray-200"></div>
        </div>

        {/* Hızlı Erişim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
          {islemler.map((i) => (
            <Link key={i.link} href={i.link} className="group">
              <div className={`bg-white rounded-2xl border border-gray-200 p-10 h-full transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-gray-200/50 ${i.renk}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{i.ikon}</span>
                    <h3 className={`text-xl font-black uppercase italic tracking-tighter ${i.baslikRenk}`}>{i.baslik}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-primary-900 group-hover:text-white transition-all">
                    →
                  </div>
                </div>
                <p className="text-gray-800 text-sm font-medium leading-relaxed mb-8">{i.aciklama}</p>
                <div className="flex flex-wrap gap-2">
                  {i.ozellikler.map((o) => (
                    <span key={o} className="bg-gray-100 text-gray-700 text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full group-hover:bg-white group-hover:text-gray-700 transition-colors border border-transparent group-hover:border-gray-200">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bilgilendirme Banner */}
        <div className="bg-primary-900 rounded-2xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-2xl font-black italic tracking-tighter mb-2 uppercase">Sistem Durumu: Çevrimiçi</h3>
            <p className="text-white/60 text-sm font-medium max-w-md">Veritabanı bağlantısı aktif. Tüm modüller sorunsuz çalışıyor. Son yedekleme: Bugün 04:00.</p>
          </div>
          <Link href="/ayarlar" className="relative z-10 bg-white text-primary-900 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg">
            Sistem Ayarları →
          </Link>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        </div>

      </div>
    </DashboardLayout>
  );
}