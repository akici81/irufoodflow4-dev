"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Kullanici = {
  id: number;
  username: string;
  ad_soyad: string;
  role: string;
};

const ROLE_MENUS: Record<string, { name: string; path: string }[]> = {
  admin: [
    { name: "Ana Sayfa", path: "/admin" },
    { name: "Ürün Havuzu", path: "/urun-havuzu" },
    { name: "Kullanıcılar", path: "/kullanicilar" },
    { name: "Dersler", path: "/dersler" },
    { name: "Alışveriş Listeleri", path: "/siparisler" },
    { name: "Sipariş Yönetimi", path: "/siparis-yonetimi" },
  ],
  ogretmen: [
    { name: "Ana Sayfa", path: "/ogretmen" },
    { name: "Ürün Havuzu", path: "/urun-havuzu" },
    { name: "Alışveriş Listelerim", path: "/alisveris-listelerim" },
    { name: "Siparişlerim", path: "/siparislerim" },
    { name: "Talep Oluştur", path: "/talep" },
  ],
  satin_alma: [
    { name: "Satın Alma Paneli", path: "/satin" },
    { name: "Aktif Siparişler", path: "/siparisler" },
  ],
  "bolum-baskani": [
    { name: "Bölüm Yönetimi", path: "/bolum-baskani" },
    { name: "Ders Atamaları", path: "/dersler" },
  ],
  bolum_baskani: [
    { name: "Bölüm Yönetimi", path: "/bolum-baskani" },
    { name: "Ders Atamaları", path: "/dersler" },
  ],
};

const ROL_LABEL: Record<string, string> = {
  admin: "Sistem Yöneticisi",
  ogretmen: "Öğretim Görevlisi",
  satin_alma: "Satın Alma Birimi",
  stok: "Stok Birimi",
  "bolum-baskani": "Bölüm Başkanı",
  bolum_baskani: "Bölüm Başkanı",
};

const RED = "#B71C1C";

export default function DashboardLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);

  useEffect(() => {
    const fetchKullanici = async () => {
      const id = localStorage.getItem("aktifKullaniciId");
      if (!id) { router.push("/"); return; }
      const { data, error } = await supabase
        .from("kullanicilar")
        .select("id, username, ad_soyad, role")
        .eq("id", id)
        .single();
      if (error || !data) { router.push("/"); return; }
      setKullanici(data);
    };
    fetchKullanici();
  }, [router]);

  if (!kullanici) return null;

  const menu = ROLE_MENUS[kullanici.role] ?? [];
  const initials = (kullanici.ad_soyad || kullanici.username)
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F4F4F5", fontFamily: "'Cargan', serif" }}>

      {/* SIDEBAR */}
      <aside style={{
        width: 248,
        minWidth: 248,
        background: RED,
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        zIndex: 50,
      }}>

        {/* Logo */}
        <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: "white",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ color: RED, fontWeight: 900, fontSize: 11, letterSpacing: 0.5 }}>İRÜ</span>
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: "1.2" }}>FoodFlow</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: 0.5 }}>Yönetim Sistemi</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {menu.map((item) => {
            const aktif = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} style={{
                display: "block",
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 13.5,
                fontWeight: aktif ? 700 : 500,
                color: aktif ? RED : "rgba(255,255,255,0.8)",
                background: aktif ? "white" : "transparent",
                textDecoration: "none",
                letterSpacing: 0.2,
                transition: "all 0.15s",
              }}>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Kullanici */}
        <div style={{ padding: "16px 16px 20px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 38, height: 38,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "2px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "white", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {kullanici.ad_soyad}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                {ROL_LABEL[kullanici.role]}
              </div>
            </div>
          </div>
          <button
            onClick={() => { localStorage.clear(); router.push("/"); }}
            style={{
              width: "100%", padding: "9px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.8)",
              fontSize: 12, fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Cargan', serif",
              letterSpacing: 0.3,
            }}
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: 248, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Header */}
        {title && (
          <header style={{
            background: "white",
            borderBottom: "1px solid #E4E4E7",
            padding: "20px 36px",
          }}>
            {subtitle && (
              <div style={{ fontSize: 11, fontWeight: 600, color: RED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
                {subtitle}
              </div>
            )}
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#18181B", margin: 0, letterSpacing: 0.2 }}>
              {title}
            </h1>
          </header>
        )}

        <div style={{ flex: 1, overflow: "auto", padding: "32px 36px", background: "#F4F4F5" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
