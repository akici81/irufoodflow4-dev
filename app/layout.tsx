import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IRÜ FoodFlow - Eğitim Mutfağı Yönetim Sistemi",
  description: "İstanbul Rumeli Üniversitesi Eğitim Mutfağı Yönetim ve Talep Sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <style>{`
          @font-face {
            font-family: 'Cargan';
            font-weight: 400;
            font-style: normal;
            src: url('https://db.onlinewebfonts.com/t/b27c01490bb5e899ce67dbad7969a505.woff2') format('woff2'),
                 url('https://db.onlinewebfonts.com/t/b27c01490bb5e899ce67dbad7969a505.woff') format('woff'),
                 url('https://db.onlinewebfonts.com/t/b27c01490bb5e899ce67dbad7969a505.ttf') format('truetype');
          }
          @font-face {
            font-family: 'Cargan';
            font-weight: 500;
            font-style: normal;
            src: url('https://db.onlinewebfonts.com/t/67397e153893ea177888e77750b595af.woff2') format('woff2'),
                 url('https://db.onlinewebfonts.com/t/67397e153893ea177888e77750b595af.woff') format('woff'),
                 url('https://db.onlinewebfonts.com/t/67397e153893ea177888e77750b595af.ttf') format('truetype');
          }
          @font-face {
            font-family: 'Cargan';
            font-weight: 700;
            font-style: normal;
            src: url('https://db.onlinewebfonts.com/t/b8232194aa3f5cda0342edda72e01f53.woff2') format('woff2'),
                 url('https://db.onlinewebfonts.com/t/b8232194aa3f5cda0342edda72e01f53.woff') format('woff'),
                 url('https://db.onlinewebfonts.com/t/b8232194aa3f5cda0342edda72e01f53.ttf') format('truetype');
          }
          @font-face {
            font-family: 'Cargan';
            font-weight: 800;
            font-style: normal;
            src: url('https://db.onlinewebfonts.com/t/27c2d43df6af7f02c587537a91afe14a.woff2') format('woff2'),
                 url('https://db.onlinewebfonts.com/t/27c2d43df6af7f02c587537a91afe14a.woff') format('woff'),
                 url('https://db.onlinewebfonts.com/t/27c2d43df6af7f02c587537a91afe14a.ttf') format('truetype');
          }
        `}</style>
      </head>
      <body className="antialiased bg-gray-50" style={{fontFamily: "'Cargan', serif"}}>
        {children}
      </body>
    </html>
  );
}
