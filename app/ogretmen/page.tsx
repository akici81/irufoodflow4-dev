"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Ders = { id: string; kod: string; ad: string };

const RED = "#B71C1C";

export default function OgretmenAnaSayfa() {
  const { yetkili, yukleniyor } = useAuth("/ogretmen");
  const [adSoyad, setAdSoyad] = useState("");
  const [atananDersler, setAtananDersler] = useState<Ders[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const id = localStorage.getItem("aktifKullaniciId");
      if (!id) return;

      const { data: k } = await supabase
        .from("kullanicilar")
        .select("ad_soyad, username, dersler")
        .eq("id", id)
        .single();

      if (!k) return;
      setAdSoyad(k.ad_soyad || k.username);

      if ((k.dersler || []).length > 0) {
        const { data: dersler } = await supabase
          .from("dersler")
          .select("*")
          .in("id", k.dersler);
        setAtananDersler(dersler || []);
      }
    };
    fetchData();
  }, []);

  if (yukleniyor) return (
    <DashboardLayout title="Öğretim Görevlisi Paneli">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #E4E4E7", borderTopColor: RED, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title={`Merhaba, ${adSoyad}!`} subtitle="Öğretmen Paneline Hoş Geldiniz">
      <div style={{ maxWidth: 900 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>

          {/* Sol: Rehber */}
          <div style={{
            background: "white",
            borderRadius: 12,
            border: "1px solid #E4E4E7",
            padding: "32px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#18181B", margin: "0 0 8px" }}>
              Alışveriş Listesi Oluşturun
            </h2>
            <p style={{ fontSize: 13.5, color: "#71717A", lineHeight: 1.6, margin: "0 0 20px" }}>
              Dersleriniz için haftalık malzeme talebinde bulunmak üzere sol menüdeki{" "}
              <strong style={{ color: "#18181B" }}>&quot;Alışveriş Listelerim&quot;</strong>{" "}
              sekmesini kullanabilirsiniz.
            </p>

            <div style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 24,
            }}>
              <p style={{ fontSize: 13, color: "#991B1B", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                Alışveriş listesi sayfasında ürünleri isaretleyip haftalık planlamanızı yapabilirsiniz.
              </p>
            </div>

            <Link href="/alisveris-listelerim" style={{
              display: "inline-block",
              background: RED,
              color: "white",
              fontSize: 13.5,
              fontWeight: 700,
              padding: "12px 24px",
              borderRadius: 8,
              textDecoration: "none",
              letterSpacing: 0.3,
              boxShadow: "0 4px 14px rgba(183,28,28,0.25)",
              transition: "background 0.15s",
            }}>
              Alışveriş Listesi Olustur
            </Link>
          </div>

          {/* Sag: Dersler */}
          <div style={{
            background: "white",
            borderRadius: 12,
            border: "1px solid #E4E4E7",
            padding: "24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#18181B", margin: 0 }}>
                Atanmış Dersleriniz
              </h2>
              {atananDersler.length > 0 && (
                <span style={{
                  background: "#FEF2F2",
                  color: RED,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 20,
                  border: `1px solid #FECACA`,
                }}>
                  {atananDersler.length} Ders
                </span>
              )}
            </div>

            {atananDersler.length === 0 ? (
              <div style={{
                background: "#F4F4F5",
                borderRadius: 8,
                padding: "24px",
                textAlign: "center",
                border: "1px dashed #D4D4D8",
              }}>
                <p style={{ fontSize: 13, color: "#71717A", margin: 0 }}>Henüz ders atanmamış.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {atananDersler.map((d) => (
                  <div key={d.id} style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid #F4F4F5",
                    background: "#FAFAFA",
                    transition: "background 0.12s",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: RED, letterSpacing: 0.5, marginBottom: 2 }}>
                      {d.kod}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "#3F3F46" }}>
                      {d.ad}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
