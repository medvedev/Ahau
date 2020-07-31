import gql from 'graphql-tag'
import { createProvider } from '@/plugins/vue-apollo'
import pick from 'lodash.pick'

const apolloProvider = createProvider()
const apolloClient = apolloProvider.defaultClient

export const PERMITTED_PERSON_ATTRS = [
  'headerImage',
  'avatarImage',
  // WARNING: make sure header and avatar images are the first two (for PERSON_FRAGMENT)
  'id',
  // NOTE: we don't allow setting of `type`, this is always "profile"
  'preferredName',
  'legalName',
  'altNames',
  'description',
  'gender',

  'address',
  'location',
  'email',
  'phone',
  'profession',

  'aliveInterval',
  'birthOrder',
  'deceased',
  'type',
  'canEdit',

  // 'tombstone', // PROBLEMS, can't fetch this at the moment, breaks PERSON_FRAGMENT
  'recps'
]

export const PERMITTED_PUBLIC_PERSON_ATTRS = [
  'id',
  'preferredName',
  'avatarImage'
]

export const PERMITTED_RELATIONSHIP_ATTRS = [
  'relationshipType',
  'legallyAdopted'
]

export const PERSON_FRAGMENT = gql`
  fragment ProfileFragment on Person {
    ${PERMITTED_PERSON_ATTRS.slice(2)}
    avatarImage { uri }
    headerImage { uri }
  }
`

export const whoami = ({
  query: gql`
    ${PERSON_FRAGMENT}
    query {
      whoami {
        public {
          feedId
          profile {
            id
            preferredName
            avatarImage {
              uri
            }
          }
        }
        personal {
          groupId
          profile {
            ...ProfileFragment
          }
        }
      }
    }
  `,
  fetchPolicy: 'no-cache'
})

export const getPerson = id => ({
  query: gql`
    ${PERSON_FRAGMENT}
    query($id: String!) {
      person(id: $id){
        ...ProfileFragment
        children {
          profile {
            ...ProfileFragment
          }
          linkId
          relationshipType
          legallyAdopted
        }
        parents {
          profile {
            ...ProfileFragment
          }
          linkId
          relationshipType
          legallyAdopted
        }
        kaitiaki {
          id
          preferredName
          avatarImage { uri }
          gender
          aliveInterval
        }
      }
    }
  `,
  variables: { id: id },
  fetchPolicy: 'no-cache'
})

// get person with parents and children from DB
export async function getRelatives (profileId) {
  const request = getPerson(profileId)
  const result = await apolloClient.query(request)
  if (result.errors) {
    console.error('WARNING, something went wrong')
    console.error(result.errors)
  } else {
    return result.data.person
  }
}

export const savePerson = input => {
  const _input = pick(input, PERMITTED_PERSON_ATTRS)
  if (!_input.id) _input.type = 'person'

  return {
    mutation: gql`
      mutation($input: ProfileInput!) {
        saveProfile(input: $input)
      }
    `,
    variables: { input: _input }
  }
}

export const saveCurrentIdentity = (personalId, publicId, input) => {
  const personalDetails = pick(input, PERMITTED_PERSON_ATTRS)
  const publicDetails = pick(input, PERMITTED_PUBLIC_PERSON_ATTRS)

  // TODO - this currently submits mutations to public profile event when they are empty!
  // could fix this is ssb-profile or here?

  return {
    mutation: gql`
      mutation ($personalDetails:ProfileInput, $publicDetails:ProfileInput) {
        savePersonalProfile: saveProfile(input:$personalDetails)
        savePublicProfile: saveProfile(input:$publicDetails)
      }
    `,
    variables: {
      personalDetails: {
        id: personalId,
        ...personalDetails
      },
      publicDetails: {
        id: publicId,
        ...publicDetails,
        allowPublic: true
      }
    }
  }
}
