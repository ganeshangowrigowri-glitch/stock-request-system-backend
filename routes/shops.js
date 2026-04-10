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

//  FIXED — Delete shop with all related data first
router.delete('/:id', async (req, res) => {
  try {
    const shopId = req.params.id;

    
    const [requests] = await db.query(
      'SELECT id FROM requests WHERE shop_id = ?',
      [shopId]
    );

   
    for (const request of requests) {
      await db.query(
        'DELETE FROM request_items WHERE request_id = ?',
        [request.id]
      );
      await db.query(
        'DELETE FROM notifications WHERE request_id = ?',
        [request.id]
      );
    }

   
    await db.query(
      'DELETE FROM notifications WHERE shop_id = ?',
      [shopId]
    );


    await db.query(
      'DELETE FROM requests WHERE shop_id = ?',
      [shopId]
    );

  
    await db.query(
      'DELETE FROM shops WHERE id = ?',
      [shopId]
    );

    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Delete shop error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
});

module.exports = router;
