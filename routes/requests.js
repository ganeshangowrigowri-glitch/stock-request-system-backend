const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/', async (req, res) => {
  try {
    const { shop_id, category_id, items } = req.body;

    const hasQuantity = items.some(item =>
      item.request_1 > 0 || item.request_2 > 0 || item.request_3 > 0 ||
      item.request_4 > 0 || item.request_5 > 0
    );

    if (!hasQuantity) {
      return res.status(400).json({ message: 'Please enter at least one quantity before submitting.' });
    }

    const [result] = await db.query(
      'INSERT INTO requests (shop_id, category_id, status) VALUES (?, ?, ?)',
      [shop_id, category_id, 'pending']
    );

    const request_id = result.insertId;

    for (const item of items) {
      const [brandRows] = await db.query(
        'SELECT id FROM brands WHERE brand_name = ? AND category_id = ?',
        [item.brand_name, category_id]
      );
      if (brandRows.length > 0) {
        const brand_id = brandRows[0].id;
        await db.query(
          `INSERT INTO request_items
          (request_id, brand_id,
          present_1, present_2, present_3, present_4, present_5,
          request_1, request_2, request_3, request_4, request_5)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            request_id, brand_id,
            item.present_1 || 0, item.present_2 || 0, item.present_3 || 0,
            item.present_4 || 0, item.present_5 || 0,
            item.request_1 || 0, item.request_2 || 0, item.request_3 || 0,
            item.request_4 || 0, item.request_5 || 0,
          ]
        );
      }
    }

    await db.query(
      'INSERT INTO notifications (shop_id, request_id, message) VALUES (?, ?, ?)',
      [shop_id, request_id, 'New request submitted']
    );

    res.json({ message: 'Request submitted successfully', request_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, s.shop_name, c.category_name
      FROM requests r
      JOIN shops s ON r.shop_id = s.id
      JOIN categories c ON r.category_id = c.id
      ORDER BY r.submitted_at DESC`
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
      `SELECT r.*, c.category_name
      FROM requests r
      JOIN categories c ON r.category_id = c.id
      WHERE r.shop_id = ?
      ORDER BY r.submitted_at DESC`,
      [req.params.shopId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/sales/summary', async (req, res) => {
  try {
    const { category_id, filter } = req.query;
    let dateFilter = '';
    if (filter === 'daily')   dateFilter = 'AND DATE(r.submitted_at) = CURDATE()';
    if (filter === 'weekly')  dateFilter = 'AND r.submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    if (filter === 'monthly') dateFilter = 'AND r.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    const [rows] = await db.query(
      `SELECT
        s.shop_name, b.brand_name, b.id as brand_id, c.category_type,
        SUM(ri.request_1) as qty_1, SUM(ri.request_2) as qty_2,
        SUM(ri.request_3) as qty_3, SUM(ri.request_4) as qty_4,
        SUM(ri.request_5) as qty_5,
        SUM(ri.request_1 + ri.request_2 + ri.request_3 + ri.request_4 + ri.request_5) as total_requested
      FROM request_items ri
      JOIN requests r ON ri.request_id = r.id
      JOIN shops s ON r.shop_id = s.id
      JOIN brands b ON ri.brand_id = b.id
      JOIN categories c ON r.category_id = c.id
      WHERE r.category_id = ? ${dateFilter}
      GROUP BY s.shop_name, b.brand_name, b.id, c.category_type
      ORDER BY s.shop_name, b.brand_name`,
      [category_id]
    );

    const [prices] = await db.query(
      `SELECT bp.brand_id, bp.size_type, bp.price
      FROM brand_prices bp
      JOIN brands b ON bp.brand_id = b.id
      WHERE b.category_id = ?`,
      [category_id]
    );

    const result = rows.map(row => {
      const brandPrices = prices.filter(p => parseInt(p.brand_id) === parseInt(row.brand_id));
      const getPrice = (sizeType) => {
        const p = brandPrices.find(p => p.size_type === sizeType);
        return p ? parseFloat(p.price) : 0;
      };
      let totalAmount = 0;
      if (row.category_type === 'beer') {
        totalAmount =
          ((parseInt(row.qty_1) || 0) * getPrice('625ml Btl')) +
          ((parseInt(row.qty_2) || 0) * getPrice('500ml Cane')) +
          ((parseInt(row.qty_3) || 0) * getPrice('330ml Cane')) +
          ((parseInt(row.qty_4) || 0) * getPrice('500ml Btl')) +
          ((parseInt(row.qty_5) || 0) * getPrice('325ml Btl'));
      } else {
        totalAmount =
          ((parseInt(row.qty_1) || 0) * getPrice('Q')) +
          ((parseInt(row.qty_2) || 0) * getPrice('P')) +
          ((parseInt(row.qty_3) || 0) * getPrice('N'));
      }
      return { ...row, total_amount: totalAmount.toFixed(2) };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/approved/summary', async (req, res) => {
  try {
    const { category_id, filter } = req.query;
    let dateFilter = '';
    if (filter === 'daily')   dateFilter = 'AND DATE(r.submitted_at) = CURDATE()';
    if (filter === 'weekly')  dateFilter = 'AND r.submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    if (filter === 'monthly') dateFilter = 'AND r.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    const [rows] = await db.query(`
      SELECT
        s.shop_name, b.brand_name, b.id as brand_id, c.category_type,
        SUM(ri.approved_1) as qty_1,
        SUM(ri.approved_2) as qty_2,
        SUM(ri.approved_3) as qty_3,
        SUM(ri.approved_4) as qty_4,
        SUM(ri.approved_5) as qty_5,
        SUM(ri.approved_1 + ri.approved_2 + ri.approved_3 +
            ri.approved_4 + ri.approved_5) as total_approved
      FROM request_items ri
      JOIN requests r  ON ri.request_id = r.id
      JOIN shops s     ON r.shop_id     = s.id
      JOIN brands b    ON ri.brand_id   = b.id
      JOIN categories c ON r.category_id = c.id
      WHERE r.category_id = ?
        AND r.status IN ('approved', 'received')
        ${dateFilter}
      GROUP BY s.shop_name, b.brand_name, b.id, c.category_type
      ORDER BY s.shop_name, b.brand_name
    `, [category_id]);

    const [prices] = await db.query(`
      SELECT bp.brand_id, bp.size_type, bp.price
      FROM brand_prices bp
      JOIN brands b ON bp.brand_id = b.id
      WHERE b.category_id = ?
    `, [category_id]);

    const result = rows.map(row => {
      const brandPrices = prices.filter(p =>
        parseInt(p.brand_id) === parseInt(row.brand_id)
      );
      const getPrice = (sizeType) => {
        const found = brandPrices.find(p => p.size_type === sizeType);
        return found ? parseFloat(found.price) : 0;
      };
      let totalAmount = 0;
      if (row.category_type === 'beer') {
        totalAmount =
          ((parseInt(row.qty_1) || 0) * getPrice('625ml Btl'))  +
          ((parseInt(row.qty_2) || 0) * getPrice('500ml Cane')) +
          ((parseInt(row.qty_3) || 0) * getPrice('330ml Cane')) +
          ((parseInt(row.qty_4) || 0) * getPrice('500ml Btl'))  +
          ((parseInt(row.qty_5) || 0) * getPrice('325ml Btl'));
      } else {
        totalAmount =
          ((parseInt(row.qty_1) || 0) * getPrice('Q')) +
          ((parseInt(row.qty_2) || 0) * getPrice('P')) +
          ((parseInt(row.qty_3) || 0) * getPrice('N'));
      }
      return {
        ...row,
        qty_1: parseInt(row.qty_1) || 0,
        qty_2: parseInt(row.qty_2) || 0,
        qty_3: parseInt(row.qty_3) || 0,
        qty_4: parseInt(row.qty_4) || 0,
        qty_5: parseInt(row.qty_5) || 0,
        total_approved: parseInt(row.total_approved) || 0,
        total_amount: totalAmount.toFixed(2),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Approved summary error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
});

// ✅ NEW — Present Stock Summary route only added here
router.get('/present/summary', async (req, res) => {
  try {
    const { category_id, filter } = req.query;
    let dateFilter = '';
    if (filter === 'daily')   dateFilter = 'AND DATE(r.submitted_at) = CURDATE()';
    if (filter === 'weekly')  dateFilter = 'AND r.submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    if (filter === 'monthly') dateFilter = 'AND r.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    const [rows] = await db.query(`
      SELECT
        s.shop_name,
        b.brand_name,
        b.id as brand_id,
        c.category_type,
        SUM(ri.present_1) as qty_1,
        SUM(ri.present_2) as qty_2,
        SUM(ri.present_3) as qty_3,
        SUM(ri.present_4) as qty_4,
        SUM(ri.present_5) as qty_5,
        SUM(ri.present_1 + ri.present_2 + ri.present_3 +
            ri.present_4 + ri.present_5) as total_present
      FROM request_items ri
      JOIN requests r   ON ri.request_id = r.id
      JOIN shops s      ON r.shop_id     = s.id
      JOIN brands b     ON ri.brand_id   = b.id
      JOIN categories c ON r.category_id = c.id
      WHERE r.category_id = ?
        ${dateFilter}
      GROUP BY s.shop_name, b.brand_name, b.id, c.category_type
      ORDER BY s.shop_name, b.brand_name
    `, [category_id]);

    res.json(rows);
  } catch (error) {
    console.error('Present summary error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [request] = await db.query(
      `SELECT r.*, s.shop_name, c.category_name, c.category_type
      FROM requests r
      JOIN shops s ON r.shop_id = s.id
      JOIN categories c ON r.category_id = c.id
      WHERE r.id = ?`,
      [req.params.id]
    );
    if (request.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    const [items] = await db.query(
      `SELECT ri.*, b.brand_name
      FROM request_items ri
      JOIN brands b ON ri.brand_id = b.id
      WHERE ri.request_id = ?`,
      [req.params.id]
    );
    res.json({ request: request[0], items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await db.query(
        `UPDATE request_items SET
        approved_1 = ?, approved_2 = ?, approved_3 = ?,
        approved_4 = ?, approved_5 = ?
        WHERE id = ?`,
        [
          item.approved_1 || 0, item.approved_2 || 0, item.approved_3 || 0,
          item.approved_4 || 0, item.approved_5 || 0, item.id,
        ]
      );
    }
    await db.query('UPDATE requests SET status = ? WHERE id = ?', ['approved', req.params.id]);
    const [request] = await db.query('SELECT shop_id FROM requests WHERE id = ?', [req.params.id]);
    await db.query(
      'INSERT INTO notifications (shop_id, request_id, message) VALUES (?, ?, ?)',
      [request[0].shop_id, req.params.id, 'Your request has been approved']
    );
    res.json({ message: 'Request approved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/reject', async (req, res) => {
  try {
    await db.query('UPDATE requests SET status = ? WHERE id = ?', ['rejected', req.params.id]);
    const [request] = await db.query('SELECT shop_id FROM requests WHERE id = ?', [req.params.id]);
    await db.query(
      'INSERT INTO notifications (shop_id, request_id, message) VALUES (?, ?, ?)',
      [request[0].shop_id, req.params.id, 'Your request has been rejected']
    );
    res.json({ message: 'Request rejected successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/received', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE requests SET status = ? WHERE id = ?',
      ['received', req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found with this ID' });
    }
    const [requestRow] = await db.query(
      'SELECT shop_id FROM requests WHERE id = ?',
      [req.params.id]
    );
    if (requestRow.length > 0) {
      await db.query(
        'INSERT INTO notifications (shop_id, request_id, message) VALUES (?, ?, ?)',
        [requestRow[0].shop_id, req.params.id, 'Order has been received by the bar']
      );
    }
    res.json({ message: 'Order marked as received' });
  } catch (error) {
    console.error('Received error:', error);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
});

router.delete('/clear/old', async (req, res) => {
  try {
    const [oldRequests] = await db.query(
      'SELECT id FROM requests WHERE submitted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    for (const reqItem of oldRequests) {
      await db.query('DELETE FROM request_items WHERE request_id = ?', [reqItem.id]);
      await db.query('DELETE FROM notifications WHERE request_id = ?', [reqItem.id]);
    }
    await db.query('DELETE FROM requests WHERE submitted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)');
    res.json({ message: 'Old requests cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM request_items WHERE request_id = ?', [req.params.id]);
    await db.query('DELETE FROM notifications WHERE request_id = ?', [req.params.id]);
    await db.query('DELETE FROM requests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;