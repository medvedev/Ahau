<template>
  <div :class="{ topMargin: !showStory }">
    <div v-if="showStory" :class="{ showOverlay: showStory && !mobile }"></div>
    <v-container fluid v-if="collection">
      <!-- Collection Header -->
      <v-row v-if="!showStory">
        <!-- <CollectionTitle v-if="mobile" :collection="collection" @click="dialog = 'edit-collection'"/> -->
        <BigAddButton :label="$t('viewArchive.newStoryButton')" :customClass="mobile ? 'addBtnMobile':'addBtnDesktop'" @click="newStory" />
        <v-col v-if="mobile" cols="12" class="headliner black--text pa-0 pb-2">
          {{ collection.name + ' collection'}}
            <v-icon color="blue-grey" light @click="viewCollection" class="text-right justify-end">mdi-information</v-icon>
        </v-col>
        <v-col v-else cols="12" xs="12" sm="12" md="9" class="pa-0">
          <v-row class="pb-5">
            <CollectionTitleCard :collection="collection" :access="[currentAccess]" @click="editCollection"/>
          </v-row>
        </v-col>
      </v-row>

      <v-col v-if="timeline" cols="12" class="pt-0" :class="mobile ? '':'mt-4'">
          <Timeline
            :stories="stories"
            :reload="reload"
            :timeline="timeline"
            @save="processStory"
            @toggleTimeline="toggleTimeline"
          />
        </v-col>
      <v-row v-else>
        <v-col cols="12" class="px-0">
          <Stories
            :title="t('stories')"
            :stories="stories"
            :reload="reload"
            :timeline="timeline"
            @save="processStory"
            @toggleTimeline="toggleTimeline"
          />
        </v-col>
      </v-row>
    </v-container>

    <!-- Dialog -->
    <NewCollectionDialog
      v-if="collection && dialog === 'edit-collection'"
      :show="dialog === 'edit-collection'"
      :collection="collection"
      :title="editing ? `Edit ${collection.name || 'Untitled'} Collection` : `${collection.name} Collection`"
      :editing="editing"
      @submit="processUpdateCollection"
      @delete="dialog = 'delete-collection'"
      @close="close"
      @edit="editCollection"
    />
    <DeleteCollectionDialog
      v-if="dialog === 'delete-collection'"
      :show="dialog === 'delete-collection'"
      @submit="processDeleteCollection"
      @close="close"
    />
    <NewRecordDialog
      v-if="dialog === 'new-story'"
      :show="dialog === 'new-story'"
      :title="$t('viewArchive.addStory')" @close="dialog = null"
      :collection="collection"
      @submit="processStory"
    />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

import Stories from '../components/archive/Stories.vue'
import Timeline from '../components/story/Timeline.vue'
import BigAddButton from '@/components/button/BigAddButton.vue'
import NewCollectionDialog from '@/components/dialog/archive/NewCollectionDialog.vue'
import DeleteCollectionDialog from '@/components/dialog/archive/DeleteCollectionDialog.vue'
import NewRecordDialog from '@/components/dialog/archive/NewRecordDialog.vue'
import CollectionTitleCard from '@/components/archive/CollectionTitleCard.vue'

import { saveStoryMixin } from '@/mixins/story-mixins.js'

export default {
  name: 'CollectionShow',
  mixins: [
    saveStoryMixin
  ],
  components: {
    Stories,
    BigAddButton,
    NewCollectionDialog,
    DeleteCollectionDialog,
    NewRecordDialog,
    CollectionTitleCard,
    Timeline
  },
  data () {
    return {
      collection: null,
      dialog: false,
      editing: false,
      timeline: false
    }
  },
  async mounted () {
    await this.reload()
  },
  computed: {
    ...mapGetters(['whoami', 'currentAccess']),
    ...mapGetters('archive', ['showStory', 'showArtefact']),
    stories () {
      if (!this.collection || !this.collection.stories) return []
      return this.collection.stories.map(link => {
        return {
          linkId: link.linkId,
          ...link.story
        }
      })
        .reverse()
    },
    recordCount () {
      return this.stories.length || null
    },
    mobile () {
      return this.$vuetify.breakpoint.xs || this.$vuetify.breakpoint.sm
    }
  },
  watch: {
    recordCount () {
      if (this.recordCount !== this.collection.recordCount) {
        const input = {
          id: this.collection.id,
          recordCount: this.recordCount
        }
        this.processUpdateCollection(input)
      }
    }
  },
  methods: {
    ...mapActions('archive', ['setCurrentStory', 'toggleShowStory', 'setShowArtefact']),
    ...mapActions('collection', ['getCollection', 'updateCollection', 'deleteCollection']),
    toggleTimeline () {
      this.timeline = !this.timeline
    },
    editCollection () {
      this.editing = true
      this.dialog = 'edit-collection'
    },
    newStory () {
      this.editing = false
      this.dialog = 'new-story'
    },
    viewCollection () {
      this.editing = false
      this.dialog = 'edit-collection'
    },
    close () {
      this.editing = false
      this.dialog = null
    },
    cordovaBackButton () {
      if (this.showArtefact) {
        this.setShowArtefact()
        return false
      }
      if (this.showStory) {
        this.setCurrentStory(undefined)
        this.toggleShowStory()
        return false
      }

      return this.$router.back()
    },
    async processUpdateCollection (input) {
      this.collection = await this.updateCollection(input)
    },
    async processDeleteCollection () {
      await this.deleteCollection(this.collection.id)

      const [type] = this.$route.name.split('/collection')

      this.$router.push({
        name: type + '/archive',
        params: {
          profileId: this.$route.params.profileId,
          tribeId: this.$route.params.tribeId
        }
      }).catch(() => {})
    },
    async reload () { // TODO story mixin depends on this
      this.collection = await this.getCollection(this.$route.params.collectionId)
    },
    t (key, vars) {
      return this.$t('viewArchive.' + key, vars)
    }
  }
}
</script>
<style lang="scss">
@media (min-width: 1264px) and (max-width: 1903px) {
  .col-lg-20p {
    width: 20%;
    max-width: 20%;
    flex-basis: 20%;
  }
  .col-lg-60p {
    width: 60%;
    max-width: 60%;
    flex-basis: 60%;
  }
  .col-lg-80p {
    width: 80%;
    max-width: 80%;
    flex-basis: 80%;
  }
}

.topMargin {
  margin-top: 70px;
}

.body-width {
  max-width: 100vw;
}

.niho-bg {
  background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0.99),
      rgba(255, 255, 255, 0.7)
    ),
    url(@/assets/niho.svg);
  background-position-x: 100px;
  background-attachment: fixed;
  background-repeat: no-repeat;
}

/* .fade-enter-active,
.fade-leave-active {
  transition-duration: 0.2;
  transition-property: top;
  transition-timing-function: ease-in-out;
 } */

.fade-enter-active {
  transition: all 0.6s ease-in-out;
}

.showOverlay {
  z-index: 1;
  height: 100%;
  width: 100%;
  position: fixed;
  overflow: auto;
  top: 0px;
  left: 0px;
  background: rgba(0, 0, 0, 0.81);
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
  transform: translateY(30px);
}</style
>22px;
