// Comprehensive Multilingual Sentence Synthesizer for Indian Sign Language (ISL)
// Supports continuous translation into ANY language (English, Hindi, Tamil, Telugu, Malayalam, Kannada, Marathi, Bengali, Gujarati, Spanish, French, German, Japanese, Arabic, etc.)
// with Web Speech API audio output and optional AI (Gemini) enhancement.

export type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  voiceLocales: string[];
};

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", voiceLocales: ["en-IN", "en-US", "en-GB"] },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", voiceLocales: ["hi-IN", "hi"] },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳", voiceLocales: ["ta-IN", "ta"] },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳", voiceLocales: ["te-IN", "te"] },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳", voiceLocales: ["ml-IN", "ml"] },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳", voiceLocales: ["kn-IN", "kn"] },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳", voiceLocales: ["mr-IN", "mr"] },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳", voiceLocales: ["bn-IN", "bn-BD", "bn"] },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳", voiceLocales: ["gu-IN", "gu"] },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", voiceLocales: ["es-ES", "es-MX", "es"] },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", voiceLocales: ["fr-FR", "fr-CA", "fr"] },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", voiceLocales: ["de-DE", "de"] },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", voiceLocales: ["ja-JP", "ja"] },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", voiceLocales: ["ar-SA", "ar"] },
];

export type TranslatedResult = {
  tokens: string[];
  activeText: string; // The translation in the actively selected language
  translations: Record<string, string>; // code -> translated sentence
  isAiEnhanced?: boolean;
};

