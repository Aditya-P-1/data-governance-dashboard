const { getDashboardDatasets } = require('../services/dashboard.service');

async function listDashboard(req, res, next) {
  try {
    const result = await getDashboardDatasets(req.query);
    return res.success(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listDashboard,
};
