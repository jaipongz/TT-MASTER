const { log } = require('handlebars');
const User = require('../models/User');
const { verifyPassword, createToken } = require('../utils/security');

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email and password are required' });
    }

    const user = await User.findByEmail(email);
    console.log('User',user);
    
    if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = createToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
    await User.createToken(user.id, token, expiresAt);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          display_name: user.display_name,
          is_admin: user.is_admin === 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, data: req.user });
};

exports.logout = async (req, res) => {
  try {
    await User.deleteToken(req.authToken);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};