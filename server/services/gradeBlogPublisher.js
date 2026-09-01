const { PrismaClient } = require('@prisma/client');
let prismaInstance = null;
function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

const { submitUrlToGoogleIndexingApi, submitSitemapToGoogleSearchConsole } = require('./seoEngine');

const GRADE_BLOGS = [
  {
    grade: '5',
    topic: 'Doğal Sayılar ve İşlemler',
    title: '5. Sınıf Matematik Doğal Sayılar ve İşlemler Konu Anlatımı & Çözümlü Sorular (2026-2027 MEB)',
    slug: '5-sinif-matematik-dogal-sayilar-ve-islemler',
    metaTitle: '5. Sınıf Matematik Doğal Sayılar ve İşlemler | Konu Anlatımı & Test',
    metaDescription: '5. Sınıf matematik doğal sayılar, basamak değerleri, bölükler, dört işlem ve çözümlü örnek sorular ile 2026-2027 MEB müfredatı rehberi.',
    excerpt: '5. Sınıf matematik dersinin ilk ünitesi olan Doğal Sayılar ve İşlemler konusunun detaylı anlatımı, formülleri, çözümlü örnek soruları ve mini testi.',
    targetKeyword: '5 sınıf matematik doğal sayılar',
    secondaryKeywords: ['5 sınıf doğal sayılar konu anlatımı', '5 sınıf basamak değerleri', '5 sınıf matematik soruları'],
    content: `
      <h2>5. Sınıf Matematik Doğal Sayılar ve İşlemler Rehberi</h2>
      <p>5. sınıf matematik müfredatının temeli olan <strong>Doğal Sayılar ve İşlemler</strong> ünitesinde 6, 7, 8 ve 9 basamaklı sayıları okuma, basamak ve bölük kavramlarını anlama ile zihinden işlem yapma becerileri kazandırılır.</p>
      
      <h3>1. Bölükler ve Basamak Değerleri</h3>
      <p>Büyük doğal sayıları daha kolay okuyabilmek için sayılar sağdan sola doğru üçerli gruplara ayrılır. Bu gruplara <strong>bölük</strong> adı verilir.</p>
      <ul>
        <li><strong>Birler Bölüğü:</strong> Birler, onlar, yüzler basamağı.</li>
        <li><strong>Binler Bölüğü:</strong> Binler, onlar binler, yüz binler basamağı.</li>
        <li><strong>Milyonlar Bölüğü:</strong> Milyonlar, onlar milyonlar, yüz milyonlar basamağı.</li>
      </ul>

      <h3>2. Çözümlü Örnek Sorular</h3>
      <p><strong>Örnek 1 (Kolay):</strong> "45 608 219" sayısının milyonlar bölüğündeki sayıların toplamı kaçtır?</p>
      <p><em>Çözüm:</em> Milyonlar bölüğündeki sayı 45'tir. 4 + 5 = 9 olur.</p>

      <p><strong>Örnek 2 (Orta):</strong> 8 basamaklı en küçük çift doğal sayı ile 7 basamaklı en büyük doğal sayının farkı kaçtır?</p>
      <p><em>Çözüm:</em> 8 basamaklı en küçük çift sayı = 10 000 000. 7 basamaklı en büyük sayı = 9 999 999. Fark: 10 000 000 - 9 999 999 = 1.</p>

      <h3>3. Öğrencilerin Sık Yaptığı Hatalar</h3>
      <ul>
        <li>Sayıdaki sıfır (0) rakamının basamak değerini sıfır yerine basamağın adıyla karıştırmak.</li>
        <li>Bölükleri sağdan sola grup yapmak yerine soldan sağa gruplamak.</li>
      </ul>

      <h3>4. Mini Değerlendirme Testi</h3>
      <ol>
        <li>"708 045 002" sayısının okunuşu hangisidir? (Cevap: Yedi yüz sekiz milyon kırk beş bin iki)</li>
        <li>Basamak değeri en büyük olan rakam hangi basamaktadır? (Cevap: En soldaki basamak)</li>
      </ol>
    `,
    faq: [
      { question: '5. sınıf doğal sayılarda kaç bölük vardır?', answer: 'İlkokul ve ortaokul düzeyinde en sık birler, binler ve milyonlar olmak üzere 3 bölük işlenir.' }
    ],
    internalLinks: [
      { anchorText: '5. Sınıf PDF Notlar', targetUrl: '/pdf-notlar' },
      { anchorText: 'Tüm Matematik Derslerimiz', targetUrl: '/derslerimiz' }
    ]
  },

  {
    grade: '6',
    topic: 'Kesirler ve Ondalık Gösterim',
    title: '6. Sınıf Matematik Kesirler ve Ondalık Gösterim Konu Anlatımı & Örnek Sorular (2026-2027 MEB)',
    slug: '6-sinif-matematik-kesirler-ve-ondalik-gosterim',
    metaTitle: '6. Sınıf Matematik Kesirler ve Ondalık Gösterim | Konu Anlatımı',
    metaDescription: '6. Sınıf matematik kesirlerle işlemler, kesirleri sıralama, ondalık gösterim ve yuvarlama konularının detaylı açıklaması ve test soruları.',
    excerpt: '6. Sınıf matematik kesirlerle toplama, çıkarma, çarpma, bölme ve ondalık gösterim konularının pratik yöntemleri ve çözümlü test örnekleri.',
    targetKeyword: '6 sınıf matematik kesirler',
    secondaryKeywords: ['6 sınıf kesirlerle işlemler', '6 sınıf ondalık gösterim', '6 sınıf matematik test'],
    content: `
      <h2>6. Sınıf Kesirler ve Ondalık Gösterim Rehberi</h2>
      <p>6. sınıf matematik dersinin en önemli konularından biri olan <strong>Kesirler ve Ondalık Gösterim</strong>, günlük hayattaki paylaştırma ve oran problemlerinin temelini oluşturur.</p>

      <h3>1. Kesirlerle Dört İşlem Kuralları</h3>
      <ul>
        <li><strong>Toplama ve Çıkarma:</strong> Paydalar mutlaka eşitlenmelidir. Paylar toplanır/çıkarılır, ortak payda aynen yazılır.</li>
        <li><strong>Çarpma:</strong> Pay ile pay çarpılıp paya, payda ile payda çarpılıp paydaya yazılır. Sadeleştirme varsa önce yapılır.</li>
        <li><strong>Bölme:</strong> Birinci kesir aynen yazılır, ikinci kesir ters çevrilip çarpılır.</li>
      </ul>

      <h3>2. Çözümlü Örnek Sorular</h3>
      <p><strong>Örnek 1 (Kesirde Bölme):</strong> (3/4) ÷ (1/8) işleminin sonucu kaçtır?</p>
      <p><em>Çözüm:</em> (3/4) × (8/1) = (24/4) = 6.</p>

      <p><strong>Örnek 2 (Ondalık Gösterim):</strong> 4,25 × 0,4 işleminin sonucu kaçtır?</p>
      <p><em>Çözüm:</em> Virgülsüz çarpalım: 425 × 4 = 1700. Virgülden sonra toplam 3 basamak var. Sonuç: 1,700 = 1,7.</p>

      <h3>3. Püf Noktalar ve Taktikler</h3>
      <p>Kesirlerde bölme yaparken "Birinciyi aynen tut, ikinciyi takla attır" kuralını unutmayın!</p>
    `,
    faq: [
      { question: 'Ondalık kesirlerde virgül nasıl kaydırılır?', answer: '10, 100, 1000 ile çarparken virgül sağa, bölerken sola kaydırılır.' }
    ],
    internalLinks: [
      { anchorText: '6. Sınıf Ders Notları', targetUrl: '/pdf-notlar' }
    ]
  },

  {
    grade: '7',
    topic: 'Tam Sayılar ve Rasyonel Sayılar',
    title: '7. Sınıf Matematik Tam Sayılar ve Rasyonel Sayılar Rehberi (2026-2027 MEB)',
    slug: '7-sinif-matematik-tam-sayilar-ve-rasyonel-sayilar',
    metaTitle: '7. Sınıf Matematik Tam Sayılar ve Rasyonel Sayılar | Konu Anlatımı',
    metaDescription: '7. Sınıf matematik negatif ve pozitif tam sayılar, rasyonel sayılar kümesi, sayma pulları ve çözümlü soru bankası rehberi.',
    excerpt: '7. Sınıf matematik tam sayılarla dört işlem kuralları, işaret işaret etkileşimi ve rasyonel sayıların sayı doğrusunda gösterimi.',
    targetKeyword: '7 sınıf matematik tam sayılar',
    secondaryKeywords: ['7 sınıf rasyonel sayılar', '7 sınıf matematik soruları', 'tam sayılarla işlemler'],
    content: `
      <h2>7. Sınıf Tam Sayılar ve Rasyonel Sayılar</h2>
      <p>7. sınıfta matematik dünyasına <strong>negatif sayılar</strong> ve <strong>rasyonel sayılar</strong> tam anlamıyla giriş yapar.</p>

      <h3>1. İşaret Kuralları (Altın Kurallar)</h3>
      <ul>
        <li>(+) × (+) = (+)</li>
        <li>(-) × (-) = (+)  <em>(Aynı işaretlerin çarpımı pozitiftir)</em></li>
        <li>(+) × (-) = (-)  <em>(Zıt işaretlerin çarpımı negatiftir)</em></li>
      </ul>

      <h3>2. Örnek Soru Çözümleri</h3>
      <p><strong>Örnek:</strong> (-8) - (-12) + (-5) işleminin sonucu kaçtır?</p>
      <p><em>Çözüm:</em> Eksi ile eksi yanyana gelince artı olur: (-8) + 12 - 5 = 4 - 5 = -1.</p>
    `,
    faq: [
      { question: 'Sıfır bir tam sayı mıdır?', answer: 'Evet, sıfır bir tam sayıdır ancak işareti yoktur (nötrdür).' }
    ],
    internalLinks: [
      { anchorText: '7. Sınıf Konu Anlatımları', targetUrl: '/derslerimiz' }
    ]
  },

  {
    grade: '8',
    topic: 'LGS Matematik Çarpanlar ve Üslü İfadeler',
    title: '8. Sınıf LGS Matematik Çarpanlar Katlar ve Üslü İfadeler Derece Rehberi (2026-2027)',
    slug: '8-sinif-lgs-matematik-carpanlar-katlar-uslu-ifadeler',
    metaTitle: '8. Sınıf LGS Matematik Çarpanlar Katlar & Üslü Sayılar | LGS Taktikleri',
    metaDescription: '8. Sınıf LGS matematik EBOB-EKOK, çarpanlar ve katlar, üslü ifadeler yeni nesil soru çözümleri ve LGS 2027 derece taktikleri.',
    excerpt: 'LGS 2027 hazırlığında 8. sınıf matematik EBOB EKOK problemleri, üslü denklem çözümleri ve LGS yeni nesil soru kalıpları.',
    targetKeyword: '8 sınıf lgs matematik',
    secondaryKeywords: ['8 sınıf ebob ekok', 'lgs üslü sayılar yeni nesil', 'lgs matematik derece'],
    content: `
      <h2>8. Sınıf LGS Matematik: EBOB-EKOK ve Üslü Sayılar</h2>
      <p>LGS Matematik sınavında her yıl en az 4-5 soru <strong>Çarpanlar ve Katlar (EBOB-EKOK)</strong> ve <strong>Üslü İfadeler</strong> konularından gelir.</p>

      <h3>1. EBOB ve EKOK Problem Ayrımı</h3>
      <ul>
        <li><strong>EBOB (En Büyük Ortak Bölen):</strong> Bütünden parçaya gidiliyorsa (örn: tarlayı parsellere bölme, çuvallardaki pirinci poşetlere paylaştırma) EBOB kullanılır.</li>
        <li><strong>EKOK (En Küçük Ortak Kat):</strong> Parçadan bütüne gidiliyorsa (örn: zillerin birlikte çalması, otobüs sefer saatleri) EKOK kullanılır.</li>
      </ul>

      <h3>2. LGS Yeni Nesil Örnek Soru</h3>
      <p><strong>Örnek:</strong> Kenar uzunlukları 48 m ve 60 m olan dikdörtgen şeklindeki bir bahçenin etrafına eşit aralıklarla direk dikilecektir. En az kaç direk gereklidir?</p>
      <p><em>Çözüm:</em> EBOB(48, 60) = 12 m (direkler arası mesafe). Çevre = 2 × (48 + 60) = 216 m. Direk sayısı = 216 / 12 = 18 direk.</p>
    `,
    faq: [
      { question: 'LGS matematikte yeni nesil sorular nasıl çözülür?', answer: 'Sorudaki görseli ve hikayeyi önce matematiksel denkleme dökün, ardından EBOB/EKOK kurallarını uygulayın.' }
    ],
    internalLinks: [
      { anchorText: '8. Sınıf LGS Notları', targetUrl: '/pdf-notlar' },
      { anchorText: 'Kontenjanlı Canlı LGS Kursu', targetUrl: '/kontenjan-kurslari' }
    ]
  },

  {
    grade: '9',
    topic: 'Mantık ve Kümeler',
    title: '9. Sınıf Matematik Mantık ve Kümeler Konu Anlatımı & Çözümlü Sorular (2026-2027)',
    slug: '9-sinif-matematik-kumeler-ve-mantik-konu-anlatimi',
    metaTitle: '9. Sınıf Matematik Mantık ve Kümeler | Konu Anlatımı & Soru Çözümü',
    metaDescription: '9. Sınıf matematik önermeler, ve/veya/ise/ancak ve ancak bağlaçları, küme sembolleri, alt küme formülleri ve Venn şeması rehberi.',
    excerpt: '9. Sınıf matematik dersinin giriş ünitesi olan Mantık ve Kümeler konularının kuralları, de Morgan kuralları ve kümelerde birleşim/kesişim örnekleri.',
    targetKeyword: '9 sınıf matematik konuları',
    secondaryKeywords: ['9 sınıf mantık konu anlatımı', '9 sınıf kümeler soruları', '9 sınıf matematik 1 dönem'],
    content: `
      <h2>9. Sınıf Matematik: Mantık ve Kümeler Konu Anlatımı</h2>
      <p>Liseye geçişte 9. sınıf matematik müfredatı sözel akıl yürütmeyi sembolleştiren <strong>Sembolik Mantık</strong> ve <strong>Kümeler</strong> ile başlar.</p>

      <h3>1. Önermeler ve Bağlaçlar</h3>
      <p>Doğru ya da yanlış kesin bir hüküm bildiren ifadelere <strong>önerme</strong> denir.</p>
      <ul>
        <li><strong>İse (⇒) Bağlacı:</strong> Sadece 1 ⇒ 0 ≡ 0 durumunda yanlıştır, diğer tüm durumlarda doğrudur ("100 Kuralı").</li>
        <li><strong>De Morgan Kuralları:</strong> (p ∧ q)' ≡ p' ∨ q' ve (p ∨ q)' ≡ p' ∧ q'.</li>
      </ul>

      <h3>2. Kümelerde Alt Küme Sayısı</h3>
      <p>n elemanlı bir kümenin alt küme sayısı <strong>2ⁿ</strong> formülü ile hesaplanır.</p>
    `,
    faq: [
      { question: 'Boş küme her kümenin alt kümesi midir?', answer: 'Evet, boş küme her kümenin öz alt kümesi ve alt kümesidir.' }
    ],
    internalLinks: [
      { anchorText: '9. Sınıf Ders Sayfası', targetUrl: '/derslerimiz' }
    ]
  },

  {
    grade: '10',
    topic: 'Sayma ve Olasılık (Permütasyon Kombinasyon)',
    title: '10. Sınıf Matematik Permütasyon, Kombinasyon ve Olasılık Rehberi (2026-2027)',
    slug: '10-sinif-matematik-sayma-ve-olasilik-permutasyon-kombinasyon',
    metaTitle: '10. Sınıf Matematik Permütasyon Kombinasyon Olasılık | Konu Anlatımı',
    metaDescription: '10. Sınıf matematik sıralama (permütasyon), seçme (kombinasyon), Binom açılımı ve basit olayların olasılığı detaylı anlatımı.',
    excerpt: '10. Sınıf matematik permütasyon sıralama ile kombinasyon seçme farkı, faktöriyel hesaplama ve ÖSYM tarzı olasılık soru çözümleri.',
    targetKeyword: '10 sınıf matematik permutasyon kombinasyon',
    secondaryKeywords: ['10 sınıf olasılık konu anlatımı', 'permutasyon kombinasyon farkı', '10 sınıf matematik soruları'],
    content: `
      <h2>10. Sınıf Matematik: Permütasyon, Kombinasyon ve Olasılık</h2>
      <p>ÖSYM'nin hem TYT hem AYT sınavlarında aksatmadan sorduğu <strong>Permütasyon, Kombinasyon ve Olasılık</strong> ünitesi 10. sınıfın ana omurgasıdır.</p>

      <h3>1. Permütasyon ve Kombinasyon Ayrımı</h3>
      <ul>
        <li><strong>Permütasyon P(n,r):</strong> Nesnelerin SIRALANMASIDIR. Sıra önemlidir (Örn: 3 kişi 3 sandalyeye kaç farklı şekilde oturur?).</li>
        <li><strong>Kombinasyon C(n,r):</strong> Nesnelerin SEÇİLMESİDİR. Sıra önemsizdir (Örn: 10 kişiden 3 kişilik takım seçme).</li>
      </ul>

      <h3>2. Örnek Soru</h3>
      <p><strong>Örnek:</strong> 7 kişilik bir gruptan 3 kişilik bir komite kaç farklı şekilde seçilebilir?</p>
      <p><em>Çözüm:</em> C(7,3) = (7 × 6 × 5) / (3 × 2 × 1) = 35 farklı şekilde seçilebilir.</p>
    `,
    faq: [
      { question: 'Permütasyon ile kombinasyon nasıl ayırt edilir?', answer: 'Soruda dizilim/sıralama varsa Permütasyon, gruplama/seçme varsa Kombinasyon kullanılır.' }
    ],
    internalLinks: [
      { anchorText: '10. Sınıf PDF Notları', targetUrl: '/pdf-notlar' }
    ]
  },

  {
    grade: '11',
    topic: 'Trigonometri',
    title: '11. Sınıf Matematik Trigonometri Konu Anlatımı & Formül Rehberi (2026-2027)',
    slug: '11-sinif-matematik-trigonometri-konu-anlatimi',
    metaTitle: '11. Sınıf Matematik Trigonometri | Konu Anlatımı & Formüller',
    metaDescription: '11. Sınıf matematik birim çember, sinüs, kosinüs, tanjant, kotanjant fonksiyonları, dönüşüm formülleri ve AYT trigonometri soru çözümleri.',
    excerpt: '11. Sınıf matematik dersinin 1 numaralı konusu Trigonometri rehberi: birim çember özellikleri, esas ölçü, sinüs-kosinüs teoremleri ve formüller.',
    targetKeyword: '11 sınıf matematik trigonometri',
    secondaryKeywords: ['11 sınıf trigonometri formülleri', 'ayt trigonometri konu anlatımı', 'birim çember trigonometri'],
    content: `
      <h2>11. Sınıf Matematik: Trigonometri Detaylı Rehber</h2>
      <p>AYT Matematik sınavında 4-5 soru ile en yüksek ağırlığa sahip olan <strong>Trigonometri</strong> ünitesi 11. sınıfta öğretilir.</p>

      <h3>1. Birim Çember ve Temel Özdeşlikler</h3>
      <p>Yarıçapı 1 birim olan O merkezli çembere <strong>birim çember</strong> denir (x² + y² = 1).</p>
      <ul>
        <li><strong>En Temel Özdeşlik:</strong> sin²(x) + cos²(x) = 1</li>
        <li><strong>Tanjant ve Kotanjant:</strong> tan(x) = sin(x)/cos(x), cot(x) = cos(x)/sin(x), tan(x) × cot(x) = 1</li>
      </ul>

      <h3>2. Sinüs ve Kosinüs Teoremi</h3>
      <p><strong>Sinüs Teoremi:</strong> a / sin(A) = b / sin(B) = c / sin(C) = 2R</p>
      <p><strong>Kosinüs Teoremi:</strong> a² = b² + c² - 2bc × cos(A)</p>
    `,
    faq: [
      { question: 'Trigonometride esas ölçü nasıl bulunur?', answer: 'Derece cinsinden 360\'a bölünerek kalan bulunur, radyan cinsinden 2π çıkarılarak bulunur.' }
    ],
    internalLinks: [
      { anchorText: '11. Sınıf Canlı Kurslarımız', targetUrl: '/kontenjan-kurslari' }
    ]
  },

  {
    grade: '12',
    topic: 'AYT Matematik Türev ve İntegral',
    title: '12. Sınıf AYT Matematik Türev ve İntegral Derece Rehberi (2026-2027)',
    slug: '12-sinif-ayt-matematik-turev-ve-integral-temelleri',
    metaTitle: '12. Sınıf AYT Matematik Türev ve İntegral | Derece Taktikleri',
    metaDescription: '12. Sınıf ve YKS hazırlık AYT matematik limit, süreklilik, türev alma kuralları, teğet denklemi, belirli-belirsiz integral ve alan hesabı.',
    excerpt: 'YKS 2027 AYT Matematik sınavının zirve konuları: Türev fiziksel yorumu, maksimum-minimum problemleri, integralde alan hesabı ve pratik soru çözümleri.',
    targetKeyword: '12 sınıf ayt matematik turev integral',
    secondaryKeywords: ['ayt türev konu anlatımı', 'ayt integral alan hesabı', '12 sınıf matematik konuları'],
    content: `
      <h2>12. Sınıf AYT Matematik: Türev ve İntegral</h2>
      <p>YKS AYT Matematik sınavında derece yapmanın anahtarı <strong>Türev ve İntegral</strong> konularına hakim olmaktır.</p>

      <h3>1. Türev Alma Kuralları ve Geometrik Yorum</h3>
      <p>Bir f(x) fonksiyonunun x₀ noktasındaki türevi, o noktadan çizilen teğet doğrusunun eğimine (m = tan α) eşittir.</p>
      <ul>
        <li>(xⁿ)' = n × xⁿ⁻¹</li>
        <li>(f(x) × g(x))' = f'(x)g(x) + f(x)g'(x)  <em>(Çarpımın Türevi)</em></li>
      </ul>

      <h3>2. Belirli İntegral ve Eğri Altında Kalan Alan</h3>
      <p>∫ₐᵇ f(x) dx değeri, y = f(x) eğrisi, x=a, x=b doğruları ve x-ekseni arasında kalan alanın net değerini verir.</p>
    `,
    faq: [
      { question: 'Türev ile İntegral arasındaki ilişki nedir?', answer: 'İntegral, türevin ters işlemidir (Türev alma işleminin geri döndürülmesidir).' }
    ],
    internalLinks: [
      { anchorText: 'AYT Matematik Canlı Kampı', targetUrl: '/camps' },
      { anchorText: 'Tüm PDF Notlar', targetUrl: '/pdf-notlar' }
    ]
  },

  // -------------------------------------------------------------
  // ALL TOPICS CURRICULUM GUIDES (GRADES 5, 6, 7, 8, 10, 11, 12) - (EXCLUDING 9)
  // -------------------------------------------------------------
  {
    grade: '5',
    topic: '5. Sınıf Matematik Tüm Konuları',
    title: '2026-2027 5. Sınıf Matematik Tüm Konuları ve MEB Müfredat Rehberi',
    slug: '5-sinif-matematik-tum-konulari-ve-mufredat-rehberi',
    metaTitle: '2026-2027 5. Sınıf Matematik Tüm Konuları & Müfredat Listesi',
    metaDescription: '2026-2027 MEB müfredatına uygun 5. sınıf matematik tüm konuları, ünite özetleri, sınav çalışma taktikleri ve konu dağılım rehberi.',
    excerpt: '5. Sınıf matematik dersinin tüm 1. ve 2. dönem üniteleri, doğal sayılar, kesirler, ondalık gösterim, geometri ve ölçme konularının eksiksiz rehberi.',
    targetKeyword: '5 sınıf matematik tüm konuları',
    secondaryKeywords: ['5 sınıf matematik müfredatı 2026 2027', '5 sınıf matematik üniteleri', '5 sınıf matematik konuları listesi'],
    content: `
      <h2>2026-2027 5. Sınıf Matematik Tüm Konuları ve Ünite Listesi</h2>
      <p>MEB güncel müfredatına uygun olarak hazırlanan bu rehberde 5. sınıf matematik dersinin 1. ve 2. dönem tüm üniteleri detaylı şekilde açıklanmaktadır.</p>
      
      <h3>1. Dönem Üniteleri ve Konuları</h3>
      <ul>
        <li><strong>1. Ünite: Doğal Sayılar ve İşlemler</strong> (Milyonlu sayılar, basamak ve bölükler, zihinden işlemler)</li>
        <li><strong>2. Ünite: Kesirler ve Kesirlerle İşlemler</strong> (Bileşik ve tam sayılı kesirler, sıralama, toplama-çıkarma)</li>
        <li><strong>3. Ünite: Ondalık Gösterim ve Yüzdeler</strong> (Basamak değerleri, yüzde hesabı ve karşılaştırma)</li>
      </ul>

      <h3>2. Dönem Üniteleri ve Konuları</h3>
      <ul>
        <li><strong>4. Ünite: Temel Geometrik Kavramlar ve Çizimler</strong> (Doğru, ışın, doğru parçası, dik, paralel doğrular, açılar)</li>
        <li><strong>5. Ünite: Üçgen ve Dörtgenler</strong> (Üçgen çeşitleri, dörtgenlerin açı özellikleri)</li>
        <li><strong>6. Ünite: Veri İşleme ve Ölçme</strong> (Sıklık tablosu, sütun grafiği, uzunluk, zaman ve alan ölçme)</li>
        <li><strong>7. Ünite: Geometrik Cisimler</strong> (Dikdörtgenler prizması, yüzey alanı ve hacim)</li>
      </ul>

      <h3>Başarılı Olmak İçin 3 Altın Çalışma Taktiği</h3>
      <ol>
        <li>Kesirlerde toplama-çıkarma yapmadan önce paydaları eşitlemeyi alışkanlık haline getirin.</li>
        <li>Geometri sorularında mutlaka şekil çizin veya verilen şeklin üzerine açı değerlerini yazın.</li>
        <li>Haftada bir gün geçmiş ünitelerden 20 karma soru çözerek zihninizi taze tutun.</li>
      </ol>
    `,
    faq: [
      { question: '5. sınıf matematikte kaç ünite vardır?', answer: 'MEB 5. sınıf matematik müfredatında toplam 7 ünite bulunmaktadır.' }
    ],
    internalLinks: [
      { anchorText: '5. Sınıf PDF Notlar', targetUrl: '/pdf-notlar' },
      { anchorText: 'Tüm Matematik Derslerimiz', targetUrl: '/derslerimiz' }
    ]
  },

  {
    grade: '6',
    topic: '6. Sınıf Matematik Tüm Konuları',
    title: '2026-2027 6. Sınıf Matematik Tüm Konuları ve MEB Müfredat Rehberi',
    slug: '6-sinif-matematik-tum-konulari-ve-mufredat-rehberi',
    metaTitle: '2026-2027 6. Sınıf Matematik Tüm Konuları & Ünite Dağılımı',
    metaDescription: '6. Sınıf matematik tüm üniteleri: Çarpanlar katlar, kümeler, tam sayılar, kesirler, cebirsel ifadeler, veri ve geometri konuları detaylı anlatımı.',
    excerpt: '2026-2027 eğitim yılında 6. sınıf matematik müfredatındaki tüm üniteler, işlem önceliği, asal sayılar, alan ve hacim hesaplama rehberi.',
    targetKeyword: '6 sınıf matematik tüm konuları',
    secondaryKeywords: ['6 sınıf matematik konuları listesi', '6 sınıf matematik müfredatı 2026 2027', '6 sınıf matematik üniteleri'],
    content: `
      <h2>2026-2027 6. Sınıf Matematik Tüm Konuları Rehberi</h2>
      <p>Ortaokul 2. kademenin en kritik yılı olan 6. sınıfta matematik konuları daha soyut ve mantıksal bir yapıya bürünür.</p>

      <h3>1. Dönem Ünite Dağılımı</h3>
      <ul>
        <li><strong>1. Ünite: Doğal Sayılarla İşlemler, Çarpanlar ve Katlar, Kümeler</strong> (Üslü nicelikler, işlem önceliği, asal sayılar, EBOB-EKOK giriş, küme kavramı)</li>
        <li><strong>2. Ünite: Tam Sayılar ve Kesirlerle İşlemler</strong> (Mutlak değer, yönlü sayılar, kesirlerde çarpma ve bölme)</li>
        <li><strong>3. Ünite: Ondalık Gösterim ve Oran</strong> (Ondalık sayılarda çarpma-bölme, yuvarlama, oran kavramı)</li>
      </ul>

      <h3>2. Dönem Ünite Dağılımı</h3>
      <ul>
        <li><strong>4. Ünite: Cebirsel İfadeler ve Veri Analizi</strong> (Değişken kavramı, aritmetik ortalama ve açıklık)</li>
        <li><strong>5. Ünite: Açılar, Alan Ölçme ve Çember</strong> (Komşu, tümler, bütünler açılar, paralelkenar ve üçgende alan, çember çevresi)</li>
        <li><strong>6. Ünite: Geometrik Cisimler ve Sıvı Ölçme</strong> (Hacim ölçme birimleri, sıvı ölçüleri ile hacim ilişkisi)</li>
      </ul>
    `,
    faq: [
      { question: '6. sınıf matematikte en çok zorlanılan konu hangisidir?', answer: 'Genellikle Çarpanlar-Katlar, Kümeler ve Kesirlerde Bölme işlemlerinde pratik eksikliğinden dolayı zorlanılır.' }
    ],
    internalLinks: [
      { anchorText: '6. Sınıf Notları', targetUrl: '/pdf-notlar' }
    ]
  },

  {
    grade: '7',
    topic: '7. Sınıf Matematik Tüm Konuları',
    title: '2026-2027 7. Sınıf Matematik Tüm Konuları ve MEB Müfredat Rehberi',
    slug: '7-sinif-matematik-tum-konulari-ve-mufredat-rehberi',
    metaTitle: '2026-2027 7. Sınıf Matematik Tüm Konuları & Ders Notları',
    metaDescription: '7. Sınıf matematik 1. ve 2. dönem tüm üniteleri: Tam sayılar, rasyonel sayılar, cebirsel ifadeler, denklem kurma, oran orantı ve geometri.',
    excerpt: '7. Sınıf matematik dersinin LGS hazırlık temeli oluşturan tüm konuları, rasyonel sayılar, denklemler, yüzdeler ve çokgenler rehberi.',
    targetKeyword: '7 sınıf matematik tüm konuları',
    secondaryKeywords: ['7 sınıf matematik müfredatı 2026 2027', '7 sınıf denklem kurma', '7 sınıf oran orantı konuları'],
    content: `
      <h2>2026-2027 7. Sınıf Matematik Tüm Konuları Rehberi</h2>
      <p>LGS maratonundan hemen önceki viraj olan 7. sınıf matematik, <strong>Denklem Kurma</strong> ve <strong>Oran-Orantı</strong> mantığının oturtulduğu en hayati sınıftır.</p>

      <h3>1. Dönem Üniteleri</h3>
      <ul>
        <li><strong>1. Ünite: Tam Sayılarla İşlemler</strong> (Tam sayılarda toplama, çıkarma, çarpma, bölme ve üslü nicelikler)</li>
        <li><strong>2. Ünite: Rasyonel Sayılar ve İşlemler</strong> (Rasyonel sayıları sayı doğrusunda gösterme, ondalık açınım, rasyonel sayılarla dört işlem)</li>
        <li><strong>3. Ünite: Cebirsel İfadeler, Eşitlik ve Denklem</strong> (Cebirsel ifadelerle toplama-çıkarma, 1. dereceden 1 bilinmeyenli denklemler ve denklem kurma problemleri)</li>
      </ul>

      <h3>2. Dönem Üniteleri</h3>
      <ul>
        <li><strong>4. Ünite: Oran ve Orantı, Yüzdeler</strong> (Doğru ve ters orantı, orantı sabiti, yüzde hesapları, kâr-zarar problemleri)</li>
        <li><strong>5. Ünite: Doğrular ve Açılar, Çokgenler, Çember ve Daire</strong> (Açıortay, paralel doğruların kestiği açılar, düzgün çokgenler, daire diliminin alanı)</li>
        <li><strong>6. Ünite: Veri İşleme ve Cisimlerin Görünümü</strong> (Çizgi grafiği, daire grafiği, ortanca, tepe değer, 3 boyutlu cisim görünümü)</li>
      </ul>
    `,
    faq: [
      { question: '7. sınıf matematik LGS için ne kadar önemli?', answer: '7. sınıftaki Denklem Kurma ve Oran-Orantı konuları LGS Matematik sorularının %60\'ının temel mantığını oluşturur.' }
    ],
    internalLinks: [
      { anchorText: '7. Sınıf Derslerimiz', targetUrl: '/derslerimiz' }
    ]
  },

  {
    grade: '8',
    topic: '8. Sınıf LGS Matematik Tüm Konuları',
    title: '2026-2027 8. Sınıf LGS Matematik Tüm Konuları ve Konu Dağılımı Rehberi',
    slug: '8-sinif-lgs-matematik-tum-konulari-ve-lgs-mufredati',
    metaTitle: '2026-2027 8. Sınıf LGS Matematik Tüm Konuları | LGS Konu Dağılımı',
    metaDescription: '8. Sınıf LGS matematik tüm konuları, LGS 2027 çıkmış soru dağılımları, yeni nesil soru çözme taktikleri ve derece çalışma programı.',
    excerpt: 'LGS 2027 şampiyonlarının rehberi: 8. sınıf matematik EBOB-EKOK, karekök, olasılık, denklem, eşitsizlik ve geometri konularının tamamı.',
    targetKeyword: '8 sınıf lgs matematik tüm konuları',
    secondaryKeywords: ['lgs matematik konuları 2027', 'lgs 2027 matematik müfredatı', '8 sınıf lgs matematik konu dağılımı'],
    content: `
      <h2>2026-2027 LGS Matematik Tüm Konuları ve Soru Dağılımı</h2>
      <p>LGS hazırlığında başarılı olmanın ilk kuralı, sınavda karşılaşacağınız 20 matematik sorusunun hangi ünitelerden geleceğini bilmektir.</p>

      <h3>LGS Matematik Ünite Ünite Tam Liste</h3>
      <ol>
        <li><strong>Çarpanlar ve Katlar</strong> (EBOB-EKOK problemleri, aralarında asal sayılar)</li>
        <li><strong>Üslü İfadeler</strong> (Ondalık çözümleme, çok büyük ve çok küçük sayılar, bilimsel gösterim)</li>
        <li><strong>Kareköklü İfadeler</strong> (Tam kare sayılar, a√b şeklinde yazma, kareköklü ifadelerde dört işlem, gerçek sayılar)</li>
        <li><strong>Veri Analizi</strong> (Çizgi, sütun ve daire grafiği dönüşümleri)</li>
        <li><strong>Basit Olayların Olma Olasılığı</strong> (Olası durumlar, eşit şans, imkansız ve kesin olaylar)</li>
        <li><strong>Cebirsel İfadeler ve Özdeşlikler</strong> (Cebirsel ifadelerle çarpma, özdeşlikler, çarpanlara ayırma)</li>
        <li><strong>Doğrusal Denklemler</strong> (Eğim, doğru grafikleri, 1. dereceden denklemler ve problemleri)</li>
        <li><strong>Eşitsizlikler</strong> (Eşitsizlik sembolleri, eşitsizlik çözümü ve sayı doğrusunda gösterme)</li>
        <li><strong>Üçgenler</strong> (Açıortay, kenarortay, yükseklik, üçgen eşitsizliği, Pisagor bağıntısı)</li>
        <li><strong>Eşlik ve Benzerlik</strong> (Benzerlik oranı, eşlik sembolleri)</li>
        <li><strong>Dönüşüm Geometrisi ve Geometrik Cisimler</strong> (Yansıma, öteleme, dik prizmalar, dik piramit ve dik koni)</li>
      </ol>
    `,
    faq: [
      { question: 'LGS Matematik sorularında en çok hangi üniteden soru gelir?', answer: 'Genellikle Kareköklü İfadeler, Doğrusal Denklemler ve Cebirsel İfadeler ünitesinden 3\'er 4\'er soru gelmektedir.' }
    ],
    internalLinks: [
      { anchorText: '8. Sınıf LGS PDF Notları', targetUrl: '/pdf-notlar' },
      { anchorText: 'LGS Canlı Hazırlık Kursu', targetUrl: '/kontenjan-kurslari' }
    ]
  },

  {
    grade: '10',
    topic: '10. Sınıf Matematik Tüm Konuları',
    title: '2026-2027 10. Sınıf Matematik Tüm Konuları ve MEB Müfredat Rehberi',
    slug: '10-sinif-matematik-tum-konulari-ve-mufredat-rehberi',
    metaTitle: '2026-2027 10. Sınıf Matematik Tüm Konuları & Müfredat Özeti',
    metaDescription: '10. Sınıf matematik tüm üniteleri: Permütasyon, kombinasyon, olasılık, fonksiyonlar, polinomlar, 2. derece denklemler, çokgenler ve katı cisimler.',
    excerpt: '2026-2027 YKS hazırlığının temeli 10. sınıf matematik dersinin tüm 1. ve 2. dönem üniteleri, fonksiyonlar ve polinomlar konu rehberi.',
    targetKeyword: '10 sınıf matematik tüm konuları',
    secondaryKeywords: ['10 sınıf matematik müfredatı 2026 2027', '10 sınıf fonksiyonlar konuları', '10 sınıf polinomlar konu anlatımı'],
    content: `
      <h2>2026-2027 10. Sınıf Matematik Tüm Konuları Rehberi</h2>
      <p>Lisenin 2. yılında işlenen 10. sınıf matematik konuları hem okul yazılılarında hem de ÖSYM'nin YKS (TYT-AYT) sınavlarında doğrudan sorulur.</p>

      <h3>1. Dönem Üniteleri</h3>
      <ul>
        <li><strong>1. Ünite: Sayma ve Olasılık</strong> (Toplama ve çarpma yoluyla sayma, Permütasyon, Kombinasyon, Binom Açılımı, Koşullu Olasılık)</li>
        <li><strong>2. Ünite: Fonksiyonlar</strong> (Fonksiyon tanımı, etki alanı, görüntü kümesi, fonksiyon türleri, bileşke ve ters fonksiyon)</li>
        <li><strong>3. Ünite: Polinomlar</strong> (Polinom kavramı, polinomlarda 4 işlem, bölme kuralı, Kalan Teoremi, çarpanlara ayırma yöntemleri)</li>
      </ul>

      <h3>2. Dönem Üniteleri</h3>
      <ul>
        <li><strong>4. Ünite: İkinci Dereceden Denklemler</strong> (Karmaşık sayılara giriş, diskriminant Δ hesabı, kök-katsayı bağıntıları)</li>
        <li><strong>5. Ünite: Dörtgenler ve Çokgenler</strong> (Çokgenlerin açı ve alan özellikleri, deltoid, paralelkenar, eşkenar dörtgen, dikdörtgen, kare, yamuk)</li>
        <li><strong>6. Ünite: Uzay Geometri (Katı Cisimler)</strong> (Prizmalar ve piramitlerin yüzey alanı ve hacim hesapları)</li>
      </ul>
    `,
    faq: [
      { question: '10. sınıf matematiğin TYT ve AYT\'deki ağırlığı nedir?', answer: 'Fonksiyonlar, Polinomlar ve İkinci Dereceden Denklemler her yıl TYT ve AYT\'de toplam 6-8 soru oluşturur.' }
    ],
    internalLinks: [
      { anchorText: '10. Sınıf Notları', targetUrl: '/pdf-notlar' }
    ]
  },

  {
    grade: '11',
    topic: '11. Sınıf Matematik Tüm Konuları',
    title: '2026-2027 11. Sınıf Matematik Tüm Konuları ve AYT Müfredat Rehberi',
    slug: '11-sinif-matematik-tum-konulari-ve-mufredat-rehberi',
    metaTitle: '2026-2027 11. Sınıf Matematik Tüm Konuları & AYT Ders Rehberi',
    metaDescription: '11. Sınıf matematik tüm konuları: Trigonometri, analitik geometri, fonksiyon uygulamaları, denklem sistemleri, çember daire ve olasılık.',
    excerpt: 'AYT 2027 sınavının en ağırlıklı müfredatı: 11. sınıf matematik Trigonometri formülleri, analitik geometri, parabola ve çember analitiği rehberi.',
    targetKeyword: '11 sınıf matematik tüm konuları',
    secondaryKeywords: ['11 sınıf matematik müfredatı 2026 2027', '11 sınıf ayt konuları', '11 sınıf trigonometri ve analitik'],
    content: `
      <h2>2026-2027 11. Sınıf Matematik Tüm Konuları ve AYT Rehberi</h2>
      <p>Sayısal ve Eşit Ağırlık öğrencilerinin AYT derecesini belirleyen en kritik yıl 11. sınıftır.</p>

      <h3>1. Dönem Üniteleri</h3>
      <ul>
        <li><strong>1. Ünite: Trigonometri</strong> (Yönlü açılar, birim çember, trigonometrik fonksiyonlar, sinüs-kosinüs teoremleri, trigonometrik grafikler, ters trigonometrik fonksiyonlar)</li>
        <li><strong>2. Ünite: Analitik Geometri</strong> (Noktanın analitiği, doğrunun analitik incelenmesi, doğrunun eğimi, iki doğru arasındaki açı ve uzaklık)</li>
        <li><strong>3. Ünite: Fonksiyonlarda Uygulamalar</strong> (Fonksiyonların grafikleri, artan-azalanlık, tepe noktası, parabol denklemi ve dönüşümler)</li>
      </ul>

      <h3>2. Dönem Üniteleri</h3>
      <ul>
        <li><strong>4. Ünite: Denklem ve Eşitsizlik Sistemleri</strong> (İkinci dereceden iki bilinmeyenli denklem sistemleri, ikinci dereceden eşitsizlikler ve işaret tablosu)</li>
        <li><strong>5. Ünite: Çember ve Daire</strong> (Çemberde açılar, kiriş-teğet özellikleri, dairede çevre ve alan hesapları)</li>
        <li><strong>6. Ünite: Uzay Geometri ve Olasılık</strong> (Küre, dik dairesel silindir, dik dairesel koni, bileşik olayların olasılığı)</li>
      </ul>
    `,
    faq: [
      { question: '11. sınıf matematik konuları AYT\'de kaç soru yaptırır?', answer: 'Trigonometri ve Analitik Geometri tek başına AYT Matematik\'te 8-10 net kazandırır.' }
    ],
    internalLinks: [
      { anchorText: '11. Sınıf Canlı Kursu', targetUrl: '/kontenjan-kurslari' }
    ]
  },

  {
    grade: '12',
    topic: '12. Sınıf AYT Matematik Tüm Konuları',
    title: '2026-2027 12. Sınıf AYT Matematik Tüm Konuları ve YKS Müfredat Rehberi',
    slug: '12-sinif-ayt-matematik-tum-konulari-ve-yks-mufredati',
    metaTitle: '2026-2027 12. Sınıf AYT Matematik Tüm Konuları | YKS Derece Rehberi',
    metaDescription: '12. Sınıf AYT matematik tüm konuları: Logaritma, diziler, toplam-fark formülleri, limit, süreklilik, türev, integral ve çemberin analitiği.',
    excerpt: 'YKS 2027 derece hedefleyenler için 12. sınıf AYT matematik konuları, türev-integral çalışma planı ve sınav taktikleri rehberi.',
    targetKeyword: '12 sınıf ayt matematik tüm konuları',
    secondaryKeywords: ['12 sınıf ayt matematik müfredatı 2026 2027', 'yks 2027 ayt matematik konuları', '12 sınıf turev integral logaritma'],
    content: `
      <h2>2026-2027 12. Sınıf AYT Matematik Tüm Konuları Rehberi</h2>
      <p>YKS Maratonunun zirve noktası olan 12. sınıf AYT matematik müfredatı, yüksek öğretimde mühendislik, tıp ve iktisat hedeflerinin belirleyicisidir.</p>

      <h3>1. Dönem Üniteleri</h3>
      <ul>
        <li><strong>1. Ünite: Üstel ve Logaritmik Fonksiyonlar</strong> (Üstel fonksiyon, logaritma fonksiyonu özellikleri, logaritmik denklemler ve eşitsizlikler)</li>
        <li><strong>2. Ünite: Diziler</strong> (Gerçek sayı dizileri, aritmetik dizi, geometrik dizi ve toplam sembolü)</li>
        <li><strong>3. Ünite: Trigonometri II</strong> (Toplam-fark formülleri, iki kat açı formülleri, trigonometrik denklemler)</li>
        <li><strong>4. Ünite: Limit ve Süreklilik</strong> (Sağdan-soldan limit, belirsizlik durumları, fonksiyonlarda süreklilik şartı)</li>
      </ul>

      <h3>2. Dönem Üniteleri</h3>
      <ul>
        <li><strong>5. Ünite: Türev</strong> (Türev tanımı, türev alma kuralları, zincir kuralı, teğet ve normal denklemi, artan-azalanlık, ekstremum noktalar, maksimum-minimum problemleri)</li>
        <li><strong>6. Ünite: İntegral</strong> (Belirsiz integral, değişken değiştirme yöntemi, belirli integral, eğri altında kalan alan hesapları)</li>
        <li><strong>7. Ünite: Çemberin Analitik İncelenmesi</strong> (Çemberin standart ve genel denklemi, doğru ile çemberin durumları)</li>
      </ul>
    `,
    faq: [
      { question: 'AYT Matematikte Türev ve İntegral kaç soru getirir?', answer: 'Türev ve İntegral konuları AYT Matematik testinde her yıl toplam 9-10 soru oluşturur.' }
    ],
    internalLinks: [
      { anchorText: 'AYT Matematik Derece Kampı', targetUrl: '/camps' },
      { anchorText: 'Tüm PDF Notlar', targetUrl: '/pdf-notlar' }
    ]
  }
];

