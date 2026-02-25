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
    { name: "Ortak Reçete Havuzu", path: "/receteler" },
    { name: "Ders Programı", path: "/ders-programi" },
    { name: "Etkinlik Takvimi", path: "/etkinlik-takvimi" },
  ],
  ogretmen: [
    { name: "Ana Sayfa", path: "/ogretmen" },
    { name: "Alışveriş Listelerim", path: "/alisveris-listelerim" },
    { name: "Siparişlerim", path: "/siparislerim" },
    { name: "Talep Oluştur", path: "/talep" },
    { name: "Tarif Defterim", path: "/receteler" },
    { name: "Etkinlik Takvimi", path: "/etkinlik-takvimi" },
    { name: "Ders Programım", path: "/ders-programim" },
  ],
  satin_alma: [
    { name: "Ana Sayfa", path: "/satin" },
  ],
  stok: [
    { name: "Ana Sayfa", path: "/stok" },
  ],
  bolum_baskani: [
    { name: "Ana Sayfa", path: "/bolum-baskani" },
    { name: "Envanter Sayım", path: "/bolum-baskani/envanter-sayim" },
    { name: "Ders Yönetimi", path: "/dersler" },
    { name: "Ders Programı", path: "/ders-programi" },
    { name: "Etkinlik Takvimi", path: "/etkinlik-takvimi" },
  ],
  "bolum-baskani": [
    { name: "Ana Sayfa", path: "/bolum-baskani" },
    { name: "Envanter Sayım", path: "/bolum-baskani/envanter-sayim" },
    { name: "Ders Yönetimi", path: "/dersler" },
    { name: "Ders Programı", path: "/ders-programi" },
    { name: "Etkinlik Takvimi", path: "/etkinlik-takvimi" },
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

  const handleLogout = () => {
    localStorage.removeItem("aktifKullaniciId");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    router.push("/");
  };

  if (!kullanici) return null;

  const menu = ROLE_MENUS[kullanici.role] ?? [];
  const initials = (kullanici.ad_soyad || kullanici.username)
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-zinc-100">

      {/* ─── SIDEBAR ─────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col fixed h-screen z-40"
        style={{ background: "#B71C1C" }}>

        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black" style={{ color: "#B71C1C" }}>İRÜ</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">FoodFlow</p>
              <p className="text-white/50 text-xs">Yönetim Sistemi</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menu.map((item) => {
            const aktif = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  aktif
                    ? "bg-white text-red-800 font-semibold shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Kullanıcı */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate leading-tight">
                {kullanici.ad_soyad || kullanici.username}
              </p>
              <p className="text-white/50 text-xs truncate">
                {ROL_LABEL[kullanici.role] ?? kullanici.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-sm font-medium py-2 rounded-lg border border-white/20 text-white/75 hover:bg-white/10 hover:text-white transition-all"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ─── ANA İÇERİK ─────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: 240 }}>

        {/* Header */}
        {title && (
          <div className="bg-white border-b border-zinc-200 px-8 py-5 flex-shrink-0">
            {subtitle && (
              <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "#B71C1C" }}>
                {subtitle}
              </p>
            )}
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">{title}</h1>
          </div>
        )}

        {/* İçerik */}
        <div className="flex-1 p-8 bg-zinc-50">
          {children}
        </div>
      </main>
    </div>
  );
}
