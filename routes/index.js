const modelRoutes = {
  certificates: require('./certificates'),
  courses: require('./courses'),
  gradebooks: require('./gradebooks'),
  profiles: require('./profiles'),
  students: require('./students'),
  teachers: require('./teachers'),
  users: require('./users'),
}

const specialRoutes = {
  auth: require('./auth'),
}

module.exports = (app) => {
  for (const i in modelRoutes) {
    app.use(`/${i}`, modelRoutes[i]);
  }
  for (const i in specialRoutes) {
    app.use(`/${i}`, specialRoutes[i]);
  }
}
