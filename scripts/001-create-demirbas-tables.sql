-- Demirbaslar tablosu: Mutfak demirbas ana listesi
CREATE TABLE IF NOT EXISTS demirbaslar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad text NOT NULL,
  kategori text NOT NULL,
  marka text,
  model text,
  seri_no text,
  beklenen_adet integer DEFAULT 0,
  durum text DEFAULT 'saglam',
  alis_tarihi date,
  garanti_bitis date,
  notlar text,
  created_at timestamptz DEFAULT now()
);

-- Envanter sayim oturumlari
CREATE TABLE IF NOT EXISTS envanter_sayimlar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sayan_id integer REFERENCES kullanicilar(id),
  tarih timestamptz DEFAULT now(),
  notlar text,
  durum text DEFAULT 'taslak',
  created_at timestamptz DEFAULT now()
);

-- Envanter sayim detay satirlari
CREATE TABLE IF NOT EXISTS envanter_sayim_detay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sayim_id uuid REFERENCES envanter_sayimlar(id) ON DELETE CASCADE,
  demirbas_id uuid REFERENCES demirbaslar(id) ON DELETE CASCADE,
  sayilan_adet integer DEFAULT 0,
  durum text DEFAULT 'saglam',
  notlar text
);
