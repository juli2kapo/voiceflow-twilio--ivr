const sqlite3 = require('sqlite3').verbose();
const { Router } = require('express');
const db = require('./db');

const router = new Router();

const workHours = [
    "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"
];


router.post('/getAllTurns', (req, res) => {
    const { startDate, endDate } = req.body;
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    const query = `SELECT * FROM turns`;
    db.all(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error fetching turns');
        } else {
            res.json(results);
        }
    });
});

router.post('/getTurns', (req, res) => {
    const { startDate, endDate } = req.body;
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    const query = `SELECT * FROM turns`;
    db.all(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error fetching turns');
        } else {
            const possibleTurns = results.filter(x=>new Date(x.fromHour).getTime() >= new Date(fechaInicio).getTime() && new Date(x.toHour).getTime() <= new Date(fechaFin).getTime());
            res.json(possibleTurns);
        }
    });
});

router.post('/getAvailableTurns', (req, res) => {
    const { startDate, endDate, amountOfPeople } = req.body;
    const tablesQuery = `SELECT * FROM tables WHERE seats >= ?`;
    const turnsQuery = `SELECT * FROM turns`;
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    db.all(tablesQuery, [amountOfPeople], (err, tables) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error fetching tables');
            return;
        }

        db.all(turnsQuery, (err, turns) => {
            if (err) {
                console.error(err);
                res.status(500).json('Error fetching turns');
                return;
            }

            const sortedTables = tables.sort((a, b) => a.seats - b.seats);
            const takenTurnsForDay = sortedTables.reduce((acc, element) => {
                return acc.concat(turns.filter(turn => turn.table_id === element.id));
            }, []);

            console.log("takenTurnsForDay",takenTurnsForDay)
            console.log("turns",turns)
            if(turns.length > 0){

                console.log("turns",turns)
                console.log("new Date(turn.fromHour).getHours()",new Date(turns[0].fromHour).getHours())
                
                
            }
            const temp = workHours.filter(hour => {
                return takenTurnsForDay.filter(turn => new Date(turn.fromHour).getHours() == hour).length < sortedTables.length;
            });
            const availableHours = temp.slice(0, 5)
            //limit available hourse to 5 entries
            res.json({ availableHours });
        });
    });
});

router.post('/deleteTurns', (req, res) => {
    const { startDate, endDate, responsibleName } = req.body;
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    const query = `DELETE FROM turns WHERE fromHour == ? AND toHour == ? AND responsibleName = ?`;
    db.run(query, [fechaInicio.getTime(), fechaFin.getTime(), responsibleName], (err) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error deleting turns');
        } else {
            res.json('Turns deleted');
        }
    });
});

router.post('/createTurns', (req, res) => {
    const { startDate, endDate, amountOfPeople, responsibleName } = req.body;
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    const tablesQuery = `SELECT * FROM tables WHERE seats >= ?`;
    const turnsQuery = `SELECT * FROM turns`;
    db.all(tablesQuery, [amountOfPeople], (err, tables) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error fetching tables');
            return;
        }

        db.all(turnsQuery, (err, results) => {
            if(err) {
                console.error(err);
                res.status(500).json('Error fetching turns');
                return;
            }
            const turns = results.filter(x=>new Date(x.fromHour).getTime() >= new Date(fechaInicio).getTime() && new Date(x.toHour).getTime() <= new Date(fechaFin).getTime());
            console.log("turns",turns)
            console.log("testFechaInicio",new Date(fechaInicio).getTime())
            console.log("fechaInicio",fechaInicio)
            const sortedTables = tables.filter(table =>
                turns.filter(
                    turn=>new Date(turn.fromHour).getTime()==new Date(fechaInicio).getTime() && turn.table_id==table.id
                ).length==0
            ).sort((a, b) => a.seats - b.seats);
            if(sortedTables && sortedTables.length > 0) {
                const insertQuery = `INSERT INTO turns (amountOfPeople, table_id, fromHour, toHour, responsibleName) VALUES (?, ?, ?, ?, ?)`;
                db.run(insertQuery, [amountOfPeople, sortedTables[0].id, fechaInicio, fechaFin, responsibleName], (err) => {
                    if (err) {
                        console.error(err);
                        res.status(500).json('Error creating turn');
                    } else {
                        res.json('Reserva creada');
                    }
                });
            }
            else {
                res.json('No hay mesas disponibles para la fecha seleccionada');
            }
        })
    });
});


router.post('/createTable', (req, res) => {
    console.log(req.body)
    const { name, seats } = req.body;
    const insertTableQuery = `INSERT INTO tables (name, seats, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`;
    db.run(insertTableQuery, [name, seats, 'available', new Date(), new Date()], (err) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error creating table');
        } else {
            res.json('Table created');
        }
    });
});



router.post('/checkName', (req, res) => {
    const { responsibleName } = req.body;
    const possibleNames = responsibleName.toLowerCase().normalize().split(' ');
    console.log("possibleNames",possibleNames);
    const query = `SELECT * FROM turns`;
    db.all(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error fetching turns');
        } else {
            
            let futureTurns = results.filter(turn => new Date(turn.fromHour).getTime() >= new Date().getTime());
            
            const turnNames = futureTurns.map(turn => turn.responsibleName.toLowerCase().normalize());
            console.log("turnNames",turnNames);
            const overlap = possibleNames.filter(name => turnNames.includes(name));
            console.log("overlap",overlap);
            if (overlap.length > 1){
                res.json({overlap: overlap, turns: [], usesTurns: 0, fixedName: responsibleName});
                return;
            }
            else{
                const turnsFromName = futureTurns.filter(turn => turn.responsibleName.toLowerCase().normalize().includes(possibleNames[0]));
                const turnHours = turnsFromName.map(turn => new Date(turn.fromHour).toISOString());
                res.json({overlap: [], turns: turnHours, usesTurns: 1, fixedName: possibleNames[0]});
            }
        }
    });
});


module.exports = router;