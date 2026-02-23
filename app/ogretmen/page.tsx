"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Ders = { id: string; kod: string; ad: string };

export default function OgretmenAnaSayfa() {
  const { yetkili, yukleniyor } = useAuth("/ogretmen");
  if (yukleniyor) return <div className="min-h-screen flex items-center justify-center text-gray-400">Yükleniyor...</div>;
  if (!yetkili) return null;

 const [adSoyad, setAdSoyad] = useState("");
 const [atananDersler, setAtananDersler] = useState<Ders[]>([]);

 useEffect(() => {
 const fetchData = async () => {
 const id = localStorage.getItem("aktifKullaniciId");
 if (!id) return;
 const { data: kullanici } = await supabase.from("kullanicilar").select("ad_soyad, username, dersler").eq("id", id).single();
 if (!kullanici) return;
 setAdSoyad(kullanici.ad_soyad || kullanici.username);
 if ((kullanici.dersler || []).length > 0) {
 const { data: dersler } = await supabase.from("dersler").select("*").in("id", kullanici.dersler);
 setAtananDersler(dersler || []);
 }
 };
 fetchData();
 }, []);

 return (
 <DashboardLayout>
 <div className="max-w-5xl">
 <div className="bg-red-700 text-white rounded-2xl px-8 py-7 mb-8">
 <h1 className="text-2xl font-bold mb-1">Merhaba, {adSoyad}!</h1>
 <p className="text-red-200 text-sm">Öğretmen Paneline Hoş Geldiniz.</p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
 <div className="text-center mb-5">
 <span className="text-5xl"></span>
 <h2 className="text-lg font-bold text-gray-800 mt-3">İşlem Rehberi</h2>
 </div>
 <p className="text-gray-500 text-sm text-center mb-5">
 Dersleriniz için alışveriş listesi oluşturmak veya mevcut listelerinizi yönetmek için sol menüdeki{" "}
 <span className="font-semibold text-gray-700">"Alışveriş Listelerim"</span>{" "}sekmesini kullanabilirsiniz.
 </p>
 <div className="bg-red-50 border border-dashed border-red-200 rounded-xl p-4">
 <p className="text-red-700 text-xs text-center">
 <span className="font-medium">İpucu:</span> Alışveriş listesi sayfasında ürünleri işaretleyip haftalık planlamanızı yapabilirsiniz.
 </p>
 </div>
 <Link href="/alisveris-listelerim" className="mt-5 w-full block text-center bg-red-700 hover:bg-red-800 text-white text-sm font-semibold py-3 rounded-xl transition">
 Alışveriş Listesi Oluştur →
 </Link>
 </div>
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
 <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2"><span></span> Atanmış Dersleriniz</h2>
 {atananDersler.length === 0 ? (
 <div className="text-center py-8">
 <p className="text-gray-400 text-sm">Henüz ders atanmamış.</p>
 <p className="text-gray-300 text-xs mt-1">Yönetici ile iletişime geçin.</p>
 </div>
 ) : (
 <ul className="space-y-3">
 {atananDersler.map((d) => (
 <li key={d.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
 <span className="text-lg"></span>
 <div>
 <span className="text-xs font-bold text-red-700">{d.kod}</span>
 <p className="text-sm text-gray-700 font-medium">{d.ad}</p>
 </div>
 </li>
 ))}
 </ul>
 )}
 </div>
 </div>
 </div>
 </DashboardLayout>
 );
}
