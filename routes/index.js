var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database(process.env.DBPATH);
require('dotenv').config();


/* GET data from DB */

router.get('/dbfacts', function (req, res, next) {
  db.all("SELECT * FROM facts", function (err, rows) {
    res.json(rows);
  });
});

module.exports = router;
