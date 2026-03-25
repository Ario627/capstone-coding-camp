import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(' Memulai injeksi data dummy ke database...');

  const tipsData = [
    { title: 'Aturan 50/30/20', content: 'Sisihkan 50% gaji untuk kebutuhan pokok, 30% untuk keinginan, dan 20% wajib untuk tabungan atau investasi. Jangan dibalik!', category: 'budgeting', isActive: true },
    { title: 'Pentingnya Dana Darurat', content: 'Idealnya 3-6 kali pengeluaran bulanan. Taruh di instrumen likuid seperti reksa dana pasar uang biar gampang ditarik pas butuh.', category: 'emergency_fund', isActive: true },
    { title: 'Utang Produktif vs Konsumtif', content: 'Nyicil aset untuk kerja itu utang produktif. Nyicil HP mahal demi gengsi itu utang konsumtif. Jauhi paylater untuk gaya hidup!', category: 'debt', isActive: true },
    { title: 'Mulai Investasi dari SBN', content: 'Buat pemula yang takut rugi, Surat Berharga Negara (SBN) ritel itu pilihan paling aman karena dijamin negara 100%.', category: 'investing', isActive: true },
    { title: 'Pisahkan Uang Pribadi & Usaha', content: 'Kesalahan terbesar UMKM adalah mencampur uang pribadi dan uang bisnis. Bikin rekening terpisah!', category: 'umkm', isActive: true },
    { title: 'Menabung di Awal Bulan', content: 'Jangan menabung dari sisa uang di akhir bulan, tapi sisihkan di awal bulan begitu gajian cair. Pakai fitur auto-debet lebih baik.', category: 'saving', isActive: true },
    { title: 'Hati-hati Jebakan Paylater', content: 'Bunga paylater dan pinjol seringkali lebih tinggi dari kartu kredit bank. Pakai hanya untuk kebutuhan mendesak, bukan konsumtif.', category: 'digital_payment', isActive: true },
    { title: 'Pentingnya Lapor SPT Tahunan', content: 'Meskipun nihil, lapor SPT itu wajib buat warga negara yang punya NPWP. Jangan sampai kena denda administrasi!', category: 'tax', isActive: true },
  ];

  console.log(' Menyuntikkan Daily Tips...');
  await prisma.dailyTip.createMany({ 
    data: tipsData,
    skipDuplicates: true,
  });

  const terminologiesData = [
    { 
      term: 'Inflasi', slug: 'inflasi', category: 'general',
      definition: 'Kenaikan harga barang dan jasa secara umum dan terus-menerus yang membuat nilai uang semakin turun dari waktu ke waktu.',
      examples: [{ title: 'Contoh', description: 'Nasi padang tahun 2010 harganya Rp10.000, sekarang di tahun 2026 jadi Rp20.000 karena inflasi.' }],
      relatedTerms: ['Deflasi', 'Suku Bunga', 'IHK']
    },
    { 
      term: 'IHSG', slug: 'ihsg', category: 'investment',
      definition: 'Indeks Harga Saham Gabungan. Tolok ukur kinerja pergerakan seluruh saham yang tercatat di Bursa Efek Indonesia (BEI).',
      examples: [{ title: 'Contoh', description: 'Kalau IHSG ditutup "hijau", berarti rata-rata harga saham di Indonesia hari itu sedang naik.' }],
      relatedTerms: ['Saham', 'Bursa Efek', 'Emiten']
    },
    { 
      term: 'Dividen', slug: 'dividen', category: 'investment',
      definition: 'Pembagian sebagian keuntungan bersih perusahaan kepada para pemegang sahamnya, sebanding dengan jumlah lembar saham yang dimiliki.',
      examples: [{ title: 'Contoh', description: 'Kamu punya 100 lot saham Bank BCA. Saat BCA untung besar, kamu dapat transferan tunai langsung ke rekening RDN.' }],
      relatedTerms: ['Capital Gain', 'Yield', 'RUPS']
    },
    { 
      term: 'Reksa Dana', slug: 'reksa-dana', category: 'investment',
      definition: 'Wadah untuk menghimpun dana dari masyarakat pemodal yang selanjutnya diinvestasikan dalam portofolio efek oleh Manajer Investasi.',
      examples: [{ title: 'Analog', description: 'Seperti patungan membeli banyak lauk pauk, lalu ada koki (Manajer Investasi) yang memasak dan mengaturnya untuk semua orang.' }],
      relatedTerms: ['Manajer Investasi', 'NAB', 'Portofolio']
    },
    { 
      term: 'Deposito', slug: 'deposito', category: 'banking',
      definition: 'Simpanan uang di bank yang pencairannya hanya dapat dilakukan pada jangka waktu tertentu dan syarat-syarat tertentu dengan bunga lebih tinggi dari tabungan biasa.',
      examples: [{ title: 'Contoh', description: 'Menyimpan uang Rp10 juta di bank dan dikunci selama 6 bulan dengan bunga 5% per tahun.' }],
      relatedTerms: ['Suku Bunga', 'Tabungan', 'LPS']
    },
    { 
      term: 'Premi', slug: 'premi', category: 'insurance',
      definition: 'Sejumlah uang yang wajib dibayarkan oleh nasabah kepada perusahaan asuransi sebagai syarat mendapatkan perlindungan risiko.',
      examples: [{ title: 'Contoh', description: 'Membayar Rp500 ribu setiap bulan ke BPJS atau asuransi swasta agar biaya rumah sakit tercover jika sakit.' }],
      relatedTerms: ['Polis', 'Klaim', 'Uang Pertanggungan']
    },
    {
      term: 'Cash Flow', slug: 'cash-flow', category: 'umkm',
      definition: 'Laporan arus kas yang menunjukkan pergerakan uang masuk (pemasukan) dan uang keluar (pengeluaran) dalam sebuah bisnis atau keuangan pribadi.',
      examples: [{ title: 'Contoh', description: 'Bisnis kopi catat cash flow positif kalau uang dari pelanggan lebih besar dari biaya beli biji kopi dan sewa tempat.' }],
      relatedTerms: ['Laporan Keuangan', 'Laba Rugi', 'Omzet']
    }
  ];

  console.log(' Menyuntikkan Kamus Istilah...');
  await prisma.terminology.createMany({
    data: terminologiesData,
    skipDuplicates: true,
  });

  const modulesData = [
    { 
      title: 'Mindset Keuangan Basic', slug: 'mindset-keuangan-basic', category: 'financial_basics', difficulty: 'beginner',
      description: 'Pahami pondasi dasar cara kerja uang sebelum uang yang mempermainkanmu.',
      content: 'Materi ini akan membahas perbedaan aset dan liabilitas, serta pentingnya mengenali gaya hidup yang menghabiskan uang tanpa disadari. Ini adalah langkah pertama menuju kebebasan finansial.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnailUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
      duration: 15, order: 1, isActive: true 
    },
    { 
      title: 'Cara Bikin Budget Bulanan Anti Bocor', slug: 'budgeting-bulanan-anti-bocor', category: 'budgeting', difficulty: 'beginner',
      description: 'Template dan praktik langsung mengalokasikan gaji pakai metode zero-based budgeting.',
      content: 'Zero-based budgeting artinya setiap rupiah dari gaji kamu harus diberikan "tugas" sebelum bulan dimulai. Kamu akan belajar mengalokasikan uang hingga saldo tersisa persis Rp0 untuk mencegah kebocoran.',
      videoUrl: null, thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
      duration: 25, order: 2, isActive: true 
    },
    { 
      title: 'Panduan Investasi Saham Pemula', slug: 'investasi-saham-pemula', category: 'investing', difficulty: 'intermediate',
      description: 'Mulai dari buka Rekening Dana Nasabah (RDN) sampai memilih saham perusahaan blue chip.',
      content: 'Langkah demi langkah membuka akun sekuritas, memahami jam bursa, membaca grafik harga (candlestick) dasar, dan membedakan antara investasi jangka panjang dengan trading harian.',
      videoUrl: null, thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
      duration: 45, order: 1, isActive: true 
    },
    { 
      title: 'Analisis Fundamental Saham', slug: 'analisis-fundamental-saham', category: 'investing', difficulty: 'advanced',
      description: 'Membaca laporan keuangan, menghitung PER, PBV, dan ROE untuk mencari saham "salah harga".',
      content: 'Modul tingkat mahir yang membahas cara membedah laporan laba rugi, neraca, dan arus kas perusahaan. Kita akan membedah valuasi untuk mengetahui apakah sebuah saham sedang murah (undervalued) atau mahal (overvalued).',
      videoUrl: null, thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80',
      duration: 60, order: 2, isActive: true 
    },
    { 
      title: 'Manajemen Utang & Kredit', slug: 'manajemen-utang-kredit', category: 'debt_management', difficulty: 'intermediate',
      description: 'Strategi melunasi utang menumpuk dengan metode snowball dan avalanche.',
      content: 'Terjebak banyak cicilan? Pelajari metode Snowball (bayar utang terkecil dulu untuk motivasi) vs Avalanche (bayar bunga terbesar dulu untuk hemat uang) agar terbebas dari jerat utang pinjol dan kartu kredit.',
      videoUrl: null, thumbnailUrl: 'https://images.unsplash.com/photo-1580519542036-ed47f3e42214?w=800&q=80',
      duration: 30, order: 1, isActive: true 
    },
    { 
      title: 'Pajak UMKM 0,5% Final', slug: 'pajak-umkm-final', category: 'tax_basics', difficulty: 'intermediate',
      description: 'Panduan lengkap lapor pajak bulanan untuk wirausaha kecil sesuai regulasi pemerintah.',
      content: 'Bagi UMKM dengan omzet di bawah Rp4,8 Miliar per tahun, pemerintah memberikan kemudahan PPh Final sebesar 0,5%. Pelajari cara hitung, setor, dan lapor SPT-nya di sini.',
      videoUrl: null, thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
      duration: 35, order: 1, isActive: true 
    }
  ];

  console.log(' Menyuntikkan Modul Belajar...');
  await prisma.learningModule.createMany({
    data: modulesData,
    skipDuplicates: true,
  });

}

main()
  .catch((e) => {
    console.error(' Gagal injeksi data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log(' Selesai');
  });