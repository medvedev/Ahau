<template>
  <Dialog :show="show" :title="title" width="720px" :goBack="close" enableMenu
    @submit="submit"
    @close="close"
  >

    <!-- Content Slot -->
    <template v-slot:content>
      <v-col class="py-0 px-0">

        <ProfileForm
          :profile.sync="formData"
          :readonly="hasSelection"
          :withRelationships="allowRelationships"
          :dialogType="type"
          :mobile="mobile"
          :displayName="getDisplayName(selectedProfile)"
          :isDuplicate="isDuplicate"
          :moveDup.sync="moveDup"
        >

          <!-- Slot = Search -->
          <template v-slot:search>
            <v-combobox
              v-model="formData.preferredName"
              :items="generateSuggestions"
              item-value="id"
              item-text="id"
              :label="t('firstName')"
              :menu-props="{ light: true }"
              :clearable="hasSelection"
              append-icon=""
              v-bind="customProps"
              :search-input.sync="formData.preferredName"
              :readonly="hasSelection"
              :outlined="!hasSelection"
              autofocus
              @click:clear="resetFormData()"
              @blur.native="clearSuggestions"
            >

              <!-- Slot:item = Data -->
              <template v-slot:item="data">
                <template v-if="typeof data.item === 'object'">
                  <v-list-item @click="setFormData(data.item)">
                    <Avatar class="mr-3" size="40px" :image="data.item.avatarImage" :alt="data.item.preferredName" :gender="data.item.gender" :aliveInterval="data.item.aliveInterval" />
                    <v-list-item-content v-if="data.item.preferredName">
                      <v-list-item-title> {{ data.item.preferredName }} </v-list-item-title>
                      <v-list-item-subtitle>{{ t('preferredName') }}</v-list-item-subtitle>
                    </v-list-item-content>
                    <v-list-item-content v-if="data.item.legalName">
                      <v-list-item-title> {{ data.item.legalName }} </v-list-item-title>
                      <v-list-item-subtitle>{{ t('fullName') }}</v-list-item-subtitle>
                    </v-list-item-content>
                    <v-list-item-content v-if="!data.item.preferredName && !data.item.legalName">
                      <v-list-item-title>{{ t('unknown') }}</v-list-item-title>
                      <v-list-item-subtitle>{{ t('fullName') }}</v-list-item-subtitle>
                    </v-list-item-content>
                    <v-list-item-action v-if="age(data.item.aliveInterval)">
                      <v-list-item-title> {{ age(data.item.aliveInterval) }} </v-list-item-title>
                      <v-list-item-subtitle>{{ t('age') }}</v-list-item-subtitle>
                    </v-list-item-action>
                  </v-list-item>
                </template>
              </template>
            </v-combobox>
          </template>

          <template v-slot:addParents>
            <v-col cols="12" :class="mobile ? 'px-0':'py-0'" v-if="hasProfiles('parents')">
              <ProfileList
                :label="t('addParent')"

                :readonly="type === 'sibling'"
                :newProfiles="quickAdd.newParents"
                :existingProfiles="generateParents"

                @click="updateQuickAdd($event, 'newParents')"
                @update="updateRelationships($event, 'newParents')"
              />
            </v-col>
          </template>
          <template v-slot:addChildren>
            <v-col cols="12" v-if="hasProfiles('children')">
              <ProfileList
                :label="t('addChildren')"

                :newProfiles="quickAdd.newChildren"
                :existingProfiles="generateChildren"

                @click="updateQuickAdd($event, 'newChildren')"
                @update="updateRelationships($event, 'newChildren')"
              />
            </v-col>
          </template>
          <template v-slot:addPartners>
            <v-col cols="12" v-if="hasProfiles('partners')">
              <ProfileList
                :label="t('addPartners')"
                hide-details

                :newProfiles="quickAdd.newPartners"
                :existingProfiles="generatePartners"

                @click="updateQuickAdd($event, 'newPartners')"
              />
            </v-col>
          </template>
        </ProfileForm>

      </v-col>
    </template>
    <template v-if="currentAccess" v-slot:before-actions>
      <AccessButton type="person" :accessOptions="[currentAccess]"  disabled/>
    </template>
  </Dialog>
