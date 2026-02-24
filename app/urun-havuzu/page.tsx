"use client";

import { useEffect, useState, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

export type Urun = {
 id: string;
 urunAdi: string;
 marka: string;
 fiyat: number;
 olcu: string;
 kategori: string;
 market: string;
 stok: number;
 kod: string;
 notlar: string;
};

const OLCU_SECENEKLERI = ["Kg", "L", "Paket", "Adet", "G", "Ml", "Kutu"];
const BOSH_FORM: Omit<Urun, "id">= { urunAdi: "", marka: "", fiyat: 0, olcu: "Kg", kategori: "", market: "", stok: 0, kod: "", notlar: "" };

export default function UrunHavuzuPage() {
 const [urunler, setUrunler] = useState<Urun[]>([]);
 const [aramaMetni, setAramaMetni] = useState("");
 const [secilenKategori, setSecilenKategori] = useState("Tümü");
 const [secilenMarka, setSecilenMarka] = useState("Tümü");
 const [form, setForm] = useState<Omit<Urun, "id">>(BOSH_FORM);
 const [duzenleId, setDuzenleId] = useState<string | null>(null);
 const [panelAcik, setPanelAcik] = useState(false);
 const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
 const [yukleniyor, setYukleniyor] = useState(true);
  const [aktifRol, setAktifRol] = useState("");
 const dosyaRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setAktifRol(localStorage.getItem("role") || ""); fetchUrunler(); }, []);

 const fetchUrunler = async () => {
 setYukleniyor(true);
 const { data } = await supabase.from("urunler").select("*").order("urun_adi");
 setUrunler((data || []).map((u: any) => ({
 id: u.id, urunAdi: u.urun_adi, marka: u.marka, fiyat: u.fiyat,
 olcu: u.olcu, kategori: u.kategori, market: u.market, stok: u.stok, kod: u.kod, notlar: u.notlar,
 })));
 setYukleniyor(false);
 };

 const bildirimGoster = (tip: "basari" | "hata", metin: string) => {
 setBildirim({ tip, metin });
 setTimeout(() => setBildirim(null), 3500);
 };

 const handleExcelYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
 const dosya = e.target.files?.[0];
 if (!dosya) return;
 const reader = new FileReader();
 reader.onload = async (ev) => {
 try {
 const wb = XLSX.read(ev.target?.result, { type: "binary" });
 const ws = wb.Sheets[wb.SheetNames[0]];
 const satirlar: any[] = XLSX.utils.sheet_to_json(ws);
 const yeniUrunler = satirlar.filter((s) => s["Ürün Adı"]).map((s) => ({
 urun_adi: String(s["Ürün Adı"] ?? ""),
 marka: String(s["Marka"] ?? ""),
 fiyat: Number(s["Fiyat"] ?? 0),
 olcu: String(s["Ölçü"] ?? "Kg"),
 kategori: String(s["Kategori"] ?? ""),
 market: String(s["Market"] ?? ""),
 stok: Number(s["Stok"] ?? 0),
 kod: String(s["Kod"] ?? ""),
 notlar: String(s["Notlar"] ?? ""),
 }));
 const { error } = await supabase.from("urunler").insert(yeniUrunler);
 if (error) { bildirimGoster("hata", "Hata: " + error.message); return; }
 bildirimGoster("basari", `${yeniUrunler.length} ürün eklendi.`);
 fetchUrunler();
 } catch { bildirimGoster("hata", "Excel dosyası okunamadı."); }
 };
 reader.readAsBinaryString(dosya);
 if (dosyaRef.current) dosyaRef.current.value = "";
 };

 const handleFormKaydet = async () => {
 if (!form.urunAdi.trim()) { bildirimGoster("hata", "Ürün adı boş olamaz."); return; }
 const dbObj = {
 urun_adi: form.urunAdi, marka: form.marka, fiyat: form.fiyat,
 olcu: form.olcu, kategori: form.kategori, market: form.market,
 stok: form.stok, kod: form.kod, notlar: form.notlar,
 };
 if (duzenleId) {
 const { error } = await supabase.from("urunler").update(dbObj).eq("id", duzenleId);
 if (error) { bildirimGoster("hata", "Hata: " + error.message); return; }
 bildirimGoster("basari", "Ürün güncellendi.");
 } else {
 const { error } = await supabase.from("urunler").insert(dbObj);
 if (error) { bildirimGoster("hata", "Hata: " + error.message); return; }
 bildirimGoster("basari", "Ürün eklendi.");
 }
 setForm(BOSH_FORM); setDuzenleId(null); setPanelAcik(false);
 fetchUrunler();
 };

 const handleDuzenle = (urun: Urun) => {
    if (aktifRol === "ogretmen") return;
 const { id, ...rest } = urun;
 setForm(rest); setDuzenleId(id); setPanelAcik(true);
 };

 const handleSil = async (id: string) => {
 if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
 await supabase.from("urunler").delete().eq("id", id);
 bildirimGoster("basari", "Ürün silindi.");
 fetchUrunler();
 };

 const handleTopluSil = async () => {
 if (!confirm("Tüm ürünleri silmek istediğinizden emin misiniz?")) return;
 await supabase.from("urunler").delete().neq("id", "");
 bildirimGoster("basari", "Tüm ürünler silindi.");
 fetchUrunler();
 };

 const kategoriler = ["Tümü", ...Array.from(new Set(urunler.map((u) => u.kategori).filter(Boolean))).sort()];
 const markalar = ["Tümü", ...Array.from(new Set(urunler.map((u) => u.marka).filter(Boolean))).sort()];

 const filtrelenmis = urunler.filter((u) => {
 const aramaUygun = !aramaMetni || u.urunAdi.toLowerCase().includes(aramaMetni.toLowerCase()) || u.marka.toLowerCase().includes(aramaMetni.toLowerCase()) || u.kod.toLowerCase().includes(aramaMetni.toLowerCase());
 const kategoriUygun = secilenKategori === "Tümü" || u.kategori === secilenKategori;
 const markaUygun = secilenMarka === "Tümü" || u.marka === secilenMarka;
 return aramaUygun && kategoriUygun && markaUygun;
 });

 return (
 <DashboardLayout title="Ürün Havuzu">
 <div className="space-y-5 max-w-7xl">
 {bildirim && (
 <div className={`text-sm rounded-xl px-4 py-3 border font-medium ${bildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
 {bildirim.metin}
 </div>
 )}

 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
 <div className="flex flex-wrap gap-3 items-center">
 <input type="text" value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)}
 placeholder="Ürün adı, marka veya kod ara..."
 className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
 <select value={secilenKategori} onChange={(e) => setSecilenKategori(e.target.value)}
 className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
 {kategoriler.map((k) => <option key={k}>{k}</option>)}
 </select>
 <select value={secilenMarka} onChange={(e) => setSecilenMarka(e.target.value)}
 className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
 {markalar.map((m) => <option key={m}>{m}</option>)}
 </select>
 <div className="flex-1" />
 <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1.5 font-medium">
 {filtrelenmis.length} / {urunler.length} ürün
 </span>
 <button type="button" onClick={() => { setForm(BOSH_FORM); setDuzenleId(null); setPanelAcik(true); }}
 className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">
 + Yeni Ürün
 </button>
 <label className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition cursor-pointer">
 Excel'den Yükle
 <input ref={dosyaRef} type="file" accept=".xlsx,.xls" onChange={handleExcelYukle} className="hidden" />
 </label>
 {urunler.length > 0 && aktifRol !== "ogretmen" && (
 <button type="button" onClick={handleTopluSil}
 className="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl transition">
 Tümünü Sil
 </button>
 )}
 </div>
 </div>

 <div className="flex gap-5">
 <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
 {yukleniyor ? (
 <div className="py-20 text-center text-gray-400 text-sm">Yükleniyor...</div>
 ) : filtrelenmis.length === 0 ? (
 <div className="py-20 text-center">
 <p className="text-gray-400 text-sm">{urunler.length === 0 ? "Henüz ürün yok." : "Bu filtreye uygun ürün bulunamadı."}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100 text-left">
 {["Ürün Adı", "Marka", "Fiyat", "Ölçü", "Kategori", "Market", "Stok", "Kod", ""].map((h) => (
 <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {filtrelenmis.map((u) => (
 <tr key={u.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => handleDuzenle(u)}>
 <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{u.urunAdi}</td>
 <td className="px-4 py-3 text-gray-500">{u.marka || "—"}</td>
 <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
 {u.fiyat > 0 ? `₺${u.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
 </td>
 <td className="px-4 py-3 text-gray-500">{u.olcu}</td>
 <td className="px-4 py-3">{u.kategori ? <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">{u.kategori}</span> : "—"}</td>
 <td className="px-4 py-3 text-gray-500">{u.market || "—"}</td>
 <td className="px-4 py-3"><span className={`text-xs font-medium ${u.stok > 0 ? "text-emerald-600" : "text-gray-400"}`}>{u.stok}</span></td>
 <td className="px-4 py-3 text-gray-400 text-xs font-mono">{u.kod || "—"}</td>
 <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {aktifRol !== "ogretmen" && (<button type="button" onClick={() => handleSil(u.id)} className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline transition">Sil</button>)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {panelAcik && (
 <div className="w-72 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 self-start sticky top-4">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-gray-800 text-sm">{duzenleId ? "Ürün Düzenle" : "Yeni Ürün"}</h3>
 <button type="button" onClick={() => { setPanelAcik(false); setDuzenleId(null); setForm(BOSH_FORM); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
 </div>
 {[
 { label: "Ürün Adı *", key: "urunAdi", type: "text" },
 { label: "Marka", key: "marka", type: "text" },
 { label: "Fiyat (₺)", key: "fiyat", type: "number" },
 { label: "Kategori", key: "kategori", type: "text" },
 { label: "Market", key: "market", type: "text" },
 { label: "Stok", key: "stok", type: "number" },
 { label: "Kod", key: "kod", type: "text" },
 { label: "Notlar", key: "notlar", type: "text" },
 ].map(({ label, key, type }) => (
 <div key={key} className="flex flex-col gap-1">
 <label className="text-xs font-medium text-gray-700">{label}</label>
 <input type={type} value={(form as any)[key]}
 onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
 className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
 min={type === "number" ? 0 : undefined} />
 </div>
 ))}
 <div className="flex flex-col gap-1">
 <label className="text-xs font-medium text-gray-700">Ölçü</label>
 <select value={form.olcu} onChange={(e) => setForm((f) => ({ ...f, olcu: e.target.value }))}
 className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
 {OLCU_SECENEKLERI.map((o) => <option key={o}>{o}</option>)}
 </select>
 </div>
 <div className="flex gap-2 pt-1">
 <button type="button" onClick={handleFormKaydet}
 className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition">
 {duzenleId ? "Güncelle" : "Ekle"}
 </button>
 <button type="button" onClick={() => { setForm(BOSH_FORM); setDuzenleId(null); }}
 className="px-4 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
 Temizle
 </button>
 </div>
 </div>
 )}
 </div>
 <p className="text-xs text-gray-400 text-center">Ürün Havuzu: {urunler.length} | Görüntülenen: {filtrelenmis.length}</p>
 </div>
 </DashboardLayout>
 );
}