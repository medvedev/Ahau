import tree from './tree-helpers'
const test = require('tape')

test('flatten', t => {
  const person = {
    id: 'A',
    preferredName: 'dad',

    parents: [
      {
        profile: {
          id: 'B',
          preferredName: 'grandad'
        },
        relationshipType: 'birth'
      }
    ],

    children: [
      {
        profile: {
          id: 'C',
          preferredName: 'son'
        },
        relationshipType: 'birth'
      },
      {
        profile: {
          id: 'D',
          preferredName: 'daughter'
        },
        relationshipType: 'whangai'
      }
    ]
  }

  // TODO
  // currently relationshipType is totally lost in flattening
  // changing this will likely require changing the data strucuture
  // which may result in change to vue layer
  const expected = {
    A: {
      id: 'A',
      preferredName: 'dad',
      parents: ['B'],
      children: ['C', 'D']
    },
    B: {
      id: 'B',
      preferredName: 'grandad'
      // parents: [],
      // children: ['A']
    },
    C: {
      id: 'C',
      preferredName: 'son'
      // parents: ['A'],
      // children: []
    },
    D: {
      id: 'D',
      preferredName: 'daughter'
      // parents: ['A'],
      // children: []
    }
  }

  t.deepEqual(
    tree.flatten(person),
    expected,
    'flattens the nesting!'
  )

  t.end()
})

test('hydrate', t => {
  /* parent hydration */
  const profilesParents = {
    A: {
      id: 'A',
      preferredName: 'grandad',
      parents: [],
      children: ['C'],
      siblings: []
    },
    B: {
      id: 'B',
      preferredName: 'grandma',
      parents: [],
      children: ['C'],
      siblings: []
    },
    C: {
      id: 'C',
      preferredName: 'mum',
      parents: ['A', 'B'],
      children: [],
      siblings: []
    }
  }
  const expectedParents = {
    id: 'C',
    preferredName: 'mum',
    parents: [
      {
        id: 'A',
        preferredName: 'grandad',
        parents: [],
        children: ['C'],
        siblings: []
      },
      {
        id: 'B',
        preferredName: 'grandma',
        parents: [],
        children: ['C'],
        siblings: []
      }
    ],
    children: [],
    siblings: []
  }
  t.deepEqual(
    tree.hydrate(profilesParents.C, profilesParents),
    expectedParents,
    'hydrates parents'
  )

  /* child hydration */
  const profilesChildren = {
    A: {
      id: 'A',
      preferredName: 'mum',
      parents: [],
      children: ['B'],
      siblings: []
    },
    B: {
      id: 'B',
      preferredName: 'child1',
      parents: ['A'],
      children: [],
      siblings: []
    }
  }
  const expectedChildren = {
    id: 'B',
    preferredName: 'child1',
    parents: [
      {
        id: 'A',
        preferredName: 'mum',
        parents: [],
        children: [ 'B' ],
        siblings: []
      }
    ],
    children: [],
    siblings: []
  }
  t.deepEqual(
    tree.hydrate(profilesChildren.B, profilesChildren),
    expectedChildren,
    'hydrates children'
  )

  /* sibling hydration */
  const profilesSiblings = {
    A: {
      id: 'A',
      preferredName: 'mum',
      parents: [],
      children: ['B', 'C'],
      siblings: []
    },
    B: {
      id: 'B',
      preferredName: 'child1',
      parents: ['A'],
      children: [],
      siblings: ['C']
    },
    C: {
      id: 'C',
      preferredName: 'child2',
      parents: ['A'],
      children: [],
      siblings: ['B']
    }
  }
  const expectedSiblings = {
    id: 'B',
    preferredName: 'child1',
    parents: [
      {
        id: 'A',
        preferredName: 'mum',
        parents: [],
        children: ['B', 'C'],
        siblings: []
      }
    ],
    children: [],
    siblings: [
      {
        id: 'C',
        preferredName: 'child2',
        parents: ['A'],
        children: [],
        siblings: ['B']
      }
    ]
  }
  t.deepEqual(
    tree.hydrate(profilesSiblings.B, profilesSiblings),
    expectedSiblings,
    'hydrates siblings'
  )

  /* missing profiles */
  const profilesMissing = {
    A: {
      id: 'A',
      preferredName: 'grandad',
      parents: [],
      children: ['B'],
      siblings: []
    }
  }
  t.throws(
    () => tree.hydrate(profilesMissing.A, profilesMissing),
    'throws if missing missing profile'
  )

  t.end()
})

test('bornAt hydration', t => {
  const profiles = {
    A: {
      bornAt: '2019-01-01T00:00:00.000Z'
    }
  }
  const expected = { bornAt: '2019-01-01' }
  const actual = tree.hydrate(profiles.A, profiles)
  t.deepEqual(actual, expected, 'hydration')
  t.end()
})

test('diedAt hydration', t => {
  const profiles = {
    A: {
      diedAt: '2019-01-01T00:00:00.000Z'
    }
  }
  const expected = { diedAt: '2019-01-01' }
  const actual = tree.hydrate(profiles.A, profiles)
  t.deepEqual(actual, expected, 'hydration')
  t.end()
})

test('bornAt DEFAULT hydration', t => {
  const profiles = {
    A: {
      bornAt: '-005001-12'
    }
  }
  const expected = { bornAt: null }
  const actual = tree.hydrate(profiles.A, profiles)
  t.deepEqual(actual, expected, 'hydration')
  t.end()
})

test('diedAt DEFAULT hydration', t => {
  const profiles = {
    A: {
      diedAt: '-005001-12'
    }
  }
  const expected = { diedAt: null }
  const actual = tree.hydrate(profiles.A, profiles)
  t.deepEqual(actual, expected, 'hydration')
  t.end()
})
