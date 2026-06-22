const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://boisterous-tanuki-9ae322.netlify.app'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.get('/', (req, res) => {
  res.json({ message: 'Stock Request System API is running!' });
});

const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
const categoryRoutes = require('./routes/categories');
const brandRoutes = require('./routes/brands');
const requestRoutes = require('./routes/requests');
const notificationRoutes = require('./routes/notifications');
const priceRoutes = require('./routes/prices');
const brandManagementRoutes = require('./routes/brandmanagement');

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/brand-management', brandManagementRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
