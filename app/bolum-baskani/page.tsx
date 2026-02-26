"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";

// Tipler
type Ders = { id: string; kod: string; ad: string };
type Kullanici = { id: number; username: string; ad_soyad: string; role: string; dersler: string[]; password_hash?: string };
type Urun = { id: string; urunAdi: string; marka: string; fiyat: number; olcu: string; kategori: string; market: string; stok: number; kod: string; notlar: string };
type SiparisUrun = { urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type Siparis = { id: string; ogretmenId: number; ogretmenAdi: string; dersId: string; dersAdi: string; hafta: string; urunler: SiparisUrun[]; genelToplam: number; tarih: string; durum: "bekliyor" | "onaylandi" | "teslim_alindi" };
type Etkinlik = { id: string; hafta: number; gun: string; tarih: string; etkinlik: string; renk: string };

// Sabitler
const ROLLER = [
  { value: "ogretmen", label: "Öğretmen" },
  { value: "bolum-baskani", label: "Bölüm Başkanı" },
  { value: "stok", label: "Stok Sorumlusu" },
  { value: "satin", label: "Satın Alma" },
];
const ROL_LABEL: Record<string, string> = { ogretmen: "Öğretmen", "bolum-baskani": "Bölüm Başkanı", stok: "Stok Sorumlusu", satin: "Satın Alma", admin: "Admin" };
const ROL_RENK: Record<string, string> = { ogretmen: "bg-blue-100 text-blue-700", "bolum-baskani": "bg-purple-100 text-purple-700", stok: "bg-amber-100 text-amber-700", satin: "bg-emerald-100 text-emerald-700" };
const DURUM_STIL: Record<string, string> = { bekliyor: "bg-amber-100 text-amber-700 border-amber-200", onaylandi: "bg-blue-100 text-blue-700 border-blue-200", teslim_alindi: "bg-emerald-100 text-emerald-700 border-emerald-200" };
const DURUM_LABEL: Record<string, string> = { bekliyor: "⏳ Bekliyor", onaylandi: "✅ Onaylandı", teslim_alindi: "📦 Teslim Alındı" };
const DURUM_STIL_PANEL: Record<string, { bg: string; text: string; label: string }> = {
  bekliyor:      { bg: "#FEF3C7", text: "#92400E", label: "Bekliyor" },
  onaylandi:     { bg: "#D1FAE5", text: "#065F46", label: "Onaylandı" },
  teslim_alindi: { bg: "#DBEAFE", text: "#1E40AF", label: "Teslim Alındı" },
};
const RENK_MAP: Record<string, { bg: string; text: string }> = {
  kirmizi: { bg: "#FEE2E2", text: "#991B1B" },
  sari:    { bg: "#FEF3C7", text: "#92400E" },
  mavi:    { bg: "#DBEAFE", text: "#1D4ED8" },
  yesil:   { bg: "#D1FAE5", text: "#065F46" },
  mor:     { bg: "#EDE9FE", text: "#5B21B6" },
  turuncu: { bg: "#FFEDD5", text: "#9A3412" },
};
const HAFTALAR = Array.from({ length: 10 }, (_, i) => `${i + 1}. Hafta`);
const OLCU_SEC = ["Kg", "L", "Paket", "Adet", "G", "Ml", "Kutu"];
const BOSH_URUN: Omit<Urun, "id"> = { urunAdi: "", marka: "", fiyat: 0, olcu: "Kg", kategori: "", market: "", stok: 0, kod: "", notlar: "" };

type Sekme = "panel" | "kullanici" | "listeler" | "siparisler" | "urunler";

export default function BolumBaskaniPage() {
  const [adSoyad, setAdSoyad] = useState("");
  const [dersler, setDersler] = useState<Ders[]>([]);
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [ogretmenler, setOgretmenler] = useState<Kullanici[]>([]);
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [etkinlikler, setEtkinlikler] = useState<Etkinlik[]>([]);
  const [aktifSekme, setAktifSekme] = useState<Sekme>("panel");
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);

  // Stats (panel için)
  const [stats, setStats] = useState({ ogretmen: 0, ders: 0, bekleyen: 0, onaylanan: 0, teslim: 0 });

  // Kullanıcı formu
  const [yeniAd, setYeniAd] = useState(""); const [yeniKadi, setYeniKadi] = useState(""); const [yeniSifre, setYeniSifre] = useState(""); const [yeniRol, setYeniRol] = useState("ogretmen");
  const [duzenleKullanici, setDuzenleKullanici] = useState<Kullanici | null>(null);

  // Sipariş filtreleri
  const [sipFiltreHafta, setSipFiltreHafta] = useState("tumu"); const [sipFiltreDurum, setSipFiltreDurum] = useState("tumu"); const [sipDetay, setSipDetay] = useState<Siparis | null>(null);

  // Ürün havuzu
  const [urunForm, setUrunForm] = useState<Omit<Urun, "id">>(BOSH_URUN); const [duzenleUrunId, setDuzenleUrunId] = useState<string | null>(null); const [urunPanel, setUrunPanel] = useState(false);
  const [urunArama, setUrunArama] = useState(""); const [urunKategori, setUrunKategori] = useState("Tümü");
  const dosyaRef = useRef<HTMLInputElement>(null);

  // Liste indirme
  const [listeYukleniyor, setListeYukleniyor] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const id = localStorage.getItem("aktifKullaniciId");
    const [{ data: k }, { data: d }, { data: ku }, { data: s }, { data: u }, { data: e }] = await Promise.all([
      supabase.from("kullanicilar").select("ad_soyad, username").eq("id", id).single(),
      supabase.from("dersler").select("*").order("kod"),
      supabase.from("kullanicilar").select("id, username, ad_soyad, role, dersler").neq("role", "admin"),
      supabase.from("siparisler").select("*").order("tarih", { ascending: false }),
      supabase.from("urunler").select("*").order("urun_adi"),
      supabase.from("etkinlik_takvimi").select("*").eq("aktif", true).order("hafta").limit(5),
    ]);
    setAdSoyad(k?.ad_soyad || k?.username || "");
    setDersler(d || []);
    const tumKullanicilar = ku || [];
    setKullanicilar(tumKullanicilar);
    const ogretmenListesi = tumKullanicilar.filter((x: Kullanici) => x.role === "ogretmen");
    setOgretmenler(ogretmenListesi);

    // Siparişleri doğru şekilde map et
    const sipMap = (s || []).map((x: any) => ({
      id: x.id,
      ogretmenId: x.ogretmen_id,
      ogretmenAdi: x.ogretmen_adi,
      dersId: x.ders_id,
      dersAdi: x.ders_adi,
      hafta: x.hafta,
      urunler: x.urunler || [],
      genelToplam: x.genel_toplam,
      tarih: x.tarih,
      durum: x.durum,
    }));
    setSiparisler(sipMap);

    setUrunler((u || []).map((x: any) => ({ id: x.id, urunAdi: x.urun_adi, marka: x.marka, fiyat: x.fiyat, olcu: x.olcu, kategori: x.kategori, market: x.market, stok: x.stok, kod: x.kod, notlar: x.notlar })));
    setEtkinlikler(e || []);

    // Panel stats
    const bekleyen = sipMap.filter((x: Siparis) => x.durum === "bekliyor").length;
    const onaylanan = sipMap.filter((x: Siparis) => x.durum === "onaylandi").length;
    const teslim = sipMap.filter((x: Siparis) => x.durum === "teslim_alindi").length;
    setStats({
      ogretmen: ogretmenListesi.length,
      ders: (d || []).length,
      bekleyen,
      onaylanan,
      teslim,
    });
  };

  const bildir = (tip: "basari" | "hata", metin: string) => { setBildirim({ tip, metin }); setTimeout(() => setBildirim(null), 3500); };

  // Kullanıcı işlemleri
  const handleKullaniciEkle = async () => {
    if (!yeniKadi || !yeniSifre || !yeniAd) { bildir("hata", "Tüm alanları doldurun."); return; }
    const { data: var_ } = await supabase.from("kullanicilar").select("id").eq("username", yeniKadi).single();
    if (var_) { bildir("hata", "Bu kullanıcı adı zaten kullanılıyor."); return; }
    const { error } = await supabase.from("kullanicilar").insert({ ad_soyad: yeniAd, username: yeniKadi, password_hash: yeniSifre, role: yeniRol, dersler: [] });
    if (error) { bildir("hata", "Hata: " + error.message); return; }
    bildir("basari", `"${yeniAd}" eklendi.`);
    setYeniAd(""); setYeniKadi(""); setYeniSifre(""); setYeniRol("ogretmen");
    fetchAll();
  };

  const handleKullaniciGuncelle = async () => {
    if (!duzenleKullanici) return;
    const { error } = await supabase.from("kullanicilar").update({ ad_soyad: duzenleKullanici.ad_soyad, username: duzenleKullanici.username, role: duzenleKullanici.role, ...(duzenleKullanici.password_hash ? { password_hash: duzenleKullanici.password_hash } : {}) }).eq("id", duzenleKullanici.id);
    if (error) { bildir("hata", "Hata: " + error.message); return; }
    bildir("basari", "Kullanıcı güncellendi."); setDuzenleKullanici(null); fetchAll();
  };

  const handleKullaniciSil = async (id: number, ad: string) => {
    if (!confirm(`"${ad}" kullanıcısını silmek istediğinizden emin misiniz?`)) return;
    await supabase.from("kullanicilar").delete().eq("id", id);
    bildir("basari", "Kullanıcı silindi."); fetchAll();
  };

  // Sipariş işlemleri
  const handleDurumGuncelle = async (id: string, durum: string) => {
    await supabase.from("siparisler").update({ durum }).eq("id", id);
    setSiparisler((prev) => prev.map((s) => s.id === id ? { ...s, durum: durum as Siparis["durum"] } : s));
    if (sipDetay?.id === id) setSipDetay((prev) => prev ? { ...prev, durum: durum as Siparis["durum"] } : null);
  };

  // Ürün işlemleri
  const handleUrunKaydet = async () => {
    if (!urunForm.urunAdi.trim()) { bildir("hata", "Ürün adı boş olamaz."); return; }
    const dbObj = { urun_adi: urunForm.urunAdi, marka: urunForm.marka, fiyat: urunForm.fiyat, olcu: urunForm.olcu, kategori: urunForm.kategori, market: urunForm.market, stok: urunForm.stok, kod: urunForm.kod, notlar: urunForm.notlar };
    if (duzenleUrunId) {
      const { error } = await supabase.from("urunler").update(dbObj).eq("id", duzenleUrunId);
      if (error) { bildir("hata", "Hata: " + error.message); return; }
      bildir("basari", "Ürün güncellendi.");
    } else {
      const { error } = await supabase.from("urunler").insert(dbObj);
      if (error) { bildir("hata", "Hata: " + error.message); return; }
      bildir("basari", "Ürün eklendi.");
    }
    setUrunForm(BOSH_URUN); setDuzenleUrunId(null); setUrunPanel(false); fetchAll();
  };

  const handleUrunSil = async (id: string) => {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
    await supabase.from("urunler").delete().eq("id", id);
    bildir("basari", "Ürün silindi."); fetchAll();
  };

  const handleExcelYukle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0]; if (!dosya) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const satirlar: any[] = XLSX.utils.sheet_to_json(ws);
        const yeni = satirlar.filter((s) => s["Ürün Adı"]).map((s) => ({ urun_adi: String(s["Ürün Adı"] ?? ""), marka: String(s["Marka"] ?? ""), fiyat: Number(s["Fiyat"] ?? 0), olcu: String(s["Ölçü"] ?? "Kg"), kategori: String(s["Kategori"] ?? ""), market: String(s["Market"] ?? ""), stok: Number(s["Stok"] ?? 0), kod: String(s["Kod"] ?? ""), notlar: String(s["Notlar"] ?? "") }));
        const { error } = await supabase.from("urunler").insert(yeni);
        if (error) { bildir("hata", "Hata: " + error.message); return; }
        bildir("basari", `${yeni.length} ürün eklendi.`); fetchAll();
      } catch { bildir("hata", "Excel dosyası okunamadı."); }
    };
    reader.readAsBinaryString(dosya);
    if (dosyaRef.current) dosyaRef.current.value = "";
  };

  // Excel indirme — ders bazlı (alışveriş listesi formatıyla aynı: her hafta ayrı sheet + genel özet)
  const handleListeIndirExcel = async (ogretmenId: number, dersId: string) => {
    const ogretmen = ogretmenler.find((o) => o.id === ogretmenId); if (!ogretmen) return;
    const ders = dersler.find((d) => d.id === dersId); if (!ders) return;
    setListeYukleniyor(true);
    const { data: sipData } = await supabase.from("siparisler").select("*").eq("ogretmen_id", ogretmenId).eq("ders_id", dersId);
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Her hafta için ayrı sheet — alışveriş listesiyle birebir aynı format
    HAFTALAR.forEach((hafta) => {
      const sip = (sipData || []).find((s: any) => s.hafta === hafta);
      const urunlerHafta: any[] = sip?.urunler || [];
      const rows: any[][] = [
        [`${ders.kod} - ${ders.ad} MALZEME TALEP LİSTESİ`, "", "", "", "", "", ""],
        ["", "", "", "", "", "", ""],
        ["Sıra no", "Ürün", "Marka", "Miktar", "Ölçü", "B.Fiyat", "Toplam"],
        ...urunlerHafta.map((u: any, i: number) => [i + 1, u.urunAdi, u.marka, u.miktar, u.olcu, u.birimFiyat, u.toplam]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, hafta);
    });

    // Genel özet sayfası
    const ozetRows: any[][] = [
      [`${ders.kod} - ${ders.ad}`, "", ""],
      [`Öğretmen: ${ogretmen.ad_soyad || ogretmen.username}`, "", ""],
      ["", "", ""],
      ["Hafta", "Ürün Sayısı", "Toplam Tutar (TL)"],
    ];
    let genelToplam = 0;
    HAFTALAR.forEach((hafta) => {
      const sip = (sipData || []).find((s: any) => s.hafta === hafta);
      const hUrunler: any[] = sip?.urunler || [];
      const hToplam = hUrunler.reduce((acc: number, u: any) => acc + (u.toplam || 0), 0);
      genelToplam += hToplam;
      ozetRows.push([hafta, hUrunler.length, hToplam > 0 ? hToplam : 0]);
    });
    ozetRows.push(["", "", ""]);
    ozetRows.push(["GENEL TOPLAM", "", genelToplam]);
    const wsOzet = XLSX.utils.aoa_to_sheet(ozetRows);
    wsOzet["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsOzet, "Genel Özet");

    XLSX.writeFile(wb, `${ders.kod}_${ogretmen.ad_soyad || ogretmen.username}_Liste.xlsx`);
    setListeYukleniyor(false);
  };

  // PDF indirme — ders bazlı (alışveriş listesiyle aynı: HTML print, her hafta ayrı sayfa, toplam satırı)
  const handleListeIndirPdf = async (ogretmenId: number, dersId: string) => {
    const ogretmen = ogretmenler.find((o) => o.id === ogretmenId); if (!ogretmen) return;
    const ders = dersler.find((d) => d.id === dersId); if (!ders) return;
    setListeYukleniyor(true);
    const { data: sipData } = await supabase.from("siparisler").select("*").eq("ogretmen_id", ogretmenId).eq("ders_id", dersId);

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:0}
      .sayfa{page-break-after:always;padding:20px}
      .baslik{text-align:center;font-size:13px;font-weight:bold;border:2px solid #8B0000;padding:10px;margin-bottom:4px;color:#8B0000}
      .alt-baslik{text-align:center;font-size:10px;color:#555;margin-bottom:10px}
      table{width:100%;border-collapse:collapse}
      th{background:#8B0000;color:white;padding:6px 8px;font-size:10px;text-align:left}
      td{padding:5px 8px;border-bottom:1px solid #eee;font-size:10px}
      tr:nth-child(even) td{background:#fafafa}
      .toplam{text-align:right;margin-top:8px;padding:8px 12px;border-top:2px solid #8B0000;font-size:12px;font-weight:bold;color:#8B0000}
      .bos{text-align:center;color:#bbb;padding:20px;font-style:italic}
    </style></head><body>`;

    HAFTALAR.forEach((hafta) => {
      const sip = (sipData || []).find((s: any) => s.hafta === hafta);
      const urunlerHafta: any[] = sip?.urunler || [];
      const haftaToplamTutar = urunlerHafta.reduce((acc, u) => acc + (u.toplam || 0), 0);
      html += `<div class="sayfa">`;
      html += `<div class="baslik">${ders.kod} - ${ders.ad}<br>MALZEME TALEP LİSTESİ - ${hafta}</div>`;
      html += `<div class="alt-baslik">Öğretmen: ${ogretmen.ad_soyad || ogretmen.username}</div>`;
      html += `<table><thead><tr><th>Sıra</th><th>Ürün</th><th>Marka</th><th>Miktar</th><th>Ölçü</th><th style="text-align:right">Toplam</th></tr></thead><tbody>`;
      if (urunlerHafta.length === 0) {
        html += `<tr><td colspan="6" class="bos">Bu hafta için ürün girilmemiş.</td></tr>`;
      } else {
        urunlerHafta.forEach((u, i) => {
          html += `<tr><td>${i + 1}</td><td>${u.urunAdi || ""}</td><td>${u.marka || "—"}</td><td>${u.miktar}</td><td>${u.olcu}</td><td style="text-align:right">${u.toplam > 0 ? u.toplam.toFixed(2) + " ₺" : "—"}</td></tr>`;
        });
      }
      html += `</tbody></table>`;
      if (urunlerHafta.length > 0) {
        html += `<p class="toplam">${hafta} Toplam: ${haftaToplamTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p>`;
      }
      html += `</div>`;
    });
    html += `</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { bildir("hata", "Popup engelleyici açık olabilir."); setListeYukleniyor(false); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
    setListeYukleniyor(false);
  };

  // Genel Rapor PDF — tüm öğretmenler, her birinin dersleri ve 10 hafta toplam tutarı + genel toplam
  const handleGenelRaporPdf = async () => {
    setListeYukleniyor(true);
    // Tüm siparişleri çek
    const { data: tumSiparisler } = await supabase.from("siparisler").select("*");

    // CSS + ortak HTML şablon (mevcut PDF ile aynı stil)
    const stil = `
      body{font-family:Arial,sans-serif;font-size:11px;margin:0;color:#222}
      .sayfa{padding:28px 32px;max-width:800px;margin:0 auto}
      .rapor-baslik{text-align:center;font-size:16px;font-weight:bold;border:2px solid #8B0000;padding:12px 16px;margin-bottom:6px;color:#8B0000;letter-spacing:0.5px}
      .rapor-alt{text-align:center;font-size:10px;color:#888;margin-bottom:20px}
      .hoca-blok{margin-bottom:18px}
      .hoca-adi{font-size:13px;font-weight:bold;color:#1a1a1a;padding:7px 10px;background:#f5f5f5;border-left:4px solid #8B0000;margin-bottom:0}
      .ders-satir{display:flex;justify-content:space-between;align-items:center;padding:5px 10px 5px 20px;border-bottom:1px solid #f0f0f0}
      .ders-adi{font-size:11px;color:#333}
      .ders-kod{display:inline-block;font-size:10px;font-weight:bold;background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:4px;margin-right:6px}
      .ders-tutar{font-size:11px;font-weight:bold;color:#8B0000;white-space:nowrap}
      .ders-bos{font-size:10px;color:#bbb;font-style:italic}
      .hoca-toplam{display:flex;justify-content:flex-end;padding:4px 10px;font-size:11px;color:#555;background:#fafafa;border-bottom:2px solid #e5e5e5}
      .hoca-toplam span{font-weight:bold;color:#333;margin-left:6px}
      .genel-toplam-blok{margin-top:24px;border-top:3px solid #8B0000;padding-top:12px;display:flex;justify-content:space-between;align-items:center}
      .genel-toplam-label{font-size:13px;font-weight:bold;color:#8B0000}
      .genel-toplam-deger{font-size:18px;font-weight:bold;color:#8B0000}
      .tarih{font-size:9px;color:#aaa;margin-top:18px;text-align:right}
    `;

    let genelToplam = 0;
    let hocaBloklar = "";

    for (const ogretmen of ogretmenler) {
      const atananDersIds: string[] = ogretmen.dersler || [];
      if (atananDersIds.length === 0) continue;
      const atananDersList = atananDersIds.map((dId) => dersler.find((d) => d.id === dId)).filter(Boolean) as Ders[];
      if (atananDersList.length === 0) continue;

      let hocaToplam = 0;
      let dersSatirlar = "";

      for (const ders of atananDersList) {
        const dersSiparisler = (tumSiparisler || []).filter((s: any) => s.ogretmen_id === ogretmen.id && s.ders_id === ders.id);
        const dersToplam = dersSiparisler.reduce((acc: number, s: any) => acc + (s.genel_toplam || 0), 0);
        hocaToplam += dersToplam;
        genelToplam += dersToplam;

        const tutarStr = dersToplam > 0
          ? dersToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺"
          : `<span class="ders-bos">Sipariş yok</span>`;

        dersSatirlar += `
          <div class="ders-satir">
            <div class="ders-adi"><span class="ders-kod">${ders.kod}</span>${ders.ad}</div>
            <div class="ders-tutar">${tutarStr}</div>
          </div>`;
      }

      hocaBloklar += `
        <div class="hoca-blok">
          <div class="hoca-adi">${ogretmen.ad_soyad || ogretmen.username}</div>
          ${dersSatirlar}
          <div class="hoca-toplam">Öğretmen Toplamı: <span>${hocaToplam > 0 ? hocaToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺" : "—"}</span></div>
        </div>`;
    }

    const tarih = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${stil}</style></head><body>
      <div class="sayfa">
        <div class="rapor-baslik">MALZEME TALEP LİSTESİ — GENEL RAPOR</div>
        <div class="rapor-alt">2025–2026 Bahar Dönemi · 10 Haftalık Toplam Tutar Özeti</div>
        ${hocaBloklar}
        <div class="genel-toplam-blok">
          <div class="genel-toplam-label">🧾 Genel Toplam (10 Hafta)</div>
          <div class="genel-toplam-deger">${genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
        </div>
        <div class="tarih">Oluşturulma Tarihi: ${tarih}</div>
      </div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) { bildir("hata", "Popup engelleyici açık olabilir."); setListeYukleniyor(false); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
    setListeYukleniyor(false);
  };

  // Hesaplamalar
  const atanmisDersSayisi = dersler.filter((d) => ogretmenler.some((o) => (o.dersler || []).includes(d.id))).length;
  const sipHaftalar = ["tumu", ...Array.from(new Set(siparisler.map((s) => s.hafta))).sort()];
  const filtreliSiparisler = siparisler.filter((s) => (sipFiltreHafta === "tumu" || s.hafta === sipFiltreHafta) && (sipFiltreDurum === "tumu" || s.durum === sipFiltreDurum));
  const bekleyenSayisi = siparisler.filter((s) => s.durum === "bekliyor").length;
  const kategoriler = ["Tümü", ...Array.from(new Set(urunler.map((u) => u.kategori).filter(Boolean))).sort()];
  const filtreliUrunler = urunler.filter((u) => (!urunArama || u.urunAdi.toLowerCase().includes(urunArama.toLowerCase()) || (u.marka || "").toLowerCase().includes(urunArama.toLowerCase())) && (urunKategori === "Tümü" || u.kategori === urunKategori));

  // Selamlama
  const saat = new Date().getHours();
  const selamlama = saat < 12 ? "Günaydın" : saat < 18 ? "İyi günler" : "İyi akşamlar";

  // UI
  const sekmeler: { key: Sekme; label: string; badge?: number }[] = [
    { key: "panel", label: "🏠 Panel" },
    { key: "kullanici", label: "👥 Kullanıcılar" },
    { key: "listeler", label: "📋 Listeler" },
    { key: "siparisler", label: "🛒 Siparişler", badge: bekleyenSayisi },
    { key: "urunler", label: "📦 Ürün Havuzu" },
  ];

  return (
    <DashboardLayout title="Bölüm Başkanı Paneli" subtitle="Tüm yönetim araçları">
      <div className="max-w-6xl space-y-5">
        {bildirim && (
          <div className={`text-sm rounded-xl px-4 py-3 border font-medium ${bildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>{bildirim.metin}</div>
        )}

        {/* Karşılama */}
        <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #7F1212 0%, #B71C1C 100%)" }}>
          <div className="absolute right-6 top-0 bottom-0 flex items-center opacity-10 text-9xl font-black select-none">IRU</div>
          <p className="text-white/60 text-sm">{selamlama},</p>
          <h2 className="text-2xl font-black mt-0.5">{adSoyad}</h2>
          <p className="text-white/50 text-xs mt-2">
            Bölüm Başkanı · {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
          {sekmeler.map((s) => (
            <button key={s.key} onClick={() => setAktifSekme(s.key)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2 ${aktifSekme === s.key ? "bg-white text-red-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {s.label}
              {s.badge ? <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{s.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* ─── PANEL ─── */}
        {aktifSekme === "panel" && (
          <div className="space-y-5">
            {/* İstatistikler */}
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "Öğretmen",  val: stats.ogretmen,  icon: "👨‍🏫", renk: "#2563EB", bg: "#EFF6FF" },
                { label: "Ders",      val: stats.ders,      icon: "📚",   renk: "#16A34A", bg: "#F0FDF4" },
                { label: "Bekleyen",  val: stats.bekleyen,  icon: "⏳",   renk: "#D97706", bg: "#FFFBEB" },
                { label: "Onaylanan", val: stats.onaylanan, icon: "✅",   renk: "#059669", bg: "#ECFDF5" },
                { label: "Teslim",    val: stats.teslim,    icon: "📦",   renk: "#7C3AED", bg: "#F5F3FF" },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl border border-zinc-100 p-4 text-center" style={{ background: k.bg }}>
                  <div className="text-xl mb-1">{k.icon}</div>
                  <p className="text-2xl font-black" style={{ color: k.renk }}>{k.val}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Son Siparişler */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-bold text-zinc-800">Son Siparişler</h3>
                  <button onClick={() => setAktifSekme("siparisler")} className="text-xs font-semibold text-red-700 hover:underline">Tümünü Gör</button>
                </div>
                <div className="divide-y divide-zinc-50">
                  {siparisler.length === 0 ? (
                    <p className="px-5 py-8 text-center text-zinc-400 text-sm">Henüz sipariş yok</p>
                  ) : siparisler.slice(0, 6).map((s) => {
                    const d = DURUM_STIL_PANEL[s.durum] || DURUM_STIL_PANEL.bekliyor;
                    return (
                      <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate">{s.ogretmenAdi}</p>
                          <p className="text-xs text-zinc-400 truncate">{s.dersAdi} · {s.hafta}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-zinc-600">{Number(s.genelToplam || 0).toFixed(2)} ₺</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: d.bg, color: d.text }}>{d.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Etkinlik Takvimi */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <h3 className="font-bold text-zinc-800">Etkinlik Takvimi</h3>
                  <Link href="/etkinlik-takvimi" className="text-xs font-semibold text-red-700 hover:underline">Takvime Git</Link>
                </div>
                <div className="divide-y divide-zinc-50">
                  {etkinlikler.length === 0 ? (
                    <p className="px-5 py-8 text-center text-zinc-400 text-sm">Etkinlik bulunmuyor</p>
                  ) : etkinlikler.map((e) => {
                    const r = RENK_MAP[e.renk] || RENK_MAP.mavi;
                    return (
                      <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-xs font-bold" style={{ background: r.bg, color: r.text }}>
                          <span>{e.hafta}.</span>
                          <span>Hft</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate">{e.etkinlik}</p>
                          <p className="text-xs text-zinc-400">{e.gun} · {e.tarih}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Hızlı Erişim */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Hızlı Erişim</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Ders Programı",    icon: "📋", link: "/ders-programi",                       renk: "#2563EB", bg: "#EFF6FF" },
                  { label: "Etkinlik Takvimi", icon: "📅", link: "/etkinlik-takvimi",                    renk: "#7C3AED", bg: "#F5F3FF" },
                  { label: "Siparişler",        icon: "🛒", link: undefined,                              renk: "#059669", bg: "#ECFDF5", sekme: "siparisler" as Sekme },
                  { label: "Envanter Sayım",   icon: "🔧", link: "/bolum-baskani/envanter-sayim",        renk: "#B71C1C", bg: "#FEF2F2" },
                ].map((h) =>
                  h.link ? (
                    <Link key={h.link} href={h.link}>
                      <div className="rounded-2xl border border-zinc-100 p-4 text-center hover:shadow-md transition" style={{ background: h.bg }}>
                        <div className="text-2xl mb-2">{h.icon}</div>
                        <p className="text-sm font-bold" style={{ color: h.renk }}>{h.label}</p>
                      </div>
                    </Link>
                  ) : (
                    <button key={h.label} onClick={() => h.sekme && setAktifSekme(h.sekme)} className="w-full text-left">
                      <div className="rounded-2xl border border-zinc-100 p-4 text-center hover:shadow-md transition" style={{ background: h.bg }}>
                        <div className="text-2xl mb-2">{h.icon}</div>
                        <p className="text-sm font-bold" style={{ color: h.renk }}>{h.label}</p>
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── KULLANICILAR ─── */}
        {aktifSekme === "kullanici" && (
          <div className="space-y-5">
            {/* Ekle formu */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-gray-800">Yeni Kullanıcı Ekle</h2>
              <div className="grid grid-cols-2 gap-4">
                {[{ label: "Ad Soyad", val: yeniAd, set: setYeniAd, ph: "Ad Soyad" }, { label: "Kullanıcı Adı", val: yeniKadi, set: setYeniKadi, ph: "kullanici_adi" }, { label: "Şifre", val: yeniSifre, set: setYeniSifre, ph: "Şifre" }].map((f) => (
                  <div key={f.label}>
                    <label className="text-xs font-medium text-gray-700 block mb-1">{f.label}</label>
                    <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Rol</label>
                  <select value={yeniRol} onChange={(e) => setYeniRol(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                    {ROLLER.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleKullaniciEkle} className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition text-sm">+ Kullanıcı Ekle</button>
            </div>

            {/* Kullanıcı listesi */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">Mevcut Kullanıcılar ({kullanicilar.length})</h2></div>
              <div className="divide-y divide-gray-50">
                {kullanicilar.map((k) => (
                  <div key={k.id} className="px-6 py-4">
                    {duzenleKullanici?.id === k.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input value={duzenleKullanici.ad_soyad} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, ad_soyad: e.target.value })} placeholder="Ad Soyad" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                          <input value={duzenleKullanici.username} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, username: e.target.value })} placeholder="Kullanıcı adı" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                          <input type="password" placeholder="Yeni şifre (boş bırakılabilir)" onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, password_hash: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                          <select value={duzenleKullanici.role} onChange={(e) => setDuzenleKullanici({ ...duzenleKullanici, role: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                            {ROLLER.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleKullaniciGuncelle} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition">Kaydet</button>
                          <button onClick={() => setDuzenleKullanici(null)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-4 py-2 rounded-lg transition">İptal</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{k.ad_soyad || k.username}</p>
                          <p className="text-xs text-gray-400">@{k.username}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROL_RENK[k.role] || "bg-gray-100 text-gray-600"}`}>{ROL_LABEL[k.role] || k.role}</span>
                          <button onClick={() => setDuzenleKullanici(k)} className="text-xs text-blue-600 hover:underline font-medium">Düzenle</button>
                          <button onClick={() => handleKullaniciSil(k.id, k.ad_soyad || k.username)} className="text-xs text-red-500 hover:underline font-medium">Sil</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LISTELER */}
        {aktifSekme === "listeler" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">Öğretmen Bazlı Liste İndir</h2>
                  <p className="text-xs text-gray-400 mt-1">Her ders için ayrı ayrı Excel (10 hafta + özet) veya PDF (her hafta ayrı sayfa) indir</p>
                </div>
                <button
                  onClick={handleGenelRaporPdf}
                  disabled={listeYukleniyor || ogretmenler.length === 0}
                  className="flex items-center gap-2 text-sm bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl transition shrink-0"
                >
                  <span>🧾</span> Genel Rapor PDF
                </button>
              </div>
              {ogretmenler.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-sm">Henüz öğretmen bulunmuyor.</div>
              ) : ogretmenler.map((o) => {
                const atananDersIds: string[] = o.dersler || [];
                const atananDersList = atananDersIds.map((dId) => dersler.find((d) => d.id === dId)).filter(Boolean) as Ders[];
                return (
                  <div key={o.id} className="border-b border-gray-50 last:border-0">
                    <div className="px-6 py-4 bg-gray-50/50 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{o.ad_soyad || o.username}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {atananDersList.length > 0
                            ? `${atananDersList.length} ders · ${atananDersList.map((d) => d.kod).join(", ")}`
                            : "Ders atanmamış"}
                        </p>
                      </div>
                    </div>
                    {atananDersList.length > 0 && (
                      <div className="divide-y divide-gray-50">
                        {atananDersList.map((ders) => (
                          <div key={ders.id} className="px-6 py-3 pl-10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-md">{ders.kod}</span>
                              <span className="text-sm text-gray-700">{ders.ad}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleListeIndirExcel(o.id, ders.id)}
                                disabled={listeYukleniyor}
                                className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-xl transition"
                              >
                                <span>📊</span> Excel
                              </button>
                              <button
                                onClick={() => handleListeIndirPdf(o.id, ders.id)}
                                disabled={listeYukleniyor}
                                className="flex items-center gap-1.5 text-sm bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-xl transition"
                              >
                                <span>📄</span> PDF
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── SİPARİŞLER ─── */}
        {aktifSekme === "siparisler" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Hafta</label>
                <select value={sipFiltreHafta} onChange={(e) => setSipFiltreHafta(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                  {sipHaftalar.map((h) => <option key={h} value={h}>{h === "tumu" ? "Tüm Haftalar" : h}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Durum</label>
                <select value={sipFiltreDurum} onChange={(e) => setSipFiltreDurum(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="tumu">Tüm Durumlar</option>
                  <option value="bekliyor">⏳ Bekliyor</option>
                  <option value="onaylandi">✅ Onaylandı</option>
                  <option value="teslim_alindi">📦 Teslim Alındı</option>
                </select>
              </div>
              <div className="ml-auto text-xs text-gray-400">{filtreliSiparisler.length} sipariş</div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {filtreliSiparisler.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 text-sm">
                    {siparisler.length === 0 ? "Henüz sipariş yok." : "Bu filtreye uygun sipariş bulunamadı."}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-left">
                        {["ÖĞRETMEN", "DERS", "HAFTA", "DURUM", "İŞLEM"].map((h) => <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtreliSiparisler.map((s) => (
                        <tr key={s.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${sipDetay?.id === s.id ? "bg-blue-50" : ""}`} onClick={() => setSipDetay(sipDetay?.id === s.id ? null : s)}>
                          <td className="px-4 py-3 font-medium text-gray-800">{s.ogretmenAdi}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{s.dersAdi}</td>
                          <td className="px-4 py-3 text-gray-500">{s.hafta}</td>
                          <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full border ${DURUM_STIL[s.durum]}`}>{DURUM_LABEL[s.durum]}</span></td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              {s.durum === "bekliyor" && <button onClick={() => handleDurumGuncelle(s.id, "onaylandi")} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 py-1.5 rounded-lg transition">Onayla</button>}
                              {s.durum === "onaylandi" && <button onClick={() => handleDurumGuncelle(s.id, "teslim_alindi")} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1.5 rounded-lg transition">Teslim</button>}
                              {s.durum !== "bekliyor" && <button onClick={() => handleDurumGuncelle(s.id, "bekliyor")} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-2.5 py-1.5 rounded-lg transition">Geri Al</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {sipDetay && (
                <div className="w-72 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3 self-start sticky top-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm">Sipariş Detayı</h3>
                    <button onClick={() => setSipDetay(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p><span className="font-medium text-gray-700">Öğretmen:</span> {sipDetay.ogretmenAdi}</p>
                    <p><span className="font-medium text-gray-700">Ders:</span> {sipDetay.dersAdi}</p>
                    <p><span className="font-medium text-gray-700">Hafta:</span> {sipDetay.hafta}</p>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${DURUM_STIL[sipDetay.durum]}`}>{DURUM_LABEL[sipDetay.durum]}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {(sipDetay.urunler || []).length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Ürün listesi bulunamadı.</p>
                    ) : sipDetay.urunler.map((u, i) => (
                      <div key={i} className="py-2">
                        <p className="text-xs font-medium text-gray-800">{u.urunAdi}</p>
                        <p className="text-xs text-gray-400">{u.miktar} {u.olcu} · {u.toplam > 0 ? `₺${u.toplam.toFixed(2)}` : "—"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-xs font-bold text-gray-800">Toplam: {sipDetay.genelToplam > 0 ? `₺${sipDetay.genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ÜRÜN HAVUZU ─── */}
        {aktifSekme === "urunler" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
              <input value={urunArama} onChange={(e) => setUrunArama(e.target.value)} placeholder="Ürün adı veya marka ara..."
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-red-500" />
              <select value={urunKategori} onChange={(e) => setUrunKategori(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                {kategoriler.map((k) => <option key={k}>{k}</option>)}
              </select>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1.5 font-medium">{filtreliUrunler.length} / {urunler.length} ürün</span>
              <button onClick={() => { setUrunForm(BOSH_URUN); setDuzenleUrunId(null); setUrunPanel(true); }} className="bg-red-700 hover:bg-red-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition">+ Yeni Ürün</button>
              <label className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition cursor-pointer">
                Excel'den Yükle <input ref={dosyaRef} type="file" accept=".xlsx,.xls" onChange={handleExcelYukle} className="hidden" />
              </label>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {filtreliUrunler.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 text-sm">{urunler.length === 0 ? "Henüz ürün yok." : "Ürün bulunamadı."}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-left">
                          {["Ürün Adı", "Marka", "Fiyat", "Ölçü", "Kategori", "Stok", ""].map((h) => <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtreliUrunler.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { const { id, ...rest } = u; setUrunForm(rest); setDuzenleUrunId(id); setUrunPanel(true); }}>
                            <td className="px-4 py-3 font-medium text-gray-800">{u.urunAdi}</td>
                            <td className="px-4 py-3 text-gray-500">{u.marka || "—"}</td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{u.fiyat > 0 ? `₺${u.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}</td>
                            <td className="px-4 py-3 text-gray-500">{u.olcu}</td>
                            <td className="px-4 py-3">{u.kategori ? <span className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full border border-red-100">{u.kategori}</span> : "—"}</td>
                            <td className="px-4 py-3"><span className={`text-xs font-medium ${u.stok > 0 ? "text-emerald-600" : "text-gray-400"}`}>{u.stok}</span></td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleUrunSil(u.id)} className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline transition">Sil</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {urunPanel && (
                <div className="w-72 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3 self-start sticky top-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm">{duzenleUrunId ? "Ürün Düzenle" : "Yeni Ürün"}</h3>
                    <button onClick={() => { setUrunPanel(false); setDuzenleUrunId(null); setUrunForm(BOSH_URUN); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                  </div>
                  {[{ label: "Ürün Adı *", key: "urunAdi", type: "text" }, { label: "Marka", key: "marka", type: "text" }, { label: "Fiyat (₺)", key: "fiyat", type: "number" }, { label: "Kategori", key: "kategori", type: "text" }, { label: "Market", key: "market", type: "text" }, { label: "Stok", key: "stok", type: "number" }, { label: "Kod", key: "kod", type: "text" }, { label: "Notlar", key: "notlar", type: "text" }].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-gray-700 block mb-1">{label}</label>
                      <input type={type} value={(urunForm as any)[key]} onChange={(e) => setUrunForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" min={type === "number" ? 0 : undefined} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Ölçü</label>
                    <select value={urunForm.olcu} onChange={(e) => setUrunForm((f) => ({ ...f, olcu: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                      {OLCU_SEC.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleUrunKaydet} className="flex-1 bg-red-700 hover:bg-red-800 text-white text-sm font-medium py-2.5 rounded-xl transition">{duzenleUrunId ? "Güncelle" : "Ekle"}</button>
                    <button onClick={() => { setUrunForm(BOSH_URUN); setDuzenleUrunId(null); }} className="px-4 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Temizle</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}