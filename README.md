# EcoTrade - Aplikasi Daur Ulang Botol

## 🌱 Tentang EcoTrade

EcoTrade adalah aplikasi mobile-first untuk mendukung program daur ulang botol plastik. Pengguna dapat memindai QR code di lokasi penimbunan, mengumpulkan poin, dan menukarkannya dengan voucher menarik.

## 🚀 Fitur Utama

### 👤 **Fitur Pengguna**
- **Scan QR Code** untuk verifikasi lokasi penimbunan
- **Sistem Poin** - dapatkan poin dari setiap botol yang ditimbang
- **Voucher Redemption** - tukar poin dengan voucher menarik
- **Activity History** - lacak riwayat daur ulang
- **Leaderboard** - lihat peringkat pengguna teratas
- **Profile Management** - kelola data pribadi dan password

### 🏢 **Fitur Admin**
- **Dashboard Analytics** - monitoring data real-time
- **Location Management** - kelola lokasi penimbunan
- **Voucher Management** - atur sistem voucher
- **Mission Management** - buat misi dan tantangan
- **User Ranking** - sistem tier dan peringkat

## 🛠️ Tech Stack

### **Frontend**
- **React 18** dengan TypeScript
- **Vite** sebagai build tool
- **TailwindCSS** untuk styling
- **Shadcn/ui** component library
- **React Router** untuk navigasi

### **Backend & Database**
- **Supabase** (PostgreSQL + Auth + Storage)
- **Real-time subscriptions**
- **Row Level Security (RLS)**

### **Testing & Quality**
- **Vitest** untuk unit testing
- **React Testing Library**
- **TypeScript** untuk type safety
- **ESLint** untuk code quality

## 📱 Cara Instalasi

### Prerequisites
- Node.js 18+ 
- npm atau yarn
- Akun Supabase

### Langkah-langkah

1. **Clone repository**
```bash
git clone <repository-url>
cd EcoTrade
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```
Edit `.env` file dengan credentials Supabase Anda:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Setup database**
```bash
# Jalankan migrations Supabase
supabase db push
```

5. **Jalankan development server**
```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

## 🏗️ Struktur Proyek

```
src/
├── components/          # Reusable components
│   ├── ui/             # Shadcn/ui components
│   ├── Common/         # Shared components
│   └── Admin/          # Admin components
├── pages/              # Page components
├── lib/                # Utilities & helpers
│   └── __tests__/      # Unit tests
├── hooks/              # Custom React hooks
├── integrations/       # External integrations
└── types/              # TypeScript definitions
```

## 🧪 Testing

Jalankan semua tests:
```bash
npm run test
```

Jalankan tests dalam watch mode:
```bash
npm run test:watch
```

## 🚀 Deployment

### Build untuk production:
```bash
npm run build
```

### Preview build:
```bash
npm run preview
```

### Environment Variables untuk Production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🔧 Konfigurasi Penting

### Supabase Setup
1. Buat project baru di Supabase
2. Jalankan SQL migrations dari folder `supabase/migrations/`
3. Setup Row Level Security (RLS) policies
4. Konfigurasi authentication providers

### Environment Variables
Required variables:
- `VITE_SUPABASE_URL` - URL database Supabase
- `VITE_SUPABASE_ANON_KEY` - Public API key

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📝 Catatan Development

### Best Practices
- Gunakan TypeScript untuk type safety
- Follow component naming conventions
- Implement error boundaries untuk error handling
- Gunakan API retry logic untuk network resilience

### Code Quality
- Jalankan `npm run lint` sebelum commit
- Pastikan semua tests pass
- Follow existing code patterns
- Add comments untuk complex logic

## 🐞 Troubleshooting

### Issues Umum
- **QR Scanner tidak berjalan**: Pastikan kamera permission di-grant
- **Auth error**: Cek Supabase credentials di `.env`
- **Database connection error**: Verifikasi Supabase project status

### Support
Untuk issues atau questions:
1. Cek existing GitHub issues
2. Review documentation
3. Contact development team

## 📄 License

Project ini dilisensikan under MIT License.

---

**EcoTrade** - Membangun masa depan yang lebih hijau melalui teknologi daur ulang. 🌱♻️
