"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Etkinlik = {
  id?: string;
  donem: string;
  hafta: number;
  gun: string;
  tarih: string;
  etkinlik: string;
  renk: string;
  olusturan_id?: number | null;
  olusturan_adi?: string;
  aktif?: boolean;
};

const GUNLER = ["PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ", "PAZAR"];

const HAFTA_TARIHLER: Record<number, Record<string, string>> = {
  1:  { PAZARTESİ:"23 Şub", SALI:"24 Şub", ÇARŞAMBA:"25 Şub", PERŞEMBE:"26 Şub", CUMA:"27 Şub", CUMARTESİ:"28 Şub", PAZAR:"1 Mar" },
  2:  { PAZARTESİ:"2 Mar",  SALI:"3 Mar",  ÇARŞAMBA:"4 Mar",  PERŞEMBE:"5 Mar",  CUMA:"6 Mar",  CUMARTESİ:"7 Mar",  PAZAR:"8 Mar" },
  3:  { PAZARTESİ:"9 Mar",  SALI:"10 Mar", ÇARŞAMBA:"11 Mar", PERŞEMBE:"12 Mar", CUMA:"13 Mar", CUMARTESİ:"14 Mar", PAZAR:"15 Mar" },
  4:  { PAZARTESİ:"16 Mar", SALI:"17 Mar", ÇARŞAMBA:"18 Mar", PERŞEMBE:"19 Mar", CUMA:"20 Mar", CUMARTESİ:"21 Mar", PAZAR:"22 Mar" },
  5:  { PAZARTESİ:"23 Mar", SALI:"24 Mar", ÇARŞAMBA:"25 Mar", PERŞEMBE:"26 Mar", CUMA:"27 Mar", CUMARTESİ:"28 Mar", PAZAR:"29 Mar" },
  6:  { PAZARTESİ:"30 Mar", SALI:"31 Mar", ÇARŞAMBA:"1 Nis",  PERŞEMBE:"2 Nis",  CUMA:"3 Nis",  CUMARTESİ:"4 Nis",  PAZAR:"5 Nis" },
  7:  { PAZARTESİ:"6 Nis",  SALI:"7 Nis",  ÇARŞAMBA:"8 Nis",  PERŞEMBE:"9 Nis",  CUMA:"10 Nis", CUMARTESİ:"11 Nis", PAZAR:"12 Nis" },
  8:  { PAZARTESİ:"13 Nis", SALI:"14 Nis", ÇARŞAMBA:"15 Nis", PERŞEMBE:"16 Nis", CUMA:"17 Nis", CUMARTESİ:"18 Nis", PAZAR:"19 Nis" },
  9:  { PAZARTESİ:"20 Nis", SALI:"21 Nis", ÇARŞAMBA:"22 Nis", PERŞEMBE:"23 Nis", CUMA:"24 Nis", CUMARTESİ:"25 Nis", PAZAR:"26 Nis" },
  10: { PAZARTESİ:"27 Nis", SALI:"28 Nis", ÇARŞAMBA:"29 Nis", PERŞEMBE:"30 Nis", CUMA:"1 May",  CUMARTESİ:"2 May",  PAZAR:"3 May" },
  11: { PAZARTESİ:"4 May",  SALI:"5 May",  ÇARŞAMBA:"6 May",  PERŞEMBE:"7 May",  CUMA:"8 May",  CUMARTESİ:"9 May",  PAZAR:"10 May" },
  12: { PAZARTESİ:"11 May", SALI:"12 May", ÇARŞAMBA:"13 May", PERŞEMBE:"14 May", CUMA:"15 May", CUMARTESİ:"16 May", PAZAR:"17 May" },
  13: { PAZARTESİ:"18 May", SALI:"19 May", ÇARŞAMBA:"20 May", PERŞEMBE:"21 May", CUMA:"22 May", CUMARTESİ:"23 May", PAZAR:"24 May" },
  14: { PAZARTESİ:"25 May", SALI:"26 May", ÇARŞAMBA:"27 May", PERŞEMBE:"28 May", CUMA:"29 May", CUMARTESİ:"30 May", PAZAR:"31 May" },
  15: { PAZARTESİ:"1 Haz",  SALI:"2 Haz",  ÇARŞAMBA:"3 Haz",  PERŞEMBE:"4 Haz",  CUMA:"5 Haz",  CUMARTESİ:"6 Haz",  PAZAR:"7 Haz" },
  16: { PAZARTESİ:"8 Haz",  SALI:"9 Haz",  ÇARŞAMBA:"10 Haz", PERŞEMBE:"11 Haz", CUMA:"12 Haz", CUMARTESİ:"13 Haz", PAZAR:"14 Haz" }, 
};

