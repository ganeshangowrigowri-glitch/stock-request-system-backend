const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Add your new routes here **before** the DELETE route

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, c.category_name,
      GROUP_CONCAT(CONCAT(bp.size_type, ':', bp.price) ORDER BY bp.size_type SEPARATOR ',') as prices
      FROM brands b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN brand_prices bp ON b.id = bp.brand_id
      GROUP BY b.id
      ORDER BY c.id, b.id`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { brand_name, category_id, prices } = req.body;
    const [result] = await db.query(
      'INSERT INTO brands (category_id, brand_name) VALUES (?, ?)',
      [category_id, brand_name]
    );
    const brand_id = result.insertId;
    for (const p of prices) {
      await db.query(
        'INSERT INTO brand_prices (brand_id, size_type, price) VALUES (?, ?, ?)',
        [brand_id, p.size_type, p.price]
      );
    }
    res.json({ message: 'Brand added successfully', brand_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { brand_name, category_id } = req.body;
    await db.query(
      'UPDATE brands SET brand_name = ?, category_id = ? WHERE id = ?',
      [brand_name, category_id, req.params.id]
    );
    res.json({ message: 'Brand updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const brandId = req.params.id;

    // First check if brand has request items
    const [items] = await db.query(
      'SELECT id FROM request_items WHERE brand_id = ?',
      [brandId]
    );

    // Delete request items first if any
    if (items.length > 0) {
      await db.query('DELETE FROM request_items WHERE brand_id = ?', [brandId]);
    }

    // Delete prices
    await db.query('DELETE FROM brand_prices WHERE brand_id = ?', [brandId]);

    // Delete price history
    await db.query('DELETE FROM brand_price_history WHERE brand_id = ?', [brandId]);

    // Now delete brand
    await db.query('DELETE FROM brands WHERE id = ?', [brandId]);

    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
