<template>
  <v-card
    max-width="210px"
    max-height="310px"
    light
    class="pa-0 ma-1"
    @click="$emit('click')"
    outlined
  >
    <v-img
      :src="image"
      class="grey darken-4 align-end"
      height="150px"
    >
    </v-img>
      <v-row class="px-3">
        <v-col cols="12" class="truncate title grey--text body-2 font-weight-medium">
          {{ collection.name || 'Untitled Collection' }}
        </v-col>
        <v-col cols="12" class="py-0 truncate description">
          <div class="small-text">{{ collection.description || 'No Description' }}</div>
        </v-col>
        <v-col v-if="collection.recordCount" cols="5" class="small-text grey--text py-2">
          {{ countText }}
        </v-col>
        <v-col v-if="submissionDate" cols="7" class="small-text grey--text py-2 pb-4">
          Updated: {{ submissionDate }}
        </v-col>
        <v-col cols="12" class="small-text grey--text py-0" >
          Kaitiaki
          <AvatarGroup :profiles="collection.tiaki" size="30" customClass="pa-0" showLabels/>
        </v-col>
      </v-row>
  </v-card>
</template>

<script>
import { formatSubmissionDate } from '@/lib/date-helpers.js'
import AvatarGroup from '@/components/AvatarGroup.vue'
import niho from '@/assets/niho.svg'

export default {
  name: 'CollectionCard',
  props: ['collection', 'selected'],
  components: { AvatarGroup },
  computed: {
    image () {
      if (this.collection.image && this.collection.image.uri) return this.collection.image.uri
      return niho
    },
    submissionDate () {
      if (!this.collection.submissionDate) return
      return formatSubmissionDate(this.collection.submissionDate, this.monthTranslations)
    },
    countText () {
      if (this.collection.type === 'collection') return 'Records: ' + this.collection.recordCount

      return `${this.collection.recordCount} ${this.collection.recordCount === 1 ? 'person' : 'people'}`
    }
  },
  methods: {
    goCollectionShow () {
      return {
        name: this.$route.name + '/:collectionId',
        params: {
          collectionId: this.collection.id
        }
      }
    },
    monthTranslations (key, vars) {
      return this.$t('months.' + key, vars)
    }
  }
}
</script>

<style scoped lang=scss>
/* .small-text {
  font-size: 0.8rem;
  line-height: 0.8rem;
} */

.small-text {
  font-size: 0.6rem;
  line-height: 0.6rem;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  &.title {
    height: 35px;
    -webkit-line-clamp: 1;
  }
  &.description {
    height: 28px;
    -webkit-line-clamp: 3;
  }
}
</style>
