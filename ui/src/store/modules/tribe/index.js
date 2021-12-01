import { initGroup, getTribe, getTribes, addAdminsToGroup, getMembers } from './apollo-helpers'

export default function (apollo) {
  const state = {
    tribes: []
  }

  const getters = {
    tribes: state => {
      return state.tribes
    }
  }

  const mutations = {
    updateTribes (state, tribes) {
      state.tribes = tribes
    }
  }

  const actions = {
    updateTribes ({ commit }, tribes) {
      commit('updateTribes', tribes)
    },
    async getTribe ({ rootState, dispatch }, id) {
      try {
        if (id === rootState.whoami.personal.groupId) {
          return {
            groupId: rootState.whoami.personal.groupId,
            ...rootState.whoami.personal.profile
          }
        }

        const res = await apollo.query({
          ...getTribe,
          variables: {
            id
          }
        })

        if (res.errors) throw res.errors

        const members = await dispatch('getMembers', id)

        return { ...res.data.tribe, members }
      } catch (err) {
        console.error('Something went wrong while fetching tribe: ', id)
        console.error(err)
      }
    },
    async getTribes ({ commit }) {
      try {
        const res = await apollo.query(getTribes)

        if (res.errors) throw res.errors

        commit('updateTribes', res.data.tribes)

        return res.data.tribes
      } catch (err) {
        console.error('Failed to get tribes', err)
        return []
      }
    },
    async initGroup ({ dispatch }, input) {
      try {
        const res = await apollo.mutate(
          initGroup(input)
        )

        if (res.errors) throw res.errors

        return dispatch('getTribe', res.data.initGroup.groupId) // groupId
      } catch (err) {
        console.error('failed to initialise the group, its profiles and kaitiaki-only subgroup', err)
      }
    },
    // NOTE: this is an alias for saveGroupProfileLink with a clearer name
    async createPrivateGroupProfileLink ({ dispatch }, input) {
      try {
        return dispatch('saveGroupProfileLink', input)
      } catch (err) {
        console.error('failed to create private link between group and profile')
      }
    },
    async addAdminsToGroup ({ dispatch }, { groupId, adminIds }) {
      try {
        const res = await apollo.mutate(
          addAdminsToGroup(groupId, adminIds)
        )

        if (res.errors) throw res.errors

        return dispatch('getTribe', groupId)
      } catch (err) {
        console.error('failed to add admin to group', err)
      }
    },
    async getMembers (context, groupId) {
      try {
        const res = await apollo.query(
          getMembers(groupId)
        )

        if (res.errors) throw res.errors

        return res.data.listGroupAuthors
      } catch (err) {
        console.error('failed to get the groups members', err)
      }
    }
  }
  return {
    state,
    mutations,
    actions,
    getters,
    namespaced: true
  }
}
