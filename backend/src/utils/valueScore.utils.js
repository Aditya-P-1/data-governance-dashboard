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

  return {
    overallScore,
    usageScore,
    freshnessScore,
    viewCountScore,
    frequencyScore,
    daysSinceLastViewed,
  };
}

module.exports = {
  calculateValueScore,
  getCriticalityScore,
  roundScore,
};
