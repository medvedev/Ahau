<template>
  <v-card
    light
    :to="goWhakapapaShow()"
    style="min-height:50px"
  >
    <v-container class="pa-0">
      <v-list-item-icon class="pt-1 mt-0" style="position:absolute; top:5px; right:1px; margin-right:0px">
        <v-list-item-subtitle class="no-flex mt-n1 mr-n3" :style="mobile ? 'font-size:0.7rem':'font-size:0.8rem'">Kaitiaki</v-list-item-subtitle>
        <AvatarGroup :profiles="view.tiaki" customClass="ma-0 pa-0 pt-1" style="position:relative; bottom:15px; left:10px" :size="mobile ? '25px':'30px'" spacing="pr-1"/>
      </v-list-item-icon>
      <div class="d-flex flex-no-wrap flex-start align-stretch">
        <div class="cover-image" :style="background(view)"></div>
        <div class="information">
          <v-card-title v-text="view.name" class="py-3" style="word-break: break-word;"/>
          <v-card-subtitle v-if="description" v-text="description" class="py-1"/>
          <v-card-subtitle v-if="view.recordCount" v-text="`${view.recordCount} ${personText}`" class="mt-n2"/>
          <v-card-text v-if="hasSlotContent">
            <slot></slot>
          </v-card-text>
        </div>
      </div>
    </v-container>
  </v-card>
</template>

<script>
import whakapapa from '@/assets/whakapapa.png'
import AvatarGroup from '@/components/AvatarGroup.vue'

export default {
  name: 'WhakapapaViewCard',
  props: {
    view: { type: Object, required: true },
    shadow: { type: Boolean, default: true },
    cropDescription: { type: Boolean, default: false },
    tribeId: String
  },
  components: {
    AvatarGroup
  },
  computed: {
    mobile () {
      return this.$vuetify.breakpoint.xs
    },
    personText () {
      return this.view.recordCount === 1 ? 'person' : 'people'
    },
    hasSlotContent () {
      return Boolean(this.$slots.default)
    },
    description () {
      const description = this.view.description
      if (
        this.mobile &&
        this.cropDescription &&
        description &&
        description.length > 80
      ) {
        return description.substring(0, 80) + '...'
      }
      return description
    }
  },
  methods: {
    goWhakapapaShow () {
      return {
        name: this.$route.name + '/:whakapapaId',
        params: {
          tribeId: this.tribeId,
          whakapapaId: this.view.id
        }
      }
    },
    background (view) {
      if (view.image && view.image.uri) {
        return {
          backgroundImage: `url(${view.image.uri})`,
          backgroundSize: 'cover',
          borderTopLeftRadius: '4px',
          borderBottomLeftRadius: '4px'
        }
      }
      return {
        backgroundImage: `url(${whakapapa})`,
        backgroundSize: 'cover'
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.v-card {
  color: #555 !important;

  & > .v-card__text {
    color: #555 !important;
  }
  .v-card__subtitle {
    color: #555 !important;
  }
}

.cover-image {
  min-width: 20%;
  background-color: #fff;
  background-position: center center;
  @media screen and (max-width: 420px) {
    min-width: 30%
  }
}

.information {
  @media screen and (max-width: 420px) {
    width: 70%;
  }
}

.body-width {
  width: 100%;
}
</style>
