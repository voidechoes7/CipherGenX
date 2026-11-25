/**
 * 100% offline NATO phonetic alphabet spelling utility for unambiguous
 * verbal dictation and air-gapped manual transcription of secrets.
 */

export type NatoCategory = "upper" | "lower" | "digit" | "symbol" | "space";

export interface NatoToken {
  index: number;
  char: string;
  word: string;
  category: NatoCategory;
}

const NATO_LETTERS: Record<string, string> = {
  a: "Alfa",
  b: "Bravo",
  c: "Charlie",
  d: "Delta",
  e: "Echo",
  f: "Foxtrot",
  g: "Golf",
  h: "Hotel",
  i: "India",
  j: "Juliett",
  k: "Kilo",
  l: "Lima",
  m: "Mike",
  n: "November",
  o: "Oscar",
  p: "Papa",
  q: "Quebec",
  r: "Romeo",
  s: "Sierra",
  t: "Tango",
  u: "Uniform",
  v: "Victor",
  w: "Whiskey",
  x: "X-ray",
  y: "Yankee",
  z: "Zulu",
};

const NATO_DIGITS: Record<string, string> = {
  "0": "Cero",
  "1": "Uno",
  "2": "Dos",
  "3": "Tres",
  "4": "Cuatro",
  "5": "Cinco",
  "6": "Seis",
  "7": "Siete",
  "8": "Ocho",
  "9": "Nueve",
};

const NATO_SYMBOLS: Record<string, string> = {
  "!": "Exclamación",
  "@": "Arroba",
  "#": "Numeral",
  $: "Dólar",
  "%": "Porcentaje",
  "^": "Circunflejo",
  "&": "Ampersand",
  "*": "Asterisco",
  "-": "Guion",
  _: "Guion bajo",
  "=": "Igual",
  "+": "Más",
  "?": "Interrogación",
  ".": "Punto",
  ",": "Coma",
  "/": "Barra",
  "\\": "Barra inv.",
  "|": "Barra vert.",
  ":": "Dos puntos",
  ";": "Punto y coma",
  "~": "Virgulilla",
  "(": "Paréntesis (",
  ")": "Paréntesis )",
  "[": "Corchete [",
  "]": "Corchete ]",
  "{": "Llave {",
  "}": "Llave }",
  "<": "Menor que",
  ">": "Mayor que",
  "'": "Comilla simple",
  '"': "Comilla doble",
  "`": "Acento grave",
};

export function spellNato(secret: string): NatoToken[] {
  return [...secret].map((char, idx) => {
    const lower = char.toLowerCase();
    if (char >= "A" && char <= "Z") {
      return {
        index: idx + 1,
        char,
        word: (NATO_LETTERS[lower] ?? char).toUpperCase(),
        category: "upper" as const,
      };
    }
    if (char >= "a" && char <= "z") {
      return {
        index: idx + 1,
        char,
        word: (NATO_LETTERS[lower] ?? char).toLowerCase(),
        category: "lower" as const,
      };
    }
    if (char >= "0" && char <= "9") {
      return {
        index: idx + 1,
        char,
        word: NATO_DIGITS[char] ?? char,
        category: "digit" as const,
      };
    }
    if (char === " ") {
      return {
        index: idx + 1,
        char: "␣",
        word: "Espacio",
        category: "space" as const,
      };
    }
    return {
      index: idx + 1,
      char,
      word: NATO_SYMBOLS[char] ?? `Símbolo (${char})`,
      category: "symbol" as const,
    };
  });
}

export function formatNatoPlaintext(secret: string): string {
  return spellNato(secret)
    .map((t) => {
      const tag =
        t.category === "upper"
          ? `${t.word} (MAYÚS)`
          : t.category === "lower"
          ? `${t.word} (minús)`
          : t.word;
      return `${t.index}. [${t.char}] ${tag}`;
    })
    .join("  •  ");
}
