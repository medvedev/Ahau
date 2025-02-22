<template>
  <div>
    <v-row>
      <v-col>
        <v-divider v-if="mobile" light></v-divider>
        <ProfileCard :title="t('title')">
          <template v-slot:content>
            <div v-if="!patakas">
              <SkeletonLoader
                :cols="12"
                :totalSkeletons=5
                skeletonType="list-item-avatar"
                customClass="pr-n10"
                width="100%"
              />
            </div>
            <div v-else-if="patakas && patakas.length > 0">
              <v-row v-for="pataka in patakas" :key="pataka.id" class="align-center ml-6">
                <v-col cols="2" class="pt-0 pl-0">
                  <Avatar :size="mobile ? '60px' : '46px'" :image="pataka.avatarImage" :alt="pataka.preferredName" :isView="!pataka.avatarImage" :online="pataka.online"/>
                </v-col>
                <v-col cols="10" class="pb-6" justify-center>
                  <p style="color:black;" class="mb-0">{{ pataka.preferredName }} </p>
                  <span v-if="pataka.online" style="color:#37e259; position:absolute; font-size:11px; letter-spacing:1px;">online</span>
                </v-col>
              </v-row>
            </div>
            <div v-else>
              <p class="pl-3 caption">{{ t('notConnected') }}</p>
            </div>
            <v-row justify='center'>
              <v-btn text small justify-center class="blue--text mt-3" @click="dialog = !dialog">
                <v-icon small class="blue--text pr-2 ml-3">mdi-plus</v-icon>
                {{ $t('pataka.connectPataka')}}
              </v-btn>
            </v-row>
          </template>
        </ProfileCard>
      </v-col>
    </v-row>
    <NewPatakaDialog
      v-if="dialog"
      :show="dialog"
      :title="$t('pataka.newPataka')"
      :connected="connectedPatakaAotearoa"
      @close="dialog = false"
      @submit="connected($event)"
    />
  </div>
</template>

<script>
import gql from 'graphql-tag'
import ProfileCard from '@/components/profile/ProfileCard.vue'
import Avatar from '@/components/Avatar.vue'
import NewPatakaDialog from '@/components/dialog/connection/NewPatakaDialog.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

import patakaConfig from '../../../pataka.config'
import { mapActions } from 'vuex'

export default {
  name: 'PatakaList',
  components: {
    ProfileCard,
    Avatar,
    NewPatakaDialog,
    SkeletonLoader
  },
  apollo: {
    patakasRaw: {
      query: gql`query {
        patakas {
          id
          preferredName
          avatarImage { uri }
          description
        }
      }`,
      pollInterval: 10e3,
      fetchPolicy: 'no-cache',
      update (data) {
        return data.patakas
      }
    },
    connectedPeers: {
      query: gql`query{
        connectedPeers {
          pataka {
            id
            preferredName
            avatarImage {uri}
          }
        }
      }`,
      pollInterval: 10e3,
      fetchPolicy: 'no-cache',
      update (data) {
        return data.connectedPeers
      }
    }
  },
  data () {
    return {
      dialog: null,
      patakasRaw: null,
      connectedPeers: []
    }
  },
  computed: {
    mobile () {
      return this.$vuetify.breakpoint.xs || this.$vuetify.breakpoint.sm
    },
    connectedPatakaAotearoa () {
      if (!this.patakasRaw) return
      const patakaId = patakaConfig.id
      return this.patakasRaw.some(pataka => pataka.id === patakaId)
    },
    patakas () {
      if (!this.patakasRaw) return null

      return this.patakasRaw.map(pataka => {
        if (this.connectedPeers && this.connectedPeers.pataka && this.connectedPeers.pataka.some(peer => peer.id === pataka.id)) {
          return {
            ...pataka,
            online: true
          }
        } else return pataka
      })
    }
  },
  methods: {
    ...mapActions(['setSyncing']),
    ...mapActions('alerts', ['showAlert']),
    connected (text) {
      this.dialog = false
      this.showAlert({
        message: text,
        color: 'green'
      })
      this.setSyncing(true)

      // update to check ssb.status
    },
    t (key, vars) {
      return this.$t('pataka.' + key, vars)
    }
  }
}
</script>

<style style="scss">
</style>