</template>

<script>
/* eslint brace-style: ["error", "stroustrup", { "allowSingleLine": true }] */
import { mapGetters, mapActions } from 'vuex'
import isEmpty from 'lodash.isempty'
import pick from 'lodash.pick'

import Dialog from '@/components/dialog/Dialog.vue'

import ProfileForm from '@/components/profile/ProfileForm.vue'
import ProfileList from '@/components/profile/ProfileList.vue'
import Avatar from '@/components/Avatar.vue'
import AccessButton from '@/components/button/AccessButton.vue'

import calculateAge from '@/lib/calculate-age'
import { PERMITTED_PERSON_ATTRS, PERMITTED_RELATIONSHIP_ATTRS, getDisplayName, setPersonProfile, setDefaultData } from '@/lib/person-helpers'
import { parseInterval } from '@/lib/date-helpers.js'
import { ACCESS_KAITIAKI } from '@/lib/constants.js'

const VALID_TYPES = new Set(['child', 'parent', 'sibling', 'partner'])
const isNotEmpty = (array) => array && array.length > 0

export default {
  name: 'NewNodeDialog',
  components: {
    Avatar,
    Dialog,
    ProfileForm,
    AccessButton,
    ProfileList
  },
  props: {
    show: { type: Boolean, required: true },
    title: { type: String, default: 'Create a new person' },
    type: {
      type: String,
      validator: (val) => VALID_TYPES.has(val)
    }
  },
  data () {
    return {
      suggestions: [],
      timer: undefined,
      formData: null,
      hasSelection: false, // TODO - describe what this does
      closeSuggestions: [],
      profile: {}, // the profile state in the form
      quickAdd: {
        parents: [],
        children: [],
        partners: [],
        newParents: [],
        newChildren: [],
        newPartners: []
      },
      existingProfile: null, // the currently profile in database (if it exists)
      isDuplicate: false,
      moveDup: true
    }
  },
  async mounted () {
    this.formData = setDefaultData(this.allowRelationships)
    this.closeSuggestions = await this.getCloseSuggestions()

    if (this.$route.name !== 'login' && this.selectedProfile) {
      this.quickAdd.parents = await this.newChildParents(this.selectedProfile)
      this.quickAdd.partners = this.selectedProfile.parents

      if (this.type === 'partner') this.quickAdd.children = this.newPartnerChildren(this.selectedProfile)
      else if (this.type === 'parent') this.quickAdd.children = this.newParentChildren(this.selectedProfile)
    }
  },
  watch: {
    profile: {
      deep: true,
      immediate: true,
      handler (newVal) {
        if (!newVal) return

        this.formData = setPersonProfile(newVal)
        if (!this.formData.relationshipType) this.formData.relationshipType = 'birth' // choose birth by default
      }
    },
    'formData.relationshipType' (newValue, oldValue) {
      // make sure adoption status can't be set true when relationship type is birth
      if (newValue === 'birth') this.formData.legallyAdopted = false
    },
    // watch for changes to avatarImage to decide when to show avatar
    'formData.avatarImage' (newValue) {
      if (!isEmpty(newValue)) {
        this.showAvatar = true
      }
    },
    async 'formData.preferredName' (name) {
      clearTimeout(this.timer)

      if (!name) {
        this.suggestions = []
        return
      }

      if (name.length > 2 && !this.hasSelection) {
        this.timer = setTimeout(async () => {
          this.suggestions = await this.findSuggestionsByGroup(name)
        }, 500)
      }
      else {
        this.suggestions = []
      }
    },
    async hasSelection (newValue) {
      if (newValue) {
        this.suggestions = []

        this.existingProfile = await this.getProfile(this.profile.id)

        // if hasSelection and quickAdd Section, show exsisting links
        if (this.generateParents && this.existingProfile.parents) this.quickAdd.newParents = [...this.existingProfile.parents]
        if (this.generateChildren && this.existingProfile.children) this.quickAdd.newChildren = [...this.existingProfile.children]
        if (this.generatePartners && this.existingProfile.partners) {
          this.quickAdd.partners = [...this.existingProfile.partners]
          this.quickAdd.newPartners = [...this.existingProfile.partners]
        }

        // hack: when there is no preferred name and a selected profile, the clearable button doesnt how up
        // doing this forces it to show
        if (this.formData.preferredName === '' || this.formData.preferredName === null) this.formData.preferredName = getDisplayName(this.formData)
      }
      else {
        this.quickAdd.newChildren = []
        this.quickAdd.newPartners = []
      }
    }
  },
  computed: {
    ...mapGetters(['currentAccess']),
    ...mapGetters('whakapapa', ['whakapapaView', 'getParentIds', 'getRawChildIds', 'getRawParentIds', 'getRawPartnerIds', 'isNotIgnored']),
    ...mapGetters('tree', ['isInTree', 'getNode']),
    ...mapGetters('person', ['selectedProfile']),
    allowRelationships () {
      return this.type && this.type !== 'partner' && (this.profile.relationshipType == null)
    },
    isWhakapapaIndex () {
      return ['community/whakapapa', 'person/whakapapa'].includes(this.$route.name)
    },
    generateSuggestions () {
      if (this.hasSelection) return []

      if (this.suggestions.length) {
        return [
          ...(this.type ? [{ header: 'Are you looking for:' }] : []),
          ...this.suggestions
          // { divider: true } // example of how to add a divider
        ]
      }
      else if (this.closeSuggestions.length) {
        return [
          this.header,
          ...this.closeSuggestions
        ]
        // NOTE 2022-03-08 mix
        // this currently suggests existing contacts which are already linked
      }
      else return []
    },

    generateParents () {
      return this.getSuggestionsByField('parents')
    },
    generateChildren () {
      return this.getSuggestionsByField('children')
    },
    generatePartners () {
      return this.getSuggestionsByField('partners')
    },
    mobile () {
      return this.$vuetify.breakpoint.xs || this.$vuetify.breakpoint.sm
    },
    customProps () {
      return {
        readonly: this.hasSelection,
        hideDetails: true,
        placeholder: ' ',
        class: this.hasSelection ? 'custom' : ''
      }
    },
    header () {
      switch (this.type) {
        case 'child': return { header: 'Suggested children' }
        case 'parent': return { header: 'Suggested parents' }
        case 'partner': return { header: 'Suggested partners' }
        default: return null
      }
    },
    submission () {
      const submission = {}
      Object.entries(this.formData).forEach(([key, value]) => {
        if (!isEmpty(this.formData[key])) {
          switch (key) {
            case 'birthOrder':
              submission[key] = parseInt(value)
              break
            case 'altNames':
              if (!isEmpty(this.formData[key].add)) {
                submission[key] = value
              }
              break
            case 'aliveInterval':
              submission[key] = parseInterval(this.formData.aliveInterval)
              break
            default:
              submission[key] = value
          }
        }
        else if (key === 'deceased') {
          submission[key] = value
        }
      })

      return submission
    }
  },
  methods: {
    ...mapActions('whakapapa', ['suggestedChildren', 'suggestedParents']),
    ...mapActions('profile', ['getProfile']),
    ...mapActions('person', ['findPersonByName', 'getPerson', 'findPersonsByNameWithinGroup']),
    getDisplayName,
    updateRelationships (profile, selectedArray) {
      const index = this.quickAdd[selectedArray].findIndex(x => x.id === profile.id)
      this.quickAdd[selectedArray][index].relationshipType = profile.relationshipType
    },
    updateQuickAdd (profile, selectedArray) {
      const isAlreadyQuickAdded = this.quickAdd[selectedArray].some(d => d.id === profile.id)
      if (isAlreadyQuickAdded) {
        // remove from selectedArray
        this.quickAdd[selectedArray] = this.quickAdd[selectedArray].filter(d => d.id !== profile.id)
      } // eslint-disable-line
      else {
        // add to selectedArray
        const details = pick(profile, ['id', 'relationshipType', 'legallyAdopted'])
        this.quickAdd[selectedArray].push(details)
      }
    },
    hasProfiles (field) {
      return this.quickAdd[field] && this.quickAdd[field].length > 0
    },
    getSuggestionsByField (field) {
      if (!this.hasProfiles(field)) return []

      const filterSelection = (profile) => {
        if (!profile) return false
        return profile.id !== this.profile.id
      }

      return this.quickAdd[field]
        .filter(filterSelection)
    },
    clearSuggestions () {
      this.suggestions = []
    },
    getCloseSuggestions () {
      switch (this.type) {
        case 'child':
          return this.suggestedChildren(this.selectedProfile.id)
        case 'parent':
          return this.suggestedParents(this.selectedProfile.id)
        case 'partner':
          return this.findPartners()
        default:
          return []
      }
    },
    newChildParents (profile) {
      const currentPartners = []

      if (this.type === 'child' && profile.partners) {
        profile.partners.forEach(d => {
          currentPartners.push(d)
        })
      }
      if (this.type === 'sibling' && profile.parents) {
        profile.parents.forEach(d => {
          currentPartners.push(d)
        })
      }

      return currentPartners
    },

    newPartnerChildren (profile) {
      return profile.children || []
    },

    newParentChildren (profile) {
      return profile.siblings || []
    },

    // suggests other parents of children
    async findPartners () {
      const currentPartners = this.selectedProfile.partners || []

      const suggestedPartners = []

      this.selectedProfile.children.map(child => {
        if (!child.parents) return child

        this.getParentIds(child.id).forEach(parentId => {
          if (this.selectedProfile.id === parentId) return
          if (currentPartners.some(partner => partner.id === parentId)) return
          if (suggestedPartners.some(partner => partner.id === parentId)) return

          suggestedPartners.push(parent)
        })

        return child
      })

      // get ignored parents
      const profile = await this.getProfile(this.selectedProfile.id)
      profile.partners.forEach(partner => {
        if (this.selectedProfile.id === partner.id) return
        if (currentPartners.some(_partner => _partner.id === partner.id)) return
        if (suggestedPartners.some(_partner => _partner.id === partner.id)) return

        suggestedPartners.push(partner)
      })

      return suggestedPartners
    },

    age (aliveInterval) {
      return calculateAge(aliveInterval)
    },
    submit () {
      const recps = this.currentAccess
        ? [this.currentAccess.groupId]
        : null

      const submission = {
        ...pick(this.submission, [...PERMITTED_PERSON_ATTRS, ...PERMITTED_RELATIONSHIP_ATTRS]),
        recps
      }

      if (this.hasProfiles('newChildren')) {
        if (this.existingProfile && this.existingProfile.children) {
          // if quick adding children, remove exisiting children from the list
          const _children = this.quickAdd.newChildren.filter(child => {
            return this.existingProfile.children.every(d => child.id !== d.id)
          })
          if (_children.length) submission.children = _children
        }
        else submission.children = this.quickAdd.newChildren
      }

      if (this.hasProfiles('newParents')) {
        if (this.existingProfile && this.existingProfile.parents) {
          const _parents = this.quickAdd.newParents.filter(child => {
            return this.existingProfile.children.every(d => child.id !== d.id)
          })
          if (_parents.length) submission.parents = _parents
        }
        else submission.parents = this.quickAdd.newParents
      }

      if (this.hasProfiles('newPartners')) {
        if (this.existingProfile && this.existingProfile.partners) {
          const _partners = this.quickAdd.newPartners.filter(child => {
            return this.existingProfile.children.every(d => child.id !== d.id)
          })
          if (_partners.length) submission.partners = _partners
        }
        else submission.partners = this.quickAdd.newPartners
      }

      if (this.isDuplicate) {
        submission.moveDup = this.moveDup
      }

      this.$emit('create', submission)
      this.close()
    },
    cordovaBackButton () {
      this.close()
    },
    close () {
      this.resetFormData()
      this.$emit('close')
    },
    checkIfDuplicate (profile) {
      if (this.type === 'parent') {
        const stepParents = this.getRawParentIds(this.selectedProfile.id)
          .filter(this.isNotIgnored)
          .filter(parentId => {
            return this.getRawPartnerIds(parentId)
              .filter(this.isNotIgnored)
              .includes(profile.id)
          })

        if (stepParents.length) return false
      }

      if (this.type === 'child') {
        const stepChildren = this.getRawPartnerIds(this.selectedProfile.id)
          .filter(this.isNotIgnored)
          .filter(partnerId => {
            const childs = this.getRawChildIds(partnerId)
              .filter(this.isNotIgnored)
              .includes(profile.id)

            return childs
          })

        if (stepChildren.length) return false
      }

      if (this.type === 'partner') {
        const childsParents = this.getRawChildIds(this.selectedProfile.id)
          .filter(this.isNotIgnored)
          .filter(childId => {
            return this.getRawParentIds(childId)
              .filter(this.isNotIgnored)
              .includes(profile.id)
          })

        if (childsParents.length) return false
      }

      if (this.isInTree(profile.id)) return true

      return false
    },
    setFormData (person) {
      this.hasSelection = true
      this.profile = person
      this.isDuplicate = this.checkIfDuplicate(this.profile)
    },
    resetFormData () {
      if (this.hasSelection) {
        this.hasSelection = false
        this.formData = setDefaultData(this.withRelationships)
      }
      this.isDuplicate = false
      this.suggestions = []
    },
    t (key, vars) {
      return this.$t('newNode.' + key, vars)
    },

    async findSuggestionsByGroup (name) {
      if (!name) return []

      if (this.isWhakapapaIndex) return this.findPersonsByNameWithinGroup(name)

      // find persons in the group who arent an ancestor
      return this.findAndFilterSuggestions(name)
    },
    async findAndFilterSuggestions (name) {
      if (!name) {
        this.suggestions = []
        return
      }

      const rawSuggestions = await this.findPersonByName({
        name,
        type: this.currentAccess.type === ACCESS_KAITIAKI ? 'person/admin' : 'person',
        groupId: this.whakapapaView.recps[0]
      })
      // reset the ancestors array
      this.ancestors = []
      await this.loadPersonsAncestors(this.selectedProfile.id) // Get the ancestors of the current node

      return rawSuggestions
        .filter(person => {
          return (
            // dont suggest ancestors
            // this will make it hard to add a grandparent as a whangai parent
            // but you can still do that the other way around by adding the grandchild to the grandparent
            !this.ancestors.some(ancestorId => ancestorId === person.id) &&

            // dont suggest direct descendants already in the tree
            !this.selectedProfile.children.some(child => child.id === person.id)
          )
        })
    },
    async loadPersonsAncestors (profileId) {
      this.addPersonToAncestors(profileId)

      // TODO: should we do this or something less expensive?
      const person = await this.getProfile(profileId)

      const { parents, partners, siblings } = person

      const hasParents = isNotEmpty(parents)
      const hasPartners = isNotEmpty(partners)
      const hasSiblings = isNotEmpty(siblings)

      // Return if there are no parents, partners and siblings on the current node
      if (!hasParents && !hasPartners && !hasSiblings) return

      // Include partners of ancestors
      if (hasPartners) partners.forEach(partner => this.addPersonToAncestors(partner.id))

      // Get the current parents and their ancestors
      await Promise.all(
        parents
          .filter(parent => !this.ancestors.includes(parent.id)) // prevent infinite recursion
          .map(async parent => this.loadPersonsAncestors(parent.id))
      )
    },
    arrayIsNotEmpty (array) {
      return array && array.length > 0
    },
    addPersonToAncestors (profileId) {
      if (this.ancestors.includes(profileId)) return

      this.ancestors.push(profileId)
    }
  }
}
</script>

<style>
.custom.v-text-field > .v-input__control > .v-input__slot:before {
  border-style: none;
}
.custom.v-text-field > .v-input__control > .v-input__slot:after {
  border-style: none;
}
.close {
  top: -25px;
  right: -10px;
}
.big-avatar {
  position: relative;
  top: -20px;
}
.v-input--checkbox label {
  font-size: 14px;
}

.v-input--radio-group__input label {
  font-size: 14px;
}
</style>
