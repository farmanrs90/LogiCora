const inviteService = require('./invite.service');

const sendInvite = async (req, res) => {
  const invite = await inviteService.sendInvite(req.user._id, req.body);
  res.status(201).json({ success: true, data: invite, message: 'Dəvət göndərildi.' });
};

const respondToInvite = async (req, res) => {
  const invite = await inviteService.respondToInvite(
    req.user._id,
    req.params.id,
    req.body.status
  );
  res.status(200).json({ success: true, data: invite, message: 'Dəvətə cavab verildi.' });
};

const getMyInvites = async (req, res) => {
  const invites = await inviteService.getMyInvites(req.user._id);
  res.status(200).json({ success: true, data: invites, message: 'Dəvətlər alındı.' });
};

const getSentInvites = async (req, res) => {
  const invites = await inviteService.getSentInvites(req.user._id);
  res.status(200).json({ success: true, data: invites, message: 'Göndərilən dəvətlər alındı.' });
};

module.exports = {
  sendInvite,
  respondToInvite,
  getMyInvites,
  getSentInvites,
};
