// import gql from 'graphql-tag'
import { createProvider } from '@/plugins/vue-apollo'
import { listGroupApplications } from '@/lib/tribes-application-helpers'

const apolloProvider = createProvider()
const apollo = apolloProvider.defaultClient

const state = {
  notifications: [],
  currentNotification: {}
}

const getters = {
  notifications: state => {
    return state.notifications
  },
  currentNotification: state => {
    return state.currentNotification
  }
}

const mutations = {
  updateNotifications (state, notifications) {
    state.notifications = notifications
  },
  updateCurrentNotification (state, notification) {
    state.currentNotification = notification
  }
}

const actions = {
  async getAllNotifications ({ commit, rootState: { whoami } }) {
    try {
      const res = await apollo.query(
        listGroupApplications()
      )

      if (res.errors) throw res.errors

      var { unseen, accepted, declined } = res.data

      unseen = unseen.map(application => mapValues(application, whoami))
      accepted = accepted.map(application => mapValues(application, whoami))
      declined = declined.map(application => mapValues(application, whoami))

      commit('updateNotifications', [...unseen, ...accepted, ...declined])
    } catch (err) {
      console.error('Something went wrong while try to get all group applications', err)
    }
  },
  setCurrentNotification ({ commit }, notification) {
    commit('updateCurrentNotification', notification)
  }
}

export default {
  state,
  mutations,
  actions,
  getters
}

function mapValues (application, whoami) {
  const { decision, applicant, groupAdmins, group, answers, history } = application

  const isPersonal = applicant.id === whoami.public.profile.id
  const accepted = decision === null ? null : decision.accepted

  // TODO: not sure which admin, find out later: look at the history instead
  const from = isPersonal ? groupAdmins[0] : applicant

  return {
    type: getNotificationType(isPersonal, accepted),
    from,
    group: group.public[0],
    applicant,
    id: application.id,
    isPersonalApplication: isPersonal,
    answers,
    history
  }
}

function getNotificationType (isPersonal, isAccepted) {
  const prefix = isPersonal ? 'personal-' : ''
  switch (isAccepted) {
    case true: return prefix + 'complete'
    case false: return prefix + 'declined'
    case null: return prefix + 'pending'
    default: return null
  }
}
