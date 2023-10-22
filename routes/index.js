var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3').verbose();
let dbPath = process.env.DBPATH;
console.log(typeof dbPath);
let db = new sqlite3.Database(dbPath);

/* GET data from DB */

router.get('/dbfacts', function (req, res, next) {
  db.all("SELECT * FROM facts", function (err, rows) {
    res.json(rows);
  });
});

module.exports = router;