// Multilingual vocabulary dictionary for ISL gestures
export const MULTILINGUAL_VOCAB: Record<string, Record<string, string>> = {
  namaste: {
    en: "Namaste",
    hi: "नमस्ते",
    ta: "வணக்கம்",
    te: "నమస్కారం",
    ml: "നമസ്കാരം",
    kn: "ನಮಸ್ಕಾರ",
    mr: "नमस्ते",
    bn: "নমস্কার",
    gu: "નમસ્તે",
    es: "Hola / Saludos",
    fr: "Bonjour / Salutations",
    de: "Hallo / Grüße",
    ja: "ナマステ / こんにちは",
    ar: "مرحبا / تحياتي",
  },
  welcome: {
    en: "Welcome",
    hi: "स्वागत है",
    ta: "வரவேற்கிறோம்",
    te: "స్వాగతం",
    ml: "സ്വാഗതം",
    kn: "ಸ್ವಾಗತ",
    mr: "स्वागत आहे",
    bn: "স্বাগতম",
    gu: "સ્વાગત છે",
    es: "Bienvenido",
    fr: "Bienvenue",
    de: "Willkommen",
    ja: "ようこそ",
    ar: "أهلاً وسهلاً",
  },
  thank_you: {
    en: "Thank you",
    hi: "धन्यवाद",
    ta: "நன்றி",
    te: "ధన్యవాదాలు",
    ml: "നന്ദി",
    kn: "ಧನ್ಯವಾದಗಳು",
    mr: "धन्यवाद",
    bn: "ধন্যবাদ",
    gu: "આભાર",
    es: "Gracias",
    fr: "Merci",
    de: "Danke",
    ja: "ありがとう",
    ar: "شكراً لك",
  },
  please: {
    en: "Please",
    hi: "कृपया",
    ta: "தயவுசெய்து",
    te: "దయచేసి",
    ml: "ദയവായി",
    kn: "ದಯವಿಟ್ಟು",
    mr: "कृपया",
    bn: "দয়া করে",
    gu: "કૃપા કરીને",
    es: "Por favor",
    fr: "S'il vous plaît",
    de: "Bitte",
    ja: "お願いします",
    ar: "من فضلك",
  },
  sorry: {
    en: "Sorry",
    hi: "माफ़ कीजिए",
    ta: "மன்னிக்கவும்",
    te: "క్షమించండి",
    ml: "ക്ഷമിക്കണം",
    kn: "ಕ್ಷಮಿಸಿ",
    mr: "क्षमस्व",
    bn: "দুঃখিত",
    gu: "માફ કરશો",
    es: "Lo siento / Disculpas",
    fr: "Pardon / Désolé",
    de: "Entschuldigung",
    ja: "ごめんなさい",
    ar: "آسف / عذراً",
  },
  nice_to_meet_you: {
    en: "Nice to meet you",
    hi: "आपसे मिलकर खुशी हुई",
    ta: "உங்களை சந்தித்ததில் மகிழ்ச்சி",
    te: "మిమ్మల్ని కలవడం ఆనందంగా ఉంది",
    ml: "കണ്ടുമുട്ടിയതിൽ സന്തോഷം",
    kn: "ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿದ್ದು ಸಂತೋಷ",
    mr: "तुम्हाला भेटून आनंद झाला",
    bn: "আপনার সাথে দেখা করে ভালো লাগলো",
    gu: "તમને મળીને આનંદ થયો",
    es: "Mucho gusto",
    fr: "Enchanté",
    de: "Schön Sie kennenzulernen",
    ja: "はじめまして",
    ar: "تشرفت بمقابلتك",
  },
  help: {
    en: "Help",
    hi: "मदद",
    ta: "உதவி",
    te: "సహాయం",
    ml: "സഹായം",
    kn: "ಸಹಾಯ",
    mr: "मदत",
    bn: "সাহায্য",
    gu: "મદદ",
    es: "Ayuda",
    fr: "Aide",
    de: "Hilfe",
    ja: "助け",
    ar: "مساعدة",
  },
  water: {
    en: "Water",
    hi: "पानी",
    ta: "தண்ணீர்",
    te: "నీరు",
    ml: "വെള്ളം",
    kn: "ನೀರು",
    mr: "पाणी",
    bn: "জল / পানি",
    gu: "પાણી",
    es: "Agua",
    fr: "Eau",
    de: "Wasser",
    ja: "水",
    ar: "ماء",
  },
  food: {
    en: "Food",
    hi: "खाना",
    ta: "உணவு",
    te: "ఆహారం",
    ml: "ഭക്ഷണം",
    kn: "ಆಹಾರ",
    mr: "अन्न / जेवण",
    bn: "খাবার",
    gu: "ખોરાક",
    es: "Comida",
    fr: "Nourriture",
    de: "Essen",
    ja: "食べ物",
    ar: "طعام",
  },
  thirsty: {
    en: "Thirsty",
    hi: "प्यास",
    ta: "தாகம்",
    te: "దాహం",
    ml: "ദാഹം",
    kn: "ಬಾಯಾರಿಕೆ",
    mr: "तहान",
    bn: "তৃষ্ণা",
    gu: "તરસ",
    es: "Sediento",
    fr: "Assoiffé",
    de: "Durstig",
    ja: "のどが渇いた",
    ar: "عطشان",
  },
  house: {
    en: "House / Home",
    hi: "घर",
    ta: "வீடு",
    te: "ఇల్లు",
    ml: "വീട്",
    kn: "ಮನೆ",
    mr: "घर",
    bn: "বাড়ি",
    gu: "ઘર",
    es: "Casa / Hogar",
    fr: "Maison",
    de: "Zuhause",
    ja: "家",
    ar: "منزل / بيت",
  },
  book: {
    en: "Book / Study",
    hi: "किताब / पढ़ाई",
    ta: "புத்தகம் / படிப்பு",
    te: "పుస్తకం / చదువు",
    ml: "പുസ്തകം / പഠനം",
    kn: "ಪುಸ್ತಕ / ಓದು",
    mr: "पुस्तक / अभ्यास",
    bn: "বই / পড়াশোনা",
    gu: "પુસ્તક / અભ્યાસ",
    es: "Libro / Estudio",
    fr: "Livre / Étude",
    de: "Buch / Studium",
    ja: "本 / 勉強",
    ar: "كتاب / دراسة",
  },
  school: {
    en: "School",
    hi: "विद्यालय / स्कूल",
    ta: "பள்ளி",
    te: "పాఠశాల",
    ml: "സ്കൂൾ",
    kn: "ಶಾಲೆ",
    mr: "शाळा",
    bn: "বিদ্যালয়",
    gu: "શાળા",
    es: "Escuela",
    fr: "École",
    de: "Schule",
    ja: "学校",
    ar: "مدرسة",
  },
  family: {
    en: "Family",
    hi: "परिवार",
    ta: "குடும்பம்",
    te: "కుటుంబం",
    ml: "കുടുംബം",
    kn: "ಕುಟುಂಬ",
    mr: "कुटुंब",
    bn: "পরিবার",
    gu: "પરિવાર",
    es: "Familia",
    fr: "Famille",
    de: "Familie",
    ja: "家族",
    ar: "عائلة",
  },
  friend: {
    en: "Friend",
    hi: "मित्र / दोस्त",
    ta: "நண்பர்",
    te: "స్నేహితుడు",
    ml: "സുഹൃത്ത്",
    kn: "ಸ್ನೇಹಿತ",
    mr: "मित्र",
    bn: "বন্ধু",
    gu: "મિત્ર",
    es: "Amigo",
    fr: "Ami",
    de: "Freund",
    ja: "友達",
    ar: "صديق",
  },
  doctor: {
    en: "Doctor / Hospital",
    hi: "चिकित्सक / अस्पताल",
    ta: "மருத்துவர் / மருத்துவமனை",
    te: "వైద్యుడు / ఆసుపత్రి",
    ml: "ഡോക്ടർ / ആശുപത്രി",
    kn: "ವೈದ್ಯ / ಆಸ್ಪತ್ರೆ",
    mr: "डॉक्टर / रुग्णालय",
    bn: "ডাক্তার / হাসপাতাল",
    gu: "ડોક્ટર / હોસ્પિટલ",
    es: "Médico / Hospital",
    fr: "Docteur / Hôpital",
    de: "Arzt / Krankenhaus",
    ja: "医師 / 病院",
    ar: "طبيب / مستشفى",
  },
  time: {
    en: "Time",
    hi: "समय / वक्त",
    ta: "நேரம்",
    te: "సమయం",
    ml: "സമയം",
    kn: "ಸಮಯ",
    mr: "वेळ",
    bn: "সময়",
    gu: "સમય",
    es: "Hora / Tiempo",
    fr: "Heure / Temps",
    de: "Zeit / Uhrzeit",
    ja: "時間",
    ar: "وقت / ساعة",
  },
  work: {
    en: "Work / Job",
    hi: "काम / नौकरी",
    ta: "வேலை",
    te: "పని",
    ml: "ജോലി",
    kn: "ಕೆಲಸ",
    mr: "काम",
    bn: "কাজ",
    gu: "કામ",
    es: "Trabajo",
    fr: "Travail",
    de: "Arbeit",
    ja: "仕事",
    ar: "عمل / وظيفة",
  },
  bathroom: {
    en: "Restroom / Bathroom",
    hi: "शौचालय",
    ta: "கழிப்பறை",
    te: "మరుగుదొడ్డి",
    ml: "ശൗചാലയം",
    kn: "ಶೌಚಾಲಯ",
    mr: "शौचालय",
    bn: "টয়লেট / শৌচাগার",
    gu: "શૌચાલય",
    es: "Baño",
    fr: "Toilettes",
    de: "Toilette",
    ja: "お手洗い",
    ar: "حمام / دورة مياه",
  },
  come: {
    en: "Come",
    hi: "आइए",
    ta: "வாருங்கள்",
    te: "రండి",
    ml: "വരൂ",
    kn: "ಬನ್ನಿ",
    mr: "या",
    bn: "আসুন",
    gu: "આવો",
    es: "Ven / Venga",
    fr: "Venez",
    de: "Kommen Sie",
    ja: "来てください",
    ar: "تعال",
  },
  go: {
    en: "Go",
    hi: "जाइए",
    ta: "செல்லுங்கள்",
    te: "వెళ్ళండి",
    ml: "പോകൂ",
    kn: "ಹೋಗಿ",
    mr: "जा",
    bn: "যান",
    gu: "જાઓ",
    es: "Ir",
    fr: "Allez",
    de: "Gehen Sie",
    ja: "行ってください",
    ar: "اذهب",
  },
  i_me: {
    en: "I / Me",
    hi: "मैं",
    ta: "நான்",
    te: "నేను",
    ml: "ഞാൻ",
    kn: "ನಾನು",
    mr: "मी",
    bn: "আমি",
    gu: "હું",
    es: "Yo",
    fr: "Je / Moi",
    de: "Ich",
    ja: "私",
    ar: "أنا",
  },
  you: {
    en: "You",
    hi: "आप / तुम",
    ta: "நீங்கள்",
    te: "మీరు",
    ml: "നിങ്ങൾ",
    kn: "ನೀವು",
    mr: "तुम्ही",
    bn: "আপনি / তুমি",
    gu: "તમે",
    es: "Usted / Tú",
    fr: "Vous / Tu",
    de: "Sie / Du",
    ja: "あなた",
    ar: "أنت",
  },
  what: {
    en: "What",
    hi: "क्या",
    ta: "என்ன",
    te: "ఏమిటి",
    ml: "എന്ത്",
    kn: "ಏನು",
    mr: "काय",
    bn: "কী",
    gu: "શું",
    es: "¿Qué?",
    fr: "Quoi ?",
    de: "Was?",
    ja: "何？",
    ar: "ماذا؟",
  },
  where: {
    en: "Where",
    hi: "कहाँ",
    ta: "எங்கே",
    te: "ఎక్కడ",
    ml: "എവിടെ",
    kn: "ಎಲ್ಲಿ",
    mr: "कुठे",
    bn: "কোথায়",
    gu: "ક્યાં",
    es: "¿Dónde?",
    fr: "Où ?",
    de: "Wo?",
    ja: "どこ？",
    ar: "أين؟",
  },
  why: {
    en: "Why",
    hi: "क्यों",
    ta: "ஏன்",
    te: "ఎందుకు",
    ml: "എന്തുകൊണ്ട്",
    kn: "ಏಕೆ",
    mr: "का",
    bn: "কেন",
    gu: "કેમ",
    es: "¿Por qué?",
    fr: "Pourquoi ?",
    de: "Warum?",
    ja: "なぜ？",
    ar: "لماذا؟",
  },
  how: {
    en: "How",
    hi: "कैसे",
    ta: "எப்படி",
    te: "ఎలా",
    ml: "എങ്ങനെ",
    kn: "ಹೇಗೆ",
    mr: "कसे",
    bn: "কেমন / কিভাবে",
    gu: "કેવી રીતે",
    es: "¿Cómo?",
    fr: "Comment ?",
    de: "Wie?",
    ja: "どうやって？",
    ar: "كيف؟",
  },
  yes: {
    en: "Yes",
    hi: "हाँ",
    ta: "ஆம்",
    te: "అవును",
    ml: "അതെ",
    kn: "ಹೌದು",
    mr: "होय",
    bn: "হ্যাঁ",
    gu: "હા",
    es: "Sí",
    fr: "Oui",
    de: "Ja",
    ja: "はい",
    ar: "نعم",
  },
  no: {
    en: "No",
    hi: "नहीं",
    ta: "இல்லை",
    te: "కాదు / లేదు",
    ml: "അല്ല / ഇല്ല",
    kn: "ಇಲ್ಲ",
    mr: "नाही",
    bn: "না",
    gu: "ના",
    es: "No",
    fr: "Non",
    de: "Nein",
    ja: "いいえ",
    ar: "لا",
  },
  good: {
    en: "Good / Super",
    hi: "अच्छा / बहुत बढ़िया",
    ta: "நல்லது / அருமை",
    te: "మంచిది / బాగుంది",
    ml: "നല്ലത്",
    kn: "ಒಳ್ಳೆಯದು",
    mr: "छान / उत्तम",
    bn: "ভালো",
    gu: "સારું",
    es: "Bueno / Excelente",
    fr: "Bien / Super",
    de: "Gut / Super",
    ja: "素晴らしい",
    ar: "جيد / رائع",
  },
  bad: {
    en: "Bad",
    hi: "खराब / बुरा",
    ta: "மோசமானது",
    te: "చెడ్డది",
    ml: "മോശം",
    kn: "ಕೆಟ್ಟದ್ದು",
    mr: "वाईट",
    bn: "খারাপ",
    gu: "ખરાબ",
    es: "Malo",
    fr: "Mauvais",
    de: "Schlecht",
    ja: "悪い",
    ar: "سيء",
  },
  happy: {
    en: "Happy",
    hi: "खुश",
    ta: "மகிழ்ச்சி",
    te: "సంతోషం",
    ml: "സന്തോഷം",
    kn: "ಸಂತೋಷ",
    mr: "आनंदी",
    bn: "খুশি / আনন্দিত",
    gu: "ખુશ",
    es: "Feliz",
    fr: "Heureux",
    de: "Glücklich",
    ja: "嬉しい / 幸せ",
    ar: "سعيد",
  },
  sad: {
    en: "Sad",
    hi: "दुखी / उदास",
    ta: "வருத்தம்",
    te: "బాధ",
    ml: "വിഷമം",
    kn: "ದುಃಖ",
    mr: "दुःखी",
    bn: "দুঃখিত",
    gu: "ઉદાસ",
    es: "Triste",
    fr: "Triste",
    de: "Traurig",
    ja: "悲しい",
    ar: "حزين",
  },
  emergency: {
    en: "Emergency",
    hi: "आपातकाल",
    ta: "அவசரம்",
    te: "అత్యవసరం",
    ml: "അടിയന്തിരാവസ്ഥ",
    kn: "ತುರ್ತು",
    mr: "आणीबाणी",
    bn: "জরুরি অবস্থা",
    gu: "કટોકટી",
    es: "Emergencia",
    fr: "Urgence",
    de: "Notfall",
    ja: "緊急事態",
    ar: "طوارئ",
  },
  stop: {
    en: "Stop",
    hi: "रुकें / बंद करें",
    ta: "நிறுத்துங்கள்",
    te: "ఆగండి",
    ml: "നിൽക്കൂ",
    kn: "ನಿಲ್ಲಿಸಿ",
    mr: "थांबा",
    bn: "থামুন",
    gu: "રોકો",
    es: "Alto / Deténgase",
    fr: "Arrêtez",
    de: "Stopp / Halten Sie",
    ja: "止まってください",
    ar: "توقف",
  },
  pain: {
    en: "Pain / Hurt",
    hi: "दर्द",
    ta: "வலி",
    te: "నొప్పి",
    ml: "വേദന",
    kn: "ನೋವು",
    mr: "वेदना / दुखणे",
    bn: "ব্যথা",
    gu: "દુઃખાવો",
    es: "Dolor",
    fr: "Douleur",
    de: "Schmerz",
    ja: "痛み",
    ar: "ألم",
  },
  danger: {
    en: "Danger",
    hi: "खतरा",
    ta: "ஆபத்து",
    te: "ప్రమాదం",
    ml: "അപകടം",
    kn: "ಅಪಾಯ",
    mr: "धोका",
    bn: "বিপদ",
    gu: "જોખમ",
    es: "Peligro",
    fr: "Danger",
    de: "Gefahr",
    ja: "危険",
    ar: "خطر",
  },
};

