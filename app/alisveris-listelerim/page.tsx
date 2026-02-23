"use client";

import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";

import { supabase } from "@/lib/supabase";

type Urun = { id: string; urunAdi: string; marka: string; fiyat: number; olcu: string; kategori: string; stok: number };
type Ders = { id: string; kod: string; ad: string };
type HaftaUrun = { urunId: string; urunAdi: string; marka: string; miktar: number; olcu: string; birimFiyat: number; toplam: number };
type DersListesi = { dersId: string; dersAdi: string; dersKodu: string; ogretmenAdi: string; olusturmaTarihi: string; haftalar: Record<string, HaftaUrun[]> };
type Recete = { id: string; ad: string; kategori: string; porsiyon: number };
type ReceteMalzeme = { urun_adi: string; marka: string; birim: string; miktar_kisi: number };

const HAFTALAR = Array.from({ length: 10 }, (_, i) => `${i + 1}. Hafta`);

export default function AlisverisListeleriPage() {
  const { yetkili, yukleniyor } = useAuth("/alisveris-listelerim");
  if (yukleniyor) return <div className="min-h-screen flex items-center justify-center text-gray-400">Yükleniyor...</div>;
  if (!yetkili) return null;

  const [kullaniciId, setKullaniciId] = useState<number | null>(null);
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [atananDersler, setAtananDersler] = useState<Ders[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [secilenDers, setSecilenDers] = useState("");
  const [secilenHafta, setSecilenHafta] = useState("1. Hafta");
  const [aramaMetni, setAramaMetni] = useState("");
  const [liste, setListe] = useState<Record<string, number>>({});
  const [kgInputler, setKgInputler] = useState<Record<string, string>>({});
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [dersListeleri, setDersListeleri] = useState<Record<string, DersListesi>>({});
  const [aktifSekme, setAktifSekme] = useState<"liste-olustur" | "listelerim">("liste-olustur");
  const [yuklemeDosyasi, setYuklemeDosyasi] = useState<File | null>(null);
  const [dersSablonDosyasi, setDersSablonDosyasi] = useState<Record<string, File>>({});
  const [sablonYukleniyor, setSablonYukleniyor] = useState<Record<string, boolean>>({});
  const sablonInputRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Reçete modalı
  const [receteModalAcik, setReceteModalAcik] = useState(false);
  const [receteler, setReceteler] = useState<Recete[]>([]);
  const [secilenReceteId, setSecilenReceteId] = useState("");
  const [ogrenciSayisi, setOgrenciSayisi] = useState(1);
  const [receteYukleniyor, setReceteYukleniyor] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const id = localStorage.getItem("aktifKullaniciId");
      if (!id) return;
      setKullaniciId(Number(id));
      const { data: k } = await supabase.from("kullanicilar").select("ad_soyad, username, dersler").eq("id", id).single();
      if (!k) return;
      setKullaniciAdi(k.ad_soyad || k.username);
      const { data: tumDersler } = await supabase.from("dersler").select("*").order("kod");
      const atanan = (tumDersler || []).filter((d: Ders) => (k.dersler || []).includes(d.id));
      setAtananDersler(atanan);
      const { data: urunData } = await supabase.from("urunler").select("*");
      setUrunler((urunData || []).map((u: any) => ({
      id: u.id, urunAdi: u.urun_adi, marka: u.marka, fiyat: u.fiyat, olcu: u.olcu, kategori: u.kategori, stok: u.stok ?? 0,
      })).sort((a, b) => a.urunAdi.localeCompare(b.urunAdi, "tr")));
      const { data: siparisler } = await supabase.from("siparisler").select("*").eq("ogretmen_id", id);
      const listeler: Record<string, DersListesi> = {};
      (siparisler || []).forEach((s: any) => {
        if (!listeler[s.ders_id]) {
          listeler[s.ders_id] = {
            dersId: s.ders_id, dersAdi: s.ders_adi, dersKodu: s.ders_adi?.split(" - ")[0] || "",
            ogretmenAdi: s.ogretmen_adi, olusturmaTarihi: s.tarih, haftalar: {},
          };
        }
        listeler[s.ders_id].haftalar[s.hafta] = s.urunler || [];
      });
      setDersListeleri(listeler);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!secilenDers || !dersListeleri[secilenDers]) {
      setListe({});
      setKgInputler({});
      return;
    }
    const hafta = dersListeleri[secilenDers].haftalar[secilenHafta] || [];
    const mevcutMap = Object.fromEntries(hafta.map((u) => [u.urunId, u.miktar]));
    setListe(mevcutMap);
    setKgInputler({});
  }, [secilenDers, secilenHafta, dersListeleri]);

  const bildirimGoster = (tip: "basari" | "hata", metin: string) => {
    setBildirim({ tip, metin });
    setTimeout(() => setBildirim(null), 3500);
  };

  const secilenDersObj = atananDersler.find((d) => d.id === secilenDers);

  const filtreliUrunler = urunler.filter((u) =>
    !aramaMetni || u.urunAdi.toLowerCase().includes(aramaMetni.toLowerCase()) || u.marka.toLowerCase().includes(aramaMetni.toLowerCase())
  );

  const olcuBilgisi = (olcu: string) => {
    const tip = olcu.toLowerCase();
    if (tip === "kg" || tip === "l")  return { serbest: true,  baslangic: 0,  adim: 0  };
    if (tip === "g"  || tip === "ml") return { serbest: false, baslangic: 50, adim: 50 };
    return                                   { serbest: false, baslangic: 1,  adim: 1  };
  };

  const handleCheckbox = (urun: Urun, isaretli: boolean) => {
    if (isaretli) {
      const { baslangic } = olcuBilgisi(urun.olcu);
      setListe((prev) => ({ ...prev, [urun.id]: baslangic }));
      if (olcuBilgisi(urun.olcu).serbest) {
        setKgInputler((prev) => ({ ...prev, [urun.id]: "" }));
      }
    } else {
      setListe((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
      setKgInputler((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
    }
  };

  const handleKgInput = (urunId: string, value: string) => {
    if (validateFloatInput(value)) {
      setKgInputler(prev => ({ ...prev, [urunId]: value }));
      const normalized = value.replace(',', '.');
      const numValue = parseFloat(normalized);
      setListe(prev => ({ ...prev, [urunId]: numValue }));
    } else {
      console.warn('Invalid float input for kilograms');
    }
  };

  const validateFloatInput = (value: string): boolean => {
    // Replace comma with dot for parsing, as per Turkish locale
    const normalized = value.replace(',', '.');
    const num = parseFloat(normalized);
    return !isNaN(num) && isFinite(num) && num >= 0; // Allow positive floats or zero
  };

  const handleArttir = (urun: Urun) => {
    const { adim, baslangic } = olcuBilgisi(urun.olcu);
    const mevcut = liste[urun.id] || baslangic;
    setListe((prev) => ({ ...prev, [urun.id]: Math.round((mevcut + adim) * 1000) / 1000 }));
  };

  const handleAzalt = (urun: Urun) => {
    const { adim, baslangic } = olcuBilgisi(urun.olcu);
    const mevcut = liste[urun.id] || baslangic;
    const yeni = Math.round((mevcut - adim) * 1000) / 1000;
    if (yeni <= 0) {
      setListe((prev) => { const y = { ...prev }; delete y[urun.id]; return y; });
    } else {
      setListe((prev) => ({ ...prev, [urun.id]: yeni }));
    }
  };

  const handleDirektMiktar = (urunId: string, miktar: number) => {
    const rounded = Math.round(miktar * 1000) / 1000;
    if (rounded <= 0) setListe((prev) => { const y = { ...prev }; delete y[urunId]; return y; });
    else setListe((prev) => ({ ...prev, [urunId]: rounded }));
  };

  const secilenUrunListesi: HaftaUrun[] = Object.entries(liste)
    .filter(([, miktar]) => miktar > 0)
    .map(([urunId, miktar]) => {
      const u = urunler.find((x) => x.id === urunId)!;
      if (!u) return null;
      return { urunId, urunAdi: u.urunAdi, marka: u.marka, miktar, olcu: u.olcu, birimFiyat: u.fiyat, toplam: u.fiyat * miktar };
    })
    .filter(Boolean) as HaftaUrun[];

  const haftaToplam = secilenUrunListesi.reduce((acc, u) => acc + u.toplam, 0);

  // ── Reçeteden Ekle ────────────────────────────────────────────────────────
  const handleReceteModalAc = async () => {
    if (!secilenDers) { bildirimGoster("hata", "Önce ders seçin."); return; }
    if (receteler.length === 0) {
      const { data } = await supabase.from("receteler").select("id, ad, kategori, porsiyon").eq("aktif", true).order("ad");
      setReceteler(data || []);
    }
    setSecilenReceteId("");
    setOgrenciSayisi(1);
    setReceteModalAcik(true);
  };

  const handleReceteUygula = async () => {
    if (!secilenReceteId) { bildirimGoster("hata", "Reçete seçin."); return; }
    if (ogrenciSayisi < 1) { bildirimGoster("hata", "Öğrenci sayısı en az 1 olmalı."); return; }
    setReceteYukleniyor(true);

    const { data: malzemeler } = await supabase
      .from("recete_malzemeleri")
      .select("*")
      .eq("recete_id", secilenReceteId);

    if (!malzemeler || malzemeler.length === 0) {
      bildirimGoster("hata", "Bu reçetede malzeme tanımlanmamış.");
      setReceteYukleniyor(false);
      return;
    }

    // Her malzeme için ürün havuzunda eşleştir
    const yeniListe = { ...liste };
    let eslesilenSayisi = 0;

    for (const malzeme of malzemeler as ReceteMalzeme[]) {
      const toplam = Math.round(malzeme.miktar_kisi * ogrenciSayisi * 1000) / 1000;
      // Ürün havuzunda isim veya marka ile eşleştir
      const eslesenUrun = urunler.find(u =>
        u.urunAdi.toLowerCase().includes(malzeme.urun_adi.toLowerCase()) ||
        malzeme.urun_adi.toLowerCase().includes(u.urunAdi.toLowerCase())
      );
      if (eslesenUrun) {
        yeniListe[eslesenUrun.id] = (yeniListe[eslesenUrun.id] || 0) + toplam;
        eslesilenSayisi++;
      }
    }

    setListe(yeniListe);
    setReceteModalAcik(false);
    setReceteYukleniyor(false);
    bildirimGoster("basari", `${eslesilenSayisi}/${malzemeler.length} malzeme listeye eklendi. Eşleşmeyenler manuel eklenebilir.`);
  };

  const handleHaftaKaydet = async () => {
    if (!secilenDers) { bildirimGoster("hata", "Lutfen ders secin."); return; }
    if (secilenUrunListesi.length === 0) { bildirimGoster("hata", "En az bir urun secin."); return; }
    if (!kullaniciId || !secilenDersObj) return;

    const { data: mevcut } = await supabase.from("siparisler").select("id")
      .eq("ogretmen_id", kullaniciId).eq("ders_id", secilenDers).eq("hafta", secilenHafta).single();

    if (mevcut) {
      await supabase.from("siparisler").update({ urunler: secilenUrunListesi, genel_toplam: haftaToplam }).eq("id", mevcut.id);
    } else {
      await supabase.from("siparisler").insert({
        ogretmen_id: kullaniciId, ogretmen_adi: kullaniciAdi,
        ders_id: secilenDers, ders_adi: `${secilenDersObj.kod} - ${secilenDersObj.ad}`,
        hafta: secilenHafta, urunler: secilenUrunListesi, genel_toplam: haftaToplam,
        tarih: new Date().toLocaleDateString("tr-TR"), durum: "bekliyor",
      });
    }

    setDersListeleri((prev) => ({
      ...prev,
      [secilenDers]: {
        ...(prev[secilenDers] || { dersId: secilenDers, dersAdi: secilenDersObj.ad, dersKodu: secilenDersObj.kod, ogretmenAdi: kullaniciAdi, olusturmaTarihi: new Date().toLocaleDateString("tr-TR"), haftalar: {} }),
        haftalar: { ...(prev[secilenDers]?.haftalar || {}), [secilenHafta]: secilenUrunListesi },
      },
    }));

    bildirimGoster("basari", `${secilenHafta} listesi kaydedildi!`);
  };

  const handleExcelIndir = async (dersId: string) => {
    const dl = dersListeleri[dersId];
    if (!dl) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    HAFTALAR.forEach((hafta) => {
      const urunlerHafta = dl.haftalar[hafta] || [];
      const rows: any[][] = [
        [`${dl.dersKodu} - ${dl.dersAdi} MALZEME TALEP LISTESI`, "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["Sira no", "Urun", "Marka", "Miktar", "Olcu", "B.Fiyat", "Toplam"],
        ...urunlerHafta.map((u, i) => [i + 1, u.urunAdi, u.marka, u.miktar, u.olcu, u.birimFiyat, u.toplam]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, hafta);
    });
    const ozetRows: any[][] = [
      [`${dl.dersKodu} - ${dl.dersAdi}`, "", ""],
      [`Ogretmen: ${dl.ogretmenAdi}`, "", ""],
      ["", "", ""],
      ["Hafta", "Urun Sayisi", "Toplam Tutar (TL)"],
    ];
    let genelToplam = 0;
    HAFTALAR.forEach((hafta) => {
      const hUrunler = dl.haftalar[hafta] || [];
      const hToplam = hUrunler.reduce((acc, u) => acc + u.toplam, 0);
      genelToplam += hToplam;
      ozetRows.push([hafta, hUrunler.length, hToplam > 0 ? hToplam : 0]);
    });
    ozetRows.push(["", "", ""]);
    ozetRows.push(["GENEL TOPLAM", "", genelToplam]);
    const wsOzet = XLSX.utils.aoa_to_sheet(ozetRows);
    wsOzet["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsOzet, "Genel Ozet");
    XLSX.writeFile(wb, `${dl.dersKodu}_Malzeme_Talep_Listesi.xlsx`);
  };

  const handlePdfIndir = (dersId: string) => {
    const dl = dersListeleri[dersId];
    if (!dl) return;
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:11px}.sayfa{page-break-after:always;padding:20px}.baslik{text-align:center;font-size:13px;font-weight:bold;border:2px solid #8B0000;padding:10px;margin-bottom:8px}table{width:100%;border-collapse:collapse}th{background:#8B0000;color:white;padding:6px 8px;font-size:10px}td{padding:5px 8px;border-bottom:1px solid #eee;font-size:10px}</style></head><body>`;
    HAFTALAR.forEach((hafta) => {
      const urunlerHafta = dl.haftalar[hafta] || [];
      html += `<div class="sayfa"><div class="baslik">${dl.dersKodu} - ${dl.dersAdi}<br>MALZEME TALEP LISTESI - ${hafta}</div><table><thead><tr><th>Sira</th><th>Urun</th><th>Marka</th><th>Miktar</th><th>Olcu</th><th>Toplam</th></tr></thead><tbody>`;
      if (urunlerHafta.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center;color:#999;">Bu hafta icin urun girilmemis.</td></tr>`;
      } else {
        urunlerHafta.forEach((u, i) => {
          html += `<tr><td>${i + 1}</td><td>${u.urunAdi}</td><td>${u.marka || "-"}</td><td>${u.miktar}</td><td>${u.olcu}</td><td>${u.toplam > 0 ? u.toplam.toFixed(2) + " TL" : "-"}</td></tr>`;
        });
      }
      html += `</tbody></table></div>`;
    });
    html += `</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  // ── Şablon indir ──────────────────────────────────────────────────────────
  const handleSablonIndir = async (dersId: string) => {
    const ders = atananDersler.find((d) => d.id === dersId);
    if (!ders) return;

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    HAFTALAR.forEach((hafta) => {
      const ornekSatirlar = [
        // başlık satırı
        ["urunId", "urunAdi", "marka", "miktar", "olcu", "birimFiyat", "toplam"],
        // örnek satır 1
        ["", "Domates", "Pınar", 2, "kg", 15, 30],
        // örnek satır 2
        ["", "Zeytinyağı", "Komili", 500, "ml", 0.05, 25],
      ];
      const ws = XLSX.utils.aoa_to_sheet(ornekSatirlar);
      ws["!cols"] = [
        { wch: 10 }, { wch: 30 }, { wch: 20 },
        { wch: 10 }, { wch: 8  }, { wch: 12 }, { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, hafta);
    });

    XLSX.writeFile(wb, `${ders.kod}_Sablon.xlsx`);
  };

  // ── Şablon yükle ──────────────────────────────────────────────────────────
  const handleSablonYukle = async (dersId: string, dosya: File) => {
    const ders = atananDersler.find((d) => d.id === dersId);
    if (!ders || !kullaniciId) return;

    setSablonYukleniyor((prev) => ({ ...prev, [dersId]: true }));
    try {
      const buffer = await dosya.arrayBuffer();
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "array" });

      for (const hafta of HAFTALAR) {
        const ws = wb.Sheets[hafta];
        if (!ws) continue;

        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // İlk satır başlık, geri kalanlar veri
        const veriSatirlari = rows.slice(1).filter((r) => r[1]); // urunAdi zorunlu

        if (veriSatirlari.length === 0) continue;

        const urunListesi: HaftaUrun[] = veriSatirlari.map((r) => {
          const miktar  = parseFloat(String(r[3]).replace(",", ".")) || 0;
          const birimFiyat = parseFloat(String(r[5]).replace(",", ".")) || 0;
          return {
            urunId    : String(r[0] || ""),
            urunAdi   : String(r[1] || ""),
            marka     : String(r[2] || ""),
            miktar,
            olcu      : String(r[4] || ""),
            birimFiyat,
            toplam    : parseFloat((miktar * birimFiyat).toFixed(2)),
          };
        });

        const haftaToplami = urunListesi.reduce((a, u) => a + u.toplam, 0);

        // Mevcut kaydı kontrol et
        const { data: mevcut } = await supabase
          .from("siparisler").select("id")
          .eq("ogretmen_id", kullaniciId)
          .eq("ders_id", dersId)
          .eq("hafta", hafta)
          .single();

        if (mevcut) {
          await supabase.from("siparisler")
            .update({ urunler: urunListesi, genel_toplam: haftaToplami })
            .eq("id", mevcut.id);
        } else {
          await supabase.from("siparisler").insert({
            ogretmen_id  : kullaniciId,
            ogretmen_adi : kullaniciAdi,
            ders_id      : dersId,
            ders_adi     : `${ders.kod} - ${ders.ad}`,
            hafta,
            urunler      : urunListesi,
            genel_toplam : haftaToplami,
            tarih        : new Date().toLocaleDateString("tr-TR"),
            durum        : "bekliyor",
          });
        }

        // Yerel state güncelle
        setDersListeleri((prev) => ({
          ...prev,
          [dersId]: {
            ...(prev[dersId] || {
              dersId, dersAdi: ders.ad, dersKodu: ders.kod,
              ogretmenAdi: kullaniciAdi,
              olusturmaTarihi: new Date().toLocaleDateString("tr-TR"),
              haftalar: {},
            }),
            haftalar: {
              ...(prev[dersId]?.haftalar || {}),
              [hafta]: urunListesi,
            },
          },
        }));
      }

      bildirimGoster("basari", `${ders.kod} şablon verisi başarıyla yüklendi!`);
    } catch (err) {
      console.error("Şablon yükleme hatası:", err);
      bildirimGoster("hata", "Şablon yüklenirken hata oluştu. Dosya formatını kontrol edin.");
    } finally {
      setSablonYukleniyor((prev) => ({ ...prev, [dersId]: false }));
      setDersSablonDosyasi((prev) => { const y = { ...prev }; delete y[dersId]; return y; });
    }
  };

  // Kisisiye ozel offline sablon
  // - Tamamen client-side, internet gerektirmez
  // - Hocaya ait gercek dersler ve Supabase'den cekilen urunler kullanilir
  // - Hoca bu dosyayi internetsiz ortamda doldurup internet gelince yukler
  const dersHaftaDoluluk = (dersId: string) => {
    const dl = dersListeleri[dersId];
    if (!dl) return 0;
    return HAFTALAR.filter((h) => (dl.haftalar[h] || []).length > 0).length;
  };

  const handleExcelYukleme = async () => {
    if (!yuklemeDosyasi) {
      bildirimGoster("hata", "Lutfen bir Excel dosyasi secin.");
      return;
    }

    try {
      const data = await yuklemeDosyasi.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(data, { type: 'array' });

      // Assume sheets are named after tables: 'urunler', 'dersler', etc.
      // Process 'urunler' sheet
      if (workbook.Sheets['urunler']) {
        const urunlerData = XLSX.utils.sheet_to_json(workbook.Sheets['urunler']);
        // Validate and map data to match database columns
        const validUrunler = urunlerData.map((row: any) => ({
          urun_adi: row.urun_adi || '',
          marka: row.marka || '',
          fiyat: parseFloat(row.fiyat) || 0,
          olcu: row.olcu || '',
          kategori: row.kategori || '',
          stok: parseInt(row.stok) || 0,
        })).filter(u => u.urun_adi); // Filter out invalid rows

        if (validUrunler.length > 0) {
          await supabase.from('urunler').insert(validUrunler);
        }
      }

      // Process 'dersler' sheet
      if (workbook.Sheets['dersler']) {
        const derslerData = XLSX.utils.sheet_to_json(workbook.Sheets['dersler']);
        const validDersler = derslerData.map((row: any) => ({
          kod: row.kod || '',
          ad: row.ad || '',
        })).filter(d => d.kod && d.ad);

        if (validDersler.length > 0) {
          await supabase.from('dersler').insert(validDersler);
        }
      }

      // Add more sheets as needed, e.g., 'kullanicilar', 'siparisler'

      bildirimGoster("basari", "Veriler basariyla yuklendi!");
      // Optionally refresh data
      window.location.reload();
    } catch (error) {
      console.error('Excel yukleme hatasi:', error);
      bildirimGoster("hata", "Veri yukleme sirasinda hata olustu.");
    }
  };

  // Add function to generate and download example Excel template
  const handleOrnekSablonIndir = async () => {
    try {
      // Fetch sample urunler from database (limit to a few for template)
      const { data: urunlerData, error: urunError } = await supabase
        .from('urunler')
        .select('urun_adi, marka, fiyat, olcu, kategori, stok')
        .limit(5); // Limit to 5 sample rows

      if (urunError) throw urunError;

      // Fetch dersler from database (filter for cooking-related if possible, or all)
      const { data: derslerData, error: dersError } = await supabase
        .from('dersler')
        .select('kod, ad')
        .limit(5); // Limit to 5 sample rows

      if (dersError) throw dersError;

      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      // Create 'urunler' sheet with real data
      const urunlerSheet = XLSX.utils.json_to_sheet(urunlerData || []);
      XLSX.utils.book_append_sheet(workbook, urunlerSheet, 'urunler');

      // Create 'dersler' sheet with real data (replacing hardcoded MAT101 and FIZ201)
      const derslerSheet = XLSX.utils.json_to_sheet(derslerData || []);
      XLSX.utils.book_append_sheet(workbook, derslerSheet, 'dersler');

      // Add more sheets as needed

      // Generate and download the file
      XLSX.writeFile(workbook, 'ornek_veri_sablonu.xlsx');
    } catch (error) {
      console.error('Sablon indirme hatasi:', error);
      bildirimGoster("hata", "Ornek sablon indirilirken hata olustu.");
    }
  };

  return (
    <DashboardLayout title="Alisveris Listelerim" subtitle="10 haftalik malzeme talep listesi olusturun">
      <div className="max-w-7xl space-y-5">
        {bildirim && (
          <div className={`text-sm rounded-xl px-4 py-3 border font-medium ${bildirim.tip === "basari" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
            {bildirim.metin}
          </div>
        )}

        <div className="flex gap-2 items-center">
          {([{ key: "liste-olustur", label: "Liste Olustur" }, { key: "listelerim", label: "Listelerim ve Indir" }] as const).map((s) => (
            <button key={s.key} onClick={() => setAktifSekme(s.key)}
              className={`px-5 py-3 rounded-xl text-sm font-semibold transition ${aktifSekme === s.key ? "bg-red-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {s.label}
            </button>
          ))}
        </div>

        {aktifSekme === "liste-olustur" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Ders *</label>
                  <select value={secilenDers} onChange={(e) => { setSecilenDers(e.target.value); setSecilenHafta("1. Hafta"); }}
                    className={`w-full border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 ${!secilenDers ? "border-red-300" : "border-gray-200"}`}>
                    <option value="">DERS SECINIZ...</option>
                    {atananDersler.map((d) => <option key={d.id} value={d.id}>{d.kod} - {d.ad}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Hafta Secimi</label>
                  <div className="flex flex-wrap gap-2">
                    {HAFTALAR.map((h) => {
                      const dolu = secilenDers && (dersListeleri[secilenDers]?.haftalar[h] || []).length > 0;
                      return (
                        <button key={h} onClick={() => setSecilenHafta(h)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${secilenHafta === h ? "bg-red-700 text-white border-red-700" : dolu ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {h.replace(". Hafta", ".")} {dolu && secilenHafta !== h ? "v" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 text-sm">Urun Havuzu — {secilenHafta}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={handleReceteModalAc}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition whitespace-nowrap">
                      🍽 Reçeteden Ekle
                    </button>
                    <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} placeholder="Urun ara..."
                      className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 w-48" />
                  </div>

                <div className="mx-4 mt-4 mb-1 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Miktar Giris Rehberi</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">Kg / L</span>
                      <span className="text-gray-500">Istediginiz degeri elle girin — orn: <b>0,100</b> · <b>1,500</b></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">G / Ml</span>
                      <span className="text-gray-500">+ / - ile <b>50'ser</b> artir/azalt</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">Adet</span>
                      <span className="text-gray-500">+ / - ile <b>1'er</b> artir/azalt</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-800 whitespace-nowrap">Paket / Kutu</span>
                      <span className="text-gray-500">+ / - ile <b>1'er</b> artir/azalt</span>
                    </div>
                  </div>
                </div>

                {urunler.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 text-sm">Urun havuzu bos.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-left">
                          <th className="px-4 py-3 w-10 text-xs font-semibold text-gray-500">SEC</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">URUN</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MARKA</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">B.FIYAT</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MIKTAR</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">TOPLAM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtreliUrunler.map((u) => {
                          const secili = u.id in liste;
                          const miktar = liste[u.id] ?? 0;
                          const bilgi = olcuBilgisi(u.olcu);
                          return (
                            <tr key={u.id} className={`transition-colors ${secili ? "bg-red-50" : "hover:bg-gray-50"}`}>
                              <td className="px-4 py-3">
                                <input type="checkbox" checked={secili} onChange={(e) => handleCheckbox(u, e.target.checked)} className="w-4 h-4 accent-red-600 cursor-pointer" />
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-800">{u.urunAdi}</p>
                                {u.kategori && <p className="text-xs text-gray-400">{u.kategori}</p>}
                                {u.stok > 0
                                  ? <p className="text-xs text-emerald-600 font-medium">Depoda: {u.stok} {u.olcu}</p>
                                  : <p className="text-xs text-gray-400">Depoda stok yok</p>}
                              </td>
                              <td className="px-4 py-3 text-gray-500">{u.marka || "-"}</td>
                              <td className="px-4 py-3 text-gray-700 font-medium">
                                {u.fiyat > 0 ? `${u.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL/${u.olcu}` : "-"}
                              </td>
                              <td className="px-4 py-3">
                                {secili ? (
                                  bilgi.serbest ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={kgInputler[u.id] !== undefined ? kgInputler[u.id] : (miktar > 0 ? String(miktar).replace(".", ",") : "")}
                                        placeholder="orn: 1,500"
                                        onChange={(e) => handleKgInput(u.id, e.target.value)}
                                        className={`w-24 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                          miktar > 0 ? "border-gray-300" : "border-red-300 bg-red-50 placeholder-red-300"
                                        }`}
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
                                        value={miktar || ""}
                                        step={bilgi.adim}
                                        min={bilgi.baslangic}
                                        onChange={(e) => handleDirektMiktar(u.id, Number(e.target.value))}
                                        className="w-14 border border-gray-200 rounded-lg px-1 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                                      />
                                      <span className="text-xs text-gray-400">{u.olcu}</span>
                                      <button type="button" onClick={() => handleArttir(u)}
                                        className="w-7 h-7 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold text-sm transition">
                                        +
                                      </button>
                                    </div>
                                  )
                                ) : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-800">
                                {secili && miktar > 0 && u.fiyat > 0
                                  ? `${(u.fiyat * miktar).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`
                                  : "-"}
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
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-4 space-y-4">
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {secilenHafta} Ozeti
                    <span className="ml-2 text-xs font-normal text-gray-400">({secilenUrunListesi.length} urun)</span>
                  </h3>
                  {secilenUrunListesi.length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-4">Henuz urun secilmedi.</p>
                  ) : (
                    <>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {secilenUrunListesi.map((u) => (
                          <div key={u.urunId} className="flex justify-between items-start text-xs py-1.5 border-b border-gray-50">
                            <div>
                              <p className="font-medium text-gray-800">{u.urunAdi}</p>
                              <p className="text-gray-400">{u.miktar} {u.olcu}</p>
                            </div>
                            <span className="text-gray-600 font-medium ml-2">
                              {u.toplam > 0 ? `${u.toplam.toFixed(2)} TL` : "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
                        <span className="font-semibold text-gray-700">Hafta Toplami</span>
                        <span className="font-bold text-red-700">
                          {haftaToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </span>
                      </div>
                    </>
                  )}
                  <button type="button" onClick={handleHaftaKaydet} disabled={!secilenDers}
                    className="w-full bg-red-700 hover:bg-red-800 text-white text-sm font-semibold py-3 rounded-xl transition disabled:opacity-40">
                    {secilenHafta} Listesini Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {aktifSekme === "listelerim" && (
          <div className="space-y-5">
            {atananDersler.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400 text-sm">
                Atanmis ders bulunamadi.
              </div>
            ) : (
              atananDersler.map((ders) => {
                const dl = dersListeleri[ders.id];
                const doluHafta = dersHaftaDoluluk(ders.id);
                const genelToplam = dl
                  ? HAFTALAR.reduce((acc, h) => acc + (dl.haftalar[h] || []).reduce((a, u) => a + u.toplam, 0), 0)
                  : 0;
                return (
                  <div key={ders.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg">{ders.kod}</span>
                        <h3 className="font-bold text-gray-800">{ders.ad}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{doluHafta}/10 hafta</p>
                          {genelToplam > 0 && (
                            <p className="text-sm font-bold text-red-700">
                              {genelToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                            </p>
                          )}
                        </div>
                        {dl && doluHafta > 0 ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleExcelIndir(ders.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
                              Excel
                            </button>
                            <button onClick={() => handlePdfIndir(ders.id)}
                              className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
                              PDF
                            </button>
                            <button onClick={() => handleSablonIndir(ders.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                              title="Doldurulabilir Excel şablonu indir">
                              Şablon İndir
                            </button>
                            <label
                              className={`flex items-center gap-1 text-sm font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer ${sablonYukleniyor[ders.id] ? "bg-gray-200 text-gray-400" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
                              title="Doldurduğun şablonu yükle">
                              {sablonYukleniyor[ders.id] ? "Yükleniyor…" : "Excel Yükle"}
                              <input
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                disabled={sablonYukleniyor[ders.id]}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleSablonYukle(ders.id, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <button onClick={() => { setSecilenDers(ders.id); setAktifSekme("liste-olustur"); }}
                              className="text-sm text-red-600 font-medium hover:underline">
                              Liste oluştur &rarr;
                            </button>
                            <button onClick={() => handleSablonIndir(ders.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition"
                              title="Doldurulabilir Excel şablonu indir">
                              Şablon İndir
                            </button>
                            <label
                              className={`flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-xl transition cursor-pointer ${sablonYukleniyor[ders.id] ? "bg-gray-200 text-gray-400" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
                              title="Doldurduğun şablonu yükle">
                              {sablonYukleniyor[ders.id] ? "Yükleniyor…" : "Şablon ↑"}
                              <input
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                disabled={sablonYukleniyor[ders.id]}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleSablonYukle(ders.id, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
                        {HAFTALAR.map((h) => {
                          const hUrunler = dl?.haftalar[h] || [];
                          const hToplam = hUrunler.reduce((acc, u) => acc + u.toplam, 0);
                          return (
                            <button key={h}
                              onClick={() => { setSecilenDers(ders.id); setSecilenHafta(h); setAktifSekme("liste-olustur"); }}
                              className={`p-2 rounded-xl border text-center text-xs transition ${hUrunler.length > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                              <p className="font-bold">{h.replace(". Hafta", ".")}</p>
                              <p className="text-xs mt-0.5">
                                {hUrunler.length > 0 ? `${hToplam.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL` : "-"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Reçeteden Ekle Modal */}
      {receteModalAcik && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">🍽 Reçeteden Ekle</h2>
              <button onClick={() => setReceteModalAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Reçete Seçin</label>
                <select value={secilenReceteId} onChange={e => setSecilenReceteId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">-- Reçete seçin --</option>
                  {receteler.map(r => (
                    <option key={r.id} value={r.id}>{r.ad} ({r.kategori})</option>
                  ))}
                </select>
                {receteler.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Henüz reçete eklenmemiş. Reçete Havuzu'ndan ekleyebilirsiniz.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Öğrenci Sayısı</label>
                <input type="number" min={1} value={ogrenciSayisi} onChange={e => setOgrenciSayisi(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                Reçetedeki malzemeler, öğrenci sayısıyla çarpılarak mevcut listeye <strong>eklenir</strong>. Ürün havuzunda eşleşen ürünler otomatik işaretlenir.
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setReceteModalAcik(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition">
                  İptal
                </button>
                <button onClick={handleReceteUygula} disabled={receteYukleniyor || !secilenReceteId}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                  {receteYukleniyor ? "Ekleniyor..." : "Listeye Ekle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
