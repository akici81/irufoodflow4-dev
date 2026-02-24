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
        const { data: dersler } = await supabase.from("dersler").select("*").in("id", kullanici.dersler);
        setAtananDersler(dersler || []);
      }
    };
    fetchData();
  }, []);

  if (yukleniyor || !yetkili) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        {/* Karşılama Banner */}
        <div
          className="text-white rounded-2xl px-8 py-7 mb-8"
          style={{ background: "#B71C1C" }}
        >
          <h1 className="text-2xl font-bold mb-1">Merhaba, {adSoyad}!</h1>
          <p className="text-red-200 text-sm">Öğretmen Paneline Hoş Geldiniz.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* İşlem Rehberi */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <div className="text-center mb-5">
              <span className="text-5xl">📋</span>
              <h2 className="text-lg font-bold text-zinc-800 mt-3">İşlem Rehberi</h2>
            </div>
            <p className="text-zinc-500 text-sm text-center mb-5">
              Dersleriniz için alışveriş listesi oluşturmak veya mevcut listelerinizi yönetmek için sol menüdeki{" "}
              <span className="font-semibold text-zinc-700">&quot;Alışveriş Listelerim&quot;</span>{" "}
              sekmesini kullanabilirsiniz.
            </p>
            <div className="bg-red-50 border border-dashed border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-xs text-center">
                <span className="font-semibold">İpucu:</span> Alışveriş listesi sayfasında ürünleri işaretleyip haftalık planlamanızı yapabilirsiniz.
              </p>
            </div>
            <Link
              href="/alisveris-listelerim"
              className="mt-5 w-full block text-center text-white text-sm font-semibold py-3 rounded-xl transition"
              style={{ background: "#B71C1C" }}
            >
              Alışveriş Listesi Oluştur →
            </Link>
          </div>

          {/* Atanmış Dersler */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <h2 className="font-bold text-zinc-800 mb-5 flex items-center gap-2">
              <span>📚</span> Atanmış Dersleriniz
            </h2>
            {atananDersler.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400 text-sm">Henüz ders atanmamış.</p>
                <p className="text-zinc-300 text-xs mt-1">Yönetici ile iletişime geçin.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {atananDersler.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition">
                    <span className="text-lg">📖</span>
                    <div>
                      <span className="text-xs font-bold" style={{ color: "#B71C1C" }}>{d.kod}</span>
                      <p className="text-sm text-zinc-700 font-medium">{d.ad}</p>
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
