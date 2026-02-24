"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type UrunStok = { id: string; urunAdi: string; marka: string; olcu: string; stok: number };

export default function StokPage() {
  const { yetkili, yukleniyor } = useAuth("/stok");

    const [urunler, setUrunler] = useState<UrunStok[]>([]);
    const [stokMap, setStokMap] = useState<Record<string, number>>({});
    const [kgInputler, setKgInputler] = useState<Record<string, string>>({});
    const [aramaMetni, setAramaMetni] = useState("");
    const [kaydediliyor, setKaydediliyor] = useState<Record<string, boolean>>({});
    const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
    const [veriYukleniyor, setVeriYukleniyor] = useState(true);

    const fetchUrunler = async () => {
        setVeriYukleniyor(true);
        const { data } = await supabase.from("urunler").select("id, urun_adi, marka, olcu, stok").order("urun_adi");
        const liste = (data || []).map((u: any) => ({
            id: u.id, urunAdi: u.urun_adi, marka: u.marka, olcu: u.olcu, stok: u.stok ?? 0,
        }));
        setUrunler(liste);
        const map: Record<string, number> = {};
        liste.forEach((u) => { map[u.id] = u.stok; });
        setStokMap(map);
        setVeriYukleniyor(false);
    };

    useEffect(() => { fetchUrunler(); }, []);

    const bildir = (tip: "basari" | "hata", metin: string) => {
        setBildirim({ tip, metin });
        setTimeout(() => setBildirim(null), 2500);
    };

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

    const handleKaydet = useCallback(async (u: UrunStok) => {
        const yeniStok = stokMap[u.id] ?? u.stok;
        if (yeniStok === u.stok) return;
        setKaydediliyor((prev) => ({ ...prev, [u.id]: true }));
        const { error } = await supabase.from("urunler").update({ stok: yeniStok }).eq("id", u.id);
        setKaydediliyor((prev) => ({ ...prev, [u.id]: false }));
        if (error) { bildir("hata", "Hata: " + error.message); return; }
        setUrunler((prev) => prev.map((x) => x.id === u.id ? { ...x, stok: yeniStok } : x));
        setKgInputler((prev) => { const y = { ...prev }; delete y[u.id]; return y; });
        bildir("basari", `"${u.urunAdi}" güncellendi → ${yeniStok} ${u.olcu}`);
    }, [stokMap]);

  if (yukleniyor) return (
    <DashboardLayout title="Stok Paneli">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
      </div>
    </DashboardLayout>
  );
  if (!yetkili) return null;

    const filtrelenmis = urunler.filter((u) =>
        !aramaMetni ||
        u.urunAdi.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        (u.marka || "").toLowerCase().includes(aramaMetni.toLowerCase())
    );

    const stokluUrun = urunler.filter((u) => u.stok > 0).length;

    return (
        <DashboardLayout title="Stok Paneli" subtitle="Depodaki mevcut ürün miktarlarını girin">
            <div className="max-w-5xl space-y-5">
                {bildirim && (
                    <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${bildirim.tip === "basari" ? "bg-white border-emerald-100 text-emerald-700" : "bg-white border-red-100 text-red-600"}`}>
                        <div className={`w-2 h-2 rounded-full ${bildirim.tip === "basari" ? "bg-emerald-500" : "bg-red-500"}`} />
                        <p className="font-bold text-xs uppercase tracking-widest">{bildirim.metin}</p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Toplam Ürün", deger: urunler.length, renk: "text-gray-800" },
                        { label: "Stokta Var", deger: stokluUrun, renk: "text-emerald-600" },
                        { label: "Stok Yok", deger: urunler.length - stokluUrun, renk: "text-red-700" },
                    ].map((k) => (
                        <div key={k.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{k.label}</p>
                            <p className={`text-3xl font-black ${k.renk}`}>{k.deger}</p>
                        </div>
                    ))}
                </div>

                {/* Miktar Giriş Rehberi */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3">Miktar Giriş Rehberi</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 text-xs">
                        <div className="flex items-start gap-2">
                            <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap text-[10px]">Kg / L</span>
                            <span className="text-gray-500 text-[10px]">Elle girin — orn: <b>0,100</b> · <b>1,500</b></span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap text-[10px]">G / Ml</span>
                            <span className="text-gray-500 text-[10px]">+ / - ile <b>50'şer</b> artır/azalt</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap text-[10px]">Adet</span>
                            <span className="text-gray-500 text-[10px]">+ / - ile <b>1'er</b> artır/azalt</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap text-[10px]">Paket / Kutu</span>
                            <span className="text-gray-500 text-[10px]">+ / - ile <b>1'er</b> artır/azalt</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)}
                        placeholder="Ürün adı veya marka ara..."
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[primary-900]/20 outline-none" />
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="font-black text-gray-800 tracking-tight">Depo Stok Miktarları</h2>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filtrelenmis.length} ürün · Enter/Tab ile kaydedin</span>
                    </div>
                    {veriYukleniyor ? (
                        <div className="py-20 text-center flex items-center justify-center gap-3 text-gray-400 text-sm">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-700"></div>
                            Yükleniyor...
                        </div>
                    ) : filtrelenmis.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 text-sm">Ürün bulunamadı.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                                    <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ÜRÜN</th>
                                    <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">MARKA</th>
                                    <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ÖLÇÜ</th>
                                    <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-52">DEPODA MEVCUT</th>
                                    <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">DURUM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtrelenmis.map((u) => {
                                    const deger = stokMap[u.id] ?? u.stok;
                                    const degisti = deger !== u.stok;
                                    const bilgi = olcuBilgisi(u.olcu);
                                    return (
                                        <tr key={u.id} className={`transition-colors ${degisti ? "bg-amber-50/50" : "hover:bg-gray-50"}`}>
                                            <td className="px-5 py-3.5 font-bold text-gray-800">{u.urunAdi}</td>
                                            <td className="px-5 py-3.5 text-gray-500">{u.marka || "—"}</td>
                                            <td className="px-5 py-3.5 text-gray-500">{u.olcu}</td>
                                            <td className="px-5 py-3">
                                                {bilgi.serbest ? (
                                                    /* Kg / L → serbest metin girişi */
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
                                                            className={`w-28 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 transition ${degisti ? "border-amber-400 bg-amber-50" : deger > 0 ? "border-gray-300 bg-white" : "border-gray-200 bg-white"
                                                                } ${deger > 0 ? "text-emerald-700 font-semibold" : "text-gray-400"}`}
                                                        />
                                                        <span className="text-xs font-medium text-gray-500">{u.olcu}</span>
                                                    </div>
                                                ) : (
                                                    /* G / Ml / Adet / Paket / Kutu → +/- butonları */
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
                                                            className={`w-16 border rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 transition ${degisti ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"
                                                                } ${deger > 0 ? "text-emerald-700 font-semibold" : "text-gray-400"}`}
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
            </div>
        </DashboardLayout>
    );
}