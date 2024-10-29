const fs = require("fs");
require('dotenv').config()
const {
  VOICEFLOW_API_KEY,
  TWILIO_PHONE_NUMBER,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
} = process.env

const VoiceResponse = require('twilio').twiml.VoiceResponse
const SMS = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
const axios = require('axios')
const VOICEFLOW_VERSION_ID = process.env.VOICEFLOW_VERSION_ID || 'development'
const VOICEFLOW_PROJECT_ID = process.env.VOICEFLOW_PROJECT_ID || null
let session = `${VOICEFLOW_VERSION_ID}.${createSession()}`

async function interact(caller, action) {







  async function getMP3(textToMake) {
    const options = {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textToMake,
        language_code: "es",
        voice_settings: { stability: 0.45, similarity_boost: 1 },
        model_id: "eleven_turbo_v2_5",
      }),
    };

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/2Lb1en5ujrODDIqmp7F3', options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer(); // Await the ArrayBuffer conversion
      const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Buffer
      const filePath = '/home/ubuntu/twilioivr/voiceflow-twilio--ivr/public/output.mp3';

      fs.writeFileSync(filePath, buffer); // Save the buffer as an MP3 file
      console.log(`Audio saved to ${filePath}`);

    } catch (err) {
      console.error('Error:', err); // Catch and log any errors
    }
  }






  const twiml = new VoiceResponse()
  // call the Voiceflow API with the user's name & request, get back a response
  const request = {
    method: 'POST',
    url: `https://general-runtime.voiceflow.com/state/user/${encodeURI(caller)}/interact`,
    headers: { Authorization: VOICEFLOW_API_KEY, sessionid: session },
    data: { action, config: { stopTypes: ['DTMF'] } },
  }
  const response = await axios(request)

  // janky first pass
  const endTurn = response.data.some((trace) =>
    ['CALL', 'end'].includes(trace.type)
  )

  let agent = endTurn
    ? twiml
    : twiml.gather({
      language_code: 'es-US',
      language: 'es-US',
      enhanced: "true",
      speechModel: 'deepgram_nova-2',
      input: 'speech dtmf',
      numDigits: 1,
      speechTimeout: 'auto',
      action: '/ivr/interaction',
      profanityFilter: false,
      actionOnEmptyResult: true,
      method: 'POST',
    }
  )

  // loop through the response
  for (const trace of response.data) {
    switch (trace.type) {
      case 'text':
      case 'speak': {


         await getMP3(trace.payload.message)
        try{
          agent.play("/public/output.mp3")
          // agent.say(
            // {
              // language: 'es-US', 
            // },
            // trace.payload.message
          // )
        }
        catch(e){
          console.log(e)
        }
        break
      }
      case 'CALL': {
    if(trace.payload){
        const { number } = JSON.parse(trace.payload)
      console.log('Calling', number)
      twiml.dial(number)
      break
    }
      }
      case 'SMS': {
    if(trace.payload){
      const { message } = JSON.parse(trace.payload)
      console.log('Sending SMS', message)
      console.log('To', caller)
      console.log('From', TWILIO_PHONE_NUMBER)

      SMS.messages
        .create({ body: message, to: caller, from: TWILIO_PHONE_NUMBER })
        .then((message) => {
        console.log('Message sent, SID:', message.sid)
        })
        .catch((error) => {
        console.error('Error sending message:', error)
        })
      saveTranscript(caller)
      break
    }
      }
      case 'end': {
        saveTranscript(caller)
        twiml.hangup()
        break
      }
      default: {
      }
    }
  }
  return twiml.toString()
}

exports.launch = async (called, caller) => {
  return interact(caller, { type: 'launch' })
}

exports.interaction = async (called, caller, query = '', digit = null) => {
  let action = null
  if (digit) {
    action = { type: `${digit}` }
    console.log('Digit:', digit)
  } else {
    // twilio always ends everythings with a period, we remove it
    // query = query.slice(0, -1)
    action = query.trim() ? { type: 'text', payload: query } : null
    console.log('Utterance:', query)
  }
  return interact(caller, action)
}

function createSession() {
  // Random Number Generator
  var randomNo = Math.floor(Math.random() * 1000 + 1)
  // get Timestamp
  var timestamp = Date.now()
  // get Day
  var date = new Date()
  var weekday = new Array(7)
  weekday[0] = 'Sunday'
  weekday[1] = 'Monday'
  weekday[2] = 'Tuesday'
  weekday[3] = 'Wednesday'
  weekday[4] = 'Thursday'
  weekday[5] = 'Friday'
  weekday[6] = 'Saturday'
  var day = weekday[date.getDay()]
  // Join random number+day+timestamp
  var session_id = randomNo + day + timestamp
  return session_id
}

async function saveTranscript(username) {
  if (VOICEFLOW_PROJECT_ID) {
    console.log('SAVE TRANSCRIPT')
    if (!username || username == '' || username == undefined) {
      username = 'Anonymous';
    }
    axios({
      method: 'put',
      url: 'https://api.voiceflow.com/v2/transcripts',
      data: {
        browser: 'Twilio',
        device: 'Phone',
        os: 'Twilio',
        sessionID: session,
        unread: true,
        versionID: VOICEFLOW_VERSION_ID,
        projectID: VOICEFLOW_PROJECT_ID,
        user: {
          name: username,
          image: 'https://s3.amazonaws.com/com.voiceflow.studio/share/twilio-logo-png-transparent/twilio-logo-png-transparent.png',
        },
      },
      headers: {
        Authorization: VOICEFLOW_API_KEY,
      },
    })
      .then(function(response) {
        console.log('Saved!');
        session = `${process.env.VOICEFLOW_VERSION_ID}.${createSession()}`;
      })
      .catch((err) => console.log(err));
  }
}

