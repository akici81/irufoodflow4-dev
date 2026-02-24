"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Kullanici = {
  id: number;
  username: string;
  ad_soyad: string;
  role: string;
};

const ROLE_MENUS: Record<string, { name: string; path: string; icon: string }[]> = {
  admin: [
    { name: "Genel Bakış", path: "/admin", icon: "📊" },
    { name: "Ürün Havuzu", path: "/urun-havuzu", icon: "📦" },
    { name: "Reçete Havuzu", path: "/receteler", icon: "🍲" },
    { name: "Kullanıcı Yönetimi", path: "/kullanicilar", icon: "👥" },
    { name: "Ders Planlama", path: "/dersler", icon: "📖" },
    { name: "Alışveriş Listeleri", path: "/siparisler", icon: "🛒" },
    { name: "Sipariş Onayları", path: "/siparis-yonetimi", icon: "⚙️" },
  ],
  ogretmen: [
    { name: "Öğretmen Paneli", path: "/ogretmen", icon: "🏠" },
    { name: "Ürün Kataloğu", path: "/urun-havuzu", icon: "📦" },
    { name: "Reçete Arşivi", path: "/receteler", icon: "🍲" },
    { name: "Talep Listelerim", path: "/alisveris-listelerim", icon: "📋" },
    { name: "Sipariş Takibi", path: "/siparislerim", icon: "🛍️" },
    { name: "Malzeme Talebi Yap", path: "/talep", icon: "✨" },
  ],
  satin_alma: [
    { name: "Satın Alma Paneli", path: "/satin", icon: "🏠" },
    { name: "Aktif Siparişler", path: "/siparisler", icon: "🛒" },
  ],
  "bolum-baskani": [
    { name: "Bölüm Yönetimi", path: "/bolum-baskani", icon: "🏛️" },
    { name: "Ders Atamaları", path: "/dersler", icon: "📚" },
  ],
  bolum_baskani: [
    { name: "Bölüm Yönetimi", path: "/bolum-baskani", icon: "🏛️" },
    { name: "Ders Atamaları", path: "/dersler", icon: "📚" },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchKullanici = async () => {
      const id = localStorage.getItem("aktifKullaniciId");
      if (!id) { router.push("/"); return; }
      const { data, error } = await supabase.from("kullanicilar").select("id, username, ad_soyad, role").eq("id", id).single();
      if (error || !data) { router.push("/"); return; }
      setKullanici(data);
    };
    fetchKullanici();
  }, [router]);

  if (!kullanici) return null;

  const menu = ROLE_MENUS[kullanici.role] ?? [];
  const initials = (kullanici.ad_soyad || kullanici.username).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-geist">

      {/* Mobil Menü Butonu */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-primary-900 hover:bg-primary-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-primary-700 transition-all"
      >
        {sidebarOpen ? '✕ Kapat' : '☰ Menü'}
      </button>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Yan Menü (Sidebar) */}
      <aside className={`w-80 bg-white border-r border-gray-200 flex flex-col fixed lg:static h-screen z-40 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo Alanı */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-center h-16 mb-2">
            <Image
              src="/logo.png"
              alt="İRÜ FoodFlow Logo"
              width={200}
              height={64}
              className="h-14 w-auto object-contain"
              priority
            />
          </div>
          <p className="text-center text-xs font-semibold text-gray-600 uppercase tracking-widest">
            Eğitim Mutfağı Yönetim Sistemi
          </p>
        </div>

        {/* Menü Öğeleri */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menu.map((item) => {
            const aktif = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-[1.5rem] text-sm font-medium transition-all ${
                  aktif
                    ? "bg-primary-900 text-white shadow-lg shadow-primary-900/20"
                    : "text-gray-600 hover:bg-gray-50 hover:text-primary-900"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Kullanıcı Bilgisi */}
        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-900 to-primary-700 rounded-xl shadow-sm flex items-center justify-center font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{kullanici.ad_soyad}</p>
                <p className="text-xs text-gray-700 font-medium">{ROL_LABEL[kullanici.role]}</p>
              </div>
            </div>
            <button
              onClick={() => { localStorage.clear(); router.push("/"); }}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs py-2.5 rounded-xl border border-gray-200 transition-all uppercase tracking-tight"
            >
              Sistemden Çık
            </button>
          </div>
        </div>
      </aside>

      {/* İçerik Alanı */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        {title && (
          <header className="bg-white border-b border-gray-200 px-10 py-6 flex-shrink-0">
            <div className="max-w-7xl mx-auto">
              {subtitle && (
                <span className="text-primary-900 text-xs font-bold uppercase tracking-widest mb-2 block">
                  {subtitle}
                </span>
              )}
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-auto p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}