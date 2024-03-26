const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const app = express()
const dbPath = path.join(__dirname, 'covid19India.db')
app.use(express.json())
let database = null
const initializeDbAndServer = async () => {
  try {
    database = await open({filename: dbPath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('Server Is running on http://localhost:3000')
    })
  } catch (error) {
    console.log(`Data base Error is ${error}`)
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

app.get('/states/', async (request, response) => {
  const getStatesQuery = `select * from state`
  const statesArray = await database.all(getStatesQuery)
  response.send(statesArray.map(eachstate => convertStateDbObject(eachstate)))
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `select * from state where state_id = ${stateId}`
  const state = await database.get(getStateQuery)
  response.send(convertStateDbObject(state))
})

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const postDistrictQuery = `insert into district(district_name,state_id,cases,cured,active,deaths) values ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}')`
  await database.run(postDistrictQuery)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `select * from district where district_id = ${districtId}`
  const district = await database.get(getDistrictQuery)
  response.send(convertDistrictDbObject(district))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `delete from district where district_id = ${districtId}`
  await database.get(getDistrictQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrictQuery = `update district set district_name = '${districtName}' , state_id = '${stateId}' ,cases = '${cases}',cured =  '${cured}' ,active = '${active}' ,deaths ='${deaths}' where district_id = '${districtId}' `
  await database.run(updateDistrictQuery)
  response.send('District Details Updated')
})
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStateReport = `
    SELECT SUM(cases) AS cases,
        SUM(cured) AS cured,
        SUM(active) AS active,
        SUM(deaths) AS deaths 
    FROM
      district 
    WHERE 
      state_id = ${stateId};`
  const statsReport = await database.get(getStateReport)
  console.log(statsReport)
  response.send({
    totalCases: statsReport['cases'],
    totalCured: statsReport['cured'],
    totalActive: statsReport['active'],
    toatalDeaths: statsReport['deaths'],
  })
})

app.get('/districts/:districtId/details', async (request, response) => {
  const {districtId} = request.params
  const stateDetails = `select state_name from state join district on state.state_id = district.state_id where district.district_id = ${districtId}`
  const stateName = await database.get(stateDetails)
  response.send(convertStateDbObject(stateName))
})

module.exports = app
