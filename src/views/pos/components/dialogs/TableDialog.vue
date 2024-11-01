<template>
  <v-dialog v-model="showTableDialog" max-width="500px">
    <v-card>
      <v-card-title>Select Tables</v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col
              v-for="table in availableTables"
              :key="table.id"
              cols="4"
              sm="3"
              md="2"
            >
              <v-btn
                block
                :color="isTableSelected(table) ? 'primary' : ''"
                @click="handleTableSelect(table)"
                variant="outlined"
                class="mb-2"
              >
                {{ table.name }}
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="confirmSelection">
          Confirm
        </v-btn>
        <v-btn color="error" @click="closeDialog">
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useTableAssignment } from '@/views/pos/composables/useTableAssignment'

const {
  showTableDialog,
  availableTables,
  selectedTables,
  selectTable,
  closeTableDialog
} = useTableAssignment()

const isTableSelected = (table) => {
  return selectedTables.value.some(t => t.id === table.id)
}

const handleTableSelect = (table) => {
  selectTable(table)
}

const confirmSelection = () => {
  closeTableDialog()
}

const closeDialog = () => {
  closeTableDialog()
}
</script>

<style scoped>
.v-btn {
  height: 60px;
}
</style>
