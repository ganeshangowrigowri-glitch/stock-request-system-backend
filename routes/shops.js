const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM shops ORDER BY shop_name');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM shops WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Add new shop
router.post('/', async (req, res) => {
  try {
    const { shop_name } = req.body;
    if (!shop_name || shop_name.trim() === '') {
      return res.status(400).json({ message: 'Shop name is required' });
    }
    const [result] = await db.query(
      'INSERT INTO shops (shop_name) VALUES (?)',
      [shop_name.trim()]
    );
    res.json({ message: 'Shop added successfully', shop_id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit shop name
router.put('/:id', async (req, res) => {
  try {
    const { shop_name } = req.body;
    if (!shop_name || shop_name.trim() === '') {
      return res.status(400).json({ message: 'Shop name is required' });
    }
    await db.query(
      'UPDATE shops SET shop_name = ? WHERE id = ?',
      [shop_name.trim(), req.params.id]
    );
    res.json({ message: 'Shop updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete shop
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM shops WHERE id = ?', [req.params.id]);
    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
