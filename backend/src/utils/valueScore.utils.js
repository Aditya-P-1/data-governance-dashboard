function clampScore(value) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return 0;
  }

  if (numericValue > 100) {
    return 100;
  }

  return Number(numericValue.toFixed(2));
}

function roundScore(value) {
  return Number(Number(value).toFixed(2));
}

function getCriticalityScore(criticality) {
  const map = {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 100,
  };

  return map[String(criticality || '').toUpperCase()] || 50;
}

function daysBetween(fromDate, toDate) {
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

function buildValueAssessment({
  overallScore,
  viewCount,
  viewsLast30Days,
  daysSinceLastViewed,
}) {
  const normalizedViewCount = Math.max(0, Number(viewCount || 0));
  const normalizedViewsLast30Days = Math.max(0, Number(viewsLast30Days || 0));
  const normalizedOverallScore = Math.max(0, Number(overallScore || 0));

  if (normalizedViewCount === 0 || normalizedViewsLast30Days === 0) {
    return {
      status: 'NO_ACTIVITY',
      label: 'No activity',
      tone: 'danger',
      recommendation:
        'Consider archival or retirement if this dataset is not required for active work.',
    };
  }

  if (
    normalizedOverallScore < 35 ||
    normalizedViewsLast30Days <= 2 ||
    (daysSinceLastViewed !== null && daysSinceLastViewed >= 30)
  ) {
    return {
      status: 'LOW_ACTIVITY',
      label: 'Low activity',
      tone: 'warning',
      recommendation:
        'Review for optimization, consolidation, or archival because recent usage is limited.',
    };
  }

  if (
    normalizedOverallScore < 60 ||
    normalizedViewsLast30Days <= 5 ||
    (daysSinceLastViewed !== null && daysSinceLastViewed >= 14)
  ) {
    return {
      status: 'MODERATE_ACTIVITY',
      label: 'Moderate activity',
      tone: 'warning',
      recommendation:
        'Monitor usage trends and revisit this dataset if activity continues to soften.',
    };
  }

  return {
    status: 'ACTIVE',
    label: 'Active',
    tone: 'success',
    recommendation: 'Usage looks healthy and the dataset is being accessed regularly.',
  };
}

function calculateValueScore({ viewCount, lastViewedAt, viewsLast30Days }) {
  const normalizedViewCount = Math.max(0, Number(viewCount || 0));
  const normalizedViewsLast30Days = Math.max(0, Number(viewsLast30Days || 0));
  const now = new Date();

  const viewCountScore = clampScore((normalizedViewCount / 20) * 100);
  const frequencyScore = clampScore((normalizedViewsLast30Days / 10) * 100);

  let freshnessScore = 0;
  let daysSinceLastViewed = null;

  if (lastViewedAt) {
    daysSinceLastViewed = daysBetween(new Date(lastViewedAt), now);
    freshnessScore = clampScore(100 - daysSinceLastViewed * 3);
  }

  const usageScore = roundScore(0.5 * viewCountScore + 0.5 * frequencyScore);
  const overallScore = roundScore(0.7 * usageScore + 0.3 * freshnessScore);
  const assessment = buildValueAssessment({
    overallScore,
    viewCount: normalizedViewCount,
    viewsLast30Days: normalizedViewsLast30Days,
    daysSinceLastViewed,
  });

  return {
    overallScore,
    usageScore,
    freshnessScore,
    viewCountScore,
    frequencyScore,
    daysSinceLastViewed,
    assessment,
  };
}

module.exports = {
  buildValueAssessment,
  calculateValueScore,
  getCriticalityScore,
  roundScore,
};
