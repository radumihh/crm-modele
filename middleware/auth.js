const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key'; // În producție, folosiți process.env.JWT_SECRET

exports.auth = async (req, res, next) => {
  try {
    // Verifică header-ul Authorization sau token-ul din localStorage
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
