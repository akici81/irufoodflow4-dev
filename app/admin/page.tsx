"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";

export default function AdminAnaSayfa() {
  const [istatistik, setIstatistik] = useState({
    kullaniciSayisi: 0,
    urunSayisi: 0,
    dersSayisi: 0,
    siparisSayisi: 0,
  });

  useEffect(() => {
    const fetchIstatistik = async () => {
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
    fetchIstatistik();
  }, []);

  const kartlar = [
    { label: "Toplam Kullanıcı", deger: istatistik.kullaniciSayisi, renk: "#2563EB", bg: "#EFF6FF" },
    { label: "Toplam Ürün",      deger: istatistik.urunSayisi,      renk: "#EA580C", bg: "#FFF7ED" },
    { label: "Toplam Ders",      deger: istatistik.dersSayisi,      renk: "#16A34A", bg: "#F0FDF4" },
    { label: "Alışveriş Listeleri", deger: istatistik.siparisSayisi, renk: "#7C3AED", bg: "#F5F3FF" },
  ];

  const islemler = [
    {
      baslik: "Kullanıcı Yönetimi",
      aciklama: "Tüm kullanıcıları ekleyin, düzenleyin, silin ve yetkilendirin",
      ozellikler: ["Kullanıcı CRUD İşlemleri", "Rol ve Yetki Atama", "Ders Atama", "Şifre Yönetimi"],
      link: "/kullanicilar",
      renk: "#2563EB",
      border: "#BFDBFE",
      bg: "#EFF6FF",
    },
    {
      baslik: "Ürün Yönetimi",
      aciklama: "Tüm ürün işlemlerini tam kontrolle yönetin",
      ozellikler: ["Ürün Ekleme/Silme/Düzenleme", "Excel'den Toplu Yükleme", "Fiyat ve Miktar Yönetimi", "Kategori Yönetimi"],
      link: "/urun-havuzu",
      renk: "#EA580C",
      border: "#FED7AA",
      bg: "#FFF7ED",
    },
    {
      baslik: "Alışveriş Listeleri",
      aciklama: "Sistem genelindeki tüm alışveriş listelerini yönetin",
      ozellikler: ["Tüm Listeleri Görme", "Onay ve Kontrol", "Düzenlemeler Yapma"],
      link: "/siparisler",
      renk: "#16A34A",
      border: "#BBF7D0",
      bg: "#F0FDF4",
    },
    {
      baslik: "Sipariş Yönetimi",
      aciklama: "Sistem genelinde raporlar ve istatistikler",
      ozellikler: ["Tüm Siparişleri Görme", "Öğretmen/Ders Filtresi", "Detay ve Silme"],
      link: "/siparis-yonetimi",
      renk: "#7C3AED",
      border: "#DDD6FE",
      bg: "#F5F3FF",
    },
  ];

  return (
    <DashboardLayout title="Sistem Yöneticisi Paneli" subtitle="Tüm sistem işlevlerine tam erişim">
      <div className="max-w-5xl space-y-6">

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kartlar.map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-zinc-200 p-5 shadow-sm"
              style={{ background: k.bg }}
            >
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">{k.label}</p>
              <p className="text-4xl font-bold" style={{ color: k.renk }}>{k.deger}</p>
            </div>
          ))}
        </div>

        {/* Hızlı Erişim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {islemler.map((i) => (
            <Link key={i.link} href={i.link} className="group block">
              <div
                className="h-full rounded-2xl border-2 p-6 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 bg-white"
                style={{ borderColor: i.border }}
              >
                <h3 className="font-bold text-base mb-1" style={{ color: i.renk }}>{i.baslik}</h3>
                <p className="text-zinc-500 text-sm mb-4">{i.aciklama}</p>
                <ul className="space-y-1.5">
                  {i.ozellikler.map((o) => (
                    <li key={o} className="text-sm text-zinc-600 flex items-center gap-2">
                      <span className="text-emerald-500 text-xs flex-shrink-0">✓</span>
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
}
