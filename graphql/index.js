const { ApolloServer } = require('apollo-server-express')
const http = require('http')
const express = require('express')
const cors = require('cors')

const PORT = 4000
const app = express()
app.options('*', cors())

module.exports = sbot => {
  const { typeDefs, resolvers } = require('./ssb')(sbot)
  // A map of functions which return data for the schema.

  const server = new ApolloServer({
    typeDefs,
    resolvers
    // mockEntireSchema: false,
    // mocks:
    //   process.env.NODE_ENV === 'production' ? false : require('./ssb/mocks')
  })

  server.applyMiddleware({ app })

  const httpServer = http.createServer(app)
  server.installSubscriptionHandlers(httpServer)
  // ⚠️ Pay attention to the fact that we are calling `listen` on the http server variable, and not on `app`.
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    )
    console.log(
      `🚀 Subscriptions ready at ws://localhost:${PORT}${
        server.subscriptionsPath
      }`
    )
  })
}
