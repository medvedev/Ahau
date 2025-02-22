<template>
  <Dialog :title="t('delete', { preferredName: profile.preferredName })" :show="show" width="720px" :goBack="close" enableMenu>
    <template v-slot:content>
      <v-card-subtitle>
        <v-col v-if="isWhakapapaShow" cols="12" sm="5" md="8">
          <v-radio-group v-model="removeProfile" column>
            <v-radio :label="t('whakapapaShow.hideProfile')" value="ignore"></v-radio>
            <v-radio :label="t('whakapapaShow.deleteProile')" value="delete"></v-radio>
          </v-radio-group>
        </v-col>
        <div class="warning-blurb">
          {{ confirmationMessage }}
          <span v-if="warnAboutChildren">
            {{ warnAboutChildrenMessage }}
          </span>
        </div>
      </v-card-subtitle>
    </template>

    <template v-slot:actions>
      <v-col class="py-0" cols="12" md="auto" :style="mobile ? 'text-align:center;':''">
        <v-row>
          <v-col cols="6">
            <v-btn @click="close"
              text
              :large="!mobile"
              class="secondary--text"
            >
              {{ t('cancel') }}
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn @click="submit"
              :large="!mobile"
              text
              color="blue"
            >
              {{ t('deleteLabel') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </template>
  </Dialog>
</template>

<script>
import Dialog from '@/components/dialog/Dialog.vue'

// mode for the type of remove
const IGNORE = 'ignore'
const DELETE = 'delete'

// for the type of delete
const WHAKAPAPA_SHOW = 'whakapapaShow' // delete a person from a whakapapa
const PERSON_INDEX = 'personIndex' // general delete a person

export default {
  props: {
    context: { type: String, default: WHAKAPAPA_SHOW },
    show: { type: Boolean, required: true },
    profile: { type: Object, required: true },
    warnAboutChildren: { type: Boolean, default: true }
  },
  components: {
    Dialog
  },
  data () {
    return {
      removeProfile: IGNORE
    }
  },
  mounted () {
    if (this.type === PERSON_INDEX) this.removeProfile = DELETE
  },
  computed: {
    mobile () {
      return this.$vuetify.breakpoint.xs
    },
    isWhakapapaShow () {
      return this.type === WHAKAPAPA_SHOW
    },
    confirmationMessage () {
      if (this.removeProfile === IGNORE && this.isWhakapapaShow) return this.t('whakapapa.hideConfirmation')

      return this.t(`${this.context}.deleteConfirmation`)
    },
    warnAboutChildrenMessage () {
      return this.t(`${this.context}.warnAboutChildren`)
    }
  },
  methods: {
    close () {
      this.$emit('close')
    },
    submit () {
      this.$emit('submit', this.removeProfile)
      this.close()
    },
    t (key, vars) {
      return this.$t('deleteNode.' + key, vars)
    }
  }
}
</script>
