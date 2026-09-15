class DashboardService {
  constructor(repository) {
    if (!repository) throw new Error('DashboardService requiere un repositorio');
    this.repository = repository;
  }

  getStats() {
    return this.repository.getStats();
  }
}

module.exports = DashboardService;
