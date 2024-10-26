const twilio = require('twilio')
const Router = require('express').Router
const express = require('express')
const ivrRouter = require('./ivr/router')

const router = new Router()

router.get('/', async (req, res) => {
  res.send('Elykia API')
})

router.use('/public', express.static('public'))

router.use('/ivr', twilio.webhook({ validate: false }), ivrRouter)

module.exports = router
