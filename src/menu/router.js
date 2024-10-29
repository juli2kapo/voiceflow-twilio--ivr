const sqlite3 = require('sqlite3').verbose();
const { Router } = require('express');
const db = require('./db');

const router = new Router();

const workHours = [
    "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"
];

router.post('/getTurns', (req, res) => {
    const { startDate, endDate } = req.body;
    const query = `SELECT * FROM turns WHERE fromHour >= ? AND toHour <= ?`;
    db.all(query, [startDate, endDate], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching turns');
        } else {
            res.json(results);
        }
    });
});

router.post('/getAvailableTurns', (req, res) => {
    const { startDate, endDate, amountOfPeople } = req.body;
    const tablesQuery = `SELECT * FROM tables WHERE seats >= ?`;
    const turnsQuery = `SELECT * FROM turns WHERE fromHour >= ? AND toHour <= ?`;

    db.all(tablesQuery, [amountOfPeople], (err, tables) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching tables');
            return;
        }

        db.all(turnsQuery, [startDate, endDate], (err, turns) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error fetching turns');
                return;
            }

            const sortedTables = tables.sort((a, b) => a.seats - b.seats);
            const takenTurnsForDay = sortedTables.reduce((acc, element) => {
                return acc.concat(turns.filter(turn => turn.table_id === element.id));
            }, []);

            const availableHours = workHours.filter(hour => {
                return takenTurnsForDay.filter(turn => new Date(turn.fromHour).getHours() == hour).length < sortedTables.length;
            });

            res.json({ availableHours });
        });
    });
});

router.post('/deleteTurns', (req, res) => {
    const { startDate, endDate } = req.body;
    const query = `DELETE FROM turns WHERE fromHour >= ? AND toHour <= ?`;
    db.run(query, [startDate, endDate], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error deleting turns');
        } else {
            res.send('Turns deleted');
        }
    });
});

router.post('/createTurns', (req, res) => {
    const { startDate, endDate, amountOfPeople, responsibleName } = req.body;
    const tablesQuery = `SELECT * FROM tables WHERE seats >= ?`;

    db.all(tablesQuery, [amountOfPeople], (err, tables) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching tables');
            return;
        }

        const sortedTables = tables.sort((a, b) => a.seats - b.seats);
        if(sortedTables && sortedTables.length > 0) {
            const insertQuery = `INSERT INTO turns (amountOfPeople, table_id, fromHour, toHour, responsibleName) VALUES (?, ?, ?, ?, ?)`;
            db.run(insertQuery, [amountOfPeople, sortedTables[0].id, startDate, endDate, responsibleName], (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error creating turn');
                } else {
                    res.send('Turns created');
                }
            });
        }
        else {
            res.status(500).send('No tables available');
        }
    });
});


router.post('/createTable', (req, res) => {
    console.log(req.body)
    const { name, seats } = req.body;
    const insertTableQuery = `INSERT INTO tables (name, seats, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`;
    db.run(insertTableQuery, [name, seats, 'available', new Date(), new Date()], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error creating table');
        } else {
            res.send('Table created');
        }
    });
});


module.exports = router;