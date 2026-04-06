const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT b.*, c.category_name FROM brands b JOIN categories c ON b.category_id = c.id ORDER BY b.category_id, b.id'
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/category/:categoryId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM brands WHERE category_id = ? ORDER BY id',
      [req.params.categoryId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
