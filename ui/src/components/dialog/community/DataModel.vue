<template>
  <div class="ma-2 mt-4">
    <p class="black--text">{{ t('dataModel') }}</p>
      <v-data-table
        :headers="headers"
        :items="filteredFields"
        class="elevation-1"
        disable-sort
        disable-pagination
        hide-default-footer
        show-expand
        :expanded="expandedFields"
        item-key="label"
      >
        <template v-slot:item.visibleBy="{ item }"> <!-- eslint-disable-line -->
          <v-select
            v-model="item.visibleBy"
            :items="items"
            single-line
            class="custom-select"
            v-bind="customProps"
            :disabled="isDisabledField(item)"
          ></v-select>
        </template>
        <template v-slot:item.required="{ item }"> <!-- eslint-disable-line -->
          <v-checkbox
            v-if="!isRequiredDisabled(item)"
            v-model="item.required"
            @click="updateRequiredField(item)"
            :disabled="isDisabledField(item)"
          ></v-checkbox>
        </template>
        <template v-slot:item.delete="{ item }"> <!-- eslint-disable-line -->
          <v-icon
            @click="showDeleteFieldDialog(item)"
            :disabled="isDisabledField(item)"
          >mdi-delete</v-icon>
        </template>

        <template v-slot:item.data-table-expand="{ item, isExpanded, expand }">
          <v-icon
            v-if="item.type === 'list'"
            :class="{
              'v-data-table__expand-icon': true,
              'v-data-table__expand-icon--active': isExpanded
            }"
            @click.stop="expand(!isExpanded)"
            >$expand</v-icon
          >
        </template>
        <template v-slot:expanded-item="{ headers, item }">
          <td :colspan="headers.length">
            <v-text-field
              class="mx-2 mt-2"
              label="list options"
              :disabled="item.label === 'gender'"
              v-model="item.options"
            />
          </td>
        </template>
      </v-data-table>
      <v-col cols="12" justify="start" class="px-1">
        <v-btn color="#3b3b3b" class="white--text" @click="newFieldDialog = true">
          <v-icon class="pr-1">mdi-plus</v-icon> {{ t('addDataPoint') }}
        </v-btn>
      </v-col>
      <v-dialog
          v-if="newFieldDialog"
          v-model="newFieldDialog"
          max-width="500px"
          light
        >
          <v-card>
            <v-card-title>
              <span class="dialog-title">{{ t('newFieldDialogTitle') }}</span>
            </v-card-title>

            <v-card-text>
              <v-container>
                <v-row>
                  <v-col
                    cols="12"
                    sm="6"
                  >
                    <v-text-field
                      v-model="newField.label"
                      label="Label"
                      :rules="rules"
                    ></v-text-field>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                  >
                    <v-select
                      label="input type"
                      :value="newField.text"
                      :items="typeOptions"
                      class="custom-select"
                      @input="updateNewFieldByType"
                      v-bind="customProps"
                    ></v-select>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                  >
                    <v-select
                      label="visible by"
                      v-model="newField.visibleBy"
                      :items="items"
                      class="custom-select"
                      v-bind="customProps"
                    ></v-select>
                  </v-col>
                  <v-col
                    cols="12"
                    sm="6"
                  >
                    <v-checkbox
                      label="required field"
                      v-model="newField.required"
                    ></v-checkbox>
                  </v-col>
                </v-row>
              </v-container>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                @click="closeNewFieldDialog"
                text
                :large="!mobile"
                class="secondary--text"
              >
                {{ $t('dialog.cancel') }}
              </v-btn>
              <v-btn
                color="blue darken-1"
                text
                :large="!mobile"
                @click="addCustomField"
                :disabled="!newField.label"
              >
                {{ $t('dialog.save') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-dialog v-model="deleteFieldDialog" light max-width="500px">
          <v-card>
            <p class="pa-5">Are you sure you want to delete this field from profiles?</p>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="red darken-2" text @click="deleteFieldDialog = false">Cancel</v-btn>
              <v-btn color="blue darken-1" text @click="deleteField">Confirm</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
    </div>
</template>
<script>

import clone from 'lodash.clonedeep'
import { getCustomFields, getDefaultFields, REQUIRED_DISABLED_FIELDS } from '../../../lib/community-helpers'

const DEFAULT_NEW_FIELD = {
  label: '',
  type: 'text',
  required: false,
  visibleBy: 'members'
}

const DISABLED_DEFAULT_FIELDS = ['first name', 'date of birth', 'date of death']

const SINGLE_LIST = 'singleList'
const MULTI_LIST = 'multiList'

export default {
  name: 'DataModel',
  props: {
    customFields: Array
  },
  data () {
    return {
      newFieldDialog: false,
      deleteFieldDialog: false,
      headers: [
        { text: this.t('data'), value: 'label' },
        { text: this.t('type'), value: 'type' },
        { text: this.t('access'), value: 'visibleBy' },
        { text: this.t('required'), value: 'required', width: '50px' },
        { text: this.t('deleteField'), value: 'delete', width: '50px' }
      ],
      items: [
        { text: 'kaitiaki only', value: 'admin' },
        { text: 'all members', value: 'members' }
      ],
      typeOptions: [
        { text: 'text', type: 'text' },
        { text: 'number', type: 'number' },
        { text: 'checkbox', type: 'checkbox' },
        { text: 'list (choose single entry)', value: SINGLE_LIST, type: 'list', multiple: false },
        { text: 'list (choose multiple entries) ', value: MULTI_LIST, type: 'list', multiple: true },
        { text: 'multiple entries', value: 'array' }

        // TODO: these are not supported yet
        // { text: 'date', value: 'date' },
      ],
      rules: [value => !!value || 'Required.'],
      currentField: {},
      newField: clone(DEFAULT_NEW_FIELD)
    }
  },
  mounted () {
    window.scrollTo(0, 0)
  },
  computed: {
    allFields () {
      return [...this.defaultFields, ...this.customDataFields]
    },
    filteredFields () {
      return this.allFields.filter(field => !field.tombstone)
    },
    defaultFields () {
      return getDefaultFields(this.customFields)
    },
    customDefaultFields () {
      return this.defaultFields.filter(field => field.key)
    },

    customDataFields () {
      return getCustomFields(this.customFields)
    },
    expandedFields () {
      return this.allFields.filter(field => field.type === 'list')
    },
    mobile () {
      return this.$vuetify.breakpoint.xs || this.$vuetify.breakpoint.sm
    },
    customProps () {
      return {
        hideDetails: true,
        menuProps: { bottom: true, offsetY: true, light: true },
        light: true,
        autoFocus: true
      }
    }
  },
  methods: {
    isDisabledField (field) {
      return DISABLED_DEFAULT_FIELDS.includes(field.label)
    },
    isRequiredDisabled (field) {
      return REQUIRED_DISABLED_FIELDS.includes(field.label)
    },
    updateRequiredField (selectedField) {
      const newField = selectedField
      if (!newField.key) newField.key = this.generateTimestamp()
      const index = this.allFields.findIndex(field => field.label === newField.label)
      const dataFields = this.allFields
      dataFields[index] = selectedField
      this.$emit('update:customFields', dataFields)
    },
    updateNewFieldByType (type) {
      switch (type) {
        case SINGLE_LIST:
          this.newField.type = 'list'
          this.newField.multiple = false
          this.newField.options = []
          break
        case MULTI_LIST:
          this.newField.type = 'list'
          this.newField.multiple = true
          this.newField.options = []
          break
        default:
          this.newField.type = type
      }
    },
    closeNewFieldDialog () {
      this.newField = clone(DEFAULT_NEW_FIELD)
      this.newFieldDialog = false
    },
    addCustomField () {
      const index = this.allFields.findIndex(field => field.label === this.newField.label)
      if (index > -1) {
        const dataFields = clone(this.allFields)
        dataFields[index] = this.newField

        // if it was already tombstoned, we have to create a new key to create a whole new field
        if (dataFields[index].tombstone) {
          dataFields[index].tombstone = null
          dataFields[index].key = this.generateTimestamp()
        }

        if (!dataFields[index].key) dataFields[index].key = this.generateTimestamp()

        this.$emit('update:customFields', dataFields)
        this.closeNewFieldDialog()
        return
      }
      this.newField.key = this.generateTimestamp()
      const dataFields = clone(this.allFields)
      dataFields.push(this.newField)
      this.$emit('update:customFields', dataFields)
      this.closeNewFieldDialog()
    },
    t (key, vars) {
      return this.$t('addCommunityForm.' + key, vars)
    },
    showDeleteFieldDialog (field) {
      this.currentField = field
      this.deleteFieldDialog = true
    },
    deleteField () {
      const index = this.allFields.findIndex(field => field.label === this.currentField.label)
      const dataFields = clone(this.allFields)
      if (!dataFields[index].key) dataFields[index].key = this.generateTimestamp()
      dataFields[index].tombstone = { date: Date.now() }
      this.$emit('update:customFields', dataFields)
      this.deleteFieldDialog = false
    },
    generateTimestamp () {
      return Date.now().toString()
    }
  }
}

</script>
<style scoped>
.custom-select ::v-deep .v-select__selections input {
    display: none;
}
.custom-select ::v-deep .v-text-field {
    padding-top: 0px;
    margin-top: 0px;
}
.dialog-title {
  font: 'Roboto';
  font-weight: 400;
  font-size: 0.99rem;
  letter-spacing: 0.1666666667em;
  text-transform: uppercase;
}
</style>
