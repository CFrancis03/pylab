/** Join lines of Python source. Avoids quote-escaping headaches in content files. */
export const src = (...lines: string[]): string => lines.join('\n')
