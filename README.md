# Proje Adı

Bu proje, [Proje Amacı] için geliştirilmiş bir web uygulamasıdır.

## Özellikler

- Kullanıcı rolleri (Admin, Manager)
- Şube bazlı finansal veri takibi
- Dinamik gösterge paneli
- Tarih aralığı ve şube bazlı filtreleme

## Kurulum

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

1.  **Veritabanı Kurulumu:**
    *   Supabase projenizi oluşturun ve veritabanı şemalarınızı (`schema.sql` veya benzeri bir dosya varsa) içe aktarın.
    *   Gerekli tabloları (kullanıcılar, şubeler, finansal kayıtlar vb.) oluşturduğunuzdan emin olun.

2.  **Proje Klonlama:**
    ```bash
    git clone <proje_git_url>
    cd <proje_dizini>
    ```

3.  **Bağımlılıkların Yüklenmesi:**
    ```bash
    npm install
    # veya
    yarn install
    ```

4.  **Ortam Değişkenleri:**
    *   Proje kök dizininde `.env.local` adında bir dosya oluşturun.
    *   Aşağıdaki Supabase değişkenlerini kendi projenizin bilgileriyle doldurun:
        ```env
        NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
        SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key # Bu anahtar backend işlemleri için gereklidir ve gizli tutulmalıdır.
        ```
    *   Gerekirse diğer ortam değişkenlerini de ekleyin.

5.  **Veritabanı Şeması (Opsiyonel ama Önemli):**
    *   Eğer bir veritabanı şeması (`.sql` dosyası) varsa, bunu Supabase SQL editörünüzü kullanarak çalıştırın. Bu, gerekli tabloları ve ilişkileri oluşturacaktır.

6.  **Geliştirme Sunucusunu Başlatma:**
    ```bash
    npm run dev
    # veya
    yarn dev
    ```
    Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

## Kullanılan Teknolojiler

- Next.js (React Framework)
- TypeScript
- Supabase (Backend as a Service - Veritabanı, Auth)
- Tailwind CSS (CSS Framework)
- Shadcn/ui (UI Komponent Kütüphanesi)
- Date-fns (Tarih/Saat işlemleri)
- Lucide React (İkonlar)
- Recharts (Grafik Kütüphanesi)

## Temel Klasör Yapısı

```
/app
  /(auth)       # Giriş, kayıt, şifre sıfırlama gibi auth sayfaları
  /admin        # Admin özel sayfaları (şube yönetimi, rol yönetimi vb.)
  /api          # API route'ları (server-side logic)
  /branch       # Şube detay ve finansal veri giriş sayfaları
  /dashboard    # Ana gösterge paneli
  /             # Ana sayfa ve diğer genel sayfalar
/components     # Paylaşılan UI komponentleri
  /ui           # Shadcn/ui tarafından oluşturulan temel UI elemanları
/hooks          # Özel React hook'ları (örn: useAuth)
/lib            # Yardımcı fonksiyonlar ve kütüphane entegrasyonları
/utils          # Genel yardımcı araçlar, Supabase client/server konfigürasyonları
/public         # Statik dosyalar (resimler, ikonlar)
```

## Katkıda Bulunma

Katkıda bulunmak isterseniz, lütfen aşağıdaki adımları izleyin:

1.  Bu repoyu fork'layın.
2.  Yeni bir branch oluşturun (`git checkout -b feature/yeni-ozellik`).
3.  Değişikliklerinizi commit'leyin (`git commit -am 'Yeni özellik eklendi'`).
4.  Branch'inizi push'layın (`git push origin feature/yeni-ozellik`).
5.  Bir Pull Request oluşturun.

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına (eğer varsa) bakın.
