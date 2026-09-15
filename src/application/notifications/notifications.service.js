class NotificationsService {
  constructor(repository) {
    if (!repository) throw new Error('NotificationsService requiere un repositorio');
    this.repository = repository;
  }

  list(limit) {
    return this.repository.list(limit);
  }
}

module.exports = NotificationsService;
