const sqlite3 = require('sqlite3').verbose();
const { Router } = require('express');
const db = require('./db');
const fs = require("fs");

const router = new Router();

const createdMP3s = new Map([
    // ['Hola buenos dias, bienvenido al restaurante Elykia, como puedo ayudarlo?', 'FirstWelcome.mp3'],
    // ['¿Para qué día y hora quiere la reserva?', 'GetDayAndHour.mp3'],
    // ['¿Para cuánta gente reservo la mesa?', 'GetPeople.mp3'],
    // ['¿A qué hora quiere que sea la reserva?', 'GetHour.mp3'],
    // ['¿Bajo qué nombre desea colocar la reserva?', 'GetName.mp3'],
    // ['Entiendo tu situación, ahora mismo te podríamos redirigir a personal competente del restaunte si esta no fuese una demo. ¿Te puedo ayudar en algo más?', 'NotReclamo.mp3'],
    // ['Esto es una demo y en Elykia no hacemos comida, pero si lo haríamos podrías pedir ahora mismo. ¿En qué más puedo ayudarte?', 'NotDelivery.mp3'],
    // ['¿Hay algo más con lo que pueda ayudarte?', 'QuestionVariation1.mp3'],
    // ['Disculpame, para buscar tu turno necesito que me digas el nombre bajo el que esta la reserva', 'MissingName.mp3'],
    // ['Disculpa, no encontré ninguna reserva bajo ese nombre, ¿podría ser que este bajo otro nombre?', 'NoReserva.mp3'],
    // ['¿Puedo ayudarlo con algo mas?', 'QuestionVariation2.mp3'],
    // ['Ahora mismo no contamos con mesas para esa cantidad de gente, al ser una demo son mesas simuladas y no podemos juntarlas ni hacer más ¿Puedo ayudarte con algo mas?', 'NoMesas.mp3'],
    // ['Cuando querria agendar el nuevo turno y para cuantas personas seria?', 'GetDayHourAndPeople.mp3'],
    // ['Muchas gracias por comunicarte con Elykia, que tengas un lindo dia', 'Despedida.mp3'],
  ]);


const workHours = [
    "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"
];


router.post('/getAllTurns', (req, res) => {
    const { startDate, endDate }  = req.body.message.toolCalls[0].function.arguments;
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    const query = `SELECT * FROM turns`;
    db.all(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error fetching turns');
        } else {
            res.json(
                {
                "results": [
                    {
                        "toolCallId":"",
                        "result":results
                    }
                ]
                }
        );
        }
    });
});

router.post('/getTurns', (req, res) => {
    const { startDate, endDate }  = req.body.message.toolCalls[0].function.arguments;
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    const query = `SELECT * FROM turns`;
    db.all(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error fetching turns');
        } else {
            const possibleTurns = results.filter(x=>new Date(x.fromHour).getTime() >= new Date(fechaInicio).getTime() && new Date(x.toHour).getTime() <= new Date(fechaFin).getTime());
            res.json(
                
                
                {
                    "results": [
                        {
                            "toolCallId":"",
                            "result":possibleTurns
                        }
                    ]
                    }
                );
        }
    });
});

router.post('/getAvailableTurns', (req, res) => {
    console.log("body",req.body)

    const { startDate, endDate, amountOfPeople }  = req.body.message.toolCalls[0].function.arguments;
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
            const availableHours = temp.slice(0, 3)
            //limit available hourse to 5 entries
            res.json({
                "results": [
                    {
                        "toolCallId":"",
                        "result":availableHours
                    }
                ]
                });
        });
    });
});

router.post('/deleteTurns', (req, res) => {
    const { startDate, endDate, responsibleName }  = req.body.message.toolCalls[0].function.arguments;
    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    const query = `DELETE FROM turns WHERE fromHour == ? AND toHour == ? AND responsibleName = ?`;
    db.run(query, [fechaInicio.getTime(), fechaFin.getTime(), responsibleName], (err) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error deleting turns');
        } else {
            res.json({
                "results": [
                    {
                        "toolCallId":"",
                        "result":"Turns deleted"
                    }
                ]
            });
        }
    });
});

