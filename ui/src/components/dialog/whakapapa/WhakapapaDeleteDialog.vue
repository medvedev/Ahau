<template>
  <Dialog :title="`Delete ${ view.name }`" :show="show" width="600px" :goBack="close" enableMenu
    @submit="submit"
    @close="close"
  >
    <template v-slot:content>
      <v-card-subtitle>
        <div>
          Are you sure you want to delete this whakapapa record?
        </div>
      </v-card-subtitle>
    </template>
  </Dialog>
</template>

<script>
import Dialog from '@/components/dialog/Dialog.vue'

export default {
  name: 'WhakapapaDeleteDialog',
  props: {
    show: { type: Boolean, required: true },
    view: { type: Object, required: true }
  },
  computed: {
    mobile () {
      return this.$vuetify.breakpoint.xs
    }
  },
  methods: {
    close () {
      this.$emit('close')
    },
    submit () {
      this.$emit('submit')
      this.close()
    }
  },
  components: {
    Dialog
  }
}
</script>
