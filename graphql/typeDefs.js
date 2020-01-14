const { gql } = require('apollo-server')

// TODO change defs of altNames

module.exports = gql`
  scalar Date

  type CurrentIdentity {
    id: String
    feedId: String
    profileId: String

    profile: Profile
  }

  input ImageInput {
    blob: String
    mimeType: String
    size: Int
    width: Int
    height: Int
    uri: String
  }

  type Image {
    blob: String
    mimeType: String
    size: Int
    width: Int
    height: Int
    uri: String
  }

  enum Gender {
    male
    female
    other
    unknown
  }

  input TombstoneInput {
    date: Date
    reason: String
  }

  type Blob {
    blob: String
    mimeType: String
    size: Int
    uri: String
  }

  # TODO: make Profile, Whakapapa, WhakapapaNode a implementation of Person
  # interface Person {
  #   id: String
  #   type: String
  #   preferredName: String
  #   legalName: String
  #   altNames: [String]
  #   description: String
  #   avatarImage: Image
  #   headerImage: Image
  #   gender: Gender
  # }

  type Profile {
    id: String
    type: String
    authors: [String]
    canEdit: Boolean

    preferredName: String
    legalName: String
    altNames: [String]
    description: String
    avatarImage: Image
    headerImage: Image

    gender: Gender
    bornAt: Date

    tiaki: [Profile]
  }

  input CreateProfileInput {
    type: String!

    preferredName: String
    legalName: String
    altNames: [String]
    avatarImage: ImageInput
    headerImage: ImageInput
    description: String
    gender: Gender
    bornAt: Date
    recps: [String]
  }
  input UpdateProfileInput {
    id: String!

    preferredName: String
    legalName: String
    altNames: [String]
    avatarImage: ImageInput
    headerImage: ImageInput
    description: String
    gender: Gender
    tombstone: TombstoneInput
  }

  input CommunityInput {
    preferredName: String
    legalName: String
    altNames: [String]
    avatarImage: ImageInput
    headerImage: ImageInput
    description: String
    recps: [String]
  }

  input WhakapapaRelationInput {
    relationshipId: String
    child: String
    parent: String
    relationshipType: RelationshipType
    legallyAdopted: Boolean
    recps: [String]
  }

  input WhakapapaViewInput {
    id: ID
    name: String
    description: String
    focus: String
    mode: Mode
    recps: [String]
  }

  enum Mode {
    descendants
    ancestors
  }

  enum RelationshipType {
    birth
    adopted
    whangai
    unknown
  }

  type Peer {
    id: String
    state: String
  }

  type WhakapapaNode {
    id: String

    preferredName: String
    legalName: String
    altNames: [String]
    description: String
    avatarImage: Image
    headerImage: Image

    gender: Gender
    bornAt: Date

    relationshipType: RelationshipType
    legallyAdopted: Boolean
  }

  type Whakapapa {
    id: String

    preferredName: String
    legalName: String
    altNames: [String]
    description: String
    avatarImage: Image
    headerImage: Image

    gender: Gender
    bornAt: Date

    parents: [WhakapapaNode]
    children: [WhakapapaNode]
  }

  type WhakapapaView {
    id: ID
    name: String
    description: String
    focus: ID
    mode: Mode
    recps: [String]
  }

  type Query {
    "Scuttlebutt Who am I"
    whoami: CurrentIdentity

    "List of person profiles"
    persons: [Profile]
    "List of community profiles"
    communities: [Profile]
    "List of whakapapa views"
    views: [WhakapapaView]

    "Scuttlebutt identity profile"
    profile(id: String!): Profile

    "Scuttlebutt parent and child relations to a profile"
    closeWhakapapa(id: String): Whakapapa

    "Whakapapa views from a perspective"
    whakapapaView(id: String!): WhakapapaView
  }

  type Mutation {
    createProfile(input: CreateProfileInput): String
    updateProfile(input: UpdateProfileInput): String
    uploadFile(file: Upload!): Blob
    saveWhakapapaRelation(input: WhakapapaRelationInput): String
    saveWhakapapaView(input: WhakapapaViewInput): String
  }

  type Subscription {
    peers: [Peer]
  }
`
