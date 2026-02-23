"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Her sayfanın hangi rollere açık olduğu
const SAYFA_ROLLERI: Record<string, string[]> = {
  "/admin":              ["admin"],
  "/kullanicilar":       ["admin"],
  "/dersler":            ["admin", "bolum_baskani"],
  "/siparisler":         ["admin"],
  "/siparis-yonetimi":   ["admin"],
  "/urun-havuzu":        ["admin", "ogretmen"],
  "/receteler":          ["admin", "ogretmen"],
  "/bolum-baskani":      ["admin", "bolum_baskani"],
  "/ogretmen":           ["admin", "ogretmen"],
  "/alisveris-listelerim": ["admin", "ogretmen"],
  "/siparislerim":       ["admin", "ogretmen"],
  "/talep":              ["admin", "ogretmen"],
  "/satin":              ["admin", "satin_alma"],
  "/stok":               ["admin", "stok"],
};

export function useAuth(sayfaYolu: string) {
  const router = useRouter();
  const [yetkili, setYetkili] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("aktifKullaniciId");
    const role = localStorage.getItem("role");

    // Giriş yapılmamış
    if (!id || !role) {
      router.replace("/");
      return;
    }

    const izinliRoller = SAYFA_ROLLERI[sayfaYolu];
    
    // Tanımsız sayfa — erişime izin ver
    if (!izinliRoller) {
      setYetkili(true);
      setYukleniyor(false);
      return;
    }

    if (izinliRoller.includes(role)) {
      setYetkili(true);
      setYukleniyor(false);
    } else {
      // Yetkisiz — rolüne göre ana sayfasına yönlendir
      const anaSayfa: Record<string, string> = {
        admin: "/admin",
        ogretmen: "/ogretmen",
        satin_alma: "/satin",
        stok: "/stok",
        bolum_baskani: "/bolum-baskani",
      };
      router.replace(anaSayfa[role] || "/");
    }
  }, [sayfaYolu, router]);

  return { yetkili, yukleniyor };
}
