const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.*, s.shop_name 
      FROM notifications n
      JOIN shops s ON n.shop_id = s.id
      ORDER BY n.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/shop/:shopId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE shop_id = ? ORDER BY created_at DESC',
      [req.params.shopId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/shop/:shopId/read-all', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE shop_id = ?', [req.params.shopId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ Clear all notifications (keep BEFORE /:id delete)
router.delete('/clear/all', async (req, res) => {
  try {
    await db.query('DELETE FROM notifications');
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ Delete single notification
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
