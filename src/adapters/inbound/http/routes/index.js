module.exports = {
  auth: require('./auth.routes'),
  patients: require('./patients.routes'),
  students: require('./students.routes'),
  assignments: require('./assignments.routes'),
  matching: require('./matching.routes'),
  dashboard: require('./dashboard.routes'),
  notifications: require('./notifications.routes'),
};