/**
 * Idiomatic Pattern Rules for common ISL sequences in any language
 */
type PatternDef = {
  matches: (tokens: string[]) => boolean;
  synthesizeAll: (tokens: string[]) => Record<string, string>;
};

const IDIOMATIC_PATTERNS: PatternDef[] = [
  // Namaste greetings
  {
    matches: (t) => t.length === 1 && t[0] === "namaste",
    synthesizeAll: () => ({
      en: "Namaste! Hello to you.",
      hi: "नमस्ते! आपका स्वागत है।",
      ta: "வணக்கம்! உங்களுக்கு நல்வரவு.",
      te: "నమస్కారం! మీకు స్వాగతం.",
      ml: "നമസ്കാരം! നിങ്ങൾക്ക് സ്വാഗതം.",
      kn: "ನಮಸ್ಕಾರ! ನಿಮಗೆ ಸ್ವಾಗತ.",
      mr: "नमस्ते! तुमचे स्वागत आहे.",
      bn: "নমস্কার! আপনাকে স্বাগতম।",
      gu: "નમસ્તે! તમારું સ્વાગત છે.",
      es: "¡Hola! Saludos cordiales.",
      fr: "Bonjour ! Bienvenue à vous.",
      de: "Hallo! Herzlich willkommen.",
      ja: "ナマステ！こんにちは。",
      ar: "مرحبا! أهلاً بك.",
    }),
  },
  {
    matches: (t) => t.includes("namaste") && (t.includes("how") || t.includes("you")),
    synthesizeAll: () => ({
      en: "Namaste! How are you doing today?",
      hi: "नमस्ते! आप आज कैसे हैं?",
      ta: "வணக்கம்! இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?",
      te: "నమస్కారం! మీరు ఈరోజు ఎలా ఉన్నారు?",
      ml: "നമസ്കാരം! ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെയുണ്ട്?",
      kn: "ನಮಸ್ಕಾರ! ಇಂದು ನೀವು ಹೇಗಿದ್ದೀರಿ?",
      mr: "नमस्ते! आज तुम्ही कसे आहात?",
      bn: "নমস্কার! আজ আপনি কেমন আছেন?",
      gu: "નમસ્તે! તમે આજે કેમ છો?",
      es: "¡Hola! ¿Cómo estás hoy?",
      fr: "Bonjour ! Comment allez-vous aujourd'hui ?",
      de: "Hallo! Wie geht es Ihnen heute?",
      ja: "ナマステ！今日はお元気ですか？",
      ar: "مرحبا! كيف حالك اليوم؟",
    }),
  },
  // Where is hospital / doctor
  {
    matches: (t) => t.includes("where") && (t.includes("hospital") || t.includes("doctor")),
    synthesizeAll: () => ({
      en: "Excuse me, where is the nearest hospital or doctor?",
      hi: "माफ़ कीजिए, सबसे नजदीकी अस्पताल या डॉक्टर कहाँ है?",
      ta: "மன்னிக்கவும், அருகிலுள்ள மருத்துவமனை அல்லது மருத்துவர் எங்கே?",
      te: "దయచేసి చెప్పండి, దగ్గరలోని ఆసుపత్రి లేదా వైద్యుడు ఎక్కడ ఉన్నారు?",
      ml: "ക്ഷമിക്കണം, അടുത്തുള്ള ആശുപത്രി എവിടെയാണ്?",
      kn: "ಕ್ಷಮಿಸಿ, ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಅಥವಾ ವೈದ್ಯರು ಎಲ್ಲಿದ್ದಾರೆ?",
      mr: "माफ करा, जवळचे रुग्णालय कुठे आहे?",
      bn: "মাফ করবেন, সবচেয়ে কাছের হাসপাতাল কোথায়?",
      gu: "માફ કરશો, નજીકની હોસ્પિટલ ક્યાં છે?",
      es: "Disculpe, ¿dónde está el hospital o médico más cercano?",
      fr: "Excusez-moi, où se trouve l'hôpital ou le médecin le plus proche ?",
      de: "Entschuldigung, wo ist das nächste Krankenhaus oder der nächste Arzt?",
      ja: "すみません、一番近い病院はどこですか？",
      ar: "عذراً، أين أقرب مستشفى أو طبيب؟",
    }),
  },
  // Where is restroom
  {
    matches: (t) => t.includes("where") && t.includes("bathroom"),
    synthesizeAll: () => ({
      en: "Excuse me, where is the restroom / bathroom?",
      hi: "माफ़ कीजिए, शौचालय कहाँ है?",
      ta: "மன்னிக்கவும், கழிப்பறை எங்கே உள்ளது?",
      te: "దయచేసి చెప్పండి, వాష్‌రూమ్ ఎక్కడ ఉంది?",
      ml: "ക്ഷമിക്കണം, ശൗചാലയം എവിടെയാണ്?",
      kn: "ಕ್ಷಮಿಸಿ, ಶೌಚಾಲಯ ಎಲ್ಲಿದೆ?",
      mr: "शौचालय कुठे आहे?",
      bn: "শৌচাগার কোথায়?",
      gu: "શૌચાલય ક્યાં છે?",
      es: "¿Dónde está el baño, por favor?",
      fr: "Où sont les toilettes, s'il vous plaît ?",
      de: "Wo ist die Toilette, bitte?",
      ja: "すみません、お手洗いはどこですか？",
      ar: "من فضلك، أين الحمام؟",
    }),
  },
  // Emergency help
  {
    matches: (t) => t.includes("emergency") && (t.includes("help") || t.includes("please")),
    synthesizeAll: () => ({
      en: "Emergency! Please help me immediately!",
      hi: "आपातकाल है! कृपया तुरंत मेरी मदद करें!",
      ta: "அவசர நிலை! தயவுசெய்து உடனடியாக உதவுங்கள்!",
      te: "అత్యవసర పరిస్థితి! దయచేసి వెంటనే సహాయం చేయండి!",
      ml: "അടിയന്തിരാവസ്ഥ! ദയവായി ഉടൻ സഹായിക്കൂ!",
      kn: "ತುರ್ತು ಪರಿಸ್ಥಿತಿ! ದಯವಿಟ್ಟು ತಕ್ಷಣ ಸಹಾಯ ಮಾಡಿ!",
      mr: "आणीबाणी! कृपया मला लगेच मदत करा!",
      bn: "জরুরি অবস্থা! দয়া করে এখনই আমাকে সাহায্য করুন!",
      gu: "કટોકટી છે! કૃપા કરીને તાત્કાલિક મદદ કરો!",
      es: "¡Emergencia! ¡Por favor ayúdenme inmediatamente!",
      fr: "Urgence ! Aidez-moi immédiatement s'il vous plaît !",
      de: "Notfall! Bitte helfen Sie mir sofort!",
      ja: "緊急事態です！すぐに助けてください！",
      ar: "حالة طوارئ! الرجاء مساعدتي فوراً!",
    }),
  },
  // Thirsty / water
  {
    matches: (t) => (t.includes("water") || t.includes("thirsty")) && (t.includes("i_me") || t.includes("please")),
    synthesizeAll: () => ({
      en: "I am thirsty. Could you please give me some water?",
      hi: "मुझे प्यास लगी है। क्या मुझे थोड़ा पानी मिल सकता है?",
      ta: "எனக்கு தாகமாக இருக்கிறது. தயவுசெய்து கொஞ்சம் தண்ணீர் தர முடியுமா?",
      te: "నాకు దాహంగా ఉంది. దయచేసి కాస్త నీరు ఇవ్వగలరా?",
      ml: "എനിക്ക് ദാഹിക്കുന്നു. ദയവായി കുറച്ചു വെള്ളം തരുമോ?",
      kn: "ನನಗೆ ಬಾಯಾರಿಕೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ನೀರು ಕೊಡಿ.",
      mr: "मला तहान लागली आहे. कृपया मला थोडे पाणी मिळेल का?",
      bn: "আমার খুব তেষ্টা পেয়েছে। দয়া করে একটু জল দেবেন?",
      gu: "મને તરસ લાગી છે. કૃપા કરીને મને પાણી આપશો?",
      es: "Tengo sed. ¿Podría darme un poco de agua, por favor?",
      fr: "J'ai soif. Pourriez-vous me donner de l'eau s'il vous plaît ?",
      de: "Ich habe Durst. Könnten Sie mir bitte etwas Wasser geben?",
      ja: "のどが渇きました。お水をいただけますか？",
      ar: "أنا عطشان. هل يمكنك إعطائي بعض الماء من فضلك؟",
    }),
  },
  // Hungry / food
  {
    matches: (t) => t.includes("food") && (t.includes("i_me") || t.includes("please")),
    synthesizeAll: () => ({
      en: "I am hungry and would like some food, please.",
      hi: "मुझे भूख लगी है, कृपया भोजन दीजिए।",
      ta: "எனக்கு பசிக்கிறது, தயவுசெய்து உணவு தாருங்கள்.",
      te: "నాకు ఆకలిగా ఉంది, దయచేసి ఆహారం ఇవ్వండి.",
      ml: "എനിക്ക് വിശക്കുന്നു, ദയവായി ഭക്ഷണം തരൂ.",
      kn: "ನನಗೆ ಹಸಿವಾಗಿದೆ, ದಯವಿಟ್ಟು ಊಟ ಕೊಡಿ.",
      mr: "मला भूक लागली आहे, कृपया जेवण द्या.",
      bn: "আমার ক্ষুধা পেয়েছে, দয়া করে কিছু খাবার দিন।",
      gu: "મને ભૂખ લાગી છે, કૃપા કરીને જમવાનું આપો.",
      es: "Tengo hambre y me gustaría comer algo, por favor.",
      fr: "J'ai faim et je voudrais manger quelque chose, s'il vous plaît.",
      de: "Ich habe Hunger und möchte bitte etwas essen.",
      ja: "お腹がすきました。食べ物をいただけますか？",
      ar: "أنا جائع وأود بعض الطعام من فضلك.",
    }),
  },
  // Come to house
  {
    matches: (t) => t.includes("you") && t.includes("come") && t.includes("house"),
    synthesizeAll: () => ({
      en: "Please come and visit my house!",
      hi: "कृपया आप मेरे घर जरूर आइए!",
      ta: "தயவுசெய்து எங்கள் வீட்டிற்கு வாருங்கள்!",
      te: "దయచేసి మా ఇంటికి రండి!",
      ml: "ദയവായി ഞങ്ങളുടെ വീട്ടിലേക്ക് വരൂ!",
      kn: "ದಯವಿಟ್ಟು ನಮ್ಮ ಮನೆಗೆ ಬನ್ನಿ!",
      mr: "कृपया माझ्या घरी या!",
      bn: "দয়া করে আমার বাড়িতে আসুন!",
      gu: "કૃપા કરીને અમારા ઘરે આવો!",
      es: "¡Por favor ven a visitar mi casa!",
      fr: "Venez visiter ma maison s'il vous plaît !",
      de: "Bitte besuchen Sie mein Zuhause!",
      ja: "ぜひ私の家に来てください！",
      ar: "تفضل بزيارة منزلي من فضلك!",
    }),
  },
  // What time
  {
    matches: (t) => t.includes("what") && t.includes("time"),
    synthesizeAll: () => ({
      en: "Excuse me, what is the time right now?",
      hi: "कृपया बताइए कि अभी क्या समय हुआ है?",
      ta: "தயவுசெய்து சொல்லுங்கள், இப்போது என்ன நேரம்?",
      te: "సమయం ఎంతైందో దయచేసి చెప్పగలరా?",
      ml: "ഇപ്പോൾ സമയം എത്രയായി എന്ന് പറയാമോ?",
      kn: "ದಯವಿಟ್ಟು ಹೇಳಿ, ಈಗ ಸಮಯ ಎಷ್ಟು?",
      mr: "आता किती वाजले आहेत?",
      bn: "এখন সময় কত হয়েছে দয়া করে বলবেন?",
      gu: "અત્યારે કેટલા વાગ્યા છે?",
      es: "¿Qué hora es ahora, por favor?",
      fr: "Quelle heure est-il s'il vous plaît ?",
      de: "Wie spät ist es bitte?",
      ja: "すみません、今何時ですか？",
      ar: "عذراً، كم الساعة الآن من فضلك؟",
    }),
  },
];

