const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const teacherRoutes = require('./modules/teacher/teacher.routes');
dotenv.config();




const app = express();
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);

const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Connect to MongoDB
connectDB();