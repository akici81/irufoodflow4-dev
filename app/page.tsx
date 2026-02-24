"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const RED = "#B71C1C";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setYukleniyor(true);

    try {
      const { data, error: dbError } = await supabase
        .from("kullanicilar")
        .select("*")
        .eq("username", username)
        .eq("password_hash", password)
        .single();

      if (dbError || !data) {
        setError("Kullanıcı adı veya şifre hatalı.");
        setYukleniyor(false);
        return;
      }

      localStorage.setItem("aktifKullaniciId", String(data.id));
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);

      const rota: Record<string, string> = {
        admin: "/admin",
        ogretmen: "/ogretmen",
        satin_alma: "/satin",
        stok: "/stok",
        bolum_baskani: "/bolum-baskani",
        "bolum-baskani": "/bolum-baskani",
      };

      router.push(rota[data.role] ?? "/");
    } catch {
      setError("Bağlantı sırasında bir hata oluştu.");
      setYukleniyor(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: RED,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Cargan', serif",
      padding: 24,
    }}>
      {/* Subtle background texture */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0,0,0,0.1) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%", maxWidth: 420,
        background: "white",
        borderRadius: 16,
        padding: "44px 40px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
        position: "relative",
      }}>

        {/* Logo alanı */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56,
            background: RED,
            borderRadius: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 8px 24px rgba(183,28,28,0.3)",
          }}>
            <span style={{ color: "white", fontWeight: 900, fontSize: 14, letterSpacing: 0.5 }}>İRÜ</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#18181B", margin: "0 0 6px", letterSpacing: 0.3 }}>
            İRÜFoodFlow
          </h1>
          <p style={{ fontSize: 13, color: "#71717A", margin: 0, fontWeight: 500 }}>
            Alışveriş Yönetim Platformu
          </p>
        </div>

        {/* Hata mesajı */}
        {error && (
          <div style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: "#991B1B",
            textAlign: "center",
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Kullanici adi */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#3F3F46", marginBottom: 6, letterSpacing: 0.3 }}>
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı giriniz"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #E4E4E7",
                borderRadius: 8,
                fontSize: 14,
                color: "#18181B",
                background: "#FAFAFA",
                outline: "none",
                fontFamily: "'Cargan', serif",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = RED)}
              onBlur={e => (e.target.style.borderColor = "#E4E4E7")}
            />
          </div>

          {/* Sifre */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#3F3F46", marginBottom: 6, letterSpacing: 0.3 }}>
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi giriniz"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #E4E4E7",
                borderRadius: 8,
                fontSize: 14,
                color: "#18181B",
                background: "#FAFAFA",
                outline: "none",
                fontFamily: "'Cargan', serif",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = RED)}
              onBlur={e => (e.target.style.borderColor = "#E4E4E7")}
            />
          </div>

          {/* Buton */}
          <button
            type="submit"
            disabled={yukleniyor}
            style={{
              width: "100%",
              padding: "13px",
              background: yukleniyor ? "#D4D4D8" : RED,
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: yukleniyor ? "not-allowed" : "pointer",
              fontFamily: "'Cargan', serif",
              letterSpacing: 0.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.15s",
              boxShadow: yukleniyor ? "none" : "0 4px 16px rgba(183,28,28,0.25)",
            }}
          >
            {yukleniyor ? (
              <span style={{
                width: 18, height: 18,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }} />
            ) : "Giriş Yap"}
          </button>
        </form>

        {/* Alt bilgi */}
        <div style={{ textAlign: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid #F4F4F5" }}>
          <p style={{ fontSize: 11, color: "#A1A1AA", margin: 0, lineHeight: 1.7, fontWeight: 500 }}>
            Hesap sorunları için Sistem Yöneticisi ile iletişime geçiniz.<br />
            <span style={{ color: "#D4D4D8" }}>İRÜFoodFlow v2.0</span>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