const RENKLER = [
  { value: "mavi",    label: "Mavi",    aciklama: "Etkinlik / Organizasyon",      bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  { value: "yesil",   label: "Yeşil",   aciklama: "Ders Başlangıcı / Akademik",   bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  { value: "sari",    label: "Sarı",    aciklama: "Vize / Final Sınavı",          bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  { value: "kirmizi", label: "Kırmızı", aciklama: "Resmi Tatil / Bayram",         bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  { value: "mor",     label: "Mor",     aciklama: "Workshop / Seminer / Sunum",   bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  { value: "turuncu", label: "Turuncu", aciklama: "Teknik Gezi / Saha Çalışması", bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
];

const renkBul = (value: string) => RENKLER.find(r => r.value === value) || RENKLER[0];

export default function EtkinlikTakvimiPage() {
  const { yetkili, yukleniyor: authYukleniyor } = useAuth("/etkinlik-takvimi");

  const [kullaniciId, setKullaniciId] = useState<number | null>(null);
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [kullaniciRole, setKullaniciRole] = useState("");
  const [etkinlikler, setEtkinlikler] = useState<Etkinlik[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliHafta, setSeciliHafta] = useState<number | null>(null);
  const [seciliGun, setSeciliGun] = useState<string>("");
  const [duzenlenen, setDuzenlenen] = useState<Etkinlik | null>(null);
  const [form, setForm] = useState({ etkinlik: "", renk: "mavi", kacGun: 1 });
  const [arasinav, setArasinav] = useState(false);

  useEffect(() => {
    if (!yetkili) return;
    const id = localStorage.getItem("aktifKullaniciId");
    const role = localStorage.getItem("role") || "";
    const adi = localStorage.getItem("username") || "";
    if (id) { setKullaniciId(Number(id)); setKullaniciRole(role); }
    supabase.from("kullanicilar").select("ad_soyad").eq("id", Number(id)).single()
      .then(({ data }) => setKullaniciAdi(data?.ad_soyad || adi));
    fetchEtkinlikler();
  }, [yetkili]);

  const fetchEtkinlikler = async () => {
    setYukleniyor(true);
    const { data } = await supabase
      .from("etkinlik_takvimi")
      .select("*")
      .eq("donem", "2025-2026 Bahar")
      .eq("aktif", true)
      .order("hafta")
      .order("gun");
    setEtkinlikler(data || []);
    setYukleniyor(false);
  };

  const bildir = (tip: "basari" | "hata", metin: string) => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 3000);
  };

  const handleHucreTikla = (hafta: number, gun: string) => {
    setSeciliHafta(hafta);
    setSeciliGun(gun);
    setDuzenlenen(null);
    setForm({ etkinlik: "", renk: "mavi", kacGun: 1 });
    setArasinav(hafta === 8);
    setModalAcik(true);
  };

  const handleDuzenle = (e: Etkinlik, ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (kullaniciRole !== "admin" && e.olusturan_id !== kullaniciId) return;
    setDuzenlenen(e);
    setSeciliHafta(e.hafta);
    setSeciliGun(e.gun);
    setForm({ etkinlik: e.etkinlik, renk: e.renk, kacGun: 1 });
    setModalAcik(true);
  };

  const handleSil = async (id: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (!confirm("Bu etkinliği silmek istiyor musunuz?")) return;
    await supabase.from("etkinlik_takvimi").update({ aktif: false }).eq("id", id);
    bildir("basari", "Etkinlik silindi.");
    fetchEtkinlikler();
  };

  const handleKaydet = async () => {
    if (!form.etkinlik.trim()) { bildir("hata", "Etkinlik açıklaması giriniz."); return; }
    const tarih = HAFTA_TARIHLER[seciliHafta!]?.[seciliGun] || "";
    if (duzenlenen) {
      await supabase.from("etkinlik_takvimi").update({
        etkinlik: form.etkinlik, renk: form.renk,
      }).eq("id", duzenlenen.id);
      bildir("basari", "Güncellendi.");
    } else {
      // Tüm hafta+gün kombinasyonunu düz liste olarak oluştur
      const tumGunler: { hafta: number; gun: string; tarih: string }[] = [];
      for (let h = 1; h <= 14; h++) {
        for (const g of GUNLER) {
          tumGunler.push({ hafta: h, gun: g, tarih: HAFTA_TARIHLER[h]?.[g] || "" });
        }
      }
      const baslangicIdx = tumGunler.findIndex(d => d.hafta === seciliHafta && d.gun === seciliGun);
      const eklenecekler = [];
      for (let i = 0; i < form.kacGun; i++) {
        const idx = baslangicIdx + i;
        if (idx >= tumGunler.length) break;
        const g = tumGunler[idx];
        eklenecekler.push({
          donem: "2025-2026 Bahar",
          hafta: g.hafta,
          gun: g.gun,
          tarih: g.tarih,
          etkinlik: form.etkinlik,
          renk: form.renk,
          olusturan_id: kullaniciId,
          olusturan_adi: kullaniciAdi,
          aktif: true,
        });
      }
      await supabase.from("etkinlik_takvimi").insert(eklenecekler);
      bildir("basari", `${eklenecekler.length} güne eklendi.`);
    }
    setModalAcik(false);
    fetchEtkinlikler();
  };

  // Hücredeki etkinlikleri getir
  const hucreEtkinlikleri = (hafta: number, gun: string) =>
    etkinlikler.filter(e => e.hafta === hafta && e.gun === gun);

  const arasinAvHafta = etkinlikler.some(e => e.hafta === 8 && e.etkinlik.includes("ARASINAV"));

  if (authYukleniyor || !yetkili) return null;

  return (
    <DashboardLayout title="Etkinlik Takvimi" subtitle="2025-2026 Bahar Dönemi Akademik Takvim">
      <div className="space-y-5">

        {/* Bildirim */}
        {bildirim && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-xl border text-sm font-semibold flex items-center gap-2 ${
            bildirim.tip === "basari" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"
          }`}>
            <span className={`w-2 h-2 rounded-full ${bildirim.tip === "basari" ? "bg-emerald-500" : "bg-red-500"}`} />
            {bildirim.metin}
          </div>
        )}

        {/* lejand aşağıda */}

        {/* Takvim */}
        {yukleniyor ? (
          <div className="py-20 text-center text-zinc-400 text-sm">Yükleniyor...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-fixed" style={{ minWidth: "1000px" }}>
                <colgroup>
                  <col style={{ width: "52px" }} />
                  {GUNLER.map(g => <col key={g} style={{ width: "13.5%" }} />)}
                </colgroup>
                <thead>
                  <tr style={{ background: "#8B0000" }}>
                    <th className="px-2 py-3 text-center text-xs font-bold text-white">Hf.</th>
                    {GUNLER.map(g => (
                      <th key={g} className="px-2 py-3 text-center text-xs font-bold text-white tracking-wide">{g}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map(hafta => {
                    const isArasinav = hafta === 8;
                    return (
                      <tr key={hafta} className={hafta % 2 === 0 ? "bg-zinc-50" : "bg-white"}>
                        {/* Hafta no */}
                        <td className="py-2 border border-zinc-100 text-center align-top" style={{ background: "#fafafa" }}>
                          <span className="text-xs font-bold text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto mt-1"
                            style={{ background: "#8B0000" }}>{hafta}</span>
                        </td>
                        {/* Vize haftası - birleşik hücre */}
                        {isArasinav ? (
                          <td colSpan={7} className="border border-zinc-100 p-3 text-center align-middle"
                            style={{ background: "#FEF3C7" }}>
                            <div className="font-bold text-sm" style={{ color: "#92400E" }}>
                              📝 ARASINAV (VİZE) HAFTASI
                            </div>
                            <div className="text-xs mt-1" style={{ color: "#B45309" }}>
                              13 Nisan – 19 Nisan 2025
                            </div>
                          </td>
                        ) : (
                          /* Normal haftalar - günler */
                          GUNLER.map(gun => {
                            const tarih = HAFTA_TARIHLER[hafta]?.[gun] || "";
                            const hEtkinlikler = hucreEtkinlikleri(hafta, gun);
                            return (
                              <td key={gun}
                                className="border border-zinc-100 p-1.5 align-top cursor-pointer hover:bg-red-50/40 transition-colors"
                                onClick={() => handleHucreTikla(hafta, gun)}>
                                {/* Tarih */}
                                <div className="text-xs text-zinc-300 font-medium mb-1">{tarih}</div>
                                {/* Etkinlikler */}
                                {hEtkinlikler.map(e => {
                                  const renk = renkBul(e.renk);
                                  const silinebilir = kullaniciRole === "admin" || e.olusturan_id === kullaniciId;
                                  return (
                                    <div key={e.id} className="rounded-md px-1.5 py-1 mb-1 text-xs leading-snug border group relative"
                                      style={{ background: renk.bg, color: renk.text, borderColor: renk.border }}>
                                      <div className="font-semibold pr-8">{e.etkinlik}</div>
                                      {e.olusturan_adi && e.olusturan_adi !== "Sistem" && e.renk !== "kirmizi" && (
                                        <div className="text-xs mt-0.5 opacity-50 font-normal">{e.olusturan_adi}</div>
                                      )}
                                      {silinebilir && (
                                        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
                                          <button onClick={ev => handleDuzenle(e, ev)}
                                            className="w-4 h-4 rounded text-xs flex items-center justify-center bg-white/90 hover:bg-white shadow-sm">✎</button>
                                          <button onClick={ev => handleSil(e.id ?? "", ev)}
                                            className="w-4 h-4 rounded text-xs flex items-center justify-center bg-white/90 hover:bg-white shadow-sm text-red-500">✕</button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {hEtkinlikler.length === 0 && (
                                  <div className="text-zinc-100 text-base text-center py-2 hover:text-zinc-300 transition-colors">+</div>
                                )}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Renk Lejandı */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Renk Lejandı</p>
        <div className="flex flex-wrap gap-2">
          {RENKLER.map(r => (
            <span key={r.value} className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border"
              style={{ background: r.bg, color: r.text, borderColor: r.border }}>
              <span className="font-bold">{r.label}</span>
              <span className="opacity-70">{r.aciklama}</span>
            </span>
          ))}
        </div>
        <p className="text-xs text-zinc-400 mt-3">💡 Bir hücreye tıklayarak etkinlik ekleyebilirsiniz.</p>
      </div>

      {/* Modal */}
      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setModalAcik(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-800">
                  {duzenlenen ? "Etkinliği Düzenle" : "Etkinlik Ekle"}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {seciliHafta}. Hafta — {seciliGun} {HAFTA_TARIHLER[seciliHafta!]?.[seciliGun] && `(${HAFTA_TARIHLER[seciliHafta!][seciliGun]})`}
                </p>
              </div>
              <button onClick={() => setModalAcik(false)} className="text-zinc-400 hover:text-zinc-600 text-xl font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1.5">Etkinlik Açıklaması *</label>
                <textarea value={form.etkinlik} onChange={e => setForm(p => ({ ...p, etkinlik: e.target.value }))}
                  rows={3} placeholder="örn: Salon du Chocolat - İstanbul Kongre Merkezi"
                  className="w-full border border-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
              </div>
              {!duzenlenen && (
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1.5">Kaç Gün Sürecek?</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1,2,3,4,5,6,7].map(n => (
                      <button key={n} onClick={() => setForm(p => ({ ...p, kacGun: n }))}
                        className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition ${form.kacGun === n ? "text-white border-transparent shadow-sm" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"}`}
                        style={form.kacGun === n ? { background: "#B71C1C", borderColor: "#B71C1C" } : {}}>
                        {n}
                      </button>
                    ))}
                    <span className="text-xs text-zinc-400 self-center ml-1">
                      {form.kacGun === 1 ? "Sadece bu gün" : `Bu günden itibaren ${form.kacGun} gün`}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1.5">Renk</label>
                <div className="flex flex-wrap gap-2">
                  {RENKLER.map(r => (
                    <button key={r.value} onClick={() => setForm(p => ({ ...p, renk: r.value }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${form.renk === r.value ? "border-zinc-800 shadow-sm scale-105" : "border-transparent"}`}
                      style={{ background: r.bg, color: r.text }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Önizleme */}
              {form.etkinlik && (
                <div className="rounded-xl px-4 py-3 text-sm font-medium border"
                  style={{ background: renkBul(form.renk).bg, color: renkBul(form.renk).text, borderColor: renkBul(form.renk).border }}>
                  {form.etkinlik}
                  <div className="text-xs mt-0.5 opacity-60">{kullaniciAdi}</div>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setModalAcik(false)}
                  className="flex-1 border border-zinc-300 text-zinc-600 text-sm font-medium py-2.5 rounded-xl hover:bg-zinc-50 transition">
                  İptal
                </button>
                <button onClick={handleKaydet}
                  className="flex-1 text-white text-sm font-bold py-2.5 rounded-xl transition"
                  style={{ background: "#B71C1C" }}>
                  {duzenlenen ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}