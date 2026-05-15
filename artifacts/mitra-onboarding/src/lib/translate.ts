const translationCache = new Map<string, string>();

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text) return text;
  if (targetLang === 'English') return text;
  
  const langCode = targetLang === 'Hindi' ? 'hi' : targetLang === 'Kannada' ? 'kn' : 'en';
  if (langCode === 'en') return text;

  const cacheKey = `${langCode}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      const translatedText = data[0].map((item: any) => item[0]).join('');
      translationCache.set(cacheKey, translatedText);
      return translatedText;
    }
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}
