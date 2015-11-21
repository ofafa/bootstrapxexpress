var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('users', {
      title: "Users",
      user: "",
      success: "",
      error: ""
      });
});

router.post('/', function(req, res){
  console.log('do search');
  console.log('context:' + req.body['context']);
});

module.exports = router;
