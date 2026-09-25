const db = require('../config/db');

exports.getNotifications = (req, res) => {
  try {
    const notifsCol = db.collection('notifications');
    let touristId = null;

    if (req.user.role === 'TOURIST' && req.touristProfile) {
      touristId = req.touristProfile.touristId;
    } else if (req.query.touristId) {
      touristId = req.query.touristId;
    }

    let notifications;
    if (touristId) {
      notifications = notifsCol.find(n => n.touristId === touristId);
    } else {
      // Authority / Police sees all
      notifications = notifsCol.find();
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.markAsRead = (req, res) => {
  try {
    const { id } = req.params;
    const notif = db.collection('notifications').findById(id);
    if (!notif) {
      return res.status(404).json({ success: false, error: `Notification '${id}' not found.` });
    }

    const updated = db.collection('notifications').updateById(id, { read: true });
    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
