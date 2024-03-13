const request = require('supertest');
const app = require('./app')

//Le Token pour tout les tests doit être valide (garder john doe en DB), en cas de delete de john doe, remplacer par un token valide


it('POST /trips/create', async () => {
    const res = await request(app).post('/trips/create').send({
        title: "Supertest Trip",
        country: "Afrique du Sud",
        start_at: new Date("2024-08-10T00:00:00.000+00:00"),
        end_at: new Date("2024-08-13T00:00:00.000+00:00"),
        token: "83b1faad-3672-402f-8399-460607dbe0b5"
    })
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(true)
})

it('GET /trips/getTrips', async () => {
    const res = await request(app).get('/trips/getTrips/83b1faad-3672-402f-8399-460607dbe0b5')

    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(true)
})

//Valable uniquement si le tripId est présent en DB (à remplacer par une ID valide à chaque yarn jest)
it('DELETE trips/delete', async () => {
    const res = await request(app).delete('trips/delete').send({
        tripId: "65f18d8874502848437d0f7e",
        token: "83b1faad-3672-402f-8399-460607dbe0b5"
    })
    expect(res.statusCode).toBe(200)
    expect(res.body.result).toBe(true)
})

it('POST trips/addActivity', async () => {
    const res = await request(app).post('trips/addActivity').send({
        tripId: "65e737a2a7e6b4366bbf36e2",
        title: "Supertest Activity",
        plannedAt: new Date("2024-08-10T16:00:00.000+00:00"),
        token: "65e74b9e1b90660b843c974d",
        address: "Supertest Address for Activity",
        note:["Supertest note 1", "Supertest note 2"]
    })
    expect(res.statusCode).toBe(200)
    expect(res.body.result).toBe(true)
})

//Valable si l'id de l'activity est présente en DB (à remplacer par une ID valide à chaque yarn jest)
it('DELETE trips/deleteActivity', async () => {
    const res = await request(app).delete('trips/deleteActivity').send({
        tripId: "65e853899f8bfffe15246cde",
        activityId: "65ef2906e96ab399e68ddb72",
        token: "65e74b9e1b90660b843c974d",
    })
    expect(res.statusCode).toBe(200)
    expect(res.body.result).toBe(true)
})