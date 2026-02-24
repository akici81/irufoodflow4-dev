"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Ders = { id: string; kod: string; ad: string };

export default function OgretmenAnaSayfa() {
  const { yetkili, yukleniyor } = useAuth("/ogretmen");
  const [adSoyad, setAdSoyad] = useState("");
  const [atananDersler, setAtananDersler] = useState<Ders[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const id = localStorage.getItem("aktifKullaniciId");
      if (!id) return;

      const { data: kullanici } = await supabase
        .from("kullanicilar")
        .select("ad_soyad, username, dersler")
        .eq("id", id)
        .single();

      if (!kullanici) return;
      setAdSoyad(kullanici.ad_soyad || kullanici.username);

      if ((kullanici.dersler || []).length > 0) {
        const { data: dersler } = await supabase
          .from("dersler")
          .select("*")
          .in("id", kullanici.dersler);
        setAtananDersler(dersler || []);
      }
    };
    fetchData();
  }, []);

  if (yukleniyor) return (
    <DashboardLayout title="Öğretim Görevlisi Paneli">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout
      title={`Hoş Geldiniz, ${adSoyad.split(' ')[0]}`}
      subtitle="Öğretim Görevlisi Paneli"
    >
      <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Karşılama Kartı */}
        <div className="bg-gradient-to-r from-[primary-900] to-[#a32626] text-white rounded-2xl px-10 py-10 mb-10 shadow-xl shadow-red-900/10 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2 tracking-tight">Merhaba, {adSoyad}! 👋</h1>
            <p className="text-red-100/80 text-sm font-medium max-w-md">
              Mutfak yönetim sistemi üzerinden dersleriniz için malzeme taleplerini yönetebilir ve haftalık listelerinizi oluşturabilirsiniz.
            </p>
          </div>
          {/* Arka plan dekorasyonu */}
          <div className="absolute right-[-20px] bottom-[-20px] text-[150px] opacity-10 rotate-12 select-none">🍲</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* İşlem Rehberi - Sol Geniş Alan */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                  📝
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-gray-800 mb-3 tracking-tight">Nasıl Başlarım?</h2>
                  <p className="text-gray-700 text-sm leading-relaxed mb-6">
                    Dersleriniz için malzeme talebinde bulunmak için önce sol menüden <span className="font-bold text-gray-700">"Malzeme Talebi Yap"</span> kısmına gidebilir veya mevcut listelerinizi <span className="font-bold text-gray-700">"Talep Listelerim"</span> altından kontrol edebilirsiniz.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-2xl bg-primary-900/5 border border-primary-900/10">
                      <p className="text-primary-900 text-[11px] font-black uppercase tracking-widest mb-1 italic">İpucu 01</p>
                      <p className="text-gray-700 text-xs">Ürünleri işaretleyip haftalık planlamanızı saniyeler içinde yapın.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-1 italic">İpucu 02</p>
                      <p className="text-gray-700 text-xs">Onaylanan siparişlerinizin durumunu anlık takip edin.</p>
                    </div>
                  </div>

                  <Link href="/talep" className="inline-flex items-center justify-center bg-gray-900 hover:bg-primary-900 text-white text-sm font-bold px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-gray-200 hover:shadow-red-200 group">
                    Hemen Malzeme Talebi Oluştur
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Atanmış Dersler - Sağ Yan Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-black text-gray-800 tracking-tight flex items-center gap-2">
                  <span className="text-red-700">📚</span> Derslerim
                </h2>
                <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  {atananDersler.length} Aktif
                </span>
              </div>

              {atananDersler.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-700 text-sm font-medium">Henüz ders atanmamış.</p>
                  <p className="text-gray-600 text-[10px] mt-1 italic">Lütfen Bölüm Başkanı ile iletişime geçin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atananDersler.map((d) => (
                    <div key={d.id} className="group p-4 rounded-2xl border border-gray-50 hover:border-red-100 hover:bg-red-50/30 transition-all duration-300 cursor-default">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-xs font-black text-primary-900 group-hover:scale-110 transition-transform shadow-sm">
                          {d.kod.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-primary-900 uppercase tracking-tighter mb-0.5">{d.kod}</p>
                          <p className="text-[13px] text-gray-700 font-bold truncate tracking-tight">{d.ad}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}