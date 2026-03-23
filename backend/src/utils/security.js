const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function createSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function verifyPassword(password, hash, salt) {
  return hashPassword(password, salt) === hash;
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  hashPassword,
  createSalt,
  verifyPassword,
  createToken
};