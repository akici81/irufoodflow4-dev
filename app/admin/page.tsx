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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
      </div>
    </DashboardLayout>
  );

  if (!yetkili) return null;

  return (
    <DashboardLayout title="Sistem Yöneticisi Paneli" subtitle="Tüm Sistem İşlevlerine Tam Erişim">
      <div className="space-y-6">

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Toplam Kullanıcı</p>
            <p className="text-4xl font-bold" style={{color: '#2563eb'}}>{istatistik.kullaniciSayisi}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Toplam Ürün</p>
            <p className="text-4xl font-bold" style={{color: '#f97316'}}>{istatistik.urunSayisi}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Toplam Ders</p>
            <p className="text-4xl font-bold" style={{color: '#16a34a'}}>{istatistik.dersSayisi}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alışveriş Listeleri</p>
            <p className="text-4xl font-bold" style={{color: '#9333ea'}}>{istatistik.siparisSayisi}</p>
          </div>
        </div>

        {/* Yönetim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/kullanicilar" className="block">
            <div className="bg-white rounded-xl border-2 border-blue-100 p-6 shadow-sm hover:shadow-md transition-all hover:border-blue-300">
              <h3 className="text-lg font-bold mb-1" style={{color: '#1d4ed8'}}>Kullanıcı Yönetimi</h3>
              <p className="text-sm text-gray-500 mb-4">Tüm kullanıcıları ekleyin, düzenleyin, silin ve yetkilendirin</p>
              <ul className="space-y-1">
                {["Kullanıcı CRUD İşlemleri", "Rol ve Yetki Atama", "Ders Atama", "Şifre Yönetimi"].map(f => (
                  <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </Link>

          <Link href="/urun-havuzu" className="block">
            <div className="bg-white rounded-xl border-2 border-orange-100 p-6 shadow-sm hover:shadow-md transition-all hover:border-orange-300">
              <h3 className="text-lg font-bold mb-1" style={{color: '#c2410c'}}>Ürün Yönetimi</h3>
              <p className="text-sm text-gray-500 mb-4">Tüm ürün işlemlerini tam kontrolle yönetin</p>
              <ul className="space-y-1">
                {["Ürün Ekleme/Silme/Düzenleme", "Excel&apos;den Toplu Yükleme", "Fiyat ve Miktar Yönetimi", "Kategori Yönetimi"].map(f => (
                  <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </Link>

          <Link href="/siparisler" className="block">
            <div className="bg-white rounded-xl border-2 border-green-100 p-6 shadow-sm hover:shadow-md transition-all hover:border-green-300">
              <h3 className="text-lg font-bold mb-1" style={{color: '#15803d'}}>Alışveriş Listeleri</h3>
              <p className="text-sm text-gray-500 mb-4">Sistem genelindeki tüm alışveriş listelerini yönetin</p>
              <ul className="space-y-1">
                {["Tüm Listeleri Görme", "Onay ve Kontrol", "Düzenlemeler Yapma"].map(f => (
                  <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </Link>

          <Link href="/siparis-yonetimi" className="block">
            <div className="bg-white rounded-xl border-2 border-purple-100 p-6 shadow-sm hover:shadow-md transition-all hover:border-purple-300">
              <h3 className="text-lg font-bold mb-1" style={{color: '#7e22ce'}}>Sipariş Yönetimi</h3>
              <p className="text-sm text-gray-500 mb-4">Sistem genelinde raporlar ve istatistikler</p>
              <ul className="space-y-1">
                {["Tüm Siparişleri Görme", "Öğretmen/Ders Filtresi", "Detay ve Silme"].map(f => (
                  <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </Link>
        </div>

      </div>
    </DashboardLayout>
  );
}