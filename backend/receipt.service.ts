import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'child_process';
import { PrismaService } from './prisma.service';

type OcrWord = {
  text: string;
  confidence: number;
  block: number;
  paragraph: number;
  line: number;
};

type ReceiptField<T> = {
  value: T | null;
  confidence: 'low' | 'medium' | 'high' | null;
  evidence: string | null;
};

export type ReceiptAnalysis = {
  merchant: ReceiptField<string>;
  date: ReceiptField<string>;
  total: ReceiptField<number> & { currency: 'PLN' };
  suggestion: {
    accountId: number | null;
    transactionGroupId: number | null;
    transactionSubgroupId: number | null;
  };
  warnings: string[];
};

const MAX_OCR_OUTPUT_BYTES = 5 * 1024 * 1024;
const OCR_TIMEOUT_MS = 30_000;

@Injectable()
export class ReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(image: Buffer): Promise<ReceiptAnalysis> {
    this.assertSupportedImage(image);
    const tsv = await this.runTesseract(image);
    const words = this.parseTsv(tsv);
    if (words.length === 0) {
      throw new BadRequestException('Nie udało się odczytać tekstu z paragonu. Spróbuj zrobić wyraźniejsze zdjęcie.');
    }

    const lines = this.buildLines(words);
    const date = this.extractDate(lines);
    const total = this.extractTotal(lines);
    const merchant = this.extractMerchant(lines);
    const suggestion = await this.findSuggestion(merchant.value);
    const warnings: string[] = [];

    if (!date.value) warnings.push('Nie udało się rozpoznać daty zakupu.');
    if (!total.value) warnings.push('Nie udało się rozpoznać kwoty końcowej.');
    if (!merchant.value) warnings.push('Nie udało się rozpoznać sprzedawcy.');
    if (date.confidence === 'low') warnings.push('Sprawdź rozpoznaną datę.');
    if (total.confidence === 'low') warnings.push('Sprawdź rozpoznaną kwotę.');

