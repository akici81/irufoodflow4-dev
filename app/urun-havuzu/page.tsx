"use client";
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "@/lib/supabase";

export type Urun = {
  id: string;
  urunAdi: string;
  marka: string;
  fiyat: number;
  olcu: string;
  kategori: string;
  market: string;
  stok: number;
  kod: string;
  notlar: string;
};

const OLCU_SECENEKLERI = ["Kg", "L", "Paket", "Adet", "G", "Ml", "Kutu"];

const BOSH_FORM: Omit<Urun, "id"> = {
  urunAdi: "",
  marka: "",
  fiyat: 0,
  olcu: "Kg",
  kategori: "",
  market: "",
  stok: 0,
  kod: "",
  notlar: ""
};

export default function UrunHavuzuPage() {
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [aramaMetni, setAramaMetni] = useState("");
  const [secilenKategori, setSecilenKategori] = useState("Tümü");
  const [secilenMarka, setSecilenMarka] = useState("Tümü");
  const [form, setForm] = useState<Omit<Urun, "id">>(BOSH_FORM);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [panelAcik, setPanelAcik] = useState(false);
  const [bildirim, setBildirim] = useState<{ tip: "basari" | "hata"; metin: string } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aktifRol, setAktifRol] = useState("");
  const dosyaRef = useRef<HTMLInputElement>(null);