/**
 * Main publisher script to create 5-12 grade lecture blogs
 */
async function publishAllGradeBlogs() {
  const db = getPrisma();
  console.log('[Grade Blog Publisher] Starting publishing for grades 5 to 12...');

  let publishedCount = 0;
  let skippedCount = 0;
  const results = [];

  // Update any test teacher user name in DB to "Burak Çelik"
  try {
    await db.user.updateMany({
      where: {
        OR: [
          { name: { contains: 'Test', mode: 'insensitive' } },
          { email: { contains: 'test' } }
        ]
      },
      data: { name: 'Burak Çelik' }
    });
  } catch (uErr) {
    console.warn('[Grade Blog Publisher] User update warning:', uErr.message);
  }

  // Find head teacher user to assign as author
  let author = await db.user.findFirst({ where: { role: 'HEAD_TEACHER' } });
  if (!author) {
    author = await db.user.findFirst({ where: { role: 'TEACHER' } });
  }
  if (!author) {
    author = await db.user.findFirst();
  }

  const authorId = author ? author.id : 1;

  for (const item of GRADE_BLOGS) {
    try {
      // Check duplicate slug or target keyword
      const existing = await db.blogPost.findFirst({
        where: {
          OR: [
            { slug: item.slug },
            { targetKeyword: item.targetKeyword }
          ]
        }
      });

      if (existing) {
        console.log(`[Grade Blog Publisher] Skipping existing blog post: "${item.title}" (${item.slug})`);
        skippedCount++;
        results.push({ title: item.title, grade: item.grade, status: 'SKIPPED_EXISTING' });
        continue;
      }

      // Create new blog post
      const blogPost = await db.blogPost.create({
        data: {
          title: item.title,
          slug: item.slug,
          content: item.content,
          excerpt: item.excerpt,
          metaTitle: item.metaTitle,
          metaDescription: item.metaDescription,
          targetKeyword: item.targetKeyword,
          secondaryKeywords: JSON.stringify(item.secondaryKeywords),
          faq: JSON.stringify(item.faq),
          grade: item.grade,
          topic: item.topic,
          internalLinks: JSON.stringify(item.internalLinks),
          authorId
        }
      });

      publishedCount++;
      const fullUrl = `https://fullematematigi.com.tr/blog/${blogPost.slug}`;

      // Submit to Google Indexing API & Sitemap API
      submitUrlToGoogleIndexingApi(fullUrl).catch(e => console.warn('[Auto Indexing Warning]:', e.message));
      submitSitemapToGoogleSearchConsole('https://fullematematigi.com.tr/sitemap.xml').catch(e => console.warn('[Auto Sitemap Warning]:', e.message));

      console.log(`[Grade Blog Publisher] Successfully published grade ${item.grade} blog: "${blogPost.title}"`);
      results.push({ title: blogPost.title, grade: item.grade, slug: blogPost.slug, status: 'PUBLISHED' });
    } catch (err) {
      console.error(`[Grade Blog Publisher Error] Failed grade ${item.grade}:`, err.message);
      results.push({ title: item.title, grade: item.grade, status: 'ERROR', error: err.message });
    }
  }

  return {
    success: true,
    publishedCount,
    skippedCount,
    totalCount: GRADE_BLOGS.length,
    results
  };
}

module.exports = {
  GRADE_BLOGS,
  publishAllGradeBlogs
};
