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
    <div className="min-h-screen flex bg-[#F9FAFB] text-slate-900 font-sans">
      
      {/* Mobil Menü Butonu */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#8B1A1A] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/10"
      >
        {sidebarOpen ? '✕ Kapat' : '☰ Menü'}
      </button>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Yan Menü (Sidebar) */}
      <aside className={`w-80 bg-white border-r border-slate-200 flex flex-col fixed lg:static h-screen z-40 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Logo Alanı - Senin Logona Uygun */}
        <div className="p-8 border-b border-slate-50">
          <div className="flex flex-col gap-1">
            <h2 className="font-extrabold text-2xl tracking-tighter text-[#8B1A1A]">İRÜ<span className="text-slate-800 font-light">FoodFlow</span></h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Eğitim Mutfakları Yönetim Sistemi
            </p>
          </div>
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
                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[14px] font-medium transition-all ${
                  aktif
                    ? "bg-[#8B1A1A] text-white shadow-lg shadow-red-900/20"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#8B1A1A]"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Kullanıcı Bilgisi */}
        <div className="p-6 mt-auto">
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-[#8B1A1A] border border-slate-100">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-800 truncate">{kullanici.ad_soyad}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{ROL_LABEL[kullanici.role]}</p>
              </div>
            </div>
            <button
              onClick={() => { localStorage.clear(); router.push("/"); }}
              className="w-full bg-white text-slate-600 hover:text-red-700 font-bold text-[11px] py-2.5 rounded-xl border border-slate-200 transition-all uppercase tracking-tight"
            >
              Sistemden Çık
            </button>
          </div>
        </div>
      </aside>

      {/* İçerik Alanı */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F9FAFB]">
        {title && (
          <header className="bg-white border-b border-slate-200 px-10 py-7 flex-shrink-0">
            <div className="max-w-7xl mx-auto">
              {subtitle && (
                <span className="text-[#8B1A1A] text-[10px] font-bold uppercase tracking-[0.3em] mb-1 block">
                  {subtitle}
                </span>
              )}
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
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