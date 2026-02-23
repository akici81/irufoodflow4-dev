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
 { name: " Ana Sayfa", path: "/admin" },
 { name: " Ürün Havuzu", path: "/urun-havuzu" },
 { name: " Reçete Havuzu", path: "/receteler" },
 { name: " Kullanıcılar", path: "/kullanicilar" },
 { name: " Dersler", path: "/dersler" },
 { name: " Alışveriş Listeleri", path: "/siparisler" },
 { name: " Sipariş Yönetimi", path: "/siparis-yonetimi" },
 ],
 ogretmen: [
 { name: " Ana Sayfa", path: "/ogretmen" },
 { name: " Ürün Havuzu", path: "/urun-havuzu" },
 { name: " Reçete Havuzu", path: "/receteler" },
 { name: " Alışveriş Listelerim", path: "/alisveris-listelerim" },
 { name: " Siparişlerim", path: "/siparislerim" },
 { name: " Talep Oluştur", path: "/talep" },
 ],
 satin_alma: [
 { name: " Ana Sayfa", path: "/satin" },
 ],
 stok: [
 { name: " Ana Sayfa", path: "/stok" },
 ],
 bolum_baskani: [
 { name: " Ana Sayfa", path: "/bolum-baskani" },
 { name: " Ders Yönetimi", path: "/dersler" },
 ],
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
 .split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

 return (
 <div className="min-h-screen flex bg-gray-100">
 {/* Mobile menu button */}
 <button
 onClick={() => setSidebarOpen(!sidebarOpen)}
 className="lg:hidden fixed top-4 right-4 z-50 bg-red-700 text-white p-3 rounded-lg shadow-lg"
 >
 {sidebarOpen ? '' : ''}
 </button>

 {/* Overlay */}
 {sidebarOpen && (
 <div
 className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
 onClick={() => setSidebarOpen(false)}
 />
 )}

 {/* Sidebar */}
 <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm flex-shrink-0 fixed lg:static h-screen z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
 {/* Logo */}
 <div className="px-6 py-5 border-b border-gray-100">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 bg-red-700 rounded-lg flex items-center justify-center flex-shrink-0">
 <span className="text-white text-xs font-bold">İRÜ</span>
 </div>
 <span className="font-bold text-gray-800">İRÜFoodFlow</span>
 </div>
 </div>

 {/* Nav */}
 <nav className="flex-1 px-3 py-4 space-y-0.5">
 {menu.map((item) => {
 const aktif = pathname === item.path;
 return (
 <Link
 key={item.path}
 href={item.path}
 className={`flex items-center px-4 py-2.5 rounded-xl text-sm transition-all ${
 aktif
 ? "bg-red-50 text-red-700 font-semibold"
 : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
 }`}
 >
 {item.name}
 </Link>
 );
 })}
 </nav>

 {/* Kullanıcı */}
 <div className="px-4 py-4 border-t border-gray-100">
 <div className="flex items-center gap-3 mb-3">
 <div className="w-9 h-9 bg-red-700 rounded-full flex items-center justify-center flex-shrink-0">
 <span className="text-white text-xs font-bold">{initials}</span>
 </div>
 <div className="min-w-0">
 <p className="text-sm font-semibold text-gray-800 truncate">
 {kullanici.ad_soyad || kullanici.username}
 </p>
 <p className="text-xs text-gray-400">{kullanici.role}</p>
 </div>
 </div>
 <button
 onClick={handleLogout}
 className="w-full text-sm text-red-600 hover:text-red-700 font-medium py-2 rounded-xl hover:bg-red-50 transition"
 >
 Çıkış Yap
 </button>
 </div>
 </aside>

 {/* İçerik */}
 <main className="flex-1 flex flex-col overflow-auto pt-16 lg:pt-0">
 {title && (
 <div className="bg-red-700 text-white px-10 py-7 flex-shrink-0">
 {subtitle && (
 <p className="text-red-300 text-xs font-medium uppercase tracking-widest mb-1">
 {subtitle}
 </p>
 )}
 <h1 className="text-2xl font-bold">{title}</h1>
 </div>
 )}
 <div className="flex-1 p-8">{children}</div>
 </main>
 </div>
 );
}