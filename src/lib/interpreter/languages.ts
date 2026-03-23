export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "ur", name: "Urdu", nativeName: "\u0627\u0631\u062F\u0648", flag: "\u{1F1F5}\u{1F1F0}" },
  { code: "bn", name: "Bengali", nativeName: "\u09AC\u09BE\u0982\u09B2\u09BE", flag: "\u{1F1E7}\u{1F1E9}" },
  { code: "so", name: "Somali", nativeName: "Soomaali", flag: "\u{1F1F8}\u{1F1F4}" },
  { code: "ar", name: "Arabic", nativeName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "zh", name: "Mandarin Chinese", nativeName: "\u666E\u901A\u8BDD", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "ro", name: "Romanian", nativeName: "Rom\u00E2n\u0103", flag: "\u{1F1F7}\u{1F1F4}" },
  { code: "pt", name: "Portuguese", nativeName: "Portugu\u00EAs", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "gu", name: "Gujarati", nativeName: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "pa", name: "Punjabi", nativeName: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ta", name: "Tamil", nativeName: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "tr", name: "Turkish", nativeName: "T\u00FCrk\u00E7e", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "ckb", name: "Kurdish (Sorani)", nativeName: "\u06A9\u0648\u0631\u062F\u06CC \u0633\u06C6\u0631\u0627\u0646\u06CC", flag: "\u{1F1EE}\u{1F1F6}" },
  { code: "fa", name: "Farsi/Persian", nativeName: "\u0641\u0627\u0631\u0633\u06CC", flag: "\u{1F1EE}\u{1F1F7}" },
  { code: "fr", name: "French", nativeName: "Fran\u00E7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "es", name: "Spanish", nativeName: "Espa\u00F1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "ti", name: "Tigrinya", nativeName: "\u1275\u130D\u122D\u129B", flag: "\u{1F1EA}\u{1F1F7}" },
  { code: "am", name: "Amharic", nativeName: "\u12A0\u121B\u122D\u129B", flag: "\u{1F1EA}\u{1F1F9}" },
  { code: "ps", name: "Pashto", nativeName: "\u067E\u069A\u062A\u0648", flag: "\u{1F1E6}\u{1F1EB}" },
  { code: "sq", name: "Albanian", nativeName: "Shqip", flag: "\u{1F1E6}\u{1F1F1}" },
  { code: "vi", name: "Vietnamese", nativeName: "Ti\u1EBFng Vi\u1EC7t", flag: "\u{1F1FB}\u{1F1F3}" },
  { code: "th", name: "Thai", nativeName: "\u0E44\u0E17\u0E22", flag: "\u{1F1F9}\u{1F1ED}" },
  { code: "yue", name: "Cantonese", nativeName: "\u5EE3\u6771\u8A71", flag: "\u{1F1ED}\u{1F1F0}" },
  { code: "ja", name: "Japanese", nativeName: "\u65E5\u672C\u8A9E", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "ko", name: "Korean", nativeName: "\uD55C\uAD6D\uC5B4", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "ru", name: "Russian", nativeName: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "uk", name: "Ukrainian", nativeName: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvi\u0173", flag: "\u{1F1F1}\u{1F1F9}" },
  { code: "lv", name: "Latvian", nativeName: "Latvie\u0161u", flag: "\u{1F1F1}\u{1F1FB}" },
  { code: "hi", name: "Hindi", nativeName: "\u0939\u093F\u0928\u094D\u0926\u0940", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ne", name: "Nepali", nativeName: "\u0928\u0947\u092A\u093E\u0932\u0940", flag: "\u{1F1F3}\u{1F1F5}" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "yo", name: "Yoruba", nativeName: "Yor\u00F9b\u00E1", flag: "\u{1F1F3}\u{1F1EC}" },
];

export function getLanguageByCode(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}
