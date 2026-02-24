"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

// --- Tipler ---
type Urun = { id: string; urunAdi: string; marka: string; fiyat: number; olcu: string; kategori: string; stok: number };
type Ders = { id: string; kod: string; ad: string };

interface SiparisUrun {
  urunId: string;
  urunAdi: string;
  miktar: number;
  olcu: string;
  birimFiyat: number;
  toplam: number;
}

const HAFTALAR = Array.from({ length: 10 }, (_, i) => `${i + 1}. Hafta`);

const olcuBilgisi = (olcu: string) => {
  const tip = olcu?.toLowerCase() || "";
  if (tip === "kg" || tip === "l") return { serbest: true, baslangic: 0, adim: 0.1 };
  if (tip === "g" || tip === "ml") return { serbest: false, baslangic: 50, adim: 50 };
  return { serbest: false, baslangic: 1, adim: 1 };
};

export default function AlisverisListeleriPage() {
  const { yetkili, yukleniyor } = useAuth("/alisveris-listelerim");

  const [kullaniciId, setKullaniciId] = useState<number | null>(null);
  const [kullaniciBilgi, setKullaniciBilgi] = useState<{ ad_soyad: string } | null>(null);
  const [atananDersler, setAtananDersler] = useState<Ders[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [secilenDers, setSecilenDers] = useState("");
  const [secilenHafta, setSecilenHafta] = useState("1. Hafta");
  const [aramaMetni, setAramaMetni] = useState("");
  const [liste, setListe] = useState<Record<string, number>>({});
  const [kgInputler, setKgInputler] = useState<Record<string, string>>({});
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const fetchData = useCallback(async () => {
    const id = localStorage.getItem("aktifKullaniciId");
    if (!id) return;
    setKullaniciId(Number(id));

    const { data: k } = await supabase.from("kullanicilar").select("ad_soyad, dersler").eq("id", id).single();
    if (k) {
      setKullaniciBilgi({ ad_soyad: k.ad_soyad });
      const { data: tumDersler } = await supabase.from("dersler").select("*").order("kod");
      setAtananDersler((tumDersler || []).filter((d: Ders) => (k.dersler || []).includes(d.id)));
    }

    const { data: urunData } = await supabase.from("urunler").select("*");
    setUrunler((urunData || []).map((u) => ({
      id: u.id, urunAdi: u.urun_adi, marka: u.marka, fiyat: u.fiyat, olcu: u.olcu, kategori: u.kategori, stok: u.stok ?? 0,
    })).sort((a, b) => a.urunAdi.localeCompare(b.urunAdi, "tr")));
  }, []);

  useEffect(() => {
    if (yetkili) fetchData();
  }, [yetkili, fetchData]);

  const haftaToplam = useMemo(() => {
    return Object.entries(liste).reduce((acc, [id, miktar]) => {
      const urun = urunler.find((u) => u.id === id);
      return acc + (urun ? urun.fiyat * miktar : 0);
    }, 0);
  }, [liste, urunler]);

  const handleCheckbox = (urun: Urun, isaretli: boolean) => {
    if (isaretli) {
      const { baslangic } = olcuBilgisi(urun.olcu);
      setListe(prev => ({ ...prev, [urun.id]: baslangic || (urun.olcu === "KG" ? 0 : 1) }));
    } else {
      setListe(prev => { const yeni = { ...prev }; delete yeni[urun.id]; return yeni; });
      setKgInputler(prev => { const yeni = { ...prev }; delete yeni[urun.id]; return yeni; });
    }
  };

  const handleKgInput = (urunId: string, metin: string) => {
    setKgInputler(prev => ({ ...prev, [urunId]: metin }));
    const num = parseFloat(metin.replace(",", "."));
    setListe(prev => ({ ...prev, [urunId]: (!isNaN(num) && num > 0) ? num : 0 }));
  };

  const handleHaftaKaydet = async () => {
    if (!secilenDers || Object.keys(liste).length === 0) {
      setBildirim({ tip: "hata", metin: "Lütfen ders seçin ve en az bir ürün ekleyin!" });
      return;
    }

    setKaydediliyor(true);
    const secilenDersObj = atananDersler.find(d => d.id === secilenDers);

    const kaydedilecekUrunler: SiparisUrun[] = Object.entries(liste).map(([id, miktar]) => {
      const urun = urunler.find(u => u.id === id)!;
      return {
        urunId: urun.id,
        urunAdi: urun.urunAdi,
        miktar: miktar,
        olcu: urun.olcu,
        birimFiyat: urun.fiyat,
        toplam: urun.fiyat * miktar
      };
    });

    const { error } = await supabase.from("siparisler").insert({
      ogretmen_id: kullaniciId,
      ogretmen_adi: kullaniciBilgi?.ad_soyad,
      ders_id: secilenDers,
      ders_adi: `${secilenDersObj?.kod} - ${secilenDersObj?.ad}`,
      hafta: secilenHafta,
      urunler: kaydedilecekUrunler,
      genel_toplam: haftaToplam,
      durum: "bekliyor",
      tarih: new Date().toLocaleDateString("tr-TR")
    });

    setKaydediliyor(false);

    if (error) {
      setBildirim({ tip: "hata", metin: "Hata: " + error.message });
    } else {
      setBildirim({ tip: "basari", metin: "Listeniz başarıyla merkeze iletildi!" });
      setListe({});
      setKgInputler({});
      setTimeout(() => setBildirim(null), 3000);
    }
  };

  if (yukleniyor) return <DashboardLayout title="Yükleniyor..."><div className="p-20 text-center animate-pulse text-gray-400 font-black tracking-widest uppercase">Veri Bağlantısı Kuruluyor...</div></DashboardLayout>;

  return (
    <DashboardLayout title="Alışveriş Listelerim" subtitle="Eğitim mutfağı için haftalık malzeme taleplerinizi oluşturun">
      <div className="max-w-7xl space-y-6">

        {/* Bildirim */}
        {bildirim && (
          <div className={`fixed top-6 right-6 z-50 px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-10 ${
            bildirim.tip === "basari" ? "bg-emerald-600 text-white border-emerald-400" : "bg-red-600 text-white border-red-400"
          }`}>
            <span className="text-lg font-black">{bildirim.tip === "basari" ? "✓" : "!"}</span>
            <p className="font-black text-[11px] uppercase tracking-widest">{bildirim.metin}</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">

          <div className="col-span-12 lg:col-span-9 space-y-6">
            {/* Ders ve Hafta Seçimi */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-900"></span> Sorumlu Olduğunuz Ders
                </label>
                <select value={secilenDers} onChange={(e) => setSecilenDers(e.target.value)}
                  className="w-full bg-gray-100 border-2 border-transparent focus:border-gray-300 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 outline-none transition-all appearance-none cursor-pointer">
                  <option value="">Ders Seçiniz...</option>
                  {atananDersler.map(d => <option key={d.id} value={d.id}>{d.kod} - {d.ad}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-900"></span> Planlanacak Hafta
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {HAFTALAR.map(h => (
                    <button key={h} onClick={() => setSecilenHafta(h)}
                      className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all transform active:scale-90 ${
                        secilenHafta === h ? "bg-primary-900 text-white shadow-lg shadow-primary-900/20 scale-110" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}>
                      {h.split(".")[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ürün Listesi */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-10 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-900 tracking-tighter uppercase italic text-sm">Ürün Kataloğu</h3>
                <div className="relative">
                  <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)}
                    placeholder="Malzeme ara..."
                    className="bg-white border border-gray-200 rounded-full px-6 py-2.5 text-xs w-64 outline-none focus:ring-4 focus:ring-primary-900/10 focus:border-primary-900/30 transition-all font-medium" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                      <th className="px-10 py-5">Durum</th>
                      <th className="px-4 py-5">Malzeme Bilgisi</th>
                      <th className="px-4 py-5">Birim Fiyat</th>
                      <th className="px-4 py-5 text-center">Miktar Ayarı</th>
                      <th className="px-10 py-5 text-right">Ara Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {urunler.filter(u => !aramaMetni || u.urunAdi.toLowerCase().includes(aramaMetni.toLowerCase())).map(u => {
                      const secili = u.id in liste;
                      const miktar = liste[u.id] ?? 0;
                      return (
                        <tr key={u.id} className={`transition-colors ${secili ? "bg-primary-900/5" : "hover:bg-gray-50/50"}`}>
                          <td className="px-10 py-4">
                            <input type="checkbox" checked={secili} onChange={(e) => handleCheckbox(u, e.target.checked)}
                              className="w-6 h-6 accent-primary-900 rounded-lg cursor-pointer transition-transform hover:scale-110" />
                          </td>
                          <td className="px-4 py-4">
                            <p className={`font-bold text-sm transition-colors ${secili ? "text-primary-900" : "text-gray-900"}`}>{u.urunAdi}</p>
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{u.marka || "—"} • {u.olcu}</span>
                          </td>
                          <td className="px-4 py-4 text-xs font-bold text-gray-500 italic">₺{u.fiyat.toFixed(2)}</td>
                          <td className="px-4 py-4">
                            {secili && (
                              <div className="flex items-center justify-center animate-in zoom-in-95 duration-200">
                                {olcuBilgisi(u.olcu).serbest ? (
                                  <div className="flex items-center gap-2 bg-white border border-primary-900/20 rounded-xl px-3 py-1 shadow-sm">
                                    <input type="text" value={kgInputler[u.id] !== undefined ? kgInputler[u.id] : (miktar > 0 ? String(miktar).replace(".", ",") : "")}
                                      onChange={(e) => handleKgInput(u.id, e.target.value)}
                                      className="w-16 text-center text-xs font-black text-primary-900 outline-none" placeholder="0,00" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase">{u.olcu}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center bg-white border border-primary-900/20 rounded-xl overflow-hidden shadow-sm">
                                    <button onClick={() => setListe(p => ({...p, [u.id]: Math.max(0, (p[u.id] || 0) - 1)}))} className="w-8 h-8 hover:bg-gray-100 text-gray-500 font-bold transition-colors">-</button>
                                    <span className="w-10 text-center text-[11px] font-black text-primary-900 border-x border-gray-200">{miktar}</span>
                                    <button onClick={() => setListe(p => ({...p, [u.id]: (p[u.id] || 0) + 1}))} className="w-8 h-8 hover:bg-gray-100 text-primary-900 font-bold transition-colors">+</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className={`px-10 py-4 text-right font-black text-sm transition-all ${secili ? "text-gray-900 scale-105" : "text-gray-300"}`}>
                            ₺{(u.fiyat * miktar).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sağ Panel: Fiş Görünümü */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col sticky top-8 overflow-hidden">
              <div className="bg-primary-900 p-8 text-white">
                <h3 className="font-black text-xs uppercase tracking-[0.3em] opacity-60 mb-1">Talep Özeti</h3>
                <p className="text-xl font-black italic tracking-tighter uppercase">{secilenHafta || "Hafta Seçin"}</p>
              </div>

              <div className="p-8 flex-1 min-h-[300px]">
                <div className="space-y-4 mb-8 custom-scrollbar max-h-[400px] overflow-y-auto">
                  {Object.entries(liste).length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Liste Henüz Boş</p>
                    </div>
                  ) : (
                    Object.entries(liste).map(([id, m]) => {
                      const u = urunler.find(x => x.id === id);
                      return u ? (
                        <div key={id} className="flex justify-between items-start gap-4 animate-in slide-in-from-bottom-2">
                          <div className="flex-1">
                            <p className="text-[11px] font-bold text-gray-900 leading-tight">{u.urunAdi}</p>
                            <p className="text-[9px] font-black text-gray-500 uppercase">{m} {u.olcu}</p>
                          </div>
                          <span className="text-[11px] font-black text-gray-900">₺{(u.fiyat * m).toFixed(2)}</span>
                        </div>
                      ) : null;
                    })
                  )}
                </div>

                <div className="border-t-2 border-dashed border-gray-200 pt-6">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tahmini Toplam</p>
                      <p className="text-3xl font-black text-primary-900 tracking-tighter italic">
                        ₺{haftaToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleHaftaKaydet}
                    disabled={kaydediliyor || Object.keys(liste).length === 0}
                    className="w-full bg-primary-900 disabled:bg-gray-300 text-white font-black py-4 rounded-2xl hover:bg-primary-800 active:scale-95 transition-all uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-primary-900/20">
                    {kaydediliyor ? "GÖNDERİLİYOR..." : "TALEBİ TAMAMLA"}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-6">
                <p className="text-[9px] text-gray-500 font-bold text-center leading-relaxed">
                  * Talebiniz onaylandıktan sonra satın alma süreci başlayacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
