"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Urun = { id: string; urunAdi: string; marka: string; fiyat: number; olcu: string; kategori: string };
type Ders = { id: string; kod: string; ad: string };

const HAFTALAR = Array.from({ length: 14 }, (_, i) => `${i + 1}. Hafta`);

const olcuBilgisi = (olcu: string) => {
  const tip = olcu.toLowerCase();
  if (tip === "kg" || tip === "l") return { serbest: true, baslangic: 0, adim: 0 };
  if (tip === "g" || tip === "ml") return { serbest: false, baslangic: 50, adim: 50 };
  return { serbest: false, baslangic: 1, adim: 1 };
};

export default function TalepPage() {
  const { yetkili, yukleniyor } = useAuth("/talep");

  const [kullaniciId, setKullaniciId] = useState<number | null>(null);
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [dersler, setDersler] = useState<Ders[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [secilenDers, setSecilenDers] = useState("");
  const [secilenHafta, setSecilenHafta] = useState("1. Hafta");
  const [aramaMetni, setAramaMetni] = useState("");
  
  const [manuelUrun, setManuelUrun] = useState("");
  const [manuelMiktar, setManuelMiktar] = useState("");
  const [manuelOlcu, setManuelOlcu] = useState("Kg");
  
  const [basari, setBasari] = useState(false);
  const [hata, setHata] = useState("");
  const [seciliUrunler, setSeciliUrunler] = useState<Record<string, number>>({});
  const [kgInputler, setKgInputler] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      const id = localStorage.getItem("aktifKullaniciId");
      const role = localStorage.getItem("role");
      if (!id) return;
      setKullaniciId(Number(id));

      const { data: k } = await supabase.from("kullanicilar").select("ad_soyad, username, dersler").eq("id", id).single();
      if (!k) return;
      setKullaniciAdi(k.ad_soyad || k.username);

      const { data: tumDersler } = await supabase.from("dersler").select("*").order("kod");
      if (role === "ogretmen" && (k.dersler || []).length > 0) {
        setDersler((tumDersler || []).filter((d: Ders) => k.dersler.includes(d.id)));
      } else {
        setDersler(tumDersler || []);
      }

      const { data: urunData } = await supabase.from("urunler").select("*").order("urun_adi");
      setUrunler((urunData || []).map((u: any) => ({
        id: u.id, urunAdi: u.urun_adi, marka: u.marka, fiyat: u.fiyat, olcu: u.olcu, kategori: u.kategori,
      })));
    };
    fetchData();
  }, []);

  const handleCheckbox = (urun: Urun, isaretli: boolean) => {
    if (isaretli) {
      const { baslangic } = olcuBilgisi(urun.olcu);
      setSeciliUrunler((prev) => ({ ...prev, [urun.id]: baslangic }));
      if (olcuBilgisi(urun.olcu).serbest) setKgInputler((prev) => ({ ...prev, [urun.id]: "" }));
    } else {
      setSeciliUrunler((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
      setKgInputler((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
    }
  };

  const handleKgInput = (urunId: string, metin: string) => {
    setKgInputler((prev) => ({ ...prev, [urunId]: metin }));
    const num = parseFloat(metin.replace(",", "."));
    setSeciliUrunler((prev) => ({ ...prev, [urunId]: (!isNaN(num) && num > 0) ? Math.round(num * 1000) / 1000 : 0 }));
  };

  const handleArttir = (urun: Urun) => {
    const { adim, baslangic } = olcuBilgisi(urun.olcu);
    const mevcut = seciliUrunler[urun.id] || baslangic;
    setSeciliUrunler((prev) => ({ ...prev, [urun.id]: Math.round((mevcut + adim) * 1000) / 1000 }));
  };

  const handleAzalt = (urun: Urun) => {
    const { adim, baslangic } = olcuBilgisi(urun.olcu);
    const mevcut = seciliUrunler[urun.id] || baslangic;
    const yeni = Math.round((mevcut - adim) * 1000) / 1000;
    if (yeni <= 0) {
      setSeciliUrunler((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
    } else {
      setSeciliUrunler((prev) => ({ ...prev, [urun.id]: yeni }));
    }
  };

  const handleGonder = async () => {
    setHata("");
    if (!secilenDers) { setHata("Lütfen bir ders seçin."); return; }
    if (Object.keys(seciliUrunler).length === 0 && !manuelUrun.trim()) { setHata("Lütfen en az bir ürün seçin."); return; }

    const eksik = Object.entries(seciliUrunler).find(([id, m]) => {
      const u = urunler.find((x) => x.id === id);
      return u && olcuBilgisi(u.olcu).serbest && (!m || m === 0);
    });
    if (eksik) {
      setHata(`"${urunler.find((x) => x.id === eksik[0])?.urunAdi}" için miktar giriniz.`); return;
    }

    if (!kullaniciId) return;
    const ders = dersler.find((d) => d.id === secilenDers);
    const havuzUrunleri = Object.entries(seciliUrunler).map(([urunId, miktar]) => {
      const u = urunler.find((x) => x.id === urunId)!;
      return { urunId, urunAdi: u.urunAdi, marka: u.marka, miktar, olcu: u.olcu, birimFiyat: u.fiyat, toplam: u.fiyat * miktar };
    });
    const manuelEkle = manuelUrun.trim()
      ? [{ urunId: `manuel_${Date.now()}`, urunAdi: manuelUrun.trim(), marka: "", miktar: Number(manuelMiktar) || 1, olcu: manuelOlcu, birimFiyat: 0, toplam: 0 }]
      : [];

    const tumUrunler = [...havuzUrunleri, ...manuelEkle];
    const { error } = await supabase.from("siparisler").insert({
      ogretmen_id: kullaniciId,
      ogretmen_adi: kullaniciAdi,
      ders_id: secilenDers,
      ders_adi: ders ? `${ders.kod} - ${ders.ad}` : "",
      hafta: secilenHafta,
      urunler: tumUrunler,
      genel_toplam: tumUrunler.reduce((acc, u) => acc + u.toplam, 0),
      tarih: new Date().toLocaleDateString("tr-TR"),
      durum: "bekliyor",
    });

    if (error) { setHata("Hata: " + error.message); return; }
    setSeciliUrunler({}); setKgInputler({}); setManuelUrun(""); setBasari(true);
    setTimeout(() => setBasari(false), 4000);
  };

  if (yukleniyor) return (
    <DashboardLayout title="Malzeme Talebi">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Malzeme Talebi" subtitle="Yeni haftalık malzeme listesi oluşturun">
      <div className="max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-20">
        
        {/* Üst Bilgi Kartı */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-wrap items-center gap-8">
          <div className="flex-1 min-w-[280px]">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Ders Seçimi</label>
            <select value={secilenDers} onChange={(e) => setSecilenDers(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary-900/10 outline-none transition-all">
              <option value="">Lütfen Ders Seçiniz...</option>
              {dersler.map((d) => <option key={d.id} value={d.id}>{d.kod} - {d.ad}</option>)}
            </select>
          </div>
          <div className="w-full md:w-64">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Uygulama Haftası</label>
            <select value={secilenHafta} onChange={(e) => setSecilenHafta(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary-900/10 outline-none">
              {HAFTALAR.map((h) => <option key={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Sol Kolon: Ürün Havuzu */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Manuel Ürün Ekleme (Yeni Modern Stil) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xl">✍️</span>
                <h2 className="font-black text-gray-800 tracking-tight">Listede Olmayan Ürün Ekle</h2>
              </div>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-[2] min-w-[200px]">
                  <input value={manuelUrun} onChange={(e) => setManuelUrun(e.target.value)} placeholder="Ürün adını yazın..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary-900/10 outline-none transition-all" />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <input type="number" value={manuelMiktar} onChange={(e) => setManuelMiktar(e.target.value)} placeholder="Miktar"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm outline-none" />
                </div>
                <div className="w-32">
                  <select value={manuelOlcu} onChange={(e) => setManuelOlcu(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                    {["Kg", "L", "Adet", "Paket", "G", "Ml"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Ürün Havuzu Tablosu */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <h2 className="font-black text-gray-800 tracking-tight italic">Malzeme Havuzu</h2>
                <div className="relative">
                  <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} placeholder="Malzeme ara..."
                    className="bg-white border border-gray-200 rounded-full px-6 py-2 text-xs focus:ring-2 focus:ring-[primary-900]/10 outline-none w-48 md:w-64 transition-all" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                      <th className="px-8 py-5 w-16">Seç</th>
                      <th className="px-8 py-5">Malzeme Bilgisi</th>
                      <th className="px-8 py-5 text-center">Birim Fiyat</th>
                      <th className="px-8 py-5 text-right">Miktar Girişi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {urunler.filter(u => !aramaMetni || u.urunAdi.toLowerCase().includes(aramaMetni.toLowerCase())).map((u) => {
                      const secili = u.id in seciliUrunler;
                      const miktar = seciliUrunler[u.id] ?? 0;
                      const bilgi = olcuBilgisi(u.olcu);
                      return (
                        <tr key={u.id} className={`group transition-all ${secili ? "bg-red-50/50" : "hover:bg-gray-50"}`}>
                          <td className="px-8 py-5 text-center">
                            <input type="checkbox" checked={secili} onChange={(e) => handleCheckbox(u, e.target.checked)}
                              className="w-5 h-5 accent-[primary-900] rounded-lg cursor-pointer" />
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-black text-gray-800 text-sm tracking-tight">{u.urunAdi}</p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{u.marka || "Standart"}</span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-xs font-bold text-gray-500 italic">₺{u.fiyat.toFixed(2)} / {u.olcu}</span>
                          </td>
                          <td className="px-8 py-5">
                            {secili ? (
                              <div className="flex items-center justify-end gap-2">
                                {bilgi.serbest ? (
                                  <div className="flex items-center bg-white border border-red-200 rounded-xl px-3 py-1 shadow-inner">
                                    <input type="text" inputMode="decimal" placeholder="0,00"
                                      value={kgInputler[u.id] !== undefined ? kgInputler[u.id] : (miktar > 0 ? String(miktar).replace(".", ",") : "")}
                                      onChange={(e) => handleKgInput(u.id, e.target.value)}
                                      className="w-16 bg-transparent text-right text-xs font-black text-primary-900 outline-none" />
                                    <span className="ml-2 text-[10px] font-black text-red-300 uppercase">{u.olcu}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 bg-white border border-red-100 rounded-xl p-1 shadow-sm">
                                    <button onClick={() => handleAzalt(u)} className="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-red-800 rounded-lg font-black transition">-</button>
                                    <span className="w-12 text-center text-xs font-black text-gray-700">{miktar} <span className="text-[8px] block text-gray-300 leading-none tracking-tighter uppercase">{u.olcu}</span></span>
                                    <button onClick={() => handleArttir(u)} className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-primary-900 hover:text-white text-primary-900 rounded-lg font-black transition">+</button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-right"><span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest italic">Miktar Bekleniyor</span></div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Özet Paneli */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-2xl p-8 text-white shadow-2xl sticky top-8 border border-gray-800">
              <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-6">
                <h3 className="font-black text-lg tracking-tight uppercase">Talep Özeti</h3>
                <span className="bg-primary-900 text-[10px] px-2 py-1 rounded-md font-black">{Object.keys(seciliUrunler).length} Kalem</span>
              </div>

              {Object.keys(seciliUrunler).length === 0 && !manuelUrun ? (
                <div className="text-center py-12">
                  <span className="text-4xl block mb-4 opacity-20">🛒</span>
                  <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">Henüz malzeme seçmediniz</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-8">
                  {Object.entries(seciliUrunler).map(([id, m]) => {
                    const u = urunler.find(x => x.id === id);
                    if (!u) return null;
                    return (
                      <div key={id} className="flex justify-between items-start group">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-100 truncate tracking-tight">{u.urunAdi}</p>
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">
                            {m > 0 ? `${String(m).replace(".", ",")} ${u.olcu}` : "Miktar Girilmedi"}
                          </p>
                        </div>
                        <span className="text-[11px] font-black text-red-400">₺{(u.fiyat * m).toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {manuelUrun && (
                    <div className="flex justify-between items-start border-t border-gray-800 pt-4">
                      <div>
                        <p className="text-xs font-bold text-amber-400">{manuelUrun}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">{manuelMiktar || 1} {manuelOlcu}</p>
                      </div>
                      <span className="text-[10px] italic text-gray-600">Manuel</span>
                    </div>
                  )}
                </div>
              )}

              {hata && <p className="text-red-400 text-[10px] font-black uppercase mb-4 text-center animate-pulse">⚠️ {hata}</p>}
              {basari && <p className="text-emerald-400 text-[10px] font-black uppercase mb-4 text-center">✅ Liste Gönderildi!</p>}

              <button onClick={handleGonder}
                className="w-full bg-primary-900 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-900/40 uppercase text-xs tracking-[0.2em]">
                Talebi Tamamla ve Gönder
              </button>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </DashboardLayout>
  );
}