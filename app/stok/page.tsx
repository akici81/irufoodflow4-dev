"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";

type UrunStok = { id: string; urunAdi: string; marka: string; olcu: string; stok: number };

export default function StokPage() {
    const [urunler, setUrunler] = useState<UrunStok[]>([]);
    const [stokMap, setStokMap] = useState<Record<string, number>>({});
    const [kgInputler, setKgInputler] = useState<Record<string, string>>({});
    const [aramaMetni, setAramaMetni] = useState("");
    const [kaydediliyor, setKaydediliyor] = useState<Record<string, boolean>>({});
    const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);

    useEffect(() => { fetchUrunler(); }, []);

    const fetchUrunler = async () => {
        setYukleniyor(true);
        const { data } = await supabase.from("urunler").select("id, urun_adi, marka, olcu, stok").order("urun_adi");
        const liste = (data || []).map((u: any) => ({
            id: u.id, urunAdi: u.urun_adi, marka: u.marka, olcu: u.olcu, stok: u.stok ?? 0,
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

    // Ölçü birimine göre input tipi belirleme (alışveriş listesiyle aynı mantık)
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
                    <div className={`text-sm rounded-xl px-4 py-3 border font-medium transition ${bildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                        {bildirim.metin}
                    </div>
                )}

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
                            <span className="text-gray-500">İstediğiniz değeri elle girin — orn: <b>0,100</b> · <b>1,500</b></span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">G / Ml</span>
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

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)}
                        placeholder="Ürün adı veya marka ara..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none text-black p-2 focus:ring-2 focus:ring-red-500" />
                </div>

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
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ÖLÇÜ</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-52">DEPODA MEVCUT</th>
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
                                            <td className="px-5 py-3 text-gray-500">{u.olcu}</td>
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