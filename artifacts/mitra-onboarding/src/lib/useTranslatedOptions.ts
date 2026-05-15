import { useState, useEffect } from 'react';
import { translateText } from './translate';

export function useTranslatedOptions(options: string[], language: string) {
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!options.length || language === 'English') {
      setTranslatedMap({});
      return;
    }

    let isMounted = true;

    const translateOptions = async () => {
      // Create an array of promises to translate options that aren't cached locally yet
      const promises = options.map(async (opt) => {
        try {
          const translated = await translateText(opt, language);
          return { original: opt, translated };
        } catch (e) {
          return { original: opt, translated: opt };
        }
      });

      const results = await Promise.all(promises);
      if (isMounted) {
        const newMap = { ...translatedMap };
        results.forEach(({ original, translated }) => {
          newMap[original] = translated;
        });
        setTranslatedMap(newMap);
      }
    };

    translateOptions();

    return () => {
      isMounted = false;
    };
  }, [options.join('|'), language]);

  return translatedMap;
}

export function useTranslatedObjectArray<T extends Record<string, any>>(
  items: T[],
  keysToTranslate: (keyof T)[],
  language: string
) {
  const [translatedItems, setTranslatedItems] = useState<T[]>(items);

  useEffect(() => {
    if (!items.length || language === 'English') {
      setTranslatedItems(items);
      return;
    }

    let isMounted = true;

    const translateItems = async () => {
      const promises = items.map(async (item) => {
        const newItem = { ...item };
        for (const key of keysToTranslate) {
          const text = item[key];
          if (typeof text === 'string' && text) {
            try {
              const translated = await translateText(text, language);
              newItem[key] = translated as any;
            } catch (e) {
              // keep original
            }
          }
        }
        return newItem;
      });

      const results = await Promise.all(promises);
      if (isMounted) {
        setTranslatedItems(results);
      }
    };

    translateItems();

    return () => {
      isMounted = false;
    };
  }, [items, language, keysToTranslate.join(',')]);

  return translatedItems;
}
