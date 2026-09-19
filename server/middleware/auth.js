const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Önce header'dan al, yoksa query param'dan al (video stream için)
  const token =
    req.header('Authorization')?.replace('Bearer ', '') ||
    req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const checkRole = (role) => {
  return (req, res, next) => {
    if (role === 'TEACHER' && (req.user.role === 'TEACHER' || req.user.role === 'HEAD_TEACHER' || req.user.role === 'ADMIN')) {
      return next();
    }
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

module.exports = { auth, checkRole };
