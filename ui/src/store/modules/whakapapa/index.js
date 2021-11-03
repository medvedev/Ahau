import uniqby from 'lodash.uniqby'
import tree from '../../../lib/tree-helpers'
import { getWhakapapaView } from './apollo-helpers'

export default function (apollo) {
  const defaultView = {
    name: 'Loading',
    description: '',
    focus: '',
    recps: null,
    image: { uri: '' },
    ignoredProfiles: [],
    importantRelationships: []
  }
  const state = {
    view: defaultView,
    nestedWhakapapa: {},
    whakapapa: {},
    nodes: {}
  }

  const getters = {
    whakapapaView: state => state.view,
    nestedWhakapapa: state => state.nestedWhakapapa,
    whakapapa: state => {
      throw new Error('WHO IS USING THIS')
      // return state.whakapapa
    },
    getNode: state => (id) => {
      return state.nodes[id]
    }
  }

  const mutations = {
    setView (state, view) {
      state.view = view
    },
    addNode (state, node) {
      if (!node) return
      const id = node.id || (node.data && node.data.id)
      if (!id) return

      state.nodes[id] = [
        ...(state.nodes[id] || []),
        node
      ]
    },
    resetNodes (state) {
      state.nodes = []
    },
    setNestedWhakapapa (state, nestedWhakapapa) {
      state.nestedWhakapapa = nestedWhakapapa
    },
    setWhakapapa (state, whakapapa) {
      state.whakapapa = whakapapa
    },
    updatePartnerInNestedWhakapapa (state, node) {
      state.nestedWhakapapa = tree.updatePartner(state.nestedWhakapapa, node)
    },
    updateNodeInNestedWhakapapa (state, node) {
      state.nestedWhakapapa = tree.updateNode(state.nestedWhakapapa, node)
    },
    deleteNodeInNestedWhakapapa (state, node) {
      var whakapapa = {}

      if (node.isPartner) {
        whakapapa = tree.deletePartnerNode(state.nestedWhakapapa, node.id)
      } else {
        whakapapa = tree.deleteNode(state.nestedWhakapapa, node.id)
      }

      state.nestedWhakapapa = whakapapa
    },
    addChildToNestedWhakapapa (state, { child, parent }) {
      var whakapapa = {}

      if (parent.isPartner) {
        whakapapa = tree.addChildToPartner(state.nestedWhakapapa, child, parent)
      } else {
        whakapapa = tree.addChild(state.nestedWhakapapa, child, parent)
      }

      state.nestedWhakapapa = whakapapa
    },
    addParentToNestedWhakapapa (state, { child, parent }) {
      state.nestedWhakapapa = tree.addParent(state.nestedWhakapapa, child, parent)
    },
    addPartnerToNestedWhakapapa (state, { node, partner }) {
      state.nestedWhakapapa = tree.addPartner(state.nestedWhakapapa, node, partner)
    }
  }

  const actions = {
    async getWhakapapaView (context, id) {
      try {
        const res = await apollo.query(
          getWhakapapaView(id)
        )

        if (res.errors) throw new Error(res.errors)

        // TODO success alert message
        return res.data.whakapapaView
      } catch (err) {
        // TODO error alert message
        console.error(err)
      }
    },
    async loadWhakapapaView ({ dispatch, commit, state }, id) {
      if (id !== state.view.id) commit('setView', defaultView)

      const view = await dispatch('getWhakapapaView', id)
      if (view) commit('setView', view)
    },
    addNode ({ commit }, node) {
      commit('addNode', node)
    },
    setNestedWhakapapa ({ commit }, nestedWhakapapa) {
      commit('resetNodes')
      commit('setNestedWhakapapa', nestedWhakapapa)
    },
    async suggestedChildren ({ dispatch, state }, parentId) {
      // get the persons full profile
      const person = await dispatch('person/getPerson', parentId, { root: true })

      if (!person || !person.children || !person.children.length) return []

      // get current children who are ignored
      const ignoredChildren = person.children.filter(A => state.whakapapa.ignoredProfiles.includes(A.id))

      return uniqby(
        [
          ...flattenToNestedArray(person, 'partners', 'children'), // get all children of partners
          ...ignoredChildren // get all children who have been ignored from this whakapapa
        ],
        'id'
      )
    },
    async suggestedParents ({ dispatch, state }, childId) {
      const person = await dispatch('person/getPerson', childId, { root: true })
      const isRootNode = state.nestedWhakapapa.id === person.id

      if (!person || !person.parents || !person.parents.length) return []

      const ignoredParents = person.parents.filter(A => state.whakapapa.ignoredProfiles.includes(A.id))

      return uniqby(
        [
          ...flattenToNestedArray(person, 'siblings', 'parents'), // get all parents of siblings
          ...flattenToNestedArray(person, 'parents', 'partners'), // get all partners of parents
          ...ignoredParents,
          ...(isRootNode ? person.parents : []) // handle existing parents if this is the root node
        ],
        'id'
      )
    }
  }

  return {
    namespaced: true,
    state,
    getters,
    mutations,
    actions
  }
}

/**
 * A helper function to flatten nested arrays within an array of objects.
 * E.g. to get a persons siblings parents use flattenToNestedArray(person, 'siblings', 'parents')

 * @param {object} obj an object which holds the array
 * @param {string} array which field to look at on the given obj
 * @param {string} nestedArray which field to map objects in obj.array to
 */
function flattenToNestedArray (obj, array, nestedArray) {
  if (!obj[array] || !obj[array].length) return []

  return obj[array]
    .map(m => m[nestedArray])
    .flat() // flattens from [[A, B], [C]] to [A, B, C]
    .filter(A => !obj[nestedArray].some(B => B.id === A.id))
}
