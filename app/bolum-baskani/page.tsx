"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

// Tipler 
type Ders = { id: string; kod: string; ad: string };
type Kullanici = { id: number; username: string; ad_soyad: string; role: string; dersler: string[]; password_hash?: string };
type Urun = { id: string; urunAdi: string; marka: string; fiyat: number; olcu: string; kategori: string; market: string; stok: number; kod: string; notlar: string };
type SiparisUrun = { urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type Siparis = { id: string; ogretmenId: number; ogretmenAdi: string; dersId: string; dersAdi: string; hafta: string; urunler: SiparisUrun[]; genelToplam: number; tarih: string; durum: "bekliyor" | "onaylandi" | "teslim_alindi" };

// Sabitler 
const ROLLER = [
 { value: "ogretmen", label: "Öğretmen" },
 { value: "bolum-baskani", label: "Bölüm Başkanı" },
 { value: "stok", label: "Stok Sorumlusu" },
 { value: "satin", label: "Satın Alma" },
];
const ROL_LABEL: Record<string, string> = { ogretmen: "Öğretmen", "bolum-baskani": "Bölüm Başkanı", stok: "Stok Sorumlusu", satin: "Satın Alma", admin: "Admin" };
const ROL_RENK: Record<string, string> = { ogretmen: "bg-blue-100 text-blue-700", "bolum-baskani": "bg-purple-100 text-purple-700", stok: "bg-amber-100 text-amber-700", satin: "bg-emerald-100 text-emerald-700" };
const DURUM_STIL: Record<string, string> = { bekliyor: "bg-amber-100 text-amber-700 border-amber-200", onaylandi: "bg-blue-100 text-blue-700 border-blue-200", teslim_alindi: "bg-emerald-100 text-emerald-700 border-emerald-200" };
const DURUM_LABEL: Record<string, string> = { bekliyor: "⏳ Bekliyor", onaylandi: " Onaylandı", teslim_alindi: " Teslim Alındı" };
const HAFTALAR = Array.from({ length: 10 }, (_, i) => `${i + 1}. Hafta`);
const OLCU_SEC = ["Kg", "L", "Paket", "Adet", "G", "Ml", "Kutu"];
const BOSH_URUN: Omit<Urun, "id">= { urunAdi: "", marka: "", fiyat: 0, olcu: "Kg", kategori: "", market: "", stok: 0, kod: "", notlar: "" };

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

 // Kullanıcı formu
 const [yeniAd, setYeniAd] = useState(""); const [yeniKadi, setYeniKadi] = useState(""); const [yeniSifre, setYeniSifre] = useState(""); const [yeniRol, setYeniRol] = useState("ogretmen");
 const [duzenleKullanici, setDuzenleKullanici] = useState<Kullanici | null>(null);

 // Sipariş filtreleri
 const [sipFiltreHafta, setSipFiltreHafta] = useState("tumu"); const [sipFiltreDurum, setSipFiltreDurum] = useState("tumu"); const [sipDetay, setSipDetay] = useState<Siparis | null>(null);

 // Ürün havuzu
 const [urunForm, setUrunForm] = useState<Omit<Urun, "id">>(BOSH_URUN); const [duzenleUrunId, setDuzenleUrunId] = useState<string | null>(null); const [urunPanel, setUrunPanel] = useState(false);
 const [urunArama, setUrunArama] = useState(""); const [urunKategori, setUrunKategori] = useState("Tümü");
 const dosyaRef = useRef<HTMLInputElement>(null);

 // Liste indirme
 const [listeYukleniyor, setListeYukleniyor] = useState(false);

 useEffect(() => { fetchAll(); }, []);

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
 setSiparisler((s || []).map((x: any) => ({ id: x.id, ogretmenId: x.ogretmen_id, ogretmenAdi: x.ogretmen_adi, dersId: x.ders_id, dersAdi: x.ders_adi, hafta: x.hafta, urunler: x.urunler || [], genelToplam: x.genel_toplam, tarih: x.tarih, durum: x.durum })));
 setUrunler((u || []).map((x: any) => ({ id: x.id, urunAdi: x.urun_adi, marka: x.marka, fiyat: x.fiyat, olcu: x.olcu, kategori: x.kategori, market: x.market, stok: x.stok, kod: x.kod, notlar: x.notlar })));
 };

 const bildir = (tip: "basari" | "hata", metin: string) => { setBildirim({ tip, metin }); setTimeout(() => setBildirim(null), 3500); };

 // Kullanıcı işlemleri 
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
 const { error } = await supabase.from("kullanicilar").update({ ad_soyad: duzenleKullanici.ad_soyad, username: duzenleKullanici.username, role: duzenleKullanici.role, ...(duzenleKullanici.password_hash ? { password_hash: duzenleKullanici.password_hash } : {}) }).eq("id", duzenleKullanici.id);
 if (error) { bildir("hata", "Hata: " + error.message); return; }
 bildir("basari", "Kullanıcı güncellendi."); setDuzenleKullanici(null); fetchAll();
 };

 const handleKullaniciSil = async (id: number, ad: string) => {
 if (!confirm(`"${ad}" kullanıcısını silmek istediğinizden emin misiniz?`)) return;
 await supabase.from("kullanicilar").delete().eq("id", id);
 bildir("basari", "Kullanıcı silindi."); fetchAll();
 };

 // Sipariş işlemleri 
 const handleDurumGuncelle = async (id: string, durum: string) => {
 await supabase.from("siparisler").update({ durum }).eq("id", id);
 setSiparisler((prev) => prev.map((s) => s.id === id ? { ...s, durum: durum as Siparis["durum"] } : s));
 if (sipDetay?.id === id) setSipDetay((prev) => prev ? { ...prev, durum: durum as Siparis["durum"] } : null);
 };

 // Ürün işlemleri 
 const handleUrunKaydet = async () => {
 if (!urunForm.urunAdi.trim()) { bildir("hata", "Ürün adı boş olamaz."); return; }
 const dbObj = { urun_adi: urunForm.urunAdi, marka: urunForm.marka, fiyat: urunForm.fiyat, olcu: urunForm.olcu, kategori: urunForm.kategori, market: urunForm.market, stok: urunForm.stok, kod: urunForm.kod, notlar: urunForm.notlar };
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
 bildir("basari", "Ürün silindi."); fetchAll();
 };

 const handleExcelYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
 const dosya = e.target.files?.[0]; if (!dosya) return;
 const reader = new FileReader();
 reader.onload = async (ev) => {
 try {
 const wb = XLSX.read(ev.target?.result, { type: "binary" });
 const ws = wb.Sheets[wb.SheetNames[0]];
 const satirlar: any[] = XLSX.utils.sheet_to_json(ws);
 const yeni = satirlar.filter((s) => s["Ürün Adı"]).map((s) => ({ urun_adi: String(s["Ürün Adı"] ?? ""), marka: String(s["Marka"] ?? ""), fiyat: Number(s["Fiyat"] ?? 0), olcu: String(s["Ölçü"] ?? "Kg"), kategori: String(s["Kategori"] ?? ""), market: String(s["Market"] ?? ""), stok: Number(s["Stok"] ?? 0), kod: String(s["Kod"] ?? ""), notlar: String(s["Notlar"] ?? "") }));
 const { error } = await supabase.from("urunler").insert(yeni);
 if (error) { bildir("hata", "Hata: " + error.message); return; }
 bildir("basari", `${yeni.length} ürün eklendi.`); fetchAll();
 } catch { bildir("hata", "Excel dosyası okunamadı."); }
 };
 reader.readAsBinaryString(dosya);
 if (dosyaRef.current) dosyaRef.current.value = "";
 };

 // Liste indirme 
 const handleListeIndir = async (ogretmenId: number) => {
 const ogretmen = ogretmenler.find((o) => o.id === ogretmenId); if (!ogretmen) return;
 setListeYukleniyor(true);
 const { data: sipData } = await supabase.from("siparisler").select("*").eq("ogretmen_id", ogretmenId);
 const wb = XLSX.utils.book_new();
 for (const dersId of (ogretmen.dersler || [])) {
 const ders = dersler.find((d) => d.id === dersId); if (!ders) continue;
 for (const hafta of HAFTALAR) {
 const sip = (sipData || []).find((s: any) => s.ders_id === dersId && s.hafta === hafta);
 const urunlerHafta = sip?.urunler || [];
 const rows: any[][] = [[`${ders.kod} - ${ders.ad} MALZEME TALEP LİSTESİ`, "", "", "", "", "", "", ""], [ogretmen.ad_soyad || ogretmen.username, "", "", "", "", "", hafta, ""], ["", "", "", "", "", "", "", ""], ["Sıra no", "Ürün", "Marka", "Miktar", "Ölçü", "B.Fiyat", "Toplam", "Durum"], ...urunlerHafta.map((u: any, i: number) => [i + 1, u.urunAdi, u.marka, u.miktar, u.olcu, u.birimFiyat, u.toplam, ""])];
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

 // UI 
 const sekmeler: { key: Sekme; label: string; badge?: number }[] = [
 { key: "panel", label: "Panel" },
 { key: "kullanici", label: "Kullanıcılar" },
 { key: "listeler", label: "Listeler" },
 { key: "siparisler", label: "Siparişler", badge: bekleyenSayisi },
 { key: "urunler", label: "Ürün Havuzu" },
 ];

 return (
 <DashboardLayout title="Bölüm Başkanı Paneli" subtitle="Tüm yönetim araçları">
 <div className="max-w-6xl space-y-5">
 {bildirim && (
 <div className={`text-sm rounded-xl px-4 py-3 border font-medium ${bildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>{bildirim.metin}</div>
 )}

 <div className="bg-red-700 text-white rounded-2xl px-8 py-6">
 <h1 className="text-2xl font-bold mb-1">Merhaba, {adSoyad}!</h1>
 <p className="text-red-200 text-sm">Bölüm Başkanı Paneline Hoş Geldiniz.</p>
 </div>

 {/* Sekmeler */}
 <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
 {sekmeler.map((s) => (
 <button key={s.key} onClick={() => setAktifSekme(s.key)}
 className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2 ${aktifSekme === s.key ? "bg-white text-red-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
 {s.label}
 {s.badge ? <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{s.badge}</span> : null}
 </button>
 ))}
 </div>

 {/* PANEL */}
 {aktifSekme === "panel" && (
 <div className="space-y-5">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: "Toplam Ders", deger: dersler.length, emoji: "", renk: "text-red-700" },
 { label: "Öğretmen Sayısı", deger: ogretmenler.length, emoji: "‍", renk: "text-blue-600" },
 { label: "Atanmış Ders", deger: atanmisDersSayisi, emoji: "", renk: "text-emerald-600" },
 { label: "Bekleyen Sipariş", deger: bekleyenSayisi, emoji: "⏳", renk: "text-amber-600" },
 ].map((k) => (
 <div key={k.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
 <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">{k.label}</p>
 <div className="flex items-center justify-center gap-2">
 <span className="text-3xl">{k.emoji}</span>
 <span className={`text-3xl font-bold ${k.renk}`}>{k.deger}</span>
 </div>
 </div>
 ))}
 </div>
 <Link href="/dersler">
 <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm p-6 hover:shadow-md transition cursor-pointer flex items-center gap-4">
 <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-2xl"></span></div>
 <div><h3 className="font-bold text-lg text-red-700">Ders Yönetimi</h3><p className="text-gray-500 text-sm">Dersleri ekleyin, silin ve öğretmenlere atayın</p></div>
 <span className="ml-auto text-sm font-semibold text-red-700">Git →</span>
 </div>
 </Link>
 </div>
 )}

 {/* KULLANICILAR */}
 {aktifSekme === "kullanici" && (
 <div className="space-y-5">
 {/* Ekle formu */}
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
 <h2 className="font-semibold text-gray-800">Yeni Kullanıcı Ekle</h2>
 <div className="grid grid-cols-2 gap-4">
 {[{ label: "Ad Soyad", val: yeniAd, set: setYeniAd, ph: "Ad Soyad" }, { label: "Kullanıcı Adı", val: yeniKadi, set: setYeniKadi, ph: "kullanici_adi" }, { label: "Şifre", val: yeniSifre, set: setYeniSifre, ph: "Şifre" }].map((f) => (
 <div key={f.label}>
 <label className="text-xs font-medium text-gray-700 block mb-1">{f.label}</label>
 <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
 className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black p-2 focus:outline-none focus:ring-2 focus:ring-red-500" />
 </div>
 ))}
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Rol</label>
 <select value={yeniRol} onChange={(e) => setYeniRol(e.target.value)}
 className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 {ROLLER.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
 </select>
 </div>
 </div>
 <button onClick={handleKullaniciEkle} className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition text-sm">+ Kullanıcı Ekle</button>
 </div>

 {/* Kullanıcı listesi */}
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">Mevcut Kullanıcılar</h2></div>
 <div className="divide-y divide-gray-50">
 {kullanicilar.map((k) => (
 <div key={k.id} className="px-6 py-4">
 {duzenleKullanici?.id === k.id ? (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <input value={duzenleKullanici.ad_soyad} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, ad_soyad: e.target.value })} placeholder="Ad Soyad" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
 <input value={duzenleKullanici.username} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, username: e.target.value })} placeholder="Kullanıcı adı" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
 <input type="password" placeholder="Yeni şifre (boş bırakılabilir)" onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, password_hash: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
 <select value={duzenleKullanici.role} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, role: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 {ROLLER.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
 </select>
 </div>
 <div className="flex gap-2">
 <button onClick={handleKullaniciGuncelle} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition">Kaydet</button>
 <button onClick={() => setDuzenleKullanici(null)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-4 py-2 rounded-lg transition">İptal</button>
 </div>
 </div>
 ) : (
 <div className="flex items-center justify-between">
 <div>
 <p className="font-medium text-gray-800 text-sm">{k.ad_soyad || k.username}</p>
 <p className="text-xs text-gray-400">@{k.username}</p>
 </div>
 <div className="flex items-center gap-3">
 <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROL_RENK[k.role] || "bg-gray-100 text-gray-600"}`}>{ROL_LABEL[k.role] || k.role}</span>
 <button onClick={() => setDuzenleKullanici(k)} className="text-xs text-blue-600 hover:underline font-medium">Düzenle</button>
 <button onClick={() => handleKullaniciSil(k.id, k.ad_soyad || k.username)} className="text-xs text-red-500 hover:underline font-medium">Sil</button>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* LİSTELER */}
 {aktifSekme === "listeler" && (
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-100">
 <h2 className="font-semibold text-gray-800">Öğretmen Bazlı Liste İndir</h2>
 <p className="text-xs text-gray-400 mt-1">Seçilen öğretmenin tüm ders ve hafta listelerini Excel olarak indir</p>
 </div>
 {ogretmenler.length === 0 ? (
 <div className="py-20 text-center text-gray-400 text-sm">Henüz öğretmen bulunmuyor.</div>
 ) : ogretmenler.map((o) => {
 const dc = (o.dersler || []).length;
 return (
 <div key={o.id} className="px-6 py-4 flex items-center justify-between border-b border-gray-50 last:border-0">
 <div>
 <p className="font-medium text-gray-800 text-sm">{o.ad_soyad || o.username}</p>
 <p className="text-xs text-gray-400 mt-0.5">{dc > 0 ? `${dc} ders · ` + (o.dersler || []).map((dId) => dersler.find((d) => d.id === dId)?.kod).filter(Boolean).join(", ") : "Ders atanmamış"}</p>
 </div>
 <button onClick={() => handleListeIndir(o.id)} disabled={listeYukleniyor || dc === 0}
 className="text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-xl transition">
 Excel İndir
 </button>
 </div>
 );
 })}
 </div>
 )}

 {/* SİPARİŞLER */}
 {aktifSekme === "siparisler" && (
 <div className="space-y-4">
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Hafta</label>
 <select value={sipFiltreHafta} onChange={(e) => setSipFiltreHafta(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 {sipHaftalar.map((h) => <option key={h} value={h}>{h === "tumu" ? "Tüm Haftalar" : h}</option>)}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Durum</label>
 <select value={sipFiltreDurum} onChange={(e) => setSipFiltreDurum(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 <option value="tumu">Tüm Durumlar</option>
 <option value="bekliyor">⏳ Bekliyor</option>
 <option value="onaylandi">Onaylandı</option>
 <option value="teslim_alindi">Teslim Alındı</option>
 </select>
 </div>
 <div className="ml-auto text-xs text-gray-400">{filtreliSiparisler.length} sipariş</div>
 </div>

 <div className="flex gap-4">
 <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
 {filtreliSiparisler.length === 0 ? (
 <div className="py-20 text-center text-gray-400 text-sm">Sipariş bulunamadı.</div>
 ) : (
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100 text-left">
 {["ÖĞRETMEN", "DERS", "HAFTA", "DURUM", "İŞLEM"].map((h) => <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {filtreliSiparisler.map((s) => (
 <tr key={s.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${sipDetay?.id === s.id ? "bg-blue-50" : ""}`} onClick={() => setSipDetay(sipDetay?.id === s.id ? null : s)}>
 <td className="px-4 py-3 font-medium text-gray-800">{s.ogretmenAdi}</td>
 <td className="px-4 py-3 text-gray-500 text-xs">{s.dersAdi}</td>
 <td className="px-4 py-3 text-gray-500">{s.hafta}</td>
 <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full border ${DURUM_STIL[s.durum]}`}>{DURUM_LABEL[s.durum]}</span></td>
 <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
 <div className="flex gap-1">
 {s.durum === "bekliyor" && <button onClick={() => handleDurumGuncelle(s.id, "onaylandi")} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 py-1.5 rounded-lg transition">Onayla</button>}
 {s.durum === "onaylandi" && <button onClick={() => handleDurumGuncelle(s.id, "teslim_alindi")} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1.5 rounded-lg transition">Teslim</button>}
 {s.durum !== "bekliyor" && <button onClick={() => handleDurumGuncelle(s.id, "bekliyor")} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2.5 py-1.5 rounded-lg transition">Geri Al</button>}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 {sipDetay && (
 <div className="w-72 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3 self-start sticky top-4">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-gray-800 text-sm">Sipariş Detayı</h3>
 <button onClick={() => setSipDetay(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
 </div>
 <div className="space-y-1 text-xs text-gray-500">
 <p><span className="font-medium text-gray-700">Öğretmen:</span> {sipDetay.ogretmenAdi}</p>
 <p><span className="font-medium text-gray-700">Ders:</span> {sipDetay.dersAdi}</p>
 <p><span className="font-medium text-gray-700">Hafta:</span> {sipDetay.hafta}</p>
 <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${DURUM_STIL[sipDetay.durum]}`}>{DURUM_LABEL[sipDetay.durum]}</span>
 </div>
 <div className="divide-y divide-gray-50">
 {sipDetay.urunler.map((u, i) => (
 <div key={i} className="py-2">
 <p className="text-xs font-medium text-gray-800">{u.urunAdi}</p>
 <p className="text-xs text-gray-400">{u.miktar} {u.olcu} · {u.toplam > 0 ? `₺${u.toplam.toFixed(2)}` : "—"}</p>
 </div>
 ))}
 </div>
 <div className="border-t border-gray-100 pt-2">
 <p className="text-xs font-bold text-gray-800">Toplam: {sipDetay.genelToplam > 0 ? `₺${sipDetay.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</p>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* ÜRÜN HAVUZU */}
 {aktifSekme === "urunler" && (
 <div className="space-y-4">
 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
 <input value={urunArama} onChange={(e) => setUrunArama(e.target.value)} placeholder="Ürün adı veya marka ara..."
 className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-red-500" />
 <select value={urunKategori} onChange={(e) => setUrunKategori(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 {kategoriler.map((k) => <option key={k}>{k}</option>)}
 </select>
 <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1.5 font-medium">{filtreliUrunler.length} / {urunler.length} ürün</span>
 <button onClick={() => { setUrunForm(BOSH_URUN); setDuzenleUrunId(null); setUrunPanel(true); }} className="bg-red-700 hover:bg-red-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">+ Yeni Ürün</button>
 <label className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition cursor-pointer">
 Excel'den Yükle <input ref={dosyaRef} type="file" accept=".xlsx,.xls" onChange={handleExcelYukle} className="hidden" />
 </label>
 </div>

 <div className="flex gap-4">
 <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
 {filtreliUrunler.length === 0 ? (
 <div className="py-20 text-center text-gray-400 text-sm">{urunler.length === 0 ? "Henüz ürün yok." : "Ürün bulunamadı."}</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100 text-left">
 {["Ürün Adı", "Marka", "Fiyat", "Ölçü", "Kategori", "Stok", ""].map((h) => <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {filtreliUrunler.map((u) => (
 <tr key={u.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { const { id, ...rest } = u; setUrunForm(rest); setDuzenleUrunId(id); setUrunPanel(true); }}>
 <td className="px-4 py-3 font-medium text-gray-800">{u.urunAdi}</td>
 <td className="px-4 py-3 text-gray-500">{u.marka || "—"}</td>
 <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{u.fiyat > 0 ? `₺${u.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</td>
 <td className="px-4 py-3 text-gray-500">{u.olcu}</td>
 <td className="px-4 py-3">{u.kategori ? <span className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full border border-red-100">{u.kategori}</span> : "—"}</td>
 <td className="px-4 py-3"><span className={`text-xs font-medium ${u.stok > 0 ? "text-emerald-600" : "text-gray-400"}`}>{u.stok}</span></td>
 <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
 <button onClick={() => handleUrunSil(u.id)} className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline transition">Sil</button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {urunPanel && (
 <div className="w-72 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3 self-start sticky top-4">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-gray-800 text-sm">{duzenleUrunId ? "Ürün Düzenle" : "Yeni Ürün"}</h3>
 <button onClick={() => { setUrunPanel(false); setDuzenleUrunId(null); setUrunForm(BOSH_URUN); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
 </div>
 {[{ label: "Ürün Adı *", key: "urunAdi", type: "text" }, { label: "Marka", key: "marka", type: "text" }, { label: "Fiyat (₺)", key: "fiyat", type: "number" }, { label: "Kategori", key: "kategori", type: "text" }, { label: "Market", key: "market", type: "text" }, { label: "Stok", key: "stok", type: "number" }, { label: "Kod", key: "kod", type: "text" }, { label: "Notlar", key: "notlar", type: "text" }].map(({ label, key, type }) => (
 <div key={key}>
 <label className="text-xs font-medium text-gray-700 block mb-1">{label}</label>
 <input type={type} value={(urunForm as any)[key]} onChange={(e) => setUrunForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" min={type === "number" ? 0 : undefined} />
 </div>
 ))}
 <div>
 <label className="text-xs font-medium text-gray-700 block mb-1">Ölçü</label>
 <select value={urunForm.olcu} onChange={(e) => setUrunForm((f) => ({ ...f, olcu: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
 {OLCU_SEC.map((o) => <option key={o}>{o}</option>)}
 </select>
 </div>
 <div className="flex gap-2 pt-1">
 <button onClick={handleUrunKaydet} className="flex-1 bg-red-700 hover:bg-red-800 text-white text-sm font-medium py-2.5 rounded-xl transition">{duzenleUrunId ? "Güncelle" : "Ekle"}</button>
 <button onClick={() => { setUrunForm(BOSH_URUN); setDuzenleUrunId(null); }} className="px-4 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Temizle</button>
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </DashboardLayout>
 );
}