/**
 * Synthesizes ISL token sequences into a natural sentence in ANY selected language
 */
export function synthesizeSentenceInAllLanguages(
  tokens: string[],
  targetLangCode = "en"
): TranslatedResult {
  if (!tokens || tokens.length === 0) {
    const emptyMessages: Record<string, string> = {
      en: "Show continuous gestures to translate…",
      hi: "अनुवाद के लिए निरंतर संकेत दिखाएं…",
      ta: "மொழிபெயர்க்க தொடர்ச்சியான சைகைகளைக் காட்டுங்கள்…",
      te: "అనువాదం కోసం సంకేతాలను చూపించండి…",
      ml: "പരിഭാഷയ്ക്കായി അടയാളങ്ങൾ കാണിക്കുക…",
      kn: "ಅನುವಾದಕ್ಕಾಗಿ ಸನ್ನೆಗಳನ್ನು ತೋರಿಸಿ…",
      mr: "भाषांतरासाठी संकेत दाखवा…",
      bn: "অনুবাদ করতে সঙ্কেত প্রদর্শন করুন…",
      gu: "અનુવાદ માટે સંકેતો દર્શાવો…",
      es: "Muestre gestos continuos para traducir…",
      fr: "Montrez des gestes continus pour traduire…",
      de: "Zeigen Sie kontinuierliche Gesten zum Übersetzen…",
      ja: "翻訳するにはジェスチャーを見せてください…",
      ar: "أظهر إشارات مستمرة للترجمة…",
    };

    return {
      tokens: [],
      activeText: emptyMessages[targetLangCode] || emptyMessages.en,
      translations: emptyMessages,
    };
  }

  // 1. Check specialized idiomatic pattern rules
  for (const rule of IDIOMATIC_PATTERNS) {
    if (rule.matches(tokens)) {
      const allTrans = rule.synthesizeAll(tokens);
      return {
        tokens,
        activeText: allTrans[targetLangCode] || allTrans.en,
        translations: allTrans,
      };
    }
  }

  // 2. Dynamic multi-token synthesis for all supported languages
  const translations: Record<string, string> = {};

  SUPPORTED_LANGUAGES.forEach(({ code }) => {
    const words = tokens.map((id) => MULTILINGUAL_VOCAB[id]?.[code] || MULTILINGUAL_VOCAB[id]?.en || id);
    const hasEmergency = tokens.includes("emergency") || tokens.includes("danger");
    const hasPlease = tokens.includes("please");
    const hasQuestion = tokens.some((t) => ["what", "where", "why", "how"].includes(t));

    let sentence = words.join(" ");
    if (code === "en") {
      sentence = hasEmergency
        ? `Warning: ${sentence}!`
        : hasQuestion
        ? `${sentence}?`
        : `${sentence}.`;
      sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    } else if (code === "hi" || code === "mr") {
      sentence = hasEmergency ? `सावधान: ${sentence}!` : `${sentence}।`;
    } else if (code === "ta" || code === "te" || code === "ml" || code === "kn") {
      sentence = `${sentence}.`;
    } else if (code === "es") {
      sentence = hasQuestion ? `¿${sentence}?` : `${sentence}.`;
    } else {
      sentence = `${sentence}.`;
    }

    translations[code] = sentence;
  });

  return {
    tokens,
    activeText: translations[targetLangCode] || translations.en,
    translations,
  };
}

