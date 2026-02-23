"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../hooks/useAuth";

export default function AdminAnaSayfa() {
  const { yetkili, yukleniyor } = useAuth("/admin");
  if (yukleniyor) return <div className="min-h-screen flex items-center justify-center text-gray-400">Yükleniyor...</div>;
  if (!yetkili) return null;
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
 { label: "Toplam Kullanıcı", deger: istatistik.kullaniciSayisi, emoji: "", renk: "text-blue-600" },
 { label: "Toplam Ürün", deger: istatistik.urunSayisi, emoji: "", renk: "text-orange-500" },
 { label: "Toplam Ders", deger: istatistik.dersSayisi, emoji: "", renk: "text-green-600" },
 { label: "Alışveriş Listeleri", deger: istatistik.siparisSayisi, emoji: "", renk: "text-purple-600" },
 ];

 const islemler = [
 {
 baslik: "Kullanıcı Yönetimi",
 aciklama: "Tüm kullanıcıları ekleyin, düzenleyin, silin ve yetkilendirin",
 emoji: "",
 renk: "border-blue-200",
 baslikRenk: "text-blue-700",
 ozellikler: ["Kullanıcı CRUD İşlemleri", "Rol ve Yetki Atama", "Ders Atama", "Şifre Yönetimi"],
 link: "/kullanicilar",
 },
 {
 baslik: "Ürün Yönetimi",
 aciklama: "Tüm ürün işlemlerini tam kontrolle yönetin",
 emoji: "",
 renk: "border-orange-200",
 baslikRenk: "text-orange-700",
 ozellikler: ["Ürün Ekleme/Silme/Düzenleme", "Excel'den Toplu Yükleme", "Fiyat ve Miktar Yönetimi", "Kategori Yönetimi"],
 link: "/urun-havuzu",
 },
 {
 baslik: "Alışveriş Listeleri",
 aciklama: "Sistem genelindeki tüm alışveriş listelerini yönetin",
 emoji: "",
 renk: "border-green-200",
 baslikRenk: "text-green-700",
 ozellikler: ["Tüm Listeleri Görme", "Onay ve Kontrol", "Düzenlemeler Yapma"],
 link: "/siparisler",
 },
 {
 baslik: "Sipariş Yönetimi",
 aciklama: "Sistem genelinde raporlar ve istatistikler",
 emoji: "",
 renk: "border-purple-200",
 baslikRenk: "text-purple-700",
 ozellikler: ["Tüm Siparişleri Görme", "Öğretmen/Ders Filtresi", "Detay ve Silme"],
 link: "/siparis-yonetimi",
 },
 ];

 return (
 <DashboardLayout title="Sistem Yöneticisi Paneli" subtitle="Tüm sistem işlevlerine tam erişim">
 <div className="max-w-6xl space-y-8">

 {/* İstatistik Kartları */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {kartlar.map((k) => (
 <div key={k.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
 <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">{k.label}</p>
 <div className="flex items-end gap-2">
 <span className="text-3xl">{k.emoji}</span>
 <span className={`text-3xl font-bold ${k.renk}`}>{k.deger}</span>
 </div>
 </div>
 ))}
 </div>

 {/* Hızlı Erişim Kartları */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {islemler.map((i) => (
 <Link key={i.link} href={i.link}>
 <div className={`bg-white rounded-2xl border-2 ${i.renk} shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer h-full`}>
 <div className="flex items-center gap-3 mb-3">
 <span className="text-2xl">{i.emoji}</span>
 <h3 className={`font-bold text-base ${i.baslikRenk}`}>{i.baslik}</h3>
 </div>
 <p className="text-gray-500 text-sm mb-4">{i.aciklama}</p>
 <ul className="space-y-1.5">
 {i.ozellikler.map((o) => (
 <li key={o} className="text-sm text-gray-600 flex items-center gap-2">
 <span className="text-green-500 text-xs"></span>
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