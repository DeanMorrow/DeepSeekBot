import { RUBRIC } from './rubric.mjs';

const JUDGMENTS = new Set(['score-inflated', 'rubric-ceiling', 'no-better-solution']);

function relativeGain(previous, current) {
  if (typeof previous !== 'number' || typeof current !== 'number') return undefined;
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous <= 0) return undefined;
  return (current - previous) / previous;
}

/**
 * Testable delivery gate. A missing live second model stays untested:
 * callers must pass two real context ids and run ids. This function does not
 * invent them, and a ceiling note is not a pass.
 */
export function evaluateDelivery(input) {
  const reasons = [];
  const judgment = input?.ceilingJudgment?.kind ?? null;
  if (input?.declaredKind === 'progress' || input?.evidenceClass === 'progress') {
    return {
      passed: false,
      reasons: ['progress-not-deliverable'],
      judgment,
      quality: null,
      confidence: null,
    };
  }
  if (input?.subjectKind === 'review') {
    return {
      passed: false,
      reasons: ['review-recursion'],
      judgment,
      quality: null,
      confidence: null,
    };
  }
  if (input?.approvalBypassesGate === true) reasons.push('approval-does-not-bypass');
  if (input?.rubricVersion !== RUBRIC.version) reasons.push('rubric-version');
  if (input?.maxScore !== undefined && input?.maxScore !== RUBRIC.max)
    reasons.push('ceiling-raised');
  if (input?.baselineFrozen !== input?.baselineScore) reasons.push('baseline-moved');

  const contexts = Array.isArray(input?.contexts) ? input.contexts : [];
  const producer = contexts.find((item) => item.role === 'producer');
  const reviewer = contexts.find((item) => item.role === 'reviewer');
  if (!producer?.id || !reviewer?.id || producer.id === reviewer.id)
    reasons.push('second-context-missing');
  if (
    producer?.model &&
    reviewer?.model &&
    producer.model === reviewer.model &&
    input?.sameModelDisclosed !== true
  ) {
    reasons.push('same-model-undisclosed');
  }

  const rounds = Array.isArray(input?.rounds) ? input.rounds : [];
  if (rounds.length < RUBRIC.minRounds || rounds.length > RUBRIC.maxRounds)
    reasons.push('round-count');

  let previous = input?.baselineScore;
  let effective = 0;
  for (const round of rounds) {
    if (round.producerQuestion !== RUBRIC.question || round.reviewerQuestion !== RUBRIC.question) {
      reasons.push('question-missing');
    }
    if (!round.producerRunId || !round.reviewerRunId) reasons.push('run-evidence-missing');
    if (round.reviewerVerdict === 'fail' && round.signedBy === 'producer')
      reasons.push('producer-self-sign');
    if (round.reviewerVerdict !== 'pass') reasons.push('reviewer-failed');
    if (typeof round.quality === 'number' && round.quality > RUBRIC.max)
      reasons.push('score-above-max');
    const gain = relativeGain(previous, round.quality);
    if (gain === undefined) reasons.push('gain-unmeasurable');
    else if (gain + 1e-12 >= RUBRIC.minRelativeGain) effective += 1;
    else reasons.push('gain-below-5');
    previous = round.quality;
  }
  if (effective < 1) reasons.push('no-effective-round');

  const hard = Array.isArray(input?.hardChecks) ? input.hardChecks : [];
  if (hard.length === 0 || hard.some((item) => item.pass !== true)) reasons.push('hard-check');

  const confidence = input?.confidence;
  if (typeof confidence?.value !== 'number' || confidence.value <= RUBRIC.confidenceExclusiveMin) {
    reasons.push('confidence');
  }
  if (!confidence?.evidenceNote) reasons.push('confidence-evidence');
  if (confidence?.claimsProbability === true) reasons.push('confidence-not-probability');

  if (input?.ceilingJudgment) {
    if (!JUDGMENTS.has(input.ceilingJudgment.kind)) reasons.push('bad-judgment');
    if (
      !Array.isArray(input.ceilingJudgment.attempts) ||
      input.ceilingJudgment.attempts.length === 0
    ) {
      reasons.push('ceiling-evidence');
    }
    if (
      typeof input.ceilingJudgment.remaining !== 'string' ||
      input.ceilingJudgment.remaining.trim() === ''
    ) {
      reasons.push('ceiling-evidence');
    }
    reasons.push('ceiling-not-pass');
  }

  return {
    passed: reasons.length === 0,
    reasons: [...new Set(reasons)],
    judgment,
    quality: rounds.at(-1)?.quality ?? null,
    confidence: typeof confidence?.value === 'number' ? confidence.value : null,
  };
}
