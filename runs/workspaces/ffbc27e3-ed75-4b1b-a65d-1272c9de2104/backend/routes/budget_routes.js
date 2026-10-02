const router = require('express').Router();
const controller = require('../controllers/budget_controller');
router.use(require('../middleware/auth_middleware'));
router.get('/', controller.list);
router.post('/', controller.create);
router.delete('/:id', controller.remove);
module.exports = router;
