const { PubSub } = require('apollo-server')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const { GraphQLUpload } = require('graphql-upload')
const toUrl = require('ssb-serve-blobs/id-to-url')
const pick = require('lodash.pick')

const getProfiles = require('./ssb/profiles')
const getProfile = require('./ssb/profile')
const getCommunities = require('./ssb/communities')
const getCloseWhakapapa = require('./ssb/close-whakapapa')

const pubsub = new PubSub()

module.exports = sbot => ({
  Query: {
    whoami: async (_, __, { feedId, profileId }) => {
      const profile = await getProfile(sbot, profileId)
      return {
        id: feedId,
        feedId,
        profile
      }
    },
    persons: () =>
      new Promise((resolve, reject) => {
        getProfiles(sbot, (err, profiles) => {
          if (err) reject(err)
          else resolve(profiles)
        })
      }),

    communities: () =>
      new Promise((resolve, reject) => {
        getCommunities(sbot, (err, profiles) => {
          if (err) reject(err)
          else resolve(profiles)
        })
      }),

    profile: async (_, { id }, { feedId, profileId }) => {
      const profile = await getProfile(sbot, id)

      return {
        ...profile,
        canEdit: profile.authors.includes(feedId) // WIP
      }
    },
    closeWhakapapa: async (_, { id }, { feedId, profileId }) => {
      try {
        return getCloseWhakapapa(sbot, id || profileId)
      } catch (err) {
        throw err
      }
    },
    whakapapaView: (_, { id }, { feedId, profileId }) => new Promise((resolve, reject) => {
      sbot.whakapapa.view.get(id, (err, view) => {
        if (err) reject(err)
        else resolve(view)
      })
    })
  },
  // TODO: make profile and whakapapa a implementation of Person
  // Person: (_, { id }, { feedId, profileId }) =>
  //   new Promise((resolve, reject) => {
  //     getProfile(sbot, id, (err, profile) => {
  //       if (err) return reject(err)

  //       resolve({
  //         id,
  //         authors: profile.authors,
  //         canEdit: profile.authors.includes(feedId), // WIP
  //         ...profile
  //       })
  //     })
  //   }),

  Profile: {
    tiaki: (obj) =>
      new Promise((resolve, reject) => {
        pull(
          pull.values(obj.authors),
          pull.asyncMap((author, cb) => {
            sbot.profile.findByFeedId(author, cb)
          }),
          pull.collect((err, profiles) => {
            if (err) reject(err)
            else {
              profiles = profiles.map(profile => {
                return {
                  id: profile.key,
                  // WARNING! we're assuming just one head-state!
                  ...profile.states[0].state
                }
              })
              resolve(profiles)
            }
          })
        )
      })
  },

  Mutation: {
    async uploadFile (_, { file }) {
      const { createReadStream, filename, mimetype } = await file

      return new Promise((resolve, reject) => {
        pull(
          toPull.source(createReadStream()),
          sbot.blobs.add((err, hash) => {
            if (err) return reject(err)
            resolve({
              blob: hash,
              mimeType: mimetype,
              uri: toUrl(hash)
              // TODO size:
            })
          })
        )
      })
    },

    createProfile: (_, { input }) => {
      const T = buildTransformation(input)
      return new Promise((resolve, reject) => {
        sbot.profile.create(input.type, T, (err, profileId) => {
          if (err) reject(err)
          else resolve(profileId)
        })
      })
    },

    updateProfile: (_, { input }) =>
      // TODO check permissions?
      new Promise((resolve, reject) => {
        const update = buildTransformation(input)
        sbot.profile.update(input.id, update, (err, updateMsg) => {
          if (err) reject(err)
          else resolve(input.id)
        })
      }),

    saveWhakapapaRelation: (_, { input }, { feedId, profileId }) => {
      const { relationshipId, child, parent } = input
      const opts = buildWhakapapaOpts(input)
      if (relationshipId) {
        return new Promise((resolve, reject) => {
          sbot.whakapapa.child.update(relationshipId, opts, (err) => {
            if (err) reject(err)
            else resolve('Updated!')
          })
        })
      } else if (child && parent) {
        return new Promise((resolve, reject) => {
          sbot.whakapapa.child.create({ parent, child }, opts, (err, id) => {
            if (err) reject(err)
            else resolve(id)
          })
        })
      } else {
        throw new Error('Invalid input')
      }
    },
    saveWhakapapaView: (_, { input }, { feedId, profileId }) => {
      const { viewId } = input
      const details = buildWhakapapaViewDetails(input)
      if (viewId) {
        return new Promise((resolve, reject) => {
          sbot.whakapapa.view.update(viewId, details, (err) => {
            if (err) reject(err)
            else resolve('Updated!')
          })
        })
      } else {
        return new Promise((resolve, reject) => {
          sbot.whakapapa.view.create(details, (err, id) => {
            if (err) reject(err)
            else resolve(id)
          })
        })
      }
    }
  },
  Subscription: {
    peers: {
      subscribe: () => {
        pull(
          sbot.conn.peers(),
          pull.drain(
            data => {
              const formated = data.map(p => ({
                id: p[1].key,
                state: p[1].state
              }))
              return pubsub.publish('peer', formated)
            },
            err => {
              throw err
            }
          )
        )
        return pubsub.asyncIterator(['peer'])
      }
    }
  },
  Upload: GraphQLUpload
})

function buildTransformation (input) {
  let T = {}

  Object.entries(input).forEach(([key, value]) => {
    switch (key) {
      case 'type':
        return
      case 'id':
        return

      case 'altNames':
        // TODO
        return

      case 'avatarImage':
        T[key] = { set: pick(value, ['blob', 'mimeType', 'size', 'width', 'height']) }
        return
      case 'headerImage':
        T[key] = { set: pick(value, ['blob', 'mimeType', 'size', 'width', 'height']) }
        return

      default:
        T[key] = { set: value }
    }
  })

  return T
}

function buildWhakapapaOpts (input) {
  const permittedAttrs = ['relationshipType', 'legallyAdopted', 'recps']

  let opts = pick(input, permittedAttrs)
  Object.entries(opts).forEach(([key, value]) => {
    if (key === 'recps') return
    opts[key] = { set: value }
  })

  return opts
}

function buildWhakapapaViewDetails (input) {
  const permittedAttrs = ['name', 'description', 'focus', 'mode', 'recps']

  let details = pick(input, permittedAttrs)
  Object.entries(details).forEach(([key, value]) => {
    if (key === 'recps') return
    details[key] = { set: value }
  })

  return details
}
