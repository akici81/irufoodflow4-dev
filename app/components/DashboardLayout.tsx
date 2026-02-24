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
    <div className="min-h-screen flex bg-gray-100 text-gray-900">

      {/* Yan Menü (Sidebar) */}
      <aside className="w-60 flex flex-col fixed h-screen z-40" style={{backgroundColor: '#ffffff', borderRight: '1px solid #e5e7eb'}}>

        {/* Logo Alanı */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#b91c1c'}}>
            <span className="text-white font-black text-xs">İRÜ</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">İRÜFoodFlow</span>
        </div>

        {/* Menü Öğeleri */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menu.map((item) => {
            const aktif = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  aktif
                    ? "text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                style={aktif ? {backgroundColor: '#b91c1c'} : {}}
              >
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Kullanıcı Bilgisi */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{backgroundColor: '#b91c1c'}}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{kullanici.ad_soyad}</p>
              <p className="text-xs text-gray-500">{ROL_LABEL[kullanici.role]}</p>
            </div>
          </div>
          <button
            onClick={() => { localStorage.clear(); router.push("/"); }}
            className="w-full text-sm font-medium py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            style={{color: '#b91c1c'}}
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* İçerik Alanı */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden" style={{marginLeft: '240px'}}>
        {title && (
          <header className="px-8 py-5 flex-shrink-0 text-white" style={{backgroundColor: '#b91c1c'}}>
            {subtitle && (
              <span className="text-red-200 text-xs font-semibold uppercase tracking-widest mb-1 block">
                {subtitle}
              </span>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </header>
        )}

        <div className="flex-1 overflow-auto p-8 bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  );
}