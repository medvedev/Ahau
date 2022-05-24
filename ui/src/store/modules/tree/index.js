/* eslint brace-style: ["error", "stroustrup", { "allowSingleLine": true }] */

import {
  tree as d3Tree,
  hierarchy as d3Hierarchy
} from 'd3'

import {
  layoutPartnerNodes,
  layoutPartnerLinks,
  layoutChildLinks,
  layoutSecondaryLinks
} from './lib'

import { NODE_SIZE_X, NODE_SIZE_Y, RADIUS, PARTNER_RADIUS, PARTNER_SPACE, SIBLING_SPACE, COUSIN_SPACE } from './constants'
import calculateAge from '../../../lib/calculate-age'

export default function () {
  const state = {
    mouseEvent: null,
    hoveredProfileId: null,
    searchedProfileId: null
  }

  // we need to know the x/y of each drawn profile (d3 nodes + partners),
  // so I think we should calculate all positions here
  // this means we can more easily draw lessImortantRelationship links

  const getters = {
    mouseEvent: state => state.mouseEvent,
    hoveredProfileId: state => state.hoveredProfileId,
    searchedProfileId: state => state.searchedProfileId,
    countPartners: (state, getters, rootState, rootGetters) => (node) => {
      return rootGetters['whakapapa/getPartnerIds'](node.data.id).length
    },
    countPartnersBetween: (state, getters) => (nodeA, nodeB) => {
      const [leftNode, rightNode] = [nodeA, nodeB].sort((a, b) => a.x - b.x)
      let partnersBetween = 0
      let count

      // count the num partners on the right of the leftNode
      count = getters.countPartners(leftNode)
      partnersBetween += count % 2 === 0 ? count / 2 : (count - 1) / 2

      // add the num partners on the left of rightNode
      count = getters.countPartners(rightNode)
      partnersBetween += count % 2 === 0 ? count / 2 : (count + 1) / 2

      return partnersBetween
    },
    distanceBetweenNodes: (state, getters) => (nodeA, nodeB) => {
      // horizontal distance between node centers (as a multuple of NODE_SIZE_X)

      const partnersBetween = getters.countPartnersBetween(nodeA, nodeB)

      /* if nodes are siblings */
      if (nodeA.parent === nodeB.parent) {
        return (
          RADIUS +
          (partnersBetween * (PARTNER_SPACE + 2 * PARTNER_RADIUS)) +
          SIBLING_SPACE +
          RADIUS
        ) / NODE_SIZE_X
      }
      /* if nodes are more distant */
      else {
        return (
          RADIUS +
          (partnersBetween * (PARTNER_SPACE + 2 * PARTNER_RADIUS)) +
          COUSIN_SPACE + // <<< this is bigger than sibling spacing
          RADIUS
        ) / NODE_SIZE_X
      }
    },

    layout (state, getters) {
      return d3Tree()
        .nodeSize([NODE_SIZE_X, NODE_SIZE_Y])
        .separation((a, b) => {
          return (a.parent === b.parent)
            ? getters.distanceBetweenNodes(b, a) // siblings (left=B, right=A)
            : getters.distanceBetweenNodes(a, b, true) // areCousins (left=A, right=B)
        })
    },

    root (state, getters, rootState, rootGetters) {
      const nestedDescendants = rootGetters['whakapapa/nestedDescendants']
      return d3Hierarchy(nestedDescendants)
        /* sort the children by age */
        // https://github.com/d3/d3-hierarchy#node_sort
        .sort((a, b) => {
          const A = getOrderData(rootGetters, a)
          if (!A) return 0
          const B = getOrderData(rootGetters, b)
          if (!B) return 0

          // try to compare by birth order
          if (A.birthOrder > B.birthOrder) return 1
          if (A.birthOrder < B.birthOrder) return -1

          // fall back to age
          if (A.age > B.age) return -1
          if (A.age < B.age) return 1

          if (!A.birthOrder) return 1
          if (!B.birthOrder) return -1

          return 0
        })
    },

    tree (state, getters, rootState, rootGetters) {
      const treeLayout = getters.layout(getters.root)

      const getChildType = (parentNode, childNode) => {
        return rootGetters['whakapapa/getChildType'](parentNode.data.id, childNode.data.id)
      }
      const getPartnerType = (A, B) => {
        return rootGetters['whakapapa/getPartnerType'](A.data.id, B.data.id)
      }

      // for each node in the tree:
      treeLayout.each(node => {
        // add partners (sorted by children)
        node.partners = layoutPartnerNodes(node, rootGetters)

        const partnerLinks = layoutPartnerLinks(node, { getPartnerType })
        const childLinks = layoutChildLinks(node, partnerLinks, { getChildType, getPartnerType })

        // then add link data
        //    - rootNode --> partner (if there's a relationship)
        //    - rootNode --> child (when solo parent)
        //    - partner --> child (when solo parent)
        //    - rootNode + partner --> child

        node.links = [
          ...childLinks,
          ...partnerLinks
        ]
      })

      // treeLayout.secondaryLinks = layoutSecondaryLinks(getters, rootGetters)
      // NOTE ideally we could do this here ... but results in an infinite loop
      // NOTE done after above round as partners are added there

      return treeLayout
    },
    descendants (state, getters) {
      return getters.tree.descendants()
      // returns the array of descendants starting with the root node, then followed by each child in topological order
    },

    // nodes
    getNode: (state, getters) => (id) => {
      return getters.descendants.find(node => node && node.data.id === id)
    },
    getPartnerNode: (state, getters) => (id) => {
      const rootNode = getters.descendants.find(node => node.partners.some(partner => partner.data.id === id))
      if (!rootNode) return

      return rootNode.partners.find(partner => partner.data.id === id)
    },
    getParentNodeId: (state, getters) => (id) => {
      const node = getters.getNode(id)

      if (!node || !node.parent || !node.parent.data) return null
      return node.parent.data.id
    },

    secondaryLinks (state, getters, rootState, rootGetters) {
      return layoutSecondaryLinks(getters, rootGetters)
    },
    // if there is a node for the profile, then it means it is in the drawn tree
    // NOTE: the collapsed nodes are not in the drawn tree!
    isInTree: (state, getters) => (id) => {
      return Boolean(
        getters.getNode(id) ||
        getters.getPartnerNode(id)
      )
    }
  }

  const mutations = {
    setMouseEvent (state, e) {
      state.mouseEvent = e
    },
    setHoveredProfileId (state, id) {
      state.hoveredProfileId = id
    },
    setSearchedProfileId (state, id) {
      state.searchedProfileId = id
    }
  }

  const actions = {
    setMouseEvent ({ commit }, e) {
      commit('setMouseEvent', e)
    },
    setHoveredProfileId ({ commit }, id) {
      commit('setHoveredProfileId', id)
    },
    setSearchedProfileId ({ commit }, id) {
      commit('setSearchedProfileId', id)
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

function getOrderData (rootGetters, node) {
  const profile = rootGetters['person/person'](node.data.id)
  if (!profile) return
  return {
    age: profile.aliveInterval && calculateAge(profile.aliveInterval),
    birthOrder: profile.birthOrder || undefined
    // NOTE cannot leave null, as e.g. null < 4 === true
  }
}
