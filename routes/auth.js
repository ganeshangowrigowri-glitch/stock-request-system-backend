const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const user = rows[0];
    if (password !== user.password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
