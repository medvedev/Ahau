<template>
  <g @click.stop="click">
    <g v-if="isLoadingProfiles || isLoadingWhakapapa" :transform="transform" style="enable-background:new 0 0 50 50;">
      <path fill="#818181" d="M25.251,6.461c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615V6.461z">
        <animateTransform attributeType="xml"
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1s"
          repeatCount="indefinite"/>
      </path>
    </g>
    <g v-else class="menu-button" :transform="transform" >
      <circle
        v-if="mobile"
        opacity="0"
        cx="20"
        cy="1"
        r="35"
      />
      <circle
        stroke="white"
        fill="white"
        filter="url(#shadow)"
        cx="20"
        cy="1"
        r="10"
      />
      <polygon points="15,0  25,0  20,6" style="fill:#000;" />
    </g>
  </g>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'NodeMenuButton',
  props: {
    show: Boolean,
    transform: {
      type: String,
      default: 'translate(-10, -10)'
    }
  },
  computed: {
    ...mapGetters('person', ['isLoadingProfiles']),
    ...mapGetters('whakapapa', ['isLoadingWhakapapa']),
    mobile () {
      return this.$vuetify.breakpoint.xs || this.$vuetify.breakpoint.sm
    }
  },
  methods: {
    click ($event) {
      if (this.isLoadingProfiles) return
      this.$emit('click', $event)
    }
  }
}
</script>

<style scoped>
.menu-button {
  transition: opacity ease-in 0.2s;
  opacity: 1;
}
</style>
