const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
app.use(express.json())
let database = null
const initializeDbAndServer = async () => {
  try {
    database = await open({filename: dbPath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('Server Is running on http://localhost:3000')
    })
  } catch (error) {
    console.log(`Data base Error is ${error.message}`)
    process.exit(1)
  }
}
initializeDbAndServer()

const convertStateDbObject = objectItem => {
  return {
    stateId: objectItem.state_id,
    stateName: objectItem.state_name,
    population: objectItem.population,
  }
}

const convertDistrictDbObject = objectItem => {
  return {
    districtId: objectItem.district_id,
    districtName: objectItem.district_name,
    stateId: objectItem.state_id,
    cases: objectItem.cases,
    cured: objectItem.cured,
    active: objectItem.active,
    deaths: objectItem.deaths,
  }
}

const reportDistrictDbObject = objectItem => {
  return {
    toatalCases: objectItem.cases,
    toatalCured: objectItem.cured,
    toatalActive: objectItem.active,
    toatalDeaths: objectItem.deaths,
  }
}

const authentication = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_NAME', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const getUserQuery = `select * from user where username = '${username}'`
  const dbUser = await database.get(getUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'MY_NAME')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.get('/states/', authentication, async (request, response) => {
  const getStatesQuery = `select * from state`
  const statesArray = await database.all(getStatesQuery)
  response.send(statesArray.map(eachstate => convertStateDbObject(eachstate)))
})

app.get('/states/:stateId/', authentication, async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `select * from state where state_id = ${stateId}`
  const state = await database.get(getStateQuery)
  response.send(convertStateDbObject(state))
})

app.post('/districts/', authentication, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const postDistrictQuery = `insert into district(district_name,state_id,cases,cured,active,deaths) values ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}')`
  await database.run(postDistrictQuery)
  response.send('District Successfully Added')
})

app.get(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictQuery = `select * from district where district_id = ${districtId}`
    const district = await database.get(getDistrictQuery)
    response.send(convertDistrictDbObject(district))
  },
)

app.delete(
  '/districts/:districtId/',
  authentication,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictQuery = `delete from district where district_id = ${districtId}`
    await database.get(getDistrictQuery)
    response.send('District Removed')
  },
)

app.put('/districts/:districtId', authentication, async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrictQuery = `update district set district_name = '${districtName}' , state_id = '${stateId}' ,cases = '${cases}',cured =  '${cured}' ,active = '${active}' ,deaths ='${deaths}' where district_id = '${districtId}' `
  await database.run(updateDistrictQuery)
  response.send('District Details Updated')
})
app.get(
  '/states/:stateId/stats/',
  authentication,
  async (request, response) => {
    const {stateId} = request.params
    const getStateStatsQuery = `
    SELECT SUM(cases),
        SUM(cured),
        SUM(active),
        SUM(deaths) 
    FROM
      district 
    WHERE 
      state_id = ${stateId};`
    const stats = await database.get(getStateStatsQuery)
    console.log(stats)
    response.send({
      totalCases: stats['SUM(cases)'],
      totalCured: stats['SUM(cured)'],
      totalActive: stats['SUM(active)'],
      totalDeaths: stats['SUM(deaths)'],
    })
  },
)

module.exports = app
