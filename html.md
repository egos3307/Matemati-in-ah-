<!-- Matematiğin Şahı - Ücretsiz Tanışma Dersi Ekli -->
<!DOCTYPE html>

<html lang="tr"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#ff8c00",
                        "background-light": "#f8f7f5",
                        "background-dark": "#231a0f",
                    },
                    fontFamily: {
                        "display": ["Lexend", "sans-serif"]
                    },
                    borderRadius: {"DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
<div class="relative flex min-h-screen flex-col overflow-x-hidden">
<!-- Navigation Bar -->
<header class="sticky top-0 z-50 w-full border-b border-primary/10 bg-background-light/80 backdrop-blur-md dark:bg-background-dark/80">
<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
<div class="flex items-center gap-3">
<div class="flex h-10 w-10 items-center justify-center rounded bg-primary text-white">
<span class="material-symbols-outlined">functions</span>
</div>
<h2 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Matematiğin Şahı</h2>
</div>
<nav class="hidden flex-1 justify-center gap-10 md:flex">
<a class="text-sm font-semibold transition-colors hover:text-primary" href="#ana-sayfa">Ana Sayfa</a>
<a class="text-sm font-semibold transition-colors hover:text-primary" href="#ozellikler">Özellikler</a>
<a class="text-sm font-semibold transition-colors hover:text-primary" href="#referanslar">Referanslar</a>
<a class="text-sm font-semibold transition-colors hover:text-primary" href="#iletisim">İletişim</a>
</nav>
<div class="flex items-center gap-4">
<button class="hidden text-sm font-bold md:block">Giriş Yap</button>
<button class="flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90">
                        Hemen Başla
                    </button>
</div>
</div>
</header>
<main class="flex-1">
<!-- Hero Section -->
<section class="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-24" id="ana-sayfa">
<div class="grid items-center gap-12 lg:grid-cols-2">
<div class="flex flex-col gap-8">
<div class="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary"><span class="material-symbols-outlined text-sm">star</span><span>İlk Dersin Bizden: Ücretsiz Tanışma Dersi</span></div>
<h1 class="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white lg:text-7xl">
                            Matematiği Full'e, <span class="text-primary">Hedeflerine Ulaş!</span>
</h1>
<p class="text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                            Uzman hocalar eşliğinde matematik korkunu yen, temelini sağlamlaştır ve sınavda hayalindeki başarıyı yakala. Sana özel çalışma planıyla her şey daha kolay.
                        </p>
<div class="flex flex-col gap-4 sm:flex-row">
<button class="flex h-14 items-center justify-center rounded-full bg-primary px-8 text-lg font-bold text-white shadow-xl shadow-primary/30 transition-transform hover:scale-105">
                                Ücretsiz Deneme Dersi
                            </button>
<button class="flex h-14 items-center justify-center gap-2 rounded-full border-2 border-primary/20 px-8 text-lg font-bold text-primary hover:bg-primary/5">
<span class="material-symbols-outlined">play_circle</span>
                                Tanıtım Videosu
                            </button>
</div><div class="mt-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
<span class="material-symbols-outlined text-primary mt-0.5">info</span>
<div>
<p class="text-sm font-bold text-slate-900 dark:text-white">Ücretsiz Tanışma Dersi Nedir?</p>
<p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Sistemi yakından tanımak ve hocalarımızla tanışmak için ilk dersinizi tamamen ücretsiz olarak planlayabilirsiniz. Hiçbir taahhüt gerekmez.
        </p>
</div>
</div>
<div class="flex items-center gap-4 text-sm font-medium">
<div class="flex -space-x-3">
<img class="h-10 w-10 rounded-full border-2 border-background-light" data-alt="Öğrenci profil resmi" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnAiGoddDvlIvJ8Clx7NF9ePXJUD9uDpaS5ki0DFVWLUHQiS2KxkehRK_gpYuLUZtNbfCJxU62v7QxLKm7MNCdcslnEbkAUs73X7Bd_pqYThFsh4-cti2VpiVI4ny2oWURk4SdGxYHjEIAAZyj38cBsX0u7SO7npHfVRoK2cYs8rzL27oPW1HeMm-w1s-OkMzpGyCMObwwflnz4JhaHzjADW7jBtzKxfnuDtY7hAFW8AtrlaOZH9yK2_9_cDQn9Zcffihutsrq_9Dq"/>
<img class="h-10 w-10 rounded-full border-2 border-background-light" data-alt="Öğrenci profil resmi 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjG_5OVZ-NS0Sgcb3YVEnmjYtAIh7OCG6Hkv77H2OkuJMX1hn6Lcuy8pSY3_g-2J3KHLO4qk7F9HgJqRX9KUevA9Lf8o8eOUVE1jFOG7f4ULmlKSEtUor7N1s2nB6xLxs8UoTuEeohas02iWXMSmb_zkTY420E96jV9OuUm-LdnyZhOwcMFNB83zv44TkcM-8NYcC5WbGZRbQ7L8en5c5v3_A-KYLEPK_lSY7vm-PUyrhpoHiADd72qVOci7M7JvW8cP8CG4yq5XGW"/>
<img class="h-10 w-10 rounded-full border-2 border-background-light" data-alt="Öğrenci profil resmi 3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCi99BX7Aty_5aWZJJEiSD5r6ElqNu5nUHK4JD7xxQuQ5sDpvURAKGDJpUIhIr3nk0yY6XLLz7hjuaWScoZpmauna-fdH2nWwy0SFY3KE114JVOXrhh8ZxSTtG-A2mx0FULsFLLyO96QX-OILAvacwh6REjtp8JegPli2NMu4zZXoYxOWmu3Hu1B25YZx6qAlkV2W74TCNj0Mnb_f961MwlB0r8mru7Iybcpfij5bMbLdwNB7eQwc-qXt1FdxFDQAZi__cxmyZ2emQr"/>
</div>
<p>+2000 Öğrenci Başarıya Ulaştı</p>
</div>
</div>
<div class="relative">
<div class="absolute -inset-4 rounded-xl bg-primary/10 blur-3xl"></div>
<div class="relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800 shadow-2xl">
<img alt="Mutlu bir öğrenci matematik çalışıyor" class="h-full w-full object-cover object-top" data-alt="Bir laptop ve not defteri ile çalışan mutlu bir öğrenci, enerjik atmosfer" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_ZlJ4kHJVvj4QA0WXLw7AgdA_Q4upxVf80LEP-Sk-rW7DMI0BwTYI8pL0bCIQAjfHQHvVgFxg5k0dqUF7u7s6BNpUQLv73-Vw1QYu0xIIctm8j0vCcvpZlcoOZYbtqks2qNgkzkN6LBCUZkRJFbRhkzBzn2KUoA0VYe5dG2RCBp9NnHEBShOi03NyMp4uqgkNGOXB2zI_AymzY4AEtm8JBFi8Js9gw7cMHgJ7K3a-oQwiOIvAFZ_HQvOtfPZgok9DT4vMBk4ff888"/>
</div>
</div>
</div>
</section>
<!-- Stats Section -->
<section class="bg-primary px-6 py-12 text-white">
<div class="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
<div class="text-center">
<p class="text-4xl font-black">98%</p>
<p class="text-sm font-medium opacity-80">Başarı Oranı</p>
</div>
<div class="text-center">
<p class="text-4xl font-black">50k+</p>
<p class="text-sm font-medium opacity-80">Çözülen Soru</p>
</div>
<div class="text-center">
<p class="text-4xl font-black">150+</p>
<p class="text-sm font-medium opacity-80">Uzman Eğitmen</p>
</div>
<div class="text-center">
<p class="text-4xl font-black">7/24</p>
<p class="text-sm font-medium opacity-80">Canlı Destek</p>
</div>
</div>
</section>
<!-- Features Section -->
<section class="mx-auto max-w-7xl px-6 py-24 lg:px-10" id="ozellikler">
<div class="mb-16 flex flex-col items-center text-center">
<h2 class="mb-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">Neden Matematiğin Şahı?</h2>
<p class="max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                        Geleneksel eğitim metodlarını bir kenara bırakın. Teknoloji ve uzmanlığın birleştiği noktada en verimli öğrenme deneyimini yaşayın.
                    </p>
</div>
<div class="grid gap-8 md:grid-cols-3">
<div class="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl dark:bg-slate-800/50">
<div class="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/20 text-primary">
<span class="material-symbols-outlined text-3xl">video_camera_front</span>
</div>
<h3 class="text-xl font-bold">Canlı Dersler</h3>
<p class="text-slate-600 dark:text-slate-400">Haftalık belirlenen saatlerde interaktif sınıflarda hocalarımıza anında soru sorma ve konu tekrarı yapma imkanı.</p>
</div>
<div class="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl dark:bg-slate-800/50">
<div class="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/20 text-primary">
<span class="material-symbols-outlined text-3xl">person_search</span>
</div>
<h3 class="text-xl font-bold">Birebir Takip</h3>
<p class="text-slate-600 dark:text-slate-400">Her öğrenciye atanan eğitim koçu ile gelişiminiz adım adım izlenir, zayıf noktalarınıza özel çalışma programı hazırlanır.</p>
</div>
<div class="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl dark:bg-slate-800/50">
<div class="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/20 text-primary">
<span class="material-symbols-outlined text-3xl">play_circle</span>
</div>
<h3 class="text-xl font-bold">Soru Çözüm Videoları</h3>
<p class="text-slate-600 dark:text-slate-400">Binlerce sorunun detaylı, püf noktalarıyla anlatıldığı video kütüphanemize 7/24 sınırsız erişim sağlayın.</p>
</div>
</div>
</section>
<!-- Testimonials Section -->
<section class="bg-primary/5 py-24" id="referanslar">
<div class="mx-auto max-w-7xl px-6 lg:px-10">
<h2 class="mb-12 text-center text-3xl font-black text-slate-900 dark:text-white">Başarı Hikayeleri</h2>
<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
<div class="flex flex-col gap-6 rounded-xl bg-white p-8 shadow-sm dark:bg-slate-800">
<div class="flex gap-1 text-primary">
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
</div>
<p class="italic text-slate-700 dark:text-slate-300">"Sınava 3 ay kala başladım. Matematik netlerim 10'dan 35'e çıktı. Gerçekten hocalarımızın anlatımı çok akılda kalıcı."</p>
<div class="flex items-center gap-4 border-t border-slate-100 pt-6 dark:border-slate-700">
<div class="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
<img alt="Öğrenci" data-alt="Erkek öğrenci vesikalık fotoğraf" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpj_A2wyNBbT1czLtCL58R3ZmrkQG1nzxbzmh53yYEjg-R3hsYM-IJklw5z-8eX9-85CKPvmhP_dSUS5awBxzlcGPACrsJL_3Ha3nueMfP3rnSfl22sOgur7WGP2Fy8_ti-6b7sxw09V1QSvlRWYnJuiCNZ8IWs0TX7AOcyyu2CHPtPcYXm9uvjfHhxjuJRS-kYsq-hu3BZjc0oa_19hhpbQgq9UtMZ4BIKFqPvoJSZcfPg77Znd8GY6NsyiZa9Msw-RBsrgCtvw2Q"/>
</div>
<div>
<p class="font-bold">Ahmet Yılmaz</p>
<p class="text-sm text-slate-500">Tıp Fakültesi Öğrencisi</p>
</div>
</div>
</div>
<div class="flex flex-col gap-6 rounded-xl bg-white p-8 shadow-sm dark:bg-slate-800">
<div class="flex gap-1 text-primary">
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
</div>
<p class="italic text-slate-700 dark:text-slate-300">"Soru çözüm videoları hayatımı kurtardı. Anlamadığım her detayı tekrar tekrar izleyebilmek büyük bir lüks."</p>
<div class="flex items-center gap-4 border-t border-slate-100 pt-6 dark:border-slate-700">
<div class="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
<img alt="Öğrenci" data-alt="Kadın öğrenci vesikalık fotoğraf" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPC-mqlmFzW_uWV_IrXDNmISh9W854L2Etxv_lrk4BMmCKyLDccUvV-feEjuXjDDsp0ccTvKKws1uiAGHLnjCv2BqbTVVEpwS3895jgR1lZKoDjdNgtdwZThzCB0ZjZFIWhd8FQY3pTiXBC5h5dW9Q9uuuQ_Kaoc3b3jpFaYKqktZaWaeyq7FpHS8rE7hk6M50uCzabYkOJAyu53HJgz8rgx4i_6Fh4nmbTS6tVflEz2ljHpZMxPU-PBNIinOWpPtdcgzX4m0HUm2d"/>
</div>
<div>
<p class="font-bold">Selin Kaya</p>
<p class="text-sm text-slate-500">Mühendislik Öğrencisi</p>
</div>
</div>
</div>
<div class="flex flex-col gap-6 rounded-xl bg-white p-8 shadow-sm dark:bg-slate-800">
<div class="flex gap-1 text-primary">
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
<span class="material-symbols-outlined font-fill">star</span>
</div>
<p class="italic text-slate-700 dark:text-slate-300">"Birebir takip sistemi sayesinde disiplin kazandım. Koçumun her hafta verdiği hedefler beni motive etti."</p>
<div class="flex items-center gap-4 border-t border-slate-100 pt-6 dark:border-slate-700">
<div class="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
<img alt="Öğrenci" data-alt="Gözlüklü erkek öğrenci vesikalık" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYgfhb0Wzrow0M8VcbFU8goz132gkFv7W0kUGC4YwTpi4exNQKkFLEmMYre96TFDq26Xi6Qj4j_FSpquHv3SIVDADEodP6v6OVjpDG3sf_OBnDuclQ3FcXw0Ka2K5y42C90pA2OvEd7qSuBvQ3SGzfLn_tUtlsYzNrKrgf7V6M8a0-Wo7tDSIbkgwfLMvxmr9ZSURxbd8by9VORzqEgdmEo5cw8qvQ0NcEjuSGY-aAEep8mUPdQFphuxb7DiyOpfzuTgNQmnT7aXRs"/>
</div>
<div>
<p class="font-bold">Mert Demir</p>
<p class="text-sm text-slate-500">Lise 12. Sınıf</p>
</div>
</div>
</div>
</div>
</div>
</section>
<!-- Contact Form Section -->
<section class="mx-auto max-w-7xl px-6 py-24 lg:px-10" id="iletisim">
<div class="flex flex-col overflow-hidden rounded-xl border border-primary/10 bg-white shadow-2xl dark:bg-slate-900 lg:flex-row">
<div class="flex flex-col justify-center bg-primary p-12 text-white lg:w-2/5">
<h2 class="mb-6 text-3xl font-black">Soruların mı var?</h2>
<p class="mb-10 text-white/80">Sana en uygun eğitim paketini birlikte seçelim. Formu doldur, uzman ekibimiz en kısa sürede seni arasın.</p>
<div class="flex flex-col gap-6">
<div class="flex items-center gap-4">
<span class="material-symbols-outlined">mail</span>
<span>bilgi@matematikinsahi.com</span>
</div>
<div class="flex items-center gap-4">
<span class="material-symbols-outlined">call</span>
<span>+90 (555) 123 45 67</span>
</div>
<div class="flex items-center gap-4">
<span class="material-symbols-outlined">location_on</span>
<span>Beşiktaş, İstanbul</span>
</div>
</div>
</div>
<form class="flex flex-col gap-6 p-12 lg:w-3/5">
<div class="grid gap-6 md:grid-cols-2">
<div class="flex flex-col gap-2">
<label class="text-sm font-bold">Adınız Soyadınız</label>
<input class="rounded-lg border-primary/20 bg-primary/5 focus:border-primary focus:ring-primary" placeholder="Örn: Ali Yılmaz" type="text"/>
</div>
<div class="flex flex-col gap-2">
<label class="text-sm font-bold">Telefon Numaranız</label>
<input class="rounded-lg border-primary/20 bg-primary/5 focus:border-primary focus:ring-primary" placeholder="05XX XXX XX XX" type="tel"/>
</div>
</div>
<div class="flex flex-col gap-2">
<label class="text-sm font-bold">E-posta Adresiniz</label>
<input class="rounded-lg border-primary/20 bg-primary/5 focus:border-primary focus:ring-primary" placeholder="ali@örnek.com" type="email"/>
</div>
<div class="flex flex-col gap-2">
<label class="text-sm font-bold">Mesajınız (Opsiyonel)</label>
<textarea class="rounded-lg border-primary/20 bg-primary/5 focus:border-primary focus:ring-primary" placeholder="Size nasıl yardımcı olabiliriz?" rows="4"></textarea>
</div>
<button class="w-fit rounded-full bg-primary px-10 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-xl" type="submit">
                            Beni Arayın
                        </button>
</form>
</div>
</section>
</main>
<!-- Footer -->
<footer class="bg-slate-900 px-6 py-12 text-slate-400 dark:bg-black">
<div class="mx-auto max-w-7xl lg:px-10">
<div class="grid gap-12 border-b border-slate-800 pb-12 md:grid-cols-4">
<div class="col-span-2 flex flex-col gap-6">
<div class="flex items-center gap-3 text-white">
<div class="flex h-10 w-10 items-center justify-center rounded bg-primary text-white">
<span class="material-symbols-outlined">functions</span>
</div>
<h2 class="text-xl font-bold tracking-tight">Matematiğin Şahı</h2>
</div>
<p class="max-w-md leading-relaxed">
                            Türkiye'nin en interaktif matematik platformu olarak, öğrencilerin hedeflerine ulaşmasında en büyük destekçisiyiz. Kaliteli içerik ve uzman kadromuzla yanınızdayız.
                        </p>
<div class="flex gap-4">
<a class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white transition-colors hover:bg-primary" href="#">
<span class="material-symbols-outlined">social_leaderboard</span>
</a>
<a class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white transition-colors hover:bg-primary" href="#">
<span class="material-symbols-outlined">camera_alt</span>
</a>
<a class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white transition-colors hover:bg-primary" href="#">
<span class="material-symbols-outlined">share</span>
</a>
</div>
</div>
<div>
<h4 class="mb-6 font-bold text-white">Hızlı Linkler</h4>
<ul class="flex flex-col gap-4">
<li><a class="hover:text-primary transition-colors" href="#">Ana Sayfa</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Ders Programı</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Fiyatlandırma</a></li>
<li><a class="hover:text-primary transition-colors" href="#">SSS</a></li>
</ul>
</div>
<div>
<h4 class="mb-6 font-bold text-white">Kurumsal</h4>
<ul class="flex flex-col gap-4">
<li><a class="hover:text-primary transition-colors" href="#">Hakkımızda</a></li>
<li><a class="hover:text-primary transition-colors" href="#">Kariyer</a></li>
<li><a class="hover:text-primary transition-colors" href="#">KVKK</a></li>
<li><a class="hover:text-primary transition-colors" href="#">İletişim</a></li>
</ul>
</div>
</div>
<div class="flex flex-col items-center justify-between gap-6 pt-12 md:flex-row">
<p class="text-sm">© 2024 Matematiğin Şahı. Tüm hakları saklıdır.</p>
<div class="flex gap-8 text-sm">
<a class="hover:text-white transition-colors" href="#">Gizlilik Politikası</a>
<a class="hover:text-white transition-colors" href="#">Kullanım Şartları</a>
</div>
</div>
</div>
</footer>
</div>
</body></html>

<!-- Yönetim Paneli -->
<!DOCTYPE html>

<html lang="tr"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#ff8c00",
                        "background-light": "#f8f7f5",
                        "background-dark": "#231a0f",
                    },
                    fontFamily: {
                        "display": ["Lexend"]
                    },
                    borderRadius: {"DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
        body {
            font-family: 'Lexend', sans-serif;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
<div class="flex min-h-screen">
<!-- Side Navigation -->
<aside class="w-72 border-r border-primary/10 bg-white dark:bg-background-dark/50 p-6 flex flex-col gap-8">
<div class="flex items-center gap-3 px-2">
<div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
<span class="material-symbols-outlined text-2xl">functions</span>
</div>
<div>
<h1 class="text-lg font-bold leading-none">Matematiğin Şahı</h1>
<p class="text-xs text-primary font-medium">Öğretmen Paneli</p>
</div>
</div>
<nav class="flex flex-col gap-2">
<a class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-medium" href="#">
<span class="material-symbols-outlined">grid_view</span>
<span>Dashboard</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-400 font-medium" href="#">
<span class="material-symbols-outlined">group</span>
<span>Öğrencilerim</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-400 font-medium" href="#">
<span class="material-symbols-outlined">add_circle</span>
<span>Yeni Ders Oluştur</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-400 font-medium" href="#">
<span class="material-symbols-outlined">calendar_month</span>
<span>Takvim</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-400 font-medium" href="#">
<span class="material-symbols-outlined">settings</span>
<span>Ayarlar</span>
</a>
</nav>
<div class="mt-auto p-4 bg-primary/5 rounded-xl border border-primary/10">
<p class="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Destek</p>
<p class="text-sm text-slate-500 mb-3">Yardıma mı ihtiyacınız var?</p>
<button class="w-full py-2 bg-white dark:bg-slate-800 border border-primary/20 text-primary text-sm font-bold rounded-lg hover:bg-primary hover:text-white transition-all">
                Rehber Al
            </button>
</div>
</aside>
<!-- Main Content -->
<main class="flex-1 flex flex-col h-screen overflow-y-auto">
<!-- Top Header -->
<header class="h-20 border-b border-primary/5 flex items-center justify-between px-8 bg-white/50 dark:bg-background-dark/30 backdrop-blur-sm sticky top-0 z-10">
<div class="flex items-center gap-4">
<h2 class="text-xl font-bold">Hoş Geldiniz, Ahmet Bey</h2>
</div>
<div class="flex items-center gap-6">
<div class="relative w-64">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
<input class="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary/50 text-sm" placeholder="Öğrenci veya ders ara..." type="text"/>
</div>
<div class="flex items-center gap-3">
<button class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 relative">
<span class="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</span>
<span class="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
</button>
<div class="h-10 w-10 rounded-full bg-primary/20 border-2 border-primary overflow-hidden">
<img alt="Teacher profile" class="w-full h-full object-cover" data-alt="Male teacher profile avatar smiling" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNPV5Rmy73oNc6IgdPaiH__IfLlxUlLABPnJ6-nAYyD9ftTxS1V5tZ2e6w8_F2zJeSCWWy9vOJpiNqv0QMy876_ZpZEQ8UdYfvuwg-79O3dXDtpBDJ91hFPrCHHyXT93PhpLjExwEiolkAhJaOUweXTw88jyyOayRIj93hCtML_EQDCZ6DU21p1xtsy3-3AXURNBuOfZSpRo9R9puOwQdIqucMaEqqNT4L2w1zL7hfgSu5UhHgssGJo5tI_EpAYxPxQg3nK2QmvxYp"/>
</div>
</div>
</div>
</header>
<!-- Dashboard Body -->
<div class="p-8 space-y-8">
<!-- Stats Overview -->
<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
<div class="p-6 bg-white dark:bg-slate-800 rounded-xl border border-primary/5 shadow-sm">
<div class="flex items-center justify-between mb-4">
<div class="p-3 bg-primary/10 rounded-lg text-primary">
<span class="material-symbols-outlined">person</span>
</div>
<span class="text-emerald-500 text-xs font-bold">+12%</span>
</div>
<p class="text-slate-500 text-sm font-medium">Toplam Öğrenci</p>
<h3 class="text-2xl font-bold">42</h3>
</div>
<div class="p-6 bg-white dark:bg-slate-800 rounded-xl border border-primary/5 shadow-sm">
<div class="flex items-center justify-between mb-4">
<div class="p-3 bg-blue-500/10 rounded-lg text-blue-500">
<span class="material-symbols-outlined">schedule</span>
</div>
<span class="text-slate-400 text-xs font-bold">Bu Ay</span>
</div>
<p class="text-slate-500 text-sm font-medium">Ders Saati</p>
<h3 class="text-2xl font-bold">128 Sa</h3>
</div>
<div class="p-6 bg-white dark:bg-slate-800 rounded-xl border border-primary/5 shadow-sm">
<div class="flex items-center justify-between mb-4">
<div class="p-3 bg-orange-500/10 rounded-lg text-orange-500">
<span class="material-symbols-outlined">assignment_turned_in</span>
</div>
<span class="text-emerald-500 text-xs font-bold">85% Başarı</span>
</div>
<p class="text-slate-500 text-sm font-medium">Ödev Tamamlama</p>
<h3 class="text-2xl font-bold">342</h3>
</div>
<div class="p-6 bg-primary rounded-xl shadow-lg shadow-primary/20 flex flex-col justify-between">
<h3 class="text-white font-bold">Hızlı İşlemler</h3>
<div class="grid grid-cols-2 gap-2 mt-4">
<button class="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-all">
<span class="material-symbols-outlined text-lg">add</span>
                            Yeni Ders
                        </button>
<button class="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-all">
<span class="material-symbols-outlined text-lg">edit_note</span>
                            Not Ekle
                        </button>
</div>
</div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
<!-- Upcoming Classes -->
<div class="lg:col-span-2 space-y-4">
<div class="flex items-center justify-between">
<h3 class="text-lg font-bold">Yaklaşan Dersler</h3>
<a class="text-primary text-sm font-bold hover:underline" href="#">Tümünü Gör</a>
</div>
<div class="space-y-3">
<!-- Class Card 1 -->
<div class="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-l-4 border-primary shadow-sm">
<div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-primary">AY</div>
<div class="flex-1">
<h4 class="font-bold text-slate-800 dark:text-slate-100">Ahmet Yılmaz</h4>
<p class="text-xs text-slate-500">TYT Matematik - Fonksiyonlar Giriş</p>
</div>
<div class="text-right">
<p class="text-sm font-bold text-primary">14:00</p>
<p class="text-[10px] text-slate-400 uppercase tracking-tighter">45 Dakika</p>
</div>
<button class="p-2 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-colors">
<span class="material-symbols-outlined">arrow_forward_ios</span>
</button>
</div>
<!-- Class Card 2 -->
<div class="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-l-4 border-blue-500 shadow-sm opacity-80">
<div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-blue-500">ZK</div>
<div class="flex-1">
<h4 class="font-bold text-slate-800 dark:text-slate-100">Zeynep Kaya</h4>
<p class="text-xs text-slate-500">AYT Matematik - İntegral II</p>
</div>
<div class="text-right">
<p class="text-sm font-bold text-blue-500">16:30</p>
<p class="text-[10px] text-slate-400 uppercase tracking-tighter">60 Dakika</p>
</div>
<button class="p-2 hover:bg-blue-500/10 rounded-lg text-slate-400 hover:text-blue-500 transition-colors">
<span class="material-symbols-outlined">arrow_forward_ios</span>
</button>
</div>
<!-- Class Card 3 -->
<div class="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-l-4 border-emerald-500 shadow-sm opacity-60">
<div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-emerald-500">MC</div>
<div class="flex-1">
<h4 class="font-bold text-slate-800 dark:text-slate-100">Mert Çelik</h4>
<p class="text-xs text-slate-500">LGS Matematik - Olasılık</p>
</div>
<div class="text-right">
<p class="text-sm font-bold text-emerald-500">Yarın 10:00</p>
<p class="text-[10px] text-slate-400 uppercase tracking-tighter">45 Dakika</p>
</div>
<button class="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors">
<span class="material-symbols-outlined">arrow_forward_ios</span>
</button>
</div>
</div>
</div>
<!-- Student Stats Chart Area (Visual Representation) -->
<div class="space-y-4">
<h3 class="text-lg font-bold">Öğrenci İstatistikleri</h3>
<div class="p-6 bg-white dark:bg-slate-800 rounded-xl border border-primary/5 shadow-sm h-full">
<div class="flex items-center justify-between mb-6">
<p class="text-sm font-medium text-slate-500">Haftalık İlerleme</p>
<select class="text-xs bg-slate-100 dark:bg-slate-700 border-none rounded-lg py-1 px-2 focus:ring-0">
<option>Son 7 Gün</option>
<option>Son 30 Gün</option>
</select>
</div>
<!-- Pseudo-chart bars -->
<div class="flex items-end justify-between h-40 gap-2 mb-4 px-2">
<div class="w-full bg-primary/20 rounded-t-lg h-[40%]"></div>
<div class="w-full bg-primary/40 rounded-t-lg h-[65%]"></div>
<div class="w-full bg-primary/30 rounded-t-lg h-[50%]"></div>
<div class="w-full bg-primary/60 rounded-t-lg h-[85%]"></div>
<div class="w-full bg-primary/40 rounded-t-lg h-[60%]"></div>
<div class="w-full bg-primary rounded-t-lg h-[95%]"></div>
<div class="w-full bg-primary/20 rounded-t-lg h-[30%]"></div>
</div>
<div class="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
<span>Pzt</span>
<span>Sal</span>
<span>Çar</span>
<span>Per</span>
<span>Cum</span>
<span>Cmt</span>
<span>Paz</span>
</div>
<div class="mt-8 space-y-4">
<div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
<div class="flex items-center gap-2">
<div class="w-2 h-2 rounded-full bg-primary"></div>
<span class="text-sm font-medium">Aktif Öğrenciler</span>
</div>
<span class="font-bold">28</span>
</div>
<div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
<div class="flex items-center gap-2">
<div class="w-2 h-2 rounded-full bg-emerald-500"></div>
<span class="text-sm font-medium">Hedefe Ulaşan</span>
</div>
<span class="font-bold">14</span>
</div>
</div>
</div>
</div>
</div>
<!-- Recent Activity / News Feed -->
<div class="p-6 bg-white dark:bg-slate-800 rounded-xl border border-primary/5 shadow-sm">
<h3 class="text-lg font-bold mb-4">Son Aktiviteler</h3>
<div class="space-y-4">
<div class="flex gap-4 items-start">
<div class="mt-1 p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
<span class="material-symbols-outlined text-sm">done_all</span>
</div>
<div>
<p class="text-sm font-medium"><span class="font-bold">Emre Can</span> deneme sınavını bitirdi.</p>
<p class="text-xs text-slate-400">10 dakika önce • Net: 34.5</p>
</div>
</div>
<div class="flex gap-4 items-start border-t border-slate-100 dark:border-slate-700 pt-4">
<div class="mt-1 p-2 bg-primary/10 text-primary rounded-lg">
<span class="material-symbols-outlined text-sm">edit_calendar</span>
</div>
<div>
<p class="text-sm font-medium"><span class="font-bold">Selma Aksoy</span> ile yeni ders planlandı.</p>
<p class="text-xs text-slate-400">2 saat önce • 15 Mart, 09:00</p>
</div>
</div>
</div>
</div>
</div>
</main>
</div>
</body></html>