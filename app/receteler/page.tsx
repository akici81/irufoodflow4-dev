"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
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
  const [kullaniciId, setKullaniciId] = useState<number | null>(null);
  const [kullaniciRole, setKullaniciRole] = useState<string>("");
  const [receteler, setReceteler] = useState<Recete[]>([]);
  const [filtreKat, setFiltreKat] = useState("Tümü");
  const [ara