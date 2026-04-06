const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT bp.*, b.brand_name, c.category_name 
      FROM brand_prices bp
      JOIN brands b ON bp.brand_id = b.id
      JOIN categories c ON b.category_id = c.id
      ORDER BY c.id, b.id, bp.size_type`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/brand/:brandId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM brand_prices WHERE brand_id = ? ORDER BY size_type',
      [req.params.brandId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { price } = req.body;
    const [old] = await db.query('SELECT * FROM brand_prices WHERE id = ?', [req.params.id]);
    if (old.length === 0) {
      return res.status(404).json({ message: 'Price not found' });
    }
    await db.query(
      `INSERT INTO brand_price_history 
      (brand_id, size_type, old_price, new_price) 
      VALUES (?, ?, ?, ?)`,
      [old[0].brand_id, old[0].size_type, old[0].price, price]
    );
    await db.query(
      'UPDATE brand_prices SET price = ?, effective_from = NOW() WHERE id = ?',
      [price, req.params.id]
    );
    res.json({ message: 'Price updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/history/:brandId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT bph.*, b.brand_name 
      FROM brand_price_history bph
      JOIN brands b ON bph.brand_id = b.id
      WHERE bph.brand_id = ?
      ORDER BY bph.changed_at DESC`,
      [req.params.brandId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