    return {
      merchant,
      date,
      total: { ...total, currency: 'PLN' },
      suggestion,
      warnings,
    };
  }

  private assertSupportedImage(image: Buffer) {
    const isJpeg = image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
    const isPng = image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!isJpeg && !isPng) {
      throw new BadRequestException('Obsługiwane są wyłącznie obrazy JPEG i PNG.');
    }
  }

  private runTesseract(image: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('tesseract', ['stdin', 'stdout', '-l', 'pol+eng', '--psm', '6', 'tsv'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let outputSize = 0;
      let settled = false;

      const finish = (error?: Error, value?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(value ?? '');
      };

      const timer = setTimeout(() => {
        process.kill('SIGKILL');
        finish(new ServiceUnavailableException('Analiza paragonu trwała zbyt długo. Spróbuj ponownie.'));
      }, OCR_TIMEOUT_MS);

      process.stdout.on('data', (chunk: Buffer) => {
        outputSize += chunk.length;
        if (outputSize > MAX_OCR_OUTPUT_BYTES) {
          process.kill('SIGKILL');
          finish(new BadRequestException('Wynik OCR jest zbyt duży.'));
          return;
        }
        stdout.push(chunk);
      });
      process.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
      process.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          finish(new ServiceUnavailableException('Lokalny silnik OCR nie jest zainstalowany na serwerze.'));
          return;
        }
        finish(new ServiceUnavailableException('Nie udało się uruchomić lokalnego silnika OCR.'));
      });
      process.on('close', (code) => {
        if (code !== 0) {
          const detail = Buffer.concat(stderr).toString('utf8').trim().slice(0, 300);
          finish(new BadRequestException(detail || 'Tesseract nie mógł odczytać obrazu.'));
          return;
        }
        finish(undefined, Buffer.concat(stdout).toString('utf8'));
      });
      process.stdin.on('error', () => undefined);
      process.stdin.end(image);
    });
  }

  private parseTsv(tsv: string): OcrWord[] {
    return tsv
      .split(/\r?\n/)
      .slice(1)
      .map((row) => row.split('\t'))
      .filter((columns) => columns.length >= 12 && columns[11].trim())
      .map((columns) => ({
        block: Number(columns[2]),
        paragraph: Number(columns[3]),
        line: Number(columns[4]),
        confidence: Math.max(0, Number(columns[10]) || 0),
        text: columns.slice(11).join('\t').trim(),
      }));
  }

  private buildLines(words: OcrWord[]) {
    const grouped = new Map<string, OcrWord[]>();
    for (const word of words) {
      const key = `${word.block}:${word.paragraph}:${word.line}`;
      const current = grouped.get(key) ?? [];
      current.push(word);
      grouped.set(key, current);
    }
    return Array.from(grouped.values()).map((lineWords, index) => ({
      index,
      text: lineWords.map((word) => word.text).join(' ').replace(/\s+/g, ' ').trim(),
      confidence: lineWords.reduce((sum, word) => sum + word.confidence, 0) / lineWords.length,
    }));
  }

  private extractDate(lines: Array<{ text: string; confidence: number }>): ReceiptField<string> {
    const patterns = [
      /\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g,
      /\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|\d{2})\b/g,
    ];
    const candidates: Array<{ value: string; evidence: string; score: number; confidence: number }> = [];

    lines.forEach((line, lineIndex) => {
      patterns.forEach((pattern, patternIndex) => {
        for (const match of line.text.matchAll(pattern)) {
          const year = patternIndex === 0 ? Number(match[1]) : Number(match[3]) + (match[3].length === 2 ? 2000 : 0);
          const month = Number(match[2]);
          const day = patternIndex === 0 ? Number(match[3]) : Number(match[1]);
          const normalized = this.validDate(year, month, day);
          if (!normalized) continue;
          const hasDateLabel = /DATA|DATE|SPRZEDAŻ|SPRZEDAZ/i.test(line.text);
          candidates.push({
            value: normalized,
            evidence: line.text,
            confidence: line.confidence,
            score: line.confidence + (hasDateLabel ? 25 : 0) - lineIndex * 0.25,
          });
        }
      });
    });

    const best = candidates.sort((a, b) => b.score - a.score)[0];
    return best
      ? { value: best.value, evidence: best.evidence, confidence: this.confidenceLabel(best.confidence) }
      : { value: null, evidence: null, confidence: null };
  }

  private extractTotal(lines: Array<{ text: string; confidence: number }>): ReceiptField<number> {
    const amountPattern = /(?<!\d)(\d{1,3}(?:[ .]\d{3})*[,.]\d{2}|\d+[,.]\d{2})(?!\d)/g;
    const positiveRules = [
      { pattern: /SUMA\s*(?:PLN|ZŁ|ZL)?/i, points: 70 },
      { pattern: /DO\s+ZAPŁATY|DO\s+ZAPLATY/i, points: 65 },
      { pattern: /RAZEM/i, points: 45 },
      { pattern: /NALEŻNOŚĆ|NALEZNOSC/i, points: 40 },
      { pattern: /PŁATNOŚĆ|PLATNOSC|KARTA|GOTÓWKA|GOTOWKA/i, points: 20 },
    ];
    const negativePattern = /PTU|VAT|PODATEK|RABAT|RESZTA|CENA|SZT\.?|ILOŚĆ|ILOSC/i;
    const candidates: Array<{ value: number; evidence: string; score: number; confidence: number }> = [];

    lines.forEach((line, lineIndex) => {
      for (const match of line.text.matchAll(amountPattern)) {
        const value = Number(match[1].replace(/[ .](?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) continue;
        const ruleScore = positiveRules.reduce(
          (highest, rule) => (rule.pattern.test(line.text) ? Math.max(highest, rule.points) : highest),
          0,
        );
        const score = ruleScore + line.confidence * 0.2 + lineIndex * 0.7 - (negativePattern.test(line.text) ? 55 : 0);
        candidates.push({ value, evidence: line.text, score, confidence: line.confidence });
      }
    });

    const best = candidates.sort((a, b) => b.score - a.score)[0];
    return best
      ? { value: best.value, evidence: best.evidence, confidence: this.confidenceLabel(best.confidence, best.score >= 60) }
      : { value: null, evidence: null, confidence: null };
  }

  private extractMerchant(lines: Array<{ text: string; confidence: number }>): ReceiptField<string> {
    const knownMerchants: Array<[RegExp, string]> = [
      [/JERONIMO|BIEDRONKA/i, 'Biedronka'], [/LIDL/i, 'Lidl'], [/KAUFLAND/i, 'Kaufland'],
      [/ŻABKA|ZABKA/i, 'Żabka'], [/CARREFOUR/i, 'Carrefour'], [/AUCHAN/i, 'Auchan'],
      [/\bALDI\b/i, 'Aldi'], [/\bDINO\b/i, 'Dino'], [/\bORLEN\b/i, 'Orlen'],
      [/\bSHELL\b/i, 'Shell'], [/\bBP\b/i, 'BP'],
    ];
    for (const line of lines.slice(0, 15)) {
      const known = knownMerchants.find(([pattern]) => pattern.test(line.text));
      if (known) return { value: known[1], evidence: line.text, confidence: this.confidenceLabel(line.confidence, true) };
    }

    const excluded = /PARAGON|FISKAL|NIP|REGON|UL\.|ALEJA|AL\.|PLAC|TEL\.?|DATA|KASA|KASJER|SPRZED|WWW\.|HTTP|SUMA/i;
    const candidate = lines.slice(0, 10)
      .filter((line) => !excluded.test(line.text))
      .filter((line) => /[A-ZĄĆĘŁŃÓŚŹŻ]{2}/i.test(line.text) && line.text.replace(/[^\p{L}]/gu, '').length >= 3)
      .filter((line) => (line.text.match(/\d/g) ?? []).length < line.text.length / 2)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (!candidate) return { value: null, evidence: null, confidence: null };
    const value = candidate.text
      .replace(/\b(?:SP\.?\s*Z\s*O\.?O\.?|S\.?A\.?|SP\.?K\.?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/^[^\p{L}]+|[^\p{L}\d.)-]+$/gu, '')
      .trim()
      .slice(0, 120);
    return value
      ? { value, evidence: candidate.text, confidence: this.confidenceLabel(candidate.confidence) }
      : { value: null, evidence: null, confidence: null };
  }

  private async findSuggestion(merchant: string | null) {
    const empty = { accountId: null, transactionGroupId: null, transactionSubgroupId: null };
    const defaultAccountSetting = await this.prisma.globalSettings.findFirst({
      where: { key: 'receipt_default_account_id' },
      select: { value: true },
    });
    const defaultAccountId = Number(defaultAccountSetting?.value);
    const defaultAccount = Number.isInteger(defaultAccountId) && defaultAccountId > 0
      ? await this.prisma.account.findFirst({ where: { id: defaultAccountId }, select: { id: true } })
      : null;
    const fallback = { ...empty, accountId: defaultAccount?.id ?? null };
    if (!merchant) return fallback;
    const normalizedMerchant = this.normalizeMerchant(merchant);
    if (normalizedMerchant.length < 2) return fallback;
    const transactions = await this.prisma.transaction.findMany({
      where: { type: 'transaction', expense: { gt: 0 }, accountId: { not: null } },
      select: { info: true, accountId: true, transactionGroupId: true, transactionSubgroupId: true },
      orderBy: { date: 'desc' },
      take: 1000,
    });
    const matches = transactions.filter((transaction) => {
      const info = this.normalizeMerchant(transaction.info);
      return info === normalizedMerchant || info.includes(normalizedMerchant) || normalizedMerchant.includes(info);
    });
    if (matches.length === 0) return fallback;

    const count = <T>(values: T[]) => {
      const counts = new Map<T, number>();
      values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
      return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    };
    const categoryPairs = matches.map((item) => `${item.transactionGroupId ?? ''}:${item.transactionSubgroupId ?? ''}`);
    const [groupId, subgroupId] = String(count(categoryPairs) ?? ':').split(':');
    return {
      accountId: count(matches.map((item) => item.accountId)),
      transactionGroupId: groupId ? Number(groupId) : null,
      transactionSubgroupId: subgroupId ? Number(subgroupId) : null,
    };
  }

  private normalizeMerchant(value: string) {
    return value.toLocaleLowerCase('pl-PL').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(sp|z|o|sa|sklep|market)\b/g, ' ').replace(/\d+/g, ' ').replace(/[^a-ząćęłńóśźż]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  private validDate(year: number, month: number, day: number) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date > tomorrow || year < 2000) return null;
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private confidenceLabel(confidence: number, strongContext = false): 'low' | 'medium' | 'high' {
    if (confidence >= 85 && strongContext) return 'high';
    if (confidence >= 70) return 'medium';
    return 'low';
  }
}
