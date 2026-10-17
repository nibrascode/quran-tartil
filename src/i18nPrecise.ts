// Precise (offline Whisper) recognition engine strings (5 languages).
const en = {
  pNoVoice: "No sound is reaching the recogniser. Check the microphone permission and that no other app is using the microphone, then try again. You can also pick another engine in Settings → Recognition engine.",
  pEngT: "Recognition engine", pEngAuto: "Auto", pEngPlat: "Platform", pEngPrec: "Precise β",
  pEngD: "Auto and Platform use your device's speech service. Precise (beta) runs a Quran-tuned model on this device: it works offline and follows you about 2 s behind. Install the model below first; it falls back to Platform if anything fails.",
  pModelT: "Precise model", pModelD: "A Quran-tuned Whisper model (tarteel-ai, Apache-2.0) that runs on this device: no audio is sent anywhere. One-time download of about {mb} MB from Hugging Face; Wi-Fi recommended.",
  pDownload: "Download ({mb} MB)", pCancel: "Cancel", pDelete: "Delete model", pInstalled: "Installed", pNotInstalled: "Not installed", pProgress: "{done} of {total} MB",
  pFailed: "Download failed: {e}", pCancelled: "Download cancelled", pUnsupported: "This device cannot run Precise mode (it needs Web Workers, WebAssembly and AudioWorklet).",
  pBattery: "Precise mode keeps the processor busy while you recite and stops the moment you press stop. Expect higher battery use than the platform engine.",
  pdBackend: "Precise backend", pdWindows: "Windows decoded", pdMs: "Decode last / avg", pdRtf: "Real-time factor", pdHop: "Window step", pdLag: "Lag behind speech", pdWords: "Words committed", pdFell: "Fell back to platform", pdYes: "yes", pdNo: "no",
  pFellBack: "Precise mode failed, using the platform recogniser instead.",
};
const az: typeof en = {
  pNoVoice: "Tanıyıcıya səs çatmır. Mikrofon icazəsini və mikrofonu başqa tətbiqin işlətmədiyini yoxlayın, sonra yenidən cəhd edin. Ayarlar → Tanıma mühərriki bölməsindən başqa mühərrik də seçə bilərsiniz.",
  pEngT: "Tanıma mühərriki", pEngAuto: "Avto", pEngPlat: "Platforma", pEngPrec: "Dəqiq β",
  pEngD: "Avto və Platforma cihazın səs xidmətindən istifadə edir. «Dəqiq» (beta) bu cihazda Quran üçün tənzimlənmiş modeli işlədir: oflayn işləyir, təxminən 2 san gecikmə ilə izləyir. Əvvəlcə aşağıdan modeli yükləyin; xəta olsa Platformaya keçir.",
  pModelT: "«Dəqiq» modeli", pModelD: "Bu cihazda işləyən Quran üçün tənzimlənmiş Whisper modeli (tarteel-ai, Apache-2.0): heç bir səs göndərilmir. Hugging Face-dən bir dəfəlik təxminən {mb} MB yükləmə; Wi-Fi tövsiyə olunur.",
  pDownload: "Yüklə ({mb} MB)", pCancel: "Ləğv et", pDelete: "Modeli sil", pInstalled: "Quraşdırılıb", pNotInstalled: "Quraşdırılmayıb", pProgress: "{done} / {total} MB",
  pFailed: "Yükləmə alınmadı: {e}", pCancelled: "Yükləmə ləğv edildi", pUnsupported: "Bu cihaz «Dəqiq» rejimini dəstəkləmir (Web Worker, WebAssembly və AudioWorklet lazımdır).",
  pBattery: "«Dəqiq» rejim oxuyarkən prosessoru məşğul edir və dayandır düyməsi ilə dərhal dayanır. Platforma mühərrikindən çox batareya işlədir.",
  pdBackend: "Dəqiq: backend", pdWindows: "Emal olunan pəncərə", pdMs: "Emal son / orta", pdRtf: "Real vaxt əmsalı", pdHop: "Pəncərə addımı", pdLag: "Səsdən geriləmə", pdWords: "Təsdiqlənən söz", pdFell: "Platformaya keçildi", pdYes: "bəli", pdNo: "xeyr",
  pFellBack: "«Dəqiq» rejim alınmadı, platforma tanıyıcısı istifadə olunur.",
};
const tr: typeof en = {
  pNoVoice: "Tanıyıcıya ses ulaşmıyor. Mikrofon iznini ve mikrofonu başka bir uygulamanın kullanmadığını kontrol edip tekrar deneyin. Ayarlar → Tanıma motoru bölümünden başka bir motor da seçebilirsiniz.",
  pEngT: "Tanıma motoru", pEngAuto: "Otomatik", pEngPlat: "Platform", pEngPrec: "Hassas β",
  pEngD: "Otomatik ve Platform cihazın konuşma servisini kullanır. Hassas (beta) bu cihazda Kur'an için ayarlı bir modeli çalıştırır: çevrimdışı çalışır, yaklaşık 2 sn gecikmeyle izler. Önce aşağıdan modeli yükleyin; hata olursa Platform'a geçer.",
  pModelT: "Hassas model", pModelD: "Bu cihazda çalışan, Kur'an için ayarlanmış Whisper modeli (tarteel-ai, Apache-2.0): hiçbir ses gönderilmez. Hugging Face'ten tek seferlik yaklaşık {mb} MB indirme; Wi-Fi önerilir.",
  pDownload: "İndir ({mb} MB)", pCancel: "İptal", pDelete: "Modeli sil", pInstalled: "Yüklü", pNotInstalled: "Yüklü değil", pProgress: "{done} / {total} MB",
  pFailed: "İndirme başarısız: {e}", pCancelled: "İndirme iptal edildi", pUnsupported: "Bu cihaz Hassas modu çalıştıramıyor (Web Worker, WebAssembly ve AudioWorklet gerekir).",
  pBattery: "Hassas mod okurken işlemciyi meşgul eder ve durdur'a basar basmaz durur. Platform motorundan daha çok pil harcar.",
  pdBackend: "Hassas: arka uç", pdWindows: "Çözülen pencere", pdMs: "Çözüm son / ort.", pdRtf: "Gerçek zaman oranı", pdHop: "Pencere adımı", pdLag: "Konuşmanın gerisi", pdWords: "Onaylanan kelime", pdFell: "Platforma geçildi", pdYes: "evet", pdNo: "hayır",
  pFellBack: "Hassas mod başarısız oldu, platform tanıyıcısı kullanılıyor.",
};
const ar: typeof en = {
  pNoVoice: "لا يصل أي صوت إلى المتعرّف. تحقق من إذن الميكروفون ومن أن تطبيقاً آخر لا يستخدمه ثم حاول مجدداً. يمكنك أيضاً اختيار محرك آخر من الإعدادات ← محرك التعرف.",
  pEngT: "محرك التعرف", pEngAuto: "تلقائي", pEngPlat: "النظام", pEngPrec: "دقيق β",
  pEngD: "التلقائي والنظام يستخدمان خدمة الصوت في جهازك. «دقيق» (تجريبي) يشغّل نموذجاً مضبوطاً على القرآن على جهازك: يعمل دون إنترنت ويتابعك بتأخر نحو ثانيتين. ثبّت النموذج أدناه أولاً؛ وعند أي خلل يعود إلى النظام.",
  pModelT: "نموذج «دقيق»", pModelD: "نموذج Whisper مضبوط على القرآن (tarteel-ai، Apache-2.0) يعمل على جهازك: لا يُرسل أي صوت. تنزيل لمرة واحدة بحجم {mb} م.ب تقريباً من Hugging Face؛ يُفضّل الواي فاي.",
  pDownload: "تنزيل ({mb} م.ب)", pCancel: "إلغاء", pDelete: "حذف النموذج", pInstalled: "مثبّت", pNotInstalled: "غير مثبّت", pProgress: "{done} من {total} م.ب",
  pFailed: "فشل التنزيل: {e}", pCancelled: "أُلغي التنزيل", pUnsupported: "لا يدعم هذا الجهاز الوضع الدقيق (يلزم Web Workers وWebAssembly وAudioWorklet).",
  pBattery: "الوضع الدقيق يُشغّل المعالج أثناء التلاوة ويتوقف فور الضغط على إيقاف. استهلاك البطارية أعلى من محرك النظام.",
  pdBackend: "دقيق: الواجهة", pdWindows: "النوافذ المفكوكة", pdMs: "الفك الأخير / المتوسط", pdRtf: "معامل الزمن الحقيقي", pdHop: "خطوة النافذة", pdLag: "التأخر عن الصوت", pdWords: "الكلمات المثبتة", pdFell: "تم التحويل إلى النظام", pdYes: "نعم", pdNo: "لا",
  pFellBack: "فشل الوضع الدقيق، يجري استخدام محرك النظام.",
};
const ru: typeof en = {
  pNoVoice: "Звук не доходит до распознавателя. Проверьте разрешение на микрофон и что его не использует другое приложение, затем повторите. Можно также выбрать другой движок в Настройки → Движок распознавания.",
  pEngT: "Движок распознавания", pEngAuto: "Авто", pEngPlat: "Системный", pEngPrec: "Точный β",
  pEngD: "«Авто» и «Системный» используют речевой сервис устройства. «Точный» (бета) запускает на устройстве модель, настроенную на Коран: работает офлайн и следует за вами с задержкой около 2 с. Сначала установите модель ниже; при сбое включается системный.",
  pModelT: "Модель «Точный»", pModelD: "Модель Whisper, настроенная на Коран (tarteel-ai, Apache-2.0), работает на устройстве: звук никуда не отправляется. Разовая загрузка около {mb} МБ с Hugging Face; лучше по Wi-Fi.",
  pDownload: "Скачать ({mb} МБ)", pCancel: "Отмена", pDelete: "Удалить модель", pInstalled: "Установлена", pNotInstalled: "Не установлена", pProgress: "{done} из {total} МБ",
  pFailed: "Не удалось скачать: {e}", pCancelled: "Загрузка отменена", pUnsupported: "Это устройство не поддерживает режим «Точный» (нужны Web Workers, WebAssembly и AudioWorklet).",
  pBattery: "Режим «Точный» нагружает процессор во время чтения и останавливается сразу при нажатии «Стоп». Расход батареи выше, чем у системного движка.",
  pdBackend: "Точный: бэкенд", pdWindows: "Окон обработано", pdMs: "Декод. последний / сред.", pdRtf: "Коэфф. реального времени", pdHop: "Шаг окна", pdLag: "Отставание от речи", pdWords: "Подтверждено слов", pdFell: "Переход на системный", pdYes: "да", pdNo: "нет",
  pFellBack: "Режим «Точный» не сработал, используется системный распознаватель.",
};
export const P = { en, az, tr, ar, ru };
