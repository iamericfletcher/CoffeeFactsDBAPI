const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { auth } = require('express-oauth2-jwt-bearer');
let pingCount = 0;
require('dotenv').config();

let db = new sqlite3.Database(process.env.DBPATH);
// let db = new sqlite3.Database(process.env.TESTDBPATH);

const jwtCheck = auth({
    audience: 'http://localhost:3002',
    issuerBaseURL: 'https://dev-zrsam7livd1kfvrr.us.auth0.com/',
    tokenSigningAlg: 'RS256'
});

// Silly counter
router.get('/ping',(req, res) => {
    pingCount++;
    res.send(`ping world for ${pingCount} times`);
});

router.get('/public', function (req, res) {
    db.all("SELECT id, fact, source, submitted_on FROM facts", function (err, rows) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(rows);
    });
});

router.get('/private', jwtCheck, function (req, res) {
    db.all("SELECT * FROM facts", function (err, rows) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(rows);
    });
});

router.post('/addFact', jwtCheck, function (req, res) {
    const { fact, source, user_id } = req.body;
    const sql = `INSERT INTO facts (fact, source, user_id) VALUES (?, ?, ?)`;
    db.run(sql, [fact, source, user_id], function (err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        return res.status(201).json({ "id": this.lastID });
    });
});

// PUT route to edit a fact by ID
router.put('/editFact/:id', jwtCheck, function(req, res) {
    const id = req.params.id;
    const { fact, source } = req.body;
    const sql = "UPDATE facts SET fact = ?, source = ? WHERE id = ?";

    db.run(sql, [fact, source, id], function(err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json({"success": true});
    });
});


// GET route to fetch a fact by ID for editing
router.get('/editFact/:id', jwtCheck, function (req, res) {
    const id = req.params.id;
    const sql = "SELECT * FROM facts WHERE id = ?";

    db.get(sql, [id], function (err, row) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(row);
    });
});

router.delete('/deleteFact/:id', jwtCheck, function (req, res) {
    const id = req.params.id;
    const sql = `DELETE FROM facts WHERE id = ?`;
    db.run(sql, id, function (err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        return res.status(200).json({"id": id});
    });
});



module.exports = router;
