"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

// Tipler 
type Ders = { id: string; kod: string; ad: string };
type Kullanici = { id: number; username: string; ad_soyad: string; role: string; dersler: string[]; password_hash?: string };
type Urun = { id: string; urunAdi: string; marka: string; fiyat: number; olcu: string; kategori: string; market: string; stok: number; kod: string; notlar: string };
type SiparisUrun = { urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type Siparis = { id: string; ogretmenId: number; ogretmenAdi: string; dersId: string; dersAdi: string; hafta: string; urunler: SiparisUrun[]; genelToplam: number; tarih: string; durum: "bekliyor" | "onaylandi" | "teslim_alindi" };

// Sabitler
const ROLLER = [
  { value: "ogretmen", label: "Öğretmen" },
  { value: "bolum_baskani", label: "Bölüm Başkanı" },
  { value: "stok", label: "Stok Sorumlusu" },
  { value: "satin_alma", label: "Satın Alma" },
];
const ROL_LABEL: Record<string, string> = { ogretmen: "Öğretmen", bolum_baskani: "Bölüm Başkanı", stok: "Stok Sorumlusu", satin_alma: "Satın Alma", admin: "Admin" };
const ROL_RENK: Record<string, string> = { ogretmen: "bg-blue-100 text-blue-700", bolum_baskani: "bg-purple-100 text-purple-700", stok: "bg-amber-100 text-amber-700", satin_alma: "bg-emerald-100 text-emerald-700" };
const DURUM_STIL: Record<string, string> = { bekliyor: "bg-amber-100 text-amber-700 border-amber-200", onaylandi: "bg-blue-100 text-blue-700 border-blue-200", teslim_alindi: "bg-emerald-100 text-emerald-700 border-emerald-200" };
const DURUM_LABEL: Record<string, string> = { bekliyor: "⏳ Bekliyor", onaylandi: "✅ Onaylandı", teslim_alindi: "📦 Teslim Alındı" };
const HAFTALAR = Array.from({ length: 10 }, (_, i) => `${i + 1}. Hafta`);
const OLCU_SEC = ["Kg", "L", "Paket", "Adet", "G", "Ml", "Kutu"];
const BOSH_URUN: Omit<Urun, "id"> = { urunAdi: "", marka: "", fiyat: 0, olcu: "Kg", kategori: "", market: "", stok: 0, kod: "", notlar: "" };

type Sekme = "panel" | "kullanici" | "listeler" | "siparisler" | "urunler";

export default function BolumBaskaniPage() {
  const { yetkili, yukleniyor } = useAuth("/bolum-baskani");

  const [adSoyad, setAdSoyad] = useState("");
  const [dersler, setDersler] = useState<Ders[]>([]);
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [ogretmenler, setOgretmenler] = useState<Kullanici[]>([]);
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [aktifSekme, setAktifSekme] = useState<Sekme>("panel");
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);

  // Kullanıcı formu state'leri (Hata veren satır buradaydı, düzelttim)
  const [yeniAd, setYeniAd] = useState("");
  const [yeniKadi, setYeniKadi] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniRol, setYeniRol] = useState("ogretmen");
  const [duzenleKullanici, setDuzenleKullanici] = useState<Kullanici | null>(null);

  // Sipariş filtreleri
  const [sipFiltreHafta, setSipFiltreHafta] = useState("tumu");
  const [sipFiltreDurum, setSipFiltreDurum] = useState("tumu");
  const [sipDetay, setSipDetay] = useState<Siparis | null>(null);

  // Ürün havuzu
  const [urunForm, setUrunForm] = useState<Omit<Urun, "id">>(BOSH_URUN);
  const [duzenleUrunId, setDuzenleUrunId] = useState<string | null>(null);
  const [urunPanel, setUrunPanel] = useState(false);
  const [urunArama, setUrunArama] = useState("");
  const [urunKategori, setUrunKategori] = useState("Tümü");
  const dosyaRef = useRef<HTMLInputElement>(null);

  // Liste indirme 
  const [listeYukleniyor, setListeYukleniyor] = useState(false);

  const fetchAll = async () => {
    const id = localStorage.getItem("aktifKullaniciId");
    const [{ data: k }, { data: d }, { data: ku }, { data: s }, { data: u }] = await Promise.all([
      supabase.from("kullanicilar").select("ad_soyad, username").eq("id", id).single(),
      supabase.from("dersler").select("*").order("kod"),
      supabase.from("kullanicilar").select("id, username, ad_soyad, role, dersler").neq("role", "admin"),
      supabase.from("siparisler").select("*").order("tarih", { ascending: false }),
      supabase.from("urunler").select("*").order("urun_adi"),
    ]);

    setAdSoyad(k?.ad_soyad || k?.username || "");
    setDersler(d || []);
    setKullanicilar(ku || []);
    setOgretmenler((ku || []).filter((x: Kullanici) => x.role === "ogretmen"));
    setSiparisler((s || []).map((x: any) => ({
      id: x.id,
      ogretmenId: x.ogretmen_id,
      ogretmenAdi: x.ogretmen_adi,
      dersId: x.ders_id,
      dersAdi: x.ders_adi,
      hafta: x.hafta,
      urunler: x.urunler || [],
      genelToplam: x.genel_toplam,
      tarih: x.tarih,
      durum: x.durum
    })));
    setUrunler((u || []).map((x: any) => ({
      id: x.id,
      urunAdi: x.urun_adi,
      marka: x.marka,
      fiyat: x.fiyat,
      olcu: x.olcu,
      kategori: x.kategori,
      market: x.market,
      stok: x.stok,
      kod: x.kod,
      notlar: x.notlar
    })));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const bildir = (tip: "basari" | "hata", metin: string) => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 3500);
  };

  // KULLANICI İŞLEMLERİ
  const handleKullaniciEkle = async () => {
    if (!yeniKadi || !yeniSifre || !yeniAd) { bildir("hata", "Tüm alanları doldurun."); return; }
    const { data: var_ } = await supabase.from("kullanicilar").select("id").eq("username", yeniKadi).single();
    if (var_) { bildir("hata", "Bu kullanıcı adı zaten kullanılıyor."); return; }
    const { error } = await supabase.from("kullanicilar").insert({ ad_soyad: yeniAd, username: yeniKadi, password_hash: yeniSifre, role: yeniRol, dersler: [] });
    if (error) { bildir("hata", "Hata: " + error.message); return; }
    bildir("basari", `"${yeniAd}" eklendi.`);
    setYeniAd(""); setYeniKadi(""); setYeniSifre(""); setYeniRol("ogretmen");
    fetchAll();
  };

  const handleKullaniciGuncelle = async () => {
    if (!duzenleKullanici) return;
    const { error } = await supabase.from("kullanicilar").update({
      ad_soyad: duzenleKullanici.ad_soyad,
      username: duzenleKullanici.username,
      role: duzenleKullanici.role,
      ...(duzenleKullanici.password_hash ? { password_hash: duzenleKullanici.password_hash } : {})
    }).eq("id", duzenleKullanici.id);
    if (error) { bildir("hata", "Hata: " + error.message); return; }
    bildir("basari", "Kullanıcı güncellendi.");
    setDuzenleKullanici(null);
    fetchAll();
  };

  const handleKullaniciSil = async (id: number, ad: string) => {
    if (!confirm(`"${ad}" kullanıcısını silmek istediğinizden emin misiniz?`)) return;
    await supabase.from("kullanicilar").delete().eq("id", id);
    bildir("basari", "Kullanıcı silindi.");
    fetchAll();
  };

  // SİPARİŞ İŞLEMLERİ
  const handleDurumGuncelle = async (id: string, durum: string) => {
    await supabase.from("siparisler").update({ durum }).eq("id", id);
    setSiparisler((prev) => prev.map((s) => s.id === id ? { ...s, durum: durum as Siparis["durum"] } : s));
    if (sipDetay?.id === id) setSipDetay((prev) => prev ? { ...prev, durum: durum as Siparis["durum"] } : null);
  };

  // ÜRÜN İŞLEMLERİ
  const handleUrunKaydet = async () => {
    if (!urunForm.urunAdi.trim()) { bildir("hata", "Ürün adı boş olamaz."); return; }
    const dbObj = {
      urun_adi: urunForm.urunAdi,
      marka: urunForm.marka,
      fiyat: urunForm.fiyat,
      olcu: urunForm.olcu,
      kategori: urunForm.kategori,
      market: urunForm.market,
      stok: urunForm.stok,
      kod: urunForm.kod,
      notlar: urunForm.notlar
    };
    if (duzenleUrunId) {
      const { error } = await supabase.from("urunler").update(dbObj).eq("id", duzenleUrunId);
      if (error) { bildir("hata", "Hata: " + error.message); return; }
      bildir("basari", "Ürün güncellendi.");
    } else {
      const { error } = await supabase.from("urunler").insert(dbObj);
      if (error) { bildir("hata", "Hata: " + error.message); return; }
      bildir("basari", "Ürün eklendi.");
    }
    setUrunForm(BOSH_URUN); setDuzenleUrunId(null); setUrunPanel(false); fetchAll();
  };

  const handleUrunSil = async (id: string) => {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
    await supabase.from("urunler").delete().eq("id", id);
    bildir("basari", "Ürün silindi.");
    fetchAll();
  };

  const handleExcelYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0]; if (!dosya) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const satirlar: any[] = XLSX.utils.sheet_to_json(ws);
        const yeni = satirlar.filter((s) => s["Ürün Adı"]).map((s) => ({
          urun_adi: String(s["Ürün Adı"] ?? ""),
          marka: String(s["Marka"] ?? ""),
          fiyat: Number(s["Fiyat"] ?? 0),
          olcu: String(s["Ölçü"] ?? "Kg"),
          kategori: String(s["Kategori"] ?? ""),
          market: String(s["Market"] ?? ""),
          stok: Number(s["Stok"] ?? 0),
          kod: String(s["Kod"] ?? ""),
          notlar: String(s["Notlar"] ?? "")
        }));
        const { error } = await supabase.from("urunler").insert(yeni);
        if (error) { bildir("hata", "Hata: " + error.message); return; }
        bildir("basari", `${yeni.length} ürün eklendi.`); fetchAll();
      } catch { bildir("hata", "Excel dosyası okunamadı."); }
    };
    reader.readAsBinaryString(dosya);
    if (dosyaRef.current) dosyaRef.current.value = "";
  };

  const handleListeIndir = async (ogretmenId: number) => {
    const ogretmen = ogretmenler.find((o) => o.id === ogretmenId); if (!ogretmen) return;
    setListeYukleniyor(true);
    const { data: sipData } = await supabase.from("siparisler").select("*").eq("ogretmen_id", ogretmenId);
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    for (const dersId of (ogretmen.dersler || [])) {
      const ders = dersler.find((d) => d.id === dersId); if (!ders) continue;
      for (const hafta of HAFTALAR) {
        const sip = (sipData || []).find((s: any) => s.ders_id === dersId && s.hafta === hafta);
        const urunlerHafta = sip?.urunler || [];
        const rows: any[][] = [
          [`${ders.kod} - ${ders.ad} MALZEME TALEP LİSTESİ`, "", "", "", "", "", "", ""],
          [ogretmen.ad_soyad || ogretmen.username, "", "", "", "", "", hafta, ""],
          ["", "", "", "", "", "", "", ""],
          ["Sıra no", "Ürün", "Marka", "Miktar", "Ölçü", "B.Fiyat", "Toplam", "Durum"],
          ...urunlerHafta.map((u: any, i: number) => [i + 1, u.urunAdi, u.marka, u.miktar, u.olcu, u.birimFiyat, u.toplam, ""])
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws, `${ders.kod}_${hafta}`.slice(0, 31));
      }
    }
    if (wb.SheetNames.length === 0) { bildir("hata", "Bu öğretmene ait liste bulunamadı."); setListeYukleniyor(false); return; }
    XLSX.writeFile(wb, `${ogretmen.ad_soyad || ogretmen.username}_Liste.xlsx`);
    setListeYukleniyor(false);
  };

  // Hesaplamalar 
  const atanmisDersSayisi = dersler.filter((d) => ogretmenler.some((o) => (o.dersler || []).includes(d.id))).length;
  const sipHaftalar = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.hafta))).sort()];
  const filtreliSiparisler = siparisler.filter((s) => (sipFiltreHafta === "tumu" || s.hafta === sipFiltreHafta) && (sipFiltreDurum === "tumu" || s.durum === sipFiltreDurum));
  const bekleyenSayisi = siparisler.filter((s) => s.durum === "bekliyor").length;
  const kategoriler = ["Tümü", ...Array.from(new Set(urunler.map((u) => u.kategori).filter(Boolean))).sort()];
  const filtreliUrunler = urunler.filter((u) => (!urunArama || u.urunAdi.toLowerCase().includes(urunArama.toLowerCase()) || (u.marka || "").toLowerCase().includes(urunArama.toLowerCase())) && (urunKategori === "Tümü" || u.kategori === urunKategori));

  if (yukleniyor) return (
    <DashboardLayout title="Bölüm Başkanı Paneli">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B1A1A]"></div>
      </div>
    </DashboardLayout>
  );
  if (!yetkili) return null;

  const sekmeler: { key: Sekme; label: string; badge?: number }[] = [
    { key: "panel", label: "🏠 Panel" },
    { key: "kullanici", label: "👥 Kullanıcılar" },
    { key: "listeler", label: "📋 Listeler" },
    { key: "siparisler", label: "🛒 Siparişler", badge: bekleyenSayisi },
    { key: "urunler", label: "📦 Ürün Havuzu" },
  ];

  return (
    <DashboardLayout title="Bölüm Başkanı Paneli" subtitle="Tüm yönetim araçları">
      <div className="max-w-6xl space-y-5">
        {bildirim && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${bildirim.tip === "basari" ? "bg-white border-emerald-100 text-emerald-700" : "bg-white border-red-100 text-red-600"}`}>
            <div className={`w-2 h-2 rounded-full ${bildirim.tip === "basari" ? "bg-emerald-500" : "bg-red-500"}`} />
            <p className="font-bold text-xs uppercase tracking-widest">{bildirim.metin}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-[#8B1A1A] to-[#a32626] text-white rounded-[2rem] px-8 py-7">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Bölüm Başkanı Paneli</p>
          <h1 className="text-2xl font-black tracking-tight">Merhaba, {adSoyad}!</h1>
          <p className="text-red-200 text-sm font-medium mt-1">Hoş Geldiniz — tüm yönetim araçları burada.</p>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60">
          {sekmeler.map((s) => (
            <button key={s.key} onClick={() => setAktifSekme(s.key)}
              className={`flex-1 px-3 py-2.5 text-[11px] font-black rounded-xl transition flex items-center justify-center gap-2 uppercase tracking-tighter ${aktifSekme === s.key ? "bg-white text-[#8B1A1A] shadow-sm italic" : "text-slate-400 hover:text-slate-600"}`}>
              {s.label}
              {s.badge ? <span className="bg-[#8B1A1A] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{s.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* PANEL İÇERİĞİ */}
        {aktifSekme === "panel" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Toplam Ders", deger: dersler.length, emoji: "📚", renk: "text-[#8B1A1A]" },
                { label: "Öğretmen Sayısı", deger: ogretmenler.length, emoji: "🧑‍🏫", renk: "text-blue-600" },
                { label: "Atanmış Ders", deger: atanmisDersSayisi, emoji: "🔗", renk: "text-emerald-600" },
                { label: "Bekleyen Sipariş", deger: bekleyenSayisi, emoji: "⏳", renk: "text-amber-600" },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{k.label}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{k.emoji}</span>
                    <span className={`text-3xl font-black ${k.renk}`}>{k.deger}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dersler">
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4">
                <div className="w-12 h-12 bg-[#8B1A1A]/10 rounded-2xl flex items-center justify-center flex-shrink-0"><span className="text-2xl">📖</span></div>
                <div><h3 className="font-black text-[#8B1A1A] tracking-tight">Ders Yönetimi</h3><p className="text-slate-500 text-sm">Dersleri ekleyin, silin ve öğretmenlere atayın</p></div>
                <span className="ml-auto text-sm font-black text-[#8B1A1A]">Git →</span>
              </div>
            </Link>
          </div>
        )}

        {/* KULLANICILAR İÇERİĞİ */}
        {aktifSekme === "kullanici" && (
          <div className="space-y-5">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-6">
              <h2 className="font-black text-slate-800 tracking-tight">Yeni Kullanıcı Ekle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Ad Soyad</label>
                  <input value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} placeholder="Ad Soyad"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#8B1A1A]/20 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Kullanıcı Adı</label>
                  <input value={yeniKadi} onChange={(e) => setYeniKadi(e.target.value)} placeholder="kullanici_adi"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#8B1A1A]/20 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Şifre</label>
                  <input type="password" value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)} placeholder="Şifre"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#8B1A1A]/20 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Rol</label>
                  <select value={yeniRol} onChange={(e) => setYeniRol(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#8B1A1A]/20 outline-none">
                    {ROLLER.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleKullaniciEkle} className="w-full bg-[#8B1A1A] hover:bg-red-800 text-white font-black py-4 rounded-2xl transition text-xs uppercase tracking-widest shadow-lg shadow-red-900/20">+ Kullanıcı Ekle</button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-50"><h2 className="font-black text-slate-800 tracking-tight">Mevcut Kullanıcılar</h2></div>
              <div className="divide-y divide-slate-50">
                {kullanicilar.map((k) => (
                  <div key={k.id} className="px-8 py-5">
                    {duzenleKullanici?.id === k.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input value={duzenleKullanici.ad_soyad} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, ad_soyad: e.target.value })} className="bg-slate-50 border-none rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8B1A1A]/20" />
                          <input value={duzenleKullanici.username} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, username: e.target.value })} className="bg-slate-50 border-none rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8B1A1A]/20" />
                          <input type="password" placeholder="Yeni şifre (boş bırakılabilir)" onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, password_hash: e.target.value })} className="bg-slate-50 border-none rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8B1A1A]/20" />
                          <select value={duzenleKullanici.role} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, role: e.target.value })} className="bg-slate-50 border-none rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8B1A1A]/20">
                            {ROLLER.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleKullaniciGuncelle} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Kaydet</button>
                          <button onClick={() => setDuzenleKullanici(null)} className="bg-slate-100 text-slate-600 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest">İptal</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{k.ad_soyad || k.username}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">@{k.username}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${ROL_RENK[k.role] || "bg-slate-100 text-slate-600"}`}>{ROL_LABEL[k.role] || k.role}</span>
                          <button onClick={() => setDuzenleKullanici(k)} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-blue-50 transition">Düzenle</button>
                          <button onClick={() => handleKullaniciSil(k.id, k.ad_soyad || k.username)} className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-red-50 transition">Sil</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DİĞER SEKMELER (Siparişler, Ürünler vb.) kodda aşağı doğru devam ediyor... */}
        {/* LİSTELER */}
        {aktifSekme === "listeler" && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50">
              <h2 className="font-black text-slate-800 tracking-tight">Öğretmen Bazlı Liste İndir</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Seçilen öğretmenin tüm ders ve hafta listelerini Excel olarak indir</p>
            </div>
            {ogretmenler.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm">Henüz öğretmen bulunmuyor.</div>
            ) : ogretmenler.map((o) => {
              const dc = (o.dersler || []).length;
              return (
                <div key={o.id} className="px-8 py-5 flex items-center justify-between border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{o.ad_soyad || o.username}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{dc > 0 ? `${dc} ders` : "Ders atanmamış"}</p>
                  </div>
                  <button onClick={() => handleListeIndir(o.id)} disabled={listeYukleniyor || dc === 0}
                    className="text-xs font-black bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white uppercase tracking-widest px-5 py-2.5 rounded-2xl transition shadow-sm">
                    {listeYukleniyor ? "Hazırlanıyor..." : "Excel İndir"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* SİPARİŞLER */}
        {aktifSekme === "siparisler" && (
          <div className="space-y-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-wrap gap-3 items-center">
              <select value={sipFiltreHafta} onChange={(e) => setSipFiltreHafta(e.target.value)} className="bg-slate-50 border-none rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8B1A1A]/20">
                {sipHaftalar.map((h) => <option key={h} value={h}>{h === "tumu" ? "Tüm Haftalar" : h}</option>)}
              </select>
              <select value={sipFiltreDurum} onChange={(e) => setSipFiltreDurum(e.target.value)} className="bg-slate-50 border-none rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8B1A1A]/20">
                <option value="tumu">Tüm Durumlar</option>
                <option value="bekliyor">⏳ Bekliyor</option>
                <option value="onaylandi">✅ Onaylandı</option>
                <option value="teslim_alindi">📦 Teslim Alındı</option>
              </select>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ÖĞRETMEN</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">DERS/HAFTA</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">DURUM</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">İŞLEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtreliSiparisler.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{s.ogretmenAdi}</td>
                      <td className="px-6 py-4"><p className="text-xs font-bold text-slate-600 truncate max-w-[180px]">{s.dersAdi}</p><span className="text-[10px] font-black text-slate-400">{s.hafta}</span></td>
                      <td className="px-6 py-4"><span className={`text-[10px] font-black px-3 py-1 rounded-xl border uppercase tracking-widest ${DURUM_STIL[s.durum]}`}>{DURUM_LABEL[s.durum]}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleDurumGuncelle(s.id, "onaylandi")} className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition uppercase tracking-widest">Onayla</button>
                          <button onClick={() => handleDurumGuncelle(s.id, "bekliyor")} className="text-[10px] font-black text-slate-400 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition uppercase tracking-widest">Geri Al</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ÜRÜN HAVUZU */}
        {aktifSekme === "urunler" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input value={urunArama} onChange={(e) => setUrunArama(e.target.value)} placeholder="Ürün ara..." className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8B1A1A]/20" />
              <button onClick={() => setUrunPanel(true)} className="bg-[#8B1A1A] hover:bg-red-800 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-red-900/20">+ Ekle</button>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ürün</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fiyat</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtreliUrunler.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{u.urunAdi}</td>
                      <td className="px-6 py-4 font-bold text-slate-500 italic">₺{u.fiyat.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleUrunSil(u.id)} className="text-[10px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl transition uppercase tracking-widest">Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}