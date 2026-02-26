"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type UrunStok = { 
  id: string; 
  urunAdi: string; 
  marka: string; 
  olcu: string; 
  stok: number; 
  kategori: string;
  sonSayimTarihi: string | null;
};

export default function StokPage() {
  const { yetkili, yukleniyor: authYukleniyor } = useAuth("/stok");

  const [urunler, setUrunler] = useState<UrunStok[]>([]);
  const [stokMap, setStokMap] = useState<Record<string, number>>({});
  const [kgInputler, setKgInputler] = useState<Record<string, string>>({});
  const [aramaMetni, setAramaMetni] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState<Record<string, boolean>>({});
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  
  // Yeni state'ler
  const [secilenKategori, setSecilenKategori] = useState("tumu");
  const [sayimModu, setSayimModu] = useState(false);
  const [sayimIndex, setSayimIndex] = useState(0);
  const [hizliGirisAcik, setHizliGirisAcik] = useState(false);
  const [hizliArama, setHizliArama] = useState("");
  const [hizliMiktar, setHizliMiktar] = useState("");
  const [sayimYapilanlar, setSayimYapilanlar] = useState<Set<string>>(new Set());
  const [hizliSecilen, setHizliSecilen] = useState<UrunStok | null>(null);
  
  const sayimInputRef = useRef<HTMLInputElement>(null);
  const hizliAramaRef = useRef<HTMLInputElement>(null);
  const hizliMiktarRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchUrunler(); }, []);

  const fetchUrunler = async () => {
    setYukleniyor(true);
    const { data } = await supabase.from("urunler").select("id, urun_adi, marka, olcu, stok, kategori, son_sayim_tarihi").order("urun_adi");
    const liste = (data || []).map((u: any) => ({
      id: u.id, 
      urunAdi: u.urun_adi, 
      marka: u.marka, 
      olcu: u.olcu, 
      stok: u.stok ?? 0,
      kategori: u.kategori || "Diger",
      sonSayimTarihi: u.son_sayim_tarihi || null,
    }));
    setUrunler(liste);
    const map: Record<string, number> = {};
    liste.forEach((u) => { map[u.id] = u.stok; });
    setStokMap(map);
    setYukleniyor(false);
  };

  const bildir = (tip: "basari" | "hata", metin: string) => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 2500);
  };

  // Kategoriler
  const kategoriler = ["tumu", ...Array.from(new Set(urunler.map(u => u.kategori))).sort((a, b) => a.localeCompare(b, "tr"))];

  // Ölçü birimine göre input tipi belirleme
  const olcuBilgisi = (olcu: string) => {
    const tip = olcu.toLowerCase();
    if (tip === "kg" || tip === "l") return { serbest: true, baslangic: 0, adim: 0 };
    if (tip === "g" || tip === "ml") return { serbest: false, baslangic: 50, adim: 50 };
    return { serbest: false, baslangic: 1, adim: 1 };
  };

  const handleKgInput = (id: string, metin: string) => {
    setKgInputler((prev) => ({ ...prev, [id]: metin }));
    const num = parseFloat(metin.replace(",", "."));
    setStokMap((prev) => ({ ...prev, [id]: (!isNaN(num) && num >= 0) ? Math.round(num * 1000) / 1000 : 0 }));
  };

  const handleArttir = (u: UrunStok) => {
    const { adim, baslangic } = olcuBilgisi(u.olcu);
    const mevcut = stokMap[u.id] ?? u.stok ?? baslangic;
    setStokMap((prev) => ({ ...prev, [u.id]: Math.round((mevcut + adim) * 1000) / 1000 }));
  };

  const handleAzalt = (u: UrunStok) => {
    const { adim, baslangic } = olcuBilgisi(u.olcu);
    const mevcut = stokMap[u.id] ?? u.stok ?? baslangic;
    const yeni = Math.max(0, Math.round((mevcut - adim) * 1000) / 1000);
    setStokMap((prev) => ({ ...prev, [u.id]: yeni }));
  };

  const handleDirektMiktar = (id: string, miktar: number) => {
    const rounded = Math.max(0, Math.round(miktar * 1000) / 1000);
    setStokMap((prev) => ({ ...prev, [id]: rounded }));
  };

  // Filtreleme
  const filtrelenmis = urunler.filter((u) => {
    const aramaUygun = !aramaMetni ||
      (u.urunAdi || "").toLowerCase().includes(aramaMetni.toLowerCase()) ||
      (u.marka || "").toLowerCase().includes(aramaMetni.toLowerCase());
    const kategoriUygun = secilenKategori === "tumu" || u.kategori === secilenKategori;
    return aramaUygun && kategoriUygun;
  });

  const handleKaydet = useCallback(async (u: UrunStok, sonrakiGec = false) => {
    const yeniStok = stokMap[u.id] ?? u.stok;
    const simdi = new Date().toISOString();
    
    setKaydediliyor((prev) => ({ ...prev, [u.id]: true }));
    const { error } = await supabase.from("urunler").update({ 
      stok: yeniStok,
      son_sayim_tarihi: simdi 
    }).eq("id", u.id);
    setKaydediliyor((prev) => ({ ...prev, [u.id]: false }));
    
    if (error) { bildir("hata", "Hata: " + error.message); return; }
    
    setUrunler((prev) => prev.map((x) => x.id === u.id ? { ...x, stok: yeniStok, sonSayimTarihi: simdi } : x));
    setKgInputler((prev) => { const y = { ...prev }; delete y[u.id]; return y; });
    setSayimYapilanlar(prev => new Set(prev).add(u.id));
    bildir("basari", `"${u.urunAdi}" güncellendi → ${yeniStok} ${u.olcu}`);
    
    // Sayım modunda sonraki ürüne geç
    if (sonrakiGec && sayimModu) {
      const maxIndex = filtrelenmis.length - 1;
      if (sayimIndex < maxIndex) {
        setSayimIndex(prev => prev + 1);
        setTimeout(() => sayimInputRef.current?.focus(), 100);
      } else {
        bildir("basari", "🎉 Sayım tamamlandı!");
        setSayimModu(false);
      }
    }
  }, [stokMap, sayimModu, sayimIndex, filtrelenmis.length]);

  const stokluUrun = urunler.filter((u) => u.stok > 0).length;

  // Sayım modunu başlat
  const sayimBaslat = () => {
    setSayimModu(true);
    setSayimIndex(0);
    setSayimYapilanlar(new Set());
    setTimeout(() => sayimInputRef.current?.focus(), 100);
  };

  // Sayım modunu bitir
  const sayimBitir = () => {
    setSayimModu(false);
    setSayimIndex(0);
  };

  // Hızlı giriş popup
  const hizliGirisAc = () => {
    setHizliGirisAcik(true);
    setHizliArama("");
    setHizliMiktar("");
    setHizliSecilen(null);
    setTimeout(() => hizliAramaRef.current?.focus(), 100);
  };

  const hizliGirisKapat = () => {
    setHizliGirisAcik(false);
    setHizliArama("");
    setHizliMiktar("");
    setHizliSecilen(null);
  };

  const hizliSonuclar = hizliArama.length >= 2 
    ? urunler.filter(u => 
        u.urunAdi.toLowerCase().includes(hizliArama.toLowerCase()) ||
        (u.marka || "").toLowerCase().includes(hizliArama.toLowerCase())
      ).slice(0, 5)
    : [];

  const hizliUrunSec = (u: UrunStok) => {
    setHizliSecilen(u);
    setHizliArama(u.urunAdi);
    setTimeout(() => hizliMiktarRef.current?.focus(), 50);
  };

  const hizliKaydet = async () => {
    if (!hizliSecilen || !hizliMiktar) return;
    const miktar = parseFloat(hizliMiktar.replace(",", "."));
    if (isNaN(miktar) || miktar < 0) { bildir("hata", "Geçersiz miktar"); return; }
    
    const simdi = new Date().toISOString();
    const { error } = await supabase.from("urunler").update({ 
      stok: miktar,
      son_sayim_tarihi: simdi 
    }).eq("id", hizliSecilen.id);
    
    if (error) { bildir("hata", "Hata: " + error.message); return; }
    
    setUrunler(prev => prev.map(x => x.id === hizliSecilen.id ? { ...x, stok: miktar, sonSayimTarihi: simdi } : x));
    setStokMap(prev => ({ ...prev, [hizliSecilen.id]: miktar }));
    setSayimYapilanlar(prev => new Set(prev).add(hizliSecilen.id));
    bildir("basari", `"${hizliSecilen.urunAdi}" → ${miktar} ${hizliSecilen.olcu}`);
    
    // Temizle ve yeni giriş için hazırla
    setHizliSecilen(null);
    setHizliArama("");
    setHizliMiktar("");
    setTimeout(() => hizliAramaRef.current?.focus(), 50);
  };

  // PDF Raporu
  const handlePdfRapor = () => {
    const tarih = new Date().toLocaleDateString("tr-TR");
    const saat = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    
    const gruplar: Record<string, UrunStok[]> = {};
    urunler.forEach(u => {
      if (!gruplar[u.kategori]) gruplar[u.kategori] = [];
      gruplar[u.kategori].push(u);
    });

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#222}
h1{font-size:16px;color:#8B0000;border-bottom:2px solid #8B0000;padding-bottom:6px;margin-bottom:4px}
.meta{font-size:10px;color:#666;margin-bottom:16px}
.ozet{display:flex;gap:20px;margin-bottom:20px;padding:12px;background:#f8f8f8;border-radius:8px}
.ozet-item{text-align:center}
.ozet-sayi{font-size:18px;font-weight:bold}
.ozet-label{font-size:9px;color:#666;text-transform:uppercase}
.kat{background:#f3f4f6;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#555;padding:6px 8px;margin-top:14px;border-left:3px solid #8B0000}
table{width:100%;border-collapse:collapse;margin-top:4px;table-layout:fixed}
th,td{padding:6px 10px;border-bottom:1px solid #eee;font-size:10px;vertical-align:middle}
th{background:#8B0000;color:white}
th.col-urun{width:35%;text-align:left}
th.col-marka{width:20%;text-align:left}
th.col-stok{width:20%;text-align:center}
th.col-tarih{width:25%;text-align:center}
td.col-urun{text-align:left}
td.col-marka{text-align:left}
td.col-stok{text-align:center;font-weight:bold}
td.col-tarih{text-align:center;font-size:9px;color:#666}
tr:nth-child(even) td{background:#fafafa}
.stok-var{color:#059669}
.stok-yok{color:#dc2626}
.footer{margin-top:20px;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:6px}
@media print{body{margin:10px}}
</style></head><body>`;

    html += `<h1>Stok Sayım Raporu</h1>`;
    html += `<div class="meta">${tarih} - ${saat}</div>`;
    
    // Özet
    const stokVar = urunler.filter(u => u.stok > 0).length;
    const stokYok = urunler.length - stokVar;
    const bugunSayilan = urunler.filter(u => {
      if (!u.sonSayimTarihi) return false;
      const sayimTarihi = new Date(u.sonSayimTarihi).toDateString();
      return sayimTarihi === new Date().toDateString();
    }).length;
    
    html += `<div class="ozet">
      <div class="ozet-item"><div class="ozet-sayi">${urunler.length}</div><div class="ozet-label">Toplam Ürün</div></div>
      <div class="ozet-item"><div class="ozet-sayi stok-var">${stokVar}</div><div class="ozet-label">Stokta Var</div></div>
      <div class="ozet-item"><div class="ozet-sayi stok-yok">${stokYok}</div><div class="ozet-label">Stok Yok</div></div>
      <div class="ozet-item"><div class="ozet-sayi" style="color:#2563eb">${bugunSayilan}</div><div class="ozet-label">Bugün Sayıldı</div></div>
    </div>`;

    Object.entries(gruplar).sort((a, b) => a[0].localeCompare(b[0], "tr")).forEach(([kategori, liste]) => {
      html += `<div class="kat">${kategori} (${liste.length} ürün)</div>`;
      html += `<table><thead><tr>
        <th class="col-urun">Ürün</th>
        <th class="col-marka">Marka</th>
        <th class="col-stok">Stok</th>
        <th class="col-tarih">Son Sayım</th>
      </tr></thead><tbody>`;
      
      liste.sort((a, b) => a.urunAdi.localeCompare(b.urunAdi, "tr")).forEach(u => {
        const stokClass = u.stok > 0 ? "stok-var" : "stok-yok";
        const stokText = u.stok > 0 ? `${u.stok} ${u.olcu}` : "Yok";
        const tarihText = u.sonSayimTarihi 
          ? new Date(u.sonSayimTarihi).toLocaleDateString("tr-TR") 
          : "-";
        html += `<tr>
          <td class="col-urun">${u.urunAdi}</td>
          <td class="col-marka">${u.marka || "-"}</td>
          <td class="col-stok ${stokClass}">${stokText}</td>
          <td class="col-tarih">${tarihText}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    });

    html += `<div class="footer">IRUFoodFlow Stok Raporu | ${tarih}</div></body></html>`;
    
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  // Tarih formatlama
  const formatTarih = (tarih: string | null) => {
    if (!tarih) return null;
    const d = new Date(tarih);
    const bugun = new Date();
    const dun = new Date(bugun);
    dun.setDate(dun.getDate() - 1);
    
    if (d.toDateString() === bugun.toDateString()) {
      return "Bugün " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }
    if (d.toDateString() === dun.toDateString()) {
      return "Dün " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("tr-TR");
  };

  if (authYukleniyor || !yetkili) return null;
  
  return (
    <DashboardLayout title="Stok Paneli" subtitle="Depodaki mevcut ürün miktarlarını girin">
      <div className="max-w-5xl space-y-5">
        {bildirim && (
          <div className={`text-sm rounded-xl px-4 py-3 border font-medium transition ${bildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
            {bildirim.metin}
          </div>
        )}

        {/* Üst Butonlar */}
        <div className="flex flex-wrap gap-3">
          <button onClick={sayimModu ? sayimBitir : sayimBaslat}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${sayimModu 
              ? "bg-amber-500 hover:bg-amber-600 text-white" 
              : "bg-red-700 hover:bg-red-800 text-white"}`}>
            {sayimModu ? "⏹ Sayımı Bitir" : "▶ Sayım Başlat"}
          </button>
          <button onClick={hizliGirisAc}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
            ⚡ Hızlı Giriş
          </button>
          <button onClick={handlePdfRapor}
            className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
            📄 Sayım Raporu
          </button>
        </div>

        {/* Sayım Modu Paneli */}
        {sayimModu && filtrelenmis.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Sayım Modu</span>
                <span className="ml-3 text-sm text-amber-600">{sayimIndex + 1} / {filtrelenmis.length}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSayimIndex(Math.max(0, sayimIndex - 1))} disabled={sayimIndex === 0}
                  className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-medium text-amber-700 disabled:opacity-40 hover:bg-amber-50 transition">
                  ← Önceki
                </button>
                <button onClick={() => setSayimIndex(Math.min(filtrelenmis.length - 1, sayimIndex + 1))} disabled={sayimIndex >= filtrelenmis.length - 1}
                  className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-medium text-amber-700 disabled:opacity-40 hover:bg-amber-50 transition">
                  Sonraki →
                </button>
              </div>
            </div>
            
            {(() => {
              const u = filtrelenmis[sayimIndex];
              if (!u) return null;
              const deger = stokMap[u.id] ?? u.stok;
              const bilgi = olcuBilgisi(u.olcu);
              const sayildi = sayimYapilanlar.has(u.id);
              
              return (
                <div className={`bg-white rounded-xl p-5 border-2 ${sayildi ? "border-emerald-300" : "border-amber-200"}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{u.urunAdi}</h3>
                      <p className="text-sm text-gray-500">{u.marka || "Marka yok"} · {u.kategori}</p>
                    </div>
                    {sayildi && <span className="text-emerald-500 text-2xl">✓</span>}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {bilgi.serbest ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={sayimInputRef}
                          type="text"
                          inputMode="decimal"
                          value={kgInputler[u.id] !== undefined ? kgInputler[u.id] : (deger > 0 ? String(deger).replace(".", ",") : "")}
                          placeholder="orn: 1,500"
                          onChange={(e) => handleKgInput(u.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => { if (e.key === "Enter") handleKaydet(u, true); }}
                          className="w-32 border-2 border-amber-300 rounded-xl px-4 py-3 text-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-lg font-medium text-gray-600">{u.olcu}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAzalt(u)}
                          className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold text-xl transition">
                          -
                        </button>
                        <input
                          ref={sayimInputRef}
                          type="number"
                          value={deger || ""}
                          step={bilgi.adim}
                          min={0}
                          onChange={(e) => handleDirektMiktar(u.id, Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => { if (e.key === "Enter") handleKaydet(u, true); }}
                          className="w-24 border-2 border-amber-300 rounded-xl px-2 py-3 text-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-lg font-medium text-gray-600">{u.olcu}</span>
                        <button onClick={() => handleArttir(u)}
                          className="w-12 h-12 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-xl text-red-700 font-bold text-xl transition">
                          +
                        </button>
                      </div>
                    )}
                    
                    <button onClick={() => handleKaydet(u, true)}
                      className="ml-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition">
                      Kaydet & Sonraki →
                    </button>
                  </div>
                  
                  {u.sonSayimTarihi && (
                    <p className="mt-3 text-xs text-gray-400">Son sayım: {formatTarih(u.sonSayimTarihi)}</p>
                  )}
                </div>
              );
            })()}
            
            {/* İlerleme çubuğu */}
            <div className="mt-4 bg-amber-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${((sayimIndex + 1) / filtrelenmis.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Toplam Ürün", deger: urunler.length, renk: "text-gray-800" },
            { label: "Stokta Var", deger: stokluUrun, renk: "text-emerald-600" },
            { label: "Stok Yok", deger: urunler.length - stokluUrun, renk: "text-red-600" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`text-3xl font-bold ${k.renk}`}>{k.deger}</p>
            </div>
          ))}
        </div>

        {/* Miktar Giriş Rehberi */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 mb-2">Miktar Giriş Rehberi</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">Kg / L</span>
              <span className="text-gray-500">Serbest giriş (orn: 1,500)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">g / ml</span>
              <span className="text-gray-500">+ / - ile <b>50'şer</b> artır/azalt</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">Adet</span>
              <span className="text-gray-500">+ / - ile <b>1'er</b> artır/azalt</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">Paket / Kutu</span>
              <span className="text-gray-500">+ / - ile <b>1'er</b> artır/azalt</span>
            </div>
          </div>
        </div>

        {/* Arama ve Filtreler */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-700 block mb-1">Ara</label>
            <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Ürün adı veya marka ara..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-black focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Kategori</label>
            <select value={secilenKategori} onChange={(e) => setSecilenKategori(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[180px]">
              {kategoriler.map((k) => <option key={k} value={k}>{k === "tumu" ? "Tüm Kategoriler" : k}</option>)}
            </select>
          </div>
        </div>

        {/* Ürün Tablosu */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Depo Stok Miktarları</h2>
            <span className="text-xs text-gray-400">{filtrelenmis.length} ürün · Giriş yaptıktan sonra Enter/Tab ile kaydedin</span>
          </div>
          {yukleniyor ? (
            <div className="py-20 text-center text-gray-400 text-sm">Yükleniyor...</div>
          ) : filtrelenmis.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">Ürün bulunamadı.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ÜRÜN</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MARKA</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">KATEGORİ</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-52">DEPODA MEVCUT</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">SON SAYIM</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">DURUM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrelenmis.map((u) => {
                  const deger = stokMap[u.id] ?? u.stok;
                  const degisti = deger !== u.stok;
                  const bilgi = olcuBilgisi(u.olcu);
                  return (
                    <tr key={u.id} className={`transition-colors ${degisti ? "bg-amber-50" : "hover:bg-gray-50"}`}>
                      <td className="px-5 py-3 font-medium text-gray-800">{u.urunAdi}</td>
                      <td className="px-5 py-3 text-gray-500">{u.marka || "—"}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{u.kategori}</span>
                      </td>
                      <td className="px-5 py-3">
                        {bilgi.serbest ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={kgInputler[u.id] !== undefined ? kgInputler[u.id] : (deger > 0 ? String(deger).replace(".", ",") : "")}
                              placeholder="orn: 1,500"
                              onChange={(e) => handleKgInput(u.id, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleKaydet(u)}
                              onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
                              className={`w-28 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 transition ${degisti ? "border-amber-400 bg-amber-50" : deger > 0 ? "border-gray-300 bg-white" : "border-gray-200 bg-white"} ${deger > 0 ? "text-emerald-700 font-semibold" : "text-gray-400"}`}
                            />
                            <span className="text-xs font-medium text-gray-500">{u.olcu}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleAzalt(u)}
                              className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-bold text-sm transition">
                              -
                            </button>
                            <input
                              type="number"
                              value={deger || ""}
                              step={bilgi.adim}
                              min={0}
                              onChange={(e) => handleDirektMiktar(u.id, Number(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleKaydet(u)}
                              onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
                              className={`w-16 border rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 transition ${degisti ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"} ${deger > 0 ? "text-emerald-700 font-semibold" : "text-gray-400"}`}
                            />
                            <span className="text-xs text-gray-400">{u.olcu}</span>
                            <button type="button" onClick={() => handleArttir(u)}
                              className="w-7 h-7 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold text-sm transition">
                              +
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {u.sonSayimTarihi ? (
                          <span className="text-xs text-gray-500">{formatTarih(u.sonSayimTarihi)}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {kaydediliyor[u.id] && <span className="text-xs text-gray-400">kaydediliyor...</span>}
                        {!kaydediliyor[u.id] && degisti && (
                          <button
                            onClick={() => handleKaydet(u)}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-2.5 py-1 rounded-lg transition"
                          >
                            Kaydet
                          </button>
                        )}
                        {!kaydediliyor[u.id] && !degisti && deger > 0 && (
                          <span className="text-xs text-emerald-500 font-medium">✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Hızlı Giriş Modal */}
        {hizliGirisAcik && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={hizliGirisKapat}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-semibold">⚡ Hızlı Stok Girişi</h3>
                <button onClick={hizliGirisKapat} className="text-white/70 hover:text-white text-xl">✕</button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Ürün Ara</label>
                  <input
                    ref={hizliAramaRef}
                    type="text"
                    value={hizliArama}
                    onChange={(e) => { setHizliArama(e.target.value); setHizliSecilen(null); }}
                    placeholder="Ürün adı yazın..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Arama sonuçları */}
                  {hizliSonuclar.length > 0 && !hizliSecilen && (
                    <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      {hizliSonuclar.map(u => (
                        <button key={u.id} onClick={() => hizliUrunSec(u)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0 transition">
                          <span className="font-medium text-gray-800">{u.urunAdi}</span>
                          <span className="text-xs text-gray-500 ml-2">{u.marka} · {u.olcu}</span>
                          {u.stok > 0 && <span className="float-right text-xs text-emerald-600">Mevcut: {u.stok}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {hizliSecilen && (
                  <>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="font-semibold text-gray-800">{hizliSecilen.urunAdi}</p>
                      <p className="text-sm text-gray-500">{hizliSecilen.marka} · {hizliSecilen.olcu}</p>
                      {hizliSecilen.stok > 0 && (
                        <p className="text-sm text-emerald-600 mt-1">Mevcut stok: {hizliSecilen.stok} {hizliSecilen.olcu}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">Yeni Miktar ({hizliSecilen.olcu})</label>
                      <input
                        ref={hizliMiktarRef}
                        type="text"
                        inputMode="decimal"
                        value={hizliMiktar}
                        onChange={(e) => setHizliMiktar(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") hizliKaydet(); }}
                        placeholder="Miktar girin..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <button onClick={hizliKaydet}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition">
                      Kaydet & Devam Et
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}