"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Malzeme = {
  id: string;
  urun_adi: string;
  marka: string;
  birim: string;
  miktar_kisi: number;
  notlar: string;
};

type Recete = {
  id: string;
  ad: string;
  kategori: string;
  aciklama: string;
  hazirlanis: string;
  porsiyon: number;
  aktif: boolean;
  olusturan_id: number | null;
  malzemeler?: Malzeme[];
};

const KATEGORILER = ["Tümü", "Ana Yemekler", "Çorbalar", "Salatalar", "Tatlılar", "Kahvaltılık", "Aperatif", "Diğer"];
const BIRIMLER = ["gr", "kg", "ml", "lt", "adet", "çay k.", "yemek k.", "su b.", "demet", "dilim", "tutam"];

export default function RecetelerPage() {
  const { yetkili, yukleniyor } = useAuth("/receteler");
  if (yukleniyor) return <div className="min-h-screen flex items-center justify-center text-gray-400">Yükleniyor...</div>;
  if (!yetkili) return null;

  const [kullaniciId, setKullaniciId] = useState<number | null>(null);
  const [kullaniciRole, setKullaniciRole] = useState<string>("");
  const [receteler, setReceteler] = useState<Recete[]>([]);
  const [filtreKat, setFiltreKat] = useState("Tümü");
  const [aramaMetni, setAramaMetni] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [aktifSekme, setAktifSekme] = useState<"benim" | "ortak">("benim");
  const [ortakReceteler, setOrtakReceteler] = useState<Recete[]>([]);
  const [ortakYukleniyor, setOrtakYukleniyor] = useState(false);

  const [modalAcik, setModalAcik] = useState(false);
  const [detayRecete, setDetayRecete] = useState<Recete | null>(null);
  const [duzenleRecete, setDuzenleRecete] = useState<Recete | null>(null);

  const [form, setForm] = useState({ ad: "", kategori: "Ana Yemekler", aciklama: "", hazirlanis: "", porsiyon: 1 });
  const [malzemeler, setMalzemeler] = useState<Omit<Malzeme, "id">[]>([]);
  const [yeniMalzeme, setYeniMalzeme] = useState({ urun_adi: "", marka: "", birim: "gr", miktar_kisi: 0, notlar: "" });
  const [formYukleniyor, setFormYukleniyor] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("aktifKullaniciId");
    const role = localStorage.getItem("aktifKullaniciRole") || "";
    if (id) {
      setKullaniciId(Number(id));
      setKullaniciRole(role);
      fetchReceteler(Number(id), role);
    } else {
      setYukleniyor(false);
    }
  }, []);

  const fetchReceteler = async (kid: number, role: string) => {
    setYukleniyor(true);
    const { data } = role === "admin"
      ? await supabase.from("receteler").select("*").eq("aktif", true).order("ad")
      : await supabase.from("receteler").select("*").eq("aktif", true).eq("olusturan_id", kid).order("ad");
    setReceteler(data || []);
    setYukleniyor(false);
  };

  const fetchMalzemeler = async (receteId: string): Promise<Malzeme[]> => {
    const { data } = await supabase.from("recete_malzemeleri").select("*").eq("recete_id", receteId);
    return data || [];
  };

  const bildir = (tip: "basari" | "hata", metin: string) => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 3500);
  };

  const handleOrtakSekme = async () => {
    setAktifSekme("ortak");
    if (ortakReceteler.length === 0) {
      setOrtakYukleniyor(true);
      const { data } = await supabase.from("receteler").select("*").eq("aktif", true).is("olusturan_id", null).order("ad");
      setOrtakReceteler(data || []);
      setOrtakYukleniyor(false);
    }
  };

  const handleDetay = async (r: Recete) => {
    const malz = await fetchMalzemeler(r.id);
    setDetayRecete({ ...r, malzemeler: malz });
  };

  const handleDuzenleAc = async (r: Recete) => {
    const malz = await fetchMalzemeler(r.id);
    setDuzenleRecete({ ...r, malzemeler: malz });
    setForm({ ad: r.ad, kategori: r.kategori, aciklama: r.aciklama, hazirlanis: r.hazirlanis, porsiyon: r.porsiyon });
    setMalzemeler(malz.map(m => ({ urun_adi: m.urun_adi, marka: m.marka, birim: m.birim, miktar_kisi: m.miktar_kisi, notlar: m.notlar })));
    setYeniMalzeme({ urun_adi: "", marka: "", birim: "gr", miktar_kisi: 0, notlar: "" });
    setModalAcik(true);
  };

  const handleYeniAc = () => {
    setDuzenleRecete(null);
    setForm({ ad: "", kategori: "Ana Yemekler", aciklama: "", hazirlanis: "", porsiyon: 1 });
    setMalzemeler([]);
    setYeniMalzeme({ urun_adi: "", marka: "", birim: "gr", miktar_kisi: 0, notlar: "" });
    setModalAcik(true);
  };

  const handleKopyala = async (r: Recete) => {
    if (!kullaniciId) return;
    const malz = await fetchMalzemeler(r.id);
    const { data, error } = await supabase.from("receteler").insert({
      ad: r.ad + " (Kopyam)", kategori: r.kategori, aciklama: r.aciklama,
      hazirlanis: r.hazirlanis, porsiyon: r.porsiyon, aktif: true, olusturan_id: kullaniciId,
    }).select().single();
    if (error || !data) { bildir("hata", "Kopyalama başarısız."); return; }
    if (malz.length > 0) {
      await supabase.from("recete_malzemeleri").insert(
        malz.map(m => ({ recete_id: data.id, urun_adi: m.urun_adi, marka: m.marka, birim: m.birim, miktar_kisi: m.miktar_kisi, notlar: m.notlar }))
      );
    }
    bildir("basari", `"${r.ad}" tarif defterinize kopyalandı!`);
    setAktifSekme("benim");
    fetchReceteler(kullaniciId, kullaniciRole);
  };

  const handleMalzemeEkle = () => {
    if (!yeniMalzeme.urun_adi.trim()) return;
    setMalzemeler(prev => [...prev, { ...yeniMalzeme }]);
    setYeniMalzeme({ urun_adi: "", marka: "", birim: "gr", miktar_kisi: 0, notlar: "" });
  };

  const handleMalzemeSil = (idx: number) => setMalzemeler(prev => prev.filter((_, i) => i !== idx));

  const handleKaydet = async () => {
    if (!form.ad.trim()) { bildir("hata", "Tarif adı zorunlu."); return; }
    if (!kullaniciId) return;
    setFormYukleniyor(true);
    if (duzenleRecete) {
      await supabase.from("receteler").update({
        ad: form.ad, kategori: form.kategori, aciklama: form.aciklama,
        hazirlanis: form.hazirlanis, porsiyon: form.porsiyon, guncelleme_tarihi: new Date().toISOString(),
      }).eq("id", duzenleRecete.id);
      await supabase.from("recete_malzemeleri").delete().eq("recete_id", duzenleRecete.id);
      if (malzemeler.length > 0)
        await supabase.from("recete_malzemeleri").insert(malzemeler.map(m => ({ ...m, recete_id: duzenleRecete.id })));
      bildir("basari", "Tarif güncellendi!");
    } else {
      const { data, error } = await supabase.from("receteler").insert({
        ad: form.ad, kategori: form.kategori, aciklama: form.aciklama,
        hazirlanis: form.hazirlanis, porsiyon: form.porsiyon, aktif: true, olusturan_id: kullaniciId,
      }).select().single();
      if (error || !data) { bildir("hata", "Kayıt hatası."); setFormYukleniyor(false); return; }
      if (malzemeler.length > 0)
        await supabase.from("recete_malzemeleri").insert(malzemeler.map(m => ({ ...m, recete_id: data.id })));
      bildir("basari", "Tarif defterinize eklendi!");
    }
    setModalAcik(false);
    setFormYukleniyor(false);
    fetchReceteler(kullaniciId, kullaniciRole);
  };

  const handleSil = async (id: string) => {
    if (!confirm("Bu tarifi defterinizden silmek istiyor musunuz?")) return;
    await supabase.from("receteler").update({ aktif: false }).eq("id", id);
    bildir("basari", "Tarif silindi.");
    if (kullaniciId) fetchReceteler(kullaniciId, kullaniciRole);
  };

  const gosterilecek = (aktifSekme === "benim" ? receteler : ortakReceteler).filter(r =>
    (filtreKat === "Tümü" || r.kategori === filtreKat) &&
    (aramaMetni === "" || r.ad.toLowerCase().includes(aramaMetni.toLowerCase()))
  );

  return (
    <DashboardLayout title="Tarif Defterim" subtitle="Kişisel reçete havuzunuz — ilerleyen dönemler için saklayın">
      <div className="max-w-6xl space-y-5">
        {bildirim && (
          <div className={`text-sm rounded-xl px-4 py-3 border font-medium ${bildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
            {bildirim.metin}
          </div>
        )}

        {/* Sekmeler */}
        <div className="flex gap-2 border-b border-gray-200">
          <button onClick={() => setAktifSekme("benim")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${aktifSekme === "benim" ? "border-red-700 text-red-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            📒 Tarif Defterim ({receteler.length})
          </button>
          <button onClick={handleOrtakSekme}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${aktifSekme === "ortak" ? "border-red-700 text-red-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            🌐 Ortak Reçeteler
          </button>
        </div>

        {/* Filtre + Ekle */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Kategori</label>
            <select value={filtreKat} onChange={e => setFiltreKat(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              {KATEGORILER.map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-700 block mb-1">Arama</label>
            <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Tarif ara..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          {aktifSekme === "benim" && (
            <button onClick={handleYeniAc}
              className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
              + Yeni Tarif Ekle
            </button>
          )}
        </div>

        {/* Kartlar */}
        {(yukleniyor || ortakYukleniyor) ? (
          <div className="py-20 text-center text-gray-400 text-sm">Yükleniyor...</div>
        ) : gosterilecek.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="text-5xl">📒</div>
            <p className="text-gray-500 font-medium">
              {aktifSekme === "benim" ? "Henüz tarif eklemediniz." : "Ortak reçete bulunamadı."}
            </p>
            <p className="text-gray-400 text-sm">
              {aktifSekme === "benim" ? "Yıllarca işinize yarayacak tariflerinizi buraya ekleyin." : "Admin henüz ortak reçete eklememiş."}
            </p>
            {aktifSekme === "benim" && (
              <button onClick={handleYeniAc} className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
                + İlk Tarifinizi Ekleyin
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gosterilecek.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{r.ad}</h3>
                    <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">{r.kategori}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {aktifSekme === "ortak" ? (
                      <button onClick={() => handleKopyala(r)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition font-medium whitespace-nowrap">
                        + Defterime Ekle
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleDuzenleAc(r)}
                          className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition">Düzenle</button>
                        <button onClick={() => handleSil(r.id)}
                          className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition">Sil</button>
                      </>
                    )}
                  </div>
                </div>
                {r.aciklama && <p className="text-xs text-gray-500 line-clamp-2">{r.aciklama}</p>}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{r.porsiyon} kişilik baz</span>
                  <button onClick={() => handleDetay(r)}
                    className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition">
                    Malzemeler →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detay Modal */}
      {detayRecete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetayRecete(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{detayRecete.ad}</h2>
                  <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">{detayRecete.kategori}</span>
                </div>
                <button onClick={() => setDetayRecete(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
              </div>
              {detayRecete.aciklama && <p className="text-sm text-gray-500 mt-2">{detayRecete.aciklama}</p>}
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Malzemeler <span className="text-xs text-gray-400 font-normal">({detayRecete.porsiyon} kişilik baz)</span></h3>
                {(detayRecete.malzemeler || []).length === 0 ? (
                  <p className="text-sm text-gray-400">Malzeme eklenmemiş.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Ürün</th>
                        <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Marka</th>
                        <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Miktar/Kişi</th>
                        <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Notlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detayRecete.malzemeler!.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{m.urun_adi}</td>
                          <td className="px-3 py-2 text-gray-500">{m.marka || "—"}</td>
                          <td className="px-3 py-2 text-gray-700">{m.miktar_kisi} {m.birim}</td>
                          <td className="px-3 py-2 text-gray-400 text-xs">{m.notlar || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {detayRecete.hazirlanis && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Hazırlanış</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{detayRecete.hazirlanis}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ekle/Düzenle Modal */}
      {modalAcik && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">{duzenleRecete ? "Tarifi Düzenle" : "Yeni Tarif Ekle"}</h2>
              <button onClick={() => setModalAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Tarif Adı *</label>
                  <input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))}
                    placeholder="örn: Musakka, Mercimek Çorbası..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Kategori</label>
                  <select value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                    {KATEGORILER.filter(k => k !== "Tümü").map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Baz Porsiyon (kişi)</label>
                  <input type="number" min={1} value={form.porsiyon} onChange={e => setForm(p => ({ ...p, porsiyon: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Kısa Açıklama</label>
                  <input value={form.aciklama} onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
                    placeholder="Tarifiniz hakkında kısa bir not..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Hazırlanış Adımları</label>
                  <textarea value={form.hazirlanis} onChange={e => setForm(p => ({ ...p, hazirlanis: e.target.value }))} rows={5}
                    placeholder={"1. Soğanları doğrayın...\n2. Yağda kavurun...\n3. ..."}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                </div>
              </div>

              {/* Malzemeler */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Malzemeler <span className="text-xs text-gray-400 font-normal">— kişi başı miktarlar</span></h3>
                <p className="text-xs text-gray-400 mb-3">Alışveriş listesine eklerken öğrenci sayısıyla otomatik çarpılacak.</p>
                {malzemeler.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {malzemeler.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-sm">
                        <span className="flex-1 font-medium text-gray-800">{m.urun_adi}</span>
                        <span className="text-gray-400 text-xs">{m.marka || "—"}</span>
                        <span className="text-gray-700 font-medium">{m.miktar_kisi} {m.birim}</span>
                        {m.notlar && <span className="text-gray-400 text-xs italic">({m.notlar})</span>}
                        <button onClick={() => handleMalzemeSil(i)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <input value={yeniMalzeme.urun_adi} onChange={e => setYeniMalzeme(p => ({ ...p, urun_adi: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleMalzemeEkle()}
                        placeholder="Ürün adı *"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
                    </div>
                    <div className="col-span-3">
                      <input value={yeniMalzeme.marka} onChange={e => setYeniMalzeme(p => ({ ...p, marka: e.target.value }))}
                        placeholder="Marka"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min={0} step={0.1} value={yeniMalzeme.miktar_kisi || ""}
                        onChange={e => setYeniMalzeme(p => ({ ...p, miktar_kisi: Number(e.target.value) }))}
                        placeholder="Miktar"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
                    </div>
                    <div className="col-span-2">
                      <select value={yeniMalzeme.birim} onChange={e => setYeniMalzeme(p => ({ ...p, birim: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                        {BIRIMLER.map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <button onClick={handleMalzemeEkle}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-base font-bold transition">+</button>
                    </div>
                  </div>
                  <input value={yeniMalzeme.notlar} onChange={e => setYeniMalzeme(p => ({ ...p, notlar: e.target.value }))}
                    placeholder="Not — örn: 'orta boy', 'yağlı', 'taze'"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalAcik(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition">İptal</button>
                <button onClick={handleKaydet} disabled={formYukleniyor}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                  {formYukleniyor ? "Kaydediliyor..." : "Tarif Defterime Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
