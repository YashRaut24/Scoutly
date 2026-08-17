const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.replace('Bearer ', '') 
    : null;

  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided. Access denied.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'scoutly_jwt_secret_key');
    req.user = decoded; // Attach { id: user._id, email: user.email } to request
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired. Authorization denied.' });
  }
};