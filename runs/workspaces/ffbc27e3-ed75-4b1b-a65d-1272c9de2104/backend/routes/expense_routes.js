const router = require('express').Router();
const controller = require('../controllers/expense_controller');
router.use(require('../middleware/auth_middleware'));
router.get('/', controller.list);
router.post('/', controller.create);
router.delete('/:id', controller.remove);
module.exports = router;
