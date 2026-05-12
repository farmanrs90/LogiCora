const express = require('express');
const router = express.Router();

const parentController = require('./parent.controller');
const { createParentValidation, updateParentValidation } = require('./parent.validation');
const auth = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');

router.post('/', auth, roleCheck(['parent']), validate(createParentValidation), parentController.createParent);
router.get('/', auth, roleCheck(['parent']), parentController.getParent);
router.put('/', auth, roleCheck(['parent']), validate(updateParentValidation), parentController.updateParent);
router.delete('/', auth, roleCheck(['parent']), parentController.deleteParent);

router.post('/child', auth, roleCheck(['parent']), parentController.addChild);
router.delete('/child/:childId', auth, roleCheck(['parent']), parentController.removeChild);

module.exports = router;