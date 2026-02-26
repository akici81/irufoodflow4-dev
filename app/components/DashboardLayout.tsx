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
    { name: "Ürün Havuzu", path: "/urun-havuzu" },
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
    { name: "Ürün Havuzu", path: "/urun-havuzu" },
    { name: "Ders Yönetimi", path: "/dersler" },
    { name: "Ders Programı", path: "/ders-programi" },
    { name: "Etkinlik Takvimi", path: "/etkinlik-takvimi" },
  ],
  "bolum-baskani": [
    { name: "Ana Sayfa", path: "/bolum-baskani" },
    { name: "Envanter Sayım", path: "/bolum-baskani/envanter-sayim" },
    { name: "Ürün Havuzu", path: "/urun-havuzu" },
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
  const [sifreModal, setSifreModal] = useState(false);
  const [sifreForm, setSifreForm] = useState({ mevcutSifre: "", yeniSifre: "", tekrar: "" });
  const [sifreBildirim, setSifreBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [sifreYukleniyor, setSifreYukleniyor] = useState(false);

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

  const handleSifreDegistir = async () => {
    if (!sifreForm.yeniSifre || !sifreForm.mevcutSifre) {
      setSifreBildirim({ tip: "hata", metin: "Tüm alanları doldurun." }); return;
    }
    if (sifreForm.yeniSifre !== sifreForm.tekrar) {
      setSifreBildirim({ tip: "hata", metin: "Yeni şifreler eşleşmiyor." }); return;
    }
    if (sifreForm.yeniSifre.length < 4) {
      setSifreBildirim({ tip: "hata", metin: "Şifre en az 4 karakter olmalı." }); return;
    }
    setSifreYukleniyor(true);
    const { data } = await supabase.from("kullanicilar").select("password_hash").eq("id", kullanici!.id).single();
    if (!data || data.password_hash !== sifreForm.mevcutSifre) {
      setSifreBildirim({ tip: "hata", metin: "Mevcut şifre yanlış." });
      setSifreYukleniyor(false); return;
    }
    await supabase.from("kullanicilar").update({ password_hash: sifreForm.yeniSifre }).eq("id", kullanici!.id);
    setSifreBildirim({ tip: "basari", metin: "Şifre başarıyla güncellendi!" });
    setSifreYukleniyor(false);
    setSifreForm({ mevcutSifre: "", yeniSifre: "", tekrar: "" });
    setTimeout(() => { setSifreModal(false); setSifreBildirim(null); }, 1500);
  };

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
            const aktif = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path) && item.path.length > 1);
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
          {(kullanici.role === "ogretmen" || kullanici.role === "bolum_baskani" || kullanici.role === "bolum-baskani") && (
            <button
              onClick={() => { setSifreModal(true); setSifreForm({ mevcutSifre: "", yeniSifre: "", tekrar: "" }); setSifreBildirim(null); }}
              className="w-full text-xs font-medium py-1.5 rounded-lg text-white/50 hover:text-white/80 transition-all mb-1.5 text-left px-1"
            >
              🔑 Şifre Değiştir
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-sm font-medium py-2 rounded-lg border border-white/20 text-white/75 hover:bg-white/10 hover:text-white transition-all"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ─── ŞİFRE DEĞİŞTİR MODAL ─────────────── */}
      {sifreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSifreModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Şifre Değiştir</h3>
              <button onClick={() => setSifreModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {sifreBildirim && (
              <div className={`text-xs rounded-lg px-3 py-2 font-medium ${sifreBildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {sifreBildirim.metin}
              </div>
            )}
            {[
              { label: "Mevcut Şifre", key: "mevcutSifre" },
              { label: "Yeni Şifre", key: "yeniSifre" },
              { label: "Yeni Şifre Tekrar", key: "tekrar" },
            ].map(({ label, key }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-700">{label}</label>
                <input
                  type="password"
                  value={(sifreForm as any)[key]}
                  onChange={(e) => setSifreForm(f => ({ ...f, [key]: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            ))}
            <button
              onClick={handleSifreDegistir}
              disabled={sifreYukleniyor}
              className="w-full bg-red-700 hover:bg-red-800 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {sifreYukleniyor ? "Güncelleniyor..." : "Güncelle"}
            </button>
          </div>
        </div>
      )}

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