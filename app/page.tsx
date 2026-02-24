"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    } catch (err) {
      setError("Bağlantı sırasında bir hata oluştu.");
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{backgroundColor: '#b91c1c'}}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          {/* Logo ve Başlık */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{backgroundColor: '#b91c1c'}}>
              <span className="text-white font-black text-xl tracking-tighter">İRÜ</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
              İRÜFoodFlow
            </h1>
            <p className="text-sm text-gray-500">
              Alışveriş Yönetim Platformu
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3 mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı giriniz"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{"--tw-ring-color": "#b91c1c"} as React.CSSProperties}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi giriniz"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full text-white font-semibold py-3 rounded-lg transition-all text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{backgroundColor: '#b91c1c'}}
            >
              {yukleniyor ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              System Administrator&apos;a iletişime geçiniz.<br />
              İRÜFoodFlow v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}