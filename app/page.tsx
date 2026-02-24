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
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Arka Plan Dekoratif Elementleri */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#8B1A1A]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#8B1A1A]/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-[440px] relative">
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 p-10 md:p-12 animate-in fade-in zoom-in duration-500">
          
          {/* Logo ve Başlık */}
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#8B1A1A] to-[#a32626] rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-red-900/20 rotate-3">
              <span className="text-white font-black text-2xl tracking-tighter">İRÜ</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
              FoodFlow
            </h1>
            <p className="text-[10px] font-black text-[#8B1A1A] uppercase tracking-[0.3em]">
              Eğitim Mutfakları Yönetimi
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-[#8B1A1A] text-xs font-bold rounded-2xl px-4 py-4 mb-6 text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: ahmet_hoca"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/10 focus:border-[#8B1A1A]/20 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/10 focus:border-[#8B1A1A]/20 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full bg-slate-900 hover:bg-[#8B1A1A] text-white font-bold py-4 rounded-2xl transition-all duration-300 text-sm shadow-lg shadow-slate-200 hover:shadow-red-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {yukleniyor ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Sisteme Giriş Yap"
              )}
            </button>
          </form>

          {/* Alt Bilgi */}
          <div className="mt-12 pt-8 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
              İstanbul Rumeli Üniversitesi<br />
              <span className="text-slate-300">İrÜFoodFlow v4.0.0</span>
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}