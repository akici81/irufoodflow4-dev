"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../hooks/useAuth";

const RED = "#B71C1C";

const KARTLAR = [
  { label: "Toplam Kullanıcı", key: "kullaniciSayisi", renk: "#2563EB" },
  { label: "Toplam Ürün",      key: "urunSayisi",      renk: "#EA580C" },
  { label: "Toplam Ders",      key: "dersSayisi",      renk: "#16A34A" },
  { label: "Alışveriş Listeleri", key: "siparisSayisi", renk: "#7C3AED" },
];

const ISLEMLER = [
  {
    baslik: "Kullanıcı Yönetimi",
    aciklama: "Tüm kullanıcıları ekleyin, düzenleyin, silin ve yetkilendirin",
    ozellikler: ["Kullanıcı CRUD İşlemleri", "Rol ve Yetki Atama", "Ders Atama", "Şifre Yönetimi"],
    link: "/kullanicilar",
    renk: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    baslik: "Ürün Yönetimi",
    aciklama: "Tüm ürün işlemlerini tam kontrolle yönetin",
    ozellikler: ["Ürün Ekleme / Silme / Düzenleme", "Excel'den Toplu Yükleme", "Fiyat ve Miktar Yönetimi", "Kategori Yönetimi"],
    link: "/urun-havuzu",
    renk: "#EA580C",
    bg: "#FFF7ED",
    border: "#FED7AA",
  },
  {
    baslik: "Alışveriş Listeleri",
    aciklama: "Sistem genelindeki tüm alışveriş listelerini yönetin",
    ozellikler: ["Tüm Listeleri Görme", "Onay ve Kontrol", "Düzenlemeler Yapma"],
    link: "/siparisler",
    renk: "#16A34A",
    bg: "#F0FDF4",
    border: "#BBF7D0",
  },
  {
    baslik: "Sipariş Yönetimi",
    aciklama: "Sistem genelinde raporlar ve istatistikler",
    ozellikler: ["Tüm Siparişleri Görme", "Öğretmen / Ders Filtresi", "Detay ve Silme"],
    link: "/siparis-yonetimi",
    renk: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
];

export default function AdminAnaSayfa() {
  const { yetkili, yukleniyor } = useAuth("/admin");

  const [istatistik, setIstatistik] = useState({
    kullaniciSayisi: 0,
    urunSayisi: 0,
    dersSayisi: 0,
    siparisSayisi: 0,
  });

  useEffect(() => {
    const fetch = async () => {
      const [k, u, d, s] = await Promise.all([
        supabase.from("kullanicilar").select("id", { count: "exact", head: true }),
        supabase.from("urunler").select("id", { count: "exact", head: true }),
        supabase.from("dersler").select("id", { count: "exact", head: true }),
        supabase.from("siparisler").select("id", { count: "exact", head: true }),
      ]);
      setIstatistik({
        kullaniciSayisi: k.count ?? 0,
        urunSayisi: u.count ?? 0,
        dersSayisi: d.count ?? 0,
        siparisSayisi: s.count ?? 0,
      });
    };
    if (yetkili) fetch();
  }, [yetkili]);

  if (yukleniyor) return (
    <DashboardLayout title="Yükleniyor...">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ width: 40, height: 40, border: `3px solid #E4E4E7`, borderTopColor: RED, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    </DashboardLayout>
  );

  if (!yetkili) return null;

  return (
    <DashboardLayout title="Sistem Yöneticisi Paneli" subtitle="Tüm Sistem İşlevlerine Tam Erişim">
      <div style={{ maxWidth: 960 }}>

        {/* Istatistik kartlari */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {KARTLAR.map((k) => (
            <div key={k.key} style={{
              background: "white",
              borderRadius: 12,
              padding: "20px 24px",
              border: "1px solid #E4E4E7",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#71717A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: k.renk, lineHeight: 1 }}>
                {(istatistik as Record<string, number>)[k.key]}
              </div>
            </div>
          ))}
        </div>

        {/* Yonetim kartlari */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {ISLEMLER.map((i) => (
            <Link key={i.link} href={i.link} style={{ textDecoration: "none" }}>
              <div style={{
                background: "white",
                borderRadius: 12,
                padding: "24px",
                border: `1.5px solid ${i.border}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.15s, transform 0.15s",
                cursor: "pointer",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, color: i.renk, margin: "0 0 6px" }}>{i.baslik}</h3>
                <p style={{ fontSize: 13, color: "#71717A", margin: "0 0 16px", lineHeight: 1.5 }}>{i.aciklama}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {i.ozellikler.map((o) => (
                    <div key={o} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: i.renk, flexShrink: 0, opacity: 0.6 }} />
                      <span style={{ fontSize: 12.5, color: "#52525B" }}>{o}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
