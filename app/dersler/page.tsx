"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Ders = { id: string; kod: string; ad: string; donem: string; aktif: boolean };
type Kullanici = { id: number; username: string; ad_soyad: string; role: string; dersler: string[] };

export default function DerslerPage() {
  const { yetkili, yukleniyor } = useAuth("/dersler");

  const [dersler, setDersler] = useState<Ders[]>([]);
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [yeniKod, setYeniKod] = useState("");
  const [yeniAd, setYeniAd] = useState("");
  const [yeniDonem, setYeniDonem] = useState("guz");
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [duzenleGrup, setDuzenleGrup] = useState<string | null>(null);
  const [duzenleData, setDuzenleData] = useState<Record<string, { kod: string; ad: string; donem: string }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    const [{ data: d }, { data: k }] = await Promise.all([
      supabase.from("dersler").select("*").order("kod"),
      supabase.from("kullanicilar").select("id, username, ad_soyad, role, dersler").eq("role", "ogretmen"),
    ]);
    setDersler(d || []);
    setKullanicilar(k || []);
    setIsRefreshing(false);
  }, []);

  useEffect(() => { 
    if (yetkili) fetchData(); 
  }, [yetkili, fetchData]);

  const bildirimGoster = (tip: "basari" | "hata", metin: string) => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 3500);
  };

  if (yukleniyor) return (
    <DashboardLayout title="Ders Yönetimi">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B1A1A]"></div>
      </div>
    </DashboardLayout>
  );

  if (!yetkili) return null;

  const handleDersEkle = async () => {
    if (!yeniKod.trim() || !yeniAd.trim()) { bildirimGoster("hata", "Kod ve ad boş olamaz."); return; }
    if (dersler.some((d) => d.kod === yeniKod.trim().toUpperCase())) { bildirimGoster("hata", "Bu ders kodu zaten mevcut."); return; }
    
    const { error } = await supabase.from("dersler").insert({
      kod: yeniKod.trim().toUpperCase(), ad: yeniAd.trim(), donem: yeniDonem,
    });
    
    if (error) { bildirimGoster("hata", error.message); return; }
    
    setYeniKod(""); setYeniAd("");
    bildirimGoster("basari", `"${yeniKod.toUpperCase()}" dersi başarıyla eklendi.`);
    fetchData();
  };

  const handleTopluAktif = async (donem: string, aktif: boolean) => {
    const hedefler = dersler.filter((d) => (d.donem || "guz") === donem);
    for (const d of hedefler) {
      await supabase.from("dersler").update({ aktif }).eq("id", d.id);
    }
    bildirimGoster("basari", `${donem.toUpperCase()} dönemi dersleri ${aktif ? "aktif" : "pasif"} yapıldı.`);
    fetchData();
  };

  const handleDuzenleAc = (donem: string, grup: Ders[]) => {
    const data: Record<string, { kod: string; ad: string; donem: string }> = {};
    grup.forEach((d) => { data[d.id] = { kod: d.kod, ad: d.ad, donem: d.donem || "guz" }; });
    setDuzenleData(data);
    setDuzenleGrup(donem);
  };

  const handleDuzenleKaydet = async () => {
    for (const [id, val] of Object.entries(duzenleData)) {
      await supabase.from("dersler").update({ kod: val.kod.toUpperCase(), ad: val.ad, donem: val.donem }).eq("id", id);
    }
    setDuzenleGrup(null);
    bildirimGoster("basari", "Değişiklikler kaydedildi.");
    fetchData();
  };

  const handleDersSil = async (dersId: string) => {
    if (!confirm("Bu dersi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) return;
    const etkilenenler = kullanicilar.filter((k) => (k.dersler || []).includes(dersId));
    for (const k of etkilenenler) {
      await supabase.from("kullanicilar").update({ dersler: k.dersler.filter((d) => d !== dersId) }).eq("id", k.id);
    }
    await supabase.from("dersler").delete().eq("id", dersId);
    bildirimGoster("basari", "Ders ve ilgili atamalar silindi.");
    fetchData();
  };

  const handleDersAta = async (ogretmenId: number, dersId: string, ekle: boolean) => {
    const ogretmen = kullanicilar.find((k) => k.id === ogretmenId);
    if (!ogretmen) return;
    if (ekle) {
      const mevcutSahibi = kullanicilar.find((k) => k.id !== ogretmenId && (k.dersler || []).includes(dersId));
      if (mevcutSahibi) {
        await supabase.from("kullanicilar").update({ dersler: mevcutSahibi.dersler.filter((d) => d !== dersId) }).eq("id", mevcutSahibi.id);
      }
      await supabase.from("kullanicilar").update({ dersler: [...(ogretmen.dersler || []), dersId] }).eq("id", ogretmenId);
    } else {
      await supabase.from("kullanicilar").update({ dersler: (ogretmen.dersler || []).filter((d) => d !== dersId) }).eq("id", ogretmenId);
    }
    fetchData();
  };

  const dersinOgretmenleri = (dersId: string) => kullanicilar.filter((o) => (o.dersler || []).includes(dersId));

  const DersGrubu = ({ baslik, donem, grup }: { baslik: string; donem: string; grup: Ders[] }) => {
    const duzenleniyor = duzenleGrup === donem;

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mb-8 animate-in fade-in duration-500">
        <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/30">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-800 tracking-tighter">{baslik}</h2>
            <span className="bg-[#8B1A1A]/10 text-[#8B1A1A] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              {grup.length} Ders
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {donem !== "secmeli" && !duzenleniyor && (
              <>
                <button onClick={() => handleTopluAktif(donem, true)}
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest px-4 py-2 bg-emerald-50 rounded-xl transition-all">
                  TÜMÜNÜ AKTİF YAP
                </button>
                <button onClick={() => handleTopluAktif(donem, false)}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest px-4 py-2 bg-slate-100 rounded-xl transition-all">
                  TÜMÜNÜ PASİF YAP
                </button>
              </>
            )}
            {duzenleniyor ? (
              <div className="flex gap-2">
                <button onClick={handleDuzenleKaydet} className="bg-[#8B1A1A] text-white text-[10px] font-black px-5 py-2 rounded-xl uppercase tracking-widest shadow-lg shadow-red-900/20">KAYDET</button>
                <button onClick={() => setDuzenleGrup(null)} className="bg-slate-200 text-slate-600 text-[10px] font-black px-5 py-2 rounded-xl uppercase tracking-widest">İPTAL</button>
              </div>
            ) : (
              <button onClick={() => handleDuzenleAc(donem, grup)} className="border border-slate-200 text-slate-400 hover:text-slate-800 text-[10px] font-black px-5 py-2 rounded-xl uppercase tracking-widest transition-all hover:bg-white">DÜZENLE</button>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {grup.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-300 font-bold text-sm uppercase tracking-widest italic">Bu dönem için henüz ders tanımlanmamış.</p>
            </div>
          ) : duzenleniyor ? (
            grup.map((d) => (
              <div key={d.id} className="px-10 py-4 flex gap-4 items-center bg-amber-50/20">
                <input
                  value={duzenleData[d.id]?.kod || ""}
                  onChange={(e) => setDuzenleData(prev => ({ ...prev, [d.id]: { ...prev[d.id], kod: e.target.value } }))}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold w-32 focus:ring-2 focus:ring-[#8B1A1A]/20 outline-none"
                />
                <input
                  value={duzenleData[d.id]?.ad || ""}
                  onChange={(e) => setDuzenleData(prev => ({ ...prev, [d.id]: { ...prev[d.id], ad: e.target.value } }))}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold flex-1 focus:ring-2 focus:ring-[#8B1A1A]/20 outline-none"
                />
                <button onClick={() => handleDersSil(d.id)} className="text-red-500 hover:text-red-700 p-2">🗑</button>
              </div>
            ))
          ) : (
            grup.map((d) => {
              const atananlar = dersinOgretmenleri(d.id);
              return (
                <div key={d.id} className={`px-10 py-6 transition-all hover:bg-slate-50/50 ${!d.aktif ? "bg-slate-50/40" : ""}`}>
                  <div className="flex items-center justify-between gap-8">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded-md tracking-tighter italic">{d.kod}</span>
                        <h3 className={`font-black text-lg tracking-tight ${!d.aktif ? "text-slate-400 line-through" : "text-slate-800"}`}>{d.ad}</h3>
                        {!d.aktif && <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-widest bg-white">Pasif</span>}
                      </div>
                      
                      {d.aktif && (
                        <div className="flex flex-wrap gap-2">
                          {kullanicilar.map((o) => {
                            const atanmis = (o.dersler || []).includes(d.id);
                            return (
                              <button key={o.id}
                                onClick={() => handleDersAta(o.id, d.id, !atanmis)}
                                className={`text-[10px] font-black px-4 py-2 rounded-xl border transition-all uppercase tracking-widest ${
                                  atanmis 
                                  ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                                  : "bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600"
                                }`}>
                                {o.ad_soyad || o.username}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={async () => {
                        await supabase.from("dersler").update({ aktif: !d.aktif }).eq("id", d.id);
                        fetchData();
                      }}
                      className={`w-14 h-7 rounded-full relative transition-all shadow-inner ${d.aktif ? "bg-emerald-500" : "bg-slate-200"}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${d.aktif ? "left-8" : "left-1"}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout title="Ders Yönetimi" subtitle="Müfredat derslerini tanımlayın ve eğitmen eşleştirmelerini yapın">
      {bildirim && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-10 ${
          bildirim.tip === "basari" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
        }`}>
          <span className="text-xl">{bildirim.tip === "basari" ? "✓" : "✕"}</span>
          <p className="font-bold text-sm uppercase tracking-tight">{bildirim.metin}</p>
        </div>
      )}

      <div className="space-y-8 max-w-6xl">
        {/* Yeni Ders Ekleme Kartı */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B1A1A]/5 rounded-bl-full -mr-10 -mt-10 transition-all group-hover:scale-110"></div>
          
          <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 tracking-tighter italic">
            <span className="w-8 h-8 rounded-xl bg-[#8B1A1A] text-white flex items-center justify-center not-italic text-sm">+</span>
            YENİ DERS TANIMLA
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DERS KODU</label>
              <input value={yeniKod} onChange={(e) => setYeniKod(e.target.value)}
                placeholder="Örn: ASC112" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#8B1A1A]/20" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DERS ADI</label>
              <input value={yeniAd} onChange={(e) => setYeniAd(e.target.value)}
                placeholder="Mutfak Uygulamaları I" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#8B1A1A]/20" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DÖNEM</label>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                {["guz", "bahar", "secmeli"].map((d) => (
                  <button key={d} onClick={() => setYeniDonem(d)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${yeniDonem === d ? "bg-white text-[#8B1A1A] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                    {d === "guz" ? "Güz" : d === "bahar" ? "Bahar" : "Seç"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button onClick={handleDersEkle}
            className="mt-8 w-full bg-[#8B1A1A] hover:bg-red-800 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-red-900/20 uppercase text-xs tracking-[0.2em]">
            SİSTEME KAYDET
          </button>
        </div>

        {/* Gruplanmış Listeler */}
        <div className="grid grid-cols-1 gap-2">
          <DersGrubu baslik="GÜZ DÖNEMİ" donem="guz" grup={dersler.filter(d => (d.donem || "guz") === "guz")} />
          <DersGrubu baslik="BAHAR DÖNEMİ" donem="bahar" grup={dersler.filter(d => d.donem === "bahar")} />
          <DersGrubu baslik="SEÇMELİ DERSLER" donem="secmeli" grup={dersler.filter(d => d.donem === "secmeli")} />
        </div>
      </div>
    </DashboardLayout>
  );
}