/** Fixed delivery rubric. Do not raise the ceiling or retune weights to manufacture a pass. */
export const RUBRIC_VERSION = '2026-11-06.1';

export const RUBRIC = {
  version: RUBRIC_VERSION,
  max: 100,
  weights: { correctness: 40, evidence: 25, safety: 20, completeness: 15 },
  confidenceExclusiveMin: 80,
  minRelativeGain: 0.05,
  minRounds: 1,
  maxRounds: 3,
  question: '你确定这是你能给出的最佳答案吗？',
};

const WEIGHT_TOTAL = Object.values(RUBRIC.weights).reduce((sum, value) => sum + value, 0);
if (WEIGHT_TOTAL !== RUBRIC.max) {
  throw new Error(`Rubric weights must sum to ${RUBRIC.max}`);
}