router.post('/createTurns', (req, res) => {
    const { startDate, endDate, amountOfPeople, responsibleName }  = req.body.message.toolCalls[0].function.arguments;
    console.log("PARAMS",req.body.message.toolCalls[0].function.arguments)
    console.log("coso", req.body.message)
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
            console.log("sortedTables",sortedTables)
            if(sortedTables && sortedTables.length > 0) {
                console.log("ME DEJO ENTRAR, HAY MESAS")
                const insertQuery = `INSERT INTO turns (amountOfPeople, table_id, fromHour, toHour, responsibleName) VALUES (?, ?, ?, ?, ?)`;
                db.run(insertQuery, [amountOfPeople, sortedTables[0].id, fechaInicio, fechaFin, responsibleName], (err) => {
                    if (err) {
                        console.error(err);
                        res.status(500).json('Error creating turn');
                    } else {

                        consoe.log()
                        res.json({
                            "results": [
                                {
                                    "toolCallId":"",
                                    "result":"Reserva creada"
                                }
                            ]
                        });
                    }
                });
            }
            else {
                console.log("NO HAY MESAS DISPONIBLES")
                console.log(JSON.stringify({
                    "results": [
                        {
                            "toolCallId":"",
                            "result":"No hay mesas disponibles para la fecha seleccionada"
                        }
                    ]
                }))
                res.json({
                    "results": [
                        {
                            "toolCallId":"",
                            "result":"No hay mesas disponibles para la fecha seleccionada"
                        }
                    ]
                });
            }
        })
    });
});


router.post('/createTable', (req, res) => {
    console.log(req.body)
    const { name, seats }  = req.body.message.toolCalls[0].function.arguments;
    const insertTableQuery = `INSERT INTO tables (name, seats, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`;
    db.run(insertTableQuery, [name, seats, 'available', new Date(), new Date()], (err) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error creating table');
        } else {
            res.json({
                "results": [
                    {
                        "toolCallId":"",
                        "result":"Mesa creada"
                    }
                ]
            });
        }
    });
});



router.post('/checkName', (req, res) => {
    const { responsibleName }  = req.body.message.toolCalls[0].function.arguments;
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
                res.json({
                    "results": [
                        {
                            "toolCallId":"",
                            "result":{overlap: overlap, turns: [], usesTurns: 0, fixedName: responsibleName}
                        }
                    ]
                });
                return;
            }
            else{
                const turnsFromName = futureTurns.filter(turn => turn.responsibleName.toLowerCase().normalize().includes(possibleNames[0]));
                const turnHours = turnsFromName.map(turn => new Date(turn.fromHour).toISOString());
                res.json({
                    "results": [
                        {
                            "toolCallId":"",
                            "result":{overlap: [], turns: turnHours, usesTurns: turnsFromName.length, fixedName: responsibleName}
                        }
                    ]
                });
            }
        }
    });
});

router.get("/createMP3",(req,res)=>{
    async function saveMP3(textToMake,outputName) {
        const options = {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVEN_LABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringif({
            text: textToMake,
            language_code: "es",
            voice_settings: { stability: 0.45, similarity_boost: 1 },
            model_id: "eleven_turbo_v2_5",
          }),
        };
    
        try {
          const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/2Lb1en5ujrODDIqmp7F3', options);
    
          if (!response.ok) {
            // const error = await response.text();
            // throw new Error(`HTTP error! status: ${response.status} code: ${error}`);
            throw new Error(`Error en: ${filePath}`);
          }
    
          const arrayBuffer = await response.arrayBuffer(); // Await the ArrayBuffer conversion
          const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Buffer
        //   const filePath = '/home/ubuntu/twilioivr/voiceflow-twilio--ivr/public/output.mp3';
          const filePath = outputName
    
          fs.writeFileSync(filePath, buffer); // Save the buffer as an MP3 file
          console.log(`Audio saved to ${filePath}`);
    
        } catch (err) {
          console.error('Error:', err); // Catch and log any errors
        }
      }


    createdMP3s.forEach(async (value,key)=>{
        await saveMP3(key,value);
    })
    return res.json("MP3 created")
})

router.get('/deleteAllTurns', (req, res) => {
    const query = `DELETE FROM turns`;
    db.run(query, (err) => {
        if (err) {
            console.error(err);
            res.status(500).json('Error deleting all turns');
        } else {
            res.json({
                "results": [
                    {
                        "toolCallId":"",
                        "result":"All turns deleted"
                    }
                ]
            });
        }
    });
});


module.exports = router;