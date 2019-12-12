import { configure, addDecorator } from '@storybook/vue'

// HACK ///////////////////
//   Vuetify + Storybook is  a pain. This ugly solution works...
//   https://github.com/storybookjs/storybook/issues/7593#issuecomment-548146120

import '@mdi/font/css/materialdesignicons.css' // Ensure you are using css-loader
import 'typeface-roboto'

import Vue from 'vue'
import * as _Vuetify from 'vuetify/lib'
import config from '../vuetify.config.js'

const Vuetify = _Vuetify.default
const isVueComponent = obj => obj.name === 'VueComponent'
const VComponents = Object.keys(_Vuetify).reduce((acc, key) => {
  if (isVueComponent(_Vuetify[key])) {
    acc[key] = _Vuetify[key]
  }
  return acc
}, {})

Vue.use(Vuetify, {
  components: { ...VComponents }
})

// Ensures every story is wrapped in a v-app tag (vuetify)
addDecorator(() => ({
  vuetify: new Vuetify(config),
  template: `
    <v-app style="padding: 20px;">
      <story/>
    </v-app>
  `
}))
// HACK ///////////////////

// automatically import all files ending in *.stories.js
configure(require.context('../src', true, /\.stories\.js$/), module)