/**
 * Backward compatibility helper
 */
export function synthesizeISLSentence(
  tokens: string[],
  activeLang = "en"
): { english: string; hindi: string; tamil: string; tokens: string[]; isAiEnhanced?: boolean } {
  const result = synthesizeSentenceInAllLanguages(tokens, activeLang);
  return {
    tokens,
    english: result.translations.en || "",
    hindi: result.translations.hi || "",
    tamil: result.translations.ta || "",
    isAiEnhanced: result.isAiEnhanced,
  };
}

/**
 * Optional Generative AI (Gemini) enhancement
 */
export async function enhanceSentenceWithAI(
  tokens: string[],
  apiKey?: string,
  tone: "polite" | "casual" | "emergency" | "simple" = "polite",
  targetLang = "en"
): Promise<TranslatedResult> {
  const fallback = synthesizeSentenceInAllLanguages(tokens, targetLang);
  if (!apiKey || !tokens.length) {
    return fallback;
  }

  try {
    const prompt = `You are an expert Indian Sign Language (ISL) translator.
Convert the following recognized ISL sign words into natural, fluent conversational sentences.
Sign Tokens: [${tokens.join(", ")}]
Tone: ${tone}

Respond in strict JSON with field for: english, hindi, tamil, te (Telugu), es (Spanish), and active (the sentence in target language: ${targetLang}).
Example format:
{
  "active": "Sentence in ${targetLang}",
  "en": "English sentence",
  "hi": "Hindi sentence",
  "ta": "Tamil sentence"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        }),
      }
    );

    if (!res.ok) return fallback;

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return fallback;

    const parsed = JSON.parse(rawText);
    const updatedTranslations = { ...fallback.translations, ...parsed };

    return {
      tokens,
      activeText: parsed.active || updatedTranslations[targetLang] || fallback.activeText,
      translations: updatedTranslations,
      isAiEnhanced: true,
    };
  } catch (err) {
    console.error("AI enhancement fallback:", err);
    return fallback;
  }
}

/**
 * Web Speech API text-to-speech speaker supporting ANY language
 */
export function speakText(
  text: string,
  languageCode = "en",
  rate = 1.0,
  pitch = 1.0
): void {
  if (!("speechSynthesis" in window) || !text) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;

  const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
  const targetCodes = targetLang ? targetLang.voiceLocales : ["en-US"];

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) =>
    targetCodes.some((code) => v.lang.toLowerCase().replace("_", "-").startsWith(code.toLowerCase()))
  );

  if (matchedVoice) {
    utterance.voice = matchedVoice;
    utterance.lang = matchedVoice.lang;
  } else {
    utterance.lang = targetCodes[0];
  }

  window.speechSynthesis.speak(utterance);
}
