"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Urun = { id: string; urunAdi: string; marka: string; fiyat: number; olcu: string; kategori: string };
type Ders = { id: string; kod: string; ad: string };

const HAFTALAR = Array.from({ length: 10 }, (_, i) => `${i + 1}. Hafta`);

// Kg, L  → serbest elle giriş, +/- yok
// G, Ml  → 50'şer adım, +/- buton
// Adet, Paket, Kutu → 1'er adım, +/- buton
const olcuBilgisi = (olcu: string) => {
  const tip = olcu.toLowerCase();
  if (tip === "kg" || tip === "l")  return { serbest: true,  baslangic: 0,  adim: 0  };
  if (tip === "g"  || tip === "ml") return { serbest: false, baslangic: 50, adim: 50 };
  return                                   { serbest: false, baslangic: 1,  adim: 1  };
};

export default function TalepPage() {
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

  // seciliUrunler: key = urunId, value = miktar (number)
  // Kg/L için 0 başlar → kullanıcı elle girer
  const [seciliUrunler, setSeciliUrunler] = useState<Record<string, number>>({});

  // Kg/L için input string ayrı tutulur (1, veya 1. gibi yarım yazıları kaybetmemek için)
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

  const filtreliUrunler = urunler.filter((u) =>
    !aramaMetni || u.urunAdi.toLowerCase().includes(aramaMetni.toLowerCase()) || u.marka.toLowerCase().includes(aramaMetni.toLowerCase())
  );

  const handleCheckbox = (urun: Urun, isaretli: boolean) => {
    if (isaretli) {
      const { baslangic } = olcuBilgisi(urun.olcu);
      setSeciliUrunler((prev) => ({ ...prev, [urun.id]: baslangic }));
      if (olcuBilgisi(urun.olcu).serbest) {
        setKgInputler((prev) => ({ ...prev, [urun.id]: "" }));
      }
    } else {
      setSeciliUrunler((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
      setKgInputler((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
    }
  };

  // Kg/L: string input → number state
  const handleKgInput = (urunId: string, metin: string) => {
    setKgInputler((prev) => ({ ...prev, [urunId]: metin }));
    const num = parseFloat(metin.replace(",", "."));
    setSeciliUrunler((prev) => ({ ...prev, [urunId]: (!isNaN(num) && num > 0) ? Math.round(num * 1000) / 1000 : 0 }));
  };

  // G/Ml/Adet/Paket/Kutu: +/- butonlar
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

  const handleDirektMiktar = (urun: Urun, miktar: number) => {
    if (miktar <= 0) {
      setSeciliUrunler((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
    } else {
      setSeciliUrunler((prev) => ({ ...prev, [urun.id]: Math.round(miktar * 1000) / 1000 }));
    }
  };

  const handleGonder = async () => {
    setHata("");
    if (!secilenDers) { setHata("Lütfen bir ders seçin."); return; }
    if (Object.keys(seciliUrunler).length === 0 && !manuelUrun.trim()) { setHata("En az bir ürün seçin veya manuel ürün girin."); return; }

    const eksik = Object.entries(seciliUrunler).find(([id, m]) => {
      const u = urunler.find((x) => x.id === id);
      return u && olcuBilgisi(u.olcu).serbest && (!m || m === 0);
    });
    if (eksik) {
      const ad = urunler.find((x) => x.id === eksik[0])?.urunAdi || "Ürün";
      setHata(`"${ad}" için miktar giriniz.`); return;
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
    const genelToplam = tumUrunler.reduce((acc, u) => acc + u.toplam, 0);

    const { error } = await supabase.from("siparisler").insert({
      ogretmen_id: kullaniciId,
      ogretmen_adi: kullaniciAdi,
      ders_id: secilenDers,
      ders_adi: ders ? `${ders.kod} - ${ders.ad}` : "",
      hafta: secilenHafta,
      urunler: tumUrunler,
      genel_toplam: genelToplam,
      tarih: new Date().toLocaleDateString("tr-TR"),
      durum: "bekliyor",
    });

    if (error) { setHata("Hata: " + error.message); return; }
    setSeciliUrunler({});
    setKgInputler({});
    setManuelUrun(""); setManuelMiktar(""); setSecilenDers("");
    setBasari(true); setTimeout(() => setBasari(false), 4000);
  };

  const secilenUrunListesi = Object.entries(seciliUrunler).map(([urunId, miktar]) => {
    const u = urunler.find((x) => x.id === urunId)!;
    return { ...u, miktar };
  });

  return (
    <DashboardLayout title="Talep Oluştur" subtitle="Haftalık malzeme talebinizi oluşturun">
      <div className="max-w-6xl space-y-5">
        {basari && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 font-medium">Talebiniz başarıyla gönderildi!</div>}
        {hata && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{hata}</div>}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-2">Ders *</label>
              <select value={secilenDers} onChange={(e) => setSecilenDers(e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 ${!secilenDers ? "border-red-300" : "border-gray-200"}`}>
                <option value="">DERS SEÇİNİZ...</option>
                {dersler.map((d) => <option key={d.id} value={d.id}>{d.kod} - {d.ad}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-2">Uygulama Haftası</label>
              <select value={secilenHafta} onChange={(e) => setSecilenHafta(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                {HAFTALAR.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm">Manuel Ürün Ekle</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-700 block mb-1">Ürün Adı</label>
              <input value={manuelUrun} onChange={(e) => setManuelUrun(e.target.value)} placeholder="Örn: Özel Baharat"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Miktar</label>
              <input type="number" value={manuelMiktar} onChange={(e) => setManuelMiktar(e.target.value)} placeholder="1" min={1}
                className="w-24 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Ölçü</label>
              <select value={manuelOlcu} onChange={(e) => setManuelOlcu(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                {["Kg", "L", "Paket", "Adet", "G", "Ml", "Kutu"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">Ürün Havuzu</h2>
              <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} placeholder="Ara..."
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-44" />
            </div>

            {/* Miktar giriş rehberi */}
            <div className="mx-4 mt-4 mb-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">Miktar Giriş Rehberi</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800">Kg / L</span>
                  <span className="text-gray-500">Elle yazın: <b>0,100</b> · <b>1,500</b> · <b>2,000</b></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800">G / Ml</span>
                  <span className="text-gray-500">+ / − ile 50'şer artır/azalt</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800">Adet / Paket / Kutu</span>
                  <span className="text-gray-500">+ / − ile 1'er artır/azalt</span>
                </div>
              </div>
            </div>

            {urunler.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">Ürün havuzu boş.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-left">
                      <th className="px-4 py-3 w-10"></th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ÜRÜN</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MARKA</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">FİYAT</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MİKTAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtreliUrunler.map((u) => {
                      // DÜZELTME: secili kontrolü `u.id in seciliUrunler` ile yapılıyor
                      // böylece miktar 0 olsa bile checkbox seçili görünür ve input açık kalır
                      const secili = u.id in seciliUrunler;
                      const miktar = seciliUrunler[u.id] ?? 0;
                      const bilgi = olcuBilgisi(u.olcu);
                      return (
                        <tr key={u.id} className={`transition-colors ${secili ? "bg-red-50" : "hover:bg-gray-50"}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={secili}
                              onChange={(e) => handleCheckbox(u, e.target.checked)}
                              className="w-4 h-4 accent-red-600 cursor-pointer" />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{u.urunAdi}</p>
                            {u.kategori && <p className="text-xs text-gray-400">{u.kategori}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{u.marka || "—"}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">
                            {u.fiyat > 0 ? `₺${u.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} / ${u.olcu}` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {secili ? (
                              bilgi.serbest ? (
                                // Kg / L → text input, virgülle de çalışır
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={kgInputler[u.id] !== undefined ? kgInputler[u.id] : (miktar > 0 ? String(miktar).replace(".", ",") : "")}
                                    placeholder="örn: 1,500"
                                    onChange={(e) => handleKgInput(u.id, e.target.value)}
                                    className={`w-24 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                      miktar > 0 ? "border-gray-300" : "border-red-300 bg-red-50 placeholder-red-300"
                                    }`}
                                  />
                                  <span className="text-xs font-medium text-gray-500">{u.olcu}</span>
                                </div>
                              ) : (
                                // G / Ml / Adet / Paket / Kutu → +/- butonlar
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => handleAzalt(u)}
                                    className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-bold text-sm transition">
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={miktar || ""}
                                    step={bilgi.adim}
                                    min={bilgi.baslangic}
                                    onChange={(e) => handleDirektMiktar(u, Number(e.target.value))}
                                    className="w-14 border border-gray-200 rounded-lg px-1 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                                  />
                                  <span className="text-xs text-gray-400">{u.olcu}</span>
                                  <button type="button" onClick={() => handleArttir(u)}
                                    className="w-7 h-7 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold text-sm transition">
                                    +
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-4">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Talep Özeti</h3>
              {secilenUrunListesi.length === 0 && !manuelUrun ? (
                <p className="text-gray-400 text-xs text-center py-6">Henüz ürün seçilmedi.</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {secilenUrunListesi.map((u) => (
                      <div key={u.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50">
                        <div>
                          <p className="font-medium text-gray-800">{u.urunAdi}</p>
                          {u.miktar > 0 ? (
                            <p className="text-gray-400">{String(u.miktar).replace(".", ",")} {u.olcu}</p>
                          ) : (
                            <p className="text-red-400 font-medium">Miktar giriniz</p>
                          )}
                        </div>
                        <span className="text-gray-600 font-medium ml-2">
                          {u.miktar > 0 && u.fiyat > 0 ? `₺${(u.fiyat * u.miktar).toFixed(2)}` : "—"}
                        </span>
                      </div>
                    ))}
                    {manuelUrun && (
                      <div className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50">
                        <div>
                          <p className="font-medium text-gray-800">{manuelUrun}</p>
                          <p className="text-gray-400">{manuelMiktar || 1} {manuelOlcu} <span className="text-amber-500">(Manuel)</span></p>
                        </div>
                        <span className="text-gray-400">—</span>
                      </div>
                    )}
                  </div>
                </>
              )}
              <button type="button" onClick={handleGonder}
                className="w-full bg-red-700 hover:bg-red-800 text-white text-sm font-semibold py-3 rounded-xl transition">
                Talebi Gönder
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}