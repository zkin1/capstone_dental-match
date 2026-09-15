const bcrypt = require('bcryptjs');

module.exports = {
  hash(value) {
    return bcrypt.hash(value, 12);
  },
  compare(value, hash) {
    return bcrypt.compare(value, hash);
  },
};
