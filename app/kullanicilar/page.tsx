"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

// Veri tiplerini tam tanımlayarak VS Code hatalarını gideriyoruz
type Kullanici = {
  id: number;
  username: string;
  ad_soyad: string;
  password_hash: string;
  role: string;
  dersler: string[];
};

type Ders = { id: string; kod: string; ad: string };

// Tip güvenliği için güncelleme objesi tipi
interface GuncellemeData {
  ad_soyad: string;
  role: string;
  dersler: string[];
  password_hash?: string;
}

const ROLLER = [
  { value: "ogretmen", label: "Öğretmen" },
  { value: "admin", label: "Admin" },
  { value: "bolum_baskani", label: "Bölüm Başkanı" },
  { value: "satin_alma", label: "Satın Alma" },
  { value: "stok", label: "Stok" },
];

const ROL_RENK: Record<string, string> = {
  admin: "bg-rose-50 text-rose-700 border-rose-100",
  ogretmen: "bg-sky-50 text-sky-700 border-sky-100",
  bolum_baskani: "bg-purple-50 text-purple-700 border-purple-100",
  satin_alma: "bg-amber-50 text-amber-700 border-amber-100",
  stok: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const BOSH_FORM = { username: "", ad_soyad: "", password_hash: "", role: "ogretmen", dersler: [] as string[] };

export default function KullanicilarPage() {
  const { yetkili, yukleniyor } = useAuth("/kullanicilar");

  const [sekme, setSekme] = useState<"liste" | "ekle" | "guncelle">("liste");
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [dersler, setDersler] = useState<Ders[]>([]);
  const [form, setForm] = useState(BOSH_FORM);
  const [duzenleId, setDuzenleId] = useState<number | null>(null);
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [{ data: k }, { data: d }] = await Promise.all([
      supabase.from("kullanicilar").select("*").order("id"),
      supabase.from("dersler").select("*").order("kod"),
    ]);
    setKullanicilar(k || []);
    setDersler(d || []);
  }, []);

  useEffect(() => {
    if (yetkili) fetchData();
  }, [yetkili, fetchData]);

  const bildirimGoster = (tip: "basari" | "hata", metin: string) => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 3500);
  };

  if (yukleniyor) return (
    <DashboardLayout title="Kullanıcı Yönetimi">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
      </div>
    </DashboardLayout>
  );

  if (!yetkili) return null;

  const handleEkle = async () => {
    if (!form.username.trim() || !form.ad_soyad.trim() || !form.password_hash.trim()) {
      bildirimGoster("hata", "Lütfen tüm zorunlu alanları doldurun."); return;
    }
    const { error } = await supabase.from("kullanicilar").insert({
      username: form.username.trim(),
      ad_soyad: form.ad_soyad.trim(),
      password_hash: form.password_hash,
      role: form.role,
      dersler: form.dersler,
    });
    if (error) { bildirimGoster("hata", error.message); return; }
    bildirimGoster("basari", `"${form.ad_soyad}" eklendi.`);
    setForm(BOSH_FORM);
    setSekme("liste");
    fetchData();
  };

  const handleGuncelle = async () => {
    if (!duzenleId) return;
    
    // VS Code hatasını önlemek için tip tanımlı obje oluşturuyoruz
    const guncelleme: GuncellemeData = {
      ad_soyad: form.ad_soyad,
      role: form.role,
      dersler: form.dersler,
    };
    
    if (form.password_hash) guncelleme.password_hash = form.password_hash;

    const { error } = await supabase.from("kullanicilar").update(guncelleme).eq("id", duzenleId);
    
    if (error) { bildirimGoster("hata", error.message); return; }
    bildirimGoster("basari", "Kullanıcı güncellendi.");
    setDuzenleId(null);
    setForm(BOSH_FORM);
    setSekme("liste");
    fetchData();
  };

  const handleSil = async (id: number) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) return;
    const { error } = await supabase.from("kullanicilar").delete().eq("id", id);
    if (error) { bildirimGoster("hata", error.message); return; }
    bildirimGoster("basari", "Kullanıcı silindi.");
    fetchData();
  };

  const handleDuzenleBaslat = (k: Kullanici) => {
    setDuzenleId(k.id);
    setForm({ username: k.username, ad_soyad: k.ad_soyad, password_hash: "", role: k.role, dersler: k.dersler || [] });
    setSekme("guncelle");
  };

  const toggleDers = (dersId: string) => {
    setForm((f) => ({
      ...f,
      dersler: f.dersler.includes(dersId)
        ? f.dersler.filter((d) => d !== dersId)
        : [...f.dersler, dersId],
    }));
  };

  // Fokus renklerini kırmızıdan (ring-red-500) daha yumuşak bordoya (ring-[primary-900]/20) çevirdim
  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm font-semibold text-gray-800 focus:ring-4 focus:ring-[primary-900]/10 focus:border-red-700/30 transition-all outline-none placeholder:text-gray-300";

  return (
    <DashboardLayout title="Erişim Yönetimi" subtitle="Personel yetkilerini buradan yönetin">
      
      {/* Bildirim Kutusu */}
      {bildirim && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          bildirim.tip === "basari" ? "bg-white border-emerald-100 text-emerald-600" : "bg-white border-red-100 text-red-600"
        }`}>
          <div className={`w-2 h-2 rounded-full ${bildirim.tip === "basari" ? "bg-emerald-500" : "bg-red-500"}`} />
          <p className="font-bold text-xs uppercase tracking-widest">{bildirim.metin}</p>
        </div>
      )}

      <div className="max-w-6xl space-y-6">
        
        {/* Modern Tab Menü */}
        <div className="flex bg-gray-100/50 p-1 rounded-2xl w-fit border border-gray-200/60">
          {(["liste", "ekle", "guncelle"] as const).map((s) => (
            (s !== "guncelle" || duzenleId) && (
              <button key={s} onClick={() => setSekme(s)}
                className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tighter transition-all ${
                  sekme === s ? "bg-white text-red-700 shadow-sm italic" : "text-gray-400 hover:text-gray-600"
                }`}>
                {s === "liste" ? "Personel Listesi" : s === "ekle" ? "+ Yeni Kayıt" : "Düzenle"}
              </button>
            )
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          
          {sekme === "liste" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">Kullanıcı</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">Ad Soyad</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-700 uppercase tracking-widest">Yetki</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black text-gray-700 uppercase tracking-widest">Yönet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {kullanicilar.map((k) => (
                    <tr key={k.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-4 font-bold text-gray-700 text-sm">{k.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{k.ad_soyad}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase ${ROL_RENK[k.role]}`}>
                          {ROLLER.find((r) => r.value === k.role)?.label}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right space-x-2">
                        <button onClick={() => handleDuzenleBaslat(k)} className="text-gray-300 hover:text-blue-600 transition-colors text-xs font-bold uppercase">Düzenle</button>
                        <span className="text-gray-200">|</span>
                        <button onClick={() => handleSil(k.id)} className="text-gray-300 hover:text-red-600 transition-colors text-xs font-bold uppercase">Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(sekme === "ekle" || sekme === "guncelle") && (
            <div className="p-8 lg:p-12 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-700 uppercase ml-1">Kullanıcı Adı</label>
                  <input className={inputClass} value={form.username} disabled={sekme === "guncelle"}
                    onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-700 uppercase ml-1">Ad Soyad</label>
                  <input className={inputClass} value={form.ad_soyad}
                    onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-700 uppercase ml-1">Şifre</label>
                  <input type="password" className={inputClass} placeholder="••••••••" value={form.password_hash}
                    onChange={(e) => setForm({ ...form, password_hash: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-700 uppercase ml-1">Rol</label>
                  <select className={inputClass} value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLLER.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {form.role === "ogretmen" && (
                  <div className="md:col-span-2 space-y-3 pt-4">
                    <label className="text-[10px] font-black text-gray-700 uppercase ml-1">Ders Atamaları</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-200">
                      {dersler.map((d) => (
                        <button key={d.id} type="button" onClick={() => toggleDers(d.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            form.dersler.includes(d.id) ? "bg-white border-red-700 ring-2 ring-[primary-900]/5 shadow-sm" : "bg-white/50 border-transparent opacity-60"
                          }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.dersler.includes(d.id) ? "bg-red-700 border-red-700" : "border-gray-300"}`}>
                            {form.dersler.includes(d.id) && <span className="text-white text-[10px]">✓</span>}
                          </div>
                          <span className="text-xs font-bold text-gray-700">{d.kod} - {d.ad}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-10">
                <button onClick={sekme === "ekle" ? handleEkle : handleGuncelle}
                  className="bg-red-700 hover:bg-red-800 text-white font-black py-3.5 px-10 rounded-2xl transition-all shadow-lg shadow-red-900/10 uppercase text-[11px] tracking-widest">
                  {sekme === "ekle" ? "Kaydı Oluştur" : "Değişiklikleri Kaydet"}
                </button>
                {sekme === "guncelle" && (
                  <button onClick={() => { setDuzenleId(null); setSekme("liste"); }}
                    className="bg-gray-100 text-gray-400 font-black py-3.5 px-10 rounded-2xl hover:bg-gray-200 transition-all uppercase text-[11px] tracking-widest">
                    İptal
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}