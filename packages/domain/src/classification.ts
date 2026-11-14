import type { TransactionNature } from './finance.ts';

export const classifierVersion = 'rules-v1';
export type ClassificationEvidenceKind = 'merchant' | 'alias' | 'token' | 'account' | 'nature';
export type ClassificationRule = {
  id: string;
  categoryId: string;
  kind: ClassificationEvidenceKind;
  value: string;
  weightBasisPoints: number;
};
export type ClassificationCandidate = {
  description: string;
  merchant?: string;
  accountId: string;
  nature: TransactionNature;
};
export type ClassificationEvidence = {
  ruleId: string;
  kind: ClassificationEvidenceKind;
  value: string;
  weightBasisPoints: number;
};
export type ClassificationResult = {
  categoryId?: string;
  confidenceBasisPoints: number;
  status: 'automatic' | 'suggested' | 'uncategorized';
  normalizedDescription: string;
  evidence: ClassificationEvidence[];
  version: string;
};

const stopWords = new Set(['a', 'ao', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'no', 'nos', 'na', 'nas', 'para', 'por']);

export function normalizeClassificationText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function classificationTokens(value: string): string[] {
  return [...new Set(normalizeClassificationText(value).split(' ').filter(token => token.length >= 2 && !stopWords.has(token)))];
}

function ruleMatches(rule: ClassificationRule, candidate: ClassificationCandidate, normalizedDescription: string, tokens: Set<string>): boolean {
  const value = normalizeClassificationText(rule.value);
  if (!value) return false;
  if (rule.kind === 'merchant') return normalizeClassificationText(candidate.merchant ?? '') === value;
  if (rule.kind === 'alias') return normalizedDescription === value;
  if (rule.kind === 'token') return tokens.has(value);
  if (rule.kind === 'account') return candidate.accountId === rule.value;
  return candidate.nature === rule.value;
}

export function classifyTransaction(
  candidate: ClassificationCandidate,
  rules: readonly ClassificationRule[],
  version = classifierVersion
): ClassificationResult {
  const normalizedDescription = normalizeClassificationText(candidate.description);
  const tokens = new Set(classificationTokens(candidate.description));
  const byCategory = new Map<string, ClassificationEvidence[]>();
  for (const rule of rules) {
    if (!Number.isInteger(rule.weightBasisPoints) || rule.weightBasisPoints < 1 || rule.weightBasisPoints > 10000) {
      throw new RangeError('Peso da regra de classificação inválido.');
    }
    if (!ruleMatches(rule, candidate, normalizedDescription, tokens)) continue;
    const evidence = byCategory.get(rule.categoryId) ?? [];
    evidence.push({ ruleId: rule.id, kind: rule.kind, value: rule.value, weightBasisPoints: rule.weightBasisPoints });
    byCategory.set(rule.categoryId, evidence);
  }
  const ranked = [...byCategory.entries()].map(([categoryId, evidence]) => ({
    categoryId,
    evidence,
    score: Math.min(10000, evidence.reduce((total, item) => total + item.weightBasisPoints, 0))
  })).sort((left, right) => right.score - left.score || left.categoryId.localeCompare(right.categoryId));
  const winner = ranked[0];
  if (!winner || (ranked[1] && ranked[1].score === winner.score)) {
    return { confidenceBasisPoints: 0, status: 'uncategorized', normalizedDescription, evidence: [], version };
  }
  const status = winner.score >= 9000 ? 'automatic' : winner.score >= 7000 ? 'suggested' : 'uncategorized';
  return {
    ...(status === 'uncategorized' ? {} : { categoryId: winner.categoryId }),
    confidenceBasisPoints: winner.score,
    status,
    normalizedDescription,
    evidence: winner.evidence,
    version
  };
}
