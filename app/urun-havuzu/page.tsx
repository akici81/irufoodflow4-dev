"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
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

const BOSH_FORM: Omit<Urun, "id"> = {
  urunAdi: "",
  marka: "",
  fiyat: 0,
  olcu: "Kg",
  kategori: "",
  market: "",
  stok: 0,
  kod: "",
  notlar: ""
};

export default function UrunHavuzuPage() {
  const { yetkili, yukleniyor: authYukleniyor } = useAuth("/urun-havuzu");

  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [aramaMetni, setAramaMetni] = useState("");
  const [secilenKategori, setSecilenKategori] = useState("Tümü");
  const [secilenMarka, setSecilenMarka] = useState("Tümü");
  const [form, setForm] = useState<Omit<Urun, "id">>(BOSH_FORM);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [panelAcik, setPanelAcik] = useState(false);
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [veriYukleniyor, setVeriYukleniyor] = useState(true);
  const [aktifRol, setAktifRol] = useState("");
  const dosyaRef = useRef<HTMLInputElement>(null);

  const fetchUrunler = useCallback(async () => {
    setVeriYukleniyor(true);
    const { data } = await supabase.from("urunler").select("*").order("urun_adi");
    setUrunler((data || []).map((u: any) => ({
      id: u.id,
      urunAdi: u.urun_adi,
      marka: u.marka,
      fiyat: u.fiyat,
      olcu: u.olcu,
      kategori: u.kategori,
      market: u.market,
      stok: u.stok,
      kod: u.kod,
      notlar: u.notlar,
    })));
    setVeriYukleniyor(false);
  }, []);

  useEffect(() => {
    setAktifRol(localStorage.getItem("role") || "");
    if (yetkili) fetchUrunler();
  }, [yetkili, fetchUrunler]);

  if (authYukleniyor) return (
    <DashboardLayout title="Ürün Havuzu">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
      </div>
    </DashboardLayout>
  );

  if (!yetkili) return null;

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
        const XLSX = await import("xlsx");
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
        if (error) { bildirimGoster("hata", error.message); return; }
        bildirimGoster("basari", `${yeniUrunler.length} ürün eklendi.`);
        fetchUrunler();
      } catch {
        bildirimGoster("hata", "Excel dosyası okunamadı.");
      }
    };
    reader.readAsBinaryString(dosya);
    if (dosyaRef.current) dosyaRef.current.value = "";
  };

  const handleFormKaydet = async () => {
    if (!form.urunAdi.trim()) { bildirimGoster("hata", "Ürün adı boş olamaz."); return; }
    const dbObj = {
      urun_adi: form.urunAdi,
      marka: form.marka,
      fiyat: form.fiyat,
      olcu: form.olcu,
      kategori: form.kategori,
      market: form.market,
      stok: form.stok,
      kod: form.kod,
      notlar: form.notlar,
    };
    if (duzenleId) {
      const { error } = await supabase.from("urunler").update(dbObj).eq("id", duzenleId);
      if (error) { bildirimGoster("hata", error.message); return; }
      bildirimGoster("basari", "Ürün güncellendi.");
    } else {
      const { error } = await supabase.from("urunler").insert(dbObj);
      if (error) { bildirimGoster("hata", error.message); return; }
      bildirimGoster("basari", "Ürün başarıyla eklendi.");
    }
    setForm(BOSH_FORM);
    setDuzenleId(null);
    setPanelAcik(false);
    fetchUrunler();
  };

  const handleSil = async (id: string) => {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
    await supabase.from("urunler").delete().eq("id", id);
    bildirimGoster("basari", "Ürün silindi.");
    fetchUrunler();
  };

  const kategoriler = ["Tümü", ...Array.from(new Set(urunler.map((u) => u.kategori).filter(Boolean))).sort()];
  const markalar = ["Tümü", ...Array.from(new Set(urunler.map((u) => u.marka).filter(Boolean))).sort()];

  const filtrelenmis = urunler.filter((u) => {
    const aramaUygun = !aramaMetni ||
      u.urunAdi.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      u.marka.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      u.kod.toLowerCase().includes(aramaMetni.toLowerCase());
    const kategoriUygun = secilenKategori === "Tümü" || u.kategori === secilenKategori;
    const markaUygun = secilenMarka === "Tümü" || u.marka === secilenMarka;
    return aramaUygun && kategoriUygun && markaUygun;
  });

  return (
    <DashboardLayout title="Ürün Havuzu" subtitle="Üniversite genelindeki tüm malzemeleri yönetin">
      {bildirim && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-10 ${
          bildirim.tip === "basari" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
        }`}>
          <span className="text-xl">{bildirim.tip === "basari" ? "✓" : "✕"}</span>
          <p className="font-bold text-sm uppercase tracking-tight">{bildirim.metin}</p>
        </div>
      )}

      <div className="space-y-6 animate-in fade-in duration-700">
        
        {/* Üst Araç Çubuğu */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <input
                  value={aramaMetni}
                  onChange={(e) => setAramaMetni(e.target.value)}
                  placeholder="Ürün adı, marka veya kod ara..."
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[primary-900]/20 transition-all pl-12"
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <select
                value={secilenKategori}
                onChange={(e) => setSecilenKategori(e.target.value)}
                className="bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[primary-900]/20 transition-all min-w-[150px]"
              >
                {kategoriler.map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>

            <div className="flex gap-3">
              <label className="cursor-pointer bg-white border border-gray-200 hover:border-gray-400 text-gray-700 text-xs font-black uppercase tracking-widest px-6 py-4 rounded-2xl transition-all shadow-sm">
                EXCEL YÜKLE
                <input ref={dosyaRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelYukle} />
              </label>
              <button
                onClick={() => { setForm(BOSH_FORM); setDuzenleId(null); setPanelAcik(true); }}
                className="bg-primary-900 hover:bg-red-800 text-white text-xs font-black uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-lg shadow-red-900/20"
              >
                + YENİ ÜRÜN
              </button>
            </div>
          </div>
        </div>

        {/* Ürün Listesi Tablosu */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {veriYukleniyor ? (
            <div className="p-20 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900 mx-auto mb-4"></div>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Veriler Yükleniyor...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 text-left border-b border-gray-100">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-700 uppercase tracking-widest">Ürün Bilgisi</th>
                    <th className="px-4 py-5 text-[10px] font-black text-gray-700 uppercase tracking-widest">Birim Fiyat</th>
                    <th className="px-4 py-5 text-[10px] font-black text-gray-700 uppercase tracking-widest">Kategori</th>
                    <th className="px-4 py-5 text-[10px] font-black text-gray-700 uppercase tracking-widest">Stok</th>
                    <th className="px-4 py-5 text-[10px] font-black text-gray-700 uppercase tracking-widest">Kod</th>
                    <th className="px-8 py-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrelenmis.map((u) => (
                    <tr 
                      key={u.id} 
                      onClick={() => {
                        if (aktifRol !== "ogretmen") {
                          const { id, ...rest } = u;
                          setForm(rest);
                          setDuzenleId(id);
                          setPanelAcik(true);
                        }
                      }}
                      className="group hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <td className="px-8 py-5">
                        <p className="font-black text-gray-800 text-sm tracking-tight">{u.urunAdi}</p>
                        <p className="text-[10px] font-bold text-gray-700 uppercase">{u.marka || "Standart"} • {u.olcu}</p>
                      </td>
                      <td className="px-4 py-5 font-bold text-gray-700 text-sm italic">
                        {u.fiyat > 0 ? `₺${u.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-4 py-5">
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          {u.kategori || "Genel"}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span className={`text-sm font-black ${u.stok > 10 ? "text-emerald-600" : "text-amber-600"}`}>
                          {u.stok}
                        </span>
                      </td>
                      <td className="px-4 py-5 font-mono text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors">
                        {u.kod || "—"}
                      </td>
                      <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                        {aktifRol !== "ogretmen" && (
                          <button
                            onClick={() => handleSil(u.id)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modern Sağ Panel / Modal */}
      {panelAcik && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-end p-0 md:p-6 transition-all animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full md:h-auto md:max-h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-20 duration-500">
            <div className="px-10 pt-10 pb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tighter">
                  {duzenleId ? "Ürünü Güncelle" : "Yeni Malzeme Ekle"}
                </h2>
                <p className="text-sm text-gray-400 font-medium">Havuz bilgilerini eksiksiz doldurun</p>
              </div>
              <button
                onClick={() => { setPanelAcik(false); setDuzenleId(null); setForm(BOSH_FORM); }}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-400 hover:text-gray-800 rounded-2xl transition-all"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 px-10 py-4 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest block mb-2">Ürün Adı *</label>
                  <input
                    value={form.urunAdi}
                    onChange={(e) => setForm(f => ({ ...f, urunAdi: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[primary-900]/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest block mb-2">Marka</label>
                  <input
                    value={form.marka}
                    onChange={(e) => setForm(f => ({ ...f, marka: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[primary-900]/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest block mb-2">Birim Fiyat (₺)</label>
                  <input
                    type="number"
                    value={form.fiyat}
                    onChange={(e) => setForm(f => ({ ...f, fiyat: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[primary-900]/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest block mb-2">Kategori</label>
                  <input
                    value={form.kategori}
                    onChange={(e) => setForm(f => ({ ...f, kategori: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[primary-900]/20"
                    placeholder="Et, Süt, Manav vb."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest block mb-2">Ölçü Birimi</label>
                  <select
                    value={form.olcu}
                    onChange={(e) => setForm(f => ({ ...f, olcu: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[primary-900]/20"
                  >
                    {OLCU_SECENEKLERI.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-10 bg-gray-50/50 flex gap-4">
              <button
                onClick={handleFormKaydet}
                className="flex-1 bg-primary-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-900/20 hover:bg-red-800 transition-all uppercase text-xs tracking-widest"
              >
                {duzenleId ? "DEĞİŞİKLİKLERİ KAYDET" : "HAVUZA EKLE"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </DashboardLayout>
  );
}