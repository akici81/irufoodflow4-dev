"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Siparis = { id: string; ogretmenAdi: string; dersAdi: string; hafta: string; durum: string; genelToplam: number; };
type Etkinlik = { id: string; hafta: number; gun: string; tarih: string; etkinlik: string; renk: string; };

const DURUM_STIL: Record<string, { bg: string; text: string; label: string }> = {
  bekliyor:      { bg: "#FEF3C7", text: "#92400E", label: "Bekliyor" },
  onaylandi:     { bg: "#D1FAE5", text: "#065F46", label: "Onaylandi" },
  teslim_alindi: { bg: "#DBEAFE", text: "#1E40AF", label: "Teslim Alindi" },
};

const RENK_MAP: Record<string, { bg: string; text: string }> = {
  kirmizi: { bg: "#FEE2E2", text: "#991B1B" },
  sari:    { bg: "#FEF3C7", text: "#92400E" },
  mavi:    { bg: "#DBEAFE", text: "#1D4ED8" },
  yesil:   { bg: "#D1FAE5", text: "#065F46" },
  mor:     { bg: "#EDE9FE", text: "#5B21B6" },
  turuncu: { bg: "#FFEDD5", text: "#9A3412" },
};

export default function BolumBaskaniAnaSayfa() {
  const { yetkili, yukleniyor } = useAuth("/bolum-baskani");
  const [adSoyad, setAdSoyad] = useState("");
  const [stats, setStats] = useState({ ogretmen: 0, ders: 0, bekleyen: 0, onaylanan: 0, teslim: 0 });
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [etkinlikler, setEtkinlikler] = useState<Etkinlik[]>([]);

  const saat = new Date().getHours();
  const selamlama = saat < 12 ? "Gunaydin" : saat < 18 ? "Iyi gunler" : "Iyi aksamlar";

  useEffect(() => {
    if (!yetkili) return;
    const id = localStorage.getItem("aktifKullaniciId");
    supabase.from("kullanicilar").select("ad_soyad").eq("id", Number(id)).single()
      .then(({ data }) => setAdSoyad(data?.ad_soyad || "Bolum Baskani"));

    Promise.all([
      supabase.from("kullanicilar").select("id", { count: "exact", head: true }).eq("role", "ogretmen"),
      supabase.from("dersler").select("id", { count: "exact", head: true }),
      supabase.from("siparisler").select("id", { count: "exact", head: true }).eq("durum", "bekliyor"),
      supabase.from("siparisler").select("id", { count: "exact", head: true }).eq("durum", "onaylandi"),
      supabase.from("siparisler").select("id", { count: "exact", head: true }).eq("durum", "teslim_alindi"),
    ]).then(([o, d, b, on, t]) => {
      setStats({ ogretmen: o.count ?? 0, ders: d.count ?? 0, bekleyen: b.count ?? 0, onaylanan: on.count ?? 0, teslim: t.count ?? 0 });
    });

    supabase.from("siparisler").select("*").order("tarih", { ascending: false }).limit(6)
      .then(({ data }) => setSiparisler(data || []));

    supabase.from("etkinlik_takvimi").select("*").eq("aktif", true).order("hafta").limit(5)
      .then(({ data }) => setEtkinlikler(data || []));
  }, [yetkili]);

  if (yukleniyor || !yetkili) return null;

  return (
    <DashboardLayout title="Bolum Baskani Paneli" subtitle="2025-2026 Bahar Donemi">
      <div className="space-y-6 max-w-5xl">

        {/* Karsilama */}
        <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #7F1212 0%, #B71C1C 100%)" }}>
          <div className="absolute right-6 top-0 bottom-0 flex items-center opacity-10 text-9xl font-black select-none">IRU</div>
          <p className="text-white/60 text-sm">{selamlama},</p>
          <h2 className="text-2xl font-black mt-0.5">{adSoyad}</h2>
          <p className="text-white/50 text-xs mt-2">
            Bolum Baskani &bull; {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Istatistikler */}
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Ogretmen",  val: stats.ogretmen,  icon: "👨‍🏫", renk: "#2563EB", bg: "#EFF6FF" },
            { label: "Ders",      val: stats.ders,      icon: "📚", renk: "#16A34A", bg: "#F0FDF4" },
            { label: "Bekleyen",  val: stats.bekleyen,  icon: "⏳", renk: "#D97706", bg: "#FFFBEB" },
            { label: "Onaylanan", val: stats.onaylanan, icon: "✅", renk: "#059669", bg: "#ECFDF5" },
            { label: "Teslim",    val: stats.teslim,    icon: "📦", renk: "#7C3AED", bg: "#F5F3FF" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-zinc-100 p-4 text-center" style={{ background: k.bg }}>
              <div className="text-xl mb-1">{k.icon}</div>
              <p className="text-2xl font-black" style={{ color: k.renk }}>{k.val}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Son siparisler */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-800">Son Siparisler</h3>
              <Link href="/siparisler" className="text-xs font-semibold text-red-700 hover:underline">Tumunu Gor</Link>
            </div>
            <div className="divide-y divide-zinc-50">
              {siparisler.length === 0 ? (
                <p className="px-5 py-8 text-center text-zinc-400 text-sm">Henuz siparis yok</p>
              ) : siparisler.map((s) => {
                const d = DURUM_STIL[s.durum] || DURUM_STIL.bekliyor;
                return (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{s.ogretmenAdi}</p>
                      <p className="text-xs text-zinc-400 truncate">{s.dersAdi} &bull; {s.hafta}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-zinc-600">{Number(s.genelToplam || 0).toFixed(2)} TL</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: d.bg, color: d.text }}>{d.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Etkinlikler */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-zinc-800">Etkinlik Takvimi</h3>
              <Link href="/etkinlik-takvimi" className="text-xs font-semibold text-red-700 hover:underline">Takvime Git</Link>
            </div>
            <div className="divide-y divide-zinc-50">
              {etkinlikler.length === 0 ? (
                <p className="px-5 py-8 text-center text-zinc-400 text-sm">Etkinlik bulunmuyor</p>
              ) : etkinlikler.map((e) => {
                const r = RENK_MAP[e.renk] || RENK_MAP.mavi;
                return (
                  <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-xs font-bold" style={{ background: r.bg, color: r.text }}>
                      <span>{e.hafta}.</span>
                      <span>Hft</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{e.etkinlik}</p>
                      <p className="text-xs text-zinc-400">{e.gun} &bull; {e.tarih}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hizli Erisim */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Hizli Erisim</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Ders Programi",   icon: "📋", link: "/ders-programi",   renk: "#2563EB", bg: "#EFF6FF" },
              { label: "Etkinlik Takvimi",icon: "📅", link: "/etkinlik-takvimi",renk: "#7C3AED", bg: "#F5F3FF" },
              { label: "Siparisler",      icon: "🛒", link: "/siparisler",       renk: "#059669", bg: "#ECFDF5" },
              { label: "Urun Havuzu",     icon: "📦", link: "/urun-havuzu",      renk: "#EA580C", bg: "#FFF7ED" },
            ].map((h) => (
              <Link key={h.link} href={h.link}>
                <div className="rounded-2xl border border-zinc-100 p-4 text-center hover:shadow-md transition" style={{ background: h.bg }}>
                  <div className="text-2xl mb-2">{h.icon}</div>
                  <p className="text-sm font-bold" style={{ color: h.renk }}>{h.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